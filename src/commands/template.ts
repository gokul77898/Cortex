import { CODE_EDIT_TOOLS, makeTierCommand, PKG_TOOLS, SHELL_TOOLS } from './_tierHelper.js'

export default makeTierCommand({
  name: 'template',
  aliases: ['scaffold', 'starter'],
  description: 'Scaffold a new project from a stack template (Next.js, Django, Rails, FastAPI, Expo, Svelte, Astro, Hono, Express, Vite)',
  progressMessage: 'scaffolding project',
  allowedTools: [
    ...CODE_EDIT_TOOLS,
    ...SHELL_TOOLS,
    ...PKG_TOOLS,
    'Bash(npx:*)',
    'Bash(pnpx:*)',
    'Bash(bunx:*)',
    'Bash(mkdir:*)',
    'Bash(touch:*)',
    'Bash(cp:*)',
    'Bash(mv:*)',
    'Bash(git:*)',
    'Bash(django-admin:*)',
    'Bash(rails:*)',
    'Bash(gh:*)',
  ],
  buildPrompt: (args) => `## Project Scaffolding Protocol

**Stack requested:** ${args || '(ask user which stack and target directory)'}

You are a senior full-stack engineer. Scaffold a production-ready starter project using real, official tooling. **Do NOT write mock code — use the official CLI scaffolders whenever possible.**

### 1. Identify the stack
Map the user's request to an official scaffolder:

| Stack keywords | Command |
|---|---|
| \`nextjs\`, \`next\`, \`next.js\` | \`npx create-next-app@latest <name> --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"\` |
| \`react\`, \`vite\` | \`npm create vite@latest <name> -- --template react-ts\` |
| \`svelte\`, \`sveltekit\` | \`npm create svelte@latest <name>\` |
| \`astro\` | \`npm create astro@latest <name> -- --template basics --typescript strict --install --git\` |
| \`nuxt\`, \`nuxt.js\` | \`npx nuxi@latest init <name>\` |
| \`remix\` | \`npx create-remix@latest <name>\` |
| \`expo\`, \`react-native\` | \`npx create-expo-app@latest <name> --template default\` |
| \`hono\` | \`npm create hono@latest <name>\` |
| \`express\` | custom scaffold (see below) |
| \`fastapi\`, \`fast-api\` | custom scaffold (see below) |
| \`django\` | \`django-admin startproject <name>\` (requires \`pip install django\`) |
| \`rails\` | \`rails new <name> --database=postgresql --css=tailwind\` |
| \`nestjs\`, \`nest\` | \`npx -p @nestjs/cli nest new <name>\` |

### 2. Target directory
- Default: \`./\${name}\` relative to cwd.
- If target exists and is non-empty → ask before overwriting.

### 3. Run the scaffolder
- Use the Bash tool with the exact official command.
- Pass \`-y\` / \`--yes\` / \`--use-npm\` flags to avoid interactive prompts where supported.
- If the scaffolder is interactive-only (e.g. \`create-svelte\`), fall back to writing the minimal boilerplate manually using the official file layout.

### 4. Custom scaffolds (for stacks without an official CLI)

**Express (TypeScript):**
\`\`\`
<name>/
  src/index.ts       # app with /health, /api/hello routes
  package.json       # express, typescript, tsx, @types/express, @types/node
  tsconfig.json
  .gitignore
  README.md
\`\`\`

**FastAPI:**
\`\`\`
<name>/
  app/main.py        # FastAPI with /health and /
  app/__init__.py
  requirements.txt   # fastapi, uvicorn[standard], pydantic
  Dockerfile
  .gitignore
  README.md
\`\`\`
Then run: \`python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt\`

### 5. Post-scaffold steps
- \`cd <name> && git init && git add -A && git commit -m "chore: initial scaffold"\`
- Install deps (npm/pnpm/bun install, pip install).
- Print next-steps:
  - \`cd <name>\`
  - dev command (\`npm run dev\`, \`uvicorn app.main:app --reload\`, \`python manage.py runserver\`, \`rails server\`)
  - the exact URL it'll run on

### Rules
- **Never fabricate file contents.** Only use official scaffolders or the documented minimal layouts above.
- Always end with \`git init\` + first commit.
- If a scaffolder fails, surface the real error — don't silently fall back.
- If stack is unknown/ambiguous, ask before proceeding.

Proceed.`,
})
