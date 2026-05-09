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
          .eq("passageChapter", args.passageChapter),
      )
      .order("desc")
      .collect();

    // We already store the public R2 audioUrl, so we just map and return the data directly
    return notes.map((note) => ({
      ...note,
      url: note.audioUrl,
    }));
  },
});

export const create = mutation({
  args: {
    guestId: v.string(),
    guestName: v.string(),
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
      guestId: args.guestId,
      guestName: args.guestName,
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse,
      audioUrl: args.audioUrl,
      audioKey: args.audioKey,
      size: args.size,
      mimeType: args.mimeType,
      duration: args.duration,
      waveform: args.waveform,
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
    guestId: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note || note.guestId !== args.guestId) {
      return;
    }

    // Note: To be fully secure, the client should also make an API call to
    // delete the object from R2 bucket, or we can use an Edge Function cron job.
    // For now, we simply delete the record from Convex.
    await ctx.db.delete(args.id);
  },
});
