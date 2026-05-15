import * as React from 'react'

import type { LocalJSXCommandCall, LocalJSXCommandContext, LocalJSXCommandOnDone } from '../../types/command.js'
import { Select } from '../../components/CustomSelect/index.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text } from '../../ink.js'
import { saveGlobalConfig, getGlobalConfig } from '../../utils/config.js'

type Screen = 'menu' | 'add' | 'remove'

const EXTRA_TOOLS = [
  { value: 'Agent', label: 'Agent', desc: 'Spawn sub-agents for complex tasks' },
  { value: 'WebSearch', label: 'WebSearch', desc: 'Search the web' },
  { value: 'NotebookEdit', label: 'NotebookEdit', desc: 'Edit .ipynb notebooks' },
  { value: 'TodoWrite', label: 'TodoWrite', desc: 'Structured task tracking' },
  { value: 'TaskStop', label: 'TaskStop', desc: 'Stop runaway tasks' },
  { value: 'AskUserQuestion', label: 'AskUserQuestion', desc: 'Interactive user prompts' },
  { value: 'SendMessage', label: 'SendMessage', desc: 'Message sub-agents' },
  { value: 'SkillTool', label: 'SkillTool', desc: 'Auto-dispatch skills' },
  { value: 'BriefTool', label: 'BriefTool', desc: 'Generate session briefs' },
  { value: 'EnterPlanMode', label: 'EnterPlanMode', desc: 'Plan mode toggle' },
]

function getExtraTools(): string[] {
  const cfg = getGlobalConfig()
  return cfg.extraTools ?? []
}

function saveExtraTools(tools: string[]): void {
  saveGlobalConfig(c => ({ ...c, extraTools: tools }))
  process.env.CORTEX_EXTRA_TOOLS = tools.join(',')
}

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  _context: LocalJSXCommandContext,
  _args: string,
): Promise<React.ReactNode> => {
  return <ToolsMenu onDone={onDone} />
}

function ToolsMenu({ onDone }: { onDone: LocalJSXCommandOnDone }): React.ReactNode {
  const [screen, setScreen] = React.useState<Screen>('menu')
  const current = getExtraTools()

  function handleCancel(): void {
    onDone('Tools unchanged.', { display: 'system' })
  }

  if (screen === 'menu') {
    const activeTools = ['Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep', 'WebFetch', ...current]
    return (
      <Dialog title="Manage Tools" onCancel={handleCancel}>
        <Box flexDirection="column" gap={1}>
          <Text dimColor>Default tools (always on): Bash, Read, Edit, Write, Glob, Grep, WebFetch</Text>
          {current.length > 0 && <Text dimColor>Extra tools: {current.join(', ')}</Text>}
          <Select
              options={[
                { value: 'add', label: 'Add extra tool', description: 'Enable an optional tool' },
                { value: 'remove', label: 'Remove extra tool', description: 'Disable an optional tool' },
                ...(current.length > 0 ? [{ value: 'clear', label: 'Remove all extras', description: 'Reset to 7 default tools' }] : []),
              ]}
              onChange={(v: string) => {
              if (v === 'clear') {
                saveExtraTools([])
                onDone('Reset to 7 default tools.', { display: 'system' })
              } else {
                setScreen(v as Screen)
              }
            }}
          />
        </Box>
      </Dialog>
    )
  }

  const available = EXTRA_TOOLS.filter(t => !current.includes(t.value))
  if (screen === 'add' && available.length === 0) {
    return (
      <Dialog title="Add Tool" onCancel={() => setScreen('menu')}>
        <Text>All optional tools are already enabled!</Text>
      </Dialog>
    )
  }

  if (screen === 'add') {
    return (
      <Dialog title="Add Extra Tool" onCancel={() => setScreen('menu')}>
        <Select
          options={available.map(t => ({ value: t.value, label: t.label, description: t.desc }))}
          onChange={(v: string) => {
            const updated = [...current, v]
            saveExtraTools(updated)
            onDone(`Added ${v}. Now active: Bash, Read, Edit, Write, Glob, Grep, WebFetch${updated.length ? ', ' + updated.join(', ') : ''}`, { display: 'system' })
          }}
        />
      </Dialog>
    )
  }

  if (screen === 'remove') {
    if (current.length === 0) {
      return (
        <Dialog title="Remove Tool" onCancel={() => setScreen('menu')}>
          <Text>No extra tools to remove.</Text>
        </Dialog>
      )
    }
    return (
      <Dialog title="Remove Extra Tool" onCancel={() => setScreen('menu')}>
        <Select
          options={current.map(t => ({ value: t, label: t, description: '' }))}
          onChange={(v: string) => {
            const updated = current.filter(t => t !== v)
            saveExtraTools(updated)
            const msg = updated.length
              ? `Removed ${v}. Active extras: ${updated.join(', ')}`
              : `Removed ${v}. Only 7 default tools active.`
            onDone(msg, { display: 'system' })
          }}
        />
      </Dialog>
    )
  }

  return null
}
