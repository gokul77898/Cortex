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

  const isLegalMode = currentModel === 'openai/gpt-oss-120b:free'
  const isHunterMode = currentModel === 'minimax/minimax-m2.5:free'

  if (isLegalMode || isHunterMode) {
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

    const mode = isLegalMode ? 'Legal' : 'Hunter'
    onDone(`${mode} mode deactivated. Server stopped. Model reset to default.`, { display: 'system' })
  } else {
    // Always clear system prompt injection and reset as a safety measure
    setSystemPromptInjection(null)
    setAppState(prev => ({
      ...prev,
      mainLoopModel: null as any,
      mainLoopModelForSession: null,
    }))
    onDone('System prompt injection cleared. Model reset to default.', { display: 'system' })
  }

  return null
}
