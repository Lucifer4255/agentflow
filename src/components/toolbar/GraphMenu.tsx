'use client'

import { useEffect, useState } from 'react'
import { Save, FolderOpen, FilePlus2, ChevronDown, Search, Workflow } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useGraphStore } from '@/store/graphStore'
import { cn } from '@/lib/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
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
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}w ago`
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function GraphMenu() {
  const { isSignedIn } = useAuth()
  const getOrCreateUser = useMutation(api.users.getOrCreate)
  const createGraph = useMutation(api.graphs.create)
  const saveGraph = useMutation(api.graphs.save)
  const myGraphs = useQuery(api.graphs.listMine, isSignedIn ? {} : 'skip')

  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)
  const loadGraph = useGraphStore((s) => s.loadGraph)
  const clear = useGraphStore((s) => s.clear)
  const currentGraphId = useGraphStore((s) => s.currentGraphId)
  const currentGraphName = useGraphStore((s) => s.currentGraphName)
  const setCurrentGraph = useGraphStore((s) => s.setCurrentGraph)

  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (isSignedIn) getOrCreateUser({}).catch(() => {})
  }, [isSignedIn, getOrCreateUser])

  if (!isSignedIn) return null

  const onSave = async () => {
    if (nodes.length === 0 || saving) return
    setSaving(true)
    try {
      if (currentGraphId) {
        await saveGraph({ id: currentGraphId as Id<'graphs'>, nodes, edges })
      } else {
        const name = window.prompt('Name this workflow', 'Untitled workflow')
        if (!name) return
        const id = await createGraph({ name, nodes, edges })
        setCurrentGraph(id, name)
      }
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 1400)
    } finally {
      setSaving(false)
    }
  }

  const onNew = () => {
    if (nodes.length > 0 && !window.confirm('Discard current workflow?')) return
    clear()
  }

  const filtered =
    myGraphs?.filter((g) => g.name.toLowerCase().includes(filter.toLowerCase())) ?? []
  const hasGraphs = (myGraphs?.length ?? 0) > 0
  const showSearch = (myGraphs?.length ?? 0) >= 5

  return (
    <div className="flex h-9 items-stretch overflow-hidden rounded-md border border-zinc-700/80 bg-zinc-900/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-colors hover:border-zinc-600/80">
      <button
        onClick={onNew}
        className="flex items-center gap-1.5 px-3 text-xs text-zinc-400 transition-colors hover:bg-zinc-800/70 hover:text-zinc-100"
        title="New workflow"
      >
        <FilePlus2 className="h-3.5 w-3.5" />
        <span style={mono} className="text-[10px] uppercase tracking-[0.14em]">
          New
        </span>
      </button>

      <Divider />

      <button
        onClick={onSave}
        disabled={saving || nodes.length === 0}
        className={cn(
          'group relative flex items-center gap-2.5 px-3 text-xs transition-colors',
          nodes.length === 0
            ? 'cursor-not-allowed text-zinc-600'
            : 'text-zinc-200 hover:bg-zinc-800/70',
        )}
        title={currentGraphName ? `Save changes to ${currentGraphName}` : 'Save workflow'}
      >
        <span className="relative flex h-4 w-4 items-center justify-center">
          <Save
            className={cn('h-3.5 w-3.5 transition-opacity', justSaved ? 'opacity-0' : 'opacity-100')}
          />
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center text-emerald-400 transition-opacity',
              justSaved ? 'opacity-100' : 'opacity-0',
            )}
          >
            <CheckIcon />
          </span>
        </span>

        {currentGraphId && currentGraphName ? (
          <span className="flex flex-col items-start leading-none">
            <span
              style={mono}
              className="text-[9px] uppercase tracking-[0.18em] text-zinc-500 group-hover:text-zinc-400"
            >
              {saving ? 'Saving' : justSaved ? 'Saved' : 'Save to'}
            </span>
            <span
              style={serif}
              className="mt-0.5 max-w-[160px] truncate text-[13px] italic leading-tight text-zinc-100"
            >
              {currentGraphName}
            </span>
          </span>
        ) : (
          <span style={mono} className="text-[10px] uppercase tracking-[0.14em]">
            {saving ? 'Saving…' : justSaved ? 'Saved' : 'Save'}
          </span>
        )}
        {currentGraphId && (
          <span
            className={cn(
              'ml-1 h-1.5 w-1.5 rounded-full transition-colors',
              justSaved ? 'bg-emerald-400' : 'bg-zinc-700 group-hover:bg-zinc-500',
            )}
          />
        )}
      </button>

      <Divider />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className="group flex items-center gap-1.5 px-3 text-xs text-zinc-400 transition-colors hover:bg-zinc-800/70 hover:text-zinc-100 data-[state=open]:bg-zinc-800/80 data-[state=open]:text-zinc-100"
              aria-label="Open workflow"
            />
          }
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span style={mono} className="text-[10px] uppercase tracking-[0.14em]">
            Open
          </span>
          <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-[360px] overflow-hidden p-0"
        >
          <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
            <div className="flex items-baseline gap-2">
              <span style={serif} className="text-[15px] italic font-normal">
                Workflows
              </span>
              <Badge variant="secondary" style={mono} className="text-[9px] uppercase tracking-[0.16em]">
                {myGraphs?.length ?? 0}
              </Badge>
            </div>
            <span style={mono} className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              ESC to close
            </span>
          </div>

          {showSearch && (
            <div className="border-b border-border px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter workflows"
                  className="h-8 pl-7 text-[12px]"
                />
              </div>
            </div>
          )}

          <div className="max-h-[360px] overflow-y-auto py-1.5">
            {myGraphs === undefined ? (
              <div
                style={mono}
                className="px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                Loading…
              </div>
            ) : !hasGraphs ? (
              <div
                className="m-3 flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-center"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.012) 6px 7px)',
                }}
              >
                <Workflow className="h-5 w-5 text-muted-foreground" />
                <p style={serif} className="text-[13px] italic">
                  No workflows yet
                </p>
                <p style={mono} className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
                  Build a graph · hit Save
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p style={mono} className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  No matches for &ldquo;{filter}&rdquo;
                </p>
              </div>
            ) : (
              filtered.map((g) => {
                const isActive = g._id === currentGraphId
                const nodeCount = Array.isArray(g.nodes) ? g.nodes.length : 0
                return (
                  <DropdownMenuItem
                    key={g._id}
                    onSelect={() => {
                      loadGraph(g.nodes as never, g.edges as never)
                      setCurrentGraph(g._id, g.name)
                      setFilter('')
                    }}
                    className="relative flex items-start gap-3 rounded-none px-4 py-2.5 focus:bg-accent/60"
                  >
                    <span
                      className={cn(
                        'absolute bottom-1.5 left-0 top-1.5 w-[2px] rounded-r-sm',
                        isActive ? 'bg-emerald-400' : 'bg-transparent',
                      )}
                    />
                    <Workflow
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        isActive ? 'text-emerald-400' : 'text-muted-foreground',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-[13px] font-medium tracking-tight">
                          {g.name}
                        </span>
                        {isActive && (
                          <span
                            style={mono}
                            className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-emerald-400/90"
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          style={mono}
                          className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground"
                        >
                          {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
                        </span>
                        <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" />
                        <span
                          style={mono}
                          className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground"
                        >
                          {relativeTime(g.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                )
              })
            )}
          </div>

          {hasGraphs && (
            <>
              <DropdownMenuSeparator className="my-0" />
              <div className="bg-card/60 px-4 py-2">
                <span style={mono} className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  {filtered.length} of {myGraphs?.length} · synced via Convex
                </span>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function Divider() {
  return <span aria-hidden className="my-1.5 w-px bg-zinc-800" />
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2.5 6.5L5 9L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
