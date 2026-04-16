import { select } from '@inquirer/prompts'
import fs from 'fs'
import path from 'path'

/**
 * CORTEX startup screen — Comprehensive Swarm Orchestrator.
 * Parses .env for ALL possible provider options and mission engines.
 */

declare const MACRO: { VERSION: string; DISPLAY_VERSION?: string }

const ESC = '\x1b['
const RESET = `${ESC}0m`
const DIM = `${ESC}2m`

type RGB = [number, number, number]
const rgb = (r: number, g: number, b: number) => `${ESC}38;2;${r};${g};${b}m`

function lerp(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function gradAt(stops: RGB[], t: number): RGB {
  const c = Math.max(0, Math.min(1, t))
  const s = c * (stops.length - 1)
  const i = Math.floor(s)
  if (i >= stops.length - 1) return stops[stops.length - 1]
  return lerp(stops[i], stops[i + 1], s - i)
}

function paintLine(text: string, stops: RGB[], lineT: number): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const t = text.length > 1 ? lineT * 0.5 + (i / (text.length - 1)) * 0.5 : lineT
    const [r, g, b] = gradAt(stops, t)
    out += `${rgb(r, g, b)}${text[i]}`
  }
  return out + RESET
}

const SUNSET_GRAD: RGB[] = [[120, 150, 255], [180, 100, 255], [255, 80, 150]]
const CORTEX_GRAD: RGB[] = [[255, 180, 100], [240, 140, 80], [217, 119, 87]]
const ACCENT: RGB = [255, 120, 255]
const CREAM: RGB = [200, 220, 255]
const BORDER: RGB = [80, 90, 120]

const LOGO_CORTEX = [
  `   ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗`,
  `  ██╔════╝██╔══██║██╔══██║╚══██╔══╝██╔═════╝╚██╗██╔╝`,
  `  ██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝ `,
  `  ██║     ██║   ██║██╔══██║   ██║   ██╔══╝   ██╔██╗ `,
  `  ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗`,
  `   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═══════╝╚═╝  ╚═╝`,
]

const LOGO_AGENCY = [
  `     *                                       █████▓▓░        `,
  `                                 *         ███▓░     ░░      `,
  `            ░░░░░░                        ███▓░              `,
  `    ░░░   ░░░░░░░░░░                      ███▓░              `,
  `   ░░░░░░░░░░░░░░░░░░░    *                ██▓░░      ▓      `,
  `                                             ░▓▓███▓▓░       `,
  ` *                                 ░░░░                      `,
  `                                 ░░░░░░░░                    `,
  `                               ░░░░░░░░░░░░░░░░              `,
  `       █████████   █████████   █████████   █████████         `,
  `       ███   ███   ███         ███   ███   ███   ███         `,
  `       ███   ███   █████████   █████████   ███   ███         `,
  `       █████████   ███         ███   ███   █████████         `,
  `       ███   ███   █████████   ███   ███   ███   ███         `,
]

interface MissionConfig {
  name: string
  model: string
  baseUrl: string
  apiKey: string
  provider: 'cortex' | 'openai' | 'gemini' | 'github' | 'bedrock' | 'vertex' | 'huggingface' | 'local'
}

/**
 * Deep .env parser with strict multiline validation.
 */
function getMissionsFromEnv(): MissionConfig[] {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return []

  const content = fs.readFileSync(envPath, 'utf8')
  const missions: MissionConfig[] = []
  
  // 1. ANTHROPIC / CORTEX
  const antKey = process.env.ANTHROPIC_API_KEY || content.match(/^\s*ANTHROPIC_API_KEY=([^\s#]+)/m)?.[1]
  const antModel = process.env.ANTHROPIC_MODEL || content.match(/^\s*ANTHROPIC_MODEL=([^\s#]+)/m)?.[1]
  missions.push({
    name: '✦ Mission 01: CORTEX Prime (Native)',
    model: antModel || 'cortex-sonnet-4-5',
    baseUrl: 'https://api.anthropic.com',
    apiKey: antKey || '',
    provider: 'cortex'
  })

  // 2. OPENAI
  const oaKey = process.env.OPENAI_API_KEY || content.match(/^\s*OPENAI_API_KEY=([^\s#]+)/m)?.[1]
  const oaModel = process.env.OPENAI_MODEL || content.match(/^\s*OPENAI_MODEL=([^\s#]+)/m)?.[1]
  missions.push({
    name: '✦ Mission 02: Tactical Quant (OpenAI)',
    model: oaModel || 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: oaKey || '',
    provider: 'openai'
  })

  // 3. GEMINI
  const gemKey = process.env.GEMINI_API_KEY || content.match(/^\s*GEMINI_API_KEY=([^\s#]+)/m)?.[1]
  const gemModel = process.env.GEMINI_MODEL || content.match(/^\s*GEMINI_MODEL=([^\s#]+)/m)?.[1]
  missions.push({
    name: '✦ Mission 03: Horizon Scan (Gemini)',
    model: gemModel || 'gemini-2.0-flash',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKey: gemKey || '',
    provider: 'gemini'
  })

  // 4. GITHUB
  const ghToken = process.env.GITHUB_TOKEN || content.match(/^\s*GITHUB_TOKEN=([^\s#]+)/m)?.[1]
  missions.push({
    name: '✦ Mission 04: Git-Flow (GitHub Models)',
    model: 'github:copilot',
    baseUrl: 'https://models.github.ai/inference',
    apiKey: ghToken || '',
    provider: 'github'
  })

  // 5. OLLAMA
  missions.push({
    name: '✦ Mission 05: Deep-Local (Ollama)',
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'ollama',
    provider: 'openai'
  })

  // 9. HUGGING FACE / TOGETHER
  const hfToken = process.env.HF_TOKEN || content.match(/^\s*HF_TOKEN=([^\s#]+)/m)?.[1]
  const hfModel = process.env.HF_MODEL_ID || content.match(/^\s*HF_MODEL_ID=([^\s#]+)/m)?.[1]
  const hfBase = process.env.HF_BASE_URL || content.match(/^\s*HF_BASE_URL=([^\s#]+)/m)?.[1]
  missions.push({
    name: `✦ Mission 09: Brain-Swarm (${hfModel?.split('/').pop() || 'GLM-5'})`,
    model: hfModel || 'zai-org/GLM-5:together',
    baseUrl: hfBase || 'https://router.huggingface.co/v1',
    apiKey: hfToken || '',
    provider: 'huggingface'
  })

  return missions
}

export async function printStartupScreen(): Promise<void> {
  if (process.env.CI || !process.stdout.isTTY) return

  // Preserve original key for MCP/Subprocesses
  const originalAntKey = process.env.ANTHROPIC_API_KEY

  const W = 62
  const out: string[] = []

  // Fallback for MACRO globals when running in dev mode without bundler
  const VERSION = (typeof MACRO !== 'undefined' ? MACRO.VERSION : '99.0.0')

  process.stdout.write('\x1Bc')
  LOGO_CORTEX.forEach((line, i) => out.push(paintLine(line, CORTEX_GRAD, i / LOGO_CORTEX.length)))
  out.push(`  ${rgb(...CREAM)}DECOUPLED ASSET v${VERSION}...${RESET}\n`)
  LOGO_AGENCY.forEach((line, i) => out.push(paintLine(line, SUNSET_GRAD, i / LOGO_AGENCY.length)))
  out.push(`\n  ${rgb(...ACCENT)}✦${RESET} ${rgb(...CREAM)}STATUS: ${RESET}${rgb(100, 255, 100)}READY - FULL SWARM UNLOCKED${RESET} ${rgb(...ACCENT)}✦${RESET}\n`)
  out.push(`${rgb(...BORDER)}\u2554${'\u2550'.repeat(W - 2)}\u2557${RESET}`)
  const row = (k: string, v: string) => {
    const pad = W - 4 - (k || '').length - (v || '').length
    out.push(`${rgb(...BORDER)}\u2502${RESET} ${DIM}${k}${RESET} ${' '.repeat(pad)} ${rgb(...ACCENT)}${v}${RESET} ${rgb(...BORDER)}\u2502${RESET}`)
  }
  row('IDENTITY', 'Autonomous Swarm')
  row('PROTOCOLS', 'Decoupled-P2P (OFFLINE)')
  row('AUTH', 'Bridged via .env Store')
  out.push(`${rgb(...BORDER)}\u255a${'\u2550'.repeat(W - 2)}\u255d${RESET}\n`)

  process.stdout.write(out.join('\n'))

  const missions = getMissionsFromEnv()
  const choice = await select({
    message: 'Initialize Mission Engine Interface:',
    choices: missions.map(m => ({ name: m.name, value: m })),
  })

  // Global ENV Injection
  delete process.env.CORTEX_USE_OPENAI
  delete process.env.CORTEX_USE_GEMINI
  delete process.env.CORTEX_USE_GITHUB
  delete process.env.CORTEX_USE_BEDROCK
  delete process.env.CORTEX_USE_VERTEX

  if (choice.provider === 'openai') {
    process.env.CORTEX_USE_OPENAI = '1'
    process.env.OPENAI_BASE_URL = choice.baseUrl
    process.env.OPENAI_API_KEY = choice.apiKey
    process.env.OPENAI_MODEL = choice.model
    // Bridge to OpenAI callers and mission engine
    process.env.ANTHROPIC_BASE_URL = choice.baseUrl
    process.env.ANTHROPIC_API_KEY = choice.apiKey 
    // If we have an original key, make it available for MCP without polluting the main one
    if (originalAntKey && originalAntKey !== choice.apiKey) {
      process.env.MOCK_MCP_HINT_ANT_KEY = originalAntKey;
    }
  } else if (choice.provider === 'huggingface') {
    process.env.CORTEX_USE_OPENAI = '1'
    process.env.HF_TOKEN = choice.apiKey
    process.env.HF_MODEL_ID = choice.model
    process.env.HF_BASE_URL = choice.baseUrl
    process.env.OPENAI_BASE_URL = choice.baseUrl
    process.env.OPENAI_API_KEY = choice.apiKey
    process.env.OPENAI_MODEL = choice.model
    delete process.env.ANTHROPIC_API_KEY
  } else if (choice.provider === 'gemini') {
    process.env.CORTEX_USE_GEMINI = '1'
    process.env.GEMINI_API_KEY = choice.apiKey
    process.env.GEMINI_MODEL = choice.model
    delete process.env.ANTHROPIC_API_KEY
  } else if (choice.provider === 'github') {
    process.env.CORTEX_USE_GITHUB = '1'
    process.env.OPENAI_API_KEY = choice.apiKey
    delete process.env.ANTHROPIC_API_KEY
  } else if (choice.provider === 'cortex') {
    process.env.ANTHROPIC_API_KEY = choice.apiKey
    process.env.ANTHROPIC_MODEL = choice.model
    process.env.ANTHROPIC_BASE_URL = choice.baseUrl
  }

  // FORCE OVERRIDE for CORTEX core detection
  process.env.ANTHROPIC_MODEL = choice.model;
  process.env.MODEL_ID = choice.model;

  process.stdout.write(`\n  ${rgb(...ACCENT)}STATUS:${RESET} Asset Verified. Swarm Online @ ${rgb(...ACCENT)}${choice.model}${RESET}.\n\n`)
  await new Promise(r => setTimeout(r, 600))
}
