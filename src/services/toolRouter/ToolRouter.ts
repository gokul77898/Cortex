import { trace, context as otelContext, SpanStatusCode, type Span } from '@opentelemetry/api';
import { type Intent, ROUTING_RULES, IntentSchema } from './types.js';
import { findToolByName, type Tool, type Tools, type ToolUseContext } from '../../Tool.js';
import { type CanUseToolFn } from '../../hooks/useCanUseTool.js';
import { type AssistantMessage } from '../../types/message.js';

export class ToolRouter {
  private tracer = trace.getTracer('cortex-tool-router');

  constructor(private tools: Tools) {}

  /**
   * Main entry point for routing an LLM's intent to a deterministic tool call.
   */
  async route(
    rawIntent: unknown,
    context: ToolUseContext,
    canUseTool: CanUseToolFn,
    parentMessage: AssistantMessage
  ): Promise<any> {
    return this.tracer.startActiveSpan('ToolRouter.route', async (span: Span) => {
      try {
        // Step 1: Validate Intent Struct
        const intent = this.validateIntent(rawIntent);
        span.setAttribute('intent.goal', intent.goal);
        span.setAttribute('intent.action_type', intent.action_type);
        span.setAttribute('intent.confidence', intent.confidence);

        // Step 2: Fallback strategy - low confidence
        if (intent.confidence < 0.6) {
          throw new Error(`Insufficient confidence (${intent.confidence}) to proceed. Please clarify your request.`);
        }

        // Step 3: Map Intent to Tool
        const toolName = this.selectTool(intent);
        const tool = findToolByName(this.tools, toolName);

        if (!tool) {
          throw new Error(`Router selected tool '${toolName}', but it is not available in the current context.`);
        }

        span.setAttribute('selected_tool', tool.name);

        // Step 4: Tool-level Validation & Permissions
        await this.validateSafety(tool, intent.params, context);

        // Step 5: Wrap Execution
        const result = await this.executeWithTracing(tool, intent.params, context, canUseTool, parentMessage);
        
        // Step 6: Feedback Loop (Logging)
        this.logDecision(intent, tool.name, true);
        
        return result;

      } catch (error: any) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        this.logDecision(rawIntent as any, 'none', false, error.message);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private validateIntent(raw: unknown): Intent {
    const result = IntentSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`Invalid intent structure: ${result.error.message}`);
    }
    return result.data;
  }

  private selectTool(intent: Intent): string {
    const rule = ROUTING_RULES.find(
      r => r.action_type === intent.action_type && r.target === intent.target
    );
    
    if (!rule) {
      throw new Error(`No deterministic routing rule found for ${intent.action_type}:${intent.target}`);
    }
    
    return rule.preferred_tool;
  }

  private async validateSafety(tool: Tool, params: any, context: ToolUseContext) {
    // 1. Check sandbox boundaries (Safety Rule - Step 3/7)
    if (tool.isDestructive && tool.isDestructive(params)) {
      if (context.options.isNonInteractiveSession) {
        throw new Error(`Automated destruction blocked: ${tool.name} is attempting a destructive action.`);
      }
    }

    // 2. Validate input schema
    if (tool.validateInput) {
      const validation = await tool.validateInput(params, context);
      if (!validation.result) {
        throw new Error(`Tool validation failed: ${validation.message}`);
      }
    }

    // 3. Permission Check
    const permission = await tool.checkPermissions(params, context);
    if (permission.behavior === 'deny') {
      throw new Error(`Permission denied for tool ${tool.name}`);
    }
  }

  private async executeWithTracing(
    tool: Tool,
    params: any,
    context: ToolUseContext,
    canUseTool: CanUseToolFn,
    parentMessage: AssistantMessage
  ) {
    return this.tracer.startActiveSpan(`ToolExecution.${tool.name}`, async (span: Span) => {
      try {
        const result = await tool.call(params, context, canUseTool, parentMessage);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (e: any) {
        // Fallback strategy - step 5
        span.recordException(e);
        span.setStatus({ code: SpanStatusCode.ERROR, message: e.message });
        throw e;
      } finally {
        span.end();
      }
    });
  }

  private logDecision(intent: Intent, toolUsed: string, success: boolean, error?: string) {
    // Memory Feedback Loop - Step 6
    const logData = {
      timestamp: new Date().toISOString(),
      intent: intent.goal,
      action: intent.action_type,
      tool: toolUsed,
      success,
      error
    };
    
    // In a real production app, this would go to a database or vector store
    // For now, we omit to stdout or a local file
    if (process.env.DEBUG_ROUTER) {
      console.log(`[ToolRouter] ${JSON.stringify(logData)}`);
    }
  }
}
