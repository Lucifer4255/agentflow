import { action, internalQuery, mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'

export const findConversation = query({
  args: { graphId: v.string(), sessionId: v.string() },
  handler: async (ctx, { graphId, sessionId }) => {
    return await ctx.db
      .query('conversations')
      .withIndex('by_session', (q) => q.eq('graphId', graphId).eq('sessionId', sessionId))
      .unique()
  },
})

export const getOrCreate = mutation({
  args: { graphId: v.string(), sessionId: v.string() },
  handler: async (ctx, { graphId, sessionId }) => {
    const existing = await ctx.db
      .query('conversations')
      .withIndex('by_session', (q) => q.eq('graphId', graphId).eq('sessionId', sessionId))
      .unique()
    if (existing) return existing._id
    return await ctx.db.insert('conversations', { graphId, sessionId, createdAt: Date.now() })
  },
})

export const getRecent = query({
  args: { conversationId: v.id('conversations'), limit: v.number() },
  handler: async (ctx, { conversationId, limit }) => {
    return await ctx.db
      .query('chatMessages')
      .withIndex('by_conversation_and_time', (q) => q.eq('conversationId', conversationId))
      .order('desc')
      .take(limit)
      .then((rows) => rows.reverse())
  },
})

export const store = mutation({
  args: {
    conversationId: v.id('conversations'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, { conversationId, role, content, embedding }) => {
    return await ctx.db.insert('chatMessages', {
      conversationId,
      role,
      content,
      embedding,
      createdAt: Date.now(),
    })
  },
})

export const fetchByIds = internalQuery({
  args: { ids: v.array(v.id('chatMessages')) },
  handler: async (ctx, { ids }) => {
    const docs = await Promise.all(ids.map((id) => ctx.db.get(id)))
    return docs.filter((d): d is Doc<'chatMessages'> => d !== null)
  },
})

export const searchRelevant = action({
  args: {
    conversationId: v.id('conversations'),
    embedding: v.array(v.number()),
    limit: v.number(),
  },
  handler: async (ctx, { conversationId, embedding, limit }): Promise<Doc<'chatMessages'>[]> => {
    const results = await ctx.vectorSearch('chatMessages', 'by_embedding', {
      vector: embedding,
      limit,
      filter: (q) => q.eq('conversationId', conversationId as Id<'conversations'>),
    })
    if (results.length === 0) return []
    const docs = await ctx.runQuery(internal.memory.fetchByIds, {
      ids: results.map((r) => r._id),
    })
    return docs
  },
})
