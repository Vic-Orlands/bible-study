import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function plan(ownerKey: string, values: Partial<{ lastCompletedAt: number; status: "active" | "completed" }>) {
  return {
    ownerKey,
    templateId: "template",
    title: "Plan",
    description: "Description",
    status: values.status ?? "completed",
    startDate: "2026-01-01",
    durationDays: 1,
    totalEntries: 1,
    completedEntries: values.status === "active" ? 0 : 1,
    currentDayNumber: 1,
    lastCompletedAt: values.lastCompletedAt,
  };
}

test("completed returns only the viewer's plans newest first", async () => {
  const t = convexTest({ schema, modules });
  const fallbackPlanId = await t.run((ctx) =>
    ctx.db.insert("userPlans", plan("owner-a", {})),
  );
  const fallbackPlan = await t.run((ctx) => ctx.db.get(fallbackPlanId));
  if (!fallbackPlan) throw new Error("Fallback plan not found");
  const [olderPlanId, newerPlanId] = await t.run(async (ctx) => [
    await ctx.db.insert(
      "userPlans",
      plan("owner-a", { lastCompletedAt: fallbackPlan._creationTime - 2 }),
    ),
    await ctx.db.insert(
      "userPlans",
      plan("owner-a", { lastCompletedAt: fallbackPlan._creationTime - 1 }),
    ),
    await ctx.db.insert("userPlans", plan("owner-b", { lastCompletedAt: 300 })),
  ]);

  const completedPlans = await t
    .withIdentity({ tokenIdentifier: "owner-a" })
    .query(api.readingPlans.completed, {});

  expect(completedPlans).toEqual([
    {
      _id: fallbackPlanId,
      completedEntries: 1,
      completedAt: fallbackPlan._creationTime,
      description: "Description",
      durationDays: 1,
      title: "Plan",
      totalEntries: 1,
    },
    {
      _id: newerPlanId,
      completedEntries: 1,
      completedAt: fallbackPlan._creationTime - 1,
      description: "Description",
      durationDays: 1,
      title: "Plan",
      totalEntries: 1,
    },
    {
      _id: olderPlanId,
      completedEntries: 1,
      completedAt: fallbackPlan._creationTime - 2,
      description: "Description",
      durationDays: 1,
      title: "Plan",
      totalEntries: 1,
    },
  ]);
});

test("toggleEntry reports completion only for the active-to-completed transition", async () => {
  const t = convexTest({ schema, modules });
  const { entryId, planId } = await t.run(async (ctx) => {
    const planId = await ctx.db.insert("userPlans", plan("owner-a", { status: "active" }));
    const entryId = await ctx.db.insert("userPlanEntries", {
      ownerKey: "owner-a",
      planId,
      dayNumber: 1,
      dueDate: "2026-01-01",
      passageBook: "John",
      passageChapter: 1,
      passageVerse: 1,
      passageLabel: "John 1",
      startChapter: 1,
      endChapter: 1,
      status: "pending",
    });
    return { entryId, planId };
  });
  const viewer = t.withIdentity({ tokenIdentifier: "owner-a" });

  const completed = await viewer.mutation(api.readingPlans.toggleEntry, { entryId });
  const reopened = await viewer.mutation(api.readingPlans.toggleEntry, { entryId });
  const completedAgain = await viewer.mutation(api.readingPlans.toggleEntry, { entryId });
  const persistedPlan = await t.run((ctx) => ctx.db.get(planId));

  expect(completed).toMatchObject({ completedNow: true, planId });
  expect(completed.completedAt).toEqual(expect.any(Number));
  expect(reopened).toEqual({ completedAt: null, completedNow: false, planId });
  expect(completedAgain).toMatchObject({ completedNow: true, planId });
  expect(persistedPlan?.status).toBe("completed");
  expect(persistedPlan?.lastCompletedAt).toEqual(expect.any(Number));
});
