import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "vitest";

const shell = await readFile(new URL("../components/shell/app-shell.tsx", import.meta.url), "utf8");
const settings = await readFile(
  new URL("../components/shell/settings-sheet.tsx", import.meta.url),
  "utf8",
);

describe("settings access", () => {
  it("opens settings from the shell", () => {
    assert.match(shell, /setSettingsOpen\(true\)/);
    assert.match(shell, /<SettingsSheet/);
  });

  it("keeps translation management behind the admin check", () => {
    assert.doesNotMatch(shell, />\s*Translations\s*</);
    assert.match(settings, /admin\?\.isAdmin/);
    assert.match(settings, /Translations/);
  });
});
