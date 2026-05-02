'use client'

import { useState } from 'react'
import {
  Workflow,
  History,
  Settings,
  User,
  FilePlus2,
  Search,
  CheckCircle2,
  XCircle,
  CircleDot,
  Square,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Show, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useGraphStore } from '@/store/graphStore'
import { cn } from '@/lib/cn'
import { estimateCost, formatCost } from '@/lib/modelCost'
import {
  Sidebar as ShadSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const serif: React.CSSProperties = { fontFamily: 'var(--font-fraunces)' }
const mono: React.CSSProperties = { fontFamily: 'var(--font-geist-mono)' }

type Section = 'workflows' | 'history' | 'settings' | 'account'

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

export function Sidebar() {
  const [section, setSection] = useState<Section>('workflows')

  return (
    <ShadSidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-sky-500 to-violet-600" />
          <span style={serif} className="text-[15px] italic text-sidebar-foreground">
            AgentFlow
          </span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <NavRow
              section="workflows"
              icon={<Workflow />}
              label="Workflows"
              active={section}
              onSelect={setSection}
            />
            <NavRow
              section="history"
              icon={<History />}
              label="Run history"
              active={section}
              onSelect={setSection}
            />
            <NavRow
              section="settings"
              icon={<Settings />}
              label="Settings"
              active={section}
              onSelect={setSection}
            />
            <NavRow
              section="account"
              icon={<User />}
              label="Account"
              active={section}
              onSelect={setSection}
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarContent>
        {section === 'workflows' && <WorkflowsSection />}
        {section === 'history' && <HistorySection />}
        {section === 'settings' && <SettingsSection />}
        {section === 'account' && <AccountSection />}
      </SidebarContent>

      <SidebarFooter>
        <span
          style={mono}
          className="px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          Synced via Convex
        </span>
      </SidebarFooter>
    </ShadSidebar>
  )
}

function NavRow({
  section,
  icon,
  label,
  active,
  onSelect,
}: {
  section: Section
  icon: React.ReactNode
  label: string
  active: Section
  onSelect: (s: Section) => void
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active === section}
        onClick={() => onSelect(section)}
        className="gap-2"
      >
        {icon}
        <span style={mono} className="text-[10px] uppercase tracking-[0.16em]">
          {label}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/* ─────────────────────────  Workflows  ───────────────────────── */

function WorkflowsSection() {
  const { isSignedIn } = useUser()
  const myGraphs = useQuery(api.graphs.listMine, isSignedIn ? {} : 'skip')
  const currentGraphId = useGraphStore((s) => s.currentGraphId)
  const loadGraph = useGraphStore((s) => s.loadGraph)
  const setCurrentGraph = useGraphStore((s) => s.setCurrentGraph)
  const clear = useGraphStore((s) => s.clear)
  const nodes = useGraphStore((s) => s.nodes)
  const [filter, setFilter] = useState('')

  if (!isSignedIn) {
    return <SignedOutPrompt label="Sign in to save and revisit your workflows" />
  }

  const filtered = myGraphs?.filter((g) =>
    g.name.toLowerCase().includes(filter.toLowerCase()),
  )

  const onNew = () => {
    if (nodes.length > 0 && !window.confirm('Discard current workflow?')) return
    clear()
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between">
        <span style={serif} className="text-[13px] italic normal-case text-sidebar-foreground">
          Workflows
        </span>
        <Badge variant="secondary" style={mono} className="text-[9px] uppercase tracking-[0.16em]">
          {myGraphs?.length ?? 0}
        </Badge>
      </SidebarGroupLabel>

      <SidebarGroupContent className="space-y-2 px-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onNew}
          className="w-full justify-start border-dashed"
        >
          <FilePlus2 />
          <span style={mono} className="text-[10px] uppercase tracking-[0.16em]">
            New workflow
          </span>
        </Button>

        {(myGraphs?.length ?? 0) >= 5 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter"
              className="h-8 pl-7 text-[12px]"
            />
          </div>
        )}

        <SidebarMenu>
          {myGraphs === undefined ? (
            <>
              <SidebarMenuSkeleton showIcon />
              <SidebarMenuSkeleton showIcon />
              <SidebarMenuSkeleton showIcon />
            </>
          ) : myGraphs.length === 0 ? (
            <EmptyBlock
              label="No workflows yet"
              hint="Build a graph · hit Save"
              icon={<Workflow className="h-5 w-5 text-muted-foreground" />}
            />
          ) : filtered?.length === 0 ? (
            <p
              style={mono}
              className="px-2 py-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              No matches
            </p>
          ) : (
            filtered?.map((g) => {
              const active = g._id === currentGraphId
              const nodeCount = Array.isArray(g.nodes) ? g.nodes.length : 0
              return (
                <SidebarMenuItem key={g._id}>
                  <SidebarMenuButton
                    isActive={active}
                    onClick={() => {
                      loadGraph(g.nodes as never, g.edges as never)
                      setCurrentGraph(g._id, g.name)
                    }}
                    className="h-auto flex-col items-start gap-0.5 py-2"
                  >
                    <div className="flex w-full items-center gap-2">
                      <Workflow
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          active ? 'text-emerald-400' : 'text-muted-foreground',
                        )}
                      />
                      <span className="truncate text-[12.5px] text-sidebar-foreground">
                        {g.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 pl-5.5">
                      <span
                        style={mono}
                        className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground"
                      >
                        {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
                      </span>
                      <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" />
                      <span
                        style={mono}
                        className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground"
                      >
                        {relativeTime(g.updatedAt)}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/* ─────────────────────────  History  ───────────────────────── */

type RunSummary = {
  _id: string
  status: 'running' | 'done' | 'error' | 'stopped'
  model: string
  startedAt: number
  finishedAt: number | null
  totalInputTokens: number
  totalOutputTokens: number
  graphName: string
}

function formatDuration(startedAt: number, finishedAt: number | null): string {
  const ms = (finishedAt ?? Date.now()) - startedAt
  if (ms < 1000) return `${ms}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  if (n < 100_000) return `${(n / 1000).toFixed(1)}k`
  return `${Math.round(n / 1000)}k`
}

function HistorySection() {
  const { isSignedIn } = useUser()
  const runs = useQuery(api.runs.listRecent, isSignedIn ? {} : 'skip')
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const toggle = (id: string) => setSelectedRunId((prev) => (prev === id ? null : id))

  if (!isSignedIn) {
    return <SignedOutPrompt label="Sign in to see your run history" />
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between">
        <span style={serif} className="text-[13px] italic normal-case text-sidebar-foreground">
          Recent runs
        </span>
        <Badge variant="secondary" style={mono} className="text-[9px] uppercase tracking-[0.16em]">
          {runs?.length ?? 0}
        </Badge>
      </SidebarGroupLabel>

      <SidebarGroupContent>
        {runs === undefined ? (
          <div className="space-y-1 px-2">
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
          </div>
        ) : runs.length === 0 ? (
          <EmptyBlock
            label="No runs yet"
            hint="Hit Run · history will appear"
            icon={<History className="h-5 w-5 text-muted-foreground" />}
          />
        ) : (
          <SidebarMenu>
            {runs.map((r) => (
              <div key={r._id}>
                <HistoryRow
                  run={r}
                  isExpanded={selectedRunId === r._id}
                  onToggle={() => toggle(r._id)}
                />
                {selectedRunId === r._id && <RunDetail run={r} />}
              </div>
            ))}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function HistoryRow({
  run,
  isExpanded,
  onToggle,
}: {
  run: RunSummary
  isExpanded: boolean
  onToggle: () => void
}) {
  const palette = statusPalette(run.status)
  const cost = estimateCost(run.model, run.totalInputTokens, run.totalOutputTokens)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={onToggle}
        isActive={isExpanded}
        className="h-auto flex-col items-start gap-0.5 py-2"
      >
        <div className="flex w-full items-center gap-2">
          <span className={cn('shrink-0', palette.text)}>{palette.icon}</span>
          <span className="min-w-0 flex-1 truncate text-[12px] text-sidebar-foreground">
            {run.graphName}
          </span>
          {isExpanded
            ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          }
        </div>
        <div className="flex flex-wrap items-center gap-1 pl-5">
          <span style={mono} className={cn('text-[9px] uppercase tracking-[0.16em]', palette.text)}>
            {run.status}
          </span>
          <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" />
          <span style={mono} className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            {relativeTime(run.startedAt)}
          </span>
          <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" />
          <span style={mono} className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            {formatDuration(run.startedAt, run.finishedAt)}
          </span>
          {cost !== null && (
            <>
              <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" />
              <span style={mono} className="text-[9px] uppercase tracking-[0.14em] text-emerald-500/80">
                {formatCost(cost)}
              </span>
            </>
          )}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function RunDetail({ run }: { run: RunSummary }) {
  const events = useQuery(api.runs.getEvents, { runId: run._id as Id<'runs'> })
  const storeNodes = useGraphStore((s) => s.nodes)

  if (!events) {
    return (
      <div className="mx-2 mb-1 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-3 py-2">
        <p style={mono} className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const summaries = deriveNodeSummaries(events, storeNodes)

  return (
    <div className="mx-2 mb-1 space-y-1 rounded-md border border-sidebar-border bg-sidebar-accent/30 p-2">
      {summaries.length === 0 ? (
        <p style={mono} className="px-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">No events</p>
      ) : summaries.map((s) => {
        const palette = statusPalette(s.status)
        const cost = estimateCost(run.model, s.inputTokens, s.outputTokens)
        const total = s.inputTokens + s.outputTokens
        return (
          <div key={s.nodeId} className="rounded border border-sidebar-border/60 bg-background/30 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className={cn('shrink-0', palette.text)}>{palette.icon}</span>
                <span style={mono} className="truncate text-[10px] uppercase tracking-[0.14em]">{s.label}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {total > 0 && (
                  <span style={mono} className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                    {formatTokens(s.inputTokens)}↑ {formatTokens(s.outputTokens)}↓
                  </span>
                )}
                {cost !== null && cost > 0 && (
                  <span style={mono} className="text-[9px] text-emerald-500/70">{formatCost(cost)}</span>
                )}
              </div>
            </div>
            {s.output && (
              <p className="mt-1 line-clamp-2 pl-4 text-[10.5px] leading-relaxed text-muted-foreground">{s.output}</p>
            )}
            {s.error && (
              <p className="mt-1 line-clamp-2 pl-4 text-[10.5px] leading-relaxed text-red-400">{s.error}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function deriveNodeSummaries(
  events: { nodeId: string; kind: string; text: string | null; inputTokens: number | null; outputTokens: number | null }[],
  storeNodes: { id: string; data: { label?: string } }[],
) {
  const order: string[] = []
  const map = new Map<string, { nodeId: string; label: string; status: 'running' | 'done' | 'error'; inputTokens: number; outputTokens: number; output: string | null; error: string | null }>()

  for (const e of events) {
    if (!map.has(e.nodeId)) {
      order.push(e.nodeId)
      const node = storeNodes.find((n) => n.id === e.nodeId)
      map.set(e.nodeId, { nodeId: e.nodeId, label: node?.data?.label ?? e.nodeId, status: 'running', inputTokens: 0, outputTokens: 0, output: null, error: null })
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
        icon: <CircleDot className="h-3 w-3 animate-pulse" />,
      }
    case 'done':
      return {
        text: 'text-emerald-400',
        icon: <CheckCircle2 className="h-3 w-3" />,
      }
    case 'error':
      return {
        text: 'text-red-400',
        icon: <XCircle className="h-3 w-3" />,
      }
    case 'stopped':
      return {
        text: 'text-muted-foreground',
        icon: <Square className="h-3 w-3 fill-current" />,
      }
  }
}

/* ─────────────────────────  Settings + Account  ───────────────────────── */

function SettingsSection() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel style={serif} className="text-[13px] italic normal-case text-sidebar-foreground">
        Settings
      </SidebarGroupLabel>
      <SidebarGroupContent className="px-2">
        <div className="rounded-md border border-dashed border-sidebar-border bg-sidebar-accent/30 px-3 py-4 text-center">
          <p style={serif} className="text-[12.5px] italic text-sidebar-foreground">
            Coming soon
          </p>
          <p
            style={mono}
            className="mt-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            API keys · Defaults · Theme
          </p>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function AccountSection() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel style={serif} className="text-[13px] italic normal-case text-sidebar-foreground">
        Account
      </SidebarGroupLabel>
      <SidebarGroupContent className="space-y-2 px-2">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button variant="outline" size="sm" className="w-full">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="sm" className="w-full">
              Create account
            </Button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <SignedInAccount />
        </Show>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function SignedInAccount() {
  const { user } = useUser()
  return (
    <div className="flex items-center gap-3 rounded-md border border-sidebar-border bg-sidebar-accent/40 p-2.5">
      <div className="shrink-0">
        <UserButton />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] text-sidebar-foreground">
          {user?.fullName || user?.firstName || 'Signed in'}
        </p>
        <p
          style={mono}
          className="mt-0.5 truncate text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          {user?.primaryEmailAddress?.emailAddress ?? ''}
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────  Shared bits  ───────────────────────── */

function EmptyBlock({
  label,
  hint,
  icon,
}: {
  label: string
  hint: string
  icon: React.ReactNode
}) {
  return (
    <div className="px-2 pb-3 pt-1">
      <div
        className="flex flex-col items-center gap-2 rounded-md border border-dashed border-sidebar-border px-3 py-5 text-center"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.012) 6px 7px)',
        }}
      >
        {icon}
        <p style={serif} className="text-[12.5px] italic text-sidebar-foreground">
          {label}
        </p>
        <p
          style={mono}
          className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground"
        >
          {hint}
        </p>
      </div>
    </div>
  )
}

function SignedOutPrompt({ label }: { label: string }) {
  return (
    <div className="px-2 pb-3 pt-2">
      <div className="rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-4 text-center">
        <p style={serif} className="text-[12.5px] italic text-sidebar-foreground">
          {label}
        </p>
        <SignInButton mode="modal">
          <Button variant="outline" size="sm" className="mt-3">
            Sign in
          </Button>
        </SignInButton>
      </div>
    </div>
  )
}
