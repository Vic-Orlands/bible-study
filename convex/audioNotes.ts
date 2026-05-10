import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listForPassage = query({
  args: {
    passageBook: v.string(),
    passageChapter: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    const byUser = await ctx.db
      .query("audioNotes")
      .withIndex("by_passage", (q) =>
        q
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter),
      )
      .order("desc")
      .collect();

    if (!userId) return byUser;

    const byGuest = await ctx.db
      .query("audioNotes")
      .filter((q) => q.and(
        q.eq(q.field("guestId"), userId),
        q.eq(q.field("userId"), undefined),
        q.eq(q.field("passageBook"), args.passageBook),
        q.eq(q.field("passageChapter"), args.passageChapter)
      ))
      .collect();

    const seen = new Set(byUser.map((a) => a._id.toString()));
    const merged = [...byUser, ...byGuest.filter((a) => {
      const key = a._id.toString();
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
    audioUrl: v.string(),
    audioKey: v.string(),
    size: v.number(),
    mimeType: v.string(),
    duration: v.number(),
    waveform: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("audioNotes", {
      userId: identity.subject,
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.id);
  },
});
