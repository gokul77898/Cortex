# Security Policy

## Reporting a Vulnerability

If you find a security vulnerability in CORTEX, please DO NOT file a public GitHub issue. Instead, send a private report.

Contact: [GitHub Issues](https://github.com/gokul77898/Cortex/issues) (mark as confidential)

## What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Scope

The following are in scope:
- API key leakage
- Remote code execution
- Unauthorized file access
- Prompt injection that leads to security breaches

Out of scope:
- Model hallucination / incorrect code generation
- Provider API rate limiting
- Missing features

## Security Measures

CORTEX is designed with these security properties:
- **Zero telemetry** — 21 telemetry modules stubbed at build time
- **No browser auto-opens** — All auto-launches to localhost are opt-in
- **Secrets stay local** — `.env` is gitignored, never committed
- **No vendor lock-in** — All providers are swappable
- **Offline-capable** — Full Ollama fallback works without internet

## API Key Safety

- Keys are stored in `~/.cortex.json` (provider profiles) or `~/.local/share/opencode/auth.json`
- Never commit `.env` files
- Use environment variables or a secrets manager for production
- Rotate keys if they've been exposed

## Dependencies

We regularly update dependencies via `bun update`. Critical vulnerabilities are patched within 7 days.
