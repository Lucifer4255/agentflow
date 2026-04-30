'use client'

import { Play, Trash2, Sparkles, TextCursorInput, Bot, Square } from 'lucide-react'
import { useState } from 'react'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useGraphStore } from '@/store/graphStore'
import { runGraph } from '@/lib/runGraph'
import { marketResearchNodes, marketResearchEdges } from '@/components/demo/marketResearchFlow'
import { cn } from '@/lib/cn'
import { MODEL_OPTIONS } from '@/lib/models'


export function Toolbar() {
  const addNode = useGraphStore((s) => s.addNode)
  const clear = useGraphStore((s) => s.clear)
  const loadGraph = useGraphStore((s) => s.loadGraph)
  const running = useGraphStore((s) => s.running)
  const stopFn = useGraphStore((s) => s.stopFn)
  const nodes = useGraphStore((s) => s.nodes)
  const [model, setModel] = useState<string>(MODEL_OPTIONS[0])

  const onRun = () => {
    if (running || nodes.length === 0) return
    runGraph(model)
  }

  const onLoadDemo = () => {
    loadGraph(marketResearchNodes, marketResearchEdges)
  }

  return (
    <div className="flex h-14 items-center gap-2 border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur">
      <div className="flex items-center gap-2 pr-3">
        <div className="h-7 w-7 rounded-md bg-gradient-to-br from-sky-500 to-violet-600" />
        <span className="font-semibold tracking-tight text-zinc-100">AgentFlow</span>
      </div>

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
      <ToolbarButton onClick={onLoadDemo} icon={<Sparkles className="h-4 w-4" />}>
        Load Demo
      </ToolbarButton>
      <ToolbarButton onClick={clear} icon={<Trash2 className="h-4 w-4" />} variant="ghost">
        Clear
      </ToolbarButton>

      <div className="ml-auto flex items-center gap-2">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={running}
          className="h-9 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 outline-none focus:border-sky-500"
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
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
