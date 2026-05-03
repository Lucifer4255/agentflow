'use client'

import { useState, useRef, useEffect, use, useCallback } from 'react'
import {
  Loader2,
  ChevronDown,
  ArrowUp,
  PencilRuler,
  Check,
  SquarePen,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { MODEL_GROUPS } from '@/lib/models'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/cn'
import ReactMarkdown from 'react-markdown'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ThinkingStep {
  nodeId: string
  label: string
  content: string
  done: boolean
}

interface Message {
  role: 'user' | 'assistant'
  answer: string
  thinkingSteps: ThinkingStep[]
  streaming: boolean
}

interface GraphMeta {
  name: string
  outputNodeId: string | null
  nodeLabels: Record<string, string>
  defaultModel?: string
}

interface SessionEntry {
  sessionId: string
  createdAt: number
  preview: string
}

// ─── Session storage helpers ──────────────────────────────────────────────────

function sessionsKey(graphId: string) {
  return `agentflow:sessions:${graphId}`
}

function getStoredSessions(graphId: string): SessionEntry[] {
  try {
    const raw = localStorage.getItem(sessionsKey(graphId))
    return raw ? (JSON.parse(raw) as SessionEntry[]) : []
  } catch {
    return []
  }
}

function upsertSession(graphId: string, entry: SessionEntry) {
  const sessions = getStoredSessions(graphId)
  const idx = sessions.findIndex((s) => s.sessionId === entry.sessionId)
  if (idx === -1) {
    sessions.unshift(entry)
  } else {
    sessions[idx] = entry
  }
  localStorage.setItem(sessionsKey(graphId), JSON.stringify(sessions))
  return sessions
}

function initSession(graphId: string): string {
  const key = `agentflow:session:${graphId}`
  const stored = localStorage.getItem(key)
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem(key, id)
  return id
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function buildMessagesFromHistory(
  raw: { role: string; content: string; createdAt: number }[],
): Message[] {
  return raw.map((m) => ({
    role: m.role as 'user' | 'assistant',
    answer: m.content,
    thinkingSteps: [],
    streaming: false,
  }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage({ params }: { params: Promise<{ graphId: string }> }) {
  const { graphId } = use(params)

  const [meta, setMeta] = useState<GraphMeta | null>(null)
  const [metaError, setMetaError] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState<string>('openrouter/auto')

  // Session state
  const [sessionId, setSessionId] = useState<string>('')
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Init session from localStorage (client-only)
  useEffect(() => {
    const id = initSession(graphId)
    setSessionId(id)
    setSessions(getStoredSessions(graphId))
  }, [graphId])

  // Load graph metadata
  useEffect(() => {
    fetch(`/api/chat/${graphId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((m: GraphMeta) => {
        setMeta(m)
        if (m.defaultModel) setModel(m.defaultModel)
      })
      .catch(() => setMetaError(true))
  }, [graphId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  const loadSessionHistory = useCallback(
    async (sid: string) => {
      setLoadingHistory(true)
      setMessages([])
      try {
        const res = await fetch(`/api/chat/${graphId}?sessionId=${sid}`)
        if (res.ok) {
          const data = (await res.json()) as { messages: { role: string; content: string; createdAt: number }[] }
          setMessages(buildMessagesFromHistory(data.messages))
        }
      } catch {
        // silently ignore
      } finally {
        setLoadingHistory(false)
      }
    },
    [graphId],
  )

  const switchSession = useCallback(
    (sid: string) => {
      if (sid === sessionId) return
      setSessionId(sid)
      localStorage.setItem(`agentflow:session:${graphId}`, sid)
      loadSessionHistory(sid)
    },
    [sessionId, graphId, loadSessionHistory],
  )

  const newChat = useCallback(() => {
    const id = crypto.randomUUID()
    localStorage.setItem(`agentflow:session:${graphId}`, id)
    setSessionId(id)
    setMessages([])
    setInput('')
  }, [graphId])

  const send = async () => {
    const text = input.trim()
    if (!text || loading || !meta || !sessionId) return
    setInput('')
    setLoading(true)

    // Record session with preview on first message
    const isFirstMessage = messages.filter((m) => m.role === 'user').length === 0
    if (isFirstMessage) {
      const entry: SessionEntry = {
        sessionId,
        createdAt: Date.now(),
        preview: text.slice(0, 80),
      }
      const updated = upsertSession(graphId, entry)
      setSessions(updated)
    }

    const userMsg: Message = { role: 'user', answer: text, thinkingSteps: [], streaming: false }
    const assistantIdx = messages.length + 1
    setMessages((prev) => [
      ...prev,
      userMsg,
      { role: 'assistant', answer: '', thinkingSteps: [], streaming: true },
    ])

    const outputNodeId = meta.outputNodeId
    const nodeLabels = meta.nodeLabels
    const nodeContent: Record<string, string> = {}
    const finishedNodes: string[] = []

    const patchAssistant = (fn: (prev: Message) => Message) =>
      setMessages((msgs) => msgs.map((m, i) => (i === assistantIdx ? fn(m) : m)))

    try {
      const res = await fetch(`/api/chat/${graphId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, model, sessionId }),
      })

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => 'Request failed')
        patchAssistant((m) => ({ ...m, answer: err, streaming: false }))
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
            const event = JSON.parse(line)

            if (event.type === 'node_delta') {
              const nid: string = event.nodeId
              nodeContent[nid] = (nodeContent[nid] ?? '') + event.text
              const isOutput = outputNodeId ? nid === outputNodeId : false
              patchAssistant((m) => {
                if (isOutput) return { ...m, answer: nodeContent[nid] }
                const label = nodeLabels[nid] ?? nid
                const existing = m.thinkingSteps.find((s) => s.nodeId === nid)
                if (existing) {
                  return {
                    ...m,
                    thinkingSteps: m.thinkingSteps.map((s) =>
                      s.nodeId === nid ? { ...s, content: nodeContent[nid] } : s,
                    ),
                  }
                }
                return {
                  ...m,
                  thinkingSteps: [
                    ...m.thinkingSteps,
                    { nodeId: nid, label, content: nodeContent[nid], done: false },
                  ],
                }
              })
            } else if (event.type === 'node_done') {
              const nid: string = event.nodeId
              nodeContent[nid] = event.output as string
              finishedNodes.push(nid)
              const isOutput = outputNodeId ? nid === outputNodeId : false
              patchAssistant((m) => {
                if (isOutput) return { ...m, answer: nodeContent[nid] }
                const label = nodeLabels[nid] ?? nid
                const existing = m.thinkingSteps.find((s) => s.nodeId === nid)
                if (existing) {
                  return {
                    ...m,
                    thinkingSteps: m.thinkingSteps.map((s) =>
                      s.nodeId === nid ? { ...s, content: nodeContent[nid], done: true } : s,
                    ),
                  }
                }
                return {
                  ...m,
                  thinkingSteps: [
                    ...m.thinkingSteps,
                    { nodeId: nid, label, content: nodeContent[nid], done: true },
                  ],
                }
              })
            } else if (event.type === 'graph_error' || event.type === 'node_error') {
              patchAssistant((m) => ({
                ...m,
                answer: `Error: ${event.error as string}`,
                streaming: false,
              }))
            }
          } catch {
            // malformed line
          }
        }
      }

      if (!outputNodeId && finishedNodes.length > 0) {
        const lastId = finishedNodes[finishedNodes.length - 1]
        patchAssistant((m) => ({
          ...m,
          answer: nodeContent[lastId] ?? '',
          thinkingSteps: m.thinkingSteps.filter((s) => s.nodeId !== lastId),
          streaming: false,
        }))
      } else {
        patchAssistant((m) => ({ ...m, streaming: false }))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      patchAssistant((m) => ({ ...m, answer: msg, streaming: false }))
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (metaError) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-500">This workflow isn't available or hasn't been published.</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar */}
      <ChatSidebar
        open={sidebarOpen}
        sessions={sessions}
        activeSessionId={sessionId}
        graphName={meta?.name ?? ''}
        onNewChat={newChat}
        onSelect={switchSession}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-zinc-800/60 px-4">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-1 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
          <div className="h-4 w-4 rounded bg-gradient-to-br from-sky-500 to-violet-600" />
          <span className="text-[13px] font-medium text-zinc-500">
            {meta?.name ?? <span className="text-zinc-700">Loading…</span>}
          </span>
          <div className="ml-auto">
            <Link
              href="/builder"
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-[12px] text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
            >
              <PencilRuler className="h-3 w-3" />
              Builder
            </Link>
          </div>
        </header>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[680px] px-6">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32">
                <p
                  className="text-[28px] leading-snug text-zinc-600"
                  style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
                >
                  {meta?.name ?? ''}
                </p>
                <p className="mt-3 text-sm text-zinc-600">Send a message to begin.</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end py-6">
                      <div className="max-w-[80%] rounded-2xl bg-zinc-800/70 px-4 py-2.5 text-[15px] leading-relaxed text-zinc-200">
                        {msg.answer}
                      </div>
                    </div>
                  ) : (
                    <div className="pb-10 pt-2">
                      {(msg.thinkingSteps.length > 0 || (msg.streaming && !msg.answer)) && (
                        <ThinkingAccordion
                          steps={msg.thinkingSteps}
                          streaming={msg.streaming && !msg.answer}
                        />
                      )}
                      {msg.answer ? (
                        <div
                          className={cn(
                            'prose prose-zinc prose-invert max-w-none',
                            '[&>*:first-child]:mt-0',
                            'prose-p:text-[15px] prose-p:leading-[1.75] prose-p:text-zinc-200',
                            'prose-headings:font-semibold prose-headings:text-zinc-100 prose-headings:tracking-tight',
                            'prose-h1:text-2xl prose-h2:text-xl prose-h3:text-base',
                            'prose-strong:text-zinc-100 prose-strong:font-semibold',
                            'prose-em:text-zinc-300',
                            'prose-li:text-[15px] prose-li:leading-[1.75] prose-li:text-zinc-200',
                            'prose-ul:my-3 prose-ol:my-3',
                            'prose-code:text-[13px] prose-code:text-violet-300 prose-code:bg-zinc-800/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
                            'prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-xl prose-pre:text-[13px]',
                            'prose-blockquote:border-l-zinc-700 prose-blockquote:text-zinc-400',
                            'prose-hr:border-zinc-800',
                            'prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline',
                          )}
                          style={{ fontFamily: 'var(--font-newsreader), Georgia, serif' }}
                        >
                          <ReactMarkdown>{msg.answer}</ReactMarkdown>
                          {msg.streaming && (
                            <span className="relative -top-px ml-0.5 inline-block h-[1.1em] w-px animate-pulse bg-zinc-400 align-middle" />
                          )}
                        </div>
                      ) : msg.streaming ? null : (
                        <p className="text-sm text-zinc-600 italic">No response.</p>
                      )}
                    </div>
                  )}
                  {i < messages.length - 1 && msg.role === 'assistant' && (
                    <div className="h-px bg-zinc-800/50" />
                  )}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 pb-6 pt-3">
          <div className="mx-auto w-full max-w-[680px] px-6">
            <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900 transition-colors focus-within:border-zinc-600">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message…"
                rows={1}
                disabled={loading || !meta || loadingHistory}
                className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[15px] leading-relaxed text-zinc-100 placeholder-zinc-600 outline-none disabled:opacity-40"
                style={{ maxHeight: 200 }}
              />
              <div className="flex items-center justify-between px-2.5 pb-2.5">
                <ModelPicker value={model} onChange={setModel} disabled={loading} />
                <button
                  onClick={send}
                  disabled={!input.trim() || loading || !meta || loadingHistory}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition',
                    input.trim() && !loading && !loadingHistory
                      ? 'bg-zinc-100 text-zinc-900 hover:bg-white'
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed',
                  )}
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowUp className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-zinc-700">Powered by AgentFlow</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function ChatSidebar({
  open,
  sessions,
  activeSessionId,
  graphName,
  onNewChat,
  onSelect,
  onToggle,
}: {
  open: boolean
  sessions: SessionEntry[]
  activeSessionId: string
  graphName: string
  onNewChat: () => void
  onSelect: (sessionId: string) => void
  onToggle: () => void
}) {
  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 transition-all duration-200',
        open ? 'w-[240px]' : 'w-0 overflow-hidden border-r-0',
      )}
    >
      {/* Sidebar header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-800 px-3">
        <span className="flex-1 truncate text-[12px] font-medium text-zinc-400">
          {graphName || 'Chats'}
        </span>
        <button
          onClick={onNewChat}
          title="New chat"
          className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
        >
          <SquarePen className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onToggle}
          title="Close sidebar"
          className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <MessageSquare className="h-5 w-5 text-zinc-700" />
            <p className="text-[11px] text-zinc-600">No chats yet</p>
          </div>
        ) : (
          sessions.map((s) => (
            <button
              key={s.sessionId}
              onClick={() => onSelect(s.sessionId)}
              className={cn(
                'group flex w-full flex-col gap-0.5 rounded-md px-3 py-2.5 text-left transition',
                s.sessionId === activeSessionId
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200',
              )}
            >
              <span className="truncate text-[12px] font-medium leading-snug">
                {s.preview || 'New chat'}
              </span>
              <span className="text-[10px] text-zinc-600">{formatRelativeTime(s.createdAt)}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  )
}

// ─── Provider color system ────────────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  Router:    'bg-zinc-400',
  Anthropic: 'bg-orange-500',
  OpenAI:    'bg-emerald-500',
  Google:    'bg-sky-500',
  DeepSeek:  'bg-violet-500',
  Qwen:      'bg-indigo-500',
  Kimi:      'bg-fuchsia-500',
  GLM:       'bg-cyan-500',
  MiniMax:   'bg-pink-500',
  Meta:      'bg-blue-500',
  Mistral:   'bg-red-500',
  ByteDance: 'bg-amber-500',
  Other:     'bg-zinc-500',
}

// ─── Model picker ─────────────────────────────────────────────────────────────

function ModelPicker({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (m: string) => void
  disabled?: boolean
}) {
  const currentGroup = MODEL_GROUPS.find((g) => g.models.includes(value))
  const groupLabel = currentGroup?.label ?? 'Other'
  const dotColor = PROVIDER_COLORS[groupLabel] ?? 'bg-zinc-500'
  const shortName = value.includes('/') ? value.split('/')[1] : value

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          'group inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition',
          'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200',
          'data-[popup-open]:bg-zinc-800/80 data-[popup-open]:text-zinc-100',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        <span className={cn('h-2 w-2 rounded-full ring-2 ring-zinc-900', dotColor)} />
        <span className="font-mono tracking-tight">{shortName}</span>
        <ChevronDown className="h-3 w-3 text-zinc-600 transition-transform group-data-[popup-open]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={6}
        className="!w-[320px] !max-h-[420px] !bg-zinc-900 !text-zinc-100 !ring-zinc-700/60"
      >
        <div className="px-2 pt-1.5 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Choose model
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            Used as default for nodes without their own model
          </p>
        </div>
        <DropdownMenuSeparator className="!bg-zinc-800" />

        {MODEL_GROUPS.map((group, idx) => (
          <DropdownMenuGroup key={group.label}>
            <DropdownMenuLabel className="!flex !items-center !gap-1.5 !px-2 !pt-2 !pb-1 !text-[10px] !font-semibold !uppercase !tracking-widest !text-zinc-500">
              <span className={cn('h-1.5 w-1.5 rounded-full', PROVIDER_COLORS[group.label])} />
              {group.label}
            </DropdownMenuLabel>
            {group.models.map((m) => {
              const selected = m === value
              const display = m.split('/')[1]
              return (
                <DropdownMenuItem
                  key={m}
                  onClick={() => onChange(m)}
                  className={cn(
                    '!flex !items-center !gap-2 !rounded-md !px-2 !py-1.5 !text-[12px] !font-mono !cursor-pointer',
                    selected
                      ? '!bg-zinc-800 !text-zinc-100'
                      : '!text-zinc-400 hover:!bg-zinc-800/60 hover:!text-zinc-100',
                  )}
                >
                  <span className="flex-1 truncate">{display}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                </DropdownMenuItem>
              )
            })}
            {idx < MODEL_GROUPS.length - 1 && (
              <DropdownMenuSeparator className="!my-1 !bg-zinc-800/40" />
            )}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Thinking accordion ───────────────────────────────────────────────────────

function ThinkingAccordion({ steps, streaming }: { steps: ThinkingStep[]; streaming: boolean }) {
  const [open, setOpen] = useState(false)
  const doneCount = steps.filter((s) => s.done).length
  const isWorking = streaming || (steps.length > 0 && doneCount < steps.length)

  const label = isWorking
    ? doneCount === 0
      ? 'Starting up…'
      : `Working · ${doneCount} step${doneCount !== 1 ? 's' : ''} done`
    : `${steps.length} step${steps.length !== 1 ? 's' : ''}`

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-2 text-[13px] text-zinc-500 transition-colors hover:text-zinc-400"
      >
        {isWorking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-600" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
        )}
        <span className="font-mono">{label}</span>
        {steps.length > 0 && (
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform text-zinc-600 group-hover:text-zinc-500',
              open && 'rotate-180',
            )}
          />
        )}
      </button>

      {open && steps.length > 0 && (
        <div className="mt-3 space-y-px border-l border-zinc-800 pl-4">
          {steps.map((step) => (
            <div key={step.nodeId} className="py-2">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={cn(
                    'h-1 w-1 rounded-full',
                    step.done ? 'bg-emerald-700' : 'bg-amber-600 animate-pulse',
                  )}
                />
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  {step.label}
                </span>
              </div>
              <p className="font-mono text-[11px] leading-relaxed text-zinc-700 whitespace-pre-wrap line-clamp-5">
                {step.content || '…'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
