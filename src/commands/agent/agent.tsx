import * as React from 'react'
import type { LocalJSXCommandCall, LocalJSXCommandContext, LocalJSXCommandOnDone } from '../../types/command.js'
import { Select, type OptionWithDescription } from '../../components/CustomSelect/index.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text } from '../../ink.js'

type AgentEntry = {
  type: string
  name: string
  description: string
  category: string
}

function loadAgents(): AgentEntry[] {
  try {
    const fs = require('fs') as typeof import('fs')
    const path = require('path') as typeof import('path')
    const dir = path.join(process.cwd(), 'src/skills/agency')
    if (!fs.existsSync(dir)) return []
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.md') && !f.startsWith('docs'))
    return files.map((f: string) => {
      const content = fs.readFileSync(path.join(dir, f), 'utf8')
      const nameMatch = content.match(/^name:\s*(.+)$/m)
      const descMatch = content.match(/^description:\s*(.+)$/m)
      const cat = f.split('-')[0] ?? 'other'
      return {
        type: f.replace('.md', ''),
        name: nameMatch?.[1]?.trim() ?? f.replace('.md', ''),
        description: descMatch?.[1]?.trim() ?? '',
        category: cat,
      }
    }).filter(Boolean)
  } catch { return [] }
}

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  _context: LocalJSXCommandContext,
  args: string,
): Promise<React.ReactNode> => {
  const trimmed = args?.trim().toLowerCase() ?? ''
  const allAgents = loadAgents()

  if (trimmed) {
    const match = allAgents.find(a => a.type.toLowerCase().includes(trimmed) || a.name.toLowerCase().includes(trimmed))
    if (match) {
      onDone(
        `To chat with ${match.name}, use: Agent({subagent_type: "${match.name}", prompt: "Your message here"})`,
        { display: 'system' },
      )
      return null
    }
    return (
      <Dialog title="Agent Not Found" onCancel={() => onDone('No agent found.', { display: 'system' })}>
        <Text>No agent matches "{trimmed}". Run /agent to list all 162 agents.</Text>
      </Dialog>
    )
  }

  const categories = [...new Set(allAgents.map(a => a.category))]
  const options: OptionWithDescription[] = categories.map(c => ({
    value: c,
    label: c.charAt(0).toUpperCase() + c.slice(1),
    description: `${allAgents.filter(a => a.category === c).length} agents`,
  }))

  return (
    <Dialog title="Specialist Agents" subtitle="162 available — pick a category" onCancel={() => onDone('Cancelled.', { display: 'system' })}>
      <Select
        options={options}
        onChange={(cat: string) => {
          const agents = allAgents.filter(a => a.category === cat)
          const names = agents.map(a => `  • ${a.name} — ${a.description}`).join('\n')
          onDone(
            `**${cat.charAt(0).toUpperCase() + cat.slice(1)} Agents**\n${names}\n\nTo chat with one, use: /agent <name>`,
            { display: 'system' },
          )
        }}
      />
    </Dialog>
  )
}
