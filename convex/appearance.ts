import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getViewer, requireViewer } from "./ownership";

const direction = v.union(v.literal("canon"), v.literal("thread"));
const scheme = v.union(v.literal("light"), v.literal("dark"));

export const get = query({
  args: {
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.identityId);
    if (!viewer) return null;
    return await ctx.db
      .query("appearance")
      .withIndex("by_owner", (q) => q.eq("ownerKey", viewer.ownerKey))
      .unique();
  },
});

export const save = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
    direction,
    scheme,
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const current = await ctx.db
      .query("appearance")
      .withIndex("by_owner", (q) => q.eq("ownerKey", viewer.ownerKey))
      .unique();
    const value = {
      direction: args.direction,
      scheme: args.scheme,
      updatedAt: Date.now(),
    };
    if (current) {
      await ctx.db.patch(current._id, value);
      return current._id;
    }
    return await ctx.db.insert("appearance", {
      ownerKey: viewer.ownerKey,
      ...value,
    });
  },
});
