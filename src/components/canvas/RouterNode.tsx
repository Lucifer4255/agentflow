'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { GitFork } from 'lucide-react'
import type { AgentNodeData } from '@/types'
import { cn } from '@/lib/cn'

const statusStyles: Record<NonNullable<AgentNodeData['status']>, string> = {
  idle: 'border-violet-700 bg-violet-950/80',
  running: 'border-violet-400 bg-violet-900/80 shadow-[0_0_16px_rgba(167,139,250,0.5)]',
  done: 'border-violet-500 bg-violet-950/80',
  error: 'border-red-500 bg-red-950/80',
}

const dotStyles: Record<NonNullable<AgentNodeData['status']>, string> = {
  idle: 'bg-violet-500',
  running: 'bg-violet-300 animate-pulse',
  done: 'bg-emerald-500',
  error: 'bg-red-500',
}

function RouterNodeInner({ data, selected }: NodeProps) {
  const d = data as AgentNodeData
  const status = d.status ?? 'idle'
  const routes = d.routes ?? []

  return (
    <div
      className={cn(
        'w-[220px] rounded-xl border text-zinc-100 shadow-lg backdrop-blur transition',
        statusStyles[status],
        selected && 'ring-2 ring-violet-400/40',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-violet-600 !bg-violet-400"
      />

      <div className="flex items-center gap-2 border-b border-violet-800/60 px-3 py-2">
        <span className={cn('h-2.5 w-2.5 rounded-full', dotStyles[status])} />
        <GitFork className="h-3.5 w-3.5 text-violet-400" />
        <span className="truncate text-sm font-medium">{d.label}</span>
      </div>

      <div className="relative px-3 py-2">
        {routes.length === 0 ? (
          <p className="text-[11px] text-violet-400/60 italic">No routes defined</p>
        ) : (
          <div className="space-y-1">
            {routes.map((route) => (
              <div key={route.id} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400/60 shrink-0" />
                <span className="text-[11px] text-violet-200 truncate">{route.label}</span>
              </div>
            ))}
          </div>
        )}

        {d.selectedRoute && status === 'done' && (
          <p className="mt-1.5 rounded bg-violet-900/60 px-2 py-1 text-[10px] text-violet-300 font-mono">
            → {d.selectedRoute}
          </p>
        )}
      </div>

      {/* One source handle per route, evenly spaced */}
      {routes.map((route, i) => (
        <Handle
          key={route.id}
          id={route.id}
          type="source"
          position={Position.Right}
          style={{ top: `${((i + 1) / (routes.length + 1)) * 100}%` }}
          className="!h-3 !w-3 !border-violet-600 !bg-violet-400"
          title={route.label}
        />
      ))}

      {/* Fallback handle when no routes yet */}
      {routes.length === 0 && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-violet-600 !bg-violet-400"
        />
      )}
    </div>
  )
}

export const RouterNode = memo(RouterNodeInner)
