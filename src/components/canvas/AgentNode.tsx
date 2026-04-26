'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import type { AgentNodeData, ToolConfig } from '@/types'
import { cn } from '@/lib/cn'

const statusStyles: Record<NonNullable<AgentNodeData['status']>, string> = {
  idle: 'bg-zinc-500',
  running: 'bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.8)]',
  done: 'bg-emerald-500',
  error: 'bg-red-500',
}

function toolBadgeLabel(tool: ToolConfig): string {
  if (tool.type === 'mcp') return `MCP: ${tool.mcpServerName || 'server'}`
  if (tool.type === 'http_request') return 'http'
  if (tool.type === 'code_executor') return `code: ${tool.language || 'py'}`
  return tool.type
}

function AgentNodeInner({ data, selected }: NodeProps) {
  const d = data as AgentNodeData
  const status = d.status ?? 'idle'

  return (
    <div
      className={cn(
        'w-[220px] rounded-xl border bg-zinc-900/95 text-zinc-100 shadow-lg backdrop-blur transition',
        selected ? 'border-sky-400 ring-2 ring-sky-400/30' : 'border-zinc-700',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-zinc-600 !bg-zinc-400"
      />

      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <span className={cn('h-2.5 w-2.5 rounded-full', statusStyles[status])} />
        <span className="truncate text-sm font-medium">{d.label}</span>
      </div>

      <div className="px-3 py-2">
        <p className="line-clamp-2 text-[11px] leading-snug text-zinc-400">
          {d.systemPrompt || 'No system prompt set'}
        </p>

        {d.tools.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {d.tools.map((tool, i) => (
              <span
                key={i}
                className="rounded-md border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-300"
              >
                {toolBadgeLabel(tool)}
              </span>
            ))}
          </div>
        )}

        {d.output && status === 'done' && (
          <p className="mt-2 line-clamp-2 rounded bg-zinc-800/60 px-2 py-1 font-mono text-[10px] text-emerald-300/90">
            {d.output.slice(0, 80)}
            {d.output.length > 80 ? '…' : ''}
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-zinc-600 !bg-zinc-400"
      />
    </div>
  )
}

export const AgentNode = memo(AgentNodeInner)
