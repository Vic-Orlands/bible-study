import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listForPassage = query({
  args: {
    passageBook: v.string(),
    passageChapter: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const byUser = await ctx.db
      .query("notes")
      .withIndex("by_user_passage", (q) =>
        q
          .eq("userId", userId)
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
      )
      .order("desc")
      .collect();

    const byGuest = await ctx.db
      .query("notes")
      .filter((q) => q.and(
        q.eq(q.field("guestId"), userId),
        q.eq(q.field("userId"), undefined),
        q.eq(q.field("passageBook"), args.passageBook),
        q.eq(q.field("passageChapter"), args.passageChapter)
      ))
      .collect();

    const seen = new Set(byUser.map((n) => n._id.toString()));
    const merged = [...byUser, ...byGuest.filter((n) => {
      const key = n._id.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })];

    return merged.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
  },
});

export const create = mutation({
  args: {
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("notes", {
      userId: identity.subject,
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse,
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
      v.literal("application")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.id);
  },
});
