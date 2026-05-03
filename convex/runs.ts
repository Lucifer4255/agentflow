import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireUser } from './users'
import { getAuthUserId } from '@convex-dev/auth/server'

const eventValidator = v.object({
  nodeId: v.string(),
  kind: v.union(
    v.literal('node_start'),
    v.literal('node_delta'),
    v.literal('node_end'),
    v.literal('node_error'),
    v.literal('tool_call'),
  ),
  text: v.union(v.string(), v.null()),
  inputTokens: v.union(v.number(), v.null()),
  outputTokens: v.union(v.number(), v.null()),
  at: v.number(),
})

export const start = mutation({
  args: {
    graphId: v.id('graphs'),
    model: v.string(),
  },
  handler: async (ctx, { graphId, model }) => {
    const userId = await requireUser(ctx)
    const graph = await ctx.db.get(graphId)
    if (!graph || graph.ownerId !== userId) throw new Error('Graph not found')
    return await ctx.db.insert('runs', {
      graphId,
      ownerId: userId,
      status: 'running',
      model,
      startedAt: Date.now(),
      finishedAt: null,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      error: null,
    })
  },
})

export const appendEvents = mutation({
  args: {
    runId: v.id('runs'),
    events: v.array(eventValidator),
  },
  handler: async (ctx, { runId, events }) => {
    const userId = await requireUser(ctx)
    const run = await ctx.db.get(runId)
    if (!run || run.ownerId !== userId) throw new Error('Run not found')
    for (const e of events) {
      await ctx.db.insert('runEvents', { runId, ...e })
    }
  },
})

export const finish = mutation({
  args: {
    runId: v.id('runs'),
    status: v.union(
      v.literal('done'),
      v.literal('error'),
      v.literal('stopped'),
    ),
    totalInputTokens: v.number(),
    totalOutputTokens: v.number(),
    error: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { runId, status, totalInputTokens, totalOutputTokens, error }) => {
    const userId = await requireUser(ctx)
    const run = await ctx.db.get(runId)
    if (!run || run.ownerId !== userId) throw new Error('Run not found')
    await ctx.db.patch(runId, {
      status,
      totalInputTokens,
      totalOutputTokens,
      error,
      finishedAt: Date.now(),
    })
  },
})

export const listForGraph = query({
  args: { graphId: v.id('graphs') },
  handler: async (ctx, { graphId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const graph = await ctx.db.get(graphId)
    if (!graph || graph.ownerId !== userId) return []
    return await ctx.db
      .query('runs')
      .withIndex('by_graphId', (q) => q.eq('graphId', graphId))
      .order('desc')
      .take(20)
  },
})

export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const recent = await ctx.db
      .query('runs')
      .withIndex('by_ownerId_and_startedAt', (q) => q.eq('ownerId', userId))
      .order('desc')
      .take(30)
    const graphIds = Array.from(new Set(recent.map((r) => r.graphId)))
    const graphs = await Promise.all(graphIds.map((id) => ctx.db.get(id)))
    const graphNameById = new Map(graphs.map((g) => [g?._id, g?.name ?? 'Untitled']))
    return recent.map((r) => ({
      ...r,
      graphName: graphNameById.get(r.graphId) ?? 'Untitled',
    }))
  },
})

export const getEvents = query({
  args: { runId: v.id('runs') },
  handler: async (ctx, { runId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const run = await ctx.db.get(runId)
    if (!run || run.ownerId !== userId) return []
    return await ctx.db
      .query('runEvents')
      .withIndex('by_runId_and_at', (q) => q.eq('runId', runId))
      .take(2000)
  },
})
