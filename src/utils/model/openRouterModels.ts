import axios from 'axios'

export type OpenRouterModel = {
  id: string
  name: string
  description?: string
  pricing: { prompt: number; completion: number }
  context_length: number
}

let cachedModels: OpenRouterModel[] | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000

export async function fetchOpenRouterModels(apiKey?: string): Promise<OpenRouterModel[]> {
  if (cachedModels && Date.now() - cacheTime < CACHE_TTL) return cachedModels
  try {
    const headers: Record<string, string> = {}
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
    const res = await axios.get('https://openrouter.ai/api/v1/models', { headers, timeout: 8000 })
    const data = res.data?.data ?? []
    const models: OpenRouterModel[] = (data as any[]).map((m: any) => ({
      id: m.id,
      name: m.name ?? m.id,
      description: m.description ?? '',
      pricing: m.pricing ?? { prompt: 0, completion: 0 },
      context_length: m.context_length ?? 0,
    }))
    cachedModels = models
    cacheTime = Date.now()
    return cachedModels
  } catch {
    return cachedModels ?? []
  }
}

export function getFreeModels(models: OpenRouterModel[]): OpenRouterModel[] {
  return models.filter(m => m.pricing.prompt === 0 && m.pricing.completion === 0)
}

export function clearModelCache(): void {
  cachedModels = null
  cacheTime = 0
}
