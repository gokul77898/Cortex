export type ProviderCategory = 'free' | 'paid' | 'local' | 'cloud' | 'enterprise'

export type ProviderEntry = {
  id: string
  name: string
  description: string
  category: ProviderCategory
  baseUrl: string
  defaultModel: string
  requiresApiKey: boolean
  apiKeyHint: string
  docsUrl?: string
  envVar?: string
  knownModels: string[]
  isOpenAICompatible: boolean
}

const PROVIDER_REGISTRY: ProviderEntry[] = [
  // ===== Free / Open Models =====
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Multi-provider router with 25+ free models',
    category: 'free',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-v4-flash:free',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://openrouter.ai/settings/keys',
    docsUrl: 'https://openrouter.ai/docs',
    knownModels: [
      'nvidia/nemotron-3-super:free',
      'poolside/laguna-m1:free',
      'openai/gpt-oss-120b:free',
      'z-ai/glm-4-5-air:free',
      'deepseek/deepseek-v4-flash:free',
      'poolside/laguna-xs2:free',
      'nvidia/nemotron-3-nano-30b-a3b:free',
      'openai/gpt-oss-20b:free',
      'deepseek/deepseek-v4-flash:free',
      'baidu-qianfan/cobuddy:free',
      'arcee-ai/trinity-large-thinking:free',
      'nvidia/nemotron-3-nano-omni:free',
      'google/gemma-4-31b:free',
      'nvidia/nemotron-nano-12b-2-vl:free',
      'nvidia/nemotron-nano-9b-v2:free',
      'google/gemma-4-26b-a4b:free',
      'nvidia/llama-nemotron-embed-vl-1b-v2:free',
      'qwen/qwen3-coder-480b-a35b:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen3-next-80b-a3b-instruct:free',
      'liquid/lfm-2.5-1.2b-thinking:free',
      'liquid/lfm-2.5-1.2b-instruct:free',
      'venice/uncensored:free',
      'nousresearch/hermes-3-405b-instruct:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'openrouter/free',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Free inference API for 100k+ open models via HF Inference Providers',
    category: 'free',
    baseUrl: 'https://router.huggingface.co/v1',
    defaultModel: 'zai-org/GLM-5:together',
    requiresApiKey: true,
    apiKeyHint: 'Get token at https://huggingface.co/settings/tokens',
    docsUrl: 'https://huggingface.co/docs/inference-providers',
    knownModels: [
      'zai-org/GLM-5:together',
      'zai-org/GLM-5:novita',
      'mistralai/Mistral-Small-24B-Instruct-2501',
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      'meta-llama/Llama-3.3-70B-Instruct',
      'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference with free tier for open models',
    category: 'free',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://console.groq.com/keys',
    docsUrl: 'https://console.groq.com/docs',
    knownModels: [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen-3-32b',
      'llama-4-scout',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'deepseek-r1-distill-llama-70b',
      'qwen-2.5-32b',
      'whisper-large-v3',
      'whisper-large-v3-turbo',
      'orpheus-english',
      'safety-gpt-oss-20b',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    description: 'Free NVIDIA NIM API for open models on build.nvidia.com',
    category: 'free',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/esm2-650m',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://build.nvidia.com',
    docsUrl: 'https://build.nvidia.com',
    knownModels: [
      'meta/esm2-650m',
      'stepfun-ai/step-3.7-flash',
      'z-ai/glm-5.1',
      'nvidia/nemotron-3-content-safety',
      'minimaxai/minimax-m2.7',
      'stepfun-ai/step-3.5-flash',
      'mistralai/mistral-large-3-675b-instruct-2512',
      'qwen/qwen3-coder-480b-a35b-instruct',
      'mistralai/mistral-nemotron',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    description: 'Fast inference on wafer-scale hardware - free tier available',
    category: 'free',
    baseUrl: 'https://inference.cerebras.ai/v1',
    defaultModel: 'qwen3-coder-480b',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://inference.cerebras.ai/',
    knownModels: [
      'qwen3-coder-480b',
      'llama-3.3-70b',
      'llama-3.1-8b',
      'deepseek-r1-distill-llama-70b',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Cloud platform for open-source models with free credits',
    category: 'free',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'Qwen/Qwen3.5-9B',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://api.together.xyz/settings/api-keys',
    docsUrl: 'https://docs.together.ai',
    knownModels: [
      'Qwen/Qwen3.5-9B',
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'mistralai/Mixtral-8x22B-Instruct-v0.1',
      'deepseek-ai/DeepSeek-R1',
      'google/gemma-2-27b-it',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'deepinfra',
    name: 'Deep Infra',
    description: 'Serverless inference for open models with free tier',
    category: 'free',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    defaultModel: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://deepinfra.com/dash',
    docsUrl: 'https://deepinfra.com/docs',
    knownModels: [
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      'meta-llama/Llama-3.3-70B-Instruct',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'Phind/Phind-v2',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    description: 'Fast inference platform for open models',
    category: 'free',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'kimi-k2-instruct',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://app.fireworks.ai/',
    docsUrl: 'https://docs.fireworks.ai',
    knownModels: [
      'kimi-k2-instruct',
      'accounts/fireworks/models/llama-v3p3-70b-instruct',
      'accounts/fireworks/models/qwen2p5-coder-32b-instruct',
      'accounts/fireworks/models/deepseek-r1',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'cortecs',
    name: 'Cortecs',
    description: 'API for open-source models with generous free tier',
    category: 'free',
    baseUrl: 'https://api.cortecs.ai/v1',
    defaultModel: 'kimi-k2-instruct',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://cortecs.ai/',
    knownModels: [
      'kimi-k2-instruct',
      'qwen3-coder-480b',
      'llama-3.3-70b',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'nebius',
    name: 'Nebius Token Factory',
    description: 'Token-based access to open models',
    category: 'free',
    baseUrl: 'https://api.tokenfactory.nebius.com/v1',
    defaultModel: 'kimi-k2-instruct',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://tokenfactory.nebius.com/',
    knownModels: [
      'kimi-k2-instruct',
      'qwen3-coder-480b',
      'llama-3.3-70b',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'venice',
    name: 'Venice AI',
    description: 'Privacy-focused API for open models',
    category: 'free',
    baseUrl: 'https://api.venice.ai/v1',
    defaultModel: 'qwen3-coder-480b',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://venice.ai/',
    knownModels: [
      'qwen3-coder-480b',
      'llama-3.3-70b',
    ],
    isOpenAICompatible: true,
  },

  // ===== Major Paid Providers =====
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-5, GPT-4o, o3 and more from OpenAI',
    category: 'paid',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.3-codex',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs',
    knownModels: [
      'gpt-5.3-codex',
      'gpt-5.3',
      'gpt-5.2',
      'gpt-5.1',
      'gpt-5-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'o3',
      'o4-mini',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Claude Opus 4.6, Sonnet 4.6, Haiku 3.5',
    category: 'paid',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-6',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://console.anthropic.com/',
    docsUrl: 'https://docs.anthropic.com',
    knownModels: [
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-haiku-3-5',
      'claude-sonnet-4-5',
      'claude-sonnet-4-0',
      'claude-3-5-sonnet-20241022',
    ],
    isOpenAICompatible: false,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 3 Flash, Gemini 2.5 Pro from Google',
    category: 'paid',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-3-flash-preview',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://aistudio.google.com/apikey',
    docsUrl: 'https://ai.google.dev/docs',
    knownModels: [
      'gemini-3-flash-preview',
      'gemini-2.5-pro-preview-03-25',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek-V4, DeepSeek-R1, DeepSeek-Coder',
    category: 'paid',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://platform.deepseek.com/',
    docsUrl: 'https://platform.deepseek.com/docs',
    knownModels: [
      'deepseek-chat',
      'deepseek-reasoner',
      'deepseek-coder',
      'deepseek-r1',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Mistral Large, Mistral Small, Codestral',
    category: 'paid',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://console.mistral.ai/api-keys/',
    docsUrl: 'https://docs.mistral.ai',
    knownModels: [
      'mistral-large-latest',
      'mistral-small-latest',
      'codestral-latest',
      'open-mistral-nemo',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI',
    description: 'Kimi K2, Kimi K2.5 from Moonshot AI',
    category: 'paid',
    baseUrl: 'https://api.moonshot.ai/v1',
    defaultModel: 'kimi-k2.5',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://platform.moonshot.ai/console',
    knownModels: [
      'kimi-k2.5',
      'kimi-k2',
      'moonshot-v1-8k',
      'moonshot-v1-32k',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'xai',
    name: 'xAI',
    description: 'Grok models from xAI',
    category: 'paid',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-3',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://console.x.ai',
    docsUrl: 'https://docs.x.ai',
    knownModels: [
      'grok-3',
      'grok-3-mini',
      'grok-2',
      'grok-2-vision',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'cohere',
    name: 'Cohere',
    description: 'Command R+, Command R from Cohere',
    category: 'paid',
    baseUrl: 'https://api.cohere.ai/v1',
    defaultModel: 'command-r-plus',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://dashboard.cohere.com/api-keys',
    docsUrl: 'https://docs.cohere.com',
    knownModels: [
      'command-r-plus',
      'command-r',
      'command-nightly',
    ],
    isOpenAICompatible: false,
  },

  // ===== GitHub / GitLab =====
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    description: 'Use your GitHub Copilot subscription (Plus/Pro+)',
    category: 'paid',
    baseUrl: 'https://api.githubcopilot.com/v1',
    defaultModel: 'gpt-5-nano',
    requiresApiKey: false,
    apiKeyHint: 'Run /connect and authenticate via GitHub OAuth',
    docsUrl: 'https://docs.github.com/copilot',
    knownModels: [
      'gpt-5-nano',
      'gpt-4o',
      'claude-sonnet-4-6',
      'gemini-2.0-flash',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'gitlab-duo',
    name: 'GitLab Duo',
    description: 'GitLab Duo Agent Platform (Premium/Ultimate)',
    category: 'enterprise',
    baseUrl: 'https://gitlab.com/api/v4/duo',
    defaultModel: 'duo-chat-haiku-4-5',
    requiresApiKey: true,
    apiKeyHint: 'Get Personal Access Token at https://gitlab.com/-/user_settings/personal_access_tokens',
    knownModels: [
      'duo-chat-haiku-4-5',
      'duo-chat-sonnet-4-5',
      'duo-chat-opus-4-5',
    ],
    isOpenAICompatible: false,
  },
  {
    id: 'github-models',
    name: 'GitHub Models',
    description: 'Free GitHub models marketplace',
    category: 'free',
    baseUrl: 'https://models.inference.ai.azure.com/v1',
    defaultModel: 'gpt-4o-mini',
    requiresApiKey: true,
    apiKeyHint: 'Get token at https://github.com/settings/tokens',
    knownModels: [
      'gpt-4o-mini',
      'gpt-4o',
      'gpt-5-nano',
      'Phi-3.5-mini-instruct',
      'AI21-Jamba-1.5-Mini',
    ],
    isOpenAICompatible: true,
  },

  // ===== Cloud Platform Providers =====
  {
    id: 'azure-openai',
    name: 'Azure OpenAI',
    description: 'Azure OpenAI Service with GPT models',
    category: 'enterprise',
    baseUrl: 'https://YOUR-RESOURCE.openai.azure.com/openai/v1',
    defaultModel: 'gpt-4o',
    requiresApiKey: true,
    apiKeyHint: 'Get key from Azure Portal → OpenAI resource',
    docsUrl: 'https://learn.microsoft.com/azure/ai-services/openai',
    knownModels: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-5-nano',
      'o3',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'aws-bedrock',
    name: 'Amazon Bedrock',
    description: 'AWS Bedrock with Claude, Llama, Mistral models',
    category: 'enterprise',
    baseUrl: 'https://bedrock-runtime.us-east-1.amazonaws.com',
    defaultModel: 'anthropic.claude-sonnet-4-6',
    requiresApiKey: false,
    apiKeyHint: 'Configure AWS credentials via ~/.aws/credentials or env vars',
    docsUrl: 'https://aws.amazon.com/bedrock',
    knownModels: [
      'anthropic.claude-sonnet-4-6',
      'anthropic.claude-opus-4-6',
      'anthropic.claude-haiku-4-5',
      'meta.llama3-3-70b-instruct',
      'mistral.mistral-large-2407',
    ],
    isOpenAICompatible: false,
  },
  {
    id: 'vertex-ai',
    name: 'Google Vertex AI',
    description: 'Vertex AI with Claude, Gemini, Llama models',
    category: 'enterprise',
    baseUrl: 'https://us-central1-aiplatform.googleapis.com/v1',
    defaultModel: 'claude-sonnet-4-6',
    requiresApiKey: false,
    apiKeyHint: 'Set GOOGLE_APPLICATION_CREDENTIALS or run gcloud auth',
    docsUrl: 'https://cloud.google.com/vertex-ai',
    knownModels: [
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-haiku-4-5',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'meta/llama3-405b',
    ],
    isOpenAICompatible: false,
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean Inference',
    description: 'DO Inference with open models and inference routers',
    category: 'paid',
    baseUrl: 'https://inference.digitalocean.com/v1',
    defaultModel: 'gpt-oss',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://cloud.digitalocean.com/',
    knownModels: [
      'gpt-oss',
      'llama-3.3-70b',
      'qwen2.5-coder-32b',
      'deepseek-r1',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'sap-ai-core',
    name: 'SAP AI Core',
    description: 'SAP AI Core with 40+ models from multiple providers',
    category: 'enterprise',
    baseUrl: 'https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2',
    defaultModel: 'gpt-4o',
    requiresApiKey: true,
    apiKeyHint: 'Get service key from SAP BTP Cockpit',
    knownModels: [
      'gpt-4o',
      'claude-sonnet-4',
      'gemini-2.0-flash',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'scaleway',
    name: 'Scaleway',
    description: 'Scaleway AI Inference with open models',
    category: 'paid',
    baseUrl: 'https://api.scaleway.ai/v1',
    defaultModel: 'llama-3.3-70b',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://console.scaleway.com/',
    knownModels: [
      'llama-3.3-70b',
      'qwen2.5-coder-32b',
      'mistral-large',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'ovhcloud',
    name: 'OVHcloud AI Endpoints',
    description: 'OVHcloud hosted AI models',
    category: 'paid',
    baseUrl: 'https://ai-endpoints.ovh.net/v1',
    defaultModel: 'llama-3.3-70b',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://endpoints.ai.cloud.ovh.net/',
    knownModels: [
      'llama-3.3-70b',
      'mixtral-8x22b',
      'qwen2.5-coder-32b',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'stackit',
    name: 'STACKIT AI',
    description: 'STACKIT cloud AI services',
    category: 'enterprise',
    baseUrl: 'https://ai.stackit.cloud/v1',
    defaultModel: 'llama-3.3-70b',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://www.stackit.de/',
    knownModels: [
      'llama-3.3-70b',
      'qwen2.5-coder-32b',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'cloudflare-ai-gateway',
    name: 'Cloudflare AI Gateway',
    description: 'Unified gateway for OpenAI, Anthropic, Workers AI, etc.',
    category: 'enterprise',
    baseUrl: 'https://gateway.ai.cloudflare.com/v1/ACCOUNT_ID/GATEWAY_ID',
    defaultModel: 'openai/gpt-4o',
    requiresApiKey: true,
    apiKeyHint: 'Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_GATEWAY_ID, CLOUDFLARE_API_TOKEN',
    knownModels: [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-sonnet-4',
      '@cf/meta/llama-3.3-70b',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'cloudflare-workers-ai',
    name: 'Cloudflare Workers AI',
    description: 'Run AI models on Cloudflare global network',
    category: 'paid',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/v1',
    defaultModel: '@cf/meta/llama-3.3-70b',
    requiresApiKey: true,
    apiKeyHint: 'Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_KEY',
    knownModels: [
      '@cf/meta/llama-3.3-70b',
      '@cf/qwen/qwen2.5-coder-32b',
      '@hf/google/gemma-2-27b',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'vercel-ai-gateway',
    name: 'Vercel AI Gateway',
    description: 'Vercel AI Gateway for multi-provider routing',
    category: 'enterprise',
    baseUrl: 'https://gateway.vercel.ai/v1',
    defaultModel: 'gpt-4o',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://vercel.com/',
    knownModels: [
      'gpt-4o',
      'claude-sonnet-4',
      'gemini-2.0-flash',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'helicone',
    name: 'Helicone AI Gateway',
    description: 'LLM observability and routing gateway',
    category: 'enterprise',
    baseUrl: 'https://ai-gateway.helicone.ai',
    defaultModel: 'gpt-4o',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://helicone.ai',
    knownModels: [
      'gpt-4o',
      'claude-sonnet-4',
      'gemini-2.0-flash',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'llm-gateway',
    name: 'LLM Gateway',
    description: 'Multi-provider LLM gateway with unified API',
    category: 'paid',
    baseUrl: 'https://api.llmgateway.io/v1',
    defaultModel: 'glm-4.7',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://llmgateway.io/dashboard',
    knownModels: [
      'glm-4.7',
      'gpt-5.2',
      'gemini-2.5-pro',
      'claude-3-5-sonnet-20241022',
    ],
    isOpenAICompatible: true,
  },

  // ===== OpenAI-Compatible & Proxies =====
  {
    id: '302ai',
    name: '302.AI',
    description: 'Multi-model API gateway',
    category: 'paid',
    baseUrl: 'https://api.302.ai/v1',
    defaultModel: 'gpt-4o',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://302.ai/',
    knownModels: [
      'gpt-4o',
      'claude-sonnet-4',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'baseten',
    name: 'Baseten',
    description: 'ML infrastructure for model deployment',
    category: 'paid',
    baseUrl: 'https://app.baseten.co/v1',
    defaultModel: 'llama-3.3-70b',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://app.baseten.co/',
    knownModels: [
      'llama-3.3-70b',
      'mixtral-8x22b',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'ionet',
    name: 'IO.NET',
    description: 'Decentralized GPU network with 17+ models',
    category: 'paid',
    baseUrl: 'https://api.ai.io.net/v1',
    defaultModel: 'llama-3.3-70b',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://ai.io.net/',
    knownModels: [
      'llama-3.3-70b',
      'qwen2.5-coder-32b',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'frogbot',
    name: 'FrogBot',
    description: 'AI model API service',
    category: 'paid',
    baseUrl: 'https://api.frogbot.ai/v1',
    defaultModel: 'llama-3.3-70b',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://app.frogbot.ai/',
    knownModels: [
      'llama-3.3-70b',
      'qwen2.5-coder-32b',
    ],
    isOpenAICompatible: true,
  },

  // ===== Local Providers =====
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run LLMs locally with Ollama',
    category: 'local',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2:3b',
    requiresApiKey: false,
    apiKeyHint: 'Install: brew install ollama && ollama pull llama3.2:3b',
    docsUrl: 'https://ollama.ai',
    knownModels: [
      'llama3.2:3b',
      'llama3.2:1b',
      'llama3.1:8b',
      'qwen2.5-coder:7b',
      'qwen2.5-coder:14b',
      'qwen2.5-coder:32b',
      'deepseek-r1:7b',
      'deepseek-r1:14b',
      'mistral:7b',
      'mixtral:8x7b',
      'gemma2:9b',
      'phi3:14b',
      'moondream',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'lm-studio',
    name: 'LM Studio',
    description: 'Run local models via LM Studio',
    category: 'local',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    requiresApiKey: false,
    apiKeyHint: 'Download at https://lmstudio.ai and load a model',
    docsUrl: 'https://lmstudio.ai',
    knownModels: [
      'local-model',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'llama-cpp',
    name: 'llama.cpp',
    description: 'Run local models via llama.cpp llama-server',
    category: 'local',
    baseUrl: 'http://127.0.0.1:8080/v1',
    defaultModel: 'qwen3-coder:a3b',
    requiresApiKey: false,
    apiKeyHint: 'Download at https://github.com/ggml-org/llama.cpp and run llama-server',
    knownModels: [
      'qwen3-coder:a3b',
      'llama-3.2-3b',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'atomic-chat',
    name: 'Atomic Chat',
    description: 'Desktop app for local LLMs with OpenAI-compatible API',
    category: 'local',
    baseUrl: 'http://127.0.0.1:1337/v1',
    defaultModel: 'local-model',
    requiresApiKey: false,
    apiKeyHint: 'Download at https://atomic.chat and load a model',
    docsUrl: 'https://atomic.chat',
    knownModels: [
      'local-model',
    ],
    isOpenAICompatible: true,
  },

  // ===== Proxy / Gateway Services =====
  {
    id: 'zenmux',
    name: 'ZenMux',
    description: 'Multi-model router API',
    category: 'paid',
    baseUrl: 'https://api.zenmux.com/v1',
    defaultModel: 'gpt-4o',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://zenmux.com',
    knownModels: [
      'gpt-4o',
      'claude-sonnet-4',
      'gemini-2.0-flash',
    ],
    isOpenAICompatible: true,
  },
  {
    id: 'zai',
    name: 'Z.AI',
    description: 'Z AI API services',
    category: 'paid',
    baseUrl: 'https://api.z.ai/v1',
    defaultModel: 'glm-4.7',
    requiresApiKey: true,
    apiKeyHint: 'Get key at https://z.ai',
    knownModels: [
      'glm-4.7',
      'z-32b',
    ],
    isOpenAICompatible: true,
  },
]

export function getProviderRegistry(): ProviderEntry[] {
  return PROVIDER_REGISTRY
}

export function getProviderById(id: string): ProviderEntry | undefined {
  return PROVIDER_REGISTRY.find(p => p.id === id)
}

export function getProvidersByCategory(category: ProviderCategory): ProviderEntry[] {
  return PROVIDER_REGISTRY.filter(p => p.category === category)
}

export function searchProviders(query: string): ProviderEntry[] {
  const q = query.toLowerCase()
  return PROVIDER_REGISTRY.filter(
    p =>
      p.id.includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
  )
}

export function getProviderEnvVars(providerId: string): Record<string, string> {
  const envMap: Record<string, Record<string, string>> = {
    openai: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: '', OPENAI_MODEL: '' },
    anthropic: { ANTHROPIC_API_KEY: '', ANTHROPIC_BASE_URL: '', ANTHROPIC_MODEL: '' },
    gemini: { CORTEX_USE_GEMINI: '1', GEMINI_API_KEY: '', GEMINI_BASE_URL: '', GEMINI_MODEL: '' },
    'github-copilot': { CORTEX_USE_GITHUB: '1', GITHUB_TOKEN: '' },
    'github-models': { CORTEX_USE_GITHUB: '1', GITHUB_TOKEN: '' },
    'aws-bedrock': { CORTEX_USE_BEDROCK: '1', AWS_REGION: 'us-east-1' },
    'vertex-ai': { CORTEX_USE_VERTEX: '1', GOOGLE_CLOUD_PROJECT: '', VERTEX_LOCATION: 'global' },
    nvidia: { CORTEX_USE_OPENAI: '1', NVIDIA_API_KEY: '', OPENAI_BASE_URL: 'https://integrate.api.nvidia.com/v1', OPENAI_MODEL: '' },
    groq: { CORTEX_USE_OPENAI: '1', GROQ_API_KEY: '', OPENAI_BASE_URL: 'https://api.groq.com/openai/v1', OPENAI_MODEL: '' },
    huggingface: { HF_TOKEN: '', HF_BASE_URL: 'https://router.huggingface.co/v1', HF_MODEL_ID: '' },
    openrouter: { CORTEX_USE_OPENAI: '1', OPENROUTER_API_KEY: '', OPENAI_BASE_URL: 'https://openrouter.ai/api/v1', OPENAI_MODEL: '' },
    ollama: { CORTEX_USE_OPENAI: '1', OPENAI_BASE_URL: 'http://localhost:11434/v1', OPENAI_MODEL: '' },
    'lm-studio': { CORTEX_USE_OPENAI: '1', OPENAI_BASE_URL: 'http://localhost:1234/v1', OPENAI_MODEL: '' },
    'llama-cpp': { CORTEX_USE_OPENAI: '1', OPENAI_BASE_URL: 'http://127.0.0.1:8080/v1', OPENAI_MODEL: '' },
    'atomic-chat': { CORTEX_USE_OPENAI: '1', OPENAI_BASE_URL: 'http://127.0.0.1:1337/v1', OPENAI_MODEL: '' },
    deepseek: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.deepseek.com/v1', OPENAI_MODEL: '' },
    mistral: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.mistral.ai/v1', OPENAI_MODEL: '' },
    moonshot: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.moonshot.ai/v1', OPENAI_MODEL: '' },
    together: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.together.xyz/v1', OPENAI_MODEL: '' },
    xai: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.x.ai/v1', OPENAI_MODEL: '' },
    cerebras: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://inference.cerebras.ai/v1', OPENAI_MODEL: '' },
    deepinfra: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.deepinfra.com/v1/openai', OPENAI_MODEL: '' },
    fireworks: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.fireworks.ai/inference/v1', OPENAI_MODEL: '' },
    cortecs: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.cortecs.ai/v1', OPENAI_MODEL: '' },
    nebius: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.tokenfactory.nebius.com/v1', OPENAI_MODEL: '' },
    venice: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.venice.ai/v1', OPENAI_MODEL: '' },
    'azure-openai': { CORTEX_USE_OPENAI: '1', AZURE_OPENAI_API_KEY: '', OPENAI_BASE_URL: '', OPENAI_MODEL: '' },
    digitalocean: { CORTEX_USE_OPENAI: '1', DIGITALOCEAN_ACCESS_TOKEN: '', OPENAI_BASE_URL: 'https://inference.digitalocean.com/v1', OPENAI_MODEL: '' },
    'cloudflare-ai-gateway': { CORTEX_USE_OPENAI: '1', CLOUDFLARE_API_TOKEN: '', OPENAI_BASE_URL: '', OPENAI_MODEL: '' },
    'cloudflare-workers-ai': { CORTEX_USE_OPENAI: '1', CLOUDFLARE_API_KEY: '', OPENAI_BASE_URL: '', OPENAI_MODEL: '' },
    'vercel-ai-gateway': { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://gateway.vercel.ai/v1', OPENAI_MODEL: '' },
    helicone: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://ai-gateway.helicone.ai', OPENAI_MODEL: '' },
    'llm-gateway': { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.llmgateway.io/v1', OPENAI_MODEL: '' },
    '302ai': { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.302.ai/v1', OPENAI_MODEL: '' },
    baseten: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://app.baseten.co/v1', OPENAI_MODEL: '' },
    ionet: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.ai.io.net/v1', OPENAI_MODEL: '' },
    frogbot: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.frogbot.ai/v1', OPENAI_MODEL: '' },
    'sap-ai-core': { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: '', OPENAI_MODEL: '' },
    scaleway: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.scaleway.ai/v1', OPENAI_MODEL: '' },
    ovhcloud: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://ai-endpoints.ovh.net/v1', OPENAI_MODEL: '' },
    stackit: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://ai.stackit.cloud/v1', OPENAI_MODEL: '' },
    zenmux: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.zenmux.com/v1', OPENAI_MODEL: '' },
    zai: { CORTEX_USE_OPENAI: '1', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.z.ai/v1', OPENAI_MODEL: '' },
    cohere: { CORTEX_USE_OPENAI: '1', COHERE_API_KEY: '', OPENAI_BASE_URL: '', OPENAI_MODEL: '' },
    'gitlab-duo': { CORTEX_USE_OPENAI: '1', GITLAB_TOKEN: '', OPENAI_BASE_URL: '', OPENAI_MODEL: '' },
  }
  return envMap[providerId] ?? {}
}

export function applyProviderEnvVars(providerId: string, apiKey?: string): void {
  const envVars = getProviderEnvVars(providerId)
  const provider = getProviderById(providerId)
  for (const [key, val] of Object.entries(envVars)) {
    if (key.includes('API_KEY') || key.includes('TOKEN') || key.includes('SECRET')) {
      if (apiKey) {
        process.env[key] = apiKey
      }
    } else {
      process.env[key] = val
    }
  }
  if (provider) {
    process.env.OPENAI_MODEL = provider.defaultModel
  }
}

export function getActiveProviderFromEnv(): ProviderEntry | undefined {
  const baseUrl = process.env.OPENAI_BASE_URL?.toLowerCase() ?? ''
  const isAnthropic = !!process.env.ANTHROPIC_API_KEY
  const isHuggingFace = !!process.env.HF_TOKEN

  if (isAnthropic && !baseUrl) {
    return PROVIDER_REGISTRY.find(p => p.id === 'anthropic')
  }

  const matched = PROVIDER_REGISTRY.find(p => {
    const knownUrl = p.baseUrl.toLowerCase()
    return baseUrl.includes(knownUrl) || knownUrl.includes(baseUrl)
  })

  if (matched) return matched
  if (isHuggingFace) return PROVIDER_REGISTRY.find(p => p.id === 'huggingface')

  return undefined
}

export function getActiveProviderModelOptions(): Array<{ value: string; label: string; description: string }> {
  const provider = getActiveProviderFromEnv()
  if (!provider) return []
  return provider.knownModels.map(model => ({
    value: model,
    label: model,
    description: `${provider.name} model`,
  }))
}

export const FREE_PROVIDERS = PROVIDER_REGISTRY.filter(p => p.category === 'free')
export const PAID_PROVIDERS = PROVIDER_REGISTRY.filter(p => p.category === 'paid')
export const LOCAL_PROVIDERS = PROVIDER_REGISTRY.filter(p => p.category === 'local')
export const ENTERPRISE_PROVIDERS = PROVIDER_REGISTRY.filter(p => p.category === 'enterprise')
export const ALL_PROVIDERS = PROVIDER_REGISTRY
