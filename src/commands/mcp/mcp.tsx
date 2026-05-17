import { c as _c } from "react-compiler-runtime";
import React, { useEffect, useRef } from 'react';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Select } from '../../components/CustomSelect/index.js';
import { Dialog } from '../../components/design-system/Dialog.js';
import { Box, Text } from '../../ink.js';
import { MCPSettings } from '../../components/mcp/index.js';
import { MCPReconnect } from '../../components/mcp/MCPReconnect.js';
import { useMcpToggleEnabled } from '../../services/mcp/MCPConnectionManager.js';
import { addMcpConfig } from '../../services/mcp/config.js';
import { useAppState } from '../../state/AppState.js';
import type { LocalJSXCommandOnDone } from '../../types/command.js';
import { PluginSettings } from '../plugin/PluginSettings.js';
import { getGlobalConfig } from '../../utils/config.js';
import { getCwd } from '../../utils/cwd.js';
import TextEntryPrompt from '../../components/TextInput.js';

// --- Curated MCP server list ---
type McpEnvVar = { key: string; label: string; placeholder: string }
type McpListing = {
  id: string
  label: string
  desc: string
  command: string
  args: string[]
  envVars: McpEnvVar[]
  scope: 'user' | 'project'
}

const CURATED_SERVERS: McpListing[] = [
  {
    id: 'gmail', label: 'Gmail', desc: 'Read, send, and manage Gmail emails (OAuth)',
    command: 'npx', args: ['-y', '@shinzolabs/gmail-mcp'],
    envVars: [], scope: 'user',
  },
  {
    id: 'google-calendar', label: 'Google Calendar', desc: 'List, create, manage Google Calendar events',
    command: 'npx', args: ['-y', '@cocal/google-calendar-mcp'],
    envVars: [{ key: 'GOOGLE_OAUTH_CREDENTIALS', label: 'Google OAuth credentials file path', placeholder: '/path/to/gcp-oauth.keys.json' }],
    scope: 'user',
  },
  {
    id: 'google-drive', label: 'Google Drive', desc: 'Read, search, manage Google Drive files',
    command: 'npx', args: ['-y', '@piotr-agier/google-drive-mcp'],
    envVars: [{ key: 'GOOGLE_DRIVE_OAUTH_CREDENTIALS', label: 'Google Drive OAuth credentials file path', placeholder: '/path/to/gcp-oauth.keys.json' }],
    scope: 'user',
  },
  {
    id: 'outlook', label: 'Outlook Mail & Calendar', desc: 'Manage Outlook email, calendar, contacts',
    command: 'npx', args: ['-y', 'outlook-mcp'],
    envVars: [
      { key: 'MS_CLIENT_ID', label: 'Azure App Client ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'MS_CLIENT_SECRET', label: 'Azure App Client Secret', placeholder: 'your-client-secret' },
    ], scope: 'user',
  },
  {
    id: 'notion', label: 'Notion', desc: 'Read, search, and write to Notion',
    command: 'npx', args: ['-y', '@notionhq/notion-mcp-server'],
    envVars: [{ key: 'NOTION_TOKEN', label: 'Notion Integration Token (notion.so/profile/integrations)', placeholder: 'ntn_xxxxxxxxxxxx' }],
    scope: 'user',
  },
  {
    id: 'todoist', label: 'Todoist', desc: 'Create, update, manage Todoist tasks',
    command: 'npx', args: ['-y', 'todoist-mcp'],
    envVars: [{ key: 'TODOIST_API_KEY', label: 'Todoist API Token (Settings > Integrations)', placeholder: 'xxxxxxxxxxxxxxxx' }],
    scope: 'user',
  },
  {
    id: 'airtable', label: 'Airtable', desc: 'Query, create, update Airtable bases',
    command: 'npx', args: ['-y', 'airtable-mcp-server'],
    envVars: [{ key: 'AIRTABLE_API_KEY', label: 'Airtable PAT (airtable.com/create/tokens)', placeholder: 'patxxxx.xxxxxxxx' }],
    scope: 'user',
  },
  {
    id: 'canva', label: 'Canva (OAuth)', desc: 'Generate and export designs (auto-browser auth)',
    command: 'npx', args: ['-y', 'mcp-remote@latest', 'https://mcp.canva.com/mcp'],
    envVars: [], scope: 'user',
  },
  {
    id: 'n8n', label: 'n8n', desc: 'Manage n8n workflows and executions',
    command: 'npx', args: ['-y', 'mcp-n8n'],
    envVars: [
      { key: 'N8N_BASE_URL', label: 'n8n instance URL', placeholder: 'https://your-n8n-instance.com' },
      { key: 'N8N_API_KEY', label: 'n8n API key', placeholder: 'your-api-key' },
    ], scope: 'user',
  },
  {
    id: 'slack', label: 'Slack', desc: 'Read and send Slack messages',
    command: 'npx', args: ['-y', '@modelcontextprotocol/server-slack'],
    envVars: [
      { key: 'SLACK_BOT_TOKEN', label: 'Slack Bot Token', placeholder: 'xoxb-xxxxxxxx' },
      { key: 'SLACK_TEAM_ID', label: 'Slack Team ID', placeholder: 'T00000000' },
    ], scope: 'user',
  },
  {
    id: 'linear', label: 'Linear', desc: 'Manage Linear issues and projects',
    command: 'npx', args: ['-y', '@tacticlaunch/mcp-linear'],
    envVars: [{ key: 'LINEAR_API_KEY', label: 'Linear API Key', placeholder: 'lin_api_xxxxxxxx' }],
    scope: 'user',
  },
  {
    id: 'github', label: 'GitHub', desc: 'Manage repos, PRs, issues',
    command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'],
    envVars: [{ key: 'GITHUB_TOKEN', label: 'GitHub PAT (github.com/settings/tokens)', placeholder: 'ghp_xxxxxxxx' }],
    scope: 'user',
  },
  {
    id: 'exa', label: 'Exa', desc: 'Web search via Exa API',
    command: 'npx', args: ['-y', 'exa-mcp-server'],
    envVars: [{ key: 'EXA_API_KEY', label: 'Exa API Key', placeholder: 'your-exa-key' }],
    scope: 'user',
  },
  {
    id: 'tavily', label: 'Tavily', desc: 'Web search via Tavily API',
    command: 'npx', args: ['-y', 'tavily-mcp'],
    envVars: [{ key: 'TAVILY_API_KEY', label: 'Tavily API Key', placeholder: 'tvly-your-key' }],
    scope: 'user',
  },
  {
    id: 'paradyno-pdf', label: 'PDF Reader (Paradyno)', desc: 'Parse, extract text, split, merge, search PDFs locally (Rust)',
    command: 'npx', args: ['-y', '@paradyno/pdf-mcp-server'],
    envVars: [], scope: 'user',
  },
  {
    id: 'legal-workspace', label: 'Legal Workspace', desc: 'Index and search local contract documents (PDF, DOCX, MD) via TF-IDF',
    command: 'uvx', args: ['legal-workspace-mcp'],
    envVars: [], scope: 'user',
  },
  {
    id: 'ansvar-india-law', label: 'India Law (Ansvar)', desc: 'Search 846 Indian Central Acts — DPDPA, IT Act, Companies Act, Constitution, etc.',
    command: 'npx', args: ['-y', 'ansvar-systems-india-law-mcp'],
    envVars: [], scope: 'user',
  },
  {
    id: 'india-stack', label: 'India Stack', desc: 'Validate PAN, GSTIN, IFSC, Aadhaar, UPI, pincode, HSN/SAC — offline-first, zero auth',
    command: 'uvx', args: ['mcp-india-stack'],
    envVars: [], scope: 'user',
  },
]

function getConfiguredServerIds(): Set<string> {
  const cfg = getGlobalConfig()
  return new Set(Object.keys(cfg.mcpServers ?? {}))
}

function appendToDotEnv(vars: Record<string, string>): void {
  try {
    const envPath = join(getCwd(), '.env')
    let content = ''
    try { content = readFileSync(envPath, 'utf-8') } catch {}
    const lines = content.split('\n').filter(l => l.trim())
    const existingKeys = new Set(lines.map(l => l.split('=')[0]))
    const newLines: string[] = []
    for (const [k, v] of Object.entries(vars)) {
      if (!existingKeys.has(k)) {
        newLines.push(`${k}=${v}`)
      }
    }
    if (newLines.length > 0) {
      const toWrite = [...lines, '', '# Added by /mcp market', ...newLines, '']
      writeFileSync(envPath, toWrite.join('\n'), 'utf-8')
    }
  } catch {}
}

// --- MCPMarket Setup Wizard ---
type Screen = 'list' | 'prompt' | 'result'

function MCPMarket({ onDone }: { onDone: LocalJSXCommandOnDone }): React.ReactNode {
  const configured = getConfiguredServerIds()
  const [queue, setQueue] = React.useState<McpListing[]>(() =>
    CURATED_SERVERS.filter(s => !configured.has(s.id))
  )
  const [done, setDone] = React.useState<string[]>([])
  const [screen, setScreen] = React.useState<Screen>('list')
  const [current, setCurrent] = React.useState<McpListing | null>(null)
  const [envValues, setEnvValues] = React.useState<Record<string, string>>({})
  const [envIdx, setEnvIdx] = React.useState(0)
  const [input, setInput] = React.useState('')
  const [inputColumns, setInputColumns] = React.useState(40)
  const [cursorOffset, setCursorOffset] = React.useState(0)
  const [errorMsg, setErrorMsg] = React.useState('')

  function finishCurrent(allEnv: Record<string, string>): void {
    if (!current) return
    const env = Object.fromEntries(Object.entries(allEnv).filter(([, v]) => v))
    addMcpConfig(
      current.id,
      { type: 'stdio', command: current.command, args: current.args, env: Object.keys(env).length > 0 ? env : undefined },
      current.scope,
    )
      .then(() => {
        appendToDotEnv(env)
        setDone(prev => [...prev, current!.label])
        setQueue(prev => prev.filter(s => s.id !== current!.id))
        setCurrent(null)
        setEnvValues({})
        setEnvIdx(0)
        setInput('')
        setScreen('list')
      })
      .catch((e: Error) => {
        setErrorMsg(e.message)
        setScreen('result')
      })
  }

  function skipCurrent(): void {
    setQueue(prev => prev.filter(s => s.id !== current?.id))
    setCurrent(null)
    setEnvValues({})
    setEnvIdx(0)
    setInput('')
    setScreen('list')
  }

  function handleCancel(): void {
    onDone(`Done. Configured: ${done.length ? done.join(', ') : 'none'}`, { display: 'system' })
  }

  if (screen === 'list') {
    return (
      <Dialog title="MCP Server Setup Wizard" onCancel={handleCancel}>
        <Box flexDirection="column" gap={1}>
          {done.length > 0 && (
            <Box flexDirection="column" gap={0}>
              <Text dimColor>✓ Configured:</Text>
              {done.map(d => <Text key={d} dimColor>  {d}</Text>)}
            </Box>
          )}
          {queue.length === 0 ? (
            <Text>All MCP servers are configured! You're all set.</Text>
          ) : (
            <>
              <Text dimColor>{queue.length} server(s) still need setup. Pick one or exit:</Text>
              <Select
                options={[
                  ...queue.map(s => ({
                    value: s.id,
                    label: s.label,
                    description: s.desc,
                  })),
                  { value: '__done__', label: '✓ Finished — exit', description: '' },
                ]}
                onChange={(id: string) => {
                  if (id === '__done__') {
                    onDone(`Done. ${done.length} configured.`, { display: 'system' })
                    return
                  }
                  const s = CURATED_SERVERS.find(x => x.id === id)
                  if (!s) return
                  setCurrent(s)
                  setEnvValues({})
                  setEnvIdx(0)
                  setInput('')
                  setErrorMsg('')
                  if (s.envVars.length === 0) {
                    addMcpConfig(s.id, { type: 'stdio', command: s.command, args: s.args }, s.scope)
                      .then(() => {
                        setDone(prev => [...prev, s.label])
                        setQueue(prev => prev.filter(x => x.id !== s.id))
                        setCurrent(null)
                      })
                      .catch((e: Error) => {
                        setErrorMsg(e.message)
                        setScreen('result')
                      })
                  } else {
                    setScreen('prompt')
                  }
                }}
              />
            </>
          )}
        </Box>
      </Dialog>
    )
  }

  if (screen === 'prompt' && current) {
    const ev = current.envVars[envIdx]
    if (!ev) {
      finishCurrent(envValues)
      return null
    }
    return (
      <Dialog title={`${current.label} — ${ev.label}`} onCancel={skipCurrent}>
        <Box flexDirection="column" gap={1}>
          <Text dimColor>{ev.label}:</Text>
          <TextEntryPrompt
            value={input}
            onChange={setInput}
            onSubmit={(val: string) => {
              const newEnv = { ...envValues, [ev.key]: val }
              setEnvValues(newEnv)
              setInput('')
              if (envIdx + 1 < current.envVars.length) {
                setEnvIdx(envIdx + 1)
              } else {
                finishCurrent(newEnv)
              }
            }}
            placeholder={ev.placeholder}
            columns={inputColumns}
            cursorOffset={cursorOffset}
            onChangeCursorOffset={setCursorOffset}
            focus
            showCursor
          />
          <Text dimColor>Enter to confirm, Esc to skip this server</Text>
        </Box>
      </Dialog>
    )
  }

  if (screen === 'result') {
    return (
      <Dialog title="Error" onCancel={() => { setErrorMsg(''); setScreen('list') }}>
        <Text color="red">{errorMsg}</Text>
      </Dialog>
    )
  }

  return null
}

// --- Existing MCPToggle ---
function MCPToggle(t0) {
  const $ = _c(7);
  const {
    action,
    target,
    onComplete
  } = t0;
  const mcpClients = useAppState(_temp);
  const toggleMcpServer = useMcpToggleEnabled();
  const didRun = useRef(false);
  let t1;
  let t2;
  if ($[0] !== action || $[1] !== mcpClients || $[2] !== onComplete || $[3] !== target || $[4] !== toggleMcpServer) {
    t1 = () => {
      if (didRun.current) {
        return;
      }
      didRun.current = true;
      const isEnabling = action === "enable";
      const clients = mcpClients.filter(_temp2);
      const toToggle = target === "all" ? clients.filter(c_0 => isEnabling ? c_0.type === "disabled" : c_0.type !== "disabled") : clients.filter(c_1 => c_1.name === target);
      if (toToggle.length === 0) {
        onComplete(target === "all" ? `All MCP servers are already ${isEnabling ? "enabled" : "disabled"}` : `MCP server "${target}" not found`);
        return;
      }
      for (const s_0 of toToggle) {
        toggleMcpServer(s_0.name);
      }
      onComplete(target === "all" ? `${isEnabling ? "Enabled" : "Disabled"} ${toToggle.length} MCP server(s)` : `MCP server "${target}" ${isEnabling ? "enabled" : "disabled"}`);
    };
    t2 = [action, target, mcpClients, toggleMcpServer, onComplete];
    $[0] = action;
    $[1] = mcpClients;
    $[2] = onComplete;
    $[3] = target;
    $[4] = toggleMcpServer;
    $[5] = t1;
    $[6] = t2;
  } else {
    t1 = $[5];
    t2 = $[6];
  }
  useEffect(t1, t2);
  return null;
}
function _temp2(c) {
  return c.name !== "ide";
}
function _temp(s) {
  return s.mcp.clients;
}
export async function call(onDone: LocalJSXCommandOnDone, _context: unknown, args?: string): Promise<React.ReactNode> {
  if (args) {
    const parts = args.trim().split(/\s+/);

    if (parts[0] === 'market' || parts[0] === 'browse') {
      return <MCPMarket onDone={onDone} />;
    }
    // Allow /mcp no-redirect to bypass the redirect for testing
    if (parts[0] === 'no-redirect') {
      return <MCPSettings onComplete={onDone} />;
    }
    if (parts[0] === 'reconnect' && parts[1]) {
      return <MCPReconnect serverName={parts.slice(1).join(' ')} onComplete={onDone} />;
    }
    if (parts[0] === 'enable' || parts[0] === 'disable') {
      return <MCPToggle action={parts[0]} target={parts.length > 1 ? parts.slice(1).join(' ') : 'all'} onComplete={onDone} />;
    }
  }

  // Redirect base /mcp command to /plugins installed tab for ant users
  if ("external" === 'ant') {
    return <PluginSettings onComplete={onDone} args="manage" showMcpRedirectMessage />;
  }
  return <MCPSettings onComplete={onDone} />;
}
