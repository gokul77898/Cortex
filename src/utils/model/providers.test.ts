import { afterEach, expect, test } from 'bun:test'

const originalEnv = {
  CORTEX_USE_GEMINI: process.env.CORTEX_USE_GEMINI,
  CORTEX_USE_GITHUB: process.env.CORTEX_USE_GITHUB,
  CORTEX_USE_OPENAI: process.env.CORTEX_USE_OPENAI,
  CORTEX_USE_BEDROCK: process.env.CORTEX_USE_BEDROCK,
  CORTEX_USE_VERTEX: process.env.CORTEX_USE_VERTEX,
  CORTEX_USE_FOUNDRY: process.env.CORTEX_USE_FOUNDRY,
}

afterEach(() => {
  process.env.CORTEX_USE_GEMINI = originalEnv.CORTEX_USE_GEMINI
  process.env.CORTEX_USE_GITHUB = originalEnv.CORTEX_USE_GITHUB
  process.env.CORTEX_USE_OPENAI = originalEnv.CORTEX_USE_OPENAI
  process.env.CORTEX_USE_BEDROCK = originalEnv.CORTEX_USE_BEDROCK
  process.env.CORTEX_USE_VERTEX = originalEnv.CORTEX_USE_VERTEX
  process.env.CORTEX_USE_FOUNDRY = originalEnv.CORTEX_USE_FOUNDRY
})

async function importFreshProvidersModule() {
  return import(`./providers.js?ts=${Date.now()}-${Math.random()}`)
}

function clearProviderEnv(): void {
  delete process.env.CORTEX_USE_GEMINI
  delete process.env.CORTEX_USE_GITHUB
  delete process.env.CORTEX_USE_OPENAI
  delete process.env.CORTEX_USE_BEDROCK
  delete process.env.CORTEX_USE_VERTEX
  delete process.env.CORTEX_USE_FOUNDRY
}

test('first-party provider keeps CORTEX account setup flow enabled', () => {
  clearProviderEnv()
  return importFreshProvidersModule().then(
    ({ getAPIProvider, usesCORTEXAccountFlow }) => {
      expect(getAPIProvider()).toBe('firstParty')
      expect(usesCORTEXAccountFlow()).toBe(true)
    },
  )
})

test.each([
  ['CORTEX_USE_OPENAI', 'openai'],
  ['CORTEX_USE_GITHUB', 'github'],
  ['CORTEX_USE_GEMINI', 'gemini'],
  ['CORTEX_USE_BEDROCK', 'bedrock'],
  ['CORTEX_USE_VERTEX', 'vertex'],
  ['CORTEX_USE_FOUNDRY', 'foundry'],
] as const)(
  '%s disables CORTEX account setup flow',
  async (envKey, provider) => {
    clearProviderEnv()
    process.env[envKey] = '1'
    const { getAPIProvider, usesCORTEXAccountFlow } =
      await importFreshProvidersModule()

    expect(getAPIProvider()).toBe(provider)
    expect(usesCORTEXAccountFlow()).toBe(false)
  },
)

test('GEMINI takes precedence over GitHub when both are set', async () => {
  clearProviderEnv()
  process.env.CORTEX_USE_GEMINI = '1'
  process.env.CORTEX_USE_GITHUB = '1'
  const { getAPIProvider } = await importFreshProvidersModule()

  expect(getAPIProvider()).toBe('gemini')
})
