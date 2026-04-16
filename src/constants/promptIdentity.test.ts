import { afterEach, expect, test } from 'bun:test'

import { getSystemPrompt, DEFAULT_AGENT_PROMPT } from './prompts.js'
import { CLI_SYSPROMPT_PREFIXES, getCLISyspromptPrefix } from './system.js'
import { GENERAL_PURPOSE_AGENT } from '../tools/AgentTool/built-in/generalPurposeAgent.js'
import { EXPLORE_AGENT } from '../tools/AgentTool/built-in/exploreAgent.js'

const originalSimpleEnv = process.env.CORTEX_SIMPLE

afterEach(() => {
  process.env.CORTEX_SIMPLE = originalSimpleEnv
})

test('CLI identity prefixes describe CORTEX instead of CORTEX', () => {
  expect(getCLISyspromptPrefix()).toContain('CORTEX')
  expect(getCLISyspromptPrefix()).not.toContain("CORTEX's official CLI for CORTEX")

  for (const prefix of CLI_SYSPROMPT_PREFIXES) {
    expect(prefix).toContain('CORTEX')
    expect(prefix).not.toContain("CORTEX's official CLI for CORTEX")
  }
})

test('simple mode identity describes CORTEX instead of CORTEX', async () => {
  process.env.CORTEX_SIMPLE = '1'

  const prompt = await getSystemPrompt([], 'gpt-4o')

  expect(prompt[0]).toContain('CORTEX')
  expect(prompt[0]).not.toContain("CORTEX's official CLI for CORTEX")
})

test('built-in agent prompts describe CORTEX instead of CORTEX', () => {
  expect(DEFAULT_AGENT_PROMPT).toContain('CORTEX')
  expect(DEFAULT_AGENT_PROMPT).not.toContain("CORTEX's official CLI for CORTEX")

  const generalPrompt = GENERAL_PURPOSE_AGENT.getSystemPrompt({
    toolUseContext: { options: {} as never },
  })
  expect(generalPrompt).toContain('CORTEX')
  expect(generalPrompt).not.toContain("CORTEX's official CLI for CORTEX")

  const explorePrompt = EXPLORE_AGENT.getSystemPrompt({
    toolUseContext: { options: {} as never },
  })
  expect(explorePrompt).toContain('CORTEX')
  expect(explorePrompt).not.toContain("CORTEX's official CLI for CORTEX")
})
