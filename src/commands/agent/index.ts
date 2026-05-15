import type { Command } from '../../commands.js'

const agent = {
  type: 'local-jsx',
  name: 'agent',
  description: 'Chat directly with a specialist agent (162 available)',
  argumentHint: '<agent-name>',
  load: () => import('./agent.js'),
} satisfies Command

export default agent
