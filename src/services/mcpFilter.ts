const DEFAULT_MCP_SERVERS: string[] = [
  'filesystem',
  'duckduckgo',
  'agent-browser',
  'github',
  'fetch',
  'memory',
  'time',
]

const SERVER_CATEGORIES: Record<string, string[]> = {
  'agent-browser': ['browser'],
  puppeteer: ['browser'],
  playwright: ['browser'],
  filesystem: ['fs'],
  github: ['git'],
  fetch: ['web'],
  duckduckgo: ['search'],
  tavily: ['search'],
  exa: ['search'],
  wikipedia: ['reference'],
  hackernews: ['social'],
  reddit: ['social'],
  'youtube-transcript': ['media'],
  pdf: ['fs'],
  'pdf-reader': ['fs'],
  pandoc: ['fs'],
  excel: ['fs'],
  sqlite: ['db'],
  postgres: ['db'],
  chroma: ['vector'],
  memory: ['memory'],
  agentmemory: ['memory'],
  time: ['utility'],
  calculator: ['utility'],
  'html-to-markdown': ['utility'],
  'sequential-thinking': ['reasoning'],
  'chrome-devtools': ['browser'],
  'automation-mac': ['os'],
  applescript: ['os'],
  'apple-shortcuts': ['os'],
  'pentest-mcp': ['security'],
  'nuclei-mcp': ['security'],
  waftester: ['security'],
  'firewall-tools': ['security'],
  'kali-mcp': ['security'],
  docker: ['infra'],
  jupyter: ['code'],
  git: ['git'],
  notion: ['prod'],
  todoist: ['prod'],
  gmail: ['prod'],
  'google-calendar': ['prod'],
  'google-drive': ['fs'],
  outlook: ['prod'],
  slack: ['comm'],
  linear: ['prod'],
  serena: ['code'],
  obsidian: ['fs'],
  n8n: ['prod'],
  canva: ['media'],
  airtable: ['db'],
  repomix: ['code'],
  'semantic-scholar': ['research'],
  osm: ['geo'],
  'india-stack': ['legal'],
  'paradyno-pdf': ['legal'],
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  browser: [
    'open', 'browser', 'chrome', 'google', 'website', 'site', 'url', 'http', 'https',
    'click', 'tap', 'fill', 'type', 'form', 'login', 'input', 'button', 'link',
    'search for', 'navigate', 'go to', 'page', 'web', 'html', 'screenshot',
    'scrape', 'snapshot', 'ref', 'element', 'selector', 'find', 'wait', 'load',
  ],
  fs: [
    'file', 'read', 'write', 'list', 'directory', 'folder', 'path', 'create',
    'delete', 'edit', 'move', 'copy', 'rename', 'mkdir', 'cat', 'ls',
    'pdf', 'document', 'excel', 'csv', 'json', 'txt', 'md', 'markdown',
  ],
  git: [
    'git', 'github', 'repo', 'commit', 'push', 'pull', 'branch', 'clone',
    'pr', 'pull request', 'issue', 'repository', 'code', 'source',
  ],
  web: ['fetch', 'http', 'get', 'api', 'download', 'scrape', 'web page'],
  search: [
    'search', 'find', 'look up', 'google', 'query', 'information about',
    'tell me about', 'what is', 'who is', 'how to', 'news',
  ],
  reference: [
    'wikipedia', 'wiki', 'reference', 'encyclopedia', 'definition',
  ],
  social: ['hacker news', 'reddit', 'news', 'trending', 'posts'],
  media: ['youtube', 'video', 'transcript', 'audio', 'canva', 'image'],
  db: [
    'database', 'sql', 'query', 'table', 'select', 'insert', 'update',
    'postgres', 'sqlite', 'airtable', 'data',
  ],
  memory: ['remember', 'memory', 'recall', 'forget', 'context', 'previous'],
  utility: ['time', 'date', 'clock', 'convert', 'calculate', 'calculator'],
  reasoning: ['think', 'reason', 'analyze', 'step by step', 'logic', 'puzzle'],
  os: [
    'mac', 'apple', 'app', 'application', 'open app', 'shortcut',
    'automation', 'desktop', 'window', 'keyboard', 'mouse',
  ],
  security: [
    'scan', 'vulnerability', 'security', 'pentest', 'nuclei', 'waf',
    'firewall', 'port', 'hping', 'kali', 'hack',
  ],
  infra: ['docker', 'container', 'deploy', 'server', 'nginx'],
  code: [
    'code', 'run', 'execute', 'python', 'javascript', 'jupyter',
    'notebook', 'script', 'program',
  ],
  prod: [
    'todo', 'task', 'notion', 'calendar', 'gmail', 'email', 'outlook',
    'linear', 'n8n', 'workflow',
  ],
  comm: ['slack', 'message', 'channel', 'team', 'communicate'],
  research: [
    'paper', 'research', 'academic', 'scholar', 'citation', 'doi',
    'science',
  ],
  geo: ['map', 'location', 'coordinates', 'osm', 'geography', 'place'],
  legal: [
    'law', 'legal', 'act', 'section', 'constitution', 'supreme court',
    'high court', 'judgment', 'india', 'ipc', 'crpc',
  ],
  vector: [
    'embedding', 'vector', 'semantic', 'similarity', 'search',
  ],
}

export function getRelevantCategories(query: string): Set<string> {
  const q = query.toLowerCase()
  const matched = new Set<string>()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (q.includes(kw)) {
        matched.add(cat)
        break
      }
    }
  }
  return matched
}

export function getServerNamesForCategories(categories: Set<string>): Set<string> {
  const servers = new Set<string>()
  for (const [server, cats] of Object.entries(SERVER_CATEGORIES)) {
    for (const cat of cats) {
      if (categories.has(cat)) {
        servers.add(server)
        break
      }
    }
  }
  return servers
}

export function isToolRelevant(tool: { name?: string; mcpInfo?: { serverName: string }; isMcp?: boolean; serverName?: string }, query: string): boolean {
  const categories = getRelevantCategories(query)
  if (categories.size === 0) return false

  // For daemon-style MCP tools (name format: server__tool)
  const serverName = tool.mcpInfo?.serverName || tool.serverName || ''
  if (!serverName && tool.name?.includes('__')) {
    const extracted = tool.name.split('__')[0]
    if (extracted && SERVER_CATEGORIES[extracted]) {
      const servers = getServerNamesForCategories(categories)
      return servers.has(extracted)
    }
  }

  if (!serverName) return true

  const servers = getServerNamesForCategories(categories)
  return servers.has(serverName)
}

export { SERVER_CATEGORIES, CATEGORY_KEYWORDS, DEFAULT_MCP_SERVERS }

export function isDefaultMcpServer(serverName: string): boolean {
  return DEFAULT_MCP_SERVERS.includes(serverName)
}
