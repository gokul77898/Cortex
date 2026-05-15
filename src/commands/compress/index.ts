import type { Command } from '../../commands.js'

const compress = {
  type: 'local-jsx',
  name: 'compress',
  description: 'Compress conversation context to reduce token usage',
  load: () => import('./compress.js'),
} satisfies Command

export default compress
