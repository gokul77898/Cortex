import { spawn } from 'child_process'

let tunnelProcess: ReturnType<typeof spawn> | null = null

export async function startTunnel(port: number): Promise<string | null> {
  if (tunnelProcess) return null

  return new Promise(resolve => {
    const proc = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let url: string | null = null
    const onData = (chunk: Buffer) => {
      const text = chunk.toString()
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
      if (match) {
        url = match[0]
        tunnelProcess = proc
        resolve(url)
      }
    }
    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', onData)
    proc.on('error', () => resolve(null))
    proc.on('exit', () => {
      tunnelProcess = null
      if (!url) resolve(null)
    })

    setTimeout(() => {
      if (!url) {
        proc.kill()
        resolve(null)
      }
    }, 15000)
  })
}

export function stopTunnel() {
  if (tunnelProcess) {
    tunnelProcess.kill()
    tunnelProcess = null
  }
}

export function isTunnelRunning(): boolean {
  return tunnelProcess !== null
}
