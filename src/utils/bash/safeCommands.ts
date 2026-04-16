/**
 * CORTEX: Whitelist of safe, informational bash commands that can be 
 * auto-allowed without prompting in interactive sessions.
 */

const SAFE_COMMAND_PATTERNS = [
  /^node\s+(-v|--version)$/,
  /^bun\s+(-v|--version)$/,
  /^npm\s+(-v|--version)$/,
  /^npx\s+(-v|--version)$/,
  /^python(3)?\s+(-v|--version)$/,
  /^pip(3)?\s+(-v|--version)$/,
  /^git\s+--version$/,
  /^pwd$/,
  /^whoami$/,
  /^hostname$/,
  /^date$/,
  /^uname(\s+-a)?$/,
  // Compound version checks often used in startup/diagnostics
  /^node\s+--version\s+&&\s+bun\s+--version\s+2>\/dev\/null\s+\|\|\s+(npm\s+--version|true)$/,
  /^node\s+--version\s+&&\s+npm\s+--version\s+&&\s+bun\s+--version\s+2>\/dev\/null\s+\|\|\s+true$/,
  /^ls$/,
]

export function isWhitelistedSafeBashCommand(command: string): boolean {
  const trimmed = command.trim()
  return SAFE_COMMAND_PATTERNS.some(pattern => pattern.test(trimmed))
}
