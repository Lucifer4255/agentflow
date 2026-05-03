import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { AgentNodeData } from '@/types'
import { pickBudgetModel } from '@/lib/models'

export interface RunRouterResult {
  route: string
  reasoning: string
  inputTokens: number
  outputTokens: number
}

export async function runRouter(
  routerData: AgentNodeData,
  upstreamContext: string,
  modelOverride?: string,
  signal?: AbortSignal,
): Promise<RunRouterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

  const routes = routerData.routes ?? []
  if (routes.length === 0) throw new Error('Router node has no routes defined')

  const openrouter = createOpenRouter({ apiKey })
  const resolvedModel = routerData.model || modelOverride || 'anthropic/claude-sonnet-4.5'
  // Routing is a simple classification task — use a cheap model in budget mode
  const model = resolvedModel === '__budget__'
    ? pickBudgetModel(0.10)
    : resolvedModel

  const routeList = routes
    .map((r) => `- ${r.id}: ${r.description}`)
    .join('\n')

  const systemPrompt =
    (routerData.systemPrompt ? routerData.systemPrompt + '\n\n' : '') +
    `You are a router. Read the user message and select the single most appropriate route.\n\n` +
    `Available routes:\n${routeList}\n\n` +
    `Reply with the route id and a one-sentence reasoning.`

  const schema = z.object({
    route: z.enum(routes.map((r) => r.id) as [string, ...string[]]).describe('The selected route id'),
    reasoning: z.string().describe('One sentence explaining why this route was chosen'),
  })

  const result = await generateText({
    model: openrouter.chat(model),
    system: systemPrompt,
    prompt: upstreamContext || 'No input provided.',
    abortSignal: signal,
    output: Output.object({ schema }),
  })

  const output = result.output as { route: string; reasoning: string }

  console.log(
    `[router] ${routerData.label} → route="${output.route}" reason="${output.reasoning}"` +
    ` | in=${result.usage.inputTokens} out=${result.usage.outputTokens}`,
  )

  return {
    route: output.route,
    reasoning: output.reasoning,
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
  }
}
