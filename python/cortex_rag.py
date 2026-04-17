#!/usr/bin/env python3
"""
CORTEX RAG — semantic search over your codebase using pgvector + HuggingFace embeddings.

Usage:
    python3 cortex_rag.py setup              # One-time: install pgvector extension
    python3 cortex_rag.py index              # (Re)index the repo
    python3 cortex_rag.py index --incremental # Only reindex changed files
    python3 cortex_rag.py query "how does auth work?"
    python3 cortex_rag.py query "..." --k 5  # top-K results
    python3 cortex_rag.py status             # stats on indexed content

Requires env vars: POSTGRES_CONNECTION_STRING, HF_TOKEN
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path
from typing import Iterable

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    sys.exit("❌ Missing dep: pip install psycopg2-binary")

try:
    import requests
except ImportError:
    sys.exit("❌ Missing dep: pip install requests")

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DSN = os.environ.get(
    "POSTGRES_CONNECTION_STRING",
    "postgresql://gokul@localhost:5432/cortex",
)
HF_TOKEN = os.environ.get("HF_TOKEN")
EMBED_MODEL = os.environ.get("CORTEX_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
EMBED_DIM = 384  # MiniLM-L6-v2 output dim
CHUNK_LINES = 60
CHUNK_OVERLAP = 10

# File types to index
INCLUDE_EXT = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".go", ".rs", ".java", ".kt", ".swift",
    ".rb", ".php", ".cs", ".cpp", ".c", ".h", ".hpp",
    ".sh", ".zsh", ".bash",
    ".md", ".txt", ".yaml", ".yml", ".toml", ".json",
    ".sql", ".graphql", ".proto",
}
EXCLUDE_DIRS = {
    "node_modules", "dist", "build", ".git", ".next", ".nuxt",
    "venv", "__pycache__", ".cortex", "coverage", "reports",
    "integrations", "libs", "lightpanda", "bin",
}


# ─── DB helpers ───────────────────────────────────────────────────
def get_conn():
    return psycopg2.connect(DEFAULT_DSN)


def setup_db():
    with get_conn() as c, c.cursor() as cur:
        try:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        except psycopg2.Error as e:
            print(f"⚠️  pgvector extension install failed: {e}")
            print("   Install with: brew install pgvector && restart postgres")
            sys.exit(1)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS cortex_rag (
                id BIGSERIAL PRIMARY KEY,
                file_path TEXT NOT NULL,
                chunk_index INT NOT NULL,
                start_line INT NOT NULL,
                end_line INT NOT NULL,
                content TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                embedding vector({EMBED_DIM}),
                indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(file_path, chunk_index)
            );
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS cortex_rag_file_idx ON cortex_rag(file_path);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS cortex_rag_embed_idx
            ON cortex_rag USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
        """)
        c.commit()
    print("✅ pgvector + cortex_rag table ready")


# ─── Embedding ───────────────────────────────────────────────────
def embed_batch(texts: list[str]) -> list[list[float]]:
    """Call HuggingFace inference API for sentence embeddings."""
    if not HF_TOKEN:
        sys.exit("❌ HF_TOKEN env var not set")
    url = f"https://router.huggingface.co/hf-inference/models/{EMBED_MODEL}/pipeline/feature-extraction"
    r = requests.post(
        url,
        headers={"Authorization": f"Bearer {HF_TOKEN}"},
        json={"inputs": texts, "options": {"wait_for_model": True}},
        timeout=60,
    )
    if r.status_code != 200:
        raise RuntimeError(f"HF embed error {r.status_code}: {r.text[:300]}")
    data = r.json()
    # Sometimes the API returns token-level embeddings (3D); mean-pool them.
    if isinstance(data[0][0], list):
        return [[sum(col) / len(col) for col in zip(*toks)] for toks in data]
    return data


# ─── Chunking ────────────────────────────────────────────────────
def iter_files(root: Path) -> Iterable[Path]:
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if any(part in EXCLUDE_DIRS for part in p.parts):
            continue
        if p.suffix.lower() not in INCLUDE_EXT:
            continue
        try:
            if p.stat().st_size > 500_000:  # skip huge files
                continue
        except OSError:
            continue
        yield p


def chunk_file(path: Path) -> list[dict]:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return []
    lines = text.splitlines()
    if not lines:
        return []
    chunks = []
    i = 0
    idx = 0
    while i < len(lines):
        end = min(i + CHUNK_LINES, len(lines))
        content = "\n".join(lines[i:end])
        if content.strip():
            chunks.append({
                "chunk_index": idx,
                "start_line": i + 1,
                "end_line": end,
                "content": content,
                "content_hash": hashlib.sha1(content.encode("utf-8")).hexdigest(),
            })
            idx += 1
        if end == len(lines):
            break
        i = end - CHUNK_OVERLAP
    return chunks


# ─── Indexing ────────────────────────────────────────────────────
def index_repo(incremental: bool = False):
    setup_db()
    batch_size = 16
    batch: list[dict] = []
    total = 0
    skipped = 0
    t0 = time.time()

    def flush():
        nonlocal batch
        if not batch:
            return
        texts = [b["content"][:2000] for b in batch]
        embeds = embed_batch(texts)
        rows = [
            (b["file_path"], b["chunk_index"], b["start_line"], b["end_line"],
             b["content"], b["content_hash"], embeds[i])
            for i, b in enumerate(batch)
        ]
        with get_conn() as c, c.cursor() as cur:
            psycopg2.extras.execute_values(
                cur,
                """
                INSERT INTO cortex_rag (file_path, chunk_index, start_line, end_line, content, content_hash, embedding)
                VALUES %s
                ON CONFLICT (file_path, chunk_index) DO UPDATE SET
                  content = EXCLUDED.content,
                  content_hash = EXCLUDED.content_hash,
                  embedding = EXCLUDED.embedding,
                  indexed_at = CURRENT_TIMESTAMP;
                """,
                rows,
                template="(%s,%s,%s,%s,%s,%s,%s::vector)",
            )
            c.commit()
        batch = []

    # For incremental mode: fetch existing hashes
    existing: dict[tuple[str, int], str] = {}
    if incremental:
        with get_conn() as c, c.cursor() as cur:
            cur.execute("SELECT file_path, chunk_index, content_hash FROM cortex_rag")
            for fp, ci, h in cur.fetchall():
                existing[(fp, ci)] = h

    for path in iter_files(REPO_ROOT):
        rel = str(path.relative_to(REPO_ROOT))
        chunks = chunk_file(path)
        for ch in chunks:
            key = (rel, ch["chunk_index"])
            if incremental and existing.get(key) == ch["content_hash"]:
                skipped += 1
                continue
            ch["file_path"] = rel
            batch.append(ch)
            total += 1
            if len(batch) >= batch_size:
                flush()
                print(f"  indexed {total} chunks... ({time.time()-t0:.1f}s)")

    flush()
    print(f"\n✅ Indexed {total} chunks in {time.time()-t0:.1f}s (skipped {skipped} unchanged)")


# ─── Query ───────────────────────────────────────────────────────
def query(question: str, k: int = 5):
    emb = embed_batch([question])[0]
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT file_path, start_line, end_line, content,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM cortex_rag
            ORDER BY embedding <=> %s::vector
            LIMIT %s;
            """,
            (emb, emb, k),
        )
        rows = cur.fetchall()
    out = {"query": question, "results": []}
    for i, r in enumerate(rows, 1):
        out["results"].append({
            "rank": i,
            "file": r["file_path"],
            "lines": f"{r['start_line']}-{r['end_line']}",
            "similarity": round(r["similarity"], 4),
            "preview": r["content"][:400],
        })
    print(json.dumps(out, indent=2))


def status():
    with get_conn() as c, c.cursor() as cur:
        cur.execute("SELECT COUNT(*), COUNT(DISTINCT file_path), MAX(indexed_at) FROM cortex_rag")
        n, files, last = cur.fetchone()
    print(f"📊 RAG status\n  chunks   : {n}\n  files    : {files}\n  last idx : {last}")


# ─── CLI ─────────────────────────────────────────────────────────
def main():
    p = argparse.ArgumentParser(prog="cortex_rag")
    sp = p.add_subparsers(dest="cmd", required=True)
    sp.add_parser("setup", help="Install pgvector + create table")
    idx = sp.add_parser("index", help="Index the repo")
    idx.add_argument("--incremental", action="store_true", help="Only reindex changed")
    q = sp.add_parser("query", help="Semantic search")
    q.add_argument("question")
    q.add_argument("--k", type=int, default=5)
    sp.add_parser("status", help="Show index stats")
    args = p.parse_args()

    if args.cmd == "setup":
        setup_db()
    elif args.cmd == "index":
        index_repo(incremental=args.incremental)
    elif args.cmd == "query":
        query(args.question, k=args.k)
    elif args.cmd == "status":
        status()


if __name__ == "__main__":
    main()
