import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listForPassage = query({
  args: {
    passageBook: v.string(),
    passageChapter: v.number(),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("audioNotes")
      .withIndex("by_passage", (q) =>
        q
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
      )
      .order("desc")
      .collect();
    return await Promise.all(
      notes.map(async (note) => ({
        ...note,
        url: note.storageId ? await ctx.storage.getUrl(note.storageId) : null,
      }))
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    guestId: v.string(),
    guestName: v.string(),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
    duration: v.number(),
    waveform: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("audioNotes", {
      guestId: args.guestId,
      guestName: args.guestName,
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse,
      storageId: args.storageId,
      duration: args.duration,
      waveform: args.waveform,
      transcript: undefined,
      isProcessing: !!args.storageId,
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
    guestId: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note || note.guestId !== args.guestId) {
      return;
    }
    if (note.storageId) {
      await ctx.storage.delete(note.storageId);
    }
    await ctx.db.delete(args.id);
  },
});
