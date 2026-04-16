import { z } from 'zod/v4';

export const IntentSchema = z.object({
  goal: z.string().describe("What the user ultimately wants to achieve"),
  action_type: z.enum([
    'read', 
    'write', 
    'search', 
    'code', 
    'github', 
    'analyze', 
    'terminal'
  ]).describe("The category of action to take"),
  target: z.enum([
    'file', 
    'repo', 
    'web', 
    'codebase', 
    'process',
    'package'
  ]).describe("The object being acted upon"),
  params: z.record(z.unknown()).describe("The normalized parameters for the tool"),
  confidence: z.number().min(0).max(1).describe("LLM's confidence in this intent mapping")
});

export type Intent = z.infer<typeof IntentSchema>;

export interface RoutingRule {
  action_type: Intent['action_type'];
  target: Intent['target'];
  preferred_tool: string;
}

export const ROUTING_RULES: RoutingRule[] = [
  { action_type: 'read', target: 'file', preferred_tool: 'read_file' },
  { action_type: 'write', target: 'file', preferred_tool: 'replace_file_content' },
  { action_type: 'search', target: 'codebase', preferred_tool: 'grep_search' },
  { action_type: 'search', target: 'repo', preferred_tool: 'glob' },
  { action_type: 'search', target: 'web', preferred_tool: 'web_search' },
  { action_type: 'code', target: 'codebase', preferred_tool: 'notebook_edit' },
  { action_type: 'terminal', target: 'process', preferred_tool: 'bash' }
];
