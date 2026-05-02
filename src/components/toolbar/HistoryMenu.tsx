'use client'

import { useState } from 'react'
import {
  History,
  ChevronDown,
  ChevronRight,
  CircleDot,
  CheckCircle2,
  XCircle,
  Square,
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useGraphStore } from '@/store/graphStore'
import { cn } from '@/lib/cn'
import { estimateCost, formatCost } from '@/lib/modelCost'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

const serif: React.CSSProperties = { fontFamily: 'var(--font-fraunces)' }
const mono: React.CSSProperties = { fontFamily: 'var(--font-geist-mono)' }

function relativeTime(ms: number): string {
  const diff = Date.now() - ms
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDuration(startedAt: number, finishedAt: number | null): string {
  const end = finishedAt ?? Date.now()
  const ms = end - startedAt
  if (ms < 1000) return `${ms}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  return `${m}m ${Math.floor(s % 60)}s`
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  if (n < 100_000) return `${(n / 1000).toFixed(1)}k`
  return `${Math.round(n / 1000)}k`
}

export function HistoryMenu() {
  const { isSignedIn } = useAuth()
  const currentGraphId = useGraphStore((s) => s.currentGraphId)
  const runs = useQuery(
    api.runs.listForGraph,
    isSignedIn && currentGraphId
      ? { graphId: currentGraphId as Id<'graphs'> }
      : 'skip',
  )
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  if (!isSignedIn || !currentGraphId) return null

  const toggle = (id: string) =>
    setSelectedRunId((prev) => (prev === id ? null : id))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="group inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-700/80 bg-zinc-900/80 px-3 text-xs text-zinc-400 transition-colors hover:border-zinc-600/80 hover:bg-zinc-800/70 hover:text-zinc-100 data-[state=open]:border-zinc-600 data-[state=open]:bg-zinc-800/80 data-[state=open]:text-zinc-100"
            aria-label="Run history"
          />
        }
      >
        <History className="h-3.5 w-3.5" />
        <span style={mono} className="text-[10px] uppercase tracking-[0.14em]">
          History
        </span>
        {runs && runs.length > 0 && (
          <Badge
            variant="secondary"
            style={mono}
            className="ml-0.5 px-1 py-0 text-[9px] uppercase tracking-[0.14em]"
          >
            {runs.length}
          </Badge>
        )}
        <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-[460px] overflow-hidden p-0">
        <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span style={serif} className="text-[15px] italic font-normal">
              Run history
            </span>
            <Badge variant="secondary" style={mono} className="text-[9px] uppercase tracking-[0.16em]">
              {runs?.length ?? 0}
            </Badge>
          </div>
          <span style={mono} className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            ESC to close
          </span>
        </div>

        <div className="max-h-[500px] overflow-y-auto py-1">
          {runs === undefined ? (
            <p
              style={mono}
              className="px-4 py-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              Loading…
            </p>
          ) : runs.length === 0 ? (
            <div
              className="m-3 flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-center"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.012) 6px 7px)',
              }}
            >
              <History className="h-5 w-5 text-muted-foreground" />
              <p style={serif} className="text-[13px] italic">
                No runs yet
              </p>
              <p style={mono} className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
                Hit Run · history will appear
              </p>
            </div>
          ) : (
            runs.map((r) => (
              <div key={r._id}>
                <RunRow
                  run={r}
                  isExpanded={selectedRunId === r._id}
                  onToggle={() => toggle(r._id)}
                />
                {selectedRunId === r._id && <RunDetail run={r} />}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

type RunDoc = {
  _id: Id<'runs'>
  status: 'running' | 'done' | 'error' | 'stopped'
  model: string
  startedAt: number
  finishedAt: number | null
  totalInputTokens: number
  totalOutputTokens: number
  error: string | null
}

type RunEventDoc = {
  _id: Id<'runEvents'>
  runId: Id<'runs'>
  nodeId: string
  kind: 'node_start' | 'node_delta' | 'node_end' | 'node_error' | 'tool_call'
  text: string | null
  inputTokens: number | null
  outputTokens: number | null
  at: number
}

type NodeSummary = {
  nodeId: string
  label: string
  status: 'running' | 'done' | 'error'
  inputTokens: number
  outputTokens: number
  output: string | null
  error: string | null
}

// ─── RunRow ──────────────────────────────────────────────────────────────────

function RunRow({
  run,
  isExpanded,
  onToggle,
}: {
  run: RunDoc
  isExpanded: boolean
  onToggle: () => void
}) {
  const palette = statusPalette(run.status)
  const total = run.totalInputTokens + run.totalOutputTokens
  const cost = estimateCost(run.model, run.totalInputTokens, run.totalOutputTokens)

  return (
    <button
      onClick={onToggle}
      className="group relative flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/60"
    >
      <span
        className={cn('absolute bottom-1.5 left-0 top-1.5 w-[2px] rounded-r-sm', palette.stripe)}
      />
      <div className={cn('mt-0.5 shrink-0', palette.text)}>{palette.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span
              style={mono}
              className={cn('text-[10px] font-medium uppercase tracking-[0.16em]', palette.text)}
            >
              {run.status}
            </span>
            <span style={mono} className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {relativeTime(run.startedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={mono} className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {formatDuration(run.startedAt, run.finishedAt)}
            </span>
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span
            style={mono}
            className="truncate text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground"
            title={run.model}
          >
            {run.model.split('/').pop()}
          </span>
          {total > 0 && (
            <>
              <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" />
              <span style={mono} className="text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                {formatTokens(run.totalInputTokens)}↑ {formatTokens(run.totalOutputTokens)}↓
              </span>
              {cost !== null && (
                <>
                  <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" />
                  <span style={mono} className="text-[9.5px] uppercase tracking-[0.14em] text-emerald-500/80">
                    {formatCost(cost)}
                  </span>
                </>
              )}
            </>
          )}
        </div>
        {run.error && (
          <div
            className="mt-1.5 truncate rounded-sm border border-red-900/40 bg-red-950/30 px-2 py-1 text-[10.5px] text-red-300"
            title={run.error}
          >
            {run.error}
          </div>
        )}
      </div>
    </button>
  )
}

// ─── RunDetail ───────────────────────────────────────────────────────────────

function RunDetail({ run }: { run: RunDoc }) {
  const events = useQuery(api.runs.getEvents, { runId: run._id }) as RunEventDoc[] | undefined
  const storeNodes = useGraphStore((s) => s.nodes)

  if (events === undefined) {
    return (
      <div className="border-t border-border bg-accent/20 px-4 py-3">
        <p style={mono} className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          Loading…
        </p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="border-t border-border bg-accent/20 px-4 py-3">
        <p style={mono} className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          No events recorded
        </p>
      </div>
    )
  }

  const summaries = deriveNodeSummaries(events, storeNodes)
  const totalCost = estimateCost(run.model, run.totalInputTokens, run.totalOutputTokens)

  return (
    <div className="border-t border-border bg-accent/20 px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span style={mono} className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          Node breakdown · {summaries.length} {summaries.length === 1 ? 'node' : 'nodes'}
        </span>
        {totalCost !== null && (
          <span style={mono} className="text-[10px] text-emerald-400">
            {formatCost(totalCost)} est.
          </span>
        )}
      </div>
      <div className="space-y-2">
        {summaries.map((s) => (
          <NodeSummaryRow key={s.nodeId} summary={s} model={run.model} />
        ))}
      </div>
    </div>
  )
}

function NodeSummaryRow({ summary, model }: { summary: NodeSummary; model: string }) {
  const palette = statusPalette(summary.status)
  const cost = estimateCost(model, summary.inputTokens, summary.outputTokens)
  const total = summary.inputTokens + summary.outputTokens

  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('shrink-0', palette.text)}>{palette.icon}</span>
          <span
            style={mono}
            className="truncate text-[10px] font-medium uppercase tracking-[0.14em]"
            title={summary.label}
          >
            {summary.label}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {total > 0 && (
            <span style={mono} className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              {formatTokens(summary.inputTokens)}↑ {formatTokens(summary.outputTokens)}↓
            </span>
          )}
          {cost !== null && cost > 0 && (
            <span style={mono} className="text-[9px] text-emerald-500/70">
              {formatCost(cost)}
            </span>
          )}
        </div>
      </div>
      {summary.output && (
        <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">
          {summary.output}
        </p>
      )}
      {summary.error && (
        <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-relaxed text-red-400">
          {summary.error}
        </p>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveNodeSummaries(
  events: RunEventDoc[],
  storeNodes: { id: string; data: { label?: string } }[],
): NodeSummary[] {
  const order: string[] = []
  const map = new Map<string, NodeSummary>()

  for (const e of events) {
    if (!map.has(e.nodeId)) {
      order.push(e.nodeId)
      const storeNode = storeNodes.find((n) => n.id === e.nodeId)
      map.set(e.nodeId, {
        nodeId: e.nodeId,
        label: storeNode?.data?.label ?? e.nodeId,
        status: 'running',
        inputTokens: 0,
        outputTokens: 0,
        output: null,
        error: null,
      })
    }
    const s = map.get(e.nodeId)!
    if (e.kind === 'node_end') {
      s.status = 'done'
      s.inputTokens = e.inputTokens ?? 0
      s.outputTokens = e.outputTokens ?? 0
      s.output = e.text
    } else if (e.kind === 'node_error') {
      s.status = 'error'
      s.error = e.text
    }
  }

  return order.map((id) => map.get(id)!)
}

function statusPalette(status: 'running' | 'done' | 'error' | 'stopped') {
  switch (status) {
    case 'running':
      return {
        text: 'text-sky-400',
        stripe: 'bg-sky-400',
        icon: <CircleDot className="h-3.5 w-3.5 animate-pulse" />,
      }
    case 'done':
      return {
        text: 'text-emerald-400',
        stripe: 'bg-emerald-400',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      }
    case 'error':
      return {
        text: 'text-red-400',
        stripe: 'bg-red-400',
        icon: <XCircle className="h-3.5 w-3.5" />,
      }
    case 'stopped':
      return {
        text: 'text-muted-foreground',
        stripe: 'bg-muted-foreground/60',
        icon: <Square className="h-3.5 w-3.5 fill-current" />,
      }
  }
}
