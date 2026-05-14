import type { Command } from '../../commands.js'

const connect = {
  type: 'local-jsx',
  name: 'connect',
  description: 'Add a new API provider (75+ providers supported)',
  load: () => import('./connect.js'),
} satisfies Command

export default connect
