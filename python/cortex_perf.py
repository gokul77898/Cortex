"""
cortex_perf.py — HuggingFace-powered Performance Analyzer
Analyzes dependencies, anti-patterns, build config, memory leaks, and provides AI insights.
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
# Heavy dependency detection
# ────────────────────────────────────────────────────────────────────

HEAVY_PACKAGES = {
    "moment": {"size": "300KB", "alt": "dayjs (2KB) or date-fns (tree-shakeable)"},
    "lodash": {"size": "530KB", "alt": "lodash-es (tree-shakeable) or native JS"},
    "underscore": {"size": "60KB", "alt": "native JS methods"},
    "jquery": {"size": "87KB", "alt": "native DOM APIs"},
    "request": {"size": "deprecated", "alt": "native fetch or undici"},
    "node-fetch": {"size": "unnecessary", "alt": "native fetch (Node 18+)"},
    "axios": {"size": "50KB", "alt": "native fetch or ky (3KB)"},
    "uuid": {"size": "10KB", "alt": "crypto.randomUUID() (native)"},
    "aws-sdk": {"size": "40MB", "alt": "@aws-sdk/client-* v3 (modular)"},
    "bluebird": {"size": "80KB", "alt": "native Promise"},
    "chalk": {"size": "30KB+", "alt": "picocolors (3KB)"},
    "express-validator": {"size": "150KB", "alt": "zod (13KB) or valibot (5KB)"},
    "body-parser": {"size": "unnecessary", "alt": "express.json() (built-in since 4.16)"},
    "cors": {"size": "10KB", "alt": "manual headers (3 lines)"},
    "dotenv": {"size": "15KB", "alt": "native --env-file flag (Node 20.6+)"},
    "rimraf": {"size": "25KB", "alt": "fs.rm({recursive: true}) (Node 14+)"},
    "mkdirp": {"size": "15KB", "alt": "fs.mkdir({recursive: true}) (native)"},
    "glob": {"size": "80KB", "alt": "fs.glob() (Node 22+) or fast-glob"},
}

# Anti-patterns to detect
ANTI_PATTERNS = {
    "sync_fs": {
        "pattern": r"\b(readFileSync|writeFileSync|existsSync|mkdirSync|readdirSync)\b",
        "severity": "warning",
        "message": "Synchronous FS operation blocks event loop",
        "fix": "Use async/await fs.promises equivalent",
    },
    "console_log": {
        "pattern": r"\bconsole\.(log|debug|info)\b",
        "severity": "info",
        "message": "Console output in production code",
        "fix": "Use a proper logger (pino, winston) or remove",
    },
    "json_parse_unsafe": {
        "pattern": r"JSON\.parse\([^)]*\)\s*(?!.*catch)",
        "severity": "warning",
        "message": "Unsafe JSON.parse without try-catch",
        "fix": "Wrap in try-catch or use a safe parser",
    },
    "nested_await_loop": {
        "pattern": r"for\s*\(.*\)\s*\{[^}]*await\b",
        "severity": "high",
        "message": "Await inside loop — sequential instead of parallel",
        "fix": "Use Promise.all() or Promise.allSettled()",
    },
    "any_type": {
        "pattern": r":\s*any\b",
        "severity": "info",
        "message": "Using 'any' type defeats TypeScript safety",
        "fix": "Use proper types or 'unknown' with type guards",
    },
    "eval_usage": {
        "pattern": r"\beval\s*\(",
        "severity": "critical",
        "message": "eval() is a security and performance risk",
        "fix": "Use safer alternatives like JSON.parse or Function constructor",
    },
    "memory_leak_listener": {
        "pattern": r"\.addEventListener\([^)]+\)(?!.*removeEventListener)",
        "severity": "warning",
        "message": "Event listener without cleanup — potential memory leak",
        "fix": "Add removeEventListener in cleanup/unmount",
    },
    "unbounded_array": {
        "pattern": r"\.\s*push\s*\([^)]*\)\s*(?!.*splice|.*shift|.*length\s*[<>])",
        "severity": "info",
        "message": "Array push without bounds — potential memory growth",
        "fix": "Add max size check or use bounded data structure",
    },
}


# ────────────────────────────────────────────────────────────────────
# Local analysis (no AI needed)
# ────────────────────────────────────────────────────────────────────

def analyze_dependencies(cwd: str = ".") -> Dict:
    """Analyze package.json for heavy/deprecated dependencies."""
    root = Path(cwd)
    pkg_path = root / "package.json"
    if not pkg_path.exists():
        return {"error": "No package.json found", "issues": []}

    try:
        pkg = json.loads(pkg_path.read_text())
        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    except Exception as e:
        return {"error": str(e), "issues": []}

    issues = []
    for pkg_name, info in HEAVY_PACKAGES.items():
        if pkg_name in deps:
            issues.append({
                "package": pkg_name,
                "version": deps[pkg_name],
                "size": info["size"],
                "alternative": info["alt"],
                "severity": "warning",
            })

    # Check for duplicate-ish packages
    dep_names = list(deps.keys())
    duplicates = []
    check_pairs = [
        ("lodash", "lodash-es"), ("moment", "dayjs"), ("moment", "date-fns"),
        ("axios", "node-fetch"), ("axios", "undici"), ("express", "fastify"),
    ]
    for a, b in check_pairs:
        if a in dep_names and b in dep_names:
            duplicates.append(f"Both {a} and {b} installed")

    return {
        "total_deps": len(deps),
        "heavy_deps": issues,
        "duplicates": duplicates,
        "prod_deps": len(pkg.get("dependencies", {})),
        "dev_deps": len(pkg.get("devDependencies", {})),
    }


def scan_anti_patterns(cwd: str = ".") -> Dict:
    """Scan source files for performance anti-patterns."""
    root = Path(cwd)
    findings = []
    skip_dirs = {"node_modules", "venv", ".venv", "dist", "build", ".next", "coverage", ".git"}

    for ext in ["*.ts", "*.tsx", "*.js", "*.jsx"]:
        for f in root.rglob(ext):
            if any(skip in f.parts for skip in skip_dirs):
                continue
            if ".test." in f.name or ".spec." in f.name or ".d.ts" in f.name:
                continue

            try:
                content = f.read_text(errors="ignore")
            except Exception:
                continue

            rel_path = str(f.relative_to(root))
            for name, info in ANTI_PATTERNS.items():
                matches = list(re.finditer(info["pattern"], content))
                if matches:
                    findings.append({
                        "pattern": name,
                        "file": rel_path,
                        "count": len(matches),
                        "severity": info["severity"],
                        "message": info["message"],
                        "fix": info["fix"],
                        "first_line": content[:matches[0].start()].count("\n") + 1,
                    })

    # Sort by severity
    severity_order = {"critical": 0, "high": 1, "warning": 2, "info": 3}
    findings.sort(key=lambda x: severity_order.get(x["severity"], 99))

    return {
        "findings": findings,
        "total": len(findings),
        "by_severity": {
            "critical": len([f for f in findings if f["severity"] == "critical"]),
            "high": len([f for f in findings if f["severity"] == "high"]),
            "warning": len([f for f in findings if f["severity"] == "warning"]),
            "info": len([f for f in findings if f["severity"] == "info"]),
        },
    }


def check_build_config(cwd: str = ".") -> Dict:
    """Check build/bundler configuration for optimization issues."""
    root = Path(cwd)
    issues = []

    # Check tsconfig
    tsconfig = root / "tsconfig.json"
    if tsconfig.exists():
        try:
            content = tsconfig.read_text()
            if '"sourceMap": true' in content:
                issues.append({"config": "tsconfig.json", "issue": "Source maps enabled (disable in production)", "severity": "info"})
            if '"strict": false' not in content and '"strict"' not in content:
                issues.append({"config": "tsconfig.json", "issue": "strict mode not enabled", "severity": "warning"})
        except Exception:
            pass

    # Check for missing .gitignore entries
    gitignore = root / ".gitignore"
    if gitignore.exists():
        try:
            content = gitignore.read_text()
            should_ignore = ["dist/", "build/", ".next/", "coverage/", "*.map"]
            for entry in should_ignore:
                if entry not in content:
                    issues.append({"config": ".gitignore", "issue": f"Missing: {entry}", "severity": "info"})
        except Exception:
            pass

    return {"issues": issues, "total": len(issues)}


def detect_memory_leaks(cwd: str = ".") -> Dict:
    """Detect potential memory leak patterns."""
    root = Path(cwd)
    findings = []
    skip_dirs = {"node_modules", "venv", "dist", "build", ".git"}

    leak_patterns = {
        "setInterval without clear": r"setInterval\s*\([^)]+\)(?!.*clearInterval)",
        "setTimeout in loop": r"(?:for|while)\s*\([^)]*\)\s*\{[^}]*setTimeout",
        "addEventListener without remove": r"addEventListener\s*\([^)]+\)(?![\s\S]{0,200}removeEventListener)",
        "Growing global array": r"(?:let|var)\s+\w+\s*=\s*\[\][\s\S]{0,500}\.push\(",
        "Unclosed stream/connection": r"create(?:Read|Write)Stream\s*\([^)]+\)(?![\s\S]{0,300}\.(?:close|destroy|end)\()",
    }

    for ext in ["*.ts", "*.tsx", "*.js", "*.jsx"]:
        for f in root.rglob(ext):
            if any(skip in f.parts for skip in skip_dirs):
                continue

            try:
                content = f.read_text(errors="ignore")
            except Exception:
                continue

            rel_path = str(f.relative_to(root))
            for name, pattern in leak_patterns.items():
                if re.search(pattern, content):
                    findings.append({
                        "type": name,
                        "file": rel_path,
                        "severity": "warning",
                    })

    return {"findings": findings, "total": len(findings)}


# ────────────────────────────────────────────────────────────────────
# HuggingFace-powered deep analysis
# ────────────────────────────────────────────────────────────────────

async def ai_deep_analysis(cwd: str = ".") -> Dict:
    """AI-powered deep performance analysis using HF."""
    from hf_provider import hf_chat

    deps = analyze_dependencies(cwd)
    patterns = scan_anti_patterns(cwd)
    build = check_build_config(cwd)
    leaks = detect_memory_leaks(cwd)

    system_prompt = """You are a performance engineering expert. Based on the scan results, provide:

1. **Executive Summary**: Overall performance health (score 1-10)
2. **Critical Issues**: Must-fix issues that impact users
3. **Quick Wins**: Easy fixes with high impact
4. **Bundle Optimization**: How to reduce bundle size
5. **Runtime Performance**: Event loop, memory, CPU optimizations
6. **Architecture Suggestions**: Caching, lazy loading, code splitting
7. **Action Plan**: Prioritized list of changes

Be specific with file names, package names, and code suggestions."""

    context = json.dumps({
        "dependencies": {"total": deps.get("total_deps"), "heavy": deps.get("heavy_deps", [])[:5], "duplicates": deps.get("duplicates", [])},
        "anti_patterns": {"total": patterns["total"], "by_severity": patterns["by_severity"], "top_5": patterns["findings"][:5]},
        "build_issues": build["issues"][:5],
        "memory_leaks": leaks["findings"][:5],
    }, indent=2)

    messages = [
        {"role": "user", "content": f"Performance scan results:\n{context}\n\nProvide a comprehensive analysis and action plan."}
    ]

    try:
        response = await hf_chat(
            model=os.getenv("HF_MODEL_ID", "Qwen/Qwen2.5-Coder-32B-Instruct"),
            messages=messages,
            system=system_prompt,
            max_tokens=4096,
            temperature=0.3,
        )
        return {"analysis": response.get("content", "")}
    except Exception as e:
        logger.error(f"HF perf analysis failed: {e}")
        return {"error": str(e), "analysis": None}


async def full_analysis(cwd: str = ".") -> Dict:
    """Run complete performance analysis."""
    deps = analyze_dependencies(cwd)
    patterns = scan_anti_patterns(cwd)
    build = check_build_config(cwd)
    leaks = detect_memory_leaks(cwd)
    ai = await ai_deep_analysis(cwd)

    return {
        "dependencies": deps,
        "anti_patterns": patterns,
        "build_config": build,
        "memory_leaks": leaks,
        "ai_analysis": ai.get("analysis", ai.get("error")),
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
        if action == "deps":
            result = analyze_dependencies(cwd)
            print(json.dumps(result, indent=2))
        elif action == "patterns":
            result = scan_anti_patterns(cwd)
            print(json.dumps(result, indent=2))
        elif action == "build":
            result = check_build_config(cwd)
            print(json.dumps(result, indent=2))
        elif action == "leaks":
            result = detect_memory_leaks(cwd)
            print(json.dumps(result, indent=2))
        elif action == "full":
            result = await full_analysis(cwd)
            print(f"\n{'='*60}")
            print(f"  PERFORMANCE ANALYSIS")
            print(f"{'='*60}")
            print(f"\nDependencies: {result['dependencies'].get('total_deps', 'N/A')} total, {len(result['dependencies'].get('heavy_deps', []))} heavy")
            print(f"Anti-patterns: {result['anti_patterns']['total']} found")
            print(f"Build issues: {result['build_config']['total']}")
            print(f"Memory leaks: {result['memory_leaks']['total']} potential")
            if result.get("ai_analysis"):
                print(f"\n--- AI Analysis ---\n{result['ai_analysis']}")
        else:
            print("Usage: python cortex_perf.py [full|deps|patterns|build|leaks] [cwd]")

    asyncio.run(main())
