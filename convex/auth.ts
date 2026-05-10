import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
});

export const getUserIdentity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      return {
        userId: identity.subject,
        fullName: identity.name ?? null,
        email: identity.email ?? null,
        pictureUrl: identity.pictureUrl ?? null,
        identityId: null,
        displayName: identity.name ?? identity.email ?? "Anonymous",
        isAnonymous: false,
      };
    }
    return null;
  },
});
