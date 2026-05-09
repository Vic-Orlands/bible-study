import Dexie, { type EntityTable } from "dexie";
import { type BibleBookIndex } from "./bible-queries";
import { type BibleVerse } from "./helloao";

export type CachedChapter = {
  id: string; // e.g. "BSB-John-1"
  translationId: string;
  bookId: string;
  chapter: number;
  data: any; // HelloAoChapterResponse
  timestamp: number;
};

export type CachedBooks = {
  id: string; // e.g. "BSB-books"
  translationId: string;
  data: any; // HelloAoBooksResponse
  timestamp: number;
};

const db = new Dexie("BibleStudyDatabase") as Dexie & {
  chapters: EntityTable<CachedChapter, "id">;
  books: EntityTable<CachedBooks, "id">;
};

db.version(1).stores({
  chapters: "id, translationId, bookId, chapter",
  books: "id, translationId",
});

export { db };
