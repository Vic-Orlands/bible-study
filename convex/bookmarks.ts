import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listForGuest = query({
  args: {
    guestId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookmarks")
      .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
      .collect();
  },
});

export const isBookmarked = query({
  args: {
    guestId: v.string(),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
  },
  handler: async (ctx, args) => {
    const bookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_guest_passage", (q) =>
        q
          .eq("guestId", args.guestId)
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
          .eq("passageVerse", args.passageVerse)
      )
      .unique();
    return bookmark !== null;
  },
});

export const toggle = mutation({
  args: {
    guestId: v.string(),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_guest_passage", (q) =>
        q
          .eq("guestId", args.guestId)
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
          .eq("passageVerse", args.passageVerse)
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert("bookmarks", {
      guestId: args.guestId,
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse,
    });
    return true;
  },
});
