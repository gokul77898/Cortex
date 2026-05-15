import * as React from 'react'
import type { LocalJSXCommandCall, LocalJSXCommandContext, LocalJSXCommandOnDone } from '../../types/command.js'
import { Select } from '../../components/CustomSelect/index.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text } from '../../ink.js'

type SessionEntry = {
  id: string
  title: string
  model: string
  date: string
  messageCount: number
}

function loadSessions(): SessionEntry[] {
  try {
    const fs = require('fs') as typeof import('fs')
    const os = require('os') as typeof import('os')
    const path = require('path') as typeof import('path')
    const sessionsDir = path.join(os.homedir(), '.cortex', 'sessions')
    if (!fs.existsSync(sessionsDir)) return []
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json')).slice(-50)
    return files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(sessionsDir, f), 'utf8'))
        return {
          id: f.replace('.json', ''),
          title: data.title || f.replace('.json', ''),
          model: data.model || 'unknown',
          date: data.updatedAt || data.createdAt || 'unknown',
          messageCount: data.messages?.length ?? 0,
        }
      } catch { return null }
    }).filter(Boolean) as SessionEntry[]
  } catch { return [] }
}

function deleteSession(id: string): void {
  try {
    const fs = require('fs') as typeof import('fs')
    const os = require('os') as typeof import('os')
    const path = require('path') as typeof import('path')
    const file = path.join(os.homedir(), '.cortex', 'sessions', `${id}.json`)
    if (fs.existsSync(file)) fs.unlinkSync(file)
  } catch {}
}

function formatDate(d: string): string {
  if (d === 'unknown') return d
  try { return new Date(d).toLocaleString() } catch { return d }
}

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  _context: LocalJSXCommandContext,
  _args: string,
): Promise<React.ReactNode> => {
  return <SessionsMenu onDone={onDone} />
}

function SessionsMenu({ onDone }: { onDone: LocalJSXCommandOnDone }): React.ReactNode {
  const [sessions, setSessions] = React.useState(() => loadSessions())
  const [view, setView] = React.useState<'list' | 'detail' | null>('list')
  const [selected, setSelected] = React.useState<SessionEntry | null>(null)

  function handleCancel(): void {
    if (view === 'detail') { setView('list'); return }
    onDone('Sessions closed.', { display: 'system' })
  }

  if (sessions.length === 0) {
    return (
      <Dialog title="Session History" onCancel={() => onDone('No sessions found.', { display: 'system' })}>
        <Text dimColor>No past sessions found.</Text>
      </Dialog>
    )
  }

  if (view === 'list') {
    return (
      <Dialog title="Session History" subtitle={`${sessions.length} sessions`} onCancel={handleCancel}>
        <Select
          options={sessions.map(s => ({
            value: s.id,
            label: s.title,
            description: `${s.model} · ${s.messageCount} msgs · ${formatDate(s.date)}`,
          }))}
          onChange={(id: string) => {
            const session = sessions.find(s => s.id === id) ?? null
            setSelected(session)
            setView('detail')
          }}
        />
      </Dialog>
    )
  }

  if (view === 'detail' && selected) {
    return (
      <Dialog title={selected.title} subtitle={formatDate(selected.date)} onCancel={handleCancel}>
        <Box flexDirection="column" gap={1}>
          <Text>Model: {selected.model}</Text>
          <Text>Messages: {selected.messageCount}</Text>
          <Select
            options={[
              { value: 'resume', label: 'Resume session', description: 'Continue this conversation' },
              { value: 'delete', label: 'Delete session', description: 'Permanently remove' },
              { value: 'back', label: 'Back to list', description: '' },
            ]}
            onChange={(action: string) => {
              if (action === 'delete') {
                deleteSession(selected.id)
                const updated = sessions.filter(s => s.id !== selected.id)
                setSessions(updated)
                setView(updated.length > 0 ? 'list' : null)
                onDone(`Deleted session "${selected.title}".`, { display: 'system' })
              } else if (action === 'resume') {
                onDone(`Resuming session: ${selected.title}`, { display: 'system' })
              } else {
                setView('list')
              }
            }}
          />
        </Box>
      </Dialog>
    )
  }

  return null
}
