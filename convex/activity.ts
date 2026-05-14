import { query } from "./_generated/server";
import { v } from "convex/values";
import { getViewer } from "./ownership";

export const statsForPassage = query({
  args: {
    identityId: v.optional(v.id("identities")),
    passageBook: v.string(),
    passageChapter: v.number(),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.identityId);
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_passage", (q) =>
        q
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
      )
      .collect();

    const notes = viewer
      ? await ctx.db
          .query("notes")
          .withIndex("by_owner_and_passage", (q) =>
            q
              .eq("ownerKey", viewer.ownerKey)
              .eq("passageBook", args.passageBook)
              .eq("passageChapter", args.passageChapter)
          )
          .collect()
      : [];

    const audioNotes = viewer
      ? await ctx.db
          .query("audioNotes")
          .withIndex("by_owner_and_passage", (q) =>
            q
              .eq("ownerKey", viewer.ownerKey)
              .eq("passageBook", args.passageBook)
              .eq("passageChapter", args.passageChapter)
          )
          .collect()
      : [];

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
      userId: c.userId ?? (c.identityId ? String(c.identityId) : undefined),
      preview: c.content.slice(0, 100),
      _creationTime: c._creationTime,
    }));
  },
});
