import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getViewer, requireViewer } from "./ownership";

export const list = query({
  args: {
    identityId: v.optional(v.id("identities")),
    filter: v.optional(v.union(
      v.literal("all"),
      v.literal("unread"),
      v.literal("mentions"),
    )),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.identityId);
    if (!viewer) return [];

    const base = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", viewer.ownerKey))
      .order("desc");

    const all = await base.collect();

    if (args.filter === "unread") {
      return all.filter((n) => !n.read);
    }
    if (args.filter === "mentions") {
      return all.filter((n) => n.type === "mention");
    }
    return all;
  },
});

export const markRead = mutation({
  args: {
    id: v.id("notifications"),
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);

    const notif = await ctx.db.get(args.id);
    if (!notif || notif.userId !== viewer.ownerKey) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, { read: true });
  },
});

export const markAllRead = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", viewer.ownerKey).eq("read", false)
      )
      .collect();

    for (const notif of unread) {
      await ctx.db.patch(notif._id, { read: true });
    }
  },
});

export const clearAll = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);

    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", viewer.ownerKey))
      .collect();

    for (const notif of all) {
      await ctx.db.delete(notif._id);
    }
  },
});
