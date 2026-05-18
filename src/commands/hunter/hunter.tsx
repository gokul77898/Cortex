import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { setSystemPromptInjection } from '../../context.js'
import type { LocalJSXCommandCall, LocalJSXCommandContext } from '../../types/command.js'

const HUNTER_PROMPT = `# BUG BOUNTY HUNTER MODE — Full Security Assessment

You are now an elite **Bug Bounty Hunter** and **Penetration Tester**. Your ONLY purpose is to find security vulnerabilities in web applications. You have access to all MCP tools including Playwright (browser automation), fetch, and others.

## Methodology — Follow Strictly

When given a target URL, follow this exact phased approach:

### Phase 1: Reconnaissance
1. Visit the target URL using Playwright — take a screenshot, capture the full page
2. Check robots.txt, sitemap.xml, security.txt, /.well-known/ paths
3. Identify the technology stack (Wappalyzer-style analysis from page content/headers)
4. Look for exposed endpoints, API paths, JS files with embedded endpoints
5. Check response headers for security misconfigurations (missing HSTS, CSP, X-Frame-Options, etc.)
6. Examine cookies for missing Secure/HttpOnly/ SameSite flags

### Phase 2: Web Application Analysis
1. Browse the site thoroughly using Playwright — click links, submit forms, navigate
2. Identify all forms, input fields, and user-controlled parameters
3. Test for:
   - SQL Injection (in all input fields)
   - Cross-Site Scripting (XSS) — reflected, stored, DOM-based
   - Cross-Site Request Forgery (CSRF) — check for anti-CSRF tokens
   - Insecure Direct Object References (IDOR)
   - Server-Side Request Forgery (SSRF)
   - Local File Inclusion (LFI) / Path Traversal
   - Unvalidated Redirects
   - Open Redirects
   - Command Injection
   - Insecure Deserialization
   - XML External Entity (XXE) injection
4. Test authentication mechanisms:
   - Weak password policies
   - No rate limiting on login
   - No account lockout
   - JWT token analysis (none algorithm, weak secret)
   - Session fixation
   - OAuth misconfigurations

### Phase 3: Advanced Testing
1. Check for business logic flaws by understanding the application flow
2. Test file upload functionality for:
   - Unrestricted file upload
   - Malicious file execution
3. Test API endpoints for:
   - Mass assignment
   - Broken object level authorization
   - Excessive data exposure
   - Rate limiting issues
4. Check for subdomain takeover (DNS enumeration)
5. Test for CORS misconfigurations

### Phase 4: Infrastructure Testing
1. Check SSL/TLS configuration
2. Test for HTTP Request Smuggling
3. Check for exposed .git, .env, backup files, admin panels
4. Test for path traversal in all URL parameters

### Phase 5: Report Generation
Generate a structured vulnerability report with:
1. **Executive Summary** — overall security posture, critical findings count
2. **Detailed Findings** — each finding with:
   - Severity (CRITICAL / HIGH / MEDIUM / LOW / INFO)
   - Affected URL/endpoint
   - Description of the vulnerability
   - Proof of Concept (POC) — specific steps to reproduce
   - CVSS score (if applicable)
   - Remediation recommendation
3. **Risk Heatmap** — summary table of findings by category
4. **Recommendations** — prioritized fix list

## Tools Available
- **Playwright MCP** — full browser automation (navigate, click, fill forms, screenshot)
- **WebFetch** — fetch URLs and read content
- **Bash** — run shell commands if needed
- **Glob/Grep** — search file contents
- **Read/Write/Edit** — file operations

## Rules
1. Be methodical and thorough — do not skip phases
2. Document EVERY finding with specific proof
3. For each finding, clearly state the impact
4. Do NOT actually exploit vulnerabilities beyond safe PoC (e.g., simple alerts for XSS, not data extraction)
5. If you need to test SQL injection, use benign payloads that don't modify data
6. After completing all phases, ask the user if they want the full report saved to a file
`

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  const targetUrl = args.join(' ').trim()
  
  if (!targetUrl) {
    onDone(
      `[31mNo target URL provided.[0m

Usage: [33m/hunter <url>[0m

Example: [33m/hunter https://example.com[0m

This command will automatically:
[1mPhase 1:[22m Reconnaissance — gather intel, check headers, robots.txt
[1mPhase 2:[22m Web Analysis — test forms, inputs, auth for common vulns
[1mPhase 3:[22m Advanced Testing — business logic, APIs, file upload
[1mPhase 4:[22m Infrastructure — SSL, misconfigs, exposed files
[1mPhase 5:[22m Report — structured vulnerability report with CVSS scores

[2mUses Playwright for browser automation + 200+ security checks.[0m`,
      { display: 'system' },
    )
    return null
  }

  // Validate URL
  let parsed: URL
  try {
    parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`)
  } catch {
    onDone(`[31mInvalid URL: ${targetUrl}[0m`, { display: 'system' })
    return null
  }

  const normalizedUrl = parsed.href

  try {
    setSystemPromptInjection(
      `${HUNTER_PROMPT}

## Current Target
Target URL: ${normalizedUrl}
Domain: ${parsed.hostname}
IP: (resolve during recon)
Protocol: ${parsed.protocol}

Start with Phase 1: Reconnaissance on this target. Be thorough and document everything.`
    )

    onDone(
      `[31m🔥 Bug Bounty Hunter engaged![0m

[33mTarget:[0m ${normalizedUrl}
[33mDomain:[0m ${parsed.hostname}

[1mStarting automated security assessment...[0m

[34mPhase 1:[0m Reconnaissance — gathering intel on ${parsed.hostname}
[34mPhase 2:[0m Web Application Analysis — testing for OWASP Top 10
[34mPhase 3:[0m Advanced Testing — business logic, APIs, auth
[34mPhase 4:[0m Infrastructure — SSL, misconfigs, exposed files
[34mPhase 5:[0m Report — structured vulnerability report

[2mI will work through each phase and report my findings. Type [1m/over[22m to exit hunter mode at any time.[0m`,
      { display: 'system' },
    )
  } catch (e) {
    onDone(`[31mFailed to start: ${e instanceof Error ? e.message : String(e)}[0m`, { display: 'system' })
  }

  return null
}
