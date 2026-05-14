import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireViewer, getViewer } from "./ownership";

export const listForGuest = query({
  args: {
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.identityId);
    if (!viewer) return [];

    const current = await ctx.db
      .query("bookmarks")
      .withIndex("by_owner", (q) => q.eq("ownerKey", viewer.ownerKey))
      .order("desc")
      .collect();

    if (!args.identityId) return current;

    const legacy = await ctx.db
      .query("bookmarks")
      .withIndex("by_identity", (q) => q.eq("identityId", args.identityId))
      .order("desc")
      .collect();

    return [...new Map([...current, ...legacy].map((b) => [b._id, b])).values()];
  },
});

export const isBookmarked = query({
  args: {
    identityId: v.optional(v.id("identities")),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.identityId);
    if (!viewer) return false;

    const bookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_owner_and_verse", (q) =>
        q
          .eq("ownerKey", viewer.ownerKey)
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
          .eq("passageVerse", args.passageVerse)
      )
      .first();
    if (bookmark) return true;

    if (args.identityId) {
      const legacy = await ctx.db
        .query("bookmarks")
        .withIndex("by_identity", (q) => q.eq("identityId", args.identityId))
        .collect();
      return legacy.some(
        (b) =>
          b.passageBook === args.passageBook &&
          b.passageChapter === args.passageChapter &&
          b.passageVerse === args.passageVerse,
      );
    }

    return bookmark !== null;
  },
});

export const toggle = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_owner_and_verse", (q) =>
        q
          .eq("ownerKey", viewer.ownerKey)
          .eq("passageBook", args.passageBook)
          .eq("passageChapter", args.passageChapter)
          .eq("passageVerse", args.passageVerse)
      )
      .first();

    let existingId = existing?._id;
    if (!existingId && args.identityId) {
      const legacy = await ctx.db
        .query("bookmarks")
        .withIndex("by_identity", (q) => q.eq("identityId", args.identityId))
        .collect();
      existingId = legacy.find(
        (b) =>
          b.passageBook === args.passageBook &&
          b.passageChapter === args.passageChapter &&
          b.passageVerse === args.passageVerse,
      )?._id;
    }

    if (existingId) {
      await ctx.db.delete(existingId);
      return false;
    }
    await ctx.db.insert("bookmarks", {
      ownerKey: viewer.ownerKey,
      identityId: args.identityId ?? undefined,
      userId: viewer.ownerKey,
      passageBook: args.passageBook,
      passageChapter: args.passageChapter,
      passageVerse: args.passageVerse,
    });
    return true;
  },
});

export const addMany = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerses: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const uniqueVerses = [...new Set(args.passageVerses)].sort((a, b) => a - b);
    let added = 0;

    for (const verse of uniqueVerses) {
      const existing = await ctx.db
        .query("bookmarks")
        .withIndex("by_owner_and_verse", (q) =>
          q
            .eq("ownerKey", viewer.ownerKey)
            .eq("passageBook", args.passageBook)
            .eq("passageChapter", args.passageChapter)
            .eq("passageVerse", verse),
        )
        .first();

      if (!existing) {
        await ctx.db.insert("bookmarks", {
          ownerKey: viewer.ownerKey,
          identityId: args.identityId ?? undefined,
          userId: viewer.ownerKey,
          passageBook: args.passageBook,
          passageChapter: args.passageChapter,
          passageVerse: verse,
        });
        added += 1;
      }
    }

    return { added, total: uniqueVerses.length };
  },
});

export const removeMany = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerses: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const uniqueVerses = [...new Set(args.passageVerses)];
    let removed = 0;

    for (const verse of uniqueVerses) {
      const current = await ctx.db
        .query("bookmarks")
        .withIndex("by_owner_and_verse", (q) =>
          q
            .eq("ownerKey", viewer.ownerKey)
            .eq("passageBook", args.passageBook)
            .eq("passageChapter", args.passageChapter)
            .eq("passageVerse", verse),
        )
        .first();

      if (current) {
        await ctx.db.delete(current._id);
        removed += 1;
        continue;
      }

      if (!args.identityId) continue;

      const legacy = await ctx.db
        .query("bookmarks")
        .withIndex("by_identity", (q) => q.eq("identityId", args.identityId))
        .collect();

      const legacyMatch = legacy.find(
        (bookmark) =>
          bookmark.passageBook === args.passageBook &&
          bookmark.passageChapter === args.passageChapter &&
          bookmark.passageVerse === verse,
      );

      if (legacyMatch) {
        await ctx.db.delete(legacyMatch._id);
        removed += 1;
      }
    }

    return { removed, total: uniqueVerses.length };
  },
});
