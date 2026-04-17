import { makeTierCommand, PKG_TOOLS } from '../_tierHelper.js'

export default makeTierCommand({
  name: 'rag',
  aliases: ['r'],
  description:
    'Semantic search over your codebase (pgvector + HF embeddings). Subcommands: setup, index, query "<q>", status',
  progressMessage: 'running RAG',
  allowedTools: [
    ...PKG_TOOLS,
    'Bash(python3:*)',
    'Bash(pip:*)',
    'Bash(pip3:*)',
    'Read',
  ],
  buildPrompt: (args) => {
    const trimmed = (args ?? '').trim()
    return `## CORTEX RAG Protocol

User invocation: \`/rag ${trimmed}\`

You are running the RAG engine at \`python/cortex_rag.py\`.

## Rules
1. If the user typed nothing, or typed "help", show them the subcommands:
   - \`setup\`     — one-time pgvector + table setup
   - \`index\`     — (re)index the repo (~2-10 min first time)
   - \`query "<question>"\` — semantic search
   - \`status\`    — show index stats
2. Otherwise, shell out to: \`python3 python/cortex_rag.py ${trimmed}\`
   - If user typed just \`query foo bar\`, pass it as \`query "foo bar"\`
   - For \`query\` results, parse the JSON output and present a clean table:
     | rank | file:lines | similarity | preview |
3. If the script errors with "psycopg2" or "requests" missing, tell the user:
   \`pip install -r python/requirements-tier-s.txt\`
4. If it errors with "pgvector extension install failed", tell them:
   \`brew install pgvector && brew services restart postgresql@17\`
5. If HF_TOKEN is missing, remind them it's in \`.env\`.

## Output
- Quote the top 3 matched chunks inline so the user can read them
- End with a one-line summary of what was done
`
  },
})
