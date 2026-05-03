import { query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

export const whoami = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { signedIn: false as const }
    const user = await ctx.db.get(userId)
    return {
      signedIn: true as const,
      email: user?.email ?? null,
      name: user?.name ?? null,
    }
  },
})
