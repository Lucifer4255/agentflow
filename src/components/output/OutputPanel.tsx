'use client'

import { useState, useCallback, useRef } from 'react'
import { Copy, Check, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react'
import { useGraphStore } from '@/store/graphStore'
import { cn } from '@/lib/cn'

const MIN_HEIGHT = 40
const DEFAULT_HEIGHT = 280
const MAX_HEIGHT = 600

export function OutputPanel() {
  const nodes = useGraphStore((s) => s.nodes)
  const outputs = useGraphStore((s) => s.outputs)
  const errors = useGraphStore((s) => s.errors)
  const currentNodeId = useGraphStore((s) => s.currentNodeId)
  const running = useGraphStore((s) => s.running)
  const activeTab = useGraphStore((s) => s.activeOutputTab)
  const setActive = useGraphStore((s) => s.setActiveOutputTab)

  const [height, setHeight] = useState(MIN_HEIGHT)
  const [collapsed, setCollapsed] = useState(true)
  const [copied, setCopied] = useState(false)
  const dragStartY = useRef<number | null>(null)
  const dragStartHeight = useRef<number>(MIN_HEIGHT)

  const hasAnyOutput =
    Object.keys(outputs).length > 0 || Object.keys(errors).length > 0 || running

  // Auto-expand when execution starts
  if (running && collapsed) {
    setCollapsed(false)
    setHeight(DEFAULT_HEIGHT)
  }

  const tabs = nodes.filter(
    (n) => outputs[n.id] !== undefined || errors[n.id] !== undefined || n.id === currentNodeId,
  )

  const selectedId = activeTab && tabs.find((t) => t.id === activeTab) ? activeTab : tabs[0]?.id
  const selected = nodes.find((n) => n.id === selectedId)
  const selectedOutput = selectedId ? outputs[selectedId] : undefined
  const selectedError = selectedId ? errors[selectedId] : undefined
  const graphError = errors['__graph__']

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragStartY.current = e.clientY
    dragStartHeight.current = height

    const onMouseMove = (e: MouseEvent) => {
      if (dragStartY.current === null) return
      const delta = dragStartY.current - e.clientY
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartHeight.current + delta))
      setHeight(next)
      if (next > MIN_HEIGHT) setCollapsed(false)
    }

    const onMouseUp = () => {
      dragStartY.current = null
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [height])

  const toggleCollapse = () => {
    if (collapsed) {
      setCollapsed(false)
      setHeight(DEFAULT_HEIGHT)
    } else {
      setCollapsed(true)
      setHeight(MIN_HEIGHT)
    }
  }

  const onCopy = async () => {
    const text = selectedError || selectedOutput || ''
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  if (!hasAnyOutput && !graphError) {
    return (
      <div className="flex h-10 items-center justify-center border-t border-zinc-800 bg-zinc-950 text-[11px] text-zinc-500">
        Output will appear here when you press Run
      </div>
    )
  }

  return (
    <div
      style={{ height }}
      className="flex flex-col border-t border-zinc-800 bg-zinc-950 transition-none"
    >
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        className="flex h-3 cursor-row-resize items-center justify-center border-b border-zinc-800 hover:bg-zinc-800/60"
      >
        <GripHorizontal className="h-3 w-3 text-zinc-600" />
      </div>

      {/* Tab bar */}
      <div className="flex h-9 items-center gap-2 px-2">
        <button
          onClick={toggleCollapse}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
        >
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map((n) => {
            const isCurrent = n.id === currentNodeId && running
            const isError = errors[n.id] !== undefined
            const isDone = outputs[n.id] !== undefined
            return (
              <button
                key={n.id}
                onClick={() => {
                  setActive(n.id)
                  if (collapsed) {
                    setCollapsed(false)
                    setHeight(DEFAULT_HEIGHT)
                  }
                }}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
                  selectedId === n.id
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isError
                      ? 'bg-red-500'
                      : isCurrent
                        ? 'animate-pulse bg-amber-400'
                        : isDone
                          ? 'bg-emerald-500'
                          : 'bg-zinc-600',
                  )}
                />
                {n.data.label}
              </button>
            )
          })}
        </div>

        {selectedId && !collapsed && (
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-4">
          {graphError && (
            <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
              <strong>Execution error:</strong> {graphError}
            </div>
          )}
          {selected && (
            <div className="text-xs text-zinc-300">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">
                {selected.data.label}
                {selectedId === currentNodeId && running && ' · running'}
              </p>
              {selectedError ? (
                <pre className="whitespace-pre-wrap rounded bg-red-500/10 p-3 font-mono text-red-300">
                  {selectedError}
                </pre>
              ) : selectedOutput !== undefined ? (
                <pre className="whitespace-pre-wrap font-mono leading-relaxed text-zinc-200">
                  {selectedOutput || '(empty)'}
                </pre>
              ) : (
                <div className="flex items-center gap-2 text-zinc-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  Working…
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
