import { useQueries, useQuery } from "@tanstack/react-query";
import {
  fetchHelloAoBooks,
  fetchHelloAoChapter,
  extractChapterVerses,
  HelloAoBook,
  BibleVerse,
} from "./helloao";
import { PassageSelection } from "./study-store";

export type BibleBookIndex = {
  book: string;
  chapters: { chapter: number }[];
  id: string;
  order: number;
  testament: "Old Testament" | "New Testament";
};

export type Translation = {
  label: string;
  name: string;
  translationId: string;
};

export const translations: Translation[] = [
  { label: "BSB", name: "Berean Standard Bible", translationId: "BSB" },
  { label: "WEB", name: "World English Bible", translationId: "ENGWEBP" },
  { label: "KJV", name: "King James Version", translationId: "eng_kjv" },
  { label: "ASV", name: "American Standard Version", translationId: "eng_asv" },
  { label: "BBE", name: "Bible in Basic English", translationId: "eng_bbe" },
  { label: "DBY", name: "Darby Translation", translationId: "eng_dby" },
  { label: "LSV", name: "Literal Standard Version", translationId: "eng_lsv" },
  { label: "FBV", name: "Free Bible Version", translationId: "eng_fbv" },
  { label: "YLT", name: "Youngs Literal Translation", translationId: "eng_ylt" },
  { label: "WEBBE", name: "WEB British Edition", translationId: "eng_webpb" },
  { label: "RV", name: "Revised Version 1895", translationId: "eng_rv5" },
  { label: "NET", name: "NET Bible", translationId: "eng_net" },
  { label: "GLW", name: "Gods Living Word", translationId: "eng_glw" },
  { label: "WEB Catholic", name: "WEB Catholic Edition", translationId: "eng_webc" },
  { label: "WMB", name: "World Messianic Bible", translationId: "eng_wmb" },
];

export const formatPassage = ({ book, chapter, verse }: PassageSelection) =>
  `${book} ${chapter} : ${verse}`;

export const formatReference = ({ book, chapter, verse }: PassageSelection) =>
  `${book} ${chapter}:${verse}`;

export const chapterKeyFor = ({ book, chapter }: PassageSelection) =>
  `${book}-${chapter}`;

export const getBookId = (books: BibleBookIndex[], bookName: string) =>
  books.find((b) => b.book === bookName)?.id;

export const mapHelloAoBooks = (books: HelloAoBook[]): BibleBookIndex[] =>
  books.map(({ commonName, id, numberOfChapters, order }) => ({
    book: commonName,
    chapters: Array.from({ length: numberOfChapters }, (_, i) => ({
      chapter: i + 1,
    })),
    id,
    order,
    testament: order >= 40 ? "New Testament" : "Old Testament",
  }));

export const parseVerseReference = (
  query: string,
  bibleBooks: BibleBookIndex[],
): PassageSelection | null => {
  const match = query
    .trim()
    .match(/^([1-3]?\s*[a-z]+(?:\s+[a-z]+)?)\s+(\d+)(?::(\d+))?$/i);
  if (!match) return null;

  const bookQuery = match[1].trim().toLowerCase().replace(/\s+/g, " ");
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : 1;

  const bookModel = bibleBooks.find(({ book }) => {
    const b = book.toLowerCase();
    return (
      b === bookQuery ||
      b.startsWith(bookQuery) ||
      b.replace(/\s+/g, "").startsWith(bookQuery.replace(/\s+/g, ""))
    );
  });

  if (!bookModel || chapter < 1 || chapter > bookModel.chapters.length)
    return null;

  return { book: bookModel.book, chapter, verse };
};

export function useBibleBooks() {
  return useQuery({
    queryKey: ["bible-books"],
    queryFn: async () => {
      try {
        const r = await fetchHelloAoBooks();
        return mapHelloAoBooks(r.books);
      } catch (error) {
        console.error("useBibleBooks queryFn failed", error);
        throw error;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useVerseCount(bookId: string | undefined, chapter: number) {
  return useQuery({
    queryKey: ["verse-count", bookId, chapter],
    queryFn: async () => {
      try {
        const r = await fetchHelloAoChapter("BSB", bookId!, chapter);
        return r.numberOfVerses;
      } catch (error) {
        console.error("useVerseCount queryFn failed", error);
        throw error;
      }
    },
    enabled: !!bookId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useBibleChapters(
  visibleVersions: string[],
  bookId: string | undefined,
  chapter: number,
) {
  return useQueries({
    queries: visibleVersions.map((label) => {
      const translationId = translations.find(
        (t) => t.label === label,
      )?.translationId;
      return {
        queryKey: ["bible-chapter", label, bookId, chapter],
        queryFn: async (): Promise<{ label: string; verses: BibleVerse[] }> => {
          try {
            const data = await fetchHelloAoChapter(
              translationId!,
              bookId!,
              chapter,
            );
            return { label, verses: extractChapterVerses(data) };
          } catch (error) {
            console.error("useBibleChapters queryFn failed", error);
            throw error;
          }
        },
        enabled: !!bookId && !!translationId,
        staleTime: Infinity,
        gcTime: Infinity,
      };
    }),
  });
}
