import * as React from 'react'
import { setSystemPromptInjection } from '../../context.js'
import { stopServer } from '../legal/legalModeState.js'
import type { LocalJSXCommandCall, LocalJSXCommandOnDone, LocalJSXCommandContext } from '../../types/command.js'

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
  _args: string,
): Promise<React.ReactNode> => {
  const { getAppState, setAppState } = context
  const appState = getAppState()
  const currentModel = appState.mainLoopModel

  // Check if legal mode is active (model is Owl Alpha or system prompt injection is set)
  const isLegalMode = currentModel === 'openai/gpt-oss-120b:free'

  if (isLegalMode) {
    // Kill legal server
    stopServer()

    // Remove system prompt injection
    setSystemPromptInjection(null)

    // Reset model to default
    setAppState(prev => ({
      ...prev,
      mainLoopModel: null as any,
      mainLoopModelForSession: null,
    }))

    onDone('Legal mode deactivated. Server stopped. Model reset to default.', { display: 'system' })
  } else {
    onDone('Not in legal mode.', { display: 'system' })
  }

  return null
}
