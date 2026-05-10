import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    filter: v.optional(v.union(
      v.literal("all"),
      v.literal("unread"),
      v.literal("mentions"),
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const base = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const notif = await ctx.db.get(args.id);
    if (!notif || notif.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, { read: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", identity.subject).eq("read", false)
      )
      .collect();

    for (const notif of unread) {
      await ctx.db.patch(notif._id, { read: true });
    }
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    for (const notif of all) {
      await ctx.db.delete(notif._id);
    }
  },
});
