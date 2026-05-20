const AGENTMEMORY_URL = process.env.AGENTMEMORY_URL || 'http://localhost:3111'

export async function remember(chatId: string, role: string, content: string) {
  try {
    await fetch(`${AGENTMEMORY_URL}/mem/remember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        observation: `[${chatId}] ${role}: ${content}`,
        metadata: { chatId, role, timestamp: Date.now() },
      }),
    })
  } catch {}
}

export async function search(chatId: string, query: string): Promise<string> {
  try {
    const res = await fetch(`${AGENTMEMORY_URL}/mem/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, metadata: { chatId } }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.results?.map((r: any) => r.observation).join('\n') || ''
  } catch {
    return ''
  }
}

export async function getConversationHistory(chatId: string): Promise<Array<{ role: string; content: string }>> {
  try {
    const res = await fetch(`${AGENTMEMORY_URL}/mem/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `chat:${chatId}`,
        metadata: { chatId },
        limit: 20,
      }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || [])
      .map((r: any) => {
        if (!r || !r.observation) return null
        const match = String(r.observation).match(/^\[(\d+)\]\s*(user|assistant|system):\s*(.*)/s)
        return match ? { role: match[2], content: match[3] } : null
      })
      .filter((r: any): r is { role: string; content: string } => r !== null)
  } catch {
    return []
  }
}
