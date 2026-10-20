import { describe, expect, it } from "vitest";
import { changedWordCount, diffWords } from "../lib/word-diff";

describe("word diff", () => {
  it("marks words that differ between two translations", () => {
    const diff = diffWords(
      "In the beginning was the Word",
      "In the beginning the Word already existed",
    );
    expect(diff.left.filter((piece) => piece.changed).map((piece) => piece.text.trim())).toEqual([
      "was",
    ]);
    expect(diff.right.filter((piece) => piece.changed).map((piece) => piece.text.trim())).toEqual([
      "already",
      "existed",
    ]);
    expect(changedWordCount("In the beginning was the Word", "In the beginning the Word already existed")).toBe(2);
  });
});
