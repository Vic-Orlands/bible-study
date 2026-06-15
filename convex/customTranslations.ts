import { ConvexError, v } from "convex/values";
import { MutationCtx, action, mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin";
import {
  fetchCustomTranslationChapter,
  fetchCustomTranslationIndex,
} from "../lib/custom-translation-source";

const customTranslationArgs = {
  abbreviation: v.string(),
  chapterUrlTemplate: v.string(),
  enabled: v.boolean(),
  indexUrl: v.string(),
  languageTag: v.string(),
  licenseNotes: v.optional(v.string()),
  name: v.string(),
  sourceType: v.literal("json"),
  supportsFullBible: v.boolean(),
};

async function ensureUniqueAbbreviation(
  ctx: MutationCtx,
  abbreviation: string,
  skipId?: string,
) {
  const current = await ctx.db
    .query("customTranslations")
    .withIndex("by_abbreviation", (q) => q.eq("abbreviation", abbreviation))
    .collect();

  const duplicate = current.find((entry) => entry._id !== skipId);
  if (duplicate) {
    throw new ConvexError("A custom translation with this abbreviation already exists.");
  }
}

export const listEnabled = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("customTranslations")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();
  },
});

export const getEnabledById = query({
  args: {
    id: v.id("customTranslations"),
  },
  handler: async (ctx, args) => {
    const translation = await ctx.db.get(args.id);
    if (!translation?.enabled) return null;
    return translation;
  },
});

export const listAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("customTranslations").collect();
  },
});

export const create = mutation({
  args: customTranslationArgs,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ensureUniqueAbbreviation(ctx, args.abbreviation);
    const now = Date.now();
    return await ctx.db.insert("customTranslations", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("customTranslations"),
    ...customTranslationArgs,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const current = await ctx.db.get(args.id);
    if (!current) throw new ConvexError("Custom translation not found.");
    await ensureUniqueAbbreviation(ctx, args.abbreviation, args.id);
    await ctx.db.patch(args.id, {
      abbreviation: args.abbreviation,
      chapterUrlTemplate: args.chapterUrlTemplate,
      enabled: args.enabled,
      indexUrl: args.indexUrl,
      languageTag: args.languageTag,
      licenseNotes: args.licenseNotes,
      name: args.name,
      sourceType: args.sourceType,
      supportsFullBible: args.supportsFullBible,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("customTranslations"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const current = await ctx.db.get(args.id);
    if (!current) throw new ConvexError("Custom translation not found.");
    await ctx.db.delete(args.id);
  },
});

export const setEnabled = mutation({
  args: {
    enabled: v.boolean(),
    id: v.id("customTranslations"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const current = await ctx.db.get(args.id);
    if (!current) throw new ConvexError("Custom translation not found.");
    await ctx.db.patch(args.id, {
      enabled: args.enabled,
      updatedAt: Date.now(),
    });
  },
});

export const validateSource = action({
  args: customTranslationArgs,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const books = await fetchCustomTranslationIndex({
      indexUrl: args.indexUrl,
    });
    const firstBook = books[0];
    const firstChapter = firstBook?.chapters[0];

    if (!firstBook || !firstChapter) {
      throw new ConvexError("Custom translation source did not return any readable books.");
    }

    const chapter = await fetchCustomTranslationChapter(
      {
        chapterUrlTemplate: args.chapterUrlTemplate,
      },
      {
        book: firstBook.book,
        bookId: firstBook.id,
        chapter: firstChapter.chapter,
      },
    );

    if (chapter.verses.length === 0) {
      throw new ConvexError("Custom translation chapter response did not include any verses.");
    }

    return {
      booksCount: books.length,
      firstBook: firstBook.book,
      firstChapter: firstChapter.chapter,
      firstVersePreview: chapter.verses[0],
      supportsFullBible: args.supportsFullBible,
    };
  },
});
