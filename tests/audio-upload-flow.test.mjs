import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const uploadRoute = await readFile(
  new URL("../app/api/upload/route.ts", import.meta.url),
  "utf8",
);
const studyPage = await readFile(
  new URL("../app/study/page.tsx", import.meta.url),
  "utf8",
);

test("the upload route accepts the audio file and sends it to R2 server-side", () => {
  assert.match(uploadRoute, /await req\.formData\(\)/);
  assert.match(uploadRoute, /Body:\s*file/);
  assert.doesNotMatch(uploadRoute, /getSignedUrl/);
});

test("audio notes submit recordings to the same-origin upload route", () => {
  assert.match(studyPage, /const formData = new FormData\(\)/);
  assert.match(studyPage, /formData\.append\("file", blob, "audio-note\.webm"\)/);
  assert.match(studyPage, /body:\s*formData/);
  assert.doesNotMatch(studyPage, /fetch\(uploadUrl/);
});
