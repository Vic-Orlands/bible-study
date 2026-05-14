import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getViewer, requireViewer } from "./ownership";

export const listForPassage = query({
  args: {
    identityId: v.optional(v.id("identities")),
    passageBook: v.string(),
    passageChapter: v.number(),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.identityId);
    if (!viewer) return [];

    const current = await ctx.db
      .query("notes")
      .withIndex("by_owner_and_passage", (q) =>
        q
          .eq("ownerKey", viewer.ownerKey)
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
      )
      .order("desc")
      .collect();

    if (!args.identityId) return current;

    const legacy = await ctx.db
      .query("notes")
      .withIndex("by_identity", (q) => q.eq("identityId", args.identityId))
      .order("desc")
      .collect();

    const matchingLegacy = legacy.filter(
      (note) =>
        note.passageBook === args.passageBook &&
        note.passageChapter === args.passageChapter,
    );

    return [
      ...new Map([...current, ...matchingLegacy].map((note) => [note._id, note]))
        .values(),
    ];
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
    const viewer = await requireViewer(ctx, args.identityId);
    return await ctx.db.insert("notes", {
      ownerKey: viewer.ownerKey,
      identityId: args.identityId ?? undefined,
      userId: viewer.ownerKey,
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
    identityId: v.optional(v.id("identities")),
    content: v.string(),
    type: v.optional(v.union(
      v.literal("observation"),
      v.literal("interpretation"),
      v.literal("application"),
    )),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("Note not found");
    if (
      note.ownerKey !== viewer.ownerKey &&
      (!args.identityId || note.identityId !== args.identityId)
    )
      throw new Error("Not authorized");

    await ctx.db.patch(args.id, {
      content: args.content,
      ...(args.type !== undefined && { type: args.type }),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("notes"),
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("Note not found");
    if (
      note.ownerKey !== viewer.ownerKey &&
      (!args.identityId || note.identityId !== args.identityId)
    )
      throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});
