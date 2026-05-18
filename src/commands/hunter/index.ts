import type { Command } from '../../commands.js'

const hunter = {
  type: 'local-jsx',
  name: 'hunter',
  description: 'Full bug bounty hunter — auto scan a website for vulnerabilities using Playwright + 200+ tools',
  load: () => import('./hunter.js'),
} satisfies Command

export default hunter
