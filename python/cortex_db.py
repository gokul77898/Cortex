"""
cortex_db.py — HuggingFace-powered Database Analyzer
Provides schema analysis, query optimization, and migration generation.
"""

import os
import json
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────
# Database stack detection
# ────────────────────────────────────────────────────────────────────

DB_INDICATORS = {
    "prisma": ["prisma/schema.prisma", "node_modules/.prisma"],
    "drizzle": ["drizzle.config.ts", "drizzle.config.js"],
    "typeorm": ["ormconfig.json", "ormconfig.ts", "ormconfig.js"],
    "sequelize": [".sequelizerc", "config/config.json"],
    "knex": ["knexfile.js", "knexfile.ts"],
    "mongoose": [],  # detected via package.json
    "sqlalchemy": ["alembic.ini", "alembic/"],
    "django": ["manage.py"],
    "postgresql": [],
    "mysql": [],
    "sqlite": [],
    "mongodb": [],
}


def detect_db_stack(cwd: str = ".") -> Dict:
    """Detect the database stack used in the project."""
    root = Path(cwd)
    detected = {"orm": None, "database": None, "files": []}

    # Check file indicators
    for orm, indicators in DB_INDICATORS.items():
        for indicator in indicators:
            path = root / indicator
            if path.exists():
                detected["orm"] = orm
                detected["files"].append(str(path))
                break

    # Check package.json
    pkg_path = root / "package.json"
    if pkg_path.exists():
        try:
            pkg = json.loads(pkg_path.read_text())
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            for orm in ["prisma", "drizzle-orm", "typeorm", "sequelize", "knex", "mongoose"]:
                if orm in deps or f"@{orm}" in str(deps):
                    detected["orm"] = orm.replace("-orm", "")
            for db in ["pg", "mysql2", "sqlite3", "better-sqlite3", "mongodb", "mongoose", "redis"]:
                if db in deps:
                    detected["database"] = db
        except Exception:
            pass

    # Check requirements.txt / pyproject.toml
    req_path = root / "requirements.txt"
    if req_path.exists():
        try:
            reqs = req_path.read_text().lower()
            if "sqlalchemy" in reqs:
                detected["orm"] = "sqlalchemy"
            if "django" in reqs:
                detected["orm"] = "django"
            if "psycopg" in reqs:
                detected["database"] = "postgresql"
            if "pymongo" in reqs:
                detected["database"] = "mongodb"
        except Exception:
            pass

    # Check .env for connection strings
    env_path = root / ".env"
    if env_path.exists():
        try:
            env = env_path.read_text()
            if "postgres" in env.lower():
                detected["database"] = "postgresql"
            elif "mysql" in env.lower():
                detected["database"] = "mysql"
            elif "mongodb" in env.lower():
                detected["database"] = "mongodb"
            elif "sqlite" in env.lower():
                detected["database"] = "sqlite"
        except Exception:
            pass

    return detected


def find_schema_files(cwd: str = ".") -> List[str]:
    """Find database schema/model files."""
    root = Path(cwd)
    patterns = [
        "prisma/schema.prisma",
        "**/*schema*.ts", "**/*schema*.js",
        "**/*model*.ts", "**/*model*.js", "**/*model*.py",
        "**/*migration*/*.ts", "**/*migration*/*.js", "**/*migration*/*.py",
        "**/*entity*.ts",
        "drizzle/**/*.ts",
    ]
    files = []
    for pattern in patterns:
        for f in root.glob(pattern):
            if "node_modules" not in str(f) and "venv" not in str(f):
                files.append(str(f.relative_to(root)))
    return files[:20]  # Cap at 20


def read_schema_content(cwd: str = ".") -> str:
    """Read primary schema file content."""
    root = Path(cwd)
    # Prioritized schema locations
    candidates = [
        "prisma/schema.prisma",
        "src/db/schema.ts",
        "src/schema.ts",
        "db/schema.ts",
        "models/index.ts",
        "src/models/index.ts",
    ]
    for candidate in candidates:
        path = root / candidate
        if path.exists():
            try:
                content = path.read_text()
                return content[:5000]  # Truncate
            except Exception:
                pass
    return ""


# ────────────────────────────────────────────────────────────────────
# HuggingFace-powered analysis
# ────────────────────────────────────────────────────────────────────

async def analyze_schema(cwd: str = ".") -> Dict:
    """Analyze database schema using HF."""
    from hf_provider import hf_chat

    stack = detect_db_stack(cwd)
    schema = read_schema_content(cwd)
    files = find_schema_files(cwd)

    if not schema and not files:
        return {"error": "No schema files found", "analysis": None}

    system_prompt = """You are a database architect. Analyze the schema and provide:

1. **Schema Overview**: Tables/collections, relationships
2. **Normalization Issues**: Any denormalization or redundancy
3. **Missing Indexes**: Suggest indexes for common query patterns
4. **Relationship Issues**: Missing foreign keys, cascades
5. **Data Type Issues**: Suboptimal types, missing constraints
6. **Security**: Sensitive data handling (PII, passwords)
7. **Scalability Concerns**: Potential bottlenecks at scale

Be specific with table/column names."""

    messages = [
        {"role": "user", "content": f"""Stack: {json.dumps(stack)}
Schema files found: {files}

Schema content:
{schema}

Analyze this database schema."""}
    ]

    try:
        response = await hf_chat(
            model=os.getenv("HF_MODEL_ID", "Qwen/Qwen2.5-Coder-32B-Instruct"),
            messages=messages,
            system=system_prompt,
            max_tokens=4096,
            temperature=0.3,
        )
        return {"analysis": response.get("content", ""), "stack": stack, "files": files}
    except Exception as e:
        logger.error(f"HF schema analysis failed: {e}")
        return {"error": str(e), "analysis": None}


async def optimize_queries(cwd: str = ".") -> Dict:
    """Find and optimize slow queries using HF."""
    from hf_provider import hf_chat

    stack = detect_db_stack(cwd)
    schema = read_schema_content(cwd)

    # Find query files
    root = Path(cwd)
    query_snippets = []
    for ext in ["*.ts", "*.js", "*.py"]:
        for f in root.rglob(ext):
            if "node_modules" in str(f) or "venv" in str(f) or "test" in str(f).lower():
                continue
            try:
                content = f.read_text()
                # Look for query patterns
                keywords = ["findMany", "findAll", "query(", "SELECT ", "aggregate",
                           "rawQuery", "$queryRaw", "execute(", ".where(", ".join("]
                for kw in keywords:
                    if kw in content:
                        query_snippets.append(f"// {f.relative_to(root)}\n{content[:2000]}")
                        break
            except Exception:
                pass
            if len(query_snippets) >= 10:
                break

    if not query_snippets:
        return {"error": "No database queries found", "optimizations": None}

    system_prompt = """You are a database performance expert. Analyze these queries and find:

1. **N+1 Query Problems**: Queries inside loops
2. **Missing Indexes**: Queries filtering on unindexed columns
3. **Unnecessary Data Fetching**: SELECT * when only few columns needed
4. **Missing Pagination**: Unbounded queries
5. **Missing Caching**: Frequently repeated identical queries
6. **Transaction Issues**: Missing transactions for multi-step operations

For each issue provide: file, code snippet, problem, fix with code."""

    combined = "\n\n---\n\n".join(query_snippets[:5])
    messages = [
        {"role": "user", "content": f"""Stack: {json.dumps(stack)}
Schema: {schema[:2000]}

Query files:
{combined}

Find query optimization opportunities."""}
    ]

    try:
        response = await hf_chat(
            model=os.getenv("HF_MODEL_ID", "Qwen/Qwen2.5-Coder-32B-Instruct"),
            messages=messages,
            system=system_prompt,
            max_tokens=4096,
            temperature=0.3,
        )
        return {"optimizations": response.get("content", ""), "stack": stack, "files_analyzed": len(query_snippets)}
    except Exception as e:
        logger.error(f"HF query optimization failed: {e}")
        return {"error": str(e), "optimizations": None}


async def generate_migration(description: str, cwd: str = ".") -> Dict:
    """Generate a database migration using HF."""
    from hf_provider import hf_chat

    stack = detect_db_stack(cwd)
    schema = read_schema_content(cwd)

    system_prompt = f"""You are a database migration expert using {stack.get('orm', 'SQL')}.
Generate a complete migration file with:
1. Up migration (apply changes)
2. Down migration (rollback changes)
3. Any necessary index creation
4. Data migration if needed

Follow the conventions of {stack.get('orm', 'raw SQL')}. Output the full migration file content."""

    messages = [
        {"role": "user", "content": f"""Current schema:
{schema[:3000]}

Migration description: {description}

Generate the migration."""}
    ]

    try:
        response = await hf_chat(
            model=os.getenv("HF_MODEL_ID", "Qwen/Qwen2.5-Coder-32B-Instruct"),
            messages=messages,
            system=system_prompt,
            max_tokens=4096,
            temperature=0.3,
        )
        return {"migration": response.get("content", ""), "stack": stack}
    except Exception as e:
        logger.error(f"HF migration generation failed: {e}")
        return {"error": str(e), "migration": None}


# ────────────────────────────────────────────────────────────────────
# CLI entry point
# ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import asyncio
    import sys

    action = sys.argv[1] if len(sys.argv) > 1 else "schema"
    cwd = sys.argv[2] if len(sys.argv) > 2 else "."

    async def main():
        if action == "schema":
            result = await analyze_schema(cwd)
            print(result.get("analysis", result.get("error", "No result")))
        elif action == "optimize":
            result = await optimize_queries(cwd)
            print(result.get("optimizations", result.get("error", "No result")))
        elif action == "migrate":
            desc = sys.argv[3] if len(sys.argv) > 3 else "add new column"
            result = await generate_migration(desc, cwd)
            print(result.get("migration", result.get("error", "No result")))
        elif action == "detect":
            stack = detect_db_stack(cwd)
            print(json.dumps(stack, indent=2))
        else:
            print("Usage: python cortex_db.py [schema|optimize|migrate|detect] [cwd] [description]")

    asyncio.run(main())
