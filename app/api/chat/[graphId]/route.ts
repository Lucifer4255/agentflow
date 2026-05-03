import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { executeGraph, type ExecutionEvent } from '@/lib/executor'
import type { AgentNode } from '@/store/graphStore'
import type { Edge } from '@xyflow/react'
import { embed } from '@/lib/embeddings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ graphId: string }> },
) {
  const { graphId } = await params
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')

  const graph = await convex.query(api.graphs.getPublic, { id: graphId as Id<'graphs'> })
  if (!graph) return Response.json({ error: 'Not found or not public' }, { status: 404 })

  // Return session message history when sessionId is provided
  if (sessionId) {
    const conversation = await convex.query(api.memory.findConversation, { graphId, sessionId })
    if (!conversation) return Response.json({ messages: [] })
    const messages = await convex.query(api.memory.getRecent, {
      conversationId: conversation._id,
      limit: 40,
    })
    return Response.json({ messages: messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })) })
  }

  const nodes = graph.nodes as AgentNode[]
  const outputNodeId = nodes.find((n) => n.data?.isOutputNode)?.id ?? null
  const nodeLabels: Record<string, string> = {}
  for (const n of nodes) nodeLabels[n.id] = (n.data?.label as string) ?? n.id

  return Response.json({ name: graph.name, outputNodeId, nodeLabels, defaultModel: graph.defaultModel ?? null })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ graphId: string }> },
) {
  const { graphId } = await params

  let userMessage: string
  let bodyModel: string | undefined
  let sessionId: string | undefined
  try {
    const body = await request.json()
    userMessage = body.message ?? ''
    bodyModel = body.model || undefined
    sessionId = body.sessionId || undefined
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const graph = await convex.query(api.graphs.getPublic, { id: graphId as Id<'graphs'> })
  if (!graph) {
    return Response.json({ error: 'Not found or not public' }, { status: 404 })
  }

  // ── Memory: retrieve relevant + recent history ─────────────────────────────
  let conversationId: Id<'conversations'> | null = null
  let historyContext = ''
  let userEmbedding: number[] | null = null

  if (sessionId && process.env.GOOGLE_AI_API_KEY) {
    try {
      userEmbedding = await embed(userMessage)
      conversationId = await convex.mutation(api.memory.getOrCreate, { graphId, sessionId })

      const [relevant, recent] = await Promise.all([
        convex.action(api.memory.searchRelevant, {
          conversationId,
          embedding: userEmbedding,
          limit: 6,
        }),
        convex.query(api.memory.getRecent, { conversationId, limit: 8 }),
      ])

      // Merge relevant + recent, deduplicate by _id, sort by time
      const seen = new Set<string>()
      const merged: Array<{ _id: string; role: string; content: string; createdAt: number }> = []
      for (const msg of [...relevant, ...recent]) {
        if (!seen.has(msg._id)) {
          seen.add(msg._id)
          merged.push(msg)
        }
      }
      merged.sort((a, b) => a.createdAt - b.createdAt)

      if (merged.length > 0) {
        const lines = merged.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        historyContext = `[Conversation history]\n${lines.join('\n')}\n\n`
      }
    } catch (err) {
      console.warn('[memory] retrieval failed, continuing without history:', err)
    }
  }

  // ── Inject history + current message into the input node ──────────────────
  const rawNodes = graph.nodes as AgentNode[]
  const nodes = rawNodes.map((n) => {
    if (n.data?.isInputNode) {
      const fullInput = historyContext
        ? `${historyContext}[Current message]\nUser: ${userMessage}`
        : userMessage
      return { ...n, data: { ...n.data, userInput: fullInput } }
    }
    return n
  })
  const edges = graph.edges as Edge[]

  // ── Stream graph execution ─────────────────────────────────────────────────
  const encoder = new TextEncoder()
  let finalAnswer = ''
  const outputNodeId = rawNodes.find((n) => n.data?.isOutputNode)?.id ?? null

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ExecutionEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }
      try {
        const resolvedModel = bodyModel || (graph.defaultModel as string | undefined) || undefined
        for await (const event of executeGraph(nodes, edges, resolvedModel, request.signal)) {
          send(event)
          if (
            event.type === 'node_done' &&
            (outputNodeId ? event.nodeId === outputNodeId : true)
          ) {
            finalAnswer = event.output as string
          }
        }
      } catch (err) {
        send({ type: 'graph_error', error: err instanceof Error ? err.message : String(err) })
      } finally {
        controller.close()
        // Fire-and-forget: store turn after stream closes
        if (conversationId && userEmbedding && finalAnswer) {
          storeMemory(conversationId, userMessage, userEmbedding, finalAnswer).catch((err) =>
            console.warn('[memory] store failed:', err),
          )
        }
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

async function storeMemory(
  conversationId: Id<'conversations'>,
  userMessage: string,
  userEmbedding: number[],
  assistantAnswer: string,
) {
  const assistantEmbedding = await embed(assistantAnswer)
  await Promise.all([
    convex.mutation(api.memory.store, {
      conversationId,
      role: 'user',
      content: userMessage,
      embedding: userEmbedding,
    }),
    convex.mutation(api.memory.store, {
      conversationId,
      role: 'assistant',
      content: assistantAnswer,
      embedding: assistantEmbedding,
    }),
  ])
}
