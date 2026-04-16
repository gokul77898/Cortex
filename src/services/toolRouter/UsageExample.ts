import { ToolRouter } from './ToolRouter.js';
import { Intent } from './types.js';

/**
 * EXAMPLE FLOW: user → edit file → commit → PR
 */
async function demoFlow(router: ToolRouter, ctx: any, canUse: any, parent: any) {
  
  // 1. EDIT FILE
  const editIntent: Intent = {
    goal: "Update version in package.json",
    action_type: 'write',
    target: 'file',
    params: {
      path: 'package.json',
      content: '{"version": "1.1.0"}' 
    },
    confidence: 0.95
  };
  await router.route(editIntent, ctx, canUse, parent);

  // 2. COMMIT
  const commitIntent: Intent = {
    goal: "Commit new version",
    action_type: 'terminal',
    target: 'process',
    params: {
      command: 'git add package.json && git commit -m "bump version"'
    },
    confidence: 0.88
  };
  await router.route(commitIntent, ctx, canUse, parent);

  // 3. PULL REQUEST (Mock MCP tool)
  const prIntent: Intent = {
    goal: "Create pull request for version bump",
    action_type: 'github',
    target: 'repo',
    params: {
      title: "Bump version to 1.1.0",
      head: "version-bump",
      base: "main"
    },
    confidence: 0.92
  };
  // This would look up 'mcp__github__create_pr' or similar based on rules
  await router.route(prIntent, ctx, canUse, parent);
}
