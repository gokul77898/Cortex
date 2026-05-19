import type { Command } from '../../commands.js'

const hunter = {
  type: 'local-jsx',
  name: 'hunter',
  description: 'Enter security assessment mode — Kali Linux + Playwright + 6-phase vuln scan with firewall/WAF tools',
  load: () => import('./hunter.js'),
} satisfies Command

export default hunter
