import { betterAuth } from "better-auth";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const appUrl = process.env.SITE_URL!;

export const betterAuthComponent = createClient<DataModel>(
  components.betterAuth,
);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: appUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    database: betterAuthComponent.adapter(ctx),
    trustedOrigins: [appUrl].filter((origin): origin is string => !!origin),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    plugins: [convex({ authConfig })],
  });

export const { getAuthUser } = betterAuthComponent.clientApi();

export const getUserIdentity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const linkedIdentity = await ctx.db
        .query("identities")
        .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
        .first();
      const user = await betterAuthComponent.safeGetAuthUser(ctx);
      return {
        userId: identity.tokenIdentifier,
        fullName: user?.name ?? identity.name ?? null,
        email: user?.email ?? identity.email ?? null,
        pictureUrl: user?.image ?? identity.pictureUrl ?? null,
        identityId: linkedIdentity?._id ?? null,
        displayName:
          linkedIdentity?.displayName ??
          user?.name ??
          identity.name ??
          identity.email ??
          "Anonymous",
        isAnonymous: false,
      };
    }
    return null;
  },
});
