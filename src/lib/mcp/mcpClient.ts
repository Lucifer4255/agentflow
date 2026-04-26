import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { OpenAIToolDef } from '@/lib/tools'

export interface MCPConnection {
  client: Client
  tools: OpenAIToolDef[]
  serverName: string
}

/**
 * Connect to an MCP server. Tries Streamable HTTP first (the modern transport
 * used by hosted MCP endpoints like Exa), falls back to SSE for legacy servers.
 *
 * Hosted MCP servers commonly accept auth as a query param (e.g. Exa's
 * ?exaApiKey=...) — we attach `apiKey` under that key by convention.
 */
export async function connectMCP(
  serverUrl: string,
  apiKey: string | undefined,
  serverName: string,
): Promise<MCPConnection> {
  const url = new URL(serverUrl)
  if (apiKey && !url.searchParams.has('exaApiKey')) {
    url.searchParams.set('exaApiKey', apiKey)
  }

  const client = new Client(
    { name: 'agentflow', version: '0.1.0' },
    { capabilities: {} },
  )

  try {
    const transport = new StreamableHTTPClientTransport(url)
    await client.connect(transport)
  } catch (err) {
    // Fallback to SSE for older MCP servers
    const transport = new SSEClientTransport(url)
    await client.connect(transport)
  }

  const { tools } = await client.listTools()

  const toolDefs: OpenAIToolDef[] = tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description || `MCP tool from ${serverName}`,
      parameters:
        (tool.inputSchema as Record<string, unknown>) ?? {
          type: 'object',
          properties: {},
        },
    },
  }))

  return { client, tools: toolDefs, serverName }
}

export async function callMCPTool(
  client: Client,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const result = await client.callTool({ name: toolName, arguments: args })
  const content = (result.content as Array<{ type: string; text?: string }>) || []
  const text = content
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text!)
    .join('\n')
  return text || JSON.stringify(result)
}

export async function closeMCP(connections: MCPConnection[]) {
  await Promise.allSettled(connections.map((c) => c.client.close()))
}
