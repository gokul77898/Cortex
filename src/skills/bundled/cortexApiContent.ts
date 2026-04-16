// Content for the cortex-api bundled skill.
// Each .md file is inlined as a string at build time via Bun's text loader.

import csharpCORTEXApi from './cortex-api/csharp/cortex-api.md'
import curlExamples from './cortex-api/curl/examples.md'
import goCORTEXApi from './cortex-api/go/cortex-api.md'
import javaCORTEXApi from './cortex-api/java/cortex-api.md'
import phpCORTEXApi from './cortex-api/php/cortex-api.md'
import pythonAgentSdkPatterns from './cortex-api/python/agent-sdk/patterns.md'
import pythonAgentSdkReadme from './cortex-api/python/agent-sdk/README.md'
import pythonCORTEXApiBatches from './cortex-api/python/cortex-api/batches.md'
import pythonCORTEXApiFilesApi from './cortex-api/python/cortex-api/files-api.md'
import pythonCORTEXApiReadme from './cortex-api/python/cortex-api/README.md'
import pythonCORTEXApiStreaming from './cortex-api/python/cortex-api/streaming.md'
import pythonCORTEXApiToolUse from './cortex-api/python/cortex-api/tool-use.md'
import rubyCORTEXApi from './cortex-api/ruby/cortex-api.md'
import skillPrompt from './cortex-api/SKILL.md'
import sharedErrorCodes from './cortex-api/shared/error-codes.md'
import sharedLiveSources from './cortex-api/shared/live-sources.md'
import sharedModels from './cortex-api/shared/models.md'
import sharedPromptCaching from './cortex-api/shared/prompt-caching.md'
import sharedToolUseConcepts from './cortex-api/shared/tool-use-concepts.md'
import typescriptAgentSdkPatterns from './cortex-api/typescript/agent-sdk/patterns.md'
import typescriptAgentSdkReadme from './cortex-api/typescript/agent-sdk/README.md'
import typescriptCORTEXApiBatches from './cortex-api/typescript/cortex-api/batches.md'
import typescriptCORTEXApiFilesApi from './cortex-api/typescript/cortex-api/files-api.md'
import typescriptCORTEXApiReadme from './cortex-api/typescript/cortex-api/README.md'
import typescriptCORTEXApiStreaming from './cortex-api/typescript/cortex-api/streaming.md'
import typescriptCORTEXApiToolUse from './cortex-api/typescript/cortex-api/tool-use.md'

// @[MODEL LAUNCH]: Update the model IDs/names below. These are substituted into {{VAR}}
// placeholders in the .md files at runtime before the skill prompt is sent.
// After updating these constants, manually update the two files that still hardcode models:
//   - cortex-api/SKILL.md (Current Models pricing table)
//   - cortex-api/shared/models.md (full model catalog with legacy versions and alias mappings)
export const SKILL_MODEL_VARS = {
  OPUS_ID: 'cortex-opus-4-6',
  OPUS_NAME: 'CORTEX Opus 4.6',
  SONNET_ID: 'cortex-sonnet-4-6',
  SONNET_NAME: 'CORTEX Sonnet 4.6',
  HAIKU_ID: 'cortex-haiku-4-5',
  HAIKU_NAME: 'CORTEX Haiku 4.5',
  // Previous Sonnet ID — used in "do not append date suffixes" example in SKILL.md.
  PREV_SONNET_ID: 'cortex-sonnet-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT: string = skillPrompt

export const SKILL_FILES: Record<string, string> = {
  'csharp/cortex-api.md': csharpCORTEXApi,
  'curl/examples.md': curlExamples,
  'go/cortex-api.md': goCORTEXApi,
  'java/cortex-api.md': javaCORTEXApi,
  'php/cortex-api.md': phpCORTEXApi,
  'python/agent-sdk/README.md': pythonAgentSdkReadme,
  'python/agent-sdk/patterns.md': pythonAgentSdkPatterns,
  'python/cortex-api/README.md': pythonCORTEXApiReadme,
  'python/cortex-api/batches.md': pythonCORTEXApiBatches,
  'python/cortex-api/files-api.md': pythonCORTEXApiFilesApi,
  'python/cortex-api/streaming.md': pythonCORTEXApiStreaming,
  'python/cortex-api/tool-use.md': pythonCORTEXApiToolUse,
  'ruby/cortex-api.md': rubyCORTEXApi,
  'shared/error-codes.md': sharedErrorCodes,
  'shared/live-sources.md': sharedLiveSources,
  'shared/models.md': sharedModels,
  'shared/prompt-caching.md': sharedPromptCaching,
  'shared/tool-use-concepts.md': sharedToolUseConcepts,
  'typescript/agent-sdk/README.md': typescriptAgentSdkReadme,
  'typescript/agent-sdk/patterns.md': typescriptAgentSdkPatterns,
  'typescript/cortex-api/README.md': typescriptCORTEXApiReadme,
  'typescript/cortex-api/batches.md': typescriptCORTEXApiBatches,
  'typescript/cortex-api/files-api.md': typescriptCORTEXApiFilesApi,
  'typescript/cortex-api/streaming.md': typescriptCORTEXApiStreaming,
  'typescript/cortex-api/tool-use.md': typescriptCORTEXApiToolUse,
}
