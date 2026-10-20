import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "vitest";

const plans = await readFile(new URL("../components/today/use-plans.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../components/today/today-page.tsx", import.meta.url), "utf8");
const card = await readFile(
  new URL("../components/today/completion-card.tsx", import.meta.url),
  "utf8",
);

describe("reading plan completion", () => {
  it("loads completed plans and celebrates a finished plan", () => {
    assert.match(plans, /useQuery\(api\.readingPlans\.completed,/);
    assert.match(plans, /return await toggleEntry\(/);
    assert.match(page, /result\?\.completedNow/);
    assert.match(page, /<CompletionCard/);
    assert.match(page, /id="completed-plans"/);
  });

  it("shares the achievement and saves a PNG", () => {
    assert.match(card, /navigator\.share/);
    assert.match(card, /navigator\.clipboard\.writeText/);
    assert.match(card, /canvas\.toBlob/);
    assert.match(card, />\s*Share\s*</);
    assert.match(card, />\s*View completed plans\s*</);
  });
});
