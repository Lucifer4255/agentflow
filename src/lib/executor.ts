import type { AgentNode } from '@/store/graphStore'
import type { Edge } from '@xyflow/react'
import { runAgent } from '@/lib/agents/runAgent'
import { runRouter } from '@/lib/agents/runRouter'

export type ExecutionEvent =
  | { type: 'node_start'; nodeId: string }
  | { type: 'node_delta'; nodeId: string; text: string }
  | { type: 'node_done'; nodeId: string; output: string; inputTokens: number; outputTokens: number }
  | { type: 'node_error'; nodeId: string; error: string }
  | { type: 'router_decision'; nodeId: string; route: string; reasoning: string }
  | { type: 'graph_done' }
  | { type: 'graph_error'; error: string }

export async function* executeGraph(
  nodes: AgentNode[],
  edges: Edge[],
  modelOverride?: string,
  signal?: AbortSignal,
): AsyncGenerator<ExecutionEvent> {
  const outputs: Record<string, string> = {}
  const completed = new Set<string>()
  const skipped = new Set<string>()
  const routerDecisions = new Map<string, string>() // nodeId → selected route id

  const nodesById = new Map(nodes.map((n) => [n.id, n]))

  const incomingByTarget: Record<string, Edge[]> = {}
  for (const e of edges) {
    if (!nodesById.has(e.source) || !nodesById.has(e.target)) continue
    ;(incomingByTarget[e.target] ||= []).push(e)
  }

  // Cycle detection via DFS
  const visited = new Set<string>()
  const stack = new Set<string>()
  const hasCycle = (id: string): boolean => {
    if (stack.has(id)) return true
    if (visited.has(id)) return false
    visited.add(id)
    stack.add(id)
    for (const e of edges) {
      if (e.source === id && hasCycle(e.target)) return true
    }
    stack.delete(id)
    return false
  }
  for (const n of nodes) {
    if (hasCycle(n.id)) {
      yield { type: 'graph_error', error: 'Graph contains a cycle — cannot execute' }
      return
    }
  }

  // Compute which nodes are ready to run given current state
  const getFrontier = (): string[] => {
    const result: string[] = []
    for (const node of nodes) {
      if (completed.has(node.id) || skipped.has(node.id)) continue
      const incoming = incomingByTarget[node.id] || []

      // If any upstream router has made a decision that excludes this node → skip it
      const excluded = incoming.some((e) => {
        const src = nodesById.get(e.source)
        if (src?.type !== 'routerNode') return false
        if (!completed.has(e.source)) return false
        return routerDecisions.get(e.source) !== e.sourceHandle
      })
      if (excluded) {
        skipped.add(node.id)
        continue
      }

      // Ready when all incoming sources are resolved (completed or skipped)
      const allResolved = incoming.every(
        (e) => completed.has(e.source) || skipped.has(e.source),
      )
      if (allResolved) result.push(node.id)
    }
    return result
  }

  let frontier = getFrontier()

  while (frontier.length > 0) {
    if (signal?.aborted) return

    const queue: ExecutionEvent[] = []
    let wake: (() => void) | null = null
    const push = (e: ExecutionEvent) => {
      queue.push(e)
      const w = wake; wake = null; w?.()
    }

    for (const id of frontier) push({ type: 'node_start', nodeId: id })

    let remaining = frontier.length
    let levelHadError = false

    for (const id of frontier) {
      const node = nodesById.get(id)!
      const incoming = incomingByTarget[id] || []

      // Build upstream context from completed (non-skipped) sources only
      const upstream = incoming
        .filter((e) => completed.has(e.source))
        .map((e) => {
          const src = nodesById.get(e.source)
          return `[${src?.data.label ?? e.source} output]:\n${outputs[e.source] ?? ''}`
        })
        .join('\n\n')

      if (node.type === 'routerNode') {
        runRouter(node.data, upstream, modelOverride, signal)
          .then((res) => {
            routerDecisions.set(id, res.route)
            const output = `Route: ${res.route}\nReasoning: ${res.reasoning}`
            outputs[id] = output
            push({ type: 'router_decision', nodeId: id, route: res.route, reasoning: res.reasoning })
            push({ type: 'node_done', nodeId: id, output, inputTokens: res.inputTokens, outputTokens: res.outputTokens })
          })
          .catch((err) => {
            levelHadError = true
            push({ type: 'node_error', nodeId: id, error: err instanceof Error ? err.message : String(err) })
          })
          .finally(() => { remaining--; const w = wake; wake = null; w?.() })
      } else {
        runAgent(node.data, upstream, modelOverride, {
          signal,
          onDelta: (text) => push({ type: 'node_delta', nodeId: id, text }),
        })
          .then((res) => {
            outputs[id] = res.text
            push({ type: 'node_done', nodeId: id, output: res.text, inputTokens: res.inputTokens, outputTokens: res.outputTokens })
          })
          .catch((err) => {
            levelHadError = true
            push({ type: 'node_error', nodeId: id, error: err instanceof Error ? err.message : String(err) })
          })
          .finally(() => { remaining--; const w = wake; wake = null; w?.() })
      }
    }

    while (remaining > 0 || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => { wake = resolve })
        continue
      }
      const event = queue.shift()!
      // Mark node as completed when done
      if (event.type === 'node_done') completed.add(event.nodeId)
      if (event.type === 'node_error') { completed.add(event.nodeId) }
      yield event
    }

    if (levelHadError) return

    frontier = getFrontier()
  }

  yield { type: 'graph_done' }
}
