export function compressMessages(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 131072,
): Array<{ role: string; content: string }> {
  if (messages.length <= 2) return messages

  const currentLength = estimateTokenLength(messages)
  if (currentLength <= maxTokens) return messages

  const kept: Array<{ role: string; content: string }> = []
  const compressible: Array<{ role: string; content: string }> = []
  let tokenCount = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const tokens = estimateTokenLength([msg])
    if (i > messages.length * 0.4 && tokenCount + tokens < maxTokens * 0.7) {
      kept.unshift(msg)
      tokenCount += tokens
    } else {
      compressible.unshift(msg)
    }
  }

  const summary = compressible.map(m => `[${m.role}]: ${summarize(m.content)}`).join('\n')
  kept.unshift({
    role: 'system',
    content: `[Compressed earlier conversation to save space]:\n${summary}`,
  })
  return kept
}

function summarize(text: string, maxLen = 200): string {
  const cleaned = text.replace(/```[\s\S]*?```/g, '[code block]').replace(/\s+/g, ' ').trim()
  return cleaned.length <= maxLen ? cleaned : cleaned.slice(0, maxLen) + '...'
}

function estimateTokenLength(messages: Array<{ role: string; content: string }>): number {
  return messages.reduce((sum, m) => sum + Math.ceil((m.content?.length ?? 0) / 4) + 10, 0)
}
