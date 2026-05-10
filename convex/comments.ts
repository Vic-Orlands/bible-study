import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
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
    identityId: v.optional(v.id("identities")),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
    translationLabel: v.string(),
    content: v.string(),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const identityDoc = args.identityId ? await ctx.db.get(args.identityId) : null;
    const displayName = identity?.name ?? identity?.email ?? identityDoc?.displayName ?? "Anonymous";

    const comment = await ctx.db.insert("comments", {
      identityId: args.identityId ?? undefined,
      userId: identity?.subject ?? identityDoc?.userId ?? undefined,
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse,
      translationLabel: args.translationLabel,
      content: args.content,
      parentId: args.parentId,
      likes: [],
    });

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (parent && parent.userId) {
        await ctx.db.insert("notifications", {
          userId: parent.userId,
          type: "reply",
          read: false,
          actorName: displayName,
          actorAvatar: identity?.pictureUrl ?? undefined,
          passageBook: args.passageBook,
          passageChapter: args.passageChapter,
          passageVerse: args.passageVerse,
          commentId: comment,
          preview: args.content.slice(0, 100),
          createdAt: Date.now(),
        });
      }
    }

    return comment;
  },
});

export const toggleLike = mutation({
  args: {
    id: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Comment not found");

    const userId = identity.subject;
    const already = comment.likes.includes(userId);
    await ctx.db.patch(args.id, {
      likes: already
        ? comment.likes.filter((id) => id !== userId)
        : [...comment.likes, userId],
    });

    if (!already && comment.userId && comment.userId !== userId) {
      await ctx.db.insert("notifications", {
        userId: comment.userId,
        type: "like",
        read: false,
        actorName: identity.name ?? identity.email ?? "Anonymous",
        actorAvatar: identity.pictureUrl ?? undefined,
        passageBook: comment.passageBook,
        passageChapter: comment.passageChapter,
        passageVerse: comment.passageVerse,
        commentId: args.id,
        preview: comment.content.slice(0, 100),
        createdAt: Date.now(),
      });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("comments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== identity.subject) throw new Error("Not authorized");

    await ctx.db.patch(args.id, { content: args.content });
  },
});

export const remove = mutation({
  args: {
    id: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== identity.subject) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});