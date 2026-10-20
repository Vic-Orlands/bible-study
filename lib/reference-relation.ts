import { CANON } from "@/lib/reading-plan-templates";

export type ReferenceRelation = "Echo" | "Prophecy" | "Quoted";

const BOOKS = [...CANON].sort((left, right) => right.book.length - left.book.length);

export function bookInReference(target: string) {
  return BOOKS.find((book) => target.startsWith(book.book))?.book ?? null;
}

export function referenceRelation(sourceBook: string, target: string, text: string): ReferenceRelation {
  if (/quote|written|said|fulfill/i.test(text)) return "Quoted";
  const source = CANON.find((book) => book.book === sourceBook);
  const targetBook = bookInReference(target);
  const targetMeta = CANON.find((book) => book.book === targetBook);
  if (source?.testament === "New Testament" && targetMeta?.testament === "Old Testament") {
    return "Prophecy";
  }
  return "Echo";
}
