import { makeTierCommand, PKG_TOOLS } from '../_tierHelper.js'

export default makeTierCommand({
  name: 'voice',
  aliases: ['v'],
  description:
    'Voice I/O: record → transcribe (Whisper), or speak (TTS). Subcommands: listen, transcribe <file>, speak "<text>"',
  progressMessage: 'running voice I/O',
  allowedTools: [
    ...PKG_TOOLS,
    'Bash(python3:*)',
    'Bash(pip:*)',
    'Bash(pip3:*)',
    'Bash(afplay:*)',
    'Bash(aplay:*)',
    'Read',
  ],
  buildPrompt: (args) => {
    const trimmed = (args ?? '').trim()
    return `## CORTEX Voice I/O Protocol

User invocation: \`/voice ${trimmed}\`

You are operating the voice engine at \`python/cortex_voice.py\`.

## Rules
1. If no args or "help", show:
   - \`listen [--seconds N]\` — record from mic and transcribe (default 10s)
   - \`transcribe <file>\`    — transcribe an existing audio file
   - \`speak "<text>"\`       — synthesize speech → out.wav (auto-plays on macOS/Linux)
2. Otherwise shell out to: \`python3 python/cortex_voice.py ${trimmed}\`
3. If sounddevice or numpy is missing (for \`listen\`), tell the user to run:
   \`pip install -r python/requirements-tier-s.txt\`
4. If HF_TOKEN is not set, remind the user it's in \`.env\`.
5. For \`listen\` output: present the transcribed text as a blockquote so it's easy to read.
6. For \`speak\`: confirm the output file and whether it auto-played.

## Notes
- STT model: \`openai/whisper-large-v3-turbo\` (override via CORTEX_STT_MODEL)
- TTS model: \`suno/bark-small\` (override via CORTEX_TTS_MODEL)
- All calls go through HuggingFace Router — free tier applies
`
  },
})
