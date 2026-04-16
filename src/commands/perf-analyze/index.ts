import type { Command } from '../../commands.js'
import { executeShellCommandsInPrompt } from '../../utils/promptShellExecution.js'

const ALLOWED_TOOLS = [
  'Bash',
  'Read',
  'Glob',
  'Grep',
]

const PERF_PROMPT = (args: string) => {
  const subcommand = args.split(' ')[0] || 'full'
  const rest = args.split(' ').slice(1).join(' ')

  const prompts: Record<string, string> = {
    full: `## Full Performance Analysis

You are a senior performance engineer conducting a comprehensive performance audit.

### Project Context:
- Package manager: !\`ls package-lock.json yarn.lock pnpm-lock.yaml bun.lockb 2>/dev/null | head -1\`
- Framework: !\`cat package.json 2>/dev/null | grep -E "(next|react|vue|angular|svelte|express|fastify|nestjs|hono)" | head -5\`
- Build tool: !\`cat package.json 2>/dev/null | grep -E "(webpack|vite|esbuild|rollup|turbo|tsup|swc)" | head -5\`
- Source file count: !\`find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l\`
- Total dependencies: !\`cat package.json 2>/dev/null | grep -c '":' || echo "unknown"\`

### Analysis Areas:

#### 1. Bundle Size Analysis
- Read build configuration (webpack.config, vite.config, next.config, etc.)
- Identify large dependencies that could be replaced:
  - moment.js → dayjs or date-fns
  - lodash (full) → lodash-es or individual imports
  - axios → native fetch
  - uuid → crypto.randomUUID()
- Check for tree-shaking issues (barrel exports, CommonJS imports)
- Identify duplicate dependencies
- Check for dynamic imports / code splitting opportunities

#### 2. Runtime Performance
Scan source code for:
- **Expensive operations in hot paths:**
  - JSON.parse/stringify on large objects in loops
  - Regex compilation inside loops (should be hoisted)
  - Array methods chaining (map→filter→reduce instead of single reduce)
  - Unnecessary spread operations creating new objects
  
- **Memory issues:**
  - Event listeners not cleaned up (addEventListener without removeEventListener)
  - Closures capturing large scopes
  - Unbounded caches or arrays (Map/Set that only grow)
  - Large object cloning where mutation would suffice

- **Async performance:**
  - Sequential awaits that could be Promise.all()
  - Missing AbortController for cancellable operations
  - Unbounded Promise.all() (should use p-limit or p-map)
  - Missing error handling on fire-and-forget promises

#### 3. React/Frontend Performance (if applicable)
- Unnecessary re-renders (missing React.memo, useMemo, useCallback)
- Large component trees without Suspense boundaries
- Missing key props or non-stable keys in lists
- Context providers causing full tree re-renders
- Images without lazy loading or optimization
- Missing virtualization for long lists

#### 4. API/Backend Performance (if applicable)
- N+1 query patterns
- Missing caching (Redis, in-memory LRU)
- Unbounded queries (no LIMIT/pagination)
- Missing compression (gzip/brotli)
- Missing connection pooling
- Synchronous operations that should be async
- Missing rate limiting

#### 5. Build Performance
- Check build times and suggest improvements
- Identify slow TypeScript compilation issues
- Check for unnecessary files in build
- Suggest incremental build configuration

### Output Report:

# ⚡ Performance Analysis Report

## Summary
- Critical issues: X
- Optimization opportunities: X
- Estimated improvement: X%

## 🔴 Critical Performance Issues
[Issues causing significant slowdowns]

## 🟡 Optimization Opportunities
[Quick wins for better performance]

## 🔵 Best Practice Suggestions
[Long-term improvements]

## 📊 Metrics
- Estimated bundle size impact
- Runtime complexity analysis
- Memory usage patterns

${rest ? `Focus area: **${rest}**` : ''}`,

    bundle: `## Bundle Size Analysis

### Build Config:
- Build config files: !\`ls webpack.config* vite.config* next.config* rollup.config* tsconfig.json esbuild.* 2>/dev/null\`
- Package.json scripts: !\`cat package.json 2>/dev/null | grep -A3 '"build"' || echo "No build script"\`

### Instructions:
1. **Analyze dependencies by size impact:**
   - Read package.json and identify heavy dependencies
   - Flag known large packages:
     - moment.js (~300KB) → dayjs (~2KB)
     - lodash (~70KB) → lodash-es + tree-shaking
     - aws-sdk v2 → @aws-sdk/client-* v3
     - Material UI full import → specific component imports

2. **Check import patterns:**
   - Barrel imports that defeat tree-shaking: \`import { x } from 'large-lib'\`
   - Dynamic imports for route-level code splitting
   - Unused imports/exports (dead code)

3. **Build configuration review:**
   - Is minification enabled?
   - Is tree-shaking working?
   - Are source maps configured correctly for production?
   - Is code splitting configured?
   - Are CSS/assets optimized?

4. **Generate optimization plan** with estimated size savings

${rest ? `Focus on: **${rest}**` : ''}`,

    api: `## API Performance Optimizer

### Project Context:
- Server framework: !\`cat package.json 2>/dev/null | grep -E "(express|fastify|nestjs|hono|koa|next)" | head -3\`
- Route files: !\`find . -path "*/routes/*" -o -path "*/api/*" -o -path "*/controllers/*" 2>/dev/null | head -15\`
- Middleware: !\`find . -name "middleware*" -o -name "*middleware*" 2>/dev/null | head -10\`

### Instructions:
1. **Analyze API endpoints** for performance issues:
   - Response time bottlenecks
   - Missing caching headers (Cache-Control, ETag)
   - Missing compression middleware
   - Unnecessary middleware on static routes
   - Heavy computation on the request path (should be queued)

2. **Database query analysis:**
   - N+1 patterns (loop with DB call inside)
   - Missing indexes implied by WHERE clauses
   - SELECT * instead of specific columns
   - Missing pagination

3. **Caching strategy:**
   - Which endpoints should be cached?
   - Redis vs in-memory vs CDN caching
   - Cache invalidation strategy
   - HTTP caching headers

4. **Concurrency & throughput:**
   - Connection pool sizing
   - Worker thread usage for CPU-bound tasks
   - Stream processing for large payloads
   - WebSocket vs polling optimization

${rest ? `Focus on: **${rest}**` : ''}`,

    memory: `## Memory & Resource Analysis

### Instructions:
1. **Scan for memory leaks:**
   - Event listeners attached but never removed
   - Timers (setInterval) without clearInterval
   - Closures capturing large objects
   - Growing Maps/Sets/Arrays without bounds
   - Cached data without TTL or LRU eviction
   - Streams not properly destroyed/ended

2. **Resource management:**
   - File handles opened but not closed
   - Database connections not released
   - HTTP connections not aborted on timeout
   - Child processes not killed on shutdown

3. **Scan for common patterns:**
   !\`grep -rn "addEventListener\\|setInterval\\|new Map\\|new Set" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -20\`
   !\`grep -rn "createReadStream\\|createWriteStream\\|spawn\\|exec(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -20\`

4. **Provide fixes** for each leak/resource issue found

${rest ? `Focus on: **${rest}**` : ''}`,

    help: `## Performance Commands

Available performance subcommands:

- \`/perf full\` — Complete performance audit (bundle + runtime + API + memory)
- \`/perf bundle\` — Analyze bundle size and suggest reductions
- \`/perf api\` — Optimize API endpoints, caching, queries
- \`/perf memory\` — Detect memory leaks and resource issues

Examples:
  /perf
  /perf full
  /perf bundle
  /perf api src/routes/
  /perf memory

Please specify a subcommand (defaults to 'full').`,
  }

  return prompts[subcommand] || prompts['full']!
}

const perfAnalyze: Command = {
  type: 'prompt',
  name: 'perf',
  aliases: ['performance', 'perf-analyze'],
  description: 'Performance optimization: bundle analysis, API profiling, memory leak detection',
  allowedTools: ALLOWED_TOOLS,
  contentLength: 0,
  progressMessage: 'analyzing performance',
  source: 'builtin',
  async getPromptForCommand(args, context) {
    const promptContent = PERF_PROMPT(args)
    const finalContent = await executeShellCommandsInPrompt(
      promptContent,
      {
        ...context,
        getAppState() {
          const appState = context.getAppState()
          return {
            ...appState,
            toolPermissionContext: {
              ...appState.toolPermissionContext,
              alwaysAllowRules: {
                ...appState.toolPermissionContext.alwaysAllowRules,
                command: ALLOWED_TOOLS,
              },
            },
          }
        },
      },
      '/perf',
    )
    return [{ type: 'text', text: finalContent }]
  },
}

export default perfAnalyze
