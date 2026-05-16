import * as React from 'react'

import type { LocalJSXCommandCall, LocalJSXCommandContext, LocalJSXCommandOnDone } from '../../types/command.js'
import { Select, type OptionWithDescription } from '../../components/CustomSelect/index.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text } from '../../ink.js'
import TextEntryPrompt from '../../components/TextInput.js'
import {
  addProviderProfile,
  type ProviderPreset,
} from '../../utils/providerProfiles.js'
import {
  ALL_PROVIDERS,
  FREE_PROVIDERS,
  PAID_PROVIDERS,
  LOCAL_PROVIDERS,
  ENTERPRISE_PROVIDERS,
  type ProviderEntry,
} from '../../utils/providerRegistry.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'

type Step =
  | { name: 'category' }
  | { name: 'provider'; category: string }
  | { name: 'api-key'; provider: ProviderEntry }
  | { name: 'done'; provider: ProviderEntry }

const CATEGORIES = [
  { id: 'free', label: 'Free / Open Models', description: 'Free: OpenRouter, Groq, HuggingFace, NVIDIA, Cerebras, Together AI' },
  { id: 'paid', label: 'Paid Cloud APIs', description: 'OpenAI, Anthropic, DeepSeek, Gemini, Mistral, xAI, Moonshot' },
  { id: 'local', label: 'Local Models', description: 'Ollama, LM Studio, llama.cpp, Atomic Chat' },
  { id: 'enterprise', label: 'Enterprise / Cloud', description: 'AWS Bedrock, Vertex AI, Azure OpenAI, DigitalOcean' },
]

function getProvidersForCategory(categoryId: string): ProviderEntry[] {
  switch (categoryId) {
    case 'free': return FREE_PROVIDERS
    case 'paid': return PAID_PROVIDERS
    case 'local': return LOCAL_PROVIDERS
    case 'enterprise': return ENTERPRISE_PROVIDERS
    default: return []
  }
}

function providerToOption(p: ProviderEntry): OptionWithDescription {
  return {
    value: p.id,
    label: `${p.name}${p.category === 'free' ? ' \u2606' : ''}`,
    description: p.description,
  }
}

function mapProviderToPreset(providerId: string): ProviderPreset {
  const presetMap: Record<string, ProviderPreset> = {
    openai: 'openai',
    anthropic: 'anthropic',
    gemini: 'gemini',
    ollama: 'ollama',
    'lm-studio': 'lmstudio',
    'llama-cpp': 'custom',
    'atomic-chat': 'custom',
    openrouter: 'openrouter',
    groq: 'groq',
    deepseek: 'deepseek',
    mistral: 'mistral',
    moonshot: 'moonshotai',
    together: 'together',
    'azure-openai': 'azure-openai',
  }
  return presetMap[providerId] ?? 'custom'
}

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  _context: LocalJSXCommandContext,
  _args: string,
): Promise<React.ReactNode> => {
  return <ConnectWizard onDone={onDone} />
}

function ConnectWizard({ onDone }: { onDone: LocalJSXCommandOnDone }): React.ReactNode {
  const [step, setStep] = React.useState<Step>({ name: 'category' })
  const [apiKeyInput, setApiKeyInput] = React.useState('')
  const [cursorOffset, setCursorOffset] = React.useState(0)
  const { columns } = useTerminalSize()

  function handleCancel(): void {
    onDone('Connect cancelled.', { display: 'system' })
  }

  function handleCategorySelect(categoryId: string): void {
    setStep({ name: 'provider', category: categoryId })
  }

  function handleProviderSelect(providerId: string): void {
    const provider = ALL_PROVIDERS.find(p => p.id === providerId)
    if (!provider) return
    if (!provider.requiresApiKey) {
      finishConnect(provider, undefined)
    } else {
      setStep({ name: 'api-key', provider })
    }
  }

  function handleApiKeySubmit(key: string): void {
    const provider = (step as { name: 'api-key'; provider: ProviderEntry }).provider
    finishConnect(provider, key.trim() || undefined)
  }

  function handleApiKeyChange(key: string): void {
    setApiKeyInput(key)
  }

  function finishConnect(provider: ProviderEntry, apiKey?: string): void {
    try {
      const profile = addProviderProfile({
        name: provider.name,
        provider: provider.isOpenAICompatible ? 'openai' : 'anthropic',
        baseUrl: provider.baseUrl,
        model: provider.defaultModel,
        apiKey,
      })
      if (profile) {
        onDone(
          `Connected to ${provider.name}!\nModel: ${provider.defaultModel}\nUse /model to change models.`,
          { display: 'system' },
        )
      } else {
        onDone(`Failed to save ${provider.name} profile.`, { display: 'system' })
      }
    } catch (err) {
      onDone(`Error: ${err instanceof Error ? err.message : String(err)}`, { display: 'system' })
    }
  }

  const inputColumns = Math.max(30, columns - 6)

  switch (step.name) {
    case 'category':
      return (
        <Dialog title="Connect an API provider" onCancel={handleCancel}>
          <Box flexDirection="column" gap={1}>
            <Text dimColor>Choose a category:</Text>
            <Select
              options={CATEGORIES.map(c => ({
                value: c.id,
                label: c.label,
                description: c.description,
              }))}
              onChange={handleCategorySelect}
            />
          </Box>
        </Dialog>
      )

    case 'provider': {
      const providers = getProvidersForCategory(step.category)
      return (
        <Dialog title="Select a provider" subtitle={`${providers.length} available`} onCancel={handleCancel}>
          <Box flexDirection="column" gap={1}>
            <Text dimColor>Choose a provider to connect:</Text>
            <Select
              options={providers.map(providerToOption)}
              onChange={handleProviderSelect}
            />
          </Box>
        </Dialog>
      )
    }

    case 'api-key': {
      const provider = step.provider
      return (
        <Dialog title={`${provider.name}`} subtitle="Enter your API key" onCancel={handleCancel}>
          <Box flexDirection="column" gap={1}>
            <Text dimColor>{provider.apiKeyHint}</Text>
            {provider.docsUrl ? <Text dimColor>Docs: {provider.docsUrl}</Text> : null}
            <TextEntryPrompt
              value={apiKeyInput}
              onChange={handleApiKeyChange}
              onSubmit={handleApiKeySubmit}
              placeholder="Paste your API key and press Enter..."
              mask="*"
              columns={inputColumns}
              cursorOffset={cursorOffset}
              onChangeCursorOffset={setCursorOffset}
              focus
              showCursor
            />
          </Box>
        </Dialog>
      )
    }

    default:
      return null
  }
}
