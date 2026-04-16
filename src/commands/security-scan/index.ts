import type { Command } from '../../commands.js'
import { executeShellCommandsInPrompt } from '../../utils/promptShellExecution.js'

const ALLOWED_TOOLS = [
  'Bash(npm audit:*)',
  'Bash(npx:*)',
  'Bash(find:*)',
  'Bash(grep:*)',
  'Bash(git log:*)',
  'Bash(git diff:*)',
  'Bash(cat:*)',
  'Bash(ls:*)',
  'Bash(wc:*)',
  'Read',
  'Glob',
  'Grep',
]

const SECURITY_PROMPT = (args: string) => {
  const subcommand = args.split(' ')[0] || 'full'
  const rest = args.split(' ').slice(1).join(' ')

  const prompts: Record<string, string> = {
    full: `## Comprehensive Security Scan

You are a senior application security engineer performing a full security audit.

### Phase 1: Dependency Vulnerability Scan
Run these checks:
- \`npm audit 2>/dev/null || yarn audit 2>/dev/null || echo "No npm/yarn"\`
- \`cat package.json 2>/dev/null\` — check for known vulnerable versions
- \`cat requirements.txt 2>/dev/null || cat Pipfile 2>/dev/null\` — Python deps
- \`find . -name "go.sum" -maxdepth 2 2>/dev/null\` — Go deps

### Phase 2: Secrets Detection
Scan for hardcoded secrets:
- API keys: \`grep -rn "sk-[a-zA-Z0-9]\\{20,\\}\\|api[_-]key.*=.*['\\"]\` across all source files
- Passwords: \`grep -rn "password.*=.*['\\"]\` (excluding test files and configs)
- Tokens: \`grep -rn "token.*=.*['\\"]\` (excluding node_modules)
- Private keys: \`find . -name "*.pem" -o -name "*.key" -o -name "id_rsa"\`
- AWS keys: \`grep -rn "AKIA[0-9A-Z]\\{16\\}"\`
- .env files not in .gitignore: check if .env is tracked

### Phase 3: Code Vulnerability Scan
For each source file, check for:

**Injection Vulnerabilities:**
- SQL injection: raw string concatenation in queries
- Command injection: unsanitized input in exec/spawn/system calls
- XSS: unescaped user input in HTML/templates
- NoSQL injection: unvalidated input in MongoDB queries
- Path traversal: user input in file paths without sanitization
- Template injection: user input in template literals sent to engines

**Authentication & Authorization:**
- JWT without expiry or with weak secrets
- Missing authentication on sensitive endpoints
- Broken access control (IDOR vulnerabilities)
- Session management issues
- CORS misconfiguration

**Cryptographic Issues:**
- Use of MD5 or SHA1 for security purposes
- Weak random number generation (Math.random for tokens)
- Hardcoded encryption keys
- Missing HTTPS enforcement

**Data Exposure:**
- Sensitive data in logs
- Stack traces exposed to users
- Debug mode enabled in production configs
- Sensitive fields not redacted in API responses

### Phase 4: Configuration Security
- Check for \`.env.example\` vs actual \`.env\` differences
- Verify security headers in server configuration
- Check CORS settings
- Verify CSP (Content Security Policy)
- Check for debug/development flags that should be off in production

### Output Report Format:

# 🔒 Security Scan Report

## Summary
- Total issues found: X
- 🔴 Critical: X
- 🟠 High: X
- 🟡 Medium: X
- 🔵 Low: X

## Dependency Vulnerabilities
[List each with severity, package, version, fix version]

## Hardcoded Secrets
[List each with file:line, type, recommendation]

## Code Vulnerabilities
[List each with CWE ID, file:line, description, exploit scenario, fix]

## Configuration Issues
[List each with file, issue, recommendation]

## Remediation Priority
1. [Critical fix 1]
2. [Critical fix 2]
...

${rest ? `Focus area: **${rest}**` : ''}`,

    secrets: `## Secret Detection Scan

You are a security engineer scanning for leaked credentials and secrets.

### Scan Strategy:
1. **High-entropy string detection** — Look for base64 or hex strings >20 chars in source
2. **Pattern matching** — Scan for known secret patterns:

\`\`\`
API Keys:     sk-*, AKIA*, ghp_*, gho_*, github_pat_*
Tokens:       eyJ* (JWT), xox[bspar]-* (Slack), ya29.* (Google OAuth)
Passwords:    password=, passwd=, pwd=, secret=
Private keys: -----BEGIN.*PRIVATE KEY-----
AWS:          AKIA[0-9A-Z]{16}, aws_secret_access_key
Database:     mongodb://*:*@, postgres://*:*@, mysql://*:*@
\`\`\`

3. **Git history scan** — Check if secrets were ever committed:
   - \`git log --all --oneline -20\`
   - Check recently modified files for secrets removal

4. **Environment file audit**:
   - Is .env in .gitignore?
   - Does .env.example have real values?
   - Are there .env files committed to git?

### Output:
For each secret found:
- 📍 File:line location
- 🏷️ Secret type (API key, password, token, etc.)
- ⚠️ Severity (Critical if production key, High if any real key)
- 🔧 Remediation (rotate key, move to env var, use secret manager)

${rest ? `Focus on: **${rest}**` : ''}`,

    deps: `## Dependency Security Audit

### Instructions:
1. Run dependency audit:
   !\`npm audit --json 2>/dev/null | head -100 || echo "npm audit not available"\`
   !\`cat package-lock.json 2>/dev/null | grep -c "resolved" || echo "No lockfile"\`

2. Check for:
   - Known CVEs in direct dependencies
   - Known CVEs in transitive dependencies
   - Outdated packages with security patches available
   - Deprecated packages that should be replaced
   - Packages with no maintenance (>2 years since last release)
   - Packages with suspicious behavior (install scripts, native modules)

3. For each vulnerability:
   - Package name and version
   - CVE ID if available
   - Severity and CVSS score
   - Upgrade path (which version fixes it)
   - Breaking changes in the fix version
   - Workaround if upgrade isn't possible

4. Generate a prioritized fix plan:
   - \`npm audit fix\` safe fixes
   - Manual version bumps needed
   - Packages to replace entirely

${rest ? `Focus on: **${rest}**` : ''}`,

    compliance: `## Compliance Check

You are a compliance auditor checking the codebase for regulatory requirements.

### Checks:

**GDPR Compliance:**
- Personal data handling: Is PII properly encrypted at rest?
- Data retention: Are there cleanup/deletion mechanisms?
- Consent tracking: Is user consent recorded?
- Right to deletion: Can user data be fully purged?
- Data portability: Can user data be exported?
- Privacy policy: Does the app have one?

**OWASP Top 10 (2021):**
1. A01 Broken Access Control
2. A02 Cryptographic Failures
3. A03 Injection
4. A04 Insecure Design
5. A05 Security Misconfiguration
6. A06 Vulnerable Components
7. A07 Authentication Failures
8. A08 Data Integrity Failures
9. A09 Logging & Monitoring Failures
10. A10 SSRF

**General Security Hygiene:**
- HTTPS enforcement
- Security headers (HSTS, CSP, X-Frame-Options)
- Rate limiting on auth endpoints
- Input validation on all user inputs
- Output encoding
- Error handling (no stack traces to users)

### Output:
A compliance scorecard with pass/fail/partial for each item.

${rest ? `Focus on: **${rest}**` : ''}`,

    help: `## Security Commands

Available security subcommands:

- \`/security-scan full\` — Complete security audit (dependencies + secrets + code + config)
- \`/security-scan secrets\` — Detect hardcoded secrets and credentials
- \`/security-scan deps\` — Audit dependencies for known vulnerabilities
- \`/security-scan compliance [standard]\` — Check GDPR/OWASP compliance

Examples:
  /security-scan
  /security-scan full
  /security-scan secrets
  /security-scan deps
  /security-scan compliance gdpr
  /security-scan compliance owasp

Please specify a subcommand (defaults to 'full').`,
  }

  return prompts[subcommand] || prompts['full']!
}

const securityScan: Command = {
  type: 'prompt',
  name: 'security-scan',
  aliases: ['scan', 'audit'],
  description: 'Security scanning: full audit, secret detection, dependency vulnerabilities, compliance',
  allowedTools: ALLOWED_TOOLS,
  contentLength: 0,
  progressMessage: 'scanning for security issues',
  source: 'builtin',
  async getPromptForCommand(args, context) {
    const promptContent = SECURITY_PROMPT(args)
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
      '/security-scan',
    )
    return [{ type: 'text', text: finalContent }]
  },
}

export default securityScan
