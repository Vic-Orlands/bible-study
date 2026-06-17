import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { requireViewer, getViewer } from "./ownership";
import { getReadingPlanTemplate, READING_PLAN_TEMPLATES } from "../lib/reading-plan-templates";

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
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.identityId);
    if (!viewer) return null;

    const plan = await ctx.db
      .query("userPlans")
      .withIndex("by_owner_and_status", (q) =>
        q.eq("ownerKey", viewer.ownerKey).eq("status", "active"),
      )
      .first();

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
    if (!primaryEntry) {
      return null;
    }
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

    return {
      plan,
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
    };
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

    const activePlans = await ctx.db
      .query("userPlans")
      .withIndex("by_owner_and_status", (q) =>
        q.eq("ownerKey", viewer.ownerKey).eq("status", "active"),
      )
      .collect();

    for (const activePlan of activePlans) {
      await ctx.db.patch(activePlan._id, { status: "archived" });
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
        startedAt: undefined,
        lastOpenedAt: undefined,
        completedAt: undefined,
      });
    }

    return planId;
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

    await ctx.db.patch(entry.planId, {
      completedEntries,
      currentDayNumber: nextPending?.dayNumber ?? planEntries.length,
      startedAt: entry.startedAt ?? completedAt ?? Date.now(),
      lastOpenedAt: entry.lastOpenedAt ?? Date.now(),
      lastCompletedAt: nextStatus === "completed" ? completedAt : undefined,
      status: completedEntries === planEntries.length ? "completed" : "active",
    });
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

export const archiveCurrent = mutation({
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

    for (const activePlan of activePlans) {
      await ctx.db.patch(activePlan._id, { status: "archived" });
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
