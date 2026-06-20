import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getViewer, requireViewer } from "./ownership";

const preferenceDefaults = {
  comments: true,
  dailyReminder: true,
  likes: true,
  mentions: true,
  planMilestones: true,
  reminderHour: 8,
  replies: true,
  verseOfDay: true,
};

export const pushDelivery = internalQuery({
  args: { ownerKey: v.string(), type: v.string() },
  handler: async (ctx, args) => {
    const preferences = await ctx.db.query("notificationPreferences").withIndex("by_owner", (q) => q.eq("ownerKey", args.ownerKey)).unique();
    const enabled = Boolean(preferences?.[args.type as keyof typeof preferenceDefaults] ?? preferenceDefaults[args.type as keyof typeof preferenceDefaults] ?? true);
    if (!enabled) return [];
    return await ctx.db.query("pushSubscriptions").withIndex("by_owner", (q) => q.eq("ownerKey", args.ownerKey)).collect();
  },
});

export const preferences = query({
  args: { identityId: v.optional(v.id("identities")) },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.identityId);
    if (!viewer) return null;
    return (await ctx.db.query("notificationPreferences").withIndex("by_owner", (q) => q.eq("ownerKey", viewer.ownerKey)).unique()) ?? preferenceDefaults;
  },
});

export const savePreferences = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
    comments: v.boolean(), dailyReminder: v.boolean(), likes: v.boolean(), mentions: v.boolean(), planMilestones: v.boolean(), reminderHour: v.number(), replies: v.boolean(), verseOfDay: v.boolean(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const current = await ctx.db.query("notificationPreferences").withIndex("by_owner", (q) => q.eq("ownerKey", viewer.ownerKey)).unique();
    const value = { comments: args.comments, dailyReminder: args.dailyReminder, likes: args.likes, mentions: args.mentions, planMilestones: args.planMilestones, reminderHour: args.reminderHour, replies: args.replies, verseOfDay: args.verseOfDay, updatedAt: Date.now() };
    if (current) await ctx.db.patch(current._id, value); else await ctx.db.insert("notificationPreferences", { ownerKey: viewer.ownerKey, ...value });
  },
});

export const registerPushToken = mutation({
  args: { identityId: v.optional(v.id("identities")), token: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const current = await ctx.db.query("pushSubscriptions").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    const now = Date.now();
    if (current) await ctx.db.patch(current._id, { ownerKey: viewer.ownerKey, updatedAt: now }); else await ctx.db.insert("pushSubscriptions", { ownerKey: viewer.ownerKey, token: args.token, createdAt: now, updatedAt: now });
  },
});

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
