import { useGraphStore } from '@/store/graphStore'
import type { ExecutionEvent } from '@/lib/executor'

type RunEventKind = 'node_start' | 'node_delta' | 'node_end' | 'node_error' | 'tool_call'

export interface PersistedRunEvent {
  nodeId: string
  kind: RunEventKind
  text: string | null
  inputTokens: number | null
  outputTokens: number | null
  at: number
}

export interface RunGraphPersistence {
  startRun: () => Promise<string>
  appendEvents: (runId: string, events: PersistedRunEvent[]) => Promise<void>
  finishRun: (
    runId: string,
    status: 'done' | 'error' | 'stopped',
    totalInputTokens: number,
    totalOutputTokens: number,
    error: string | null,
  ) => Promise<void>
}

const FLUSH_MS = 250

export async function runGraph(model?: string, persistence?: RunGraphPersistence) {
  const state = useGraphStore.getState()
  if (state.running || state.nodes.length === 0) return

  const controller = new AbortController()
  state.beginRun(() => controller.abort())

  let runId: string | null = null
  let totalIn = 0
  let totalOut = 0
  let finalStatus: 'done' | 'error' | 'stopped' = 'done'
  let finalError: string | null = null

  let buffer: PersistedRunEvent[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let flushing: Promise<void> = Promise.resolve()

  const flush = async () => {
    if (!persistence || !runId || buffer.length === 0) return
    const batch = buffer
    buffer = []
    flushing = flushing
      .then(() => persistence.appendEvents(runId!, batch))
      .catch((err) => console.warn('appendEvents failed', err))
    return flushing
  }

  const scheduleFlush = () => {
    if (flushTimer) return
    flushTimer = setTimeout(() => {
      flushTimer = null
      flush()
    }, FLUSH_MS)
  }

  const recordEvent = (e: PersistedRunEvent) => {
    if (!persistence) return
    buffer.push(e)
    scheduleFlush()
  }

  if (persistence) {
    try {
      runId = await persistence.startRun()
      console.log('[runGraph] run started | runId:', runId)
    } catch (err) {
      console.error('[runGraph] startRun failed — running without persistence:', err)
    }
  }

  try {
    const res = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: state.nodes, edges: state.edges, model }),
      signal: controller.signal,
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      const msg = text || 'Execution failed'
      useGraphStore.getState().setError('__graph__', msg)
      finalStatus = 'error'
      finalError = msg
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let leftover = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      leftover += decoder.decode(value, { stream: true })

      const lines = leftover.split('\n')
      leftover = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const event = JSON.parse(line) as ExecutionEvent
          handleEvent(event)

          // Persist
          const at = Date.now()
          switch (event.type) {
            case 'node_start':
              recordEvent({
                nodeId: event.nodeId,
                kind: 'node_start',
                text: null,
                inputTokens: null,
                outputTokens: null,
                at,
              })
              break
            case 'node_delta':
              recordEvent({
                nodeId: event.nodeId,
                kind: 'node_delta',
                text: event.text,
                inputTokens: null,
                outputTokens: null,
                at,
              })
              break
            case 'node_done':
              totalIn += event.inputTokens
              totalOut += event.outputTokens
              recordEvent({
                nodeId: event.nodeId,
                kind: 'node_end',
                text: event.output,
                inputTokens: event.inputTokens,
                outputTokens: event.outputTokens,
                at,
              })
              break
            case 'router_decision':
              recordEvent({
                nodeId: event.nodeId,
                kind: 'node_end',
                text: `Route: ${event.route} — ${event.reasoning}`,
                inputTokens: null,
                outputTokens: null,
                at,
              })
              break
            case 'node_error':
              finalStatus = 'error'
              finalError = event.error
              recordEvent({
                nodeId: event.nodeId,
                kind: 'node_error',
                text: event.error,
                inputTokens: null,
                outputTokens: null,
                at,
              })
              break
            case 'graph_error':
              finalStatus = 'error'
              finalError = event.error
              break
          }
        } catch {
          // malformed line
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      finalStatus = 'stopped'
    } else {
      const msg = err instanceof Error ? err.message : String(err)
      useGraphStore.getState().setError('__graph__', msg)
      finalStatus = 'error'
      finalError = msg
    }
  } finally {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    await flush()
    await flushing
    if (persistence && runId) {
      try {
        await persistence.finishRun(runId, finalStatus, totalIn, totalOut, finalError)
      } catch (err) {
        console.warn('finishRun failed', err)
      }
    }
    useGraphStore.getState().endRun()
  }
}

function handleEvent(event: ExecutionEvent) {
  const store = useGraphStore.getState()
  switch (event.type) {
    case 'node_start':
      store.setCurrentNode(event.nodeId)
      break
    case 'node_delta':
      store.appendOutput(event.nodeId, event.text)
      break
    case 'router_decision':
      store.setOutput(event.nodeId, `→ ${event.route}`)
      store.updateNodeData(event.nodeId, { selectedRoute: event.route })
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
