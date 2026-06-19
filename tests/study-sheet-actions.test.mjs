import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/study/page.tsx", import.meta.url), "utf8");
const shellSource = await readFile(
  new URL("../components/product-shell.tsx", import.meta.url),
  "utf8",
);

test("settings action opens the settings sheet", () => {
  assert.match(
    source,
    /onOpenSettings=\{\(\) => \{\s*setSheetView\("settings"\);\s*setBookmarksOpen\(true\);\s*\}\}/,
  );
});

test("profile action opens the profile sheet", () => {
  assert.match(
    source,
    /onOpenProfile=\{\(\) => \{\s*setSheetView\("profile"\);\s*setBookmarksOpen\(true\);\s*\}\}/,
  );
});

test("translation management is not available from the user menu", () => {
  assert.doesNotMatch(shellSource, />\s*Translations\s*</);
});
