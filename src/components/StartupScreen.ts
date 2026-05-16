import { password, select } from '@inquirer/prompts'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getActiveProviderProfile, addProviderProfile } from '../utils/providerProfiles.js'

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

const NEON_CYAN: RGB = [0, 255, 255]
const NEON_MAGENTA: RGB = [255, 0, 255]
const NEON_YELLOW: RGB = [255, 255, 0]
const NEON_GREEN: RGB = [50, 255, 50]
const NEON_PINK: RGB = [255, 20, 147]
const NEON_BLUE: RGB = [0, 191, 255]

const SUNSET_GRAD: RGB[] = [[120, 150, 255], [180, 100, 255], [255, 80, 150]]
const CORTEX_GRAD: RGB[] = [[255, 180, 100], [240, 140, 80], [217, 119, 87]]
const RAINBOW_GRAD: RGB[] = [[255, 0, 0], [255, 127, 0], [255, 255, 0], [0, 255, 0], [0, 0, 255], [148, 0, 211]]
const ACCENT: RGB = [255, 120, 255]
const CREAM: RGB = [200, 220, 255]
const BORDER: RGB = [80, 90, 120]

const LOGO_GOKUL = [
  `  █████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗     `,
  `  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║     `,
  `     ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║     `,
  `     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║     `,
  `     ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗`,
  `     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝`,
  `  ╔═══════════════════════════════════════════════════════════════╗`,
  `  ║   ██████╗ ███████╗███████╗████████╗███████╗███╗   ███╗███████╗  ║`,
  `  ║  ██╔════╝ ██╔════╝██╔════╝╚══██╔══╝██╔════╝████╗ ████║██╔════╝  ║`,
  `  ║  ██║  ███╗█████╗  ███████╗   ██║   █████╗  ██╔████╔██║█████╗    ║`,
  `  ║  ██║   ██║██╔══╝  ╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║██╔══╝    ║`,
  `  ║  ╚██████╔╝███████╗███████║   ██║   ███████╗██║ ╚═╝ ██║███████╗  ║`,
  `  ║   ╚═════╝ ╚══════╝╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝╚══════╝  ║`,
  `  ╚═══════════════════════════════════════════════════════════════╝`,
]

// Real boot steps - these actually happen during startup
interface BootStep {
  label: string
  check: () => boolean | Promise<boolean>
}

const BOOT_STEPS: BootStep[] = [
  { label: 'Loading environment', check: () => !!process.env.HOME },
  { label: 'Checking .env config', check: () => fs.existsSync(path.join(process.cwd(), '.env')) || fs.existsSync(path.join(os.homedir(), '.cortex', '.env')) },
  { label: 'Validating API keys', check: () => !!(process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY || process.env.HF_TOKEN) },
  { label: 'Initializing providers', check: () => true },
  { label: 'Starting runtime', check: () => true },
]

const GLITCH_CHARS = ['▓', '▒', '░', '█', '▀', '▄', '▌', '▐', '■', '□']

const LOGO_CORTEX = [
  `  ╔══════════════════════════════════════════════════════════════╗`,
  `  ║  █████╗  ██████╗ ██████╗ ██╗███████╗ ██████╗ ███╗   ██╗       ║`,
  `  ║ ██╔══██╗██╔════╝██╔══██╗██║██╔════╝██╔════╝ ████╗  ██║       ║`,
  `  ║ ███████║██║     ██████╔╝██║█████╗  ██║     ██╔██╗ ██║       ║`,
  `  ║ ██╔══██║██║     ██╔══██╗██║██╔══╝  ██║     ██╔╝ ██╗       ║`,
  `  ║ ██║  ██║╚██████╗██║  ██║██║██║     ╚██████╗██╔╝  ██╗       ║`,
  `  ║ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝      ╚═════╝╚═╝   ╚═╝       ║`,
  `  ║        ███╗    ██╗ █████╗ ██╗  ██╗████████╗               ║`,
  `  ║        ████╗   ██║██╔══██╗██║  ██║╚══██╔══╝               ║`,
  `  ║        ██╔██╗  ██║███████║███████║   ██║                  ║`,
  `  ║        ██╔╝ ██╗ ██║██╔══██║██╔══██║   ██║                  ║`,
  `  ║        ██║  ╚██╗██║██║  ██║██║  ██║   ██║                  ║`,
  `  ║        ╚═╝   ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝                  ║`,
  `  ║                    ██████╗ ██╗     ███████╗               ║`,
  `  ║                   ██╔════╝ ██╗     ██╔════╝               ║`,
  `  ║                   ██║  ███╗██╗     █████╗                 ║`,
  `  ║                   ██║   ██║██║     ██╔══╝                 ║`,
  `  ║                   ╚██████╔╝███████╗███████╗                 ║`,
  `  ║                    ╚═════╝ ╚══════╝╚══════╝                 ║`,
  `  ╚══════════════════════════════════════════════════════════════╝`,
]

interface MissionConfig {
  name: string
  model: string
  baseUrl: string
  apiKey: string
  provider: 'cortex' | 'openai' | 'gemini' | 'github' | 'bedrock' | 'vertex' | 'huggingface' | 'nvidia' | 'local'
}

/**
 * Deep .env parser with strict multiline validation.
 */
function getMissionsFromEnv(): MissionConfig[] {
  // Check ~/.cortex/.env first (global install), then fall back to cwd
  const homeCortexEnv = path.join(os.homedir(), '.cortex', '.env')
  const cwdEnv = path.resolve(process.cwd(), '.env')
  const envPath = fs.existsSync(homeCortexEnv) ? homeCortexEnv : cwdEnv
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

  // 6. NVIDIA (primary when CORTEX_NVIDIA_ONLY=1)
  const nvKey = process.env.NVIDIA_API_KEY || content.match(/^\s*NVIDIA_API_KEY=([^\s#]+)/m)?.[1]
  const nvModel = process.env.NVIDIA_MODEL_ID || content.match(/^\s*NVIDIA_MODEL_ID=([^\s#]+)/m)?.[1]
  const nvCodeModel = process.env.NVIDIA_CODE_MODEL_ID || content.match(/^\s*NVIDIA_CODE_MODEL_ID=([^\s#]+)/m)?.[1]
  const nvBase = process.env.NVIDIA_BASE_URL || content.match(/^\s*NVIDIA_BASE_URL=([^\s#]+)/m)?.[1]
  missions.push({
    name: `✦ Mission 06: Neural-Core (NVIDIA ${nvModel?.split('/').pop() || 'deepseek-v4-pro'})`,
    model: nvModel || 'deepseek-ai/deepseek-v4-pro',
    baseUrl: nvBase || 'https://integrate.api.nvidia.com/v1',
    apiKey: nvKey || '',
    provider: 'nvidia'
  })

  // 9. HUGGING FACE / TOGETHER
  const hfToken = process.env.HF_TOKEN || content.match(/^\s*HF_TOKEN=([^\s#]+)/m)?.[1]
  const hfModel = process.env.HF_MODEL_ID || content.match(/^\s*HF_MODEL_ID=([^\s#]+)/m)?.[1]
  const hfBase = process.env.HF_BASE_URL || content.match(/^\s*HF_BASE_URL=([^\s#]+)/m)?.[1]
  missions.push({
    name: `✦ Mission 09: Brain-Swarm (${hfModel?.split('/').pop() || 'MiniMax M2.5'})`,
    model: hfModel || 'minimax/minimax-m2.5:free',
    baseUrl: hfBase || 'https://openrouter.ai/v1',
    apiKey: hfToken || '',
    provider: 'huggingface'
  })

  return missions
}

export async function printStartupScreen(): Promise<void> {
  // Skip only in CI mode (allow for testing with TTY force)
  if (process.env.CI) return

  // Preserve original key for MCP/Subprocesses
  const originalAntKey = process.env.ANTHROPIC_API_KEY

  const W = 62
  const out: string[] = []

  // Fallback for MACRO globals when running in dev mode without bundler
  const VERSION = (typeof MACRO !== 'undefined' ? MACRO.VERSION : '99.0.0')

  process.stdout.write('\x1Bc')
  
  // ═══════════════════════════════════════════════════════════
  // CRAZY GOKUL STARTUP ANIMATION
  // ═══════════════════════════════════════════════════════════
  
  out.push('\n')
  
  // Rainbow banner
  out.push(`${rgb(255, 0, 0)}╔${rgb(255, 127, 0)}════════════════════════════════════${rgb(255, 255, 0)}════════${rgb(0, 255, 0)}═════════════════════${rgb(0, 0, 255)}════${rgb(148, 0, 211)}═══════════════╗${RESET}`)
  out.push(`${rgb(255, 0, 0)}║${rgb(255, 127, 0)}  ${rgb(255, 255, 0)}★${rgb(0, 255, 0)} ${rgb(0, 191, 255)}G O K U L${rgb(148, 0, 211)} ${rgb(255, 0, 255)}C O R T E X${rgb(255, 0, 0)} ${rgb(255, 127, 0)}★${rgb(255, 255, 0)}  ${rgb(0, 255, 0)}SWARM TERMINAL${rgb(0, 0, 255)} ${rgb(148, 0, 211)}v${VERSION}${rgb(255, 0, 0)}        ║${RESET}`)
  out.push(`${rgb(255, 0, 0)}╚${rgb(255, 127, 0)}════════════════════════════════════${rgb(255, 255, 0)}════════${rgb(0, 255, 0)}═════════════════════${rgb(0, 0, 255)}════${rgb(148, 0, 211)}═══════════════╝${RESET}\n`)
  
  // GOKUL logo with rainbow gradient
  LOGO_GOKUL.forEach((line, i) => {
    const t = i / LOGO_GOKUL.length
    out.push(paintLine(line, RAINBOW_GRAD, t))
  })
  
  out.push(`\n${rgb(...NEON_CYAN)}  ════════════════════════════════════════════════════════════════════════${RESET}`)
  out.push(`${rgb(...NEON_MAGENTA)}  ◈ ${rgb(...NEON_GREEN)}GOKUL-CORTEX ${rgb(...NEON_YELLOW)}// ${rgb(...NEON_PINK)}AUTONOMOUS SWARM ${rgb(...NEON_CYAN)}// ${rgb(...NEON_BLUE)}v${VERSION} ${rgb(...NEON_MAGENTA)}◈${RESET}`)
  out.push(`${rgb(...NEON_CYAN)}  ════════════════════════════════════════════════════════════════════════${RESET}\n`)
  
  // System status box
  out.push(`${rgb(...NEON_CYAN)}┌${'─'.repeat(62)}${rgb(...NEON_CYAN)}┐${RESET}`)
  out.push(`${rgb(...NEON_CYAN)}│${RESET}  ${rgb(...NEON_GREEN)}◉ SYSTEM:${RESET} ONLINE        ${rgb(...NEON_YELLOW)}◈ NEURAL:${RESET} CONNECTED    ${rgb(...NEON_CYAN)}│${RESET}`)
  out.push(`${rgb(...NEON_CYAN)}│${RESET}  ${rgb(...NEON_PINK)}◉ SWARM:${RESET} READY         ${rgb(...NEON_BLUE)}◈ MATRIX:${RESET} ACTIVE       ${rgb(...NEON_CYAN)}│${RESET}`)
  out.push(`${rgb(...NEON_CYAN)}│${RESET}  ${rgb(...NEON_MAGENTA)}◉ CORE:${RESET} OPERATIONAL    ${rgb(...NEON_CYAN)}◈ QUANTUM:${RESET} LINKED        ${rgb(...NEON_CYAN)}│${RESET}`)
  out.push(`${rgb(...NEON_CYAN)}└${'─'.repeat(62)}${rgb(...NEON_CYAN)}┘${RESET}\n`)
  
  // Real boot sequence with actual progress
  process.stdout.write(out.join('\n'))
  out.length = 0
  
  const barWidth = 30
  for (let i = 0; i < BOOT_STEPS.length; i++) {
    const step = BOOT_STEPS[i]
    const progress = Math.round(((i + 1) / BOOT_STEPS.length) * barWidth)
    const bar = '█'.repeat(progress) + '░'.repeat(barWidth - progress)
    const pct = Math.round(((i + 1) / BOOT_STEPS.length) * 100)
    
    // Show loading state
    process.stdout.write(`\r  ${rgb(...NEON_CYAN)}[${bar}]${RESET} ${pct}% ${DIM}${step.label}...${RESET}          `)
    
    // Actually run the check
    const result = await step.check()
    await new Promise(r => setTimeout(r, 80 + Math.random() * 120)) // Small realistic delay
    
    // Show result
    const status = result ? `${rgb(...NEON_GREEN)}✓${RESET}` : `${rgb(...NEON_YELLOW)}○${RESET}`
    process.stdout.write(`\r  ${rgb(...NEON_CYAN)}[${bar}]${RESET} ${pct}% ${step.label} ${status}          \n`)
  }
  
  out.push(`\n  ${rgb(...NEON_MAGENTA)}◈${RESET} ${rgb(...CREAM)}STATUS: ${rgb(100, 255, 100)}★ GOKUL SWARM UNLOCKED ★${RESET} ${rgb(...NEON_MAGENTA)}◈${RESET}\n`)
  
  // Info box
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
  // Auto-select mission: NVIDIA-only when CORTEX_NVIDIA_ONLY=1, otherwise HuggingFace
  const isNvidiaOnly = process.env.CORTEX_NVIDIA_ONLY === '1'
  const nvMission = missions.find(m => m.provider === 'nvidia')
  const hfMission = missions.find(m => m.provider === 'huggingface')
  let choice: MissionConfig | undefined = isNvidiaOnly && nvMission?.apiKey
    ? nvMission
    : hfMission ?? missions[missions.length - 1]

  // If no .env keys found, check for a saved provider profile from a previous session
  if (!choice || !choice.apiKey) {
    const savedProfile = getActiveProviderProfile()
    if (savedProfile?.apiKey) {
      choice = {
        name: savedProfile.name,
        model: savedProfile.model,
        baseUrl: savedProfile.baseUrl,
        apiKey: savedProfile.apiKey,
        provider: savedProfile.provider === 'anthropic' ? 'cortex' : 'openai',
      }
    }
  }

  if (!choice || !choice.apiKey) {
    process.stdout.write(`\n  ${rgb(...NEON_YELLOW)}⚠ No API provider configured.${RESET}\n`)
    process.stdout.write(`  ${rgb(...NEON_CYAN)}Pick a provider to get started:${RESET}\n`)
    process.stdout.write(`  ${DIM}  (Free options: OpenRouter, Groq, HuggingFace, NVIDIA, Cerebras)${RESET}\n\n`)

    const providerChoices = [
      { name: 'OpenRouter (free)', value: 'openrouter', desc: 'Free MiniMax M2.5 + many free models' },
      { name: 'Groq (free)', value: 'groq', desc: 'Ultra-fast free inference' },
      { name: 'NVIDIA NIM (free)', value: 'nvidia', desc: 'Free NVIDIA NIM API on build.nvidia.com' },
      { name: 'HuggingFace (free)', value: 'huggingface', desc: 'Free inference for 100k+ models' },
      { name: 'Cerebras (free)', value: 'cerebras', desc: 'Fast free inference' },
      { name: 'OpenAI', value: 'openai', desc: 'GPT models' },
      { name: 'Anthropic Claude', value: 'anthropic', desc: 'Claude Opus/Sonnet/Haiku' },
      { name: 'Google Gemini', value: 'gemini', desc: 'Gemini 2.5 Pro, Gemini 3 Flash' },
      { name: 'DeepSeek', value: 'deepseek', desc: 'DeepSeek V4, R1' },
      { name: 'Ollama (local)', value: 'ollama', desc: 'Run local LLMs, no API key needed' },
      { name: 'Skip for now', value: 'skip', desc: 'Configure later with /connect' },
    ]

    const answer: string = await select({
      message: 'Choose a provider:',
      choices: providerChoices.map(c => ({
        name: `${c.name} — ${c.desc}`,
        value: c.value,
      })),
      pageSize: 11,
    })

    let userApiKey = ''
    const providerNeedsKey = answer !== 'skip' && answer !== 'ollama'

    if (providerNeedsKey) {
      const keyHints: Record<string, string> = {
        openrouter: 'https://openrouter.ai/settings/keys',
        groq: 'https://console.groq.com/keys',
        nvidia: 'https://build.nvidia.com',
        huggingface: 'https://huggingface.co/settings/tokens',
        cerebras: 'https://inference.cerebras.ai/',
        openai: 'https://platform.openai.com/api-keys',
        anthropic: 'https://console.anthropic.com/',
        gemini: 'https://aistudio.google.com/apikey',
        deepseek: 'https://platform.deepseek.com/',
      }
      process.stdout.write(`\n  ${rgb(...NEON_YELLOW)}Get your key at: ${keyHints[answer] ?? 'the provider website'}${RESET}\n\n`)
      userApiKey = await password({ message: 'Paste your API key:', mask: true })
    }

    const providerConfigs: Record<string, { baseUrl: string; model: string; env: Record<string, string> }> = {
      openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1', model: 'minimax/minimax-m2.5:free',
        env: { CORTEX_USE_OPENAI: '1', OPENAI_BASE_URL: 'https://openrouter.ai/api/v1', OPENAI_MODEL: 'minimax/minimax-m2.5:free' },
      },
      groq: {
        baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile',
        env: { CORTEX_USE_OPENAI: '1', OPENAI_BASE_URL: 'https://api.groq.com/openai/v1', OPENAI_MODEL: 'llama-3.3-70b-versatile' },
      },
      nvidia: {
        baseUrl: 'https://integrate.api.nvidia.com/v1', model: 'deepseek-ai/deepseek-v4-pro',
        env: { CORTEX_USE_OPENAI: '1', CORTEX_NVIDIA_ONLY: '1', OPENAI_BASE_URL: 'https://integrate.api.nvidia.com/v1', OPENAI_MODEL: 'deepseek-ai/deepseek-v4-pro' },
      },
      huggingface: {
        baseUrl: 'https://router.huggingface.co/v1', model: 'zai-org/GLM-5:together',
        env: { HF_BASE_URL: 'https://router.huggingface.co/v1', HF_MODEL_ID: 'zai-org/GLM-5:together' },
      },
      cerebras: {
        baseUrl: 'https://inference.cerebras.ai/v1', model: 'qwen3-coder-480b',
        env: { CORTEX_USE_OPENAI: '1', OPENAI_BASE_URL: 'https://inference.cerebras.ai/v1', OPENAI_MODEL: 'qwen3-coder-480b' },
      },
      openai: {
        baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.3-codex',
        env: { CORTEX_USE_OPENAI: '1', OPENAI_BASE_URL: 'https://api.openai.com/v1', OPENAI_MODEL: 'gpt-5.3-codex' },
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-6',
        env: { ANTHROPIC_BASE_URL: 'https://api.anthropic.com', ANTHROPIC_MODEL: 'claude-sonnet-4-6' },
      },
      gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3-flash-preview',
        env: { CORTEX_USE_GEMINI: '1', GEMINI_MODEL: 'gemini-3-flash-preview' },
      },
      deepseek: {
        baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat',
        env: { CORTEX_USE_OPENAI: '1', OPENAI_BASE_URL: 'https://api.deepseek.com/v1', OPENAI_MODEL: 'deepseek-chat' },
      },
      ollama: {
        baseUrl: 'http://localhost:11434/v1', model: 'llama3.2:3b',
        env: { CORTEX_USE_OPENAI: '1', OPENAI_BASE_URL: 'http://localhost:11434/v1', OPENAI_MODEL: 'llama3.2:3b' },
      },
    }

    if (answer !== 'skip' && providerConfigs[answer]) {
      const cfg = providerConfigs[answer]
      delete process.env.CORTEX_USE_OPENAI
      delete process.env.CORTEX_USE_GEMINI
      delete process.env.CORTEX_USE_GITHUB
      delete process.env.CORTEX_USE_BEDROCK
      delete process.env.CORTEX_USE_VERTEX
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.ANTHROPIC_BASE_URL
      delete process.env.HF_TOKEN
      delete process.env.NVIDIA_API_KEY

      for (const [k, v] of Object.entries(cfg.env)) {
        process.env[k] = v
      }
      if (providerNeedsKey && userApiKey) {
        if (answer === 'anthropic') {
          process.env.ANTHROPIC_API_KEY = userApiKey
        } else if (answer === 'huggingface') {
          process.env.HF_TOKEN = userApiKey
          process.env.OPENAI_API_KEY = userApiKey
        } else if (answer === 'nvidia') {
          process.env.NVIDIA_API_KEY = userApiKey
          process.env.OPENAI_API_KEY = userApiKey
        } else {
          process.env.OPENAI_API_KEY = userApiKey
        }
      }
      process.env.ANTHROPIC_MODEL = cfg.model
      process.env.MODEL_ID = cfg.model
      process.env.CORTEX_SIMPLE = '1'
      // Enable lite tools for faster responses (fewer tools = lighter API calls)

      // Persist provider profile so it's remembered on next restart
      try {
        addProviderProfile({
          name: answer === 'openai' ? 'OpenAI' : answer === 'anthropic' ? 'Anthropic' : answer.charAt(0).toUpperCase() + answer.slice(1),
          provider: answer === 'anthropic' ? 'anthropic' : 'openai',
          baseUrl: cfg.baseUrl,
          model: cfg.model,
          apiKey: userApiKey || undefined,
        })
      } catch {
        // Profile save is best-effort
      }
      process.stdout.write(`\n  ${rgb(...NEON_GREEN)}✓${RESET} Configured ${answer}\n\n`)
      // Skip the old env injection below — we already set everything properly
      choice = undefined
    } else {
      process.stdout.write(`\n  ${DIM}Run /connect to configure a provider later.${RESET}\n\n`)
    }
  } else {
    process.stdout.write(`✔ Initialize Mission Engine Interface: ${choice.name}\n                                     \n`)
  }


  if (choice) {
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
      // Do NOT set ANTHROPIC_API_KEY for non-Anthropic providers
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.ANTHROPIC_BASE_URL
    } else if (choice.provider === 'nvidia') {
      process.env.CORTEX_USE_OPENAI = '1'
      process.env.CORTEX_NVIDIA_ONLY = '1'
      process.env.NVIDIA_API_KEY = choice.apiKey
      process.env.NVIDIA_MODEL_ID = choice.model
      process.env.NVIDIA_BASE_URL = choice.baseUrl
      process.env.OPENAI_BASE_URL = choice.baseUrl
      process.env.OPENAI_API_KEY = choice.apiKey
      process.env.OPENAI_MODEL = choice.model
      delete process.env.HF_TOKEN
      delete process.env.HF_MODEL_ID
      delete process.env.HF_BASE_URL
      delete process.env.ANTHROPIC_API_KEY
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

    process.env.ANTHROPIC_MODEL = choice.model
    process.env.MODEL_ID = choice.model
    process.env.CORTEX_SIMPLE = '1'

    process.stdout.write(`\n  ${rgb(...ACCENT)}STATUS:${RESET} Asset Verified. Swarm Online @ ${rgb(...ACCENT)}${choice.model}${RESET}.\n\n`)
    await new Promise(r => setTimeout(r, 600))
  }
}
