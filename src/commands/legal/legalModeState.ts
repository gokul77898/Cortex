import type { ChildProcess } from 'child_process'

let serverProcess: ChildProcess | null = null

export function setServerProcess(p: ChildProcess | null): void {
  if (serverProcess && serverProcess.exitCode === null) {
    try { serverProcess.kill('SIGTERM') } catch {}
  }
  serverProcess = p
}

export function getServerProcess(): ChildProcess | null {
  return serverProcess
}

export function stopServer(): void {
  if (serverProcess && serverProcess.exitCode === null) {
    try { serverProcess.kill('SIGTERM') } catch {}
  }
  serverProcess = null
}
