#!/usr/bin/env bun
// @ts-nocheck
/**
 * CORTEX Setup Wizard
 * Run once: picks your provider, saves API key, launches CORTEX.
 * Like `claude` but for every LLM provider.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { execSync, spawn } from 'child_process'

// ─── ANSI Colors ─────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  cyan:   '\x1b[36m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
  white:  '\x1b[97m',
  bg_blue:'\x1b[44m',
}

// ─── Providers Catalog ────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id:       'nvidia',
    name:     '🟢 NVIDIA NIM',
    desc:     'DeepSeek, Mistral, Kimi, Qwen, Nemotron and 20+ more',
    keyName:  'NVIDIA_API_KEY',
    keyUrl:   'https://build.nvidia.com  → Get API Key',
    baseUrl:  'https://integrate.api.nvidia.com/v1',
    models: [
      { id: 'deepseek-ai/deepseek-v4-pro',                  name: 'DeepSeek V4 Pro       (flagship reasoning)'         },
      { id: 'deepseek-ai/deepseek-v4-flash',                name: 'DeepSeek V4 Flash      (fast, low rate-limits)'      },
      { id: 'mistralai/devstral-2-123b-instruct-2512',      name: 'Devstral 2 123B        (coding specialist)'          },
      { id: 'mistralai/mistral-large-3-675b-instruct-2512', name: 'Mistral Large 3 675B   (most powerful Mistral)'      },
      { id: 'moonshotai/kimi-k2.6',                         name: 'Kimi K2.6              (multimodal all-rounder)'     },
      { id: 'qwen/qwen3-coder-480b-a35b-instruct',          name: 'Qwen3 Coder 480B       (massive code model)'         },
      { id: 'nvidia/nemotron-3-super-120b-a12b',            name: 'Nemotron 3 Super 120B  (NVIDIA flagship)'            },
      { id: 'minimaxai/minimax-m2.7',                       name: 'MiniMax M2.7           (fast coding)'                },
    ],
  },
  {
    id:       'openai',
    name:     '⚡ OpenAI',
    desc:     'GPT-4o, GPT-4.1, o1, o3, o4-mini',
    keyName:  'OPENAI_API_KEY',
    keyUrl:   'https://platform.openai.com/api-keys',
    baseUrl:  'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o',             name: 'GPT-4o        (best all-rounder)'   },
      { id: 'gpt-4.1',            name: 'GPT-4.1       (latest flagship)'     },
      { id: 'o4-mini',            name: 'o4-mini       (fast reasoning)'      },
      { id: 'o3',                 name: 'o3            (deep reasoning)'      },
      { id: 'gpt-4o-mini',        name: 'GPT-4o Mini   (cheap & fast)'        },
    ],
  },
  {
    id:       'gemini',
    name:     '✨ Google Gemini',
    desc:     'Gemini 2.0 Flash, Gemini 1.5 Pro',
    keyName:  'GEMINI_API_KEY',
    keyUrl:   'https://aistudio.google.com/apikey',
    baseUrl:  null,
    models: [
      { id: 'gemini-2.0-flash',        name: 'Gemini 2.0 Flash   (fast & capable)' },
      { id: 'gemini-2.5-pro',          name: 'Gemini 2.5 Pro     (most capable)'   },
      { id: 'gemini-1.5-pro',          name: 'Gemini 1.5 Pro     (1M context)'     },
    ],
  },
  {
    id:       'huggingface',
    name:     '🤗 HuggingFace',
    desc:     '500+ open source models via the Inference Router',
    keyName:  'HUGGINGFACE_API_KEY',
    keyUrl:   'https://huggingface.co/settings/tokens',
    baseUrl:  'https://router.huggingface.co/v1',
    models: [
      { id: 'Qwen/Qwen2.5-Coder-32B-Instruct',   name: 'Qwen2.5 Coder 32B   (coding)' },
      { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B       (general)' },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B          (fast)'    },
    ],
  },
  {
    id:       'groq',
    name:     '🚀 Groq',
    desc:     'Ultra-fast inference — Llama, Mistral, Gemma',
    keyName:  'GROQ_API_KEY',
    keyUrl:   'https://console.groq.com/keys',
    baseUrl:  'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.3-70b-versatile',   name: 'Llama 3.3 70B    (fast & capable)' },
      { id: 'llama3-70b-8192',           name: 'Llama3 70B       (8K context)'      },
      { id: 'mixtral-8x7b-32768',        name: 'Mixtral 8x7B     (32K context)'     },
    ],
  },
  {
    id:       'ollama',
    name:     '🏠 Ollama (Local)',
    desc:     'Run models locally — 100% private, no API key needed',
    keyName:  null,
    keyUrl:   'https://ollama.com → pull your model first',
    baseUrl:  'http://localhost:11434/v1',
    models: [
      { id: 'llama3.2',        name: 'Llama 3.2       (general purpose)'   },
      { id: 'qwen2.5-coder',   name: 'Qwen2.5 Coder   (coding focused)'    },
      { id: 'mistral',         name: 'Mistral 7B      (fast)'               },
      { id: 'codellama',       name: 'CodeLlama       (code completion)'    },
    ],
  },
  {
    id:       'openrouter',
    name:     '🔀 OpenRouter',
    desc:     'Access 100+ models with one API key',
    keyName:  'OPENAI_API_KEY',
    keyUrl:   'https://openrouter.ai/keys',
    baseUrl:  'https://openrouter.ai/api/v1',
    models: [
      { id: 'anthropic/claude-opus-4',        name: 'Claude Opus 4    (most capable)'  },
      { id: 'google/gemini-2.0-flash-001',    name: 'Gemini 2.0 Flash (fast)'          },
      { id: 'openai/gpt-4o',                  name: 'GPT-4o           (balanced)'       },
      { id: 'meta-llama/llama-3.3-70b',       name: 'Llama 3.3 70B   (open source)'    },
    ],
  },
]

// ─── Utils ────────────────────────────────────────────────────────────────────
function clear() { process.stdout.write('\x1bc') }

function banner() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════╗${C.reset}`)
  console.log(`${C.bold}${C.cyan}║   ${C.white}  ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗  ${C.cyan}║${C.reset}`)
  console.log(`${C.bold}${C.cyan}║   ${C.white} ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝  ${C.cyan}║${C.reset}`)
  console.log(`${C.bold}${C.cyan}║   ${C.white} ██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝   ${C.cyan}║${C.reset}`)
  console.log(`${C.bold}${C.cyan}║   ${C.white} ██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗   ${C.cyan}║${C.reset}`)
  console.log(`${C.bold}${C.cyan}║   ${C.white} ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗  ${C.cyan}║${C.reset}`)
  console.log(`${C.bold}${C.cyan}║   ${C.white}  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝  ${C.cyan}║${C.reset}`)
  console.log(`${C.bold}${C.cyan}║   ${C.dim}  Autonomous AGI Terminal — Any LLM, One Command      ${C.cyan}║${C.reset}`)
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════╝${C.reset}\n`)
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function promptHidden(question: string): Promise<string> {
  return new Promise(resolve => {
    process.stdout.write(question)
    const rl = readline.createInterface({ input: process.stdin, terminal: false })
    // Try to hide input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode?.(true)
    }
    let input = ''
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    const onData = (char: string) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        process.stdin.removeListener('data', onData)
        if (process.stdin.isTTY) process.stdin.setRawMode?.(false)
        process.stdout.write('\n')
        resolve(input.trim())
      } else if (char === '\u0003') {
        process.exit()
      } else if (char === '\u007f') {
        if (input.length > 0) {
          input = input.slice(0, -1)
          process.stdout.write('\b \b')
        }
      } else {
        input += char
        process.stdout.write('*')
      }
    }
    process.stdin.on('data', onData)
    rl.close()
  })
}

function numPrompt(question: string, max: number): Promise<number> {
  return new Promise(async resolve => {
    while (true) {
      const ans = await prompt(question)
      const n = parseInt(ans)
      if (!isNaN(n) && n >= 1 && n <= max) {
        resolve(n - 1)
        break
      }
      console.log(`${C.red}  Please enter a number between 1 and ${max}${C.reset}`)
    }
  })
}

// ─── .env Writer ──────────────────────────────────────────────────────────────
function writeEnv(envPath: string, updates: Record<string, string>) {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^#?\\s*${key}\\s*=.*$`, 'm')
    const line = `${key}=${value}`
    if (regex.test(content)) {
      content = content.replace(regex, line)
    } else {
      content += `\n${line}`
    }
  }

  fs.writeFileSync(envPath, content, 'utf8')
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
async function main() {
  clear()
  banner()

  const envPath = path.resolve(process.cwd(), '.env')
  const profilePath = path.resolve(process.cwd(), '.cortex-profile.json')

  console.log(`${C.bold}${C.white}Welcome to CORTEX! Let's get you set up.${C.reset}`)
  console.log(`${C.dim}This runs once. After setup, just type ${C.bold}cortex${C.dim} to start.\n${C.reset}`)

  // ── Step 1: Choose Provider ──────────────────────────────────────────────
  console.log(`${C.bold}${C.yellow}Step 1 of 3 — Choose your AI provider:${C.reset}\n`)
  PROVIDERS.forEach((p, i) => {
    console.log(`  ${C.bold}${C.cyan}${i + 1}.${C.reset}  ${C.bold}${p.name}${C.reset}`)
    console.log(`      ${C.dim}${p.desc}${C.reset}`)
  })
  console.log()

  const providerIdx = await numPrompt(`${C.bold}Enter number [1-${PROVIDERS.length}]: ${C.reset}`, PROVIDERS.length)
  const provider = PROVIDERS[providerIdx]

  clear()
  banner()
  console.log(`${C.green}✓ Provider: ${C.bold}${provider.name}${C.reset}\n`)

  // ── Step 2: API Key ──────────────────────────────────────────────────────
  let apiKey = ''
  if (provider.keyName) {
    // Check if key already exists in env
    const existingKey = process.env[provider.keyName]

    console.log(`${C.bold}${C.yellow}Step 2 of 3 — API Key:${C.reset}\n`)
    console.log(`  ${C.dim}Get your free key at:${C.reset}`)
    console.log(`  ${C.bold}${C.cyan}${provider.keyUrl}${C.reset}\n`)

    if (existingKey && existingKey.length > 5) {
      const masked = existingKey.slice(0, 8) + '...' + existingKey.slice(-4)
      console.log(`  ${C.dim}Found existing key: ${C.bold}${masked}${C.reset}`)
      const useExisting = await prompt(`  Use this key? [Y/n]: `)
      if (useExisting.toLowerCase() !== 'n') {
        apiKey = existingKey
        console.log(`  ${C.green}✓ Using existing ${provider.keyName}${C.reset}`)
      }
    }

    if (!apiKey) {
      apiKey = await promptHidden(`  ${C.bold}Paste your API key: ${C.reset}`)
      if (!apiKey || apiKey.length < 8) {
        console.log(`\n${C.red}✗ API key too short. Please try again.${C.reset}`)
        process.exit(1)
      }
      console.log(`  ${C.green}✓ Key saved!${C.reset}`)
    }
  } else {
    console.log(`${C.bold}${C.yellow}Step 2 of 3 — API Key:${C.reset}\n`)
    console.log(`  ${C.green}✓ No API key needed for local Ollama!${C.reset}`)
    console.log(`  ${C.dim}Make sure Ollama is running: ${C.bold}ollama serve${C.reset}`)
    await prompt(`\n  Press Enter to continue...`)
  }

  // ── Step 3: Choose Model ─────────────────────────────────────────────────
  clear()
  banner()
  console.log(`${C.green}✓ Provider: ${C.bold}${provider.name}${C.reset}`)
  if (apiKey) console.log(`${C.green}✓ API Key: ${C.bold}${'*'.repeat(8)}...${apiKey.slice(-4)}${C.reset}`)
  console.log()

  console.log(`${C.bold}${C.yellow}Step 3 of 3 — Choose a starting model:${C.reset}\n`)
  console.log(`  ${C.dim}(You can switch anytime with ${C.bold}/model${C.dim} inside CORTEX)${C.reset}\n`)

  provider.models.forEach((m, i) => {
    console.log(`  ${C.bold}${C.cyan}${i + 1}.${C.reset}  ${C.dim}${m.name}${C.reset}`)
  })
  console.log()

  const modelIdx = await numPrompt(`${C.bold}Enter number [1-${provider.models.length}]: ${C.reset}`, provider.models.length)
  const model = provider.models[modelIdx]

  // ── Save Config ──────────────────────────────────────────────────────────
  clear()
  banner()
  console.log(`${C.bold}${C.white}Saving configuration...${C.reset}\n`)

  const envUpdates: Record<string, string> = {}

  // Set provider-specific vars
  if (provider.id === 'nvidia') {
    envUpdates['NVIDIA_API_KEY'] = apiKey
    envUpdates['NVIDIA_MODEL_ID'] = model.id
    envUpdates['NVIDIA_BASE_URL'] = provider.baseUrl!
    envUpdates['OPENAI_API_KEY'] = apiKey
    envUpdates['OPENAI_BASE_URL'] = provider.baseUrl!
    envUpdates['OPENAI_MODEL'] = model.id
    envUpdates['CORTEX_NVIDIA_ONLY'] = '1'
    // Remove other provider keys from active state
    envUpdates['HUGGINGFACE_API_KEY'] = ''
  } else if (provider.id === 'openai') {
    envUpdates['OPENAI_API_KEY'] = apiKey
    envUpdates['OPENAI_BASE_URL'] = provider.baseUrl!
    envUpdates['OPENAI_MODEL'] = model.id
    envUpdates['CORTEX_NVIDIA_ONLY'] = '0'
  } else if (provider.id === 'gemini') {
    envUpdates['GEMINI_API_KEY'] = apiKey
    envUpdates['CORTEX_NVIDIA_ONLY'] = '0'
  } else if (provider.id === 'huggingface') {
    envUpdates['HUGGINGFACE_API_KEY'] = apiKey
    envUpdates['OPENAI_API_KEY'] = apiKey
    envUpdates['OPENAI_BASE_URL'] = provider.baseUrl!
    envUpdates['OPENAI_MODEL'] = model.id
    envUpdates['CORTEX_NVIDIA_ONLY'] = '0'
  } else if (provider.id === 'groq') {
    envUpdates['GROQ_API_KEY'] = apiKey
    envUpdates['OPENAI_API_KEY'] = apiKey
    envUpdates['OPENAI_BASE_URL'] = provider.baseUrl!
    envUpdates['OPENAI_MODEL'] = model.id
    envUpdates['CORTEX_NVIDIA_ONLY'] = '0'
  } else if (provider.id === 'ollama') {
    envUpdates['OPENAI_BASE_URL'] = provider.baseUrl!
    envUpdates['OPENAI_MODEL'] = model.id
    envUpdates['CORTEX_NVIDIA_ONLY'] = '0'
  } else if (provider.id === 'openrouter') {
    envUpdates['OPENAI_API_KEY'] = apiKey
    envUpdates['OPENAI_BASE_URL'] = provider.baseUrl!
    envUpdates['OPENAI_MODEL'] = model.id
    envUpdates['CORTEX_NVIDIA_ONLY'] = '0'
  }

  writeEnv(envPath, envUpdates)

  // Also save a profile JSON for quick display
  const profileData = {
    provider: provider.id,
    providerName: provider.name,
    model: model.id,
    modelName: model.name,
    configuredAt: new Date().toISOString(),
  }
  fs.writeFileSync(profilePath, JSON.stringify(profileData, null, 2))

  console.log(`  ${C.green}✓ Saved .env${C.reset}`)
  console.log(`  ${C.green}✓ Provider: ${C.bold}${provider.name}${C.reset}`)
  console.log(`  ${C.green}✓ Model:    ${C.bold}${model.id}${C.reset}\n`)

  // ── Done! ────────────────────────────────────────────────────────────────
  console.log(`${C.bold}${C.green}╔══════════════════════════════════════════╗${C.reset}`)
  console.log(`${C.bold}${C.green}║   🎉  CORTEX is ready!                  ║${C.reset}`)
  console.log(`${C.bold}${C.green}╚══════════════════════════════════════════╝${C.reset}\n`)

  console.log(`  ${C.dim}Tip: Inside CORTEX, use ${C.bold}/model${C.dim} to switch models anytime.${C.reset}`)
  console.log(`  ${C.dim}Tip: Run ${C.bold}cortex setup${C.dim} anytime to reconfigure your provider.${C.reset}\n`)

  const launch = await prompt(`${C.bold}Launch CORTEX now? [Y/n]: ${C.reset}`)
  if (launch.toLowerCase() !== 'n') {
    console.log(`\n${C.dim}Starting CORTEX...${C.reset}\n`)
    const cliPath = path.resolve(process.cwd(), 'dist/cli.mjs')
    const proc = spawn('node', [cliPath], {
      stdio: 'inherit',
      env: { ...process.env, ...Object.fromEntries(Object.entries(envUpdates).filter(([,v]) => v !== '')) },
    })
    proc.on('exit', code => process.exit(code ?? 0))
  } else {
    console.log(`\n${C.dim}Run ${C.bold}cortex${C.dim} to start CORTEX anytime.${C.reset}\n`)
  }
}

await main()
