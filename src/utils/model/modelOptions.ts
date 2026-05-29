// biome-ignore-all assist/source/organizeImports: internal-only import markers must not be reordered
import { getActiveProviderModelOptions } from '../providerRegistry.js'
import { getInitialMainLoopModel } from '../../bootstrap/state.js'
import {
  isCORTEXAISubscriber,
  isMaxSubscriber,
  isTeamPremiumSubscriber,
} from '../auth.js'
import { getModelStrings } from './modelStrings.js'
import { getAntModels } from './antModels.js'
import {
  COST_TIER_3_15,
  COST_HAIKU_35,
  COST_HAIKU_45,
  formatModelPricing,
} from '../modelCost.js'
import { getSettings_DEPRECATED } from '../settings/settings.js'
import { checkOpus1mAccess, checkSonnet1mAccess } from './check1mAccess.js'
import { getAPIProvider } from './providers.js'
import { isModelAllowed } from './modelAllowlist.js'
import {
  getCanonicalName,
  getCORTEXAiUserDefaultModelDescription,
  getDefaultSonnetModel,
  getDefaultOpusModel,
  getDefaultHaikuModel,
  getDefaultMainLoopModelSetting,
  getMarketingNameForModel,
  getUserSpecifiedModelSetting,
  isOpus1mMergeEnabled,
  getOpus46PricingSuffix,
  renderDefaultModelSetting,
  type ModelSetting,
} from './model.js'
import { has1mContext } from '../context.js'
import { getGlobalConfig } from '../config.js'
import { getActiveOpenAIModelOptionsCache } from '../providerProfiles.js'
import { getCachedOllamaModelOptions, isOllamaProvider } from './ollamaModels.js'

// @[MODEL LAUNCH]: Update all the available and default model option strings below.

export type ModelOption = {
  value: ModelSetting
  label: string
  description: string
  descriptionForModel?: string
}

export function getDefaultOptionForUser(fastMode = false): ModelOption {
  if (process.env.USER_TYPE === 'ant') {
    const currentModel = renderDefaultModelSetting(
      getDefaultMainLoopModelSetting(),
    )
    return {
      value: null,
      label: 'Default (recommended)',
      description: `Use the default model for Ants (currently ${currentModel})`,
      descriptionForModel: `Default model (currently ${currentModel})`,
    }
  }

  // Subscribers
  if (isCORTEXAISubscriber()) {
    return {
      value: null,
      label: 'Default (recommended)',
      description: getCORTEXAiUserDefaultModelDescription(fastMode),
    }
  }

  // PAYG
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: null,
    label: 'Default (recommended)',
    description: `Use the default model (currently ${renderDefaultModelSetting(getDefaultMainLoopModelSetting())})${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
  }
}

function getCustomSonnetOption(): ModelOption | undefined {
  const is3P = getAPIProvider() !== 'firstParty'
  const customSonnetModel = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL
  // When a 3P user has a custom sonnet model string, show it directly
  if (is3P && customSonnetModel) {
    const is1m = has1mContext(customSonnetModel)
    return {
      value: 'sonnet',
      label:
        process.env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME ?? customSonnetModel,
      description:
        process.env.ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION ??
        `Custom Sonnet model${is1m ? ' (1M context)' : ''}`,
      descriptionForModel: `${process.env.ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION ?? `Custom Sonnet model${is1m ? ' with 1M context' : ''}`} (${customSonnetModel})`,
    }
  }
}

// @[MODEL LAUNCH]: Update or add model option functions (getSonnetXXOption, getOpusXXOption, etc.)
// with the new model's label and description. These appear in the /model picker.
function getSonnet46Option(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().sonnet46 : 'sonnet',
    label: 'Sonnet',
    description: `Sonnet 4.6 · Best for everyday tasks${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
    descriptionForModel:
      'Sonnet 4.6 - best for everyday tasks. Generally recommended for most coding tasks',
  }
}

function getCustomOpusOption(): ModelOption | undefined {
  const is3P = getAPIProvider() !== 'firstParty'
  const customOpusModel = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL
  // When a 3P user has a custom opus model string, show it directly
  if (is3P && customOpusModel) {
    const is1m = has1mContext(customOpusModel)
    return {
      value: 'opus',
      label: process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME ?? customOpusModel,
      description:
        process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION ??
        `Custom Opus model${is1m ? ' (1M context)' : ''}`,
      descriptionForModel: `${process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION ?? `Custom Opus model${is1m ? ' with 1M context' : ''}`} (${customOpusModel})`,
    }
  }
}

function getOpus41Option(): ModelOption {
  return {
    value: 'opus',
    label: 'Opus 4.1',
    description: `Opus 4.1 · Legacy`,
    descriptionForModel: 'Opus 4.1 - legacy version',
  }
}

function getOpus46Option(fastMode = false): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().opus46 : 'opus',
    label: 'Opus',
    description: `Opus 4.6 · Most capable for complex work${getOpus46PricingSuffix(fastMode)}`,
    descriptionForModel: 'Opus 4.6 - most capable for complex work',
  }
}

export function getSonnet46_1MOption(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().sonnet46 + '[1m]' : 'sonnet[1m]',
    label: 'Sonnet (1M context)',
    description: `Sonnet 4.6 for long sessions${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
    descriptionForModel:
      'Sonnet 4.6 with 1M context window - for long sessions with large codebases',
  }
}

export function getOpus46_1MOption(fastMode = false): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().opus46 + '[1m]' : 'opus[1m]',
    label: 'Opus (1M context)',
    description: `Opus 4.6 for long sessions${getOpus46PricingSuffix(fastMode)}`,
    descriptionForModel:
      'Opus 4.6 with 1M context window - for long sessions with large codebases',
  }
}

function getCustomHaikuOption(): ModelOption | undefined {
  const is3P = getAPIProvider() !== 'firstParty'
  const customHaikuModel = process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL
  // When a 3P user has a custom haiku model string, show it directly
  if (is3P && customHaikuModel) {
    return {
      value: 'haiku',
      label: process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME ?? customHaikuModel,
      description:
        process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION ??
        'Custom Haiku model',
      descriptionForModel: `${process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION ?? 'Custom Haiku model'} (${customHaikuModel})`,
    }
  }
}

function getHaiku45Option(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: 'haiku',
    label: 'Haiku',
    description: `Haiku 4.5 · Fastest for quick answers${is3P ? '' : ` · ${formatModelPricing(COST_HAIKU_45)}`}`,
    descriptionForModel:
      'Haiku 4.5 - fastest for quick answers. Lower cost but less capable than Sonnet 4.6.',
  }
}

function getHaiku35Option(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: 'haiku',
    label: 'Haiku',
    description: `Haiku 3.5 for simple tasks${is3P ? '' : ` · ${formatModelPricing(COST_HAIKU_35)}`}`,
    descriptionForModel:
      'Haiku 3.5 - faster and lower cost, but less capable than Sonnet. Use for simple tasks.',
  }
}

function getHaikuOption(): ModelOption {
  // Return correct Haiku option based on provider
  const haikuModel = getDefaultHaikuModel()
  return haikuModel === getModelStrings().haiku45
    ? getHaiku45Option()
    : getHaiku35Option()
}

function getMaxOpusOption(fastMode = false): ModelOption {
  return {
    value: 'opus',
    label: 'Opus',
    description: `Opus 4.6 · Most capable for complex work${fastMode ? getOpus46PricingSuffix(true) : ''}`,
  }
}

export function getMaxSonnet46_1MOption(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  const billingInfo = isCORTEXAISubscriber() ? ' · Billed as extra usage' : ''
  return {
    value: 'sonnet[1m]',
    label: 'Sonnet (1M context)',
    description: `Sonnet 4.6 with 1M context${billingInfo}${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
  }
}

export function getMaxOpus46_1MOption(fastMode = false): ModelOption {
  const billingInfo = isCORTEXAISubscriber() ? ' · Billed as extra usage' : ''
  return {
    value: 'opus[1m]',
    label: 'Opus (1M context)',
    description: `Opus 4.6 with 1M context${billingInfo}${getOpus46PricingSuffix(fastMode)}`,
  }
}

function getMergedOpus1MOption(fastMode = false): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().opus46 + '[1m]' : 'opus[1m]',
    label: 'Opus (1M context)',
    description: `Opus 4.6 with 1M context · Most capable for complex work${!is3P && fastMode ? getOpus46PricingSuffix(fastMode) : ''}`,
    descriptionForModel:
      'Opus 4.6 with 1M context - most capable for complex work',
  }
}

const MaxSonnet46Option: ModelOption = {
  value: 'sonnet',
  label: 'Sonnet',
  description: 'Sonnet 4.6 · Best for everyday tasks',
}

const MaxHaiku45Option: ModelOption = {
  value: 'haiku',
  label: 'Haiku',
  description: 'Haiku 4.5 · Fastest for quick answers',
}

function getOpusPlanOption(): ModelOption {
  return {
    value: 'opusplan',
    label: 'Opus Plan Mode',
    description: 'Use Opus 4.6 in plan mode, Sonnet 4.6 otherwise',
  }
}

function getCodexPlanOption(): ModelOption {
  return {
    value: 'gpt-5.4',
    label: 'gpt-5.4',
    description: 'GPT-5.4 on the Codex backend with high reasoning',
  }
}

function getCodexSparkOption(): ModelOption {
  return {
    value: 'gpt-5.3-codex-spark',
    label: 'gpt-5.3-codex-spark',
    description: 'GPT-5.3 Codex Spark on the Codex backend for fast tool loops',
  }
}

function getCodexModelOptions(): ModelOption[] {
  return [
    {
      value: 'gpt-5.4',
      label: 'gpt-5.4',
      description: 'GPT-5.4 with high reasoning',
    },
    {
      value: 'gpt-5.3-codex',
      label: 'gpt-5.3-codex',
      description: 'GPT-5.3 Codex with high reasoning',
    },
    {
      value: 'gpt-5.3-codex-spark',
      label: 'gpt-5.3-codex-spark',
      description: 'GPT-5.3 Codex Spark for fast tool loops',
    },
    {
      value: 'codexspark',
      label: 'codexspark',
      description: 'GPT-5.3 Codex Spark alias for fast tool loops',
    },
    {
      value: 'gpt-5.2-codex',
      label: 'gpt-5.2-codex',
      description: 'GPT-5.2 Codex with high reasoning',
    },
    {
      value: 'gpt-5.1-codex-max',
      label: 'gpt-5.1-codex-max',
      description: 'GPT-5.1 Codex Max for deep reasoning',
    },
    {
      value: 'gpt-5.1-codex-mini',
      label: 'gpt-5.1-codex-mini',
      description: 'GPT-5.1 Codex Mini - faster, cheaper',
    },
    {
      value: 'gpt-5.4-mini',
      label: 'gpt-5.4-mini',
      description: 'GPT-5.4 Mini - faster, cheaper',
    },
  ]
}

// =============================================================================
// NVIDIA NIM API — All Available Models
// When CORTEX_NVIDIA_ONLY=1 is set, /model shows ONLY these models.
// =============================================================================
function getNvidiaNimModelOptions(): ModelOption[] {
  return [
    {
      value: 'meta/esm2-650m',
      label: 'ESM2 650M',
      description: 'Protein embeddings from amino acid sequences',
    },
    {
      value: 'stepfun-ai/step-3.7-flash',
      label: 'Step 3.7 Flash',
      description: 'Sparse MoE multimodal reasoning · Agentic & coding',
    },
    {
      value: 'z-ai/glm-5.1',
      label: 'GLM 5.1',
      description: 'Agentic AI · Strong general purpose',
    },
    {
      value: 'nvidia/nemotron-3-content-safety',
      label: 'Nemotron 3 Content Safety',
      description: 'Multilingual safety & toxicity detection',
    },
    {
      value: 'minimaxai/minimax-m2.7',
      label: 'MiniMax M2.7',
      description: '230B params · Coding, reasoning & office tasks',
    },
    {
      value: 'stepfun-ai/step-3.5-flash',
      label: 'Step 3.5 Flash',
      description: '200B MoE reasoning engine · Agentic & fast',
    },
    {
      value: 'mistralai/mistral-large-3-675b-instruct-2512',
      label: 'Mistral Large 3 675B',
      description: '675B MoE VLM · General purpose & agentic',
    },
    {
      value: 'qwen/qwen3-coder-480b-a35b-instruct',
      label: 'Qwen3 Coder 480B',
      description: 'Agentic coding & browser use · 256K context',
    },
    {
      value: 'mistralai/mistral-nemotron',
      label: 'Mistral Nemotron',
      description: 'Agentic workflows · Coding & function calling',
    },
  ]
}

// @[MODEL LAUNCH]: Update the model picker lists below to include/reorder options for the new model.
// Each user tier (ant, Max/Team Premium, Pro/Team Standard/Enterprise, PAYG 1P, PAYG 3P) has its own list.
function getModelOptionsBase(fastMode = false): ModelOption[] {
  // ── NVIDIA-ONLY MODE ──────────────────────────────────────────────────
  // When CORTEX_NVIDIA_ONLY=1, show exclusively NVIDIA NIM models.
  // No Anthropic, no Codex, no other providers.
  if (process.env.CORTEX_NVIDIA_ONLY === '1') {
    return getNvidiaNimModelOptions()
  }

  // When using Ollama, show models from the Ollama server instead of CORTEX models
  if (getAPIProvider() === 'openai' && isOllamaProvider()) {
    const defaultOption = getDefaultOptionForUser(fastMode)
    const ollamaModels = getCachedOllamaModelOptions()
    if (ollamaModels.length > 0) {
      return [defaultOption, ...ollamaModels]
    }
    // Fallback: if models not yet fetched, show current model instead of CORTEX models
    const currentModel = getUserSpecifiedModelSetting() ?? getInitialMainLoopModel()
    if (currentModel != null) {
      return [
        defaultOption,
        {
          value: currentModel,
          label: currentModel,
          description: 'Currently configured Ollama model',
        },
      ]
    }
    return [defaultOption]
  }

  if (process.env.USER_TYPE === 'ant') {
    // Build options from antModels config
    const antModelOptions: ModelOption[] = getAntModels().map(m => ({
      value: m.alias,
      label: m.label,
      description: m.description ?? `[internal] ${m.label} (${m.model})`,
    }))

    return [
      getDefaultOptionForUser(),
      ...antModelOptions,
      getMergedOpus1MOption(fastMode),
      getSonnet46Option(),
      getSonnet46_1MOption(),
      getHaiku45Option(),
    ]
  }

  if (isCORTEXAISubscriber()) {
    if (isMaxSubscriber() || isTeamPremiumSubscriber()) {
      // Max and Team Premium users: Opus is default, show Sonnet as alternative
      const premiumOptions = [getDefaultOptionForUser(fastMode)]
      if (!isOpus1mMergeEnabled() && checkOpus1mAccess()) {
        premiumOptions.push(getMaxOpus46_1MOption(fastMode))
      }

      premiumOptions.push(MaxSonnet46Option)
      if (checkSonnet1mAccess()) {
        premiumOptions.push(getMaxSonnet46_1MOption())
      }

      premiumOptions.push(MaxHaiku45Option)
      return premiumOptions
    }

    // Pro/Team Standard/Enterprise users: Sonnet is default, show Opus as alternative
    const standardOptions = [getDefaultOptionForUser(fastMode)]
    if (checkSonnet1mAccess()) {
      standardOptions.push(getMaxSonnet46_1MOption())
    }

    if (isOpus1mMergeEnabled()) {
      standardOptions.push(getMergedOpus1MOption(fastMode))
    } else {
      standardOptions.push(getMaxOpusOption(fastMode))
      if (checkOpus1mAccess()) {
        standardOptions.push(getMaxOpus46_1MOption(fastMode))
      }
    }

    standardOptions.push(MaxHaiku45Option)
    return standardOptions
  }

  // PAYG 1P API: Default (Sonnet) + Sonnet 1M + Opus 4.6 + Opus 1M + Haiku
  if (getAPIProvider() === 'firstParty') {
    const payg1POptions = [getDefaultOptionForUser(fastMode)]
    if (checkSonnet1mAccess()) {
      payg1POptions.push(getSonnet46_1MOption())
    }
    if (isOpus1mMergeEnabled()) {
      payg1POptions.push(getMergedOpus1MOption(fastMode))
    } else {
      payg1POptions.push(getOpus46Option(fastMode))
      if (checkOpus1mAccess()) {
        payg1POptions.push(getOpus46_1MOption(fastMode))
      }
    }
    payg1POptions.push(getHaiku45Option())
    return payg1POptions
  }

  // PAYG 3P: Default (Sonnet 4.5) + Sonnet (3P custom) or Sonnet 4.6/1M + Opus (3P custom) or Opus 4.1/Opus 4.6/Opus1M + Haiku + Opus 4.1
  const payg3pOptions = [getDefaultOptionForUser(fastMode)]

  // Add Codex models for openai and codex providers
  if (getAPIProvider() === 'openai' || getAPIProvider() === 'codex') {
    payg3pOptions.push(...getCodexModelOptions())
  }

  const customSonnet = getCustomSonnetOption()
  if (customSonnet !== undefined) {
    payg3pOptions.push(customSonnet)
  } else {
    // Add Sonnet 4.6 since Sonnet 4.5 is the default
    payg3pOptions.push(getSonnet46Option())
    if (checkSonnet1mAccess()) {
      payg3pOptions.push(getSonnet46_1MOption())
    }
  }

  const customOpus = getCustomOpusOption()
  if (customOpus !== undefined) {
    payg3pOptions.push(customOpus)
  } else {
    // Add Opus 4.1, Opus 4.6 and Opus 4.6 1M
    payg3pOptions.push(getOpus41Option()) // This is the default opus
    payg3pOptions.push(getOpus46Option(fastMode))
    if (checkOpus1mAccess()) {
      payg3pOptions.push(getOpus46_1MOption(fastMode))
    }
  }
  const customHaiku = getCustomHaikuOption()
  if (customHaiku !== undefined) {
    payg3pOptions.push(customHaiku)
  } else {
    payg3pOptions.push(getHaikuOption())
  }
  return payg3pOptions
}

// @[MODEL LAUNCH]: Add the new model ID to the appropriate family pattern below
// so the "newer version available" hint works correctly.
/**
 * Map a full model name to its family alias and the marketing name of the
 * version the alias currently resolves to. Used to detect when a user has
 * a specific older version pinned and a newer one is available.
 */
function getModelFamilyInfo(
  model: string,
): { alias: string; currentVersionName: string } | null {
  const canonical = getCanonicalName(model)

  // Sonnet family
  if (
    canonical.includes('cortex-sonnet-4-6') ||
    canonical.includes('cortex-sonnet-4-5') ||
    canonical.includes('cortex-sonnet-4-') ||
    canonical.includes('cortex-3-7-sonnet') ||
    canonical.includes('cortex-3-5-sonnet')
  ) {
    const currentName = getMarketingNameForModel(getDefaultSonnetModel())
    if (currentName) {
      return { alias: 'Sonnet', currentVersionName: currentName }
    }
  }

  // Opus family
  if (canonical.includes('cortex-opus-4')) {
    const currentName = getMarketingNameForModel(getDefaultOpusModel())
    if (currentName) {
      return { alias: 'Opus', currentVersionName: currentName }
    }
  }

  // Haiku family
  if (
    canonical.includes('cortex-haiku') ||
    canonical.includes('cortex-3-5-haiku')
  ) {
    const currentName = getMarketingNameForModel(getDefaultHaikuModel())
    if (currentName) {
      return { alias: 'Haiku', currentVersionName: currentName }
    }
  }

  return null
}

/**
 * Returns a ModelOption for a known CORTEX model with a human-readable
 * label, and an upgrade hint if a newer version is available via the alias.
 * Returns null if the model is not recognized.
 */
function getKnownModelOption(model: string): ModelOption | null {
  const marketingName = getMarketingNameForModel(model)
  if (!marketingName) return null

  const familyInfo = getModelFamilyInfo(model)
  if (!familyInfo) {
    return {
      value: model,
      label: marketingName,
      description: model,
    }
  }

  // Check if the alias currently resolves to a different (newer) version
  if (marketingName !== familyInfo.currentVersionName) {
    return {
      value: model,
      label: marketingName,
      description: `Newer version available · select ${familyInfo.alias} for ${familyInfo.currentVersionName}`,
    }
  }

  // Same version as the alias — just show the friendly name
  return {
    value: model,
    label: marketingName,
    description: model,
  }
}

export function getModelOptions(fastMode = false): ModelOption[] {
  const providerModels = getActiveProviderModelOptions()

  if (providerModels.length > 0) {
    const options: ModelOption[] = [{ value: null, label: 'Default', description: '' }]
    for (const m of providerModels) {
      options.push(m)
    }
    const currentMainLoopModel = getUserSpecifiedModelSetting()
    const initialMainLoopModel = getInitialMainLoopModel()
    let customModel: ModelSetting = null
    if (currentMainLoopModel !== undefined && currentMainLoopModel !== null) {
      customModel = currentMainLoopModel
    } else if (initialMainLoopModel !== null) {
      customModel = initialMainLoopModel
    }
    if (customModel !== null && !options.some(opt => opt.value === customModel)) {
      options.push({ value: customModel, label: customModel, description: 'Custom model' })
    }
    return filterModelOptionsByAllowlist(options)
  }

  const options = getModelOptionsBase(fastMode)

  // Add the custom model from the ANTHROPIC_CUSTOM_MODEL_OPTION env var
  const envCustomModel = process.env.ANTHROPIC_CUSTOM_MODEL_OPTION
  if (
    envCustomModel &&
    !options.some(existing => existing.value === envCustomModel)
  ) {
    options.push({
      value: envCustomModel,
      label: process.env.ANTHROPIC_CUSTOM_MODEL_OPTION_NAME ?? envCustomModel,
      description:
        process.env.ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION ??
        `Custom model (${envCustomModel})`,
    })
  }

  const additionalOptions =
    getAPIProvider() === 'openai'
      ? getActiveOpenAIModelOptionsCache()
      : getGlobalConfig().additionalModelOptionsCache ?? []

  // Append additional model options fetched during bootstrap/endpoints.
  for (const opt of additionalOptions) {
    if (!options.some(existing => existing.value === opt.value)) {
      options.push(opt)
    }
  }

  // Add custom model from either the current model value or the initial one
  // if it is not already in the options.
  let customModel: ModelSetting = null
  const currentMainLoopModel = getUserSpecifiedModelSetting()
  const initialMainLoopModel = getInitialMainLoopModel()
  if (currentMainLoopModel !== undefined && currentMainLoopModel !== null) {
    customModel = currentMainLoopModel
  } else if (initialMainLoopModel !== null) {
    customModel = initialMainLoopModel
  }
  if (customModel === null || options.some(opt => opt.value === customModel)) {
    return filterModelOptionsByAllowlist(options)
  } else if (customModel === 'opusplan') {
    return filterModelOptionsByAllowlist([...options, getOpusPlanOption()])
  } else if (customModel === 'gpt-5.4') {
    return filterModelOptionsByAllowlist([...options, getCodexPlanOption()])
  } else if (customModel === 'gpt-5.3-codex-spark') {
    return filterModelOptionsByAllowlist([...options, getCodexSparkOption()])
  } else if (customModel === 'opus' && getAPIProvider() === 'firstParty') {
    return filterModelOptionsByAllowlist([
      ...options,
      getMaxOpusOption(fastMode),
    ])
  } else if (customModel === 'opus[1m]' && getAPIProvider() === 'firstParty') {
    return filterModelOptionsByAllowlist([
      ...options,
      getMergedOpus1MOption(fastMode),
    ])
  } else {
    // Try to show a human-readable label for known CORTEX models, with an
    // upgrade hint if the alias now resolves to a newer version.
    const knownOption = getKnownModelOption(customModel)
    if (knownOption) {
      options.push(knownOption)
    } else {
      options.push({
        value: customModel,
        label: customModel,
        description: 'Custom model',
      })
    }
    return filterModelOptionsByAllowlist(options)
  }
}

/**
 * Filter model options by the availableModels allowlist.
 * Always preserves the "Default" option (value: null).
 */
function filterModelOptionsByAllowlist(options: ModelOption[]): ModelOption[] {
  const settings = getSettings_DEPRECATED() || {}
  const filtered = !settings.availableModels
    ? options // No restrictions
    : options.filter(
    opt =>
      opt.value === null || (opt.value !== null && isModelAllowed(opt.value)),
  )

  // Select state uses option values as identity keys. If two entries share the
  // same value (e.g. provider-specific aliases collapsing to one model ID),
  // navigation/focus can become inconsistent and appear as duplicate rendering.
  const seen = new Set<string>()
  return filtered.filter(opt => {
    const key = String(opt.value)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

// =============================================================================
// OpenRouter FREE Models — Fetched live from OpenRouter API
// =============================================================================
export function getOpenRouterFreeModels(): ModelOption[] {
  return OR_FREE_DEFAULTS
}

const OR_FREE_DEFAULTS: ModelOption[] = [
  { value: 'nvidia/nemotron-3-super:free', label: '🚀 Nemotron 3 Super 639B (Free)', description: 'NVIDIA · 262K context' },
  { value: 'inclusionai/ring-2.6-1t:free', label: '🔷 inclusionAI Ring 2.6 1T (Free)', description: '530B · 262K context' },
  { value: 'poolside/laguna-m1:free', label: '🌊 Poolside Laguna M1 (Free)', description: '236B · 131K context' },
  { value: 'openai/gpt-oss-120b:free', label: '🤖 GPT-OSS 120B (Free)', description: 'OpenAI · 131K context' },
  { value: 'z-ai/glm-4-5-air:free', label: '🧠 GLM 4.5 Air (Free)', description: 'Z.ai · 131K context' },
  { value: 'deepseek/deepseek-v4-flash:free', label: '⭐ DeepSeek V4 Flash (Free)', description: 'Fast · OpenRouter' },
  { value: 'nvidia/nemotron-3-nano-30b-a3b:free', label: '🔷 Nemotron 3 Nano 30B (Free)', description: 'NVIDIA · 256K context' },
  { value: 'poolside/laguna-xs2:free', label: '🌊 Poolside Laguna XS.2 (Free)', description: '36.8B · 131K context' },
  { value: 'openai/gpt-oss-20b:free', label: '🤖 GPT-OSS 20B (Free)', description: 'OpenAI · 131K context' },
  { value: 'baidu-qianfan/cobuddy:free', label: '🇨🇳 Baidu CoBuddy (Free)', description: '22.7B · 131K context' },
  { value: 'arcee-ai/trinity-large-thinking:free', label: '🧠 Arcee Trinity Large (Free)', description: '16.3B · 262K · Thinking' },
  { value: 'nvidia/nemotron-3-nano-omni:free', label: '🔷 Nemotron 3 Nano Omni (Free)', description: 'NVIDIA · 256K context' },
  { value: 'deepseek/deepseek-v4-flash:free', label: '⚡ DeepSeek V4 Flash (Free)', description: '1M context' },
  { value: 'google/gemma-4-31b:free', label: '🔷 Gemma 4 31B (Free)', description: 'Google · 262K context' },
  { value: 'nvidia/nemotron-nano-12b-2-vl:free', label: '👁 Nemotron 12B Vision (Free)', description: 'NVIDIA vision' },
  { value: 'nvidia/nemotron-nano-9b-v2:free', label: '🔷 Nemotron Nano 9B V2 (Free)', description: 'NVIDIA · 128K context' },
  { value: 'google/gemma-4-26b-a4b:free', label: '📸 Gemma 4 26B Vision (Free)', description: 'Best vision' },
  { value: 'qwen/qwen3-coder-480b-a35b:free', label: '💻 Qwen3 Coder 480B (Free)', description: 'Best coding · 262K context' },
  { value: 'qwen/qwen3-next-80b-a3b-instruct:free', label: '💻 Qwen3 Next 80B (Free)', description: '262K context' },
  { value: 'meta-llama/llama-3.3-70b-instruct:free', label: '🦙 Llama 3.3 70B (Free)', description: 'Meta · 65K context' },
  { value: 'liquid/lfm-2.5-1.2b-thinking:free', label: '💧 Liquid LFM 1.2B Thinking (Free)', description: '32K context' },
  { value: 'liquid/lfm-2.5-1.2b-instruct:free', label: '💧 Liquid LFM 1.2B Instruct (Free)', description: '32K context' },
  { value: 'nousresearch/hermes-3-405b-instruct:free', label: '🏛 Hermes 3 405B (Free)', description: 'Nous · 131K context' },
  { value: 'meta-llama/llama-3.2-3b-instruct:free', label: '🦙 Llama 3.2 3B (Free)', description: 'Meta · 131K context' },
  { value: 'openrouter/free', label: '📦 Auto (Free)', description: 'Best available free model' },
]
