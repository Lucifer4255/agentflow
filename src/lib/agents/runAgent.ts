import type { AgentNodeData } from '@/types'
import {
  buildBuiltinToolDefinitions,
  executeBuiltinTool,
  type OpenAIToolDef,
} from '@/lib/tools'
import {
  callMCPTool,
  closeMCP,
  connectMCP,
  type MCPConnection,
} from '@/lib/mcp/mcpClient'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MAX_ITERATIONS = 10

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

export async function runAgent(
  agentData: AgentNodeData,
  upstreamContext: string,
  modelOverride?: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

  const mcpConnections: MCPConnection[] = []
  const mcpToolToConnection = new Map<string, MCPConnection>()

  try {
    // Connect MCP servers in parallel
    const mcpConfigs = agentData.tools.filter((t) => t.type === 'mcp' && t.mcpServerUrl)
    const connections = await Promise.all(
      mcpConfigs.map((cfg) => {
        // Demo nodes use '__env__' as a sentinel — substitute the real key
        // server-side so client code never sees secrets.
        const key =
          cfg.mcpApiKey === '__env__'
            ? process.env.EXA_API_KEY
            : cfg.mcpApiKey
        return connectMCP(cfg.mcpServerUrl!, key, cfg.mcpServerName || 'mcp')
      }),
    )
    for (const conn of connections) {
      mcpConnections.push(conn)
      for (const tool of conn.tools) {
        mcpToolToConnection.set(tool.function.name, conn)
      }
    }

    const builtinTools = buildBuiltinToolDefinitions(agentData.tools)
    const mcpTools = mcpConnections.flatMap((c) => c.tools)
    const allTools: OpenAIToolDef[] = [...builtinTools, ...mcpTools]

    // Input nodes use the user-typed value as the prompt instead of upstream context
    const userMessage = agentData.isInputNode && agentData.userInput
      ? agentData.userInput
      : upstreamContext
        ? `Context from previous agents:\n\n${upstreamContext}\n\nNow complete your task.`
        : 'Begin your task.'

    const messages: ChatMessage[] = [
      { role: 'system', content: agentData.systemPrompt },
      { role: 'user', content: userMessage },
    ]

    const model = agentData.model || modelOverride || 'anthropic/claude-sonnet-4-5'

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://agentflow.dev',
          'X-Title': 'AgentFlow',
        },
        body: JSON.stringify({
          model,
          messages,
          tools: allTools.length > 0 ? allTools : undefined,
          max_tokens: model.includes('free') ? 1024 : 4096,
        }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`OpenRouter ${response.status}: ${text}`)
      }

      const data = await response.json()
      const choice = data.choices?.[0]
      if (!choice) throw new Error('OpenRouter returned no choices')

      const message = choice.message as ChatMessage
      const finishReason = choice.finish_reason

      if (finishReason === 'tool_calls' && message.tool_calls?.length) {
        messages.push(message)

        const toolResults = await Promise.all(
          message.tool_calls.map(async (call) => {
            const name = call.function.name
            let parsedArgs: Record<string, unknown> = {}
            try {
              parsedArgs = JSON.parse(call.function.arguments || '{}')
            } catch {
              parsedArgs = {}
            }

            let result: string
            try {
              const mcpConn = mcpToolToConnection.get(name)
              if (mcpConn) {
                result = await callMCPTool(mcpConn.client, name, parsedArgs)
              } else {
                result = await executeBuiltinTool(name, parsedArgs, agentData.tools)
              }
            } catch (err) {
              result = `Tool error: ${err instanceof Error ? err.message : String(err)}`
            }

            return {
              role: 'tool' as const,
              tool_call_id: call.id,
              content: result,
            }
          }),
        )

        messages.push(...toolResults)
        continue
      }

      // stop, length, content_filter, etc — return whatever we have
      return message.content || ''
    }

    throw new Error(`Agent exceeded ${MAX_ITERATIONS} tool-call iterations`)
  } finally {
    await closeMCP(mcpConnections)
  }
}
