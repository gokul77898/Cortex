import type { LocalJSXCommandCall } from '../../types/command.js'

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const parts = (args || '').trim().split(/\s+/)
  const subcommand = parts[0]?.toLowerCase() || 'status'

  switch (subcommand) {
    case 'start': {
      const token = parts[1] || ''
      const { startDaemon } = await import('../../services/daemon/index.js')
      const result = await startDaemon(token || undefined)
      onDone(result, { display: 'system' })
      return null
    }

    case 'stop': {
      const { stopDaemon } = await import('../../services/daemon/index.js')
      const result = await stopDaemon()
      onDone(result, { display: 'system' })
      return null
    }

    case 'token': {
      const token = parts[1]
      if (!token) {
        onDone('Usage: /daemon token <your_telegram_bot_token>', { display: 'system' })
        return null
      }
      const { setToken } = await import('../../services/daemon/index.js')
      const result = await setToken(token)
      onDone(result, { display: 'system' })
      return null
    }

    case 'tunnel': {
      const action = parts[1]?.toLowerCase()
      const { startTunnel, stopTunnel } = await import('../../services/daemon/index.js')
      if (action === 'stop') {
        stopTunnel()
        onDone('Tunnel stopped', { display: 'system' })
      } else {
        const url = await startTunnel(9977)
        if (url) {
          onDone(`Tunnel: ${url}`, { display: 'system' })
        } else {
          onDone('Tunnel unavailable (cloudflared not installed?)', { display: 'system' })
        }
      }
      return null
    }

    case 'status':
    default: {
      const { getDaemonStatus } = await import('../../services/daemon/index.js')
      const status = getDaemonStatus()
      onDone(
        `Daemon: ${status.state}\nBot: ${status.botRunning ? 'running (@' + status.botUsername + ')' : 'stopped'}\nTunnel: ${status.tunnelRunning ? 'up' : 'down'}\nUptime: ${status.uptime}s`,
        { display: 'system' }
      )
      return null
    }
  }
}
