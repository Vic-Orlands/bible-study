import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  notes: defineTable({
    guestId: v.string(),
    guestName: v.string(),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.optional(v.number()),
    content: v.string(),
    type: v.union(
      v.literal("observation"),
      v.literal("interpretation"),
      v.literal("application"),
    ),
  })
    .index("by_guest_passage", ["guestId", "passageBook", "passageChapter"])
    .index("by_passage", ["passageBook", "passageChapter"]),

  comments: defineTable({
    guestId: v.string(),
    guestName: v.string(),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
    translationLabel: v.string(),
    content: v.string(),
    parentId: v.optional(v.id("comments")),
    likes: v.array(v.string()),
  })
    .index("by_passage", ["passageBook", "passageChapter"])
    .index("by_parent", ["parentId"]),

  bookmarks: defineTable({
    guestId: v.string(),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
  })
    .index("by_guest", ["guestId"])
    .index("by_guest_passage", [
      "guestId",
      "passageBook",
      "passageChapter",
      "passageVerse",
    ]),

  audioNotes: defineTable({
    guestId: v.string(),
    guestName: v.string(),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.optional(v.number()),
    audioUrl: v.string(),
    audioKey: v.string(),
    duration: v.number(),
    size: v.number(),
    mimeType: v.string(),
    transcript: v.optional(v.string()),
    isProcessing: v.boolean(),
    waveform: v.optional(v.array(v.number())),
  })
    .index("by_passage", ["passageBook", "passageChapter"])
    .index("by_guest", ["guestId"]),
});
