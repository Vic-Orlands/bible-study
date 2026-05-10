import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listForGuest = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("bookmarks")
      .order("desc")
      .collect();
  },
});

export const isBookmarked = query({
  args: {
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
  },
  handler: async (ctx, args) => {
    const bookmark = await ctx.db
      .query("bookmarks")
      .filter((q) =>
        q.and(
          q.eq(q.field("passageBook"), args.passageBook),
          q.eq(q.field("passageChapter"), args.passageChapter),
          q.eq(q.field("passageVerse"), args.passageVerse)
        )
      )
      .first();
    return bookmark !== null;
  },
});

export const toggle = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bookmarks")
      .filter((q) =>
        q.and(
          q.eq(q.field("passageBook"), args.passageBook),
          q.eq(q.field("passageChapter"), args.passageChapter),
          q.eq(q.field("passageVerse"), args.passageVerse)
        )
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert("bookmarks", {
      identityId: args.identityId ?? undefined,
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse,
    });
    return true;
  },
});