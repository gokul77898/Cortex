import type { Command } from '../../commands.js'

const over = {
  type: 'local-jsx',
  name: 'over',
  description: 'Exit legal mode — stop server and reset model',
  load: () => import('./over.js'),
} satisfies Command

export default over
