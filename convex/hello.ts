import { query } from './_generated/server'

export const whoami = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { signedIn: false as const }
    return {
      signedIn: true as const,
      subject: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email ?? null,
      name: identity.name ?? null,
    }
  },
})
