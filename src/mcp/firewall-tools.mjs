import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { execSync } from 'child_process'

const server = new Server(
  { name: 'firewall-tools', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

const TOOLS = [
  {
    name: 'hping3_probe',
    description: 'Send custom TCP/UDP/ICMP packets to probe firewall rules. Detect stateful vs stateless filtering, open/closed/dropped ports. Requires hping3 installed (brew install hping).',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target IP or hostname' },
        port: { type: 'number', description: 'Port to probe' },
        protocol: { type: 'string', enum: ['tcp', 'udp', 'icmp'], default: 'tcp' },
        flags: { type: 'string', description: 'TCP flags: S (SYN), A (ACK), SA (SYN-ACK), F (FIN), P (PUSH), U (URG), X (Xmas), Y (Ymas), null (no flags)', default: 'S' },
        count: { type: 'number', description: 'Number of packets', default: 3 },
        interface: { type: 'string', description: 'Network interface (e.g. en0)' }
      },
      required: ['target']
    }
  },
  {
    name: 'firewalk_scan',
    description: 'Firewalk — determine firewall ACL rules by analyzing TTL responses. Detects which ports are allowed through a firewall/gateway. Requires firewalk installed.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target hostname or IP behind the firewall' },
        gateway: { type: 'string', description: 'Firewall/gateway IP to walk through' },
        ports: { type: 'string', description: 'Port range (e.g. 1-1000 or 22,80,443)', default: '1-100' },
        protocol: { type: 'string', enum: ['TCP', 'UDP'], default: 'TCP' },
        timeout: { type: 'number', description: 'Timeout in seconds', default: 5 }
      },
      required: ['target', 'gateway']
    }
  },
  {
    name: 'wafw00f_detect',
    description: 'WAFW00F — detect and fingerprint Web Application Firewall (WAF) products protecting a website. Sends normal + malicious HTTP requests and analyzes responses. Requires wafw00f installed (pip3 install wafw00f).',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Target URL (e.g. https://example.com)' },
        verbose: { type: 'boolean', description: 'Verbose output', default: false },
        follow_redirects: { type: 'boolean', description: 'Follow redirects', default: true }
      },
      required: ['url']
    }
  },
  {
    name: 'nessus_info',
    description: 'Nessus Essentials (free tier, 16 IPs) — setup, scan guidance, and firewall misconfiguration checks. Nessus is a GUI desktop app, this tool returns guided instructions.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['setup', 'scan_guide', 'firewall_checks'],
          description: 'What info to retrieve'
        }
      },
      required: ['action']
    }
  }
]

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}))

function run(cmd, timeout = 60000) {
  try {
    return execSync(cmd, { timeout, encoding: 'utf-8', maxBuffer: 2 * 1024 * 1024 })
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || e.message, error: true }
  }
}

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params

  switch (name) {
    case 'hping3_probe': {
      const target = args.target
      const port = args.port || 80
      const protocol = args.protocol || 'tcp'
      const flags = args.flags || 'S'
      const count = args.count || 3
      const iface = args.interface || ''

      let cmd = `hping3 -c ${count}`
      if (protocol === 'tcp') cmd += ` -${flags}`
      else if (protocol === 'udp') cmd += ' -2'
      else if (protocol === 'icmp') cmd += ' -1'
      cmd += ` -p ${port}`
      if (iface) cmd += ` -I ${iface}`
      cmd += ` ${target}`

      const result = run(cmd, 30000)
      if (result.error && result.stderr.includes('command not found')) {
        return { content: [{ type: 'text', text: 'hping3 not installed. Install: brew install hping' }], isError: true }
      }
      return { content: [{ type: 'text', text: `[+] hping3 probe ${target}:${port} (${protocol})\n\n${result.stdout || result.stderr}` }] }
    }

    case 'firewalk_scan': {
      const target = args.target
      const gateway = args.gateway
      const ports = args.ports || '1-100'
      const protocol = args.protocol || 'TCP'
      const timeout = args.timeout || 5

      const cmd = `firewalk -n -i ${protocol} -p${ports} -t${timeout} ${gateway} ${target}`
      const result = run(cmd, 120000)
      if (result.error && result.stderr.includes('command not found')) {
        return { content: [{ type: 'text', text: 'firewalk not installed. Install from https://github.com/pktnet/firewalk' }], isError: true }
      }
      return { content: [{ type: 'text', text: `[+] Firewalk ${gateway} -> ${target} ports:${ports}\n\n${result.stdout || result.stderr}` }] }
    }

    case 'wafw00f_detect': {
      const url = args.url
      const verbose = args.verbose || false
      const followRedirects = args.follow_redirects !== false

      let cmd = `wafw00f ${url}`
      if (verbose) cmd += ' -v'
      if (followRedirects) cmd += ' -r'
      else cmd += ' -n'

      const result = run(cmd, 60000)
      if (result.error && result.stderr.includes('command not found')) {
        return { content: [{ type: 'text', text: 'wafw00f not installed. Install: pip3 install wafw00f' }], isError: true }
      }
      return { content: [{ type: 'text', text: `[+] WAF detection for ${url}\n\n${result.stdout || result.stderr}` }] }
    }

    case 'nessus_info': {
      const info = {
        setup: `Nessus Essentials Setup:
1. Download from https://www.tenable.com/products/nessus/nessus-essentials
2. Register for a free activation code (covers up to 16 IPs)
3. Install and start Nessus service
4. Access web UI at https://localhost:8834
5. Enter activation code when prompted
6. Wait for plugin compilation (may take 15-30 min)

Firewall Testing with Nessus:
- Run "Basic Network Scan" against target IPs
- Check "Firewall Policy Auditing" under compliance
- Review "Port Scanners" family for firewall rules
- Use "Service Detection" to identify filtered ports`,
        scan_guide: `Nessus Scan Guide for Firewalls:
1. Create a new scan: Scans > Policies > New Policy
2. Select "Basic Network Scan"
3. Under "Discovery > Port Scanning":
   - Enable "TCP SYN scan" (stealth)
   - Enable "UDP scan" for UDP firewall rules
   - Set port range: 1-65535 for thorough testing
4. Under "Assessment > General":
   - Enable "Web Application Tests"
   - Enable "Firewall Policy Auditing"
5. Set targets (max 16 IPs on free tier)
6. Launch scan and review the "Firewall" section in results`,
        firewall_checks: `Nessus Firewall Misconfiguration Checks:
- Default credentials on firewall admin interfaces
- SNMP community strings (public/private)
- ACL rules via banner grabbing
- Unencrypted management protocols (Telnet, HTTP)
- SSL/TLS on firewall management interfaces
- Exposed admin panels
- ICMP timestamp responses
- DNS zone transfers
- SSH configuration on firewall devices`
      }
      const action = args.action || 'setup'
      return { content: [{ type: 'text', text: info[action] || info.setup }] }
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
