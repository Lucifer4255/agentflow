import { generateText, stepCountIs, dynamicTool, jsonSchema } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { AgentNodeData, OutputSchemaField } from '@/types'
import { pickBudgetModel } from '@/lib/models'
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

  // Input nodes are pure pass-through — no LLM call needed
  if (agentData.isInputNode) {
    const text = agentData.userInput ?? ''
    if (text) opts?.onDelta?.(text)
    return { text, inputTokens: 0, outputTokens: 0 }
  }

  const resolvedModel = agentData.model || modelOverride || 'anthropic/claude-sonnet-4.5'
  const hasTools = agentData.tools.length > 0
  const model = resolvedModel === '__budget__'
    ? pickBudgetModel(resolveBudgetLimit(agentData), hasTools)
    : resolvedModel

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

    const systemPrompt = buildSystemPrompt(agentData)
    const userMessage = buildUserMessage(agentData, upstreamContext)

    console.log(
      `[agent] start     | ${label} | ${model} | tools=${allDefs.length}` +
      (agentData.systemPrompt ? '' : ' | WARN: no system prompt'),
    )

    let stepCount = 0
    const toolsArg = Object.keys(tools).length > 0 ? tools : undefined

    const result = await generateText({
      model: openrouter.chat(model),
      system: systemPrompt,
      prompt: userMessage,
      tools: toolsArg,
      stopWhen: stepCountIs(10),
      abortSignal: opts?.signal,
      onStepFinish: (step) => {
        stepCount++
        // Emit tool calls as they happen
        for (const call of step.toolCalls ?? []) {
          const input = (call as { input?: unknown; args?: unknown }).input ?? (call as { args?: unknown }).args
          const argsPreview = formatArgsPreview(input as Record<string, unknown>)
          opts?.onDelta?.(`\`${call.toolName}\`${argsPreview}\n`)
        }
        // Emit tool results (trimmed)
        for (const res of step.toolResults ?? []) {
          const raw = (res as { output?: unknown; result?: unknown }).output ?? (res as { result?: unknown }).result
          const str = String(raw)
          const preview = str.slice(0, 400).replace(/\n+/g, ' ')
          opts?.onDelta?.(`> ${preview}${str.length > 400 ? '…' : ''}\n\n`)
        }
      },
    })

    const { text, usage } = result

    console.log(
      `[agent] done      | ${label}` +
      ` | in=${usage.inputTokens ?? 0} out=${usage.outputTokens ?? 0}` +
      ` | steps=${stepCount}`,
    )

    if (!text) {
      console.warn(`[agent] EMPTY     | ${label} | model=${model}`)
    }

    // Emit separator before final response if tool steps were shown
    if (stepCount > 1 && text) opts?.onDelta?.('\n---\n')
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

// ─── Budget routing ───────────────────────────────────────────────────────────

// Returns max $/1M input tokens budget based on node complexity.
// Simple nodes (no tools, small schema) → ultra-cheap.
// Nodes with tools or large schemas → allow slightly more capable models.
function resolveBudgetLimit(agentData: AgentNodeData): number {
  const hasTools = agentData.tools.length > 0
  const schemaSize = (agentData.outputSchema?.length ?? 0) + (agentData.inputSchema?.length ?? 0)
  const isComplex = hasTools || schemaSize > 4

  if (isComplex) return 0.15  // up to MiniMax M2.5 / Llama 4 Maverick tier
  return 0.10                 // up to Gemini Flash / Llama 3.3 70B tier
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatArgsPreview(args: Record<string, unknown>): string {
  const entries = Object.entries(args)
  if (entries.length === 0) return ''
  const parts = entries.map(([k, v]) => {
    const val = typeof v === 'string' ? `"${v.slice(0, 80)}${v.length > 80 ? '…' : ''}"` : String(v).slice(0, 80)
    return `${k}: ${val}`
  })
  return ` · ${parts.join(' · ')}`
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(agentData: AgentNodeData): string {
  const base = agentData.systemPrompt ?? ''

  if (!agentData.outputSchema?.length) return base

  const schemaGuide = buildSchemaGuide(agentData.outputSchema)
  return base
    ? `${base}\n\n${schemaGuide}`
    : schemaGuide
}

function buildSchemaGuide(fields: OutputSchemaField[]): string {
  const lines = fields.map((f) => {
    const typeHint = f.type === 'string[]' ? 'bullet list' : f.type
    return `- **${f.key}** (${typeHint})${f.description ? `: ${f.description}` : ''}`
  })
  return (
    `Structure your response using these sections:\n${lines.join('\n')}\n\n` +
    `Use markdown bold headers for each section name.`
  )
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
      `Now complete your task.`
    )
  }

  return `Context from previous agents:\n\n${upstreamContext}\n\nNow complete your task.`
}
