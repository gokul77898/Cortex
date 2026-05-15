import type { Command } from '../../commands.js'

const undo = {
  type: 'local-jsx',
  name: 'undo',
  description: 'Undo the last file edit',
  load: () => import('./undo.js'),
} satisfies Command

export default undo
