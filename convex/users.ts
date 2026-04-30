import { mutation, query, type QueryCtx, type MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
): Promise<{ _id: Id<'users'>; tokenIdentifier: string; email: string | null; name: string | null }> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not signed in')
  const user = await ctx.db
    .query('users')
    .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
    .unique()
  if (!user) throw new Error('User not provisioned — call users.getOrCreate first')
  return user
}

export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not signed in')

    const existing = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()

    const email = identity.email ?? null
    const name = identity.name ?? null

    if (existing) {
      if (existing.email !== email || existing.name !== name) {
        await ctx.db.patch(existing._id, { email, name })
      }
      return existing._id
    }

    return await ctx.db.insert('users', {
      tokenIdentifier: identity.tokenIdentifier,
      email,
      name,
    })
  },
})

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const user = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    return user
  },
})
