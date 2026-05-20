import type { Command } from '../../commands.js'

const daemon = {
  type: 'local-jsx',
  name: 'daemon',
  description: 'Start/stop the 24/7 autonomous agent daemon with Telegram bot',
  load: () => import('./daemon.js'),
} satisfies Command

export default daemon
