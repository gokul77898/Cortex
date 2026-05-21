import type { Command } from '../../commands.js'

const more = {
  type: 'local-jsx',
  name: 'more',
  description: 'Manage MCP servers and agents',
  immediate: true,
  argumentHint: '[mcp|agents]',
  load: () => import('./more.js'),
} satisfies Command

export default more
