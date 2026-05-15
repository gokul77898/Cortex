import type { Command } from '../../commands.js'

const sessions = {
  type: 'local-jsx',
  name: 'sessions',
  description: 'Browse, resume, rename, or delete past sessions',
  load: () => import('./sessions.js'),
} satisfies Command

export default sessions
