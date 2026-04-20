import { GIT_READ_TOOLS, makeTierCommand, READ_ONLY_TOOLS, SHELL_TOOLS } from './_tierHelper.js'

export default makeTierCommand({
  name: 'rollback',
  aliases: ['revert-deploy', 'undo-deploy'],
  description: 'Roll back the last deployment on Vercel / Netlify / Railway / Fly.io / Render (real provider CLIs)',
  progressMessage: 'identifying last deployment',
  allowedTools: [
    ...READ_ONLY_TOOLS,
    ...GIT_READ_TOOLS,
    ...SHELL_TOOLS,
    'Bash(vercel:*)',
    'Bash(netlify:*)',
    'Bash(flyctl:*)',
    'Bash(fly:*)',
    'Bash(railway:*)',
    'Bash(render:*)',
    'Bash(heroku:*)',
    'Bash(gh:*)',
    'Bash(curl:*)',
    'Bash(jq:*)',
  ],
  buildPrompt: (args) => `## Deployment Rollback Protocol

**Target:** ${args || '(auto-detect provider from config files; ask user which environment)'}

You perform a **real** rollback using the provider's official CLI. No simulation. **Always require explicit user confirmation before executing the rollback command.**

### 1. Detect the provider

| File / Signal | Provider |
|---|---|
| \`vercel.json\` / \`.vercel/project.json\` | Vercel |
| \`netlify.toml\` / \`.netlify/state.json\` | Netlify |
| \`fly.toml\` | Fly.io |
| \`railway.toml\` / \`railway.json\` | Railway |
| \`render.yaml\` | Render |
| \`Procfile\` + \`heroku\` remote | Heroku |

If multiple matches → ask user which one.
If none → ask user.

### 2. Verify CLI is installed and authenticated

- \`vercel whoami\` / \`netlify status\` / \`flyctl auth whoami\` / \`railway whoami\` / \`render whoami\` / \`heroku auth:whoami\`
- If missing, print the install command and stop:
  - Vercel: \`npm i -g vercel\`
  - Netlify: \`npm i -g netlify-cli\`
  - Fly: \`brew install flyctl\`
  - Railway: \`npm i -g @railway/cli\`
  - Render: \`brew tap render-oss/render && brew install render\`

### 3. List recent deployments

- **Vercel:** \`vercel ls --scope <team> --prod\` (or \`vercel list\` for current project)
- **Netlify:** \`netlify api listSiteDeploys --data '{"site_id":"<id>"}' | jq '.[0:5] | .[] | {id,state,created_at,commit_ref}'\`
- **Fly.io:** \`flyctl releases --app <name>\` → pick previous successful version
- **Railway:** \`railway status\` + \`railway variables\` (Railway uses service redeploy, not snapshot)
- **Render:** \`render services list\` then \`render deploys list --service <id>\`
- **Heroku:** \`heroku releases -a <app>\`

Show the user the **last 5 deployments** with: id, timestamp, commit SHA, current/previous status.

### 4. Identify the rollback target

- Default: the most recent **successful** deployment before the current one.
- If the user passed a deployment id / version → use it.
- Never roll back to a failed deployment.

### 5. Confirm with user

Print an explicit confirmation block:
\`\`\`
About to rollback:
  provider:   <provider>
  project:    <name>
  environment: <prod | preview | staging>
  from:       <current deployment id>  @ <current commit SHA>  (<timestamp>)
  to:         <target deployment id>   @ <target commit SHA>   (<timestamp>)

Command: <exact CLI command>
\`\`\`

**Stop here and wait for user approval. Do NOT execute.**

### 6. Execute (only after user confirms)

Exact commands by provider:

- **Vercel:** \`vercel rollback <deployment-url-or-id> --yes\`
- **Netlify:** \`netlify api restoreSiteDeploy --data '{"site_id":"<id>","deploy_id":"<target>"}'\`
- **Fly.io:** \`flyctl deploy --image registry.fly.io/<app>:deployment-<version>\` OR \`flyctl releases rollback <version>\`
- **Railway:** \`railway redeploy --service <id> --deployment <id>\` (newer CLI) or rebuild from the target commit
- **Render:** \`render deploys rollback --deploy <id>\`
- **Heroku:** \`heroku rollback <version> -a <app>\`

### 7. Post-rollback verification

- Wait for deployment to finish (\`vercel inspect\` / \`flyctl status\` / polling the deploy endpoint).
- \`curl -sSf <prod-url>/health\` (or \`/\`) — must return 2xx.
- Show last 20 lines of deploy logs.

### 8. Record the rollback

Append to \`logs/rollbacks.log\` (create if missing):
\`\`\`
<ISO timestamp>  <provider>  <env>  from=<id>@<sha>  to=<id>@<sha>  user=<git config user.name>  reason="<user-provided or blank>"
\`\`\`

Also attempt: \`gh api repos/:owner/:repo/deployments/<id>/statuses -f state=inactive -f description='Rolled back'\` if the repo has GitHub deployments.

### Rules
- **NEVER execute a rollback without explicit user approval.** Show the plan, stop, wait.
- Never rollback to a failed deployment.
- Always verify auth before listing deployments.
- If provider is unclear, ask — don't guess.
- Surface real provider errors verbatim — do not swallow.

Proceed.`,
})
