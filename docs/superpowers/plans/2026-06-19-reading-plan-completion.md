# Reading Plan Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep completed reading plans available in a full Completed tab and celebrate each plan completion with share and PNG actions.

**Architecture:** Extend the existing owner-scoped `userPlans` backend with completed-plan summaries and an explicit completion-transition result from `toggleEntry`. The reading-plan client maintains active and completed plan lists separately, accepts either list as a selected plan, and renders a local completion dialog only for the transition returned by the mutation. A canvas-based exporter creates the same completion-card content as a downloadable PNG without a new dependency.

**Tech Stack:** Next.js client components, React 19, Motion, Convex, TypeScript, native Web Share API, Canvas API, Node test runner.

---

## File Structure

- Modify: `convex/readingPlans.ts` — return final-completion metadata and provide completed plan summaries.
- Modify: `components/reading-plan-page.tsx` — add completed-plan query/state, tab, review selection, celebration dialog, sharing, and canvas export.
- Create: `tests/reading-plan-completion.test.mjs` — source-level regression coverage for the new backend/client contracts, matching the repository’s existing Node test style.

### Task 1: Expose completed plans and completion transitions

**Files:**
- Modify: `convex/readingPlans.ts:198-235, 365-414`
- Test: `tests/reading-plan-completion.test.mjs`

- [ ] **Step 1: Write the failing backend-contract test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../convex/readingPlans.ts", import.meta.url),
  "utf8",
);

test("reading plans expose completed summaries and a completion transition", () => {
  assert.match(source, /export const completed = query\(/);
  assert.match(source, /q\.eq\("ownerKey", viewer\.ownerKey\)\.eq\("status", "completed"\)/);
  assert.match(source, /completedNow: completedEntries === planEntries\.length/);
  assert.match(source, /return \{ completedNow,/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/reading-plan-completion.test.mjs`

Expected: FAIL because `completed` and `completedNow` do not exist.

- [ ] **Step 3: Add the completed plan query**

Add after `active` in `convex/readingPlans.ts`:

```ts
export const completed = query({
  args: { identityId: v.optional(v.id("identities")) },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.identityId);
    if (!viewer) return [];

    const plans = await ctx.db
      .query("userPlans")
      .withIndex("by_owner_and_status", (q) =>
        q.eq("ownerKey", viewer.ownerKey).eq("status", "completed"),
      )
      .collect();

    return plans
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
```

- [ ] **Step 4: Return the final-completion transition from `toggleEntry`**

Before patching the plan, load it and preserve its prior status:

```ts
const plan = await ctx.db.get(entry.planId);
if (!plan || plan.ownerKey !== viewer.ownerKey) {
  throw new Error("Reading plan not found");
}

const completedNow =
  plan.status !== "completed" && completedEntries === planEntries.length;
```

After `await ctx.db.patch(entry.planId, ...)`, return:

```ts
return {
  completedAt: completedNow ? completedAt : null,
  completedNow,
  planId: entry.planId,
};
```

- [ ] **Step 5: Run the backend-contract test to verify it passes**

Run: `node --test tests/reading-plan-completion.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the backend contract**

```bash
git add convex/readingPlans.ts tests/reading-plan-completion.test.mjs
git commit -m "feat: expose completed reading plans"
```

### Task 2: Keep completed plans selectable and add the Completed tab

**Files:**
- Modify: `components/reading-plan-page.tsx:24-115, 201-540`
- Test: `tests/reading-plan-completion.test.mjs`

- [ ] **Step 1: Extend the failing client-contract test**

```js
const pageSource = await readFile(
  new URL("../components/reading-plan-page.tsx", import.meta.url),
  "utf8",
);

test("the reading-plan page lists and reviews completed plans", () => {
  assert.match(pageSource, /type ReadingTab = "hub" \| "journal" \| "focus" \| "completed"/);
  assert.match(pageSource, /api\.readingPlans\.completed/);
  assert.match(pageSource, /<CompletedPlansTab/);
  assert.match(pageSource, /onReviewPlan/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/reading-plan-completion.test.mjs`

Expected: FAIL because the completed tab and query are absent.

- [ ] **Step 3: Add the completed summary type, query, and selection behavior**

Update the tab and add the summary type:

```ts
type ReadingTab = "hub" | "journal" | "focus" | "completed";

type CompletedPlanSummary = {
  _id: Id<"userPlans">;
  completedAt: number;
  completedEntries: number;
  description: string;
  durationDays: number;
  title: string;
  totalEntries: number;
};
```

Also add `durationDays: number;` to `ReadingPlanCurrent["plan"]` so the completion dialog can use the plan’s stored duration.

Query completed plans alongside `activePlans`:

```ts
const completedPlans = useQuery(api.readingPlans.completed, {
  ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
}) as CompletedPlanSummary[] | undefined;
```

Replace the active-only selection effect with:

```ts
useEffect(() => {
  if (!activePlans || !completedPlans) return;
  const visiblePlans = [...activePlans, ...completedPlans];
  if (visiblePlans.some((plan) => plan._id === selectedPlanId)) return;
  setSelectedPlanId(activePlans[0]?._id ?? completedPlans[0]?._id ?? null);
}, [activePlans, completedPlans, selectedPlanId]);
```

- [ ] **Step 4: Render `CompletedPlansTab` and wire review**

Add a `CompletedPlansTab` component that renders owner-scoped cards and an empty state. Wire it into the main tab switch:

```tsx
{activeTab === "completed" ? (
  <CompletedPlansTab
    completedPlans={completedPlans ?? []}
    onReviewPlan={(planId) => {
      setSelectedPlanId(planId);
      setSelectedEntryId(null);
      setActiveTab("hub");
    }}
  />
) : activeTab === "hub" ? (
  <HubTab
    currentPlan={currentPlan}
    onOpenReading={openReading}
    onToggleEntry={handleToggleEntry}
    selectedEntryId={selectedEntry?._id ?? null}
  />
) : activeTab === "journal" ? (
  <JournalTab currentPlan={currentPlan} onOpenReading={openReading} />
) : (
  <FocusTab currentPlan={currentPlan} onOpenReading={openReading} />
)}
```

Pass `completedPlans?.length ?? 0` to `PageHeader` and add a `Completed` tab button with its count badge.

- [ ] **Step 5: Run the client-contract test to verify it passes**

Run: `node --test tests/reading-plan-completion.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit completed-plan navigation**

```bash
git add components/reading-plan-page.tsx tests/reading-plan-completion.test.mjs
git commit -m "feat: add completed plans tab"
```

### Task 3: Show a completion celebration and share card

**Files:**
- Modify: `components/reading-plan-page.tsx:201-540, 1660-2070`
- Test: `tests/reading-plan-completion.test.mjs`

- [ ] **Step 1: Extend the failing client-contract test**

```js
test("the final reading opens a completion dialog with share and PNG actions", () => {
  assert.match(pageSource, /const \[completionPlan, setCompletionPlan\]/);
  assert.match(pageSource, /result\.completedNow/);
  assert.match(pageSource, /<PlanCompletionDialog/);
  assert.match(pageSource, /navigator\.share/);
  assert.match(pageSource, /canvas\.toBlob/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/reading-plan-completion.test.mjs`

Expected: FAIL because no completion dialog or export actions exist.

- [ ] **Step 3: Capture the transition in `handleToggleEntry`**

Add a local completion state:

```ts
const [completionPlan, setCompletionPlan] = useState<CompletedPlanSummary | null>(null);
```

Update the mutation call:

```ts
const result = await toggleEntry({
  entryId,
  ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
});

if (result.completedNow && currentPlan) {
  setCompletionPlan({
    _id: currentPlan.plan._id,
    completedAt: result.completedAt ?? Date.now(),
    completedEntries: currentPlan.plan.totalEntries,
    description: currentPlan.plan.description,
    durationDays: currentPlan.plan.durationDays,
    title: currentPlan.plan.title,
    totalEntries: currentPlan.plan.totalEntries,
  });
}
```

- [ ] **Step 4: Implement `PlanCompletionDialog` with native share and PNG export**

Create a component receiving `plan`, `onClose`, and `onViewCompleted`. It must render the visual share card plus four buttons. Implement the actions with explicit errors:

```ts
const handleShare = async () => {
  const text = `I completed the ${plan.title} reading plan on Bible Study.`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Reading Plan Complete", text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success("Completion message copied.");
  } catch (error) {
    console.error("Failed to share reading plan completion:", error);
    toast.error("Unable to share your completion right now.");
  }
};
```

Build a 1600×900 canvas in `handleSavePng`, draw the card background, title, completion date, and progress with the existing palette, then download its blob:

```ts
canvas.toBlob((blob) => {
  if (!blob) {
    console.error("Failed to render reading plan completion image.");
    toast.error("Unable to save your completion image.");
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-complete.png`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}, "image/png");
```

- [ ] **Step 5: Mount the dialog and connect View completed plans**

Inside the existing `AnimatePresence` section:

```tsx
{completionPlan ? (
  <PlanCompletionDialog
    onClose={() => setCompletionPlan(null)}
    onViewCompleted={() => {
      setCompletionPlan(null);
      setActiveTab("completed");
    }}
    plan={completionPlan}
  />
) : null}
```

- [ ] **Step 6: Run the completion UI test to verify it passes**

Run: `node --test tests/reading-plan-completion.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit the completion celebration**

```bash
git add components/reading-plan-page.tsx tests/reading-plan-completion.test.mjs
git commit -m "feat: celebrate reading plan completion"
```

### Task 4: Verify the full flow

**Files:**
- Test: `tests/reading-plan-completion.test.mjs`

- [ ] **Step 1: Run focused regression coverage**

Run: `node --test tests/reading-plan-completion.test.mjs tests/study-sheet-actions.test.mjs tests/audio-upload-flow.test.mjs`

Expected: all tests PASS.

- [ ] **Step 2: Run the production build**

Run: `pnpm build`

Expected: `✓ Compiled successfully` and a zero exit code.

- [ ] **Step 3: Manually verify the browser flow**

1. Open `/reading-plan`.
2. Complete the final unfinished reading in a plan.
3. Confirm the celebration dialog appears once and its Share, Save PNG, View completed plans, and Close actions are visible.
4. Click View completed plans and confirm the plan card is present.
5. Click Review plan and confirm the finished plan is readable while a different active plan remains available in the rail.
