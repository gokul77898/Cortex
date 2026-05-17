import type { Command } from '../../commands.js'

const legal = {
  type: 'local-jsx',
  name: 'legal',
  description: 'Open CORTEX Legal Hub — Indian law, contract review, NDA triage, legal briefs (Owl Alpha)',
  load: () => import('./legal.js'),
} satisfies Command

export default legal
