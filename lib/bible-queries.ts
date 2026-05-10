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
  { label: "AAB", name: "Accessible Ancients Bible", translationId: "AAB" },
  { label: "BSB", name: "Berean Standard Bible", translationId: "BSB" },
  { label: "WEB", name: "World English Bible", translationId: "ENGWEBP" },
  { label: "GHT", name: "Garth's Hyper-literal Translation", translationId: "GHT" },
  { label: "ASVBT", name: "American Standard Version Byzantine Text", translationId: "eng_abt" },
  { label: "AEB", name: "Anindilyakwa English Bible", translationId: "eng_aoi" },
  { label: "ASV", name: "American Standard Version (1901)", translationId: "eng_asv" },
  { label: "BBP", name: "Barkly Bible Portions", translationId: "eng_bar" },
  { label: "BBE", name: "Bible in Basic English", translationId: "eng_bbe" },
  { label: "UBES", name: "Updated Brenton English Septuagint", translationId: "eng_boy" },
  { label: "BST", name: "Brenton Septuagint Translation", translationId: "eng_bre" },
  { label: "KJVCP", name: "KJV Cambridge Paragraph Bible", translationId: "eng_cpb" },
  { label: "DBY", name: "Darby Translation", translationId: "eng_dby" },
  { label: "DRA", name: "Douay-Rheims 1899", translationId: "eng_dra" },
  { label: "EMTV", name: "English Majority Text Version", translationId: "eng_emtv" },
  { label: "TNTC", name: "The New Testament with Commentary", translationId: "eng_f35" },
  { label: "FBV", name: "Free Bible Version", translationId: "eng_fbv" },
  { label: "GLW", name: "God's Living Word", translationId: "eng_glw" },
  { label: "GNV", name: "Geneva Bible 1599", translationId: "eng_gnv" },
  { label: "JPSTN", name: "JPS TaNaKH 1917", translationId: "eng_jps" },
  { label: "KJVA", name: "King James Version + Apocrypha", translationId: "eng_kja" },
  { label: "KJV", name: "King James (Authorized) Version", translationId: "eng_kjv" },
  { label: "ILT", name: "Isaac Leeser Tanakh", translationId: "eng_lee" },
  { label: "LSV", name: "Literal Standard Version", translationId: "eng_lsv" },
  { label: "LXXSB", name: "LXX2012: Septuagint in British/International English 2012", translationId: "eng_lxu" },
  { label: "LXXSA", name: "LXX2012: Septuagint in American English 2012", translationId: "eng_lxx" },
  { label: "MSB", name: "Majority Standard Bible", translationId: "eng_msb" },
  { label: "NET", name: "NET Bible", translationId: "eng_net" },
  { label: "NEB", name: "Nyangumarta English Bible", translationId: "eng_nna" },
  { label: "GNB", name: "George Noyes Bible", translationId: "eng_noy" },
  { label: "TOJB", name: "The Orthodox Jewish Bible", translationId: "eng_ojb" },
  { label: "TOE", name: "Targum Onkelos Etheridge", translationId: "eng_oke" },
  { label: "OURB", name: "One Unity Resource Bible", translationId: "eng_our" },
  { label: "PEV", name: "Plain English Version", translationId: "eng_pev" },
  { label: "RVA", name: "Revised Version with Apocrypha (1895)", translationId: "eng_rv5" },
  { label: "T4T", name: "Translation for Translators", translationId: "eng_t4t" },
  { label: "TCENT", name: "Text-Critical English New Testament", translationId: "eng_tce" },
  { label: "TNT", name: "Tyndale New Testament", translationId: "eng_tnt" },
  { label: "ULB", name: "Unlocked Literal Bible", translationId: "eng_ulb" },
  { label: "W88", name: "Wycliffe Bible", translationId: "eng_w88" },
  { label: "NWB", name: "Noah Webster Bible", translationId: "eng_wbs" },
  { label: "WEBC", name: "World English Bible (Catholic)", translationId: "eng_webc" },
  { label: "WEBBE", name: "World English Bible British Edition", translationId: "eng_webpb" },
  { label: "WEBU", name: "World English Bible Updated", translationId: "eng_webu" },
  { label: "WEBC2", name: "World English Bible Classic", translationId: "eng_web" },
  { label: "WEBBE2", name: "World English Bible British Edition with Deuterocanon", translationId: "eng_weu" },
  { label: "WMB", name: "World Messianic Bible", translationId: "eng_wmb" },
  { label: "WMBBE", name: "World Messianic Bible British Edition", translationId: "eng_wmu" },
  { label: "WBMS", name: "Wycliffe's Bible with Modern Spelling", translationId: "eng_wyc2017" },
  { label: "WBMSE", name: "Wycliffe's Bible with Modern Spelling (Enhanced)", translationId: "eng_wyc2018" },
  { label: "YLT", name: "Young's Literal Translation", translationId: "eng_ylt" },
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

export function useAllChapterVerses(
  bookId: string | undefined,
  chapter: number,
  enabled: boolean,
) {
  return useQueries({
    queries: translations.map(({ label, translationId }) => ({
      queryKey: ["bible-chapter-all", label, bookId, chapter],
      queryFn: async (): Promise<{ label: string; verses: BibleVerse[] }> => {
        try {
          const data = await fetchHelloAoChapter(
            translationId,
            bookId!,
            chapter,
          );
          return { label, verses: extractChapterVerses(data) };
        } catch (error) {
          console.error(
            "useAllChapterVerses queryFn failed for",
            label,
            error,
          );
          throw error;
        }
      },
      enabled: !!bookId && enabled,
      staleTime: Infinity,
      gcTime: Infinity,
    })),
  });
}
