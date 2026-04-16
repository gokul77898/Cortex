import chalk from 'chalk';

const AGENT_COLORS: Record<string, any> = {
  'agency-ui-designer': chalk.hex('#FF00FF'), // Magenta
  'agency-frontend-developer': chalk.hex('#00FFFF'), // Cyan
  'agency-backend-architect': chalk.hex('#FFA500'), // Orange
  'agency-seo-specialist': chalk.hex('#00FF00'), // Green
  'agency-security-engineer': chalk.hex('#FF0000'), // Red
  'agency-agents-orchestrator': chalk.hex('#FFFF00'), // Yellow
  'general-purpose': chalk.hex('#FFFFFF'), // White
};

function getAgentColor(agentName: string) {
  return AGENT_COLORS[agentName] || chalk.blue;
}

export function logAgentAction(agentName: string, action: string) {
  const color = getAgentColor(agentName);
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${chalk.gray(`[${timestamp}]`)} ${color(`[${agentName.toUpperCase()}]`)} ${chalk.white(action)}`);
}

export function logAgentThinking(agentName: string) {
  const color = getAgentColor(agentName);
  const timestamp = new Date().toLocaleTimeString();
  process.stdout.write(`${chalk.gray(`[${timestamp}]`)} ${color(`[${agentName.toUpperCase()}]`)} ${chalk.italic.gray('Thinking...')}\r`);
}

export function logAgentToolUse(agentName: string, toolName: string, input: any) {
  const color = getAgentColor(agentName);
  const timestamp = new Date().toLocaleTimeString();
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input).slice(0, 80) + '...';
  // Clear the thinking line if it was there
  process.stdout.write(' '.repeat(100) + '\r');
  console.log(`${chalk.gray(`[${timestamp}]`)} ${color(`📡 [${agentName.toUpperCase()}]`)} ${chalk.yellow(`Using ${toolName}`)}: ${chalk.gray(inputStr)}`);
}

export function logAgentResult(agentName: string, success: boolean, message: string) {
  const color = getAgentColor(agentName);
  const status = success ? chalk.green('✓ COMPLETED') : chalk.red('✗ INTERRUPTED');
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${chalk.gray(`[${timestamp}]`)} ${color(`[${agentName.toUpperCase()}]`)} ${status}: ${chalk.gray(message)}`);
}
