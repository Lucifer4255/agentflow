'use client'

import { Plus, Play, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useGraphStore } from '@/store/graphStore'
import { runGraph } from '@/lib/runGraph'
import { cn } from '@/lib/cn'

const MODELS = [
  'anthropic/claude-sonnet-4-5',
  'anthropic/claude-opus-4',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-exp',
]

export function Toolbar() {
  const addNode = useGraphStore((s) => s.addNode)
  const clear = useGraphStore((s) => s.clear)
  const running = useGraphStore((s) => s.running)
  const nodes = useGraphStore((s) => s.nodes)
  const [model, setModel] = useState(MODELS[0])

  const onRun = () => {
    if (running || nodes.length === 0) return
    runGraph(model)
  }

  const onLoadDemo = () => {
    // TODO: wire to demo seed once it lands
  }

  return (
    <div className="flex h-14 items-center gap-2 border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur">
      <div className="flex items-center gap-2 pr-3">
        <div className="h-7 w-7 rounded-md bg-gradient-to-br from-sky-500 to-violet-600" />
        <span className="font-semibold tracking-tight text-zinc-100">AgentFlow</span>
      </div>

      <div className="mx-2 h-6 w-px bg-zinc-800" />

      <ToolbarButton onClick={() => addNode()} icon={<Plus className="h-4 w-4" />}>
        Add Node
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
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          onClick={onRun}
          disabled={running || nodes.length === 0}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition',
            running || nodes.length === 0
              ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
              : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400',
          )}
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {running ? 'Running' : 'Run'}
        </button>
      </div>
    </div>
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
