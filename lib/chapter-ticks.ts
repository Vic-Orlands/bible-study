import { CANON } from "@/lib/reading-plan-templates";
import type { BibleBookIndex } from "@/lib/scripture";

export type ChapterTick = {
  book: string;
  chapter: number;
  testament: "Old Testament" | "New Testament";
};

export const CHAPTER_TICKS: ChapterTick[] = CANON.flatMap((book) =>
  Array.from({ length: book.chapters }, (_, index) => ({
    book: book.book,
    chapter: index + 1,
    testament: book.testament,
  })),
);

export function ticksFromBooks(books: BibleBookIndex[]): ChapterTick[] {
  if (books.length === 0) return CHAPTER_TICKS;
  return books.flatMap((book) =>
    book.chapters.map((chapter) => ({
      book: book.book,
      chapter: chapter.chapter,
      testament: book.testament,
    })),
  );
}

export function tickKey(book: string, chapter: number) {
  return `${book}:${chapter}`;
}
