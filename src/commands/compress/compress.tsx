import * as React from 'react'
import type { LocalJSXCommandCall, LocalJSXCommandContext, LocalJSXCommandOnDone } from '../../types/command.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text } from '../../ink.js'

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  _context: LocalJSXCommandContext,
  _args: string,
): Promise<React.ReactNode> => {
  return (
    <Dialog title="Compress Context" onCancel={() => onDone('Cancelled.', { display: 'system' })}>
      <Box flexDirection="column" gap={1}>
        <Text>Use this when you hit token limits like:</Text>
        <Text dimColor>"maximum context length is 131072 tokens"</Text>
        <Box marginTop={1}>
          <Text>Compression runs automatically when those errors occur.</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>For manual compression, type: continue with compressed history</Text>
        </Box>
      </Box>
    </Dialog>
  )
}
