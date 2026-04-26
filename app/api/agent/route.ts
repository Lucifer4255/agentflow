import { runAgent } from '@/lib/agents/runAgent'
import type { AgentNodeData } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AgentBody {
  agent: AgentNodeData
  upstreamContext?: string
  model?: string
}

export async function POST(request: Request) {
  let body: AgentBody
  try {
    body = (await request.json()) as AgentBody
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.agent) {
    return Response.json({ error: 'agent required' }, { status: 400 })
  }

  try {
    const output = await runAgent(
      body.agent,
      body.upstreamContext || '',
      body.model,
    )
    return Response.json({ output })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
