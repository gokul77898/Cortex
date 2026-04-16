"""
cortex_git.py — HuggingFace-powered Git Analysis Engine
Provides smart commit message generation, PR review, and changelog generation.
"""

import os
import json
import subprocess
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────
# Git helpers
# ────────────────────────────────────────────────────────────────────

def run_git(args: List[str], cwd: str = ".") -> str:
    """Run a git command and return stdout."""
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True, text=True, timeout=30, cwd=cwd
        )
        return result.stdout.strip()
    except Exception as e:
        logger.warning(f"git {' '.join(args)} failed: {e}")
        return ""


def get_staged_diff(cwd: str = ".") -> str:
    return run_git(["diff", "--cached"], cwd)


def get_unstaged_diff(cwd: str = ".") -> str:
    return run_git(["diff"], cwd)


def get_status(cwd: str = ".") -> str:
    return run_git(["status", "--porcelain"], cwd)


def get_branch(cwd: str = ".") -> str:
    return run_git(["branch", "--show-current"], cwd)


def get_recent_commits(n: int = 10, cwd: str = ".") -> str:
    return run_git(["log", f"--oneline", f"-{n}"], cwd)


def get_diff_between(base: str, head: str = "HEAD", cwd: str = ".") -> str:
    return run_git(["diff", f"{base}...{head}"], cwd)


# ────────────────────────────────────────────────────────────────────
# HuggingFace-powered analysis
# ────────────────────────────────────────────────────────────────────

async def generate_commit_message(cwd: str = ".") -> Dict:
    """Generate a smart conventional commit message using HF."""
    from hf_provider import hf_chat

    diff = get_staged_diff(cwd) or get_unstaged_diff(cwd)
    status = get_status(cwd)
    branch = get_branch(cwd)
    recent = get_recent_commits(5, cwd)

    if not diff and not status:
        return {"error": "No changes detected", "message": None}

    system_prompt = """You are a git commit message expert. Generate a conventional commit message.

Rules:
- Use format: type(scope): description
- Types: feat, fix, refactor, docs, style, test, chore, perf, ci, build
- Scope should be the most affected module/directory
- Description should be imperative mood, lowercase, no period
- Add body if changes are complex (separated by blank line)
- Add BREAKING CHANGE footer if applicable

Output JSON:
{"type": "feat", "scope": "auth", "description": "add OAuth2 login flow", "body": "optional longer description", "breaking": false}"""

    messages = [
        {"role": "user", "content": f"""Branch: {branch}

Status:
{status}

Diff (truncated to 3000 chars):
{diff[:3000]}

Recent commits for style reference:
{recent}

Generate a commit message."""}
    ]

    try:
        response = await hf_chat(
            model=os.getenv("HF_MODEL_ID", "Qwen/Qwen2.5-Coder-32B-Instruct"),
            messages=messages,
            system=system_prompt,
            max_tokens=500,
            temperature=0.3,
        )
        content = response.get("content", "")
        # Try to parse JSON from response
        try:
            # Find JSON in response
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                parsed = json.loads(content[start:end])
                scope = f"({parsed['scope']})" if parsed.get("scope") else ""
                msg = f"{parsed['type']}{scope}: {parsed['description']}"
                if parsed.get("body"):
                    msg += f"\n\n{parsed['body']}"
                if parsed.get("breaking"):
                    msg += "\n\nBREAKING CHANGE: see description"
                return {"message": msg, "parsed": parsed}
        except json.JSONDecodeError:
            pass
        return {"message": content.strip(), "parsed": None}
    except Exception as e:
        logger.error(f"HF commit generation failed: {e}")
        return {"error": str(e), "message": None}


async def review_pull_request(base: str = "main", head: str = "HEAD", cwd: str = ".") -> Dict:
    """Review a PR diff using HuggingFace."""
    from hf_provider import hf_chat

    diff = get_diff_between(base, head, cwd)
    if not diff:
        return {"error": "No diff found between branches", "review": None}

    system_prompt = """You are a senior code reviewer. Analyze the PR diff and provide:

1. **Summary**: What the PR does (2-3 sentences)
2. **Risk Assessment**: Low / Medium / High with reasoning
3. **Issues Found**: List with severity (critical/warning/info)
   - For each: file, line range, description, suggestion
4. **Security Concerns**: Any potential vulnerabilities
5. **Performance Impact**: Any performance implications
6. **Test Coverage**: Are changes adequately tested?
7. **Approval Recommendation**: APPROVE / REQUEST_CHANGES / COMMENT

Be specific with line references and code suggestions."""

    messages = [
        {"role": "user", "content": f"""PR Diff ({base}...{head}):

{diff[:8000]}

Please review this pull request."""}
    ]

    try:
        response = await hf_chat(
            model=os.getenv("HF_MODEL_ID", "Qwen/Qwen2.5-Coder-32B-Instruct"),
            messages=messages,
            system=system_prompt,
            max_tokens=4096,
            temperature=0.3,
        )
        return {"review": response.get("content", ""), "diff_size": len(diff)}
    except Exception as e:
        logger.error(f"HF PR review failed: {e}")
        return {"error": str(e), "review": None}


async def generate_changelog(since_tag: str = "", cwd: str = ".") -> Dict:
    """Generate a changelog from recent commits using HF."""
    from hf_provider import hf_chat

    if since_tag:
        commits = run_git(["log", f"{since_tag}..HEAD", "--oneline"], cwd)
    else:
        commits = get_recent_commits(50, cwd)

    if not commits:
        return {"error": "No commits found", "changelog": None}

    system_prompt = """Generate a structured changelog from these git commits.

Format:
## [Version] - Date

### Added
- New features

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Security
- Security patches

Group commits intelligently. Skip merge commits and trivial changes."""

    messages = [
        {"role": "user", "content": f"Commits:\n{commits}\n\nGenerate a changelog."}
    ]

    try:
        response = await hf_chat(
            model=os.getenv("HF_MODEL_ID", "Qwen/Qwen2.5-Coder-32B-Instruct"),
            messages=messages,
            system=system_prompt,
            max_tokens=2048,
            temperature=0.3,
        )
        return {"changelog": response.get("content", "")}
    except Exception as e:
        logger.error(f"HF changelog generation failed: {e}")
        return {"error": str(e), "changelog": None}


# ────────────────────────────────────────────────────────────────────
# CLI entry point
# ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import asyncio
    import sys

    action = sys.argv[1] if len(sys.argv) > 1 else "commit"
    cwd = sys.argv[2] if len(sys.argv) > 2 else "."

    async def main():
        if action == "commit":
            result = await generate_commit_message(cwd)
            print(json.dumps(result, indent=2))
        elif action == "review":
            base = sys.argv[3] if len(sys.argv) > 3 else "main"
            result = await review_pull_request(base, "HEAD", cwd)
            print(result.get("review", result.get("error", "No result")))
        elif action == "changelog":
            tag = sys.argv[3] if len(sys.argv) > 3 else ""
            result = await generate_changelog(tag, cwd)
            print(result.get("changelog", result.get("error", "No result")))
        else:
            print(f"Usage: python cortex_git.py [commit|review|changelog] [cwd] [base/tag]")

    asyncio.run(main())
