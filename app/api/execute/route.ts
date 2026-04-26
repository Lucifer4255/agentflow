import { executeGraph, type ExecutionEvent } from '@/lib/executor'
import type { AgentNode } from '@/store/graphStore'
import type { Edge } from '@xyflow/react'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ExecuteBody {
  nodes: AgentNode[]
  edges: Edge[]
  model?: string
}

export async function POST(request: Request) {
  let body: ExecuteBody
  try {
    body = (await request.json()) as ExecuteBody
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { nodes, edges, model } = body
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return Response.json({ error: 'nodes and edges required' }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ExecutionEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }
      try {
        for await (const event of executeGraph(nodes, edges, model)) {
          send(event)
        }
      } catch (err) {
        send({
          type: 'graph_error',
          error: err instanceof Error ? err.message : String(err),
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
