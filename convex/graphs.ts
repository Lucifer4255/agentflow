import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireUser } from './users'

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) return []
    return await ctx.db
      .query('graphs')
      .withIndex('by_ownerId_and_updatedAt', (q) => q.eq('ownerId', user._id))
      .order('desc')
      .take(50)
  },
})

export const get = query({
  args: { id: v.id('graphs') },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx)
    const graph = await ctx.db.get(id)
    if (!graph || graph.ownerId !== user._id) return null
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
    const user = await requireUser(ctx)
    return await ctx.db.insert('graphs', {
      ownerId: user._id,
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
    const user = await requireUser(ctx)
    const existing = await ctx.db.get(id)
    if (!existing || existing.ownerId !== user._id) throw new Error('Graph not found')
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
    const user = await requireUser(ctx)
    const existing = await ctx.db.get(id)
    if (!existing || existing.ownerId !== user._id) throw new Error('Graph not found')
    await ctx.db.delete(id)
  },
})

export const rename = mutation({
  args: { id: v.id('graphs'), name: v.string() },
  handler: async (ctx, { id, name }) => {
    const user = await requireUser(ctx)
    const existing = await ctx.db.get(id)
    if (!existing || existing.ownerId !== user._id) throw new Error('Graph not found')
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
    const user = await requireUser(ctx)
    const existing = await ctx.db.get(id)
    if (!existing || existing.ownerId !== user._id) throw new Error('Graph not found')
    await ctx.db.patch(id, { isPublic: true, ...(defaultModel ? { defaultModel } : {}) })
  },
})

export const unpublish = mutation({
  args: { id: v.id('graphs') },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx)
    const existing = await ctx.db.get(id)
    if (!existing || existing.ownerId !== user._id) throw new Error('Graph not found')
    await ctx.db.patch(id, { isPublic: false })
  },
})
