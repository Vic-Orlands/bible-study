import { query } from "./_generated/server";
import { v } from "convex/values";

export const statsForPassage = query({
  args: {
    passageBook: v.string(),
    passageChapter: v.number(),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_passage", (q) =>
        q
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
      )
      .collect();

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_passage", (q) =>
        q
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
      )
      .collect();

    const audioNotes = await ctx.db
      .query("audioNotes")
      .withIndex("by_passage", (q) =>
        q
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
      )
      .collect();

    return {
      commentCount: comments.length,
      noteCount: notes.length,
      audioCount: audioNotes.length,
    };
  },
});

export const recentForPassage = query({
  args: {
    passageBook: v.string(),
    passageChapter: v.number(),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_passage", (q) =>
        q
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
      )
      .order("desc")
      .take(6);

    return comments.map((c) => ({
      type: "comment" as const,
      userName: c.guestName ?? "Anonymous",
      userId: c.userId ?? c.identityId ? String(c.identityId) : undefined,
      preview: c.content.slice(0, 100),
      _creationTime: c._creationTime,
    }));
  },
});
