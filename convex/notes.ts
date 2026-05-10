import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listForPassage = query({
  args: {
    guestId: v.string(),
    passageBook: v.string(),
    passageChapter: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_guest_passage", (q) =>
        q
          .eq("guestId", args.guestId)
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
    passageVerse: v.optional(v.number()),
    content: v.string(),
    type: v.union(
      v.literal("observation"),
      v.literal("interpretation"),
      v.literal("application")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notes", {
      guestId: args.guestId,
      guestName: args.guestName,
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse,
      content: args.content,
      type: args.type,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("notes"),
    guestId: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note || note.guestId !== args.guestId) {
      return;
    }
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("notes"),
    guestId: v.string(),
    content: v.string(),
    type: v.optional(v.union(
      v.literal("observation"),
      v.literal("interpretation"),
      v.literal("application")
    )),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note || note.guestId !== args.guestId) {
      return;
    }
    await ctx.db.patch(args.id, {
      content: args.content,
      ...(args.type !== undefined && { type: args.type }),
    });
  },
});
