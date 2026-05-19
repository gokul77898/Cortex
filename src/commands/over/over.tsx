import * as React from 'react'
import { getSystemPromptInjection, setSystemPromptInjection } from '../../context.js'
import { stopServer } from '../legal/legalModeState.js'
import type { LocalJSXCommandCall, LocalJSXCommandOnDone, LocalJSXCommandContext } from '../../types/command.js'

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
  _args: string,
): Promise<React.ReactNode> => {
  const { setAppState } = context
  const injection = getSystemPromptInjection()

  const isLegalMode = injection?.includes('LEGAL ASSISTANT MODE')
  const isHunterMode = injection?.includes('SECURITY ASSESSMENT MODE')

  // Kill legal server if running
  stopServer()

  // Remove system prompt injection
  setSystemPromptInjection(null)

  // Reset model to default
  setAppState(prev => ({
    ...prev,
    mainLoopModel: null as any,
    mainLoopModelForSession: null,
  }))

  if (isLegalMode) {
    onDone('Legal mode deactivated. Model reset to default.', { display: 'system' })
  } else if (isHunterMode) {
    onDone('Security assessment mode deactivated. Model reset to default.', { display: 'system' })
  } else {
    onDone('System prompt injection cleared. Model reset to default.', { display: 'system' })
  }

  return null
}
