import * as React from 'react'
import { spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { agentManager } from '../../services/daemon/agentManager.js'

let sensorProcess: ReturnType<typeof setInterval> | null = null
let logWatcher: ReturnType<typeof setInterval> | null = null

function isRunning(): boolean {
  return sensorProcess !== null
}

function stopSensor(): void {
  if (sensorProcess) {
    clearInterval(sensorProcess)
    sensorProcess = null
  }
  if (logWatcher) {
    clearInterval(logWatcher)
    logWatcher = null
  }
}

const LOG_FILE = join(process.env.HOME || '', '.cortex', 'sensor-output.log')

function detectErrorPatterns(content: string): string[] {
  const errors: string[] = []
  const patterns = [
    /error/i, /failed/i, /exception/i, /traceback/i, /segmentation fault/i,
    /killed/i, /oom/i, /out of memory/i, /cannot find/i, /not found/i,
    /permission denied/i, /EACCES/i, /EADDRINUSE/i, /ECONNREFUSED/i,
    /syntaxerror/i, /typeerror/i, /referenceerror/i, /undefined/i,
    /timed out/i, /timeout/i, /aborted/i, /panic/i,
  ]
  const lines = content.split('\n')
  for (const line of lines.slice(-100)) {
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        errors.push(line.trim())
        break
      }
    }
  }
  return errors.slice(0, 10)
}

function detectLongRunningCommands(content: string): number {
  const lines = content.split('\n')
  let runningCount = 0
  for (const line of lines.slice(-50)) {
    const trimmed = line.trim()
    if (trimmed.startsWith('$ ') || trimmed.startsWith('% ') || trimmed.startsWith('> ')) {
      runningCount++
    }
  }
  return runningCount
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const parts = (args || '').trim().split(/\s+/)
  const action = parts[0]?.toLowerCase()

  if (action === 'stop' || action === 'off') {
    stopSensor()
    delete process.env.SENSOR_MODE
    onDone('Sensor mode stopped.', { display: 'system' })
    return null
  }

  if (action === 'status') {
    if (isRunning()) {
      onDone('Sensor mode is ACTIVE. Watching for errors and long-running commands.', { display: 'system' })
    } else {
      onDone('Sensor mode is INACTIVE. Use /hunter sensor to start.', { display: 'system' })
    }
    return null
  }

  // Start sensor mode
  if (isRunning()) {
    onDone('Sensor mode is already running. Use /hunter sensor status to check, or /hunter sensor stop to stop.', { display: 'system' })
    return null
  }

  try {
    process.env.SENSOR_MODE = '1'
    mkdirSync(join(process.env.HOME || '', '.cortex'), { recursive: true })

    if (!agentManager.isLoaded) agentManager.load()

    let lastContent = ''
    const INTERVAL_MS = 5000

    logWatcher = setInterval(() => {
      try {
        if (!existsSync(LOG_FILE)) return
        const content = readFileSync(LOG_FILE, 'utf-8')
        if (content === lastContent) return
        lastContent = content

        const errors = detectErrorPatterns(content)
        const runningCmds = detectLongRunningCommands(content)

        if (errors.length > 0 || runningCmds > 5) {
          const errorSummary = errors.slice(0, 3).join('; ')
          const agent = agentManager.getRelevantAgent(errorSummary || 'debug terminal error')
          const agentHint = agent ? `${agent.emoji || '•'} ${agent.name} would be best for this.` : ''
          const msg = `[SENSOR] ${errors.length > 0 ? `Detected ${errors.length} error(s): ${errorSummary}` : ''}${runningCmds > 5 ? ` ${runningCmds} commands running.` : ''} ${agentHint}`
          try {
            writeFileSync(LOG_FILE, content + '\n# ' + msg + '\n', 'utf-8')
          } catch {}
        }
      } catch {}
    }, INTERVAL_MS)

    sensorProcess = setInterval(() => {
      const now = new Date().toISOString()
      try {
        writeFileSync(LOG_FILE, `[${now}] Sensor heartbeat\n`, { flag: 'a' })
      } catch {}
    }, 60000)

    onDone(
      `[32m🔍 Sensor Mode Active[0m
[90mWatching terminal output for errors and long-running commands.[0m
[90mLog: ${LOG_FILE}[0m
[90mAuto-detects errors and recommends the best agent to fix them.[0m

[90mCommands:[0m
[90m  /hunter sensor status — check if running[0m
[90m  /hunter sensor stop   — stop sensor mode[0m`,
      { display: 'system' },
    )
  } catch (e) {
    onDone(`[31mFailed to start sensor: ${e instanceof Error ? e.message : String(e)}[0m`, { display: 'system' })
  }

  return null
}
