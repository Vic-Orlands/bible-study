import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listForPassage = query({
  args: {
    passageBook: v.string(),
    passageChapter: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
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
    identityId: v.optional(v.id("identities")),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.optional(v.number()),
    content: v.string(),
    type: v.union(
      v.literal("observation"),
      v.literal("interpretation"),
      v.literal("application"),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notes", {
      identityId: args.identityId ?? undefined,
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse ?? undefined,
      content: args.content,
      type: args.type,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("notes"),
    content: v.string(),
    type: v.optional(v.union(
      v.literal("observation"),
      v.literal("interpretation"),
      v.literal("application"),
    )),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      content: args.content,
      ...(args.type !== undefined && { type: args.type }),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("notes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});