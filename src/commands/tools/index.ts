import type { Command } from '../../commands.js'

const tools = {
  type: 'local-jsx',
  name: 'tools',
  description: 'Manage which tools are available (7 default + optional extras)',
  load: () => import('./tools.js'),
} satisfies Command

export default tools
