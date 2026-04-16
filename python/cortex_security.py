"""
cortex_security.py — HuggingFace-powered Security Scanner
Detects secrets, audits dependencies, analyzes code vulnerabilities, checks compliance.
"""

import os
import re
import json
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────
# Secret patterns
# ────────────────────────────────────────────────────────────────────

SECRET_PATTERNS = {
    "AWS Access Key": r"AKIA[0-9A-Z]{16}",
    "AWS Secret Key": r"(?i)aws_secret_access_key\s*[=:]\s*['\"]?([A-Za-z0-9/+=]{40})",
    "GitHub Token": r"gh[ps]_[A-Za-z0-9_]{36,}",
    "GitHub OAuth": r"gho_[A-Za-z0-9_]{36,}",
    "GitLab Token": r"glpat-[A-Za-z0-9_\-]{20,}",
    "OpenAI API Key": r"sk-[A-Za-z0-9]{20,}",
    "Stripe Secret Key": r"sk_(test|live)_[A-Za-z0-9]{20,}",
    "Stripe Publishable": r"pk_(test|live)_[A-Za-z0-9]{20,}",
    "Slack Token": r"xox[bpors]-[A-Za-z0-9\-]+",
    "Slack Webhook": r"https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]+",
    "Discord Token": r"[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}",
    "Twilio": r"SK[0-9a-fA-F]{32}",
    "SendGrid": r"SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}",
    "Private Key": r"-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----",
    "JWT": r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+",
    "Database URL": r"(?:postgres|mysql|mongodb|redis)(?:ql)?:\/\/[^\s'\"]+:[^\s'\"]+@",
    "Generic Secret": r"(?i)(secret|password|passwd|pwd|token|api_key|apikey|auth)\s*[=:]\s*['\"][A-Za-z0-9+/=_\-]{16,}['\"]",
    "Google API Key": r"AIza[0-9A-Za-z_\-]{35}",
    "Heroku API Key": r"(?i)heroku.*[=:]\s*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
}

PLACEHOLDER_PATTERNS = re.compile(
    r"example|placeholder|your[-_]|xxx|test|fake|dummy|changeme|TODO|REPLACE|sample|template",
    re.IGNORECASE,
)

# Files to skip
SKIP_EXTENSIONS = {".lock", ".map", ".min.js", ".min.css", ".woff", ".woff2", ".ttf", ".ico", ".png", ".jpg", ".gif"}
SKIP_DIRS = {"node_modules", "venv", ".venv", "__pycache__", ".git", "dist", "build", ".next", "coverage"}


# ────────────────────────────────────────────────────────────────────
# Local scanning (no AI needed)
# ────────────────────────────────────────────────────────────────────

def scan_secrets(cwd: str = ".") -> Dict:
    """Scan for hardcoded secrets locally (no AI)."""
    root = Path(cwd)
    findings = []

    for f in root.rglob("*"):
        if f.is_dir():
            continue
        if any(skip in f.parts for skip in SKIP_DIRS):
            continue
        if f.suffix in SKIP_EXTENSIONS:
            continue
        if f.stat().st_size > 500_000:  # Skip files > 500KB
            continue

        try:
            content = f.read_text(errors="ignore")
        except Exception:
            continue

        rel_path = str(f.relative_to(root))
        for name, pattern in SECRET_PATTERNS.items():
            for match in re.finditer(pattern, content):
                matched_text = match.group(0)[:50]
                # Skip placeholders
                if PLACEHOLDER_PATTERNS.search(matched_text):
                    continue
                line_num = content[:match.start()].count("\n") + 1
                findings.append({
                    "type": name,
                    "file": rel_path,
                    "line": line_num,
                    "preview": matched_text[:30] + "..." if len(matched_text) > 30 else matched_text,
                    "severity": "critical" if "private key" in name.lower() or "database url" in name.lower() else "high",
                })

    # Check .gitignore
    gitignore_path = root / ".gitignore"
    env_in_gitignore = False
    if gitignore_path.exists():
        content = gitignore_path.read_text()
        env_in_gitignore = ".env" in content

    if not env_in_gitignore and (root / ".env").exists():
        findings.append({
            "type": "Config Issue",
            "file": ".gitignore",
            "line": 0,
            "preview": ".env not in .gitignore!",
            "severity": "critical",
        })

    # Check if .env is tracked
    try:
        tracked = subprocess.run(
            ["git", "ls-files", ".env", ".env.local", ".env.production"],
            capture_output=True, text=True, cwd=cwd, timeout=5,
        ).stdout.strip()
        if tracked:
            for f in tracked.split("\n"):
                findings.append({
                    "type": "Git Tracked Secret",
                    "file": f,
                    "line": 0,
                    "preview": f"SECRET FILE TRACKED BY GIT: {f}",
                    "severity": "critical",
                })
    except Exception:
        pass

    return {
        "findings": findings,
        "total": len(findings),
        "critical": len([f for f in findings if f["severity"] == "critical"]),
        "high": len([f for f in findings if f["severity"] == "high"]),
    }


def audit_dependencies(cwd: str = ".") -> Dict:
    """Run dependency audit."""
    root = Path(cwd)
    results = {"npm": None, "pip": None}

    # npm audit
    if (root / "package.json").exists():
        try:
            output = subprocess.run(
                ["npm", "audit", "--json"],
                capture_output=True, text=True, cwd=cwd, timeout=30,
            ).stdout
            audit = json.loads(output)
            vulns = audit.get("vulnerabilities", {})
            results["npm"] = {
                "total": len(vulns),
                "critical": len([v for v in vulns.values() if v.get("severity") == "critical"]),
                "high": len([v for v in vulns.values() if v.get("severity") == "high"]),
                "moderate": len([v for v in vulns.values() if v.get("severity") == "moderate"]),
                "low": len([v for v in vulns.values() if v.get("severity") == "low"]),
            }
        except Exception as e:
            results["npm"] = {"error": str(e)}

    # pip audit (if available)
    if (root / "requirements.txt").exists():
        try:
            output = subprocess.run(
                ["pip", "audit", "--format=json"],
                capture_output=True, text=True, cwd=cwd, timeout=30,
            ).stdout
            results["pip"] = json.loads(output) if output.strip() else {"note": "pip-audit not installed"}
        except Exception:
            results["pip"] = {"note": "pip-audit not available"}

    return results


def check_env_security(cwd: str = ".") -> Dict:
    """Check .env file security."""
    root = Path(cwd)
    issues = []

    env_files = [".env", ".env.local", ".env.development", ".env.production", ".env.staging"]
    for env_name in env_files:
        env_path = root / env_name
        if not env_path.exists():
            continue

        try:
            content = env_path.read_text()
            lines = content.split("\n")
            for i, line in enumerate(lines, 1):
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip().strip("'\"")

                    # Check for empty values
                    if not value:
                        issues.append({"file": env_name, "line": i, "issue": f"{key} is empty", "severity": "info"})

                    # Check for default/weak values
                    if value.lower() in ["password", "admin", "root", "test", "123456", "secret"]:
                        issues.append({"file": env_name, "line": i, "issue": f"{key} has weak default value", "severity": "high"})

                    # Check for production URLs in dev
                    if "development" in env_name and any(prod in value for prod in ["production", "prod.", "live."]):
                        issues.append({"file": env_name, "line": i, "issue": f"{key} points to production in dev config", "severity": "warning"})
        except Exception:
            pass

    return {"issues": issues, "total": len(issues)}


# ────────────────────────────────────────────────────────────────────
# HuggingFace-powered deep analysis
# ────────────────────────────────────────────────────────────────────

async def ai_code_analysis(cwd: str = ".") -> Dict:
    """Deep security analysis using HF."""
    from hf_provider import hf_chat

    root = Path(cwd)
    # Gather code samples from key files
    code_samples = []
    priority_patterns = ["**/auth*", "**/login*", "**/api/*", "**/middleware*",
                        "**/routes/*", "**/handlers/*", "**/controllers/*"]

    for pattern in priority_patterns:
        for f in root.glob(pattern):
            if any(skip in str(f) for skip in SKIP_DIRS):
                continue
            if f.is_file() and f.suffix in [".ts", ".js", ".py", ".tsx", ".jsx"]:
                try:
                    content = f.read_text()
                    code_samples.append(f"// {f.relative_to(root)}\n{content[:2000]}")
                except Exception:
                    pass
            if len(code_samples) >= 8:
                break

    if not code_samples:
        return {"error": "No relevant source files found for security analysis", "analysis": None}

    system_prompt = """You are a senior security engineer. Analyze this code for vulnerabilities:

Check for:
1. **SQL Injection**: Unsanitized inputs in queries
2. **XSS**: Unescaped user input in HTML/templates
3. **Auth Bypass**: Missing auth checks, weak session handling
4. **IDOR**: Direct object references without ownership checks
5. **SSRF**: User-controlled URLs in server requests
6. **Path Traversal**: User input in file paths
7. **Insecure Deserialization**: Unsafe JSON/YAML parsing
8. **Missing Rate Limiting**: Unprotected endpoints
9. **Information Disclosure**: Verbose errors, debug endpoints

For each finding:
- Severity: Critical / High / Medium / Low
- File and approximate line
- Description of vulnerability
- Exploit scenario
- Fix with code example"""

    combined = "\n\n---\n\n".join(code_samples[:5])
    messages = [
        {"role": "user", "content": f"Analyze this code for security vulnerabilities:\n\n{combined}"}
    ]

    try:
        response = await hf_chat(
            model=os.getenv("HF_MODEL_ID", "Qwen/Qwen2.5-Coder-32B-Instruct"),
            messages=messages,
            system=system_prompt,
            max_tokens=4096,
            temperature=0.2,
        )
        return {"analysis": response.get("content", ""), "files_analyzed": len(code_samples)}
    except Exception as e:
        logger.error(f"HF security analysis failed: {e}")
        return {"error": str(e), "analysis": None}


async def full_audit(cwd: str = ".") -> Dict:
    """Run complete security audit: secrets + deps + env + AI analysis."""
    secrets = scan_secrets(cwd)
    deps = audit_dependencies(cwd)
    env = check_env_security(cwd)
    ai = await ai_code_analysis(cwd)

    total_issues = secrets["total"] + env["total"]
    if deps.get("npm") and isinstance(deps["npm"], dict):
        total_issues += deps["npm"].get("total", 0)

    return {
        "secrets": secrets,
        "dependencies": deps,
        "env_security": env,
        "ai_analysis": ai.get("analysis", ai.get("error")),
        "total_issues": total_issues,
        "verdict": "CRITICAL" if secrets["critical"] > 0 else "WARNING" if total_issues > 0 else "PASS",
    }


# ────────────────────────────────────────────────────────────────────
# CLI entry point
# ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import asyncio
    import sys

    action = sys.argv[1] if len(sys.argv) > 1 else "full"
    cwd = sys.argv[2] if len(sys.argv) > 2 else "."

    async def main():
        if action == "secrets":
            result = scan_secrets(cwd)
            print(json.dumps(result, indent=2))
        elif action == "deps":
            result = audit_dependencies(cwd)
            print(json.dumps(result, indent=2))
        elif action == "env":
            result = check_env_security(cwd)
            print(json.dumps(result, indent=2))
        elif action == "ai":
            result = await ai_code_analysis(cwd)
            print(result.get("analysis", result.get("error", "No result")))
        elif action == "full":
            result = await full_audit(cwd)
            print(f"\n{'='*60}")
            print(f"  SECURITY AUDIT — Verdict: {result['verdict']}")
            print(f"  Total issues: {result['total_issues']}")
            print(f"{'='*60}")
            print(f"\nSecrets: {result['secrets']['total']} ({result['secrets']['critical']} critical)")
            print(f"Env issues: {result['env_security']['total']}")
            if result['dependencies'].get('npm') and isinstance(result['dependencies']['npm'], dict):
                npm = result['dependencies']['npm']
                print(f"npm vulns: {npm.get('total', 'N/A')} ({npm.get('critical', 0)} critical)")
            if result.get('ai_analysis'):
                print(f"\n--- AI Analysis ---\n{result['ai_analysis']}")
        else:
            print("Usage: python cortex_security.py [full|secrets|deps|env|ai] [cwd]")

    asyncio.run(main())
