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
      .query("audioNotes")
      .withIndex("by_owner_and_passage", (q) =>
        q
          .eq("ownerKey", viewer.ownerKey)
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter),
      )
      .order("desc")
      .collect();

    if (!args.identityId) return current;

    const legacy = await ctx.db
      .query("audioNotes")
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
    audioUrl: v.string(),
    audioKey: v.string(),
    size: v.number(),
    mimeType: v.string(),
    duration: v.number(),
    waveform: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    return await ctx.db.insert("audioNotes", {
      ownerKey: viewer.ownerKey,
      identityId: args.identityId ?? undefined,
      userId: viewer.ownerKey,
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse ?? undefined,
      audioUrl: args.audioUrl,
      audioKey: args.audioKey,
      size: args.size,
      mimeType: args.mimeType,
      duration: args.duration,
      waveform: args.waveform ?? undefined,
      transcript: undefined,
      isProcessing: true,
    });
  },
});

export const updateTranscript = mutation({
  args: {
    id: v.id("audioNotes"),
    identityId: v.optional(v.id("identities")),
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("Audio note not found");
    if (
      note.ownerKey !== viewer.ownerKey &&
      (!args.identityId || note.identityId !== args.identityId)
    )
      throw new Error("Not authorized");

    await ctx.db.patch(args.id, {
      transcript: args.transcript,
      isProcessing: false,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("audioNotes"),
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("Audio note not found");
    if (
      note.ownerKey !== viewer.ownerKey &&
      (!args.identityId || note.identityId !== args.identityId)
    )
      throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});
