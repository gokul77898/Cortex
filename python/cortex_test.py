"""
cortex_test.py — HuggingFace-powered Test Generation Engine
Generates tests, analyzes failures, and reports coverage gaps.
"""

import os
import json
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────
# Test framework detection
# ────────────────────────────────────────────────────────────────────

FRAMEWORKS = {
    "vitest": {"config": ["vitest.config.ts", "vitest.config.js"], "cmd": "npx vitest run", "ext": ".test.ts"},
    "jest": {"config": ["jest.config.ts", "jest.config.js", "jest.config.mjs"], "cmd": "npx jest", "ext": ".test.ts"},
    "bun": {"config": [], "cmd": "bun test", "ext": ".test.ts"},
    "mocha": {"config": [".mocharc.yml", ".mocharc.json"], "cmd": "npx mocha", "ext": ".spec.ts"},
    "pytest": {"config": ["pytest.ini", "pyproject.toml", "setup.cfg"], "cmd": "python -m pytest", "ext": "_test.py"},
    "playwright": {"config": ["playwright.config.ts"], "cmd": "npx playwright test", "ext": ".spec.ts"},
    "cypress": {"config": ["cypress.config.ts", "cypress.config.js"], "cmd": "npx cypress run", "ext": ".cy.ts"},
}


def detect_test_framework(cwd: str = ".") -> Dict:
    """Detect the test framework used in the project."""
    root = Path(cwd)
    detected = {"framework": None, "config": None, "cmd": None, "ext": None}

    # Check config files
    for fw, info in FRAMEWORKS.items():
        for cfg in info["config"]:
            if (root / cfg).exists():
                detected["framework"] = fw
                detected["config"] = cfg
                detected["cmd"] = info["cmd"]
                detected["ext"] = info["ext"]
                return detected

    # Check package.json
    pkg_path = root / "package.json"
    if pkg_path.exists():
        try:
            pkg = json.loads(pkg_path.read_text())
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            scripts = pkg.get("scripts", {})

            for fw in ["vitest", "jest", "@jest/core", "mocha", "@playwright/test", "cypress"]:
                if fw in deps:
                    name = fw.replace("@jest/core", "jest").replace("@playwright/test", "playwright")
                    info = FRAMEWORKS.get(name, {})
                    detected["framework"] = name
                    detected["cmd"] = info.get("cmd", f"npx {name}")
                    detected["ext"] = info.get("ext", ".test.ts")
                    return detected

            # Check if using bun test
            test_script = scripts.get("test", "")
            if "bun test" in test_script:
                detected["framework"] = "bun"
                detected["cmd"] = "bun test"
                detected["ext"] = ".test.ts"
                return detected
        except Exception:
            pass

    # Check for Python test framework
    req_path = root / "requirements.txt"
    if req_path.exists():
        try:
            reqs = req_path.read_text().lower()
            if "pytest" in reqs:
                detected["framework"] = "pytest"
                detected["cmd"] = "python -m pytest"
                detected["ext"] = "_test.py"
        except Exception:
            pass

    return detected


def find_test_files(cwd: str = ".") -> List[str]:
    """Find existing test files."""
    root = Path(cwd)
    test_files = []
    patterns = ["**/*.test.ts", "**/*.test.tsx", "**/*.test.js",
                "**/*.spec.ts", "**/*.spec.js", "**/*_test.py", "**/test_*.py"]
    for pattern in patterns:
        for f in root.glob(pattern):
            if "node_modules" not in str(f) and "venv" not in str(f):
                test_files.append(str(f.relative_to(root)))
    return test_files


def find_source_files(cwd: str = ".") -> List[str]:
    """Find source files that could have tests."""
    root = Path(cwd)
    src_files = []
    for ext in ["*.ts", "*.tsx", "*.js", "*.jsx", "*.py"]:
        for f in root.rglob(ext):
            s = str(f)
            if any(skip in s for skip in ["node_modules", "venv", "test", "spec", ".d.ts", "dist"]):
                continue
            src_files.append(str(f.relative_to(root)))
    return src_files[:50]


# ────────────────────────────────────────────────────────────────────
# HuggingFace-powered analysis
# ────────────────────────────────────────────────────────────────────

async def generate_tests(file_path: str, cwd: str = ".") -> Dict:
    """Generate tests for a source file using HF."""
    from hf_provider import hf_chat

    root = Path(cwd)
    target = root / file_path
    if not target.exists():
        return {"error": f"File not found: {file_path}", "tests": None}

    source_code = target.read_text()
    framework = detect_test_framework(cwd)

    system_prompt = f"""You are a test engineering expert. Generate comprehensive tests using {framework.get('framework', 'vitest')}.

Requirements:
- Test all exported functions/classes/components
- Include edge cases: null, undefined, empty, boundary values
- Include error cases: invalid input, network failures
- Use descriptive test names: "should [expected behavior] when [condition]"
- Mock external dependencies (API calls, file system, database)
- Aim for >90% branch coverage
- Group related tests in describe blocks
- Include setup/teardown where needed

Output ONLY the complete test file content, ready to save and run."""

    messages = [
        {"role": "user", "content": f"""Source file: {file_path}
Framework: {framework.get('framework', 'vitest')}

Source code:
```
{source_code[:6000]}
```

Generate comprehensive tests."""}
    ]

    try:
        response = await hf_chat(
            model=os.getenv("HF_MODEL_ID", "Qwen/Qwen2.5-Coder-32B-Instruct"),
            messages=messages,
            system=system_prompt,
            max_tokens=4096,
            temperature=0.3,
        )
        return {
            "tests": response.get("content", ""),
            "framework": framework,
            "source_file": file_path,
        }
    except Exception as e:
        logger.error(f"HF test generation failed: {e}")
        return {"error": str(e), "tests": None}


async def analyze_failures(test_output: str, cwd: str = ".") -> Dict:
    """Analyze test failures and suggest fixes using HF."""
    from hf_provider import hf_chat

    framework = detect_test_framework(cwd)

    system_prompt = """You are a test debugging expert. Analyze test failures and determine:

1. **Root Cause**: Is the bug in the test or the source code?
2. **Failure Category**: assertion, timeout, type error, mock issue, env issue
3. **Fix Recommendation**: Exact code change needed
4. **Confidence**: How sure are you (high/medium/low)

For each failure, provide:
- File and test name
- What failed and why
- Whether to fix the test or the source
- Exact code fix"""

    messages = [
        {"role": "user", "content": f"""Framework: {framework.get('framework', 'unknown')}

Test output:
{test_output[:5000]}

Analyze these test failures."""}
    ]

    try:
        response = await hf_chat(
            model=os.getenv("HF_MODEL_ID", "Qwen/Qwen2.5-Coder-32B-Instruct"),
            messages=messages,
            system=system_prompt,
            max_tokens=4096,
            temperature=0.3,
        )
        return {"analysis": response.get("content", ""), "framework": framework}
    except Exception as e:
        logger.error(f"HF failure analysis failed: {e}")
        return {"error": str(e), "analysis": None}


async def coverage_analysis(cwd: str = ".") -> Dict:
    """Analyze test coverage gaps using HF."""
    from hf_provider import hf_chat

    test_files = find_test_files(cwd)
    src_files = find_source_files(cwd)

    # Find untested files
    test_basenames = set()
    for tf in test_files:
        base = Path(tf).stem.replace(".test", "").replace(".spec", "").replace("_test", "").replace("test_", "")
        test_basenames.add(base)

    untested = []
    for sf in src_files:
        base = Path(sf).stem
        if base not in test_basenames and base != "index":
            untested.append(sf)

    system_prompt = """You are a test coverage expert. Analyze the project and provide:

1. **Coverage Summary**: X of Y source files have tests
2. **Critical Gaps**: Files that MUST have tests (auth, payments, data handling)
3. **Priority List**: Ordered by risk (highest risk untested files first)
4. **Quick Wins**: Files that are easy to test
5. **Recommendations**: Testing strategy improvements"""

    messages = [
        {"role": "user", "content": f"""Test files ({len(test_files)}):
{chr(10).join(test_files[:20])}

Source files ({len(src_files)}):
{chr(10).join(src_files[:30])}

Untested files ({len(untested)}):
{chr(10).join(untested[:20])}

Analyze test coverage gaps."""}
    ]

    try:
        response = await hf_chat(
            model=os.getenv("HF_MODEL_ID", "Qwen/Qwen2.5-Coder-32B-Instruct"),
            messages=messages,
            system=system_prompt,
            max_tokens=4096,
            temperature=0.3,
        )
        return {
            "analysis": response.get("content", ""),
            "total_src": len(src_files),
            "total_tests": len(test_files),
            "untested_count": len(untested),
            "untested_files": untested[:20],
        }
    except Exception as e:
        logger.error(f"HF coverage analysis failed: {e}")
        return {"error": str(e), "analysis": None}


# ────────────────────────────────────────────────────────────────────
# CLI entry point
# ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import asyncio
    import sys

    action = sys.argv[1] if len(sys.argv) > 1 else "detect"
    cwd = sys.argv[2] if len(sys.argv) > 2 else "."

    async def main():
        if action == "detect":
            fw = detect_test_framework(cwd)
            print(json.dumps(fw, indent=2))
        elif action == "generate":
            file_path = sys.argv[3] if len(sys.argv) > 3 else ""
            if not file_path:
                print("Usage: python cortex_test.py generate [cwd] [file_path]")
                return
            result = await generate_tests(file_path, cwd)
            print(result.get("tests", result.get("error", "No result")))
        elif action == "coverage":
            result = await coverage_analysis(cwd)
            print(result.get("analysis", result.get("error", "No result")))
        else:
            print("Usage: python cortex_test.py [detect|generate|coverage] [cwd] [file]")

    asyncio.run(main())
