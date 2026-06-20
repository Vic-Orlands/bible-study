import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireViewer } from "./ownership";
import { api } from "./_generated/api";

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
    const viewer = await requireViewer(ctx, args.identityId);

    const comment = await ctx.db.insert("comments", {
      ownerKey: viewer.ownerKey,
      identityId: args.identityId ?? undefined,
      userId: viewer.ownerKey,
      guestName: viewer.displayName,
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
          actorName: viewer.displayName,
          actorAvatar: viewer.avatarUrl,
          passageBook: args.passageBook,
          passageChapter: args.passageChapter,
          passageVerse: args.passageVerse,
          commentId: comment,
          preview: args.content.slice(0, 100),
          createdAt: Date.now(),
        });
        await ctx.scheduler.runAfter(0, api.push.notify, { body: `${viewer.displayName} replied: ${args.content.slice(0, 100)}`, ownerKey: parent.userId, title: "New reply", type: "replies", url: "/study" });
      }
    }

    return comment;
  },
});

export const toggleLike = mutation({
  args: {
    id: v.id("comments"),
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);

    const comment = await ctx.db.get(args.id);
    if (!comment) return;

    const already = comment.likes.includes(viewer.ownerKey);
    await ctx.db.patch(args.id, {
      likes: already
        ? comment.likes.filter((id) => id !== viewer.ownerKey)
        : [...comment.likes, viewer.ownerKey],
    });

    if (!already && comment.userId && comment.userId !== viewer.ownerKey) {
      await ctx.db.insert("notifications", {
        userId: comment.userId,
        type: "like",
        read: false,
        actorName: viewer.displayName,
        actorAvatar: viewer.avatarUrl,
        passageBook: comment.passageBook,
        passageChapter: comment.passageChapter,
        passageVerse: comment.passageVerse,
        commentId: args.id,
        preview: comment.content.slice(0, 100),
        createdAt: Date.now(),
      });
      await ctx.scheduler.runAfter(0, api.push.notify, { body: `${viewer.displayName} liked your comment.`, ownerKey: comment.userId, title: "New like", type: "likes", url: "/study" });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("comments"),
    identityId: v.optional(v.id("identities")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);

    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Comment not found");
    if (
      comment.ownerKey !== viewer.ownerKey &&
      (!args.identityId || comment.identityId !== args.identityId)
    )
      throw new Error("Not authorized");

    await ctx.db.patch(args.id, { content: args.content });
  },
});

export const remove = mutation({
  args: {
    id: v.id("comments"),
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);

    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Comment not found");
    if (
      comment.ownerKey !== viewer.ownerKey &&
      (!args.identityId || comment.identityId !== args.identityId)
    )
      throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});
