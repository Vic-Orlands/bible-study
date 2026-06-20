import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../components/reading-plan-page.tsx", import.meta.url),
  "utf8",
);

test("reading plans expose a completed tab backed by the completed plans query", () => {
  assert.match(source, /type ReadingTab = "hub" \| "journal" \| "focus" \| "completed"/);
  assert.match(source, /useQuery\(api\.readingPlans\.completed,/);
  assert.match(
    source,
    /completedCount=\{completedPlans\.length\}/,
  );
  assert.match(source, /id: "completed", label: "Completed", count: completedCount/);
  assert.match(source, /<CompletedPlansTab/);
});

test("finishing a plan opens a celebratory share card with PNG and completed-plan actions", () => {
  assert.match(source, /const result = await toggleEntry\(/);
  assert.match(source, /if \(result\.completedNow/);
  assert.match(source, /<CompletionCelebrationDialog/);
  assert.match(source, /navigator\.share/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /canvas\.toBlob/);
  assert.match(source, /View completed plans/);
});

test("completed plan cards reopen the share card", () => {
  assert.match(source, /onSharePlan: \(plan: CompletedPlanSummary\) => void/);
  assert.match(source, /onClick=\{\(\) => onSharePlan\(plan\)\}/);
  assert.match(source, />\s*Share\s*</);
});
