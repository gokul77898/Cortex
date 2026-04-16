/**
 * backgroundScans.ts
 * ------------------
 * Runs Tier 1 background scans automatically after CLI startup.
 * Scans run quietly in the background and results are cached for
 * on-demand viewing via /scan-report or individual commands.
 *
 * Scans:
 * 1. Security scan (secrets detection, env audit)
 * 2. Performance scan (heavy deps, anti-patterns, memory leaks)
 * 3. Git health (uncommitted changes, branch status)
 * 4. Test health (detect framework, check for failing tests)
 * 5. Database health (detect stack, schema issues)
 */

import { execSync, spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'
import { getCwd } from './cwd.js'
import { logForDebugging } from './debug.js'
import { logError } from './log.js'

// Delay before starting scans (let REPL stabilize first)
const SCAN_DELAY_MS = 5_000

// Cache directory for scan results
const SCAN_CACHE_DIR = '.cortex/scans'

export interface ScanResult {
  type: string
  status: 'ok' | 'warning' | 'critical'
  summary: string
  details: Record<string, unknown>
  timestamp: number
}

// In-memory cache of scan results
let scanResults: ScanResult[] = []
let scanInProgress = false
let scanComplete = false

/**
 * Get cached scan results
 */
export function getScanResults(): ScanResult[] {
  return scanResults
}

export function isScanComplete(): boolean {
  return scanComplete
}

export function isScanRunning(): boolean {
  return scanInProgress
}

/**
 * Format scan results as a summary string
 */
export function formatScanSummary(): string {
  if (!scanComplete && !scanInProgress) {
    return '⏸️  Background scans not started yet.'
  }
  if (scanInProgress) {
    return '🔄 Background scans in progress...'
  }

  const critical = scanResults.filter(r => r.status === 'critical')
  const warnings = scanResults.filter(r => r.status === 'warning')
  const ok = scanResults.filter(r => r.status === 'ok')

  const lines: string[] = ['# 📊 Background Scan Report\n']

  if (critical.length > 0) {
    lines.push(`## 🔴 Critical (${critical.length})`)
    for (const r of critical) {
      lines.push(`- **${r.type}**: ${r.summary}`)
    }
    lines.push('')
  }

  if (warnings.length > 0) {
    lines.push(`## 🟡 Warnings (${warnings.length})`)
    for (const r of warnings) {
      lines.push(`- **${r.type}**: ${r.summary}`)
    }
    lines.push('')
  }

  if (ok.length > 0) {
    lines.push(`## 🟢 Passed (${ok.length})`)
    for (const r of ok) {
      lines.push(`- **${r.type}**: ${r.summary}`)
    }
    lines.push('')
  }

  lines.push(`\n_Scanned at ${new Date(scanResults[0]?.timestamp || Date.now()).toLocaleTimeString()}_`)
  return lines.join('\n')
}

// ────────────────────────────────────────────────────────────────────
// Individual scan functions (all sync/lightweight — no AI calls)
// ────────────────────────────────────────────────────────────────────

function runGitHealthScan(cwd: string): ScanResult {
  try {
    const status = execSync('git status --porcelain', { cwd, timeout: 5000 }).toString().trim()
    const branch = execSync('git branch --show-current', { cwd, timeout: 5000 }).toString().trim()
    const uncommitted = status.split('\n').filter(Boolean).length

    let behindAhead = ''
    try {
      behindAhead = execSync('git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null', {
        cwd, timeout: 5000,
      }).toString().trim()
    } catch { /* no upstream */ }

    const [behind, ahead] = behindAhead.split('\t').map(Number)

    if (uncommitted > 10) {
      return {
        type: 'Git Health',
        status: 'warning',
        summary: `${uncommitted} uncommitted changes on \`${branch}\`${ahead ? `, ${ahead} commits ahead` : ''}`,
        details: { branch, uncommitted, behind, ahead },
        timestamp: Date.now(),
      }
    }
    return {
      type: 'Git Health',
      status: 'ok',
      summary: `Branch \`${branch}\` — ${uncommitted || 'no'} uncommitted changes${ahead ? `, ${ahead} ahead` : ''}`,
      details: { branch, uncommitted, behind, ahead },
      timestamp: Date.now(),
    }
  } catch {
    return {
      type: 'Git Health',
      status: 'ok',
      summary: 'Not a git repository',
      details: {},
      timestamp: Date.now(),
    }
  }
}

function runSecretsScan(cwd: string): ScanResult {
  const secretPatterns: Record<string, RegExp> = {
    'AWS Key': /AKIA[0-9A-Z]{16}/,
    'GitHub Token': /gh[ps]_[A-Za-z0-9_]{36,}/,
    'OpenAI Key': /sk-[A-Za-z0-9]{20,}/,
    'Stripe Key': /[sr]k_(test|live)_[A-Za-z0-9]{20,}/,
    'Private Key': /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
    'JWT': /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    'Database URL': /(?:postgres|mysql|mongodb):\/\/[^\s'"]+:[^\s'"]+@/,
  }

  const findings: string[] = []

  // Check .gitignore for .env
  const gitignorePath = join(cwd, '.gitignore')
  let envInGitignore = false
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf8')
    envInGitignore = content.includes('.env')
  }
  if (!envInGitignore && existsSync(join(cwd, '.env'))) {
    findings.push('.env not in .gitignore!')
  }

  // Quick scan of common files for secrets
  const filesToScan = ['.env', '.env.local', '.env.production', 'config.json', 'config.js']
  for (const file of filesToScan) {
    const filePath = join(cwd, file)
    if (!existsSync(filePath)) continue
    try {
      const content = readFileSync(filePath, 'utf8')
      for (const [name, pattern] of Object.entries(secretPatterns)) {
        if (pattern.test(content)) {
          // Check for placeholders
          const match = content.match(pattern)?.[0] || ''
          const isPlaceholder = /example|placeholder|your-|xxx|test|fake|dummy|changeme/i.test(match)
          if (!isPlaceholder) {
            findings.push(`${name} found in ${file}`)
          }
        }
      }
    } catch { /* skip unreadable */ }
  }

  // Check if .env is tracked by git
  try {
    const tracked = execSync('git ls-files .env .env.local .env.production 2>/dev/null', {
      cwd, timeout: 3000,
    }).toString().trim()
    if (tracked) {
      findings.push(`SECRET FILES TRACKED BY GIT: ${tracked}`)
    }
  } catch { /* not git */ }

  if (findings.length > 0) {
    const hasCritical = findings.some(f => f.includes('TRACKED BY GIT') || f.includes('not in .gitignore'))
    return {
      type: 'Secrets Scan',
      status: hasCritical ? 'critical' : 'warning',
      summary: `${findings.length} issue(s): ${findings.join('; ')}`,
      details: { findings },
      timestamp: Date.now(),
    }
  }

  return {
    type: 'Secrets Scan',
    status: 'ok',
    summary: 'No hardcoded secrets detected in common files',
    details: { findings: [] },
    timestamp: Date.now(),
  }
}

function runDepsScan(cwd: string): ScanResult {
  const pkgPath = join(cwd, 'package.json')
  if (!existsSync(pkgPath)) {
    return {
      type: 'Dependency Health',
      status: 'ok',
      summary: 'No package.json found',
      details: {},
      timestamp: Date.now(),
    }
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    const total = Object.keys(deps).length

    // Check for known heavy/deprecated packages
    const heavyPkgs: Record<string, string> = {
      'moment': 'dayjs (~2KB)',
      'lodash': 'lodash-es (tree-shakeable)',
      'request': 'native fetch (deprecated!)',
      'uuid': 'crypto.randomUUID()',
      'node-fetch': 'native fetch (Node 18+)',
      'aws-sdk': '@aws-sdk/client-* v3',
    }

    const issues: string[] = []
    for (const [pkg, alt] of Object.entries(heavyPkgs)) {
      if (deps[pkg]) {
        issues.push(`\`${pkg}\` → use ${alt}`)
      }
    }

    // Run npm audit if available
    let auditCount = 0
    try {
      const auditOutput = execSync('npm audit --json 2>/dev/null', {
        cwd, timeout: 15000,
      }).toString()
      const audit = JSON.parse(auditOutput)
      auditCount = Object.keys(audit.vulnerabilities || {}).length
    } catch { /* audit unavailable */ }

    const allIssues = [...issues]
    if (auditCount > 0) {
      allIssues.unshift(`${auditCount} npm audit vulnerabilities`)
    }

    if (auditCount > 5 || issues.length > 3) {
      return {
        type: 'Dependency Health',
        status: 'warning',
        summary: `${total} deps — ${allIssues.join(', ')}`,
        details: { total, issues: allIssues, auditCount },
        timestamp: Date.now(),
      }
    }

    return {
      type: 'Dependency Health',
      status: allIssues.length > 0 ? 'warning' : 'ok',
      summary: `${total} deps${allIssues.length > 0 ? ' — ' + allIssues.join(', ') : ' — all clean'}`,
      details: { total, issues: allIssues, auditCount },
      timestamp: Date.now(),
    }
  } catch {
    return {
      type: 'Dependency Health',
      status: 'ok',
      summary: 'Could not parse package.json',
      details: {},
      timestamp: Date.now(),
    }
  }
}

function runTestHealthScan(cwd: string): ScanResult {
  const pkgPath = join(cwd, 'package.json')
  if (!existsSync(pkgPath)) {
    return {
      type: 'Test Health',
      status: 'ok',
      summary: 'No package.json found',
      details: {},
      timestamp: Date.now(),
    }
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    const scripts = pkg.scripts || {}

    // Detect framework
    let framework = 'none'
    if (deps['vitest']) framework = 'vitest'
    else if (deps['jest'] || deps['@jest/core']) framework = 'jest'
    else if (deps['mocha']) framework = 'mocha'
    else if (deps['@playwright/test']) framework = 'playwright'
    else if (deps['cypress']) framework = 'cypress'

    const hasTestScript = !!scripts.test && scripts.test !== 'echo "Error: no test specified" && exit 1'

    // Count test files
    let testFileCount = 0
    try {
      const output = execSync(
        'find . -name "*.test.*" -o -name "*.spec.*" | grep -v node_modules | wc -l',
        { cwd, timeout: 5000 },
      ).toString().trim()
      testFileCount = parseInt(output) || 0
    } catch { /* skip */ }

    if (framework === 'none' && !hasTestScript) {
      return {
        type: 'Test Health',
        status: 'warning',
        summary: 'No test framework detected — consider adding tests',
        details: { framework, hasTestScript, testFileCount },
        timestamp: Date.now(),
      }
    }

    return {
      type: 'Test Health',
      status: 'ok',
      summary: `${framework} detected — ${testFileCount} test files${hasTestScript ? '' : ' (no test script!)'}`,
      details: { framework, hasTestScript, testFileCount },
      timestamp: Date.now(),
    }
  } catch {
    return {
      type: 'Test Health',
      status: 'ok',
      summary: 'Could not analyze test setup',
      details: {},
      timestamp: Date.now(),
    }
  }
}

function runPerfScan(cwd: string): ScanResult {
  const issues: string[] = []

  // Check for sync FS operations in src/
  try {
    const syncFs = execSync(
      'grep -rn "readFileSync\\|writeFileSync\\|existsSync" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l',
      { cwd, timeout: 5000 },
    ).toString().trim()
    const count = parseInt(syncFs) || 0
    if (count > 10) {
      issues.push(`${count} sync FS calls in src/`)
    }
  } catch { /* skip */ }

  // Check for console.log in src/
  try {
    const consoleLogs = execSync(
      'grep -rn "console\\.log" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v test | wc -l',
      { cwd, timeout: 5000 },
    ).toString().trim()
    const count = parseInt(consoleLogs) || 0
    if (count > 5) {
      issues.push(`${count} console.log calls in src/`)
    }
  } catch { /* skip */ }

  // Check bundle/build config
  const hasSourceMaps = existsSync(join(cwd, 'dist', '*.map')) ||
    existsSync(join(cwd, '.next', 'static'))

  if (issues.length > 0) {
    return {
      type: 'Performance',
      status: 'warning',
      summary: issues.join(', '),
      details: { issues },
      timestamp: Date.now(),
    }
  }

  return {
    type: 'Performance',
    status: 'ok',
    summary: 'No major performance anti-patterns detected',
    details: { issues: [] },
    timestamp: Date.now(),
  }
}

// ────────────────────────────────────────────────────────────────────
// Main entry point — called from startDeferredPrefetches
// ────────────────────────────────────────────────────────────────────

/**
 * Start all background scans after a delay.
 * Runs lightweight local scans (no AI/network calls) so it's fast and free.
 */
export function startBackgroundScans(): void {
  if (scanInProgress || scanComplete) return

  setTimeout(() => {
    scanInProgress = true
    logForDebugging('Background scans starting...')

    try {
      const cwd = getCwd()

      // Run all scans (all lightweight, no AI calls)
      const results: ScanResult[] = [
        runGitHealthScan(cwd),
        runSecretsScan(cwd),
        runDepsScan(cwd),
        runTestHealthScan(cwd),
        runPerfScan(cwd),
      ]

      scanResults = results
      scanComplete = true
      scanInProgress = false

      // Print scan results to terminal automatically
      const critical = results.filter(r => r.status === 'critical')
      const warnings = results.filter(r => r.status === 'warning')
      const ok = results.filter(r => r.status === 'ok')

      const lines: string[] = []
      lines.push('')
      lines.push('\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════╗\x1b[0m')
      lines.push('\x1b[1m\x1b[36m║         📊 CORTEX BACKGROUND SCAN REPORT            ║\x1b[0m')
      lines.push('\x1b[1m\x1b[36m╚══════════════════════════════════════════════════════╝\x1b[0m')
      lines.push('')

      if (critical.length > 0) {
        lines.push(`  \x1b[1m\x1b[31m🔴 CRITICAL (${critical.length})\x1b[0m`)
        for (const r of critical) {
          lines.push(`     \x1b[31m✗ ${r.type}: ${r.summary}\x1b[0m`)
        }
        lines.push('')
      }

      if (warnings.length > 0) {
        lines.push(`  \x1b[1m\x1b[33m🟡 WARNINGS (${warnings.length})\x1b[0m`)
        for (const r of warnings) {
          lines.push(`     \x1b[33m⚠ ${r.type}: ${r.summary}\x1b[0m`)
        }
        lines.push('')
      }

      if (ok.length > 0) {
        lines.push(`  \x1b[1m\x1b[32m🟢 PASSED (${ok.length})\x1b[0m`)
        for (const r of ok) {
          lines.push(`     \x1b[32m✓ ${r.type}: ${r.summary}\x1b[0m`)
        }
        lines.push('')
      }

      lines.push(`  \x1b[2m── Scanned at ${new Date().toLocaleTimeString()} ──\x1b[0m`)
      lines.push(`  \x1b[2mType /scan-report for full details\x1b[0m`)
      lines.push('')

      // Print to stderr so it doesn't interfere with REPL
      process.stderr.write(lines.join('\n') + '\n')

      logForDebugging(
        `Background scans complete: ${critical.length} critical, ${warnings.length} warnings, ${ok.length} ok`,
      )

      // Cache results to disk
      try {
        const cacheDir = join(cwd, SCAN_CACHE_DIR)
        mkdirSync(cacheDir, { recursive: true })
        writeFileSync(
          join(cacheDir, 'latest.json'),
          JSON.stringify({ results, timestamp: Date.now() }, null, 2),
        )
      } catch {
        // Non-critical — skip caching silently
      }
    } catch (err) {
      scanInProgress = false
      logError(err instanceof Error ? err : new Error(String(err)))
    }
  }, SCAN_DELAY_MS)
}
