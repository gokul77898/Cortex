import axios from 'axios'
import memoize from 'lodash-es/memoize.js'
import { getOauthConfig } from 'src/constants/oauth.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from 'src/services/analytics/index.js'
import { getCORTEXAIOAuthTokens } from 'src/utils/auth.js'
import { getGlobalConfig, saveGlobalConfig } from 'src/utils/config.js'
import { logForDebugging } from 'src/utils/debug.js'
import { isEnvDefinedFalsy } from 'src/utils/envUtils.js'
import { getAPIProvider } from 'src/utils/model/providers.js'
import { clearMcpAuthCache } from './client.js'
import { normalizeNameForMCP } from './normalization.js'
import type { ScopedMcpServerConfig } from './types.js'

type CORTEXAIMcpServer = {
  type: 'mcp_server'
  id: string
  display_name: string
  url: string
  created_at: string
}

type CORTEXAIMcpServersResponse = {
  data: CORTEXAIMcpServer[]
  has_more: boolean
  next_page: string | null
}

const FETCH_TIMEOUT_MS = 5000
const MCP_SERVERS_BETA_HEADER = 'mcp-servers-2025-12-04'

/**
 * Fetches MCP server configurations from CORTEX.ai org configs.
 * These servers are managed by the organization via CORTEX.ai.
 *
 * Results are memoized for the session lifetime (fetch once per CLI session).
 */
export const fetchCORTEXAIMcpConfigsIfEligible = memoize(
  async (): Promise<Record<string, ScopedMcpServerConfig>> => {
    try {
      if (getAPIProvider() !== 'firstParty') {
        logForDebugging('[cortexai-mcp] Skipped: non-first-party provider')
        logEvent('tengu_cortexai_mcp_eligibility', {
          state:
            'non_first_party_provider' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        return {}
      }

      if (isEnvDefinedFalsy(process.env.ENABLE_CLAUDEAI_MCP_SERVERS)) {
        logForDebugging('[cortexai-mcp] Disabled via env var')
        logEvent('tengu_cortexai_mcp_eligibility', {
          state:
            'disabled_env_var' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        return {}
      }

      const tokens = getCORTEXAIOAuthTokens()
      if (!tokens?.accessToken) {
        logForDebugging('[cortexai-mcp] No access token')
        logEvent('tengu_cortexai_mcp_eligibility', {
          state:
            'no_oauth_token' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        return {}
      }

      // Check for user:mcp_servers scope directly instead of isCORTEXAISubscriber().
      // In non-interactive mode, isCORTEXAISubscriber() returns false when ANTHROPIC_API_KEY
      // is set (even with valid OAuth tokens) because preferThirdPartyAuthentication() causes
      // isCORTEXAuthEnabled() to return false. Checking the scope directly allows users
      // with both API keys and OAuth tokens to access anthropic.com MCPs in print mode.
      if (!tokens.scopes?.includes('user:mcp_servers')) {
        logForDebugging(
          `[cortexai-mcp] Missing user:mcp_servers scope (scopes=${tokens.scopes?.join(',') || 'none'})`,
        )
        logEvent('tengu_cortexai_mcp_eligibility', {
          state:
            'missing_scope' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        return {}
      }

      const baseUrl = getOauthConfig().BASE_API_URL
      const url = `${baseUrl}/v1/mcp_servers?limit=1000`

      logForDebugging(`[cortexai-mcp] Fetching from ${url}`)

      const response = await axios.get<CORTEXAIMcpServersResponse>(url, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
          'cortex-beta': MCP_SERVERS_BETA_HEADER,
          'cortex-version': '2023-06-01',
        },
        timeout: FETCH_TIMEOUT_MS,
      })

      const configs: Record<string, ScopedMcpServerConfig> = {}
      // Track used normalized names to detect collisions and assign (2), (3), etc. suffixes.
      // We check the final normalized name (including suffix) to handle edge cases where
      // a suffixed name collides with another server's base name (e.g., "Example Server 2"
      // colliding with "Example Server! (2)" which both normalize to cortex_ai_Example_Server_2).
      const usedNormalizedNames = new Set<string>()

      for (const server of response.data.data) {
        const baseName = `anthropic.com ${server.display_name}`

        // Try without suffix first, then increment until we find an unused normalized name
        let finalName = baseName
        let finalNormalized = normalizeNameForMCP(finalName)
        let count = 1
        while (usedNormalizedNames.has(finalNormalized)) {
          count++
          finalName = `${baseName} (${count})`
          finalNormalized = normalizeNameForMCP(finalName)
        }
        usedNormalizedNames.add(finalNormalized)

        configs[finalName] = {
          type: 'cortexai-proxy',
          url: server.url,
          id: server.id,
          scope: 'cortexai',
        }
      }

      logForDebugging(
        `[cortexai-mcp] Fetched ${Object.keys(configs).length} servers`,
      )
      logEvent('tengu_cortexai_mcp_eligibility', {
        state:
          'eligible' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
      return configs
    } catch {
      logForDebugging(`[cortexai-mcp] Fetch failed`)
      return {}
    }
  },
)

/**
 * Clears the memoized cache for fetchCORTEXAIMcpConfigsIfEligible.
 * Call this after login so the next fetch will use the new auth tokens.
 */
export function clearCORTEXAIMcpConfigsCache(): void {
  fetchCORTEXAIMcpConfigsIfEligible.cache.clear?.()
  // Also clear the auth cache so freshly-authorized servers get re-connected
  clearMcpAuthCache()
}

/**
 * Record that a anthropic.com connector successfully connected. Idempotent.
 *
 * Gates the "N connectors unavailable/need auth" startup notifications: a
 * connector that was working yesterday and is now failed is a state change
 * worth surfacing; an org-configured connector that's been needs-auth since
 * it showed up is one the user has demonstrably ignored.
 */
export function markCORTEXAiMcpConnected(name: string): void {
  saveGlobalConfig(current => {
    const seen = current.cortexAiMcpEverConnected ?? []
    if (seen.includes(name)) return current
    return { ...current, cortexAiMcpEverConnected: [...seen, name] }
  })
}

export function hasCORTEXAiMcpEverConnected(name: string): boolean {
  return (getGlobalConfig().cortexAiMcpEverConnected ?? []).includes(name)
}
