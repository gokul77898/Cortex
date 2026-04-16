import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { isCodexAlias } from '../../services/api/providerConfig.js'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider =
  | 'firstParty'
  | 'bedrock'
  | 'vertex'
  | 'foundry'
  | 'openai'
  | 'gemini'
  | 'github'
  | 'codex'
  | 'huggingface'

export function getAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.CORTEX_USE_GEMINI)
    ? 'gemini'
    : isEnvTruthy(process.env.CORTEX_USE_GITHUB)
      ? 'github'
      : isEnvTruthy(process.env.CORTEX_USE_OPENAI)
        ? isCodexModel()
          ? 'codex'
          : 'openai'
        : isEnvTruthy(process.env.CORTEX_USE_BEDROCK)
          ? 'bedrock'
          : isEnvTruthy(process.env.CORTEX_USE_VERTEX)
            ? 'vertex'
            : isEnvTruthy(process.env.CORTEX_USE_FOUNDRY)
              ? 'foundry'
              : !!process.env.HF_TOKEN
                ? 'huggingface'
                : 'firstParty'
}

export function usesCORTEXAccountFlow(): boolean {
  return getAPIProvider() === 'firstParty'
}
function isCodexModel(): boolean {
  const model = (process.env.OPENAI_MODEL || '').trim()
  if (!model) return false
  // Delegate to the canonical alias table in providerConfig to keep
  // the two Codex detection systems (provider type + transport) in sync.
  return isCodexAlias(model)
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party CORTEX API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyCORTEXBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
