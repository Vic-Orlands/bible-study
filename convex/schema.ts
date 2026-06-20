import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  identities: defineTable({
    ipHash: v.optional(v.string()),
    userId: v.optional(v.string()),
    displayName: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    isAnonymous: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_ipHash", ["ipHash"])
    .index("by_displayName", ["displayName"])
    .index("by_userId", ["userId"])
    .index("by_isAnonymous", ["isAnonymous"]),

  notes: defineTable({
    ownerKey: v.optional(v.string()),
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
    .index("by_passage", ["passageBook", "passageChapter"])
    .index("by_owner", ["ownerKey"])
    .index("by_owner_and_passage", [
      "ownerKey",
      "passageBook",
      "passageChapter",
    ]),

  comments: defineTable({
    ownerKey: v.optional(v.string()),
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
    .index("by_owner", ["ownerKey"])
    .index("by_passage", ["passageBook", "passageChapter"])
    .index("by_parent", ["parentId"]),

  bookmarks: defineTable({
    ownerKey: v.optional(v.string()),
    identityId: v.optional(v.id("identities")),
    userId: v.optional(v.string()),
    guestId: v.optional(v.string()),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
  })
    .index("by_identity", ["identityId"])
    .index("by_passage", ["passageBook", "passageChapter"])
    .index("by_owner", ["ownerKey"])
    .index("by_owner_and_passage", [
      "ownerKey",
      "passageBook",
      "passageChapter",
    ])
    .index("by_owner_and_verse", [
      "ownerKey",
      "passageBook",
      "passageChapter",
      "passageVerse",
    ]),

  audioNotes: defineTable({
    ownerKey: v.optional(v.string()),
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
    .index("by_passage", ["passageBook", "passageChapter"])
    .index("by_owner", ["ownerKey"])
    .index("by_owner_and_passage", [
      "ownerKey",
      "passageBook",
      "passageChapter",
    ]),

  userPlans: defineTable({
    ownerKey: v.optional(v.string()),
    identityId: v.optional(v.id("identities")),
    userId: v.optional(v.string()),
    templateId: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("archived")),
    startDate: v.string(),
    durationDays: v.number(),
    totalEntries: v.number(),
    completedEntries: v.number(),
    currentDayNumber: v.number(),
    startedAt: v.optional(v.number()),
    lastOpenedAt: v.optional(v.number()),
    lastCompletedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerKey"])
    .index("by_owner_and_status", ["ownerKey", "status"]),

  userPlanEntries: defineTable({
    ownerKey: v.optional(v.string()),
    identityId: v.optional(v.id("identities")),
    userId: v.optional(v.string()),
    planId: v.id("userPlans"),
    dayNumber: v.number(),
    dueDate: v.string(),
    passageBook: v.string(),
    passageChapter: v.number(),
    passageVerse: v.number(),
    passageLabel: v.string(),
    startChapter: v.number(),
    endChapter: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed")),
    reflection: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    lastOpenedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_planId", ["planId"])
    .index("by_owner_and_dueDate", ["ownerKey", "dueDate"])
    .index("by_owner_and_status", ["ownerKey", "status"]),

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

  pushSubscriptions: defineTable({
    ownerKey: v.string(),
    token: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerKey"])
    .index("by_token", ["token"]),

  notificationPreferences: defineTable({
    ownerKey: v.string(),
    dailyReminder: v.boolean(),
    verseOfDay: v.boolean(),
    comments: v.boolean(),
    replies: v.boolean(),
    likes: v.boolean(),
    mentions: v.boolean(),
    planMilestones: v.boolean(),
    reminderHour: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerKey"]),

  customTranslations: defineTable({
    name: v.string(),
    abbreviation: v.string(),
    languageTag: v.string(),
    sourceType: v.literal("json"),
    indexUrl: v.string(),
    chapterUrlTemplate: v.string(),
    enabled: v.boolean(),
    licenseNotes: v.optional(v.string()),
    supportsFullBible: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_enabled", ["enabled"])
    .index("by_abbreviation", ["abbreviation"]),
});
