import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireUser } from './users'
import { getAuthUserId } from '@convex-dev/auth/server'

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    return await ctx.db
      .query('graphs')
      .withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', userId))
      .order('desc')
      .take(50)
  },
})

export const get = query({
  args: { id: v.id('graphs') },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx)
    const graph = await ctx.db.get(id)
    if (!graph || graph.ownerId !== userId) return null
    return graph
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
  },
  handler: async (ctx, { name, nodes, edges }) => {
    const userId = await requireUser(ctx)
    return await ctx.db.insert('graphs', {
      ownerId: userId,
      name,
      nodes,
      edges,
      updatedAt: Date.now(),
    })
  },
})

export const save = mutation({
  args: {
    id: v.id('graphs'),
    name: v.optional(v.string()),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
  },
  handler: async (ctx, { id, name, nodes, edges }) => {
    const userId = await requireUser(ctx)
    const existing = await ctx.db.get(id)
    if (!existing || existing.ownerId !== userId) throw new Error('Graph not found')
    await ctx.db.patch(id, {
      ...(name !== undefined ? { name } : {}),
      nodes,
      edges,
      updatedAt: Date.now(),
    })
    return id
  },
})

export const remove = mutation({
  args: { id: v.id('graphs') },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx)
    const existing = await ctx.db.get(id)
    if (!existing || existing.ownerId !== userId) throw new Error('Graph not found')
    await ctx.db.delete(id)
  },
})

export const rename = mutation({
  args: { id: v.id('graphs'), name: v.string() },
  handler: async (ctx, { id, name }) => {
    const userId = await requireUser(ctx)
    const existing = await ctx.db.get(id)
    if (!existing || existing.ownerId !== userId) throw new Error('Graph not found')
    await ctx.db.patch(id, { name, updatedAt: Date.now() })
  },
})

export const getPublic = query({
  args: { id: v.id('graphs') },
  handler: async (ctx, { id }) => {
    const graph = await ctx.db.get(id)
    if (!graph || !graph.isPublic) return null
    return graph
  },
})

export const publish = mutation({
  args: { id: v.id('graphs'), defaultModel: v.optional(v.string()) },
  handler: async (ctx, { id, defaultModel }) => {
    const userId = await requireUser(ctx)
    const existing = await ctx.db.get(id)
    if (!existing || existing.ownerId !== userId) throw new Error('Graph not found')
    await ctx.db.patch(id, { isPublic: true, ...(defaultModel ? { defaultModel } : {}) })
  },
})

export const unpublish = mutation({
  args: { id: v.id('graphs') },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx)
    const existing = await ctx.db.get(id)
    if (!existing || existing.ownerId !== userId) throw new Error('Graph not found')
    await ctx.db.patch(id, { isPublic: false })
  },
})
