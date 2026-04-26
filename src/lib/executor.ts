import type { AgentNode } from '@/store/graphStore'
import type { Edge } from '@xyflow/react'
import { runAgent } from '@/lib/agents/runAgent'

export type ExecutionEvent =
  | { type: 'node_start'; nodeId: string }
  | { type: 'node_done'; nodeId: string; output: string }
  | { type: 'node_error'; nodeId: string; error: string }
  | { type: 'graph_done' }
  | { type: 'graph_error'; error: string }

/**
 * Group nodes into levels via Kahn's algorithm. Nodes in the same level have
 * no dependencies on each other and can run concurrently.
 */
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
    // Yield start events first so UI lights all parallel nodes at once
    for (const id of level) yield { type: 'node_start', nodeId: id }

    const results = await Promise.all(
      level.map(async (id) => {
        const node = nodesById.get(id)!
        const incoming = incomingByTarget[id] || []
        const upstream = incoming
          .map((e) => {
            const src = nodesById.get(e.source)
            return `[${src?.data.label ?? e.source} output]:\n${outputs[e.source] ?? ''}`
          })
          .join('\n\n')

        try {
          const output = await runAgent(node.data, upstream, modelOverride)
          return { id, ok: true as const, output }
        } catch (err) {
          return {
            id,
            ok: false as const,
            error: err instanceof Error ? err.message : String(err),
          }
        }
      }),
    )

    let levelHadError = false
    for (const r of results) {
      if (r.ok) {
        outputs[r.id] = r.output
        yield { type: 'node_done', nodeId: r.id, output: r.output }
      } else {
        levelHadError = true
        yield { type: 'node_error', nodeId: r.id, error: r.error }
      }
    }
    if (levelHadError) return
  }

  yield { type: 'graph_done' }
}
