import { useGraphStore } from '@/store/graphStore'
import type { ExecutionEvent } from '@/lib/executor'

export async function runGraph(model?: string) {
  const state = useGraphStore.getState()
  if (state.running || state.nodes.length === 0) return

  const controller = new AbortController()
  state.beginRun(() => controller.abort())

  try {
    const res = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: state.nodes, edges: state.edges, model }),
      signal: controller.signal,
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      useGraphStore.getState().setError('__graph__', text || 'Execution failed')
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const event = JSON.parse(line) as ExecutionEvent
          handleEvent(event)
        } catch {
          // malformed line — skip
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      // user stopped the run — not an error
    } else {
      useGraphStore.getState().setError(
        '__graph__',
        err instanceof Error ? err.message : String(err),
      )
    }
  } finally {
    useGraphStore.getState().endRun()
  }
}

function handleEvent(event: ExecutionEvent) {
  const store = useGraphStore.getState()
  switch (event.type) {
    case 'node_start':
      store.setCurrentNode(event.nodeId)
      break
    case 'node_done':
      store.setOutput(event.nodeId, event.output)
      break
    case 'node_error':
      store.setError(event.nodeId, event.error)
      break
    case 'graph_done':
      store.setCurrentNode(null)
      break
    case 'graph_error':
      store.setError('__graph__', event.error)
      break
  }
}
