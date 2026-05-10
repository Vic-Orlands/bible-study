import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const list = query({
  args: {
    passageBook: v.string(),
    passageChapter: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    const byUser = await ctx.db
      .query("comments")
      .withIndex("by_passage", (q) =>
        q
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
      )
      .order("desc")
      .collect();

    if (!userId) return byUser;

    const byGuest = await ctx.db
      .query("comments")
      .filter((q) => q.and(
        q.eq(q.field("guestId"), userId),
        q.eq(q.field("userId"), undefined),
        q.eq(q.field("passageBook"), args.passageBook),
        q.eq(q.field("passageChapter"), args.passageChapter)
      ))
      .collect();

    const seen = new Set(byUser.map((c) => c._id.toString()));
    const merged = [...byUser, ...byGuest.filter((c) => {
      const key = c._id.toString();
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
    passageVerse: v.number(),
    translationLabel: v.string(),
    content: v.string(),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const comment = await ctx.db.insert("comments", {
      userId: identity.subject,
      userName: identity.name ?? identity.email ?? "Anonymous",
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse,
      translationLabel: args.translationLabel,
      content: args.content,
      parentId: args.parentId,
      likes: [],
    });

const name = identity.name ?? identity.email ?? "Anonymous";
  if (args.parentId) {
    const parent = await ctx.db.get(args.parentId);
    if (parent && parent.userId) {
      await ctx.db.insert("notifications", {
        userId: parent.userId,
        type: "reply",
        read: false,
        actorName: name,
        actorAvatar: identity.pictureUrl,
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

    const already = comment.likes.includes(identity.subject);
    await ctx.db.patch(args.id, {
      likes: already
        ? comment.likes.filter((id) => id !== identity.subject)
        : [...comment.likes, identity.subject],
    });

    if (!already && comment.userId && comment.userId !== identity.subject) {
      await ctx.db.insert("notifications", {
        userId: comment.userId,
        type: "like",
        read: false,
        actorName: identity.name ?? identity.email ?? "Anonymous",
        actorAvatar: identity.pictureUrl,
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
    if (!comment || comment.userId !== identity.subject) {
      throw new Error("Not authorized");
    }
    if (!comment.userId) throw new Error("Not authorized");

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
    if (!comment || comment.userId !== identity.subject) {
      throw new Error("Not authorized");
    }
    if (!comment.userId) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});
