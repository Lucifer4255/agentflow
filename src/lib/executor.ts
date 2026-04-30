import type { AgentNode } from '@/store/graphStore'
import type { Edge } from '@xyflow/react'
import { runAgent } from '@/lib/agents/runAgent'

export type ExecutionEvent =
  | { type: 'node_start'; nodeId: string }
  | { type: 'node_delta'; nodeId: string; text: string }
  | {
      type: 'node_done'
      nodeId: string
      output: string
      inputTokens: number
      outputTokens: number
    }
  | { type: 'node_error'; nodeId: string; error: string }
  | { type: 'graph_done' }
  | { type: 'graph_error'; error: string }

function topologicalLevels(nodes: AgentNode[], edges: Edge[]): string[][] {
  const inDegree: Record<string, number> = {}
  const adj: Record<string, string[]> = {}
  for (const n of nodes) {
    inDegree[n.id] = 0
    adj[n.id] = []
  }
  for (const e of edges) {
    if (!(e.source in inDegree) || !(e.target in inDegree)) continue
    adj[e.source].push(e.target)
    inDegree[e.target]++
  }

  const levels: string[][] = []
  let frontier = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id)
  const seen = new Set<string>(frontier)

  while (frontier.length > 0) {
    levels.push(frontier)
    const next: string[] = []
    for (const id of frontier) {
      for (const neighbor of adj[id]) {
        inDegree[neighbor]--
        if (inDegree[neighbor] === 0 && !seen.has(neighbor)) {
          seen.add(neighbor)
          next.push(neighbor)
        }
      }
    }
    frontier = next
  }

  if (seen.size !== nodes.length) {
    throw new Error('Graph contains a cycle — cannot execute')
  }
  return levels
}

export async function* executeGraph(
  nodes: AgentNode[],
  edges: Edge[],
  modelOverride?: string,
  signal?: AbortSignal,
): AsyncGenerator<ExecutionEvent> {
  const outputs: Record<string, string> = {}
  let levels: string[][]
  try {
    levels = topologicalLevels(nodes, edges)
  } catch (err) {
    yield { type: 'graph_error', error: err instanceof Error ? err.message : String(err) }
    return
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const incomingByTarget: Record<string, Edge[]> = {}
  for (const e of edges) {
    ;(incomingByTarget[e.target] ||= []).push(e)
  }

  for (const level of levels) {
    // Queue interleaves deltas + completions across parallel nodes
    const queue: ExecutionEvent[] = []
    let wake: (() => void) | null = null
    const push = (e: ExecutionEvent) => {
      queue.push(e)
      const w = wake
      wake = null
      w?.()
    }

    for (const id of level) push({ type: 'node_start', nodeId: id })

    let remaining = level.length
    let levelHadError = false

    for (const id of level) {
      const node = nodesById.get(id)!
      const incoming = incomingByTarget[id] || []
      const upstream = incoming
        .map((e) => {
          const src = nodesById.get(e.source)
          return `[${src?.data.label ?? e.source} output]:\n${outputs[e.source] ?? ''}`
        })
        .join('\n\n')

      runAgent(node.data, upstream, modelOverride, {
        signal,
        onDelta: (text) => push({ type: 'node_delta', nodeId: id, text }),
      })
        .then((res) => {
          outputs[id] = res.text
          push({
            type: 'node_done',
            nodeId: id,
            output: res.text,
            inputTokens: res.inputTokens,
            outputTokens: res.outputTokens,
          })
        })
        .catch((err) => {
          levelHadError = true
          push({
            type: 'node_error',
            nodeId: id,
            error: err instanceof Error ? err.message : String(err),
          })
        })
        .finally(() => {
          remaining--
          const w = wake
          wake = null
          w?.()
        })
    }

    while (remaining > 0 || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          wake = resolve
        })
        continue
      }
      yield queue.shift()!
    }

    if (levelHadError) return
  }

  yield { type: 'graph_done' }
}
