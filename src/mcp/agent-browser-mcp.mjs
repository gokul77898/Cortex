#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { execSync } from 'child_process'

const SESSION = 'cortex-daemon'

function runAgentBrowser(args) {
  const cmd = `AGENT_BROWSER_SESSION=${SESSION} agent-browser ${args.join(' ')} --json 2>/dev/null`
  try {
    const out = execSync(cmd, { encoding: 'utf-8', timeout: 30000 })
    return JSON.parse(out)
  } catch (e) {
    if (e.stdout) {
      try { return JSON.parse(e.stdout) } catch {}
    }
    return { success: false, error: e.message || String(e) }
  }
}

const TOOLS = [
  {
    name: 'browser_open',
    description: 'Launch browser and navigate to URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to (optional — no arg opens blank page)' },
      },
    },
  },
  {
    name: 'browser_snapshot',
    description: 'Get accessibility tree with refs (@e1, @e2...) for AI interaction',
    inputSchema: {
      type: 'object',
      properties: {
        interactive: { type: 'boolean', description: 'Only show interactive elements (buttons, inputs, links)' },
        compact: { type: 'boolean', description: 'Remove empty structural elements' },
        depth: { type: 'number', description: 'Limit tree depth' },
      },
    },
  },
  {
    name: 'browser_click',
    description: 'Click an element by ref (@e1) or CSS selector',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Ref (@e1) or CSS selector to click' },
        newTab: { type: 'boolean', description: 'Open in new tab' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'browser_fill',
    description: 'Clear and fill an input field',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Ref (@e2) or CSS selector' },
        text: { type: 'string', description: 'Text to fill' },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'browser_type',
    description: 'Type text into an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Ref (@e2) or CSS selector' },
        text: { type: 'string', description: 'Text to type' },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: {
      type: 'object',
      properties: {
        full: { type: 'boolean', description: 'Full page screenshot' },
      },
    },
  },
  {
    name: 'browser_get_text',
    description: 'Get text content of an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Ref (@e1) or CSS selector' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'browser_get_url',
    description: 'Get current page URL',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'browser_get_title',
    description: 'Get current page title',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'browser_eval',
    description: 'Run JavaScript in the browser page',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'JavaScript code to execute' },
      },
      required: ['code'],
    },
  },
  {
    name: 'browser_close',
    description: 'Close the browser',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'browser_find',
    description: 'Find and interact with an element by text content or role',
    inputSchema: {
      type: 'object',
      properties: {
        by: { type: 'string', enum: ['text', 'role', 'label', 'placeholder'], description: 'How to find the element' },
        value: { type: 'string', description: 'Text/role/label to search for' },
        action: { type: 'string', enum: ['click', 'fill', 'hover', 'focus'], description: 'Action to perform' },
        text: { type: 'string', description: 'Text to fill (if action is fill)' },
      },
      required: ['by', 'value', 'action'],
    },
  },
  {
    name: 'browser_wait',
    description: 'Wait for an element, text, or time',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector to wait for' },
        ms: { type: 'number', description: 'Milliseconds to wait' },
        text: { type: 'string', description: 'Text to wait for to appear' },
      },
    },
  },
  {
    name: 'browser_scroll',
    description: 'Scroll the page',
    inputSchema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down', 'left', 'right'], description: 'Scroll direction' },
        pixels: { type: 'number', description: 'Pixels to scroll' },
      },
      required: ['direction'],
    },
  },
  {
    name: 'browser_press',
    description: 'Press a key (Enter, Tab, Escape, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key to press (Enter, Tab, Escape, ArrowDown, etc.)' },
      },
      required: ['key'],
    },
  },
  {
    name: 'browser_select',
    description: 'Select a dropdown option',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Ref (@e3) or CSS selector' },
        value: { type: 'string', description: 'Option value or label to select' },
      },
      required: ['selector', 'value'],
    },
  },
  {
    name: 'browser_back',
    description: 'Go back in history',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'browser_forward',
    description: 'Go forward in history',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'browser_reload',
    description: 'Reload the current page',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'browser_hover',
    description: 'Hover over an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Ref (@e4) or CSS selector' },
      },
      required: ['selector'],
    },
  },
]

const server = new Server(
  { name: 'agent-browser-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'browser_open': {
        const url = args?.url
        const r = runAgentBrowser(url ? ['open', url] : ['open'])
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_snapshot': {
        const cmd = ['snapshot']
        if (args?.interactive) cmd.push('-i')
        if (args?.compact) cmd.push('-c')
        if (args?.depth) cmd.push('-d', String(args.depth))
        const r = runAgentBrowser(cmd)
        return { content: [{ type: 'text', text: r?.data?.snapshot || JSON.stringify(r) }] }
      }
      case 'browser_click': {
        const cmd = ['click', args.selector]
        if (args?.newTab) cmd.push('--new-tab')
        const r = runAgentBrowser(cmd)
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_fill': {
        const r = runAgentBrowser(['fill', args.selector, args.text])
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_type': {
        const r = runAgentBrowser(['type', args.selector, args.text])
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_screenshot': {
        const cmd = ['screenshot']
        if (args?.full) cmd.push('--full')
        const r = runAgentBrowser(cmd)
        const path = r?.data?.path || r?.path
        if (path) {
          return { content: [{ type: 'text', text: `Screenshot saved: ${path}` }] }
        }
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_get_text': {
        const r = runAgentBrowser(['get', 'text', args.selector])
        return { content: [{ type: 'text', text: r?.data || JSON.stringify(r) }] }
      }
      case 'browser_get_url': {
        const r = runAgentBrowser(['get', 'url'])
        return { content: [{ type: 'text', text: r?.data || JSON.stringify(r) }] }
      }
      case 'browser_get_title': {
        const r = runAgentBrowser(['get', 'title'])
        return { content: [{ type: 'text', text: r?.data || JSON.stringify(r) }] }
      }
      case 'browser_eval': {
        const r = runAgentBrowser(['eval', args.code])
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_close': {
        const r = runAgentBrowser(['close'])
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_find': {
        const cmd = ['find', args.by, args.value, args.action]
        if (args.text) cmd.push(args.text)
        const r = runAgentBrowser(cmd)
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_wait': {
        if (args.selector) {
          const r = runAgentBrowser(['wait', args.selector])
          return { content: [{ type: 'text', text: JSON.stringify(r) }] }
        }
        if (args.text) {
          const r = runAgentBrowser(['wait', '--text', args.text])
          return { content: [{ type: 'text', text: JSON.stringify(r) }] }
        }
        if (args.ms) {
          const r = runAgentBrowser(['wait', String(args.ms)])
          return { content: [{ type: 'text', text: JSON.stringify(r) }] }
        }
        return { content: [{ type: 'text', text: 'No wait condition provided' }] }
      }
      case 'browser_scroll': {
        const cmd = ['scroll', args.direction]
        if (args.pixels) cmd.push(String(args.pixels))
        const r = runAgentBrowser(cmd)
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_press': {
        const r = runAgentBrowser(['press', args.key])
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_select': {
        const r = runAgentBrowser(['select', args.selector, args.value])
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_back': {
        const r = runAgentBrowser(['back'])
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_forward': {
        const r = runAgentBrowser(['forward'])
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_reload': {
        const r = runAgentBrowser(['reload'])
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      case 'browser_hover': {
        const r = runAgentBrowser(['hover', args.selector])
        return { content: [{ type: 'text', text: JSON.stringify(r) }] }
      }
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
    }
  } catch (e) {
    return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
