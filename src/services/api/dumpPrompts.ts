import type { ClientOptions } from 'src/utils/anthropicMock.js'

export function getLastApiRequests(): Array<{
  timestamp: string
  request: unknown
}> {
  return []
}

export function clearApiRequestCache(): void {}

export function clearDumpState(_agentIdOrSessionId?: string): void {}

export function clearAllDumpState(): void {}

export function addApiRequestToCache(_requestData: unknown): void {}

export function getDumpPromptsPath(_agentIdOrSessionId?: string): string {
  return ''
}

export function createDumpPromptsFetch(
  _agentIdOrSessionId: string,
): ClientOptions['fetch'] {
  return undefined
}
