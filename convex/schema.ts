import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
  }).index("byEmail", ["email"]),

  identities: defineTable({
    ipHash: v.string(),
    userId: v.optional(v.string()),
    displayName: v.string(),
    isAnonymous: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_ipHash", ["ipHash"])
    .index("by_isAnonymous", ["isAnonymous"]),

  notes: defineTable({
    identityId: v.optional(v.id("identities")),
    userId: v.optional(v.string()),
    guestId: v.optional(v.string()),
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
    .index("by_identity", ["identityId"])
    .index("by_passage", ["passageBook", "passageChapter"]),

  comments: defineTable({
    identityId: v.optional(v.id("identities")),
    userId: v.optional(v.string()),
    guestName: v.optional(v.string()),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
    translationLabel: v.string(),
    content: v.string(),
    parentId: v.optional(v.id("comments")),
    likes: v.array(v.string()),
  })
    .index("by_identity", ["identityId"])
    .index("by_passage", ["passageBook", "passageChapter"])
    .index("by_parent", ["parentId"]),

  bookmarks: defineTable({
    identityId: v.optional(v.id("identities")),
    userId: v.optional(v.string()),
    guestId: v.optional(v.string()),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
  })
    .index("by_identity", ["identityId"])
    .index("by_passage", ["passageBook", "passageChapter"]),

  audioNotes: defineTable({
    identityId: v.optional(v.id("identities")),
    userId: v.optional(v.string()),
    guestId: v.optional(v.string()),
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
    .index("by_identity", ["identityId"])
    .index("by_passage", ["passageBook", "passageChapter"]),

  notifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("comment"),
      v.literal("reply"),
      v.literal("like"),
      v.literal("mention"),
    ),
    read: v.boolean(),
    actorName: v.string(),
    actorAvatar: v.optional(v.string()),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.optional(v.number()),
    commentId: v.optional(v.id("comments")),
    preview: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"]),
});
