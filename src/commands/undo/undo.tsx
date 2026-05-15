import * as React from 'react'
import type { LocalJSXCommandCall, LocalJSXCommandContext, LocalJSXCommandOnDone } from '../../types/command.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text } from '../../ink.js'
import { undo } from '../../utils/undoManager.js'

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  _context: LocalJSXCommandContext,
  args: string,
): Promise<React.ReactNode> => {
  const filePath = args?.trim()
  if (!filePath) {
    return (
      <Dialog title="Undo" onCancel={() => onDone('Cancelled.', { display: 'system' })}>
        <Box flexDirection="column" gap={1}>
          <Text dimColor>Usage: /undo &lt;file-path&gt;</Text>
          <Text>Provide the file path to undo the last edit.</Text>
        </Box>
      </Dialog>
    )
  }
  try {
    const content = undo(filePath)
    if (!content) {
      return (
        <Dialog title="Undo" onCancel={() => onDone('No snapshots found.', { display: 'system' })}>
          <Text dimColor>No undo history for {filePath}</Text>
        </Dialog>
      )
    }
    const fs = await import('fs')
    fs.writeFileSync(filePath, content, 'utf8')
    return (
      <Dialog title="Undo" onCancel={() => onDone('Undone.', { display: 'system' })}>
        <Text>Restored previous version of {filePath}</Text>
      </Dialog>
    )
  } catch (err) {
    return (
      <Dialog title="Undo" onCancel={() => onDone('Error.', { display: 'system' })}>
        <Text color="error">Error: {err instanceof Error ? err.message : String(err)}</Text>
      </Dialog>
    )
  }
}
