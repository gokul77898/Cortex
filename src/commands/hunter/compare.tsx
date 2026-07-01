import * as React from 'react'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandCall, LocalJSXCommandContext } from '../../types/command.js'
import { agentManager } from '../../services/daemon/agentManager.js'

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  const parts = (args || '').trim().split(/\s+/)
  const agentCount = Math.min(Math.max(parseInt(parts[0]) || 3, 2), 5)
  const query = parts.slice(1).join(' ') || parts.slice(0).join(' ')

  if (!query) {
    onDone(
      `Usage: /hunter compare [count] <query>
Examples:
  /hunter compare 3 build a React app
  /hunter compare find XSS on example.com

Runs the query through [count] different agents and shows their responses.`,
      { display: 'system' },
    )
    return null
  }

  try {
    if (!agentManager.isLoaded) agentManager.load()
    const allAgents = agentManager.getAllAgents()
    if (allAgents.length === 0) {
      onDone('No agent profiles loaded.', { display: 'system' })
      return null
    }

    const scored = allAgents
      .map(a => {
        const agent = agentManager.getRelevantAgent(query)
        if (agent && agent.id === a.id) return { agent: a, score: 100 }
        let score = 0
        const q = query.toLowerCase()
        if (a.name.toLowerCase().includes(q)) score += 5
        if (a.description.toLowerCase().includes(q)) score += 3
        return { agent: a, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, agentCount)

    if (scored.length === 0) {
      onDone('No matching agents found for query.', { display: 'system' })
      return null
    }

    context.setAppState(prev => ({
      ...prev,
      mainLoopModel: prev.mainLoopModel || process.env.OPENAI_MODEL || 'RefinedNeuro/vibethinker-3b-hermes:Q4_K_M',
      mainLoopModelForSession: null,
    }))

    const agentsLine = scored.map(s => `${s.agent.emoji || '•'} ${s.agent.name}`).join(', ')
    onDone(
      `[33m🔀 Agent Comparison Mode[0m
[90mQuery: ${query}[0m
[90mAgents (${scored.length}): ${agentsLine}[0m

[90mThe model will evaluate the query from each agent's perspective.[0m

[33mTop agents:[0m
${scored.map((s, i) => `  ${i + 1}. ${s.agent.emoji || '•'} ${s.agent.name} — ${s.agent.description}`).join('\n')}

[90mAsk the model to respond as each agent, or /over to exit.[0m`,
      { display: 'system' },
    )
  } catch (e) {
    onDone(`[31mError: ${e instanceof Error ? e.message : String(e)}[0m`, { display: 'system' })
  }

  return null
}
