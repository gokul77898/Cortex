import { agentManager, type AgentProfile } from './daemon/agentManager.js'

let _currentAgent: AgentProfile | null = null
let _loaded = false

export function loadAgentsForCLI(): void {
  if (!_loaded) {
    agentManager.load()
    _loaded = true
  }
}

export function detectAgentForQuery(query: string): AgentProfile | null {
  if (!_loaded) return null
  const agent = agentManager.getRelevantAgent(query)
  if (agent) {
    _currentAgent = agent
  }
  return agent
}

export function getCurrentAgent(): AgentProfile | null {
  return _currentAgent
}

export function setCurrentAgent(profile: AgentProfile | null): void {
  _currentAgent = profile
}

export function getAgentBridgeStatus(): string {
  if (!_loaded) return 'not loaded'
  if (!_currentAgent) return 'no agent detected'
  return `${_currentAgent.emoji || ''} ${_currentAgent.name}`
}
