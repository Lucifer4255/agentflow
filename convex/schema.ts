import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.union(v.string(), v.null()),
    name: v.union(v.string(), v.null()),
  }).index('by_tokenIdentifier', ['tokenIdentifier']),

  graphs: defineTable({
    ownerId: v.id('users'),
    name: v.string(),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
    updatedAt: v.number(),
  })
    .index('by_ownerId', ['ownerId'])
    .index('by_ownerId_and_updatedAt', ['ownerId', 'updatedAt']),

  runs: defineTable({
    graphId: v.id('graphs'),
    ownerId: v.id('users'),
    status: v.union(
      v.literal('running'),
      v.literal('done'),
      v.literal('error'),
      v.literal('stopped'),
    ),
    model: v.string(),
    startedAt: v.number(),
    finishedAt: v.union(v.number(), v.null()),
    totalInputTokens: v.number(),
    totalOutputTokens: v.number(),
    error: v.union(v.string(), v.null()),
  })
    .index('by_graphId', ['graphId'])
    .index('by_ownerId_and_startedAt', ['ownerId', 'startedAt']),

  runEvents: defineTable({
    runId: v.id('runs'),
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
  }).index('by_runId_and_at', ['runId', 'at']),
})
