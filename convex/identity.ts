import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByIpHash = query({
  args: { ipHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("identities")
      .withIndex("by_ipHash", (q) => q.eq("ipHash", args.ipHash))
      .first();
  },
});

export const createFromIp = mutation({
  args: { ipHash: v.string() },
  handler: async (ctx, args) => {
    const shortId = args.ipHash.slice(0, 4).toUpperCase();
    return await ctx.db.insert("identities", {
      ipHash: args.ipHash,
      displayName: `Anonymous-${shortId}`,
      isAnonymous: true,
      userId: undefined,
      createdAt: Date.now(),
    });
  },
});