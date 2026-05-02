import { generateText, Output, stepCountIs, dynamicTool, jsonSchema } from 'ai'
import { z } from 'zod'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { AgentNodeData, OutputSchemaField } from '@/types'
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

  const label = agentData.label ?? 'unknown'
  const model = agentData.model || modelOverride || 'anthropic/claude-sonnet-4-5'

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
          console.log(`[agent] tool_call  | ${label} | ${name} | args=${JSON.stringify(argRecord).slice(0, 200)}`)
          try {
            const result = mcpConn
              ? await callMCPTool(mcpConn.client, name, argRecord)
              : await executeBuiltinTool(name, argRecord, agentData.tools)
            console.log(`[agent] tool_result | ${label} | ${name} | result=${String(result).slice(0, 300)}`)
            return result
          } catch (err) {
            console.error(`[agent] tool_error  | ${label} | ${name} | error=${err}`)
            throw err
          }
        },
      })
    }

    const userMessage = buildUserMessage(agentData, upstreamContext)

    const outputSchema = buildOutputSchema(agentData.outputSchema)
    const usingDefault = !agentData.outputSchema?.length

    console.log(
      `[agent] start     | ${label} | ${model} | tools=${allDefs.length} | schema=${usingDefault ? 'default' : 'custom'}` +
      (agentData.systemPrompt ? '' : ' | WARN: no system prompt'),
    )

    const result = await generateText({
      model: openrouter.chat(model),
      system: agentData.systemPrompt,
      prompt: userMessage,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      stopWhen: stepCountIs(MAX_STEPS),
      abortSignal: opts?.signal,
      output: Output.object({ schema: outputSchema }),
    })

    const { output, usage, steps, finishReason } = result

    console.log(
      `[agent] done      | ${label} | finish=${finishReason}` +
      ` | in=${usage.inputTokens ?? 0} out=${usage.outputTokens ?? 0}` +
      ` | steps=${steps.length}`,
    )

    const text = formatOutput(output as Record<string, unknown>)

    if (!text) {
      console.warn(`[agent] EMPTY     | ${label} | model=${model} | output=${JSON.stringify(output)}`)
    }

    // Emit as a single delta (no streaming with structured output)
    if (text) opts?.onDelta?.(text)

    return {
      text,
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    }
  } finally {
    await closeMCP(mcpConnections)
  }
}

// ─── User message builder ─────────────────────────────────────────────────────

function buildUserMessage(agentData: AgentNodeData, upstreamContext: string): string {
  if (agentData.isInputNode && agentData.userInput) return agentData.userInput
  if (!upstreamContext) return 'Begin your task.'

  if (agentData.inputSchema?.length) {
    const fieldList = agentData.inputSchema
      .map((f) => `- ${f.key} (${f.type})${f.description ? `: ${f.description}` : ''}`)
      .join('\n')
    return (
      `The following context was provided by upstream agents.\n` +
      `Extract the relevant information for these expected input fields:\n\n` +
      `${fieldList}\n\n` +
      `Context:\n${upstreamContext}\n\n` +
      `Now complete your task using the extracted information.`
    )
  }

  return `Context from previous agents:\n\n${upstreamContext}\n\nNow complete your task.`
}

// ─── Output schema helpers ────────────────────────────────────────────────────

const DEFAULT_OUTPUT_SCHEMA = z.object({
  response: z.string().describe("The agent's complete response to the task"),
  keyPoints: z.array(z.string()).describe('3–5 key points, findings, or conclusions'),
})

function buildOutputSchema(fields?: OutputSchemaField[]): z.ZodObject<z.ZodRawShape> {
  if (!fields || fields.length === 0) return DEFAULT_OUTPUT_SCHEMA

  const shape: Record<string, z.ZodTypeAny> = {}
  for (const f of fields) {
    let zodType: z.ZodTypeAny
    switch (f.type) {
      case 'number':    zodType = z.number(); break
      case 'boolean':   zodType = z.boolean(); break
      case 'string[]':  zodType = z.array(z.string()); break
      default:          zodType = z.string()
    }
    shape[f.key] = f.description ? zodType.describe(f.description) : zodType
  }
  return z.object(shape) as z.ZodObject<z.ZodRawShape>
}

function formatOutput(output: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(output)) {
    if (Array.isArray(value) && value.length > 0) {
      // Arrays shown as bullet lists without the key label if it's 'keyPoints'
      if (key !== 'keyPoints') parts.push(`**${key}:**`)
      for (const item of value) parts.push(`• ${String(item)}`)
    } else if (typeof value === 'string' && value) {
      // Main 'response' field goes first without label
      if (key === 'response') {
        parts.unshift(value)
      } else {
        parts.push(`**${key}:** ${value}`)
      }
    } else if (value !== null && value !== undefined && typeof value !== 'object') {
      parts.push(`**${key}:** ${String(value)}`)
    }
  }
  return parts.join('\n')
}
