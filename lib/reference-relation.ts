import { metaFor } from "@/lib/book-meta";
import { CANON } from "@/lib/reading-plan-templates";

export type ReferenceRelation = "Echo" | "Prophecy" | "Quoted" | "Allusion" | "Same author";

const JOHANNINE = new Set(["John", "1 John", "2 John", "3 John"]);

const BOOKS = [...CANON].sort((left, right) => right.book.length - left.book.length);

export function bookInReference(target: string) {
  return BOOKS.find((book) => target.startsWith(book.book))?.book ?? null;
}

export function referenceRelation(
  sourceBook: string,
  target: string,
  text: string,
  second = false,
): ReferenceRelation {
  if (/allud/i.test(text)) return "Allusion";
  if (/quote|written|fulfill|sprung/i.test(text)) return "Quoted";
  const targetBook = bookInReference(target);
  if (targetBook && JOHANNINE.has(sourceBook) && JOHANNINE.has(targetBook)) return "Same author";
  if (second) return "Allusion";
  if (targetBook && (metaFor(targetBook).genre === "Prophets" || metaFor(targetBook).genre === "Prophecy")) {
    return "Prophecy";
  }
  return "Echo";
}
