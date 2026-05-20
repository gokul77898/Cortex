import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

export interface AgentProfile {
  id: string
  name: string
  description: string
  emoji: string
  color: string
  vibe: string
  tools: string
  category: string
  systemPrompt: string
  keywords: string[]
}

interface ParsedFrontmatter {
  name: string
  description: string
  emoji: string
  color: string
  vibe: string
  tools: string
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'engineering-frontend': ['frontend', 'react', 'vue', 'angular', 'css', 'html', 'javascript', 'typescript', 'web', 'ui', 'component'],
  'engineering-backend': ['backend', 'api', 'server', 'rest', 'graphql', 'database', 'microservice'],
  'engineering-fullstack': ['fullstack', 'full stack', 'web app'],
  'engineering-senior': ['code', 'implementation', 'develop', 'programming', 'senior developer', 'architecture'],
  'engineering-devops': ['devops', 'ci/cd', 'deploy', 'kubernetes', 'docker', 'terraform', 'infrastructure'],
  'engineering-security': ['security', 'vulnerability', 'penetration', 'audit', 'secure code'],
  'engineering-sre': ['sre', 'reliability', 'monitoring', 'observability', 'incident'],
  'engineering-data': ['data engineer', 'pipeline', 'etl', 'data warehouse', 'spark'],
  'engineering-mobile': ['mobile', 'ios', 'android', 'react native', 'flutter', 'swift'],
  'engineering-senior-developer': ['senior developer', 'implementation', 'premium', 'full-stack', 'laravel', 'livewire'],
  'marketing': ['marketing', 'campaign', 'brand', 'content', 'social media', 'seo', 'growth'],
  'marketing-seo': ['seo', 'search engine', 'ranking', 'organic', 'keyword', 'google search'],
  'design-ui': ['ui design', 'user interface', 'layout', 'visual', 'design system'],
  'design-ux': ['ux', 'user experience', 'research', 'usability', 'accessibility'],
  'sales': ['sales', 'prospecting', 'outreach', 'pipeline', 'deal', 'revenue'],
  'product': ['product', 'product manager', 'roadmap', 'sprint', 'backlog', 'feature'],
  'product-manager': ['product manager', 'pm', 'strategy', 'roadmap', 'stakeholder'],
  'project-management': ['project management', 'jira', 'task', 'milestone', 'deadline'],
  'testing': ['test', 'qa', 'quality', 'automation test', 'unit test', 'integration test'],
  'testing-accessibility': ['accessibility', 'a11y', 'wcag', 'screen reader'],
  'game': ['game', 'gaming', 'unity', 'unreal', 'godot', 'roblox', 'level design'],
  'unity': ['unity', 'c#', 'game object', 'shader', 'multiplayer'],
  'unreal': ['unreal', 'c++', 'blueprint', 'unreal engine'],
  'godot': ['godot', 'gdscript', 'godot engine'],
  'roblox': ['roblox', 'luau', 'roblox studio'],
  'data': ['data', 'analytics', 'report', 'dashboard', 'insight'],
  'blockchain': ['blockchain', 'web3', 'crypto', 'solidity', 'smart contract', 'nft'],
  'research': ['research', 'academic', 'study', 'paper', 'analysis'],
  'support': ['support', 'help', 'customer', 'troubleshoot'],
  'compliance': ['compliance', 'regulation', 'audit', 'policy', 'governance'],
  'recruitment': ['recruitment', 'hiring', 'talent', 'interview', 'hr'],
  'supply-chain': ['supply chain', 'logistics', 'inventory', 'procurement'],
  'specialized-mcp': ['mcp', 'model context protocol', 'tool', 'server', 'integration'],
  'specialized-workflow': ['workflow', 'automation', 'process', 'orchestration'],
  'macos': ['macos', 'mac', 'apple', 'spatial', 'metal', 'visionos'],
  'xr': ['xr', 'ar', 'vr', 'augmented reality', 'virtual reality', 'spatial'],
  'government': ['government', 'public sector', 'policy', 'civic'],
  'healthcare': ['healthcare', 'medical', 'health', 'clinical'],
  'education': ['education', 'study abroad', 'learning', 'course'],
  'design': ['design', 'creative', 'visual', 'brand', 'graphic'],
  'engineering': ['engineering', 'software', 'code', 'programming', 'develop', 'build'],
  'product-management': ['jira', 'sprint', 'backlog', 'ticket', 'story point'],
  'support-analytics': ['analytics', 'reporting', 'metrics', 'kpi'],
  'support-finance': ['finance', 'budget', 'cost', 'expense', 'invoice'],
  'paid-media': ['ads', 'advertising', 'ppc', 'paid media', 'campaign'],
  'testing-api': ['api test', 'endpoint', 'rest api', 'integration test'],
  'terminal': ['terminal', 'shell', 'command line', 'cli', 'bash'],
}

const CATEGORY_FROM_PREFIX: Record<string, string> = {
  'academic': 'research',
  'accounts': 'finance',
  'agentic': 'security',
  'agents': 'orchestration',
  'automation': 'governance',
  'blender': '3d',
  'blockchain': 'blockchain',
  'compliance': 'compliance',
  'corporate': 'training',
  'data': 'data',
  'design': 'design',
  'engineering': 'engineering',
  'game': 'game',
  'godot': 'godot',
  'government': 'government',
  'healthcare': 'healthcare',
  'identity': 'identity',
  'level': 'game',
  'lsp': 'code',
  'macos': 'macos',
  'marketing': 'marketing',
  'narrative': 'writing',
  'paid': 'paid-media',
  'product': 'product',
  'project': 'project-management',
  'recruitment': 'recruitment',
  'report': 'analytics',
  'roblox': 'roblox',
  'sales': 'sales',
  'specialized': 'specialized',
  'study': 'education',
  'supply': 'supply-chain',
  'support': 'support',
  'technical': '3d',
  'terminal': 'terminal',
  'testing': 'testing',
  'unity': 'unity',
  'unreal': 'unreal',
  'visionos': 'macos',
  'xr': 'xr',
  'zk': 'blockchain',
}

class AgentManager {
  private agents: AgentProfile[] = []
  private loaded = false
  private lastAgentId: string | null = null
  private lockedAgentId: string | null = null

  get isLoaded(): boolean {
    return this.loaded
  }

  get count(): number {
    return this.agents.length
  }

  get currentAgentId(): string | null {
    return this.lockedAgentId || this.lastAgentId
  }

  get currentAgent(): AgentProfile | null {
    const id = this.currentAgentId
    if (!id) return null
    return this.agents.find(a => a.id === id) || null
  }

  setLockedAgent(id: string | null): boolean {
    if (id === null) {
      this.lockedAgentId = null
      return true
    }
    const found = this.agents.find(a => a.id === id)
    if (found) {
      this.lockedAgentId = id
      return true
    }
    return false
  }

  lockCurrent(): void {
    if (this.lastAgentId) {
      this.lockedAgentId = this.lastAgentId
    }
  }

  unlock(): void {
    this.lockedAgentId = null
  }

  get isLocked(): boolean {
    return this.lockedAgentId !== null
  }

  private parseFrontmatter(content: string): { frontmatter: ParsedFrontmatter; body: string } {
    const defaultFm: ParsedFrontmatter = {
      name: '',
      description: '',
      emoji: '',
      color: '',
      vibe: '',
      tools: '',
    }

    if (!content.startsWith('---')) {
      return { frontmatter: defaultFm, body: content }
    }

    const end = content.indexOf('---', 3)
    if (end === -1) {
      return { frontmatter: defaultFm, body: content }
    }

    const fmRaw = content.slice(3, end).trim()
    const body = content.slice(end + 3).trim()

    const lines = fmRaw.split('\n')
    const frontmatter: ParsedFrontmatter = { ...defaultFm }

    for (const line of lines) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const key = line.slice(0, colonIdx).trim()
      let val = line.slice(colonIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      switch (key) {
        case 'name': frontmatter.name = val; break
        case 'description': frontmatter.description = val; break
        case 'emoji': frontmatter.emoji = val; break
        case 'color': frontmatter.color = val; break
        case 'vibe': frontmatter.vibe = val; break
        case 'tools': frontmatter.tools = val; break
      }
    }

    return { frontmatter, body }
  }

  private getCategoryFromFilename(name: string): string {
    const prefix = name.split('-')[0]
    return CATEGORY_FROM_PREFIX[prefix] || 'general'
  }

  private extractKeywords(profile: AgentProfile): string[] {
    const keywords: string[] = []
    const text = `${profile.name} ${profile.description} ${profile.vibe} ${profile.category} ${profile.tools}`.toLowerCase()
    const words = text.split(/[\s,;:.!?()]+/).filter(w => w.length > 2)
    keywords.push(...new Set(words))
    if (profile.category && CATEGORY_KEYWORDS[profile.category]) {
      keywords.push(...CATEGORY_KEYWORDS[profile.category])
    }
    const catPrefix = profile.id.split('-')[0]
    if (CATEGORY_KEYWORDS[catPrefix]) {
      keywords.push(...CATEGORY_KEYWORDS[catPrefix])
    }
    return [...new Set(keywords)]
  }

  load(): void {
    if (this.loaded) return

    const agentsDir = join(process.env.HOME || '', '.cortex', 'agents')
    if (!existsSync(agentsDir)) {
      console.log('[AGENT] No agents directory found at', agentsDir)
      this.loaded = true
      return
    }

    const files = readdirSync(agentsDir).filter(f => f.endsWith('.md'))
    console.log(`[AGENT] Loading ${files.length} agent profiles from ${agentsDir}`)

    for (const file of files) {
      try {
        const content = readFileSync(join(agentsDir, file), 'utf-8')
        const id = file.replace(/\.md$/, '')
        const { frontmatter, body } = this.parseFrontmatter(content)

        if (!frontmatter.name && !frontmatter.description) {
          continue
        }

        const profile: AgentProfile = {
          id,
          name: frontmatter.name || id,
          description: frontmatter.description || '',
          emoji: frontmatter.emoji || '',
          color: frontmatter.color || '',
          vibe: frontmatter.vibe || '',
          tools: frontmatter.tools || '',
          category: this.getCategoryFromFilename(id),
          systemPrompt: body,
          keywords: [],
        }

        profile.keywords = this.extractKeywords(profile)
        this.agents.push(profile)
      } catch (e) {
        console.error(`[AGENT] Error loading ${file}: ${e}`)
      }
    }

    console.log(`[AGENT] ✅ Loaded ${this.agents.length} agent profiles`)
    this.loaded = true
  }

  getRelevantAgent(query: string): AgentProfile | null {
    const q = query.toLowerCase()

    const scores: Array<{ agent: AgentProfile; score: number }> = []

    for (const agent of this.agents) {
      let score = 0
      const nameLower = agent.name.toLowerCase()
      const descLower = agent.description.toLowerCase()
      const vibeLower = agent.vibe.toLowerCase()
      const catLower = agent.category.toLowerCase()

      if (q.includes(nameLower)) score += 10
      if (q.includes(agent.id.toLowerCase())) score += 8

      const queryWords = q.split(/\s+/).filter(w => w.length > 2)
      for (const word of queryWords) {
        if (agent.keywords.includes(word)) score += 3
        if (nameLower.includes(word)) score += 5
        if (descLower.includes(word)) score += 4
        if (vibeLower.includes(word)) score += 3
        if (catLower.includes(word)) score += 2
      }

      if (score > 0) {
        scores.push({ agent, score })
      }
    }

    if (scores.length === 0) return null

    scores.sort((a, b) => b.score - a.score)

    const best = scores[0]
    if (best.score < 3) return null

    return best.agent
  }

  searchAgents(query: string): AgentProfile[] {
    const q = query.toLowerCase()
    const results: Array<{ agent: AgentProfile; score: number }> = []

    for (const agent of this.agents) {
      let score = 0
      const nameLower = agent.name.toLowerCase()
      const descLower = agent.description.toLowerCase()

      if (nameLower.includes(q)) score += 5
      if (agent.id.includes(q)) score += 4
      if (descLower.includes(q)) score += 3
      if (agent.category.includes(q)) score += 2

      const queryWords = q.split(/\s+/).filter(w => w.length > 2)
      for (const word of queryWords) {
        if (agent.keywords.includes(word)) score += 2
        if (nameLower.includes(word)) score += 3
        if (descLower.includes(word)) score += 2
      }

      if (score > 0) {
        results.push({ agent, score })
      }
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, 20).map(r => r.agent)
  }

  listByCategory(category: string): AgentProfile[] {
    const cat = category.toLowerCase()
    return this.agents.filter(a =>
      a.category.includes(cat) ||
      a.id.startsWith(cat) ||
      a.name.toLowerCase().includes(cat)
    )
  }

  getCategories(): string[] {
    const cats = new Set(this.agents.map(a => a.category))
    return [...cats].sort()
  }

  getAgentsByCategory(): Record<string, AgentProfile[]> {
    const grouped: Record<string, AgentProfile[]> = {}
    for (const agent of this.agents) {
      if (!grouped[agent.category]) grouped[agent.category] = []
      grouped[agent.category].push(agent)
    }
    return grouped
  }

  getAgentById(id: string): AgentProfile | undefined {
    return this.agents.find(a => a.id === id)
  }

  getAllAgents(): AgentProfile[] {
    return [...this.agents]
  }
}

export const agentManager = new AgentManager()
