import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listForPassage = query({
  args: {
    passageBook: v.string(),
    passageChapter: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_passage", (q) =>
        q
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
      )
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    guestId: v.string(),
    guestName: v.string(),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
    translationLabel: v.string(),
    content: v.string(),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("comments", {
      guestId: args.guestId,
      guestName: args.guestName,
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse,
      translationLabel: args.translationLabel,
      content: args.content,
      parentId: args.parentId,
      likes: [],
    });
  },
});

export const toggleLike = mutation({
  args: {
    id: v.id("comments"),
    guestId: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment) {
      return;
    }
    const already = comment.likes.includes(args.guestId);
    await ctx.db.patch(args.id, {
      likes: already
        ? comment.likes.filter((id) => id !== args.guestId)
        : [...comment.likes, args.guestId],
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("comments"),
    guestId: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment || comment.guestId !== args.guestId) {
      return;
    }
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("comments"),
    guestId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment || comment.guestId !== args.guestId) {
      return;
    }
    await ctx.db.patch(args.id, { content: args.content });
  },
});
