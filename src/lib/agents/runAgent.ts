import { streamText, stepCountIs, dynamicTool, jsonSchema } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { AgentNodeData } from '@/types'
import {
  buildBuiltinToolDefinitions,
  executeBuiltinTool,
} from '@/lib/tools'
import {
  callMCPTool,
  closeMCP,
  connectMCP,
  type MCPConnection,
} from '@/lib/mcp/mcpClient'

const MAX_STEPS = 10

export interface RunAgentOptions {
  onDelta?: (text: string) => void
  signal?: AbortSignal
}

export interface RunAgentResult {
  text: string
  inputTokens: number
  outputTokens: number
}

export async function runAgent(
  agentData: AgentNodeData,
  upstreamContext: string,
  modelOverride?: string,
  opts?: RunAgentOptions,
): Promise<RunAgentResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

  const openrouter = createOpenRouter({ apiKey })
  const mcpConnections: MCPConnection[] = []
  const mcpToolToConnection = new Map<string, MCPConnection>()

  try {
    const mcpConfigs = agentData.tools.filter((t) => t.type === 'mcp' && t.mcpServerUrl)
    const connections = await Promise.all(
      mcpConfigs.map((cfg) => {
        const key =
          cfg.mcpApiKey === '__env__' ? process.env.EXA_API_KEY : cfg.mcpApiKey
        return connectMCP(cfg.mcpServerUrl!, key, cfg.mcpServerName || 'mcp')
      }),
    )
    for (const conn of connections) {
      mcpConnections.push(conn)
      for (const t of conn.tools) mcpToolToConnection.set(t.function.name, conn)
    }

    const builtinDefs = buildBuiltinToolDefinitions(agentData.tools)
    const mcpDefs = mcpConnections.flatMap((c) => c.tools)
    const allDefs = [...builtinDefs, ...mcpDefs]

    const tools: Record<string, ReturnType<typeof dynamicTool>> = {}
    for (const def of allDefs) {
      const name = def.function.name
      tools[name] = dynamicTool({
        description: def.function.description,
        inputSchema: jsonSchema(def.function.parameters as Record<string, unknown>),
        execute: async (args: unknown) => {
          const argRecord = (args ?? {}) as Record<string, unknown>
          const mcpConn = mcpToolToConnection.get(name)
          if (mcpConn) return await callMCPTool(mcpConn.client, name, argRecord)
          return await executeBuiltinTool(name, argRecord, agentData.tools)
        },
      })
    }

    const userMessage =
      agentData.isInputNode && agentData.userInput
        ? agentData.userInput
        : upstreamContext
          ? `Context from previous agents:\n\n${upstreamContext}\n\nNow complete your task.`
          : 'Begin your task.'

    const model = agentData.model || modelOverride || 'anthropic/claude-sonnet-4-5'

    const result = streamText({
      model: openrouter.chat(model),
      system: agentData.systemPrompt,
      prompt: userMessage,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      stopWhen: stepCountIs(MAX_STEPS),
      abortSignal: opts?.signal,
      maxOutputTokens: model.includes('free') ? 1024 : 4096,
    })

    for await (const chunk of result.textStream) {
      if (chunk) opts?.onDelta?.(chunk)
    }

    const [text, totalUsage] = await Promise.all([result.text, result.totalUsage])
    return {
      text,
      inputTokens: totalUsage.inputTokens ?? 0,
      outputTokens: totalUsage.outputTokens ?? 0,
    }
  } finally {
    await closeMCP(mcpConnections)
  }
}
