'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Save, FolderOpen, FilePlus2, ChevronDown, Search, Workflow } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useGraphStore } from '@/store/graphStore'
import { cn } from '@/lib/cn'

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

  const [openMenu, setOpenMenu] = useState(false)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [query, setQuery] = useState('')
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const openBtnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSignedIn) getOrCreateUser({}).catch(() => {})
  }, [isSignedIn, getOrCreateUser])

  useLayoutEffect(() => {
    if (!openMenu) return
    const update = () => {
      const r = openBtnRef.current?.getBoundingClientRect()
      if (!r) return
      setPanelPos({ top: r.bottom + 8, left: r.right - 360 })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [openMenu])

  useEffect(() => {
    if (!openMenu) return
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (wrapperRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpenMenu(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(false)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [openMenu])

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
    myGraphs?.filter((g) => g.name.toLowerCase().includes(query.toLowerCase())) ?? []
  const hasGraphs = (myGraphs?.length ?? 0) > 0
  const showSearch = (myGraphs?.length ?? 0) >= 5

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <div className="flex h-9 items-stretch overflow-hidden rounded-md border border-zinc-700/80 bg-zinc-900/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-colors hover:border-zinc-600/80">
        {/* NEW */}
        <button
          onClick={onNew}
          className="group flex items-center gap-1.5 px-3 text-xs text-zinc-400 transition-colors hover:bg-zinc-800/70 hover:text-zinc-100"
          title="New workflow"
        >
          <FilePlus2 className="h-3.5 w-3.5" />
          <span style={mono} className="text-[10px] uppercase tracking-[0.14em]">
            New
          </span>
        </button>

        <Divider />

        {/* SAVE */}
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
              className={cn(
                'h-3.5 w-3.5 transition-opacity',
                justSaved ? 'opacity-0' : 'opacity-100',
              )}
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

        {/* OPEN */}
        <button
          ref={openBtnRef}
          onClick={() => setOpenMenu((v) => !v)}
          className={cn(
            'group flex items-center gap-1.5 px-3 text-xs transition-colors',
            openMenu
              ? 'bg-zinc-800/80 text-zinc-100'
              : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100',
          )}
          aria-expanded={openMenu}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span style={mono} className="text-[10px] uppercase tracking-[0.14em]">
            Open
          </span>
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', openMenu && 'rotate-180')}
          />
        </button>
      </div>

      {/* PANEL (portaled to body to escape overflow:hidden ancestors) */}
      {openMenu && panelPos && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[1000] w-[360px] origin-top-right animate-[gm-in_140ms_ease-out] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/98 shadow-2xl shadow-black/60 backdrop-blur-xl"
            style={{
              top: panelPos.top,
              left: panelPos.left,
              backgroundImage:
                'radial-gradient(circle at 100% 0%, rgba(56,189,248,0.04), transparent 40%)',
            }}
          >
          {/* HEADER */}
          <div className="flex items-baseline justify-between border-b border-zinc-800/80 px-4 pb-3 pt-3.5">
            <div className="flex items-baseline gap-2">
              <span style={serif} className="text-[15px] italic text-zinc-100">
                Workflows
              </span>
              <span
                style={mono}
                className="rounded-sm bg-zinc-800/80 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-zinc-400"
              >
                {myGraphs?.length ?? 0}
              </span>
            </div>
            <span
              style={mono}
              className="text-[9px] uppercase tracking-[0.18em] text-zinc-600"
            >
              ESC to close
            </span>
          </div>

          {/* SEARCH */}
          {showSearch && (
            <div className="flex items-center gap-2 border-b border-zinc-800/60 px-3 py-2">
              <Search className="h-3 w-3 text-zinc-600" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter workflows"
                className="w-full bg-transparent text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          )}

          {/* LIST */}
          <div className="max-h-[360px] overflow-y-auto py-1.5">
            {myGraphs === undefined ? (
              <LoadingState />
            ) : !hasGraphs ? (
              <EmptyState />
            ) : filtered.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p style={mono} className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  No matches for &ldquo;{query}&rdquo;
                </p>
              </div>
            ) : (
              filtered.map((g) => {
                const isActive = g._id === currentGraphId
                const nodeCount = Array.isArray(g.nodes) ? g.nodes.length : 0
                return (
                  <button
                    key={g._id}
                    onClick={() => {
                      loadGraph(g.nodes as never, g.edges as never)
                      setCurrentGraph(g._id, g.name)
                      setOpenMenu(false)
                      setQuery('')
                    }}
                    className={cn(
                      'group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      isActive ? 'bg-zinc-900/70' : 'hover:bg-zinc-900/60',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute bottom-1.5 left-0 top-1.5 w-[2px] rounded-r-sm transition-colors',
                        isActive
                          ? 'bg-emerald-400'
                          : 'bg-transparent group-hover:bg-zinc-600',
                      )}
                    />
                    <Workflow
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={cn(
                            'truncate text-[13px] font-medium tracking-tight',
                            isActive ? 'text-zinc-50' : 'text-zinc-100',
                          )}
                        >
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
                          className="text-[9.5px] uppercase tracking-[0.16em] text-zinc-500"
                        >
                          {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
                        </span>
                        <span className="h-0.5 w-0.5 rounded-full bg-zinc-700" />
                        <span
                          style={mono}
                          className="text-[9.5px] uppercase tracking-[0.16em] text-zinc-500"
                        >
                          {relativeTime(g.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* FOOTER */}
          {hasGraphs && (
            <div className="border-t border-zinc-800/80 bg-zinc-950/60 px-4 py-2">
              <span
                style={mono}
                className="text-[9px] uppercase tracking-[0.18em] text-zinc-600"
              >
                {filtered.length} of {myGraphs?.length} · synced via Convex
              </span>
            </div>
          )}
          </div>,
          document.body,
        )}

      <style>{`
        @keyframes gm-in {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
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

function LoadingState() {
  return (
    <div className="space-y-1.5 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-1 py-2"
          style={{ opacity: 1 - i * 0.25 }}
        >
          <div className="h-4 w-4 shrink-0 rounded-sm bg-zinc-800/80" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-3/5 rounded-sm bg-zinc-800/80" />
            <div className="h-2 w-2/5 rounded-sm bg-zinc-800/50" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="px-4 py-5">
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-800 px-4 py-6 text-center"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.012) 6px 7px)',
        }}
      >
        <Workflow className="h-5 w-5 text-zinc-700" />
        <p
          style={{ fontFamily: 'var(--font-fraunces)' }}
          className="text-[13px] italic text-zinc-300"
        >
          No workflows yet
        </p>
        <p
          style={{ fontFamily: 'var(--font-geist-mono)' }}
          className="text-[9.5px] uppercase tracking-[0.16em] text-zinc-600"
        >
          Build a graph &middot; hit Save
        </p>
      </div>
    </div>
  )
}
