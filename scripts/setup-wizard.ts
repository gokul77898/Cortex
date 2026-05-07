#!/usr/bin/env node
// @ts-nocheck
/**
 * CORTEX Setup Wizard — works when installed globally via npm
 * Stores ALL config in ~/.cortex/ (user's home dir, not the npm package)
 * So API keys are saved on the user's own machine, never in the repo.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as readline from 'readline'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── User config dir: ~/.cortex/ ─────────────────────────────────────────────
// This is where ALL user data lives — API keys, profile, settings.
// It's on the user's machine, NOT in the npm package folder.
const CONFIG_DIR  = path.join(os.homedir(), '.cortex')
const CONFIG_ENV  = path.join(CONFIG_DIR, '.env')
const CONFIG_JSON = path.join(CONFIG_DIR, 'profile.json')

// ─── ANSI Colors ─────────────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  cyan:    '\x1b[36m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  white:   '\x1b[97m',
  magenta: '\x1b[35m',
}

// ─── Provider Catalog ────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id:      'nvidia',
    name:    '🟢 NVIDIA NIM',
    desc:    'DeepSeek, Mistral, Kimi, Qwen, Nemotron & 20+ more',
    keyName: 'NVIDIA_API_KEY',
    keyUrl:  'https://build.nvidia.com  →  "Get API Key" (free)',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    models: [
      { id: 'deepseek-ai/deepseek-v4-pro',                  name: 'DeepSeek V4 Pro        · flagship reasoning'    },
      { id: 'deepseek-ai/deepseek-v4-flash',                name: 'DeepSeek V4 Flash       · fast, low rate-limits' },
      { id: 'mistralai/devstral-2-123b-instruct-2512',      name: 'Devstral 2 123B         · coding specialist'     },
      { id: 'mistralai/mistral-large-3-675b-instruct-2512', name: 'Mistral Large 3 675B    · most powerful Mistral' },
      { id: 'moonshotai/kimi-k2.6',                         name: 'Kimi K2.6               · multimodal all-rounder'},
      { id: 'qwen/qwen3-coder-480b-a35b-instruct',          name: 'Qwen3 Coder 480B        · massive code model'    },
      { id: 'nvidia/nemotron-3-super-120b-a12b',            name: 'Nemotron 3 Super 120B   · NVIDIA flagship'       },
      { id: 'minimaxai/minimax-m2.7',                       name: 'MiniMax M2.7            · fast coding'           },
    ],
  },
  {
    id:      'openai',
    name:    '⚡ OpenAI',
    desc:    'GPT-4o, GPT-4.1, o3, o4-mini',
    keyName: 'OPENAI_API_KEY',
    keyUrl:  'https://platform.openai.com/api-keys',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o',      name: 'GPT-4o       · best all-rounder'  },
      { id: 'gpt-4.1',     name: 'GPT-4.1      · latest flagship'   },
      { id: 'o4-mini',     name: 'o4-mini      · fast reasoning'    },
      { id: 'o3',          name: 'o3           · deep reasoning'    },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini  · cheap & fast'      },
    ],
  },
  {
    id:      'gemini',
    name:    '✨ Google Gemini',
    desc:    'Gemini 2.0 Flash, Gemini 2.5 Pro',
    keyName: 'GEMINI_API_KEY',
    keyUrl:  'https://aistudio.google.com/apikey  (free)',
    baseUrl: null,
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash  · fast & capable' },
      { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro    · most capable'   },
      { id: 'gemini-1.5-pro',   name: 'Gemini 1.5 Pro    · 1M context'     },
    ],
  },
  {
    id:      'groq',
    name:    '🚀 Groq',
    desc:    'Ultra-fast inference — Llama, Mistral, Gemma',
    keyName: 'GROQ_API_KEY',
    keyUrl:  'https://console.groq.com/keys  (free)',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B   · fast & capable' },
      { id: 'llama3-70b-8192',         name: 'Llama3 70B      · 8K context'      },
      { id: 'mixtral-8x7b-32768',      name: 'Mixtral 8x7B    · 32K context'     },
    ],
  },
  {
    id:      'huggingface',
    name:    '🤗 HuggingFace',
    desc:    '500+ open source models via HF Inference Router',
    keyName: 'HUGGINGFACE_API_KEY',
    keyUrl:  'https://huggingface.co/settings/tokens  (free)',
    baseUrl: 'https://router.huggingface.co/v1',
    models: [
      { id: 'Qwen/Qwen2.5-Coder-32B-Instruct',    name: 'Qwen2.5 Coder 32B  · coding'  },
      { id: 'meta-llama/Llama-3.3-70B-Instruct',  name: 'Llama 3.3 70B      · general' },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B         · fast'    },
    ],
  },
  {
    id:      'openrouter',
    name:    '🔀 OpenRouter',
    desc:    '100+ models (Claude, GPT-4, Gemini) with one key',
    keyName: 'OPENAI_API_KEY',
    keyUrl:  'https://openrouter.ai/keys',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      { id: 'anthropic/claude-opus-4',      name: 'Claude Opus 4     · most capable' },
      { id: 'google/gemini-2.0-flash-001',  name: 'Gemini 2.0 Flash  · fast'         },
      { id: 'openai/gpt-4o',                name: 'GPT-4o            · balanced'      },
      { id: 'meta-llama/llama-3.3-70b',     name: 'Llama 3.3 70B    · open source'   },
    ],
  },
  {
    id:      'ollama',
    name:    '🏠 Ollama (Local)',
    desc:    '100% private — runs on your machine, no API key',
    keyName: null,
    keyUrl:  'https://ollama.com  →  install, then: ollama pull llama3.2',
    baseUrl: 'http://localhost:11434/v1',
    models: [
      { id: 'llama3.2',       name: 'Llama 3.2      · general purpose' },
      { id: 'qwen2.5-coder',  name: 'Qwen2.5 Coder  · coding focused'  },
      { id: 'mistral',        name: 'Mistral 7B     · fast'             },
      { id: 'codellama',      name: 'CodeLlama      · code completion'  },
    ],
  },
]

// ─── Terminal Helpers ─────────────────────────────────────────────────────────
function clear() { process.stdout.write('\x1bc') }

function banner() {
  console.log()
  console.log(`${C.bold}${C.cyan}  ╔══════════════════════════════════════════════════════╗${C.reset}`)
  console.log(`${C.bold}${C.cyan}  ║  ${C.white}CORTEX${C.cyan} — Autonomous AGI Terminal                  ║${C.reset}`)
  console.log(`${C.bold}${C.cyan}  ║  ${C.dim}Any LLM · One command · Open source${C.cyan}                  ║${C.reset}`)
  console.log(`${C.bold}${C.cyan}  ╚══════════════════════════════════════════════════════╝${C.reset}`)
  console.log()
}

function ask(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => { rl.question(q, a => { rl.close(); resolve(a.trim()) }) })
}

function askSecret(q: string): Promise<string> {
  return new Promise(resolve => {
    process.stdout.write(q)
    let input = ''
    process.stdin.setRawMode?.(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    const onData = (ch: string) => {
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        process.stdin.removeListener('data', onData)
        process.stdin.setRawMode?.(false)
        process.stdout.write('\n')
        resolve(input.trim())
      } else if (ch === '\u0003') { process.exit() }
      else if (ch === '\u007f') { if (input.length > 0) { input = input.slice(0,-1); process.stdout.write('\b \b') } }
      else { input += ch; process.stdout.write('*') }
    }
    process.stdin.on('data', onData)
  })
}

async function pickNumber(q: string, max: number): Promise<number> {
  while (true) {
    const a = await ask(q)
    const n = parseInt(a)
    if (!isNaN(n) && n >= 1 && n <= max) return n - 1
    console.log(`${C.red}  ✗ Enter a number from 1 to ${max}${C.reset}`)
  }
}

// ─── Config Persistence (in ~/.cortex/) ──────────────────────────────────────
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 }) // owner-only
  }
}

function readUserEnv(): Record<string, string> {
  if (!fs.existsSync(CONFIG_ENV)) return {}
  const lines = fs.readFileSync(CONFIG_ENV, 'utf8').split('\n')
  const result: Record<string, string> = {}
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) result[m[1]] = m[2]
  }
  return result
}

function writeUserEnv(updates: Record<string, string>) {
  ensureConfigDir()
  const existing = readUserEnv()
  const merged = { ...existing, ...updates }
  // Remove empty values
  const content = Object.entries(merged)
    .filter(([, v]) => v && v.length > 0)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  fs.writeFileSync(CONFIG_ENV, content + '\n', { encoding: 'utf8', mode: 0o600 }) // owner read-write only
}

function writeUserProfile(data: object) {
  ensureConfigDir()
  fs.writeFileSync(CONFIG_JSON, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 })
}

function readUserProfile(): Record<string, string> | null {
  if (!fs.existsSync(CONFIG_JSON)) return null
  try { return JSON.parse(fs.readFileSync(CONFIG_JSON, 'utf8')) } catch { return null }
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export async function runSetupWizard() {
  clear()
  banner()

  console.log(`${C.bold}${C.white}  Welcome to CORTEX! Let's get you set up.${C.reset}`)
  console.log(`${C.dim}  This runs once. After setup, just type ${C.bold}cortex${C.dim} to start.${C.reset}`)
  console.log(`${C.dim}  Your API keys are stored in ${C.bold}~/.cortex/.env${C.dim} (your machine only).${C.reset}`)
  console.log()

  // Check if already configured
  const existingProfile = readUserProfile()
  if (existingProfile?.provider) {
    console.log(`${C.yellow}  ⚡ Existing setup found: ${C.bold}${existingProfile.providerName}${C.yellow} · ${existingProfile.model}${C.reset}`)
    const reconf = await ask(`  Reconfigure? [y/N]: `)
    if (reconf.toLowerCase() !== 'y') {
      console.log(`\n${C.green}  ✓ Using existing configuration. Launching CORTEX...\n${C.reset}`)
      return readUserEnv()
    }
    console.log()
  }

  // ── Step 1: Provider ────────────────────────────────────────────────────
  console.log(`${C.bold}${C.yellow}  Step 1 — Choose your AI provider:${C.reset}\n`)
  PROVIDERS.forEach((p, i) => {
    console.log(`    ${C.bold}${C.cyan}${String(i + 1).padStart(2)}.${C.reset} ${C.bold}${p.name}${C.reset}`)
    console.log(`        ${C.dim}${p.desc}${C.reset}`)
  })
  console.log()

  const pi = await pickNumber(`  ${C.bold}Enter number [1-${PROVIDERS.length}]: ${C.reset}`, PROVIDERS.length)
  const provider = PROVIDERS[pi]

  clear(); banner()
  console.log(`  ${C.green}✓ Provider: ${C.bold}${provider.name}${C.reset}\n`)

  // ── Step 2: API Key ─────────────────────────────────────────────────────
  let apiKey = ''
  const existingEnv = readUserEnv()

  if (provider.keyName) {
    const existingKey = existingEnv[provider.keyName] || process.env[provider.keyName] || ''
    console.log(`${C.bold}${C.yellow}  Step 2 — API Key:${C.reset}\n`)
    console.log(`  ${C.dim}Get your key here (it's free):${C.reset}`)
    console.log(`  ${C.bold}${C.cyan}  ${provider.keyUrl}${C.reset}\n`)

    if (existingKey && existingKey.length > 8) {
      const masked = existingKey.slice(0, 6) + '****' + existingKey.slice(-4)
      console.log(`  ${C.dim}Found saved key: ${C.bold}${masked}${C.reset}`)
      const use = await ask(`  Use this key? [Y/n]: `)
      if (use.toLowerCase() !== 'n') {
        apiKey = existingKey
        console.log(`  ${C.green}✓ Using saved key${C.reset}`)
      }
    }

    if (!apiKey) {
      apiKey = await askSecret(`  ${C.bold}Paste your API key: ${C.reset}`)
      if (!apiKey || apiKey.length < 8) {
        console.log(`\n${C.red}  ✗ Key too short. Run ${C.bold}cortex setup${C.reset}${C.red} to try again.${C.reset}\n`)
        process.exit(1)
      }
      console.log(`  ${C.green}✓ Key received!${C.reset}`)
    }
  } else {
    console.log(`${C.bold}${C.yellow}  Step 2 — API Key:${C.reset}\n`)
    console.log(`  ${C.green}✓ No key needed — Ollama runs locally on your machine!${C.reset}`)
    console.log(`  ${C.dim}Make sure Ollama is running: ${C.bold}ollama serve${C.reset}`)
    await ask(`\n  Press Enter to continue...`)
  }

  // ── Step 3: Model ───────────────────────────────────────────────────────
  clear(); banner()
  console.log(`  ${C.green}✓ Provider: ${C.bold}${provider.name}${C.reset}`)
  if (apiKey) console.log(`  ${C.green}✓ API Key:  ${C.bold}****${apiKey.slice(-4)}${C.reset}`)
  console.log()
  console.log(`${C.bold}${C.yellow}  Step 3 — Choose your starting model:${C.reset}`)
  console.log(`  ${C.dim}(Switch anytime with ${C.bold}/model${C.dim} inside CORTEX)${C.reset}\n`)

  provider.models.forEach((m, i) => {
    console.log(`    ${C.bold}${C.cyan}${String(i + 1).padStart(2)}.${C.reset}  ${C.dim}${m.name}${C.reset}`)
  })
  console.log()

  const mi = await pickNumber(`  ${C.bold}Enter number [1-${provider.models.length}]: ${C.reset}`, provider.models.length)
  const model = provider.models[mi]

  // ── Build env vars ──────────────────────────────────────────────────────
  clear(); banner()
  console.log(`${C.bold}${C.white}  Saving your configuration to ~/.cortex/ ...${C.reset}\n`)

  const envUpdates: Record<string, string> = {
    CORTEX_PROVIDER:    provider.id,
    CORTEX_NVIDIA_ONLY: provider.id === 'nvidia' ? '1' : '0',
    OPENAI_MODEL:       model.id,
  }

  if (provider.baseUrl) {
    envUpdates['OPENAI_BASE_URL'] = provider.baseUrl
  }

  if (provider.id === 'nvidia') {
    envUpdates['NVIDIA_API_KEY']  = apiKey
    envUpdates['NVIDIA_MODEL_ID'] = model.id
    envUpdates['NVIDIA_BASE_URL'] = provider.baseUrl!
    envUpdates['OPENAI_API_KEY']  = apiKey
  } else if (provider.id === 'openai') {
    envUpdates['OPENAI_API_KEY'] = apiKey
  } else if (provider.id === 'gemini') {
    envUpdates['GEMINI_API_KEY'] = apiKey
    // Gemini uses its own provider path
  } else if (provider.id === 'groq') {
    envUpdates['GROQ_API_KEY']   = apiKey
    envUpdates['OPENAI_API_KEY'] = apiKey
  } else if (provider.id === 'huggingface') {
    envUpdates['HUGGINGFACE_API_KEY'] = apiKey
    envUpdates['OPENAI_API_KEY']      = apiKey
  } else if (provider.id === 'openrouter') {
    envUpdates['OPENAI_API_KEY'] = apiKey
  }

  // Save to ~/.cortex/.env
  writeUserEnv(envUpdates)

  // Save profile metadata (no keys)
  writeUserProfile({
    provider:     provider.id,
    providerName: provider.name,
    model:        model.id,
    modelName:    model.name,
    configuredAt: new Date().toISOString(),
  })

  console.log(`  ${C.green}✓ Config saved to ${C.bold}~/.cortex/.env${C.reset}`)
  console.log(`  ${C.green}✓ Provider: ${C.bold}${provider.name}${C.reset}`)
  console.log(`  ${C.green}✓ Model:    ${C.bold}${model.id}${C.reset}\n`)

  console.log(`${C.bold}${C.green}  ╔═══════════════════════════════════════╗${C.reset}`)
  console.log(`${C.bold}${C.green}  ║   🎉  CORTEX is ready!               ║${C.reset}`)
  console.log(`${C.bold}${C.green}  ╚═══════════════════════════════════════╝${C.reset}\n`)
  console.log(`  ${C.dim}Tip: Inside CORTEX, type ${C.bold}/model${C.dim} to switch models.${C.reset}`)
  console.log(`  ${C.dim}Tip: Type ${C.bold}cortex setup${C.dim} to switch providers anytime.${C.reset}\n`)

  return { ...readUserEnv(), ...envUpdates }
}

// Export config loader for the main CLI to use
export function loadUserConfig(): Record<string, string> {
  return readUserEnv()
}

export function isConfigured(): boolean {
  const env = readUserEnv()
  return !!(
    env['NVIDIA_API_KEY'] ||
    env['OPENAI_API_KEY'] ||
    env['GEMINI_API_KEY'] ||
    env['GROQ_API_KEY'] ||
    env['HUGGINGFACE_API_KEY'] ||
    env['CORTEX_PROVIDER'] === 'ollama'
  )
}
