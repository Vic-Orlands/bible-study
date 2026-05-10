import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listForPassage = query({
  args: {
    passageBook: v.string(),
    passageChapter: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("audioNotes")
      .withIndex("by_passage", (q) =>
        q
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter),
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
    audioUrl: v.string(),
    audioKey: v.string(),
    size: v.number(),
    mimeType: v.string(),
    duration: v.number(),
    waveform: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("audioNotes", {
      identityId: args.identityId ?? undefined,
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
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      transcript: args.transcript,
      isProcessing: false,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("audioNotes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});