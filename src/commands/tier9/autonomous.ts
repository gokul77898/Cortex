import { makeTierCommand, PKG_TOOLS } from '../_tierHelper.js'

export default makeTierCommand({
  name: 'autonomous',
  aliases: ['auto', 'daemon'],
  description:
    'Autonomous background agent that scans the repo, writes daily briefs, and can (opt-in) open draft PRs. Subcommands: start, stop, status, brief',
  progressMessage: 'managing autonomous agent',
  allowedTools: [
    ...PKG_TOOLS,
    'Bash(python3:*)',
    'Read',
    'Bash(cat:*)',
    'Bash(ls:*)',
  ],
  buildPrompt: (args) => {
    const trimmed = (args ?? '').trim() || 'status'
    return `## CORTEX Autonomous Agent Protocol

User invocation: \`/autonomous ${trimmed}\`

You are managing the autonomous daemon at \`python/cortex_autonomous.py\`.

## Rules
1. Parse the subcommand:
   - \`start\` — start the daemon in background (default interval 3600s, safe mode)
     Accept flags: \`--interval <sec>\`, \`--apply\` (enable draft PRs)
   - \`stop\` — stop the daemon
   - \`status\` — show whether running + list last 5 briefs
   - \`brief\` — generate one brief now (synchronous) and print it
2. Shell out to: \`python3 python/cortex_autonomous.py ${trimmed}\`
3. For \`brief\`, read the generated markdown file and display the key findings:
   - Repo health (branch, dirty files, ahead/behind)
   - TODO count + top 5 action items
   - Outdated dependency count
4. If user asks for \`start --apply\`, warn them: "Apply mode will open draft PRs. Only non-destructive changes. Confirm?"

## Safety
- The daemon is safe-mode by default — only writes to \`.cortex/autonomous/briefs/\`
- Never auto-push, never merge PRs, never delete files
- If the user wants the daemon to auto-fix, they must pass \`--apply\`

## Output
- Clear status icons: 🟢 running / 🔴 stopped
- Inline preview of latest brief when status is checked
`
  },
})
