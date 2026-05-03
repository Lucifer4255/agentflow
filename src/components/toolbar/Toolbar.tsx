'use client'

import { Play, Trash2, Sparkles, TextCursorInput, Bot, Square, PanelLeftOpen, Save, GitFork, Globe, GlobeLock, ExternalLink, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useGraphStore } from '@/store/graphStore'
import { runGraph, type RunGraphPersistence } from '@/lib/runGraph'
import { marketResearchNodes, marketResearchEdges } from '@/components/demo/marketResearchFlow'
import { cn } from '@/lib/cn'
import { BUDGET_MODEL_OPTIONS, MODEL_GROUPS } from '@/lib/models'
import { NameModal } from '@/components/ui/modal'

const BUDGET_ROUTER_VALUE = '__budget__'


export function Toolbar() {
  const addNode = useGraphStore((s) => s.addNode)
  const addRouterNode = useGraphStore((s) => s.addRouterNode)
  const clear = useGraphStore((s) => s.clear)
  const loadGraph = useGraphStore((s) => s.loadGraph)
  const running = useGraphStore((s) => s.running)
  const stopFn = useGraphStore((s) => s.stopFn)
  const nodes = useGraphStore((s) => s.nodes)
  const currentGraphId = useGraphStore((s) => s.currentGraphId)
  const currentGraphName = useGraphStore((s) => s.currentGraphName)
  const setCurrentGraph = useGraphStore((s) => s.setCurrentGraph)
  const edges = useGraphStore((s) => s.edges)
  const sidebarOpen = useGraphStore((s) => s.sidebarOpen)
  const toggleSidebar = useGraphStore((s) => s.toggleSidebar)
  const [model, setModel] = useState<string>('openrouter/auto')
  const [useBudgetRouter, setUseBudgetRouter] = useState(false)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [nameModalOpen, setNameModalOpen] = useState(false)
  const [pendingName, setPendingName] = useState('Untitled workflow')

  const router = useRouter()
  const { isSignedIn } = useAuth()
  const getOrCreateUser = useMutation(api.users.getOrCreate)
  const [deploying, setDeploying] = useState(false)
  const [isPublic, setIsPublic] = useState(false)

  const createGraph = useMutation(api.graphs.create)
  const saveGraph = useMutation(api.graphs.save)
  const publishGraph = useMutation(api.graphs.publish)
  const unpublishGraph = useMutation(api.graphs.unpublish)
  const currentGraphData = useQuery(
    api.graphs.get,
    currentGraphId ? { id: currentGraphId as Id<'graphs'> } : 'skip',
  )
  const startRun = useMutation(api.runs.start)
  const appendEvents = useMutation(api.runs.appendEvents)
  const finishRun = useMutation(api.runs.finish)

  const onRun = () => {
    if (running || nodes.length === 0) return
    console.log('[toolbar] onRun | isSignedIn:', isSignedIn, '| currentGraphId:', currentGraphId)
    const persistence: RunGraphPersistence | undefined = currentGraphId
      ? {
          startRun: async () => {
            console.log('[toolbar] startRun called | graphId:', currentGraphId, 'model:', model)
            try {
              const id = await startRun({ graphId: currentGraphId as Id<'graphs'>, model })
              console.log('[toolbar] startRun success | runId:', id)
              return id as string
            } catch (err) {
              console.error('[toolbar] startRun FAILED:', err)
              throw err
            }
          },
          appendEvents: async (runId, events) => {
            await appendEvents({ runId: runId as Id<'runs'>, events })
          },
          finishRun: async (runId, status, totalInputTokens, totalOutputTokens, error) => {
            console.log('[toolbar] finishRun | runId:', runId, 'status:', status)
            await finishRun({
              runId: runId as Id<'runs'>,
              status,
              totalInputTokens,
              totalOutputTokens,
              error,
            })
          },
        }
      : undefined
    if (!persistence) console.warn('[toolbar] no persistence — graph not saved yet, runs will not be recorded')
    runGraph(useBudgetRouter ? BUDGET_ROUTER_VALUE : model, persistence)
  }

  useEffect(() => {
    if (isSignedIn) getOrCreateUser({}).catch(() => {})
  }, [isSignedIn, getOrCreateUser])

  useEffect(() => {
    if (currentGraphData !== undefined) {
      setIsPublic(currentGraphData?.isPublic ?? false)
    }
  }, [currentGraphData])

  const onDeploy = async () => {
    if (!currentGraphId || deploying) return
    setDeploying(true)
    try {
      const deployModel = useBudgetRouter ? BUDGET_ROUTER_VALUE : model
      await publishGraph({ id: currentGraphId as Id<'graphs'>, defaultModel: deployModel })
      setIsPublic(true)
      router.push(`/chat/${currentGraphId}`)
    } finally {
      setDeploying(false)
    }
  }

  const onOpenChat = () => {
    if (!currentGraphId) return
    router.push(`/chat/${currentGraphId}`)
  }

  const onUnpublish = async () => {
    if (!currentGraphId || deploying) return
    setDeploying(true)
    try {
      await unpublishGraph({ id: currentGraphId as Id<'graphs'> })
      setIsPublic(false)
    } finally {
      setDeploying(false)
    }
  }

  const onSave = () => {
    if (nodes.length === 0 || saving) return
    if (currentGraphId) {
      doSave()
    } else {
      setPendingName('Untitled workflow')
      setNameModalOpen(true)
    }
  }

  const doSave = async (name?: string) => {
    setSaving(true)
    try {
      if (currentGraphId) {
        await saveGraph({ id: currentGraphId as Id<'graphs'>, nodes, edges })
      } else if (name) {
        const id = await createGraph({ name, nodes, edges })
        setCurrentGraph(id, name)
      }
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 1400)
    } finally {
      setSaving(false)
    }
  }

  const onConfirmSave = () => {
    doSave(pendingName.trim() || 'Untitled workflow')
  }

  const onLoadDemo = () => {
    loadGraph(marketResearchNodes, marketResearchEdges)
  }

  return (
    <div className="flex h-14 items-center gap-2 border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur">
      <button
        onClick={toggleSidebar}
        className="group flex items-center gap-2 rounded-md px-1.5 py-1 pr-3 transition-colors hover:bg-zinc-900"
        aria-expanded={sidebarOpen}
        aria-label="Toggle sidebar"
      >
        <div className="h-7 w-7 rounded-md bg-gradient-to-br from-sky-500 to-violet-600" />
        <span className="font-semibold tracking-tight text-zinc-100">AgentFlow</span>
        <PanelLeftOpen className="h-3.5 w-3.5 text-zinc-500 transition-colors group-hover:text-zinc-300" />
      </button>

      <div className="mx-2 h-6 w-px bg-zinc-800" />

      <ToolbarButton
        onClick={() => addNode({ isInputNode: true })}
        icon={<TextCursorInput className="h-4 w-4" />}
      >
        Input Node
      </ToolbarButton>
      <ToolbarButton
        onClick={() => addNode()}
        icon={<Bot className="h-4 w-4" />}
      >
        Agent Node
      </ToolbarButton>
      <ToolbarButton
        onClick={() => addRouterNode()}
        icon={<GitFork className="h-4 w-4 text-violet-400" />}
      >
        Router Node
      </ToolbarButton>
      <ToolbarButton onClick={onLoadDemo} icon={<Sparkles className="h-4 w-4" />}>
        Load Demo
      </ToolbarButton>
      <ToolbarButton onClick={clear} icon={<Trash2 className="h-4 w-4" />} variant="ghost">
        Clear
      </ToolbarButton>

      <button
        onClick={onSave}
        disabled={saving || nodes.length === 0}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium transition',
          nodes.length === 0
            ? 'cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-600'
            : justSaved
              ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
              : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800',
        )}
        title={currentGraphName ? `Save to "${currentGraphName}"` : 'Save workflow'}
      >
        <Save className="h-3.5 w-3.5" />
        {saving ? 'Saving…' : justSaved ? 'Saved' : currentGraphName ?? 'Save'}
      </button>

      <NameModal
        open={nameModalOpen}
        onOpenChange={setNameModalOpen}
        title="Name this workflow"
        placeholder="Untitled workflow"
        value={pendingName}
        onChange={setPendingName}
        onConfirm={onConfirmSave}
      />

      {currentGraphId && (
        <div className="flex items-center gap-1">
          {isPublic ? (
            <>
              <button
                onClick={onOpenChat}
                title="Open chat page"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-violet-700 bg-violet-950 px-3 text-xs font-medium text-violet-300 transition hover:border-violet-600 hover:bg-violet-900"
              >
                <Globe className="h-3.5 w-3.5" />
                Open Chat
                <ExternalLink className="h-3 w-3 opacity-60" />
              </button>
              <button
                onClick={onUnpublish}
                disabled={deploying}
                title="Unpublish"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-600 transition hover:border-zinc-700 hover:text-zinc-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={onDeploy}
              disabled={deploying || nodes.length === 0}
              title="Publish and open as chat app"
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition',
                nodes.length === 0
                  ? 'cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-600'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-violet-700 hover:bg-violet-950/40 hover:text-violet-300',
              )}
            >
              <GlobeLock className="h-3.5 w-3.5" />
              {deploying ? 'Deploying…' : 'Deploy'}
            </button>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setUseBudgetRouter((v) => !v)}
          disabled={running}
          title="Budget router: automatically picks the cheapest suitable model per node"
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition',
            useBudgetRouter
              ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
              : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
          )}
        >
          <span className="text-[10px]">💰</span>
          Budget
        </button>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={running || useBudgetRouter}
          className={cn(
            'h-9 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 outline-none focus:border-sky-500',
            useBudgetRouter && 'opacity-40 cursor-not-allowed',
          )}
        >
          {MODEL_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.models.map((m) => (
                <option key={m} value={m}>{m.split('/')[1]}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {running ? (
          <button
            onClick={() => stopFn?.()}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-red-500/90 px-4 text-sm font-medium text-white transition hover:bg-red-500"
          >
            <Square className="h-4 w-4 fill-current" />
            Stop
          </button>
        ) : (
          <button
            onClick={onRun}
            disabled={nodes.length === 0}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition',
              nodes.length === 0
                ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400',
            )}
          >
            <Play className="h-4 w-4" />
            Run
          </button>
        )}

        <ConvexStatus />

        <div className="ml-1 flex items-center gap-2 border-l border-zinc-800 pl-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="inline-flex h-9 items-center rounded-md px-3 text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="inline-flex h-9 items-center rounded-md border border-zinc-700 bg-zinc-900 px-3 text-xs font-medium text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800">
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </div>
  )
}

function ConvexStatus() {
  const me = useQuery(api.hello.whoami)
  if (me === undefined) {
    return (
      <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        convex…
      </span>
    )
  }
  if (!me.signedIn) {
    return (
      <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        convex: anon
      </span>
    )
  }
  return (
    <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
      ✓ {me.email ?? me.name ?? 'connected'}
    </span>
  )
}

function ToolbarButton({
  children,
  icon,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'ghost'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium transition',
        variant === 'default'
          ? 'border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800'
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
      )}
    >
      {icon}
      {children}
    </button>
  )
}
