import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "vitest";

const uploadRoute = await readFile(
  new URL("../app/api/upload/route.ts", import.meta.url),
  "utf8",
);
const audioRecorder = await readFile(
  new URL("../components/notes/audio-recorder.tsx", import.meta.url),
  "utf8",
);

describe("audio upload", () => {
  it("accepts the audio file and sends it to R2 server-side", () => {
    assert.match(uploadRoute, /await req\.formData\(\)/);
    assert.match(uploadRoute, /const body = Buffer\.from\(await file\.arrayBuffer\(\)\)/);
    assert.match(uploadRoute, /Body:\s*body/);
    assert.doesNotMatch(uploadRoute, /getSignedUrl/);
  });

  it("submits recordings to the same-origin upload route", () => {
    assert.match(audioRecorder, /const formData = new FormData\(\)/);
    assert.match(audioRecorder, /formData\.append\("file", blob, "audio-note\.webm"\)/);
    assert.match(audioRecorder, /body: formData/);
    assert.doesNotMatch(audioRecorder, /fetch\(uploadUrl/);
  });
});
