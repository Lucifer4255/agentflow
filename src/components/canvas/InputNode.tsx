'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import type { AgentNodeData } from '@/types'
import { useGraphStore } from '@/store/graphStore'
import { cn } from '@/lib/cn'

const statusStyles: Record<NonNullable<AgentNodeData['status']>, string> = {
  idle: 'bg-zinc-500',
  running: 'bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.8)]',
  done: 'bg-emerald-500',
  error: 'bg-red-500',
}

function InputNodeInner({ id, data, selected }: NodeProps) {
  const d = data as AgentNodeData
  const status = d.status ?? 'idle'
  const updateNodeData = useGraphStore((s) => s.updateNodeData)

  return (
    <div
      className={cn(
        'w-[240px] rounded-xl border bg-zinc-900/95 text-zinc-100 shadow-lg backdrop-blur transition',
        selected ? 'border-sky-400 ring-2 ring-sky-400/30' : 'border-violet-700/60',
      )}
    >
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <span className={cn('h-2.5 w-2.5 rounded-full', statusStyles[status])} />
        <span className="truncate text-sm font-medium">{d.label}</span>
        <span className="ml-auto rounded bg-violet-900/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-300">
          input
        </span>
      </div>

      <div className="px-3 py-2">
        <p className="mb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">Your query</p>
        <textarea
          value={d.userInput ?? ''}
          onChange={(e) => updateNodeData(id, { userInput: e.target.value })}
          placeholder="e.g. Research NVIDIA (NVDA)"
          rows={3}
          className="nodrag w-full resize-none rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
        />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-zinc-600 !bg-zinc-400"
      />
    </div>
  )
}

export const InputNode = memo(InputNodeInner)
