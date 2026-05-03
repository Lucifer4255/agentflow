import { defineSchema, defineTable } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'
import { v } from 'convex/values'

export default defineSchema({
  ...authTables,

  graphs: defineTable({
    ownerId: v.id('users'),
    name: v.string(),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
    updatedAt: v.number(),
    isPublic: v.optional(v.boolean()),
    defaultModel: v.optional(v.string()),
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

  conversations: defineTable({
    graphId: v.string(),
    sessionId: v.string(),
    createdAt: v.number(),
  }).index('by_session', ['graphId', 'sessionId']),

  chatMessages: defineTable({
    conversationId: v.id('conversations'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    embedding: v.array(v.number()),
    createdAt: v.number(),
  })
    .index('by_conversation_and_time', ['conversationId', 'createdAt'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 3072,
      filterFields: ['conversationId'],
    }),
})
