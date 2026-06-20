import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { requireViewer, getViewer } from "./ownership";
import { api } from "./_generated/api";
import { CANON, getReadingPlanTemplate, READING_PLAN_TEMPLATES } from "../lib/reading-plan-templates";

function addDays(date: string, amount: number) {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + amount);
  return base.toISOString().slice(0, 10);
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function calculateStreak(entries: { dueDate: string; status: string }[]) {
  const completedDates = new Set(
    entries.filter((entry) => entry.status === "completed").map((entry) => entry.dueDate),
  );
  let streak = 0;
  let cursor = todayString();

  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function partitionCustomChapters(
  chapters: { book: string; chapter: number }[],
  durationDays: number,
) {
  const days = Math.max(1, Math.min(durationDays, chapters.length));
  const baseSize = Math.floor(chapters.length / days);
  const remainder = chapters.length % days;
  const groups: { book: string; chapter: number }[][] = [];
  let cursor = 0;

  for (let day = 0; day < days; day += 1) {
    const size = baseSize + (day < remainder ? 1 : 0);
    groups.push(chapters.slice(cursor, cursor + size));
    cursor += size;
  }

  return groups.filter((group) => group.length > 0);
}

function customPassageLabel(group: { book: string; chapter: number }[]) {
  const first = group[0];
  const last = group[group.length - 1];
  if (!first || !last) return "";
  if (first.chapter === last.chapter) return `${first.book} ${first.chapter}`;
  return `${first.book} ${first.chapter}-${last.chapter}`;
}

function customCadenceLabel(groups: { book: string; chapter: number }[][]) {
  const sizes = groups.map((group) => group.length);
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  if (min === 1 && max === 1) return "1 chapter a day";
  if (min === max) return `${min} chapters a day`;
  return `${min}-${max} chapters a day`;
}

export const templates = query({
  args: {},
  handler: async () => {
    return READING_PLAN_TEMPLATES.map((template) => ({
      cadenceLabel: template.cadenceLabel,
      category: template.category,
      id: template.id,
      durationDays: template.durationDays,
      estimatedMinutes: template.estimatedMinutes,
      featured: template.featured,
      scopeLabel: template.scopeLabel,
      summary: template.summary,
      title: template.title,
    }));
  },
});

export const current = query({
  args: {
    identityId: v.optional(v.id("identities")),
    planId: v.optional(v.id("userPlans")),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.identityId);
    if (!viewer) return null;

    const activePlans = await ctx.db
      .query("userPlans")
      .withIndex("by_owner_and_status", (q) =>
        q.eq("ownerKey", viewer.ownerKey).eq("status", "active"),
      )
      .collect();

    const activePlan = [...activePlans].sort(
      (left, right) =>
        (right.lastOpenedAt ?? right.startedAt ?? right._creationTime) -
        (left.lastOpenedAt ?? left.startedAt ?? left._creationTime),
    )[0];

    const completedPlans = activePlan
      ? []
      : await ctx.db
          .query("userPlans")
          .withIndex("by_owner_and_status", (q) =>
            q.eq("ownerKey", viewer.ownerKey).eq("status", "completed"),
          )
          .collect();

    const requestedPlan = args.planId ? await ctx.db.get(args.planId) : null;
    const plan =
      requestedPlan &&
      requestedPlan.ownerKey === viewer.ownerKey &&
      requestedPlan.status !== "archived"
        ? requestedPlan
        : activePlan ??
      [...completedPlans].sort(
        (left, right) =>
          (right.lastCompletedAt ?? right._creationTime) -
          (left.lastCompletedAt ?? left._creationTime),
      )[0] ??
      null;

    if (!plan) return null;

    const entries = await ctx.db
      .query("userPlanEntries")
      .withIndex("by_planId", (q) => q.eq("planId", plan._id))
      .collect();

    const sortedEntries = [...entries].sort((left, right) => left.dayNumber - right.dayNumber);
    if (sortedEntries.length === 0) {
      return null;
    }
    const primaryEntry = sortedEntries.find((entry) => entry.status === "pending") ?? null;
    const hasStartedReading = Boolean(plan.startedAt) || plan.completedEntries > 0;
    const templateMeta = getReadingPlanTemplate(plan.templateId);
    const today = todayString();
    const weekEntries = sortedEntries.filter((entry) => {
      const diff = Math.floor(
        (new Date(`${entry.dueDate}T00:00:00.000Z`).getTime() -
          new Date(`${today}T00:00:00.000Z`).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return diff >= -1 && diff <= 5;
    });
    const upcomingEntries = (primaryEntry
      ? sortedEntries.filter(
          (entry) =>
            entry.status === "pending" && entry.dayNumber >= primaryEntry.dayNumber,
        )
      : []
    ).slice(0, 7);
    const currentEntry =
      sortedEntries.find((entry) => entry.dayNumber === plan.currentDayNumber) ??
      primaryEntry ??
      sortedEntries[sortedEntries.length - 1] ??
      null;
    const journalEntries = sortedEntries.filter((entry) => Boolean(entry.reflection?.trim()));

    return {
      plan,
      currentEntry,
      primaryEntry,
      hasStartedReading,
      progressPercent:
        plan.totalEntries === 0
          ? 0
          : Math.round((plan.completedEntries / plan.totalEntries) * 100),
      streak: calculateStreak(sortedEntries),
      templateMeta: templateMeta
        ? {
            cadenceLabel: templateMeta.cadenceLabel,
            category: templateMeta.category,
            durationDays: templateMeta.durationDays,
            estimatedMinutes: templateMeta.estimatedMinutes,
            featured: templateMeta.featured,
            id: templateMeta.id,
            scopeLabel: templateMeta.scopeLabel,
            summary: templateMeta.summary,
            title: templateMeta.title,
          }
        : null,
      todayEntry:
        sortedEntries.find((entry) => entry.dueDate === today) ?? primaryEntry,
      upcomingEntries,
      weekEntries,
      allEntries: sortedEntries,
      journalEntries,
    };
  },
});

export const active = query({
  args: {
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.identityId);
    if (!viewer) return [];

    const activePlans = await ctx.db
      .query("userPlans")
      .withIndex("by_owner_and_status", (q) =>
        q.eq("ownerKey", viewer.ownerKey).eq("status", "active"),
      )
      .collect();

    return activePlans
      .sort(
        (left, right) =>
          (right.lastOpenedAt ?? right.startedAt ?? right._creationTime) -
          (left.lastOpenedAt ?? left.startedAt ?? left._creationTime),
      )
      .map((plan) => ({
        _id: plan._id,
        completedEntries: plan.completedEntries,
        currentDayNumber: plan.currentDayNumber,
        description: plan.description,
        progressPercent:
          plan.totalEntries === 0
            ? 0
            : Math.round((plan.completedEntries / plan.totalEntries) * 100),
        title: plan.title,
        totalEntries: plan.totalEntries,
      }));
  },
});

export const completed = query({
  args: {
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.identityId);
    if (!viewer) return [];

    const completedPlans = await ctx.db
      .query("userPlans")
      .withIndex("by_owner_and_status", (q) =>
        q.eq("ownerKey", viewer.ownerKey).eq("status", "completed"),
      )
      .collect();

    return completedPlans
      .sort(
        (left, right) =>
          (right.lastCompletedAt ?? right._creationTime) -
          (left.lastCompletedAt ?? left._creationTime),
      )
      .map((plan) => ({
        _id: plan._id,
        completedEntries: plan.completedEntries,
        completedAt: plan.lastCompletedAt ?? plan._creationTime,
        description: plan.description,
        durationDays: plan.durationDays,
        title: plan.title,
        totalEntries: plan.totalEntries,
      }));
  },
});

export const create = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
    startDate: v.string(),
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const template = getReadingPlanTemplate(args.templateId);
    if (!template) {
      throw new Error("Reading plan template not found");
    }

    const planId = await ctx.db.insert("userPlans", {
      ownerKey: viewer.ownerKey,
      identityId: args.identityId ?? undefined,
      userId: viewer.ownerKey,
      templateId: template.id,
      title: template.title,
      description: template.summary,
      status: "active",
      startDate: args.startDate,
      durationDays: template.durationDays,
      totalEntries: template.readings.length,
      completedEntries: 0,
      currentDayNumber: 1,
      startedAt: undefined,
      lastOpenedAt: undefined,
      lastCompletedAt: undefined,
    });

    for (const reading of template.readings) {
      await ctx.db.insert("userPlanEntries", {
        ownerKey: viewer.ownerKey,
        identityId: args.identityId ?? undefined,
        userId: viewer.ownerKey,
        planId,
        dayNumber: reading.dayNumber,
        dueDate: addDays(args.startDate, reading.dayNumber - 1),
        passageBook: reading.selection.book,
        passageChapter: reading.selection.chapter,
        passageVerse: reading.selection.verse,
        passageLabel: reading.passageLabel,
        startChapter: reading.startChapter,
      endChapter: reading.endChapter,
      status: "pending",
      reflection: undefined,
      startedAt: undefined,
      lastOpenedAt: undefined,
      completedAt: undefined,
      });
    }

    return planId;
  },
});

export const createCustom = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
    startDate: v.string(),
    title: v.string(),
    book: v.string(),
    startChapter: v.number(),
    endChapter: v.number(),
    durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const book = CANON.find((entry) => entry.book === args.book);
    if (!book) {
      throw new Error("Selected book is not available.");
    }

    const startChapter = Math.max(1, Math.min(book.chapters, Math.floor(args.startChapter)));
    const endChapter = Math.max(startChapter, Math.min(book.chapters, Math.floor(args.endChapter)));
    const durationDays = Math.max(1, Math.min(365, Math.floor(args.durationDays)));
    const title = args.title.trim() || `${book.book} ${startChapter}-${endChapter}`;
    const chapters = Array.from(
      { length: endChapter - startChapter + 1 },
      (_, index) => ({ book: book.book, chapter: startChapter + index }),
    );
    const groups = partitionCustomChapters(chapters, durationDays);

    const planId = await ctx.db.insert("userPlans", {
      ownerKey: viewer.ownerKey,
      identityId: args.identityId ?? undefined,
      userId: viewer.ownerKey,
      templateId: `custom:${Date.now()}`,
      title,
      description: `${book.book} ${startChapter}-${endChapter} • ${groups.length} daily readings`,
      status: "active",
      startDate: args.startDate,
      durationDays: groups.length,
      totalEntries: groups.length,
      completedEntries: 0,
      currentDayNumber: 1,
      startedAt: undefined,
      lastOpenedAt: undefined,
      lastCompletedAt: undefined,
    });

    for (const [index, group] of groups.entries()) {
      const first = group[0];
      const last = group[group.length - 1];
      await ctx.db.insert("userPlanEntries", {
        ownerKey: viewer.ownerKey,
        identityId: args.identityId ?? undefined,
        userId: viewer.ownerKey,
        planId,
        dayNumber: index + 1,
        dueDate: addDays(args.startDate, index),
        passageBook: first.book,
        passageChapter: first.chapter,
        passageVerse: 1,
        passageLabel: customPassageLabel(group),
        startChapter: first.chapter,
        endChapter: last.chapter,
        status: "pending",
        reflection: undefined,
        startedAt: undefined,
        lastOpenedAt: undefined,
        completedAt: undefined,
      });
    }

    return {
      cadenceLabel: customCadenceLabel(groups),
      planId,
    };
  },
});

export const toggleEntry = mutation({
  args: {
    entryId: v.id("userPlanEntries"),
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.ownerKey !== viewer.ownerKey) {
      throw new Error("Reading plan entry not found");
    }

    const plan = await ctx.db.get(entry.planId);
    if (!plan || plan.ownerKey !== viewer.ownerKey) {
      throw new Error("Reading plan not found");
    }

    const nextStatus = entry.status === "completed" ? "pending" : "completed";
    const completedAt = nextStatus === "completed" ? Date.now() : undefined;

    await ctx.db.patch(args.entryId, {
      status: nextStatus,
      completedAt,
    });

    const planEntries = await ctx.db
      .query("userPlanEntries")
      .withIndex("by_planId", (q) => q.eq("planId", entry.planId))
      .collect();

    const completedEntries =
      planEntries.filter((item) =>
        item._id === args.entryId ? nextStatus === "completed" : item.status === "completed",
      ).length;
    const nextPending = [...planEntries]
      .sort((left, right) => left.dayNumber - right.dayNumber)
      .find((item) =>
        item._id === args.entryId ? nextStatus === "pending" : item.status === "pending",
      );
    const completedNow =
      plan.status !== "completed" && completedEntries === planEntries.length;

    await ctx.db.patch(entry.planId, {
      completedEntries,
      currentDayNumber: nextPending?.dayNumber ?? planEntries.length,
      startedAt: entry.startedAt ?? completedAt ?? Date.now(),
      lastOpenedAt: entry.lastOpenedAt ?? Date.now(),
      lastCompletedAt: nextStatus === "completed" ? completedAt : undefined,
      status: completedEntries === planEntries.length ? "completed" : "active",
    });

    if (completedNow) {
      await ctx.scheduler.runAfter(0, api.push.notify, { body: `You completed ${plan.title}. Wonderful work!`, ownerKey: viewer.ownerKey, title: "Reading plan complete", type: "planMilestones", url: "/reading-plan" });
    }

    return {
      completedAt: completedNow ? completedAt : null,
      completedNow,
      planId: entry.planId,
    };
  },
});

export const openEntry = mutation({
  args: {
    entryId: v.id("userPlanEntries"),
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.ownerKey !== viewer.ownerKey) {
      throw new Error("Reading plan entry not found");
    }

    const openedAt = Date.now();

    await ctx.db.patch(args.entryId, {
      startedAt: entry.startedAt ?? openedAt,
      lastOpenedAt: openedAt,
    });

    const plan = await ctx.db.get(entry.planId);
    if (!plan || plan.ownerKey !== viewer.ownerKey) {
      throw new Error("Reading plan not found");
    }

    await ctx.db.patch(entry.planId, {
      currentDayNumber: entry.dayNumber,
      startedAt: plan.startedAt ?? openedAt,
      lastOpenedAt: openedAt,
    });
  },
});

export const saveReflection = mutation({
  args: {
    entryId: v.id("userPlanEntries"),
    identityId: v.optional(v.id("identities")),
    reflection: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.ownerKey !== viewer.ownerKey) {
      throw new Error("Reading plan entry not found");
    }

    await ctx.db.patch(entry._id, {
      reflection: args.reflection.trim(),
    });
  },
});

export const archiveCurrent = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
    planId: v.id("userPlans"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.ownerKey !== viewer.ownerKey || plan.status !== "active") {
      throw new Error("Active reading plan not found");
    }

    await ctx.db.patch(plan._id, { status: "archived" });
  },
});

export const archiveAll = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const activePlans = await ctx.db
      .query("userPlans")
      .withIndex("by_owner_and_status", (q) =>
        q.eq("ownerKey", viewer.ownerKey).eq("status", "active"),
      )
      .collect();

    for (const plan of activePlans) {
      await ctx.db.patch(plan._id, { status: "archived" });
    }
  },
});

export const resetCurrent = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.identityId);
    const activePlan = await ctx.db
      .query("userPlans")
      .withIndex("by_owner_and_status", (q) =>
        q.eq("ownerKey", viewer.ownerKey).eq("status", "active"),
      )
      .first();

    if (!activePlan) return;

    const entries = await ctx.db
      .query("userPlanEntries")
      .withIndex("by_planId", (q) => q.eq("planId", activePlan._id))
      .collect();

    for (const entry of entries) {
      if (entry.status === "completed") {
        await ctx.db.patch(entry._id, {
          status: "pending",
          completedAt: undefined,
        });
      }
    }

    await ctx.db.patch(activePlan._id, {
      completedEntries: 0,
      currentDayNumber: 1,
      startedAt: undefined,
      lastOpenedAt: undefined,
      lastCompletedAt: undefined,
      status: "active",
    });
  },
});
