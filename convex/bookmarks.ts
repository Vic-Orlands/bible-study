import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listForGuest = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const byUser = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const byGuest = await ctx.db
      .query("bookmarks")
      .filter((q) => q.and(
        q.eq(q.field("guestId"), userId),
        q.eq(q.field("userId"), undefined)
      ))
      .collect();

    const seen = new Set(byUser.map((b) => b._id.toString()));
    const merged = [...byUser, ...byGuest.filter((b) => {
      const key = b._id.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })];

    return merged.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
  },
});

export const isBookmarked = query({
  args: {
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const userId = identity.subject;

    const byUser = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_passage", (q) =>
        q
          .eq("userId", userId)
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
          .eq("passageVerse", args.passageVerse)
      )
      .unique();

    if (byUser) return true;

    const byGuest = await ctx.db
      .query("bookmarks")
      .filter((q) => q.and(
        q.eq(q.field("guestId"), userId),
        q.eq(q.field("userId"), undefined),
        q.eq(q.field("passageBook"), args.passageBook),
        q.eq(q.field("passageChapter"), args.passageChapter),
        q.eq(q.field("passageVerse"), args.passageVerse)
      ))
      .first();

    return byGuest !== null;
  },
});

export const toggle = mutation({
  args: {
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    const byUser = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_passage", (q) =>
        q
          .eq("userId", userId)
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
          .eq("passageVerse", args.passageVerse)
      )
      .first();

    if (byUser) {
      await ctx.db.delete(byUser._id);
      return false;
    }

    await ctx.db.insert("bookmarks", {
      userId,
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse,
    });
    return true;
  },
});
