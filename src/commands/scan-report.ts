import type { Command } from '../commands.js'
import {
  formatScanSummary,
  getScanResults,
  isScanComplete,
  isScanRunning,
} from '../utils/backgroundScans.js'

const scanReport: Command = {
  type: 'prompt',
  name: 'scan-report',
  aliases: ['scans', 'health'],
  description: 'View background scan results (security, deps, git, tests, perf)',
  contentLength: 0,
  progressMessage: 'fetching scan results',
  source: 'builtin',
  async getPromptForCommand() {
    const summary = formatScanSummary()
    const results = getScanResults()

    let prompt = `The following background scan results were collected automatically when the CLI started.\n\n${summary}\n\n`

    if (isScanComplete() && results.length > 0) {
      const critical = results.filter(r => r.status === 'critical')
      const warnings = results.filter(r => r.status === 'warning')

      if (critical.length > 0 || warnings.length > 0) {
        prompt += `\n## Action Required\n\nPlease provide specific, actionable recommendations for each issue found above. For critical issues, provide exact commands or code fixes. For warnings, explain the risk and suggest improvements. Keep it concise.\n`
      } else {
        prompt += `\nAll scans passed. Briefly confirm the project health looks good and mention any best practices the user could still adopt.\n`
      }
    } else if (isScanRunning()) {
      prompt += `\nScans are still running. Let the user know they can run \`/scan-report\` again in a few seconds.\n`
    } else {
      prompt += `\nScans haven't started. This might be because the CLI just launched. Suggest the user waits a moment and tries again.\n`
    }

    return [{ type: 'text', text: prompt }]
  },
}

export default scanReport
