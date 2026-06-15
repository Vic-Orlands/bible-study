import { useQueries, useQuery } from "@tanstack/react-query";
import { db } from "./db";

export type PassageSelection = { book: string; chapter: number; verse: number };

export type BibleVersion = {
  id: string;
  abbreviation: string;
  title: string;
  languageTag: string;
  books: string[];
  provider: "apiBible" | "custom";
  providerVersionId: string;
  isEnabled: boolean;
  sourceType: "apiBible" | "json";
  supportsFullBible: boolean;
};

export type BibleBookIndex = {
  book: string;
  chapters: { chapter: number; verseCount: number }[];
  id: string;
  order: number;
  testament: "Old Testament" | "New Testament";
  usfm: string;
};

export type BibleVerse = {
  number: number;
  text: string;
};

export type CommentaryBlock =
  | { type: "heading"; text: string }
  | { type: "verse"; number: number; text: string };

export type CommentaryChapter = {
  blocks: CommentaryBlock[];
  chapter: number;
  book: string;
};

export type CrossReference = {
  sourceVerse: number | null;
  target: string;
  text: string;
};

export type CrossRefChapter = {
  chapter: number;
  book: string;
  references: CrossReference[];
};

type NormalizedBibleChapter = {
  book: string;
  chapter: number;
  reference: string;
  translationId: string;
  translationLabel: string;
  verses: BibleVerse[];
};

type ApiBibleCollectionResponse = {
  data: {
    id: string;
    abbreviation: string;
    abbreviationLocal?: string;
    language: {
      id: string;
      name: string;
      nameLocal?: string;
      script?: string;
      scriptDirection?: string;
    };
    name: string;
    nameLocal?: string;
  }[];
};

type ApiBibleBooksResponse = {
  data: {
    id: string;
    abbreviation: string;
    name: string;
    nameLong?: string;
    chapters?: {
      id: string;
      number: string;
      reference?: string;
      bookId?: string;
    }[];
  }[];
};

type ApiBibleChapterResponse = {
  data: {
    bibleId: string;
    bookId: string;
    content: string;
    id: string;
    number: string;
    reference: string;
    verseCount: number;
  };
};

type CustomTranslationRecord = {
  _id: string;
  abbreviation: string;
  chapterUrlTemplate: string;
  enabled: boolean;
  indexUrl: string;
  languageTag: string;
  licenseNotes?: string;
  name: string;
  sourceType: "json";
  supportsFullBible: boolean;
};

type CustomTranslationCollectionResponse = {
  data: CustomTranslationRecord[];
};

type CustomTranslationBooksResponse = {
  data: BibleBookIndex[];
};

type CustomTranslationChapterResponse = {
  data: {
    book: string;
    chapter: number;
    reference: string;
    verses: BibleVerse[];
  };
};

const API_BIBLE_ROUTE = "/api/api-bible";
const CUSTOM_TRANSLATIONS_ROUTE = "/api/custom-translations";
const DEFAULT_LANGUAGE = "eng";
const SCRIPTURE_QUERY_VERSION = "v5";
const SCRIPTURE_CACHE_VERSION = SCRIPTURE_QUERY_VERSION;

const PREFERRED_VERSION_ORDER = [
  "KJV",
  "NIV",
  "NKJV",
  "NLT",
  "ESV",
  "BSB",
  "GNT",
  "AMP",
  "NET",
  "CSB",
  "NASB",
  "NASB1995",
  "NASB2020",
  "NRSV",
  "ASV",
  "WEBUS",
  "WEB",
];

const VERSION_ALIASES: Record<string, string[]> = {
  GNT: ["GOOD NEWS TRANSLATION", "GOOD NEWS BIBLE"],
  NASB: ["NASB1995", "NEW AMERICAN STANDARD BIBLE", "NEW AMERICAN STANDARD BIBLE 1995"],
  NASB1995: ["NASB", "NEW AMERICAN STANDARD BIBLE", "NEW AMERICAN STANDARD BIBLE 1995"],
  NIV: ["NEW INTERNATIONAL VERSION"],
  NKJV: ["NEW KING JAMES VERSION"],
  NLT: ["NEW LIVING TRANSLATION"],
};

const NEW_TESTAMENT_BOOK_IDS = new Set([
  "MAT",
  "MRK",
  "LUK",
  "JHN",
  "ACT",
  "ROM",
  "1CO",
  "2CO",
  "GAL",
  "EPH",
  "PHP",
  "COL",
  "1TH",
  "2TH",
  "1TI",
  "2TI",
  "TIT",
  "PHM",
  "HEB",
  "JAS",
  "1PE",
  "2PE",
  "1JN",
  "2JN",
  "3JN",
  "JUD",
  "REV",
]);

function preferredVersionScore(version: BibleVersion) {
  const index = PREFERRED_VERSION_ORDER.indexOf(version.abbreviation.toUpperCase());
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function normalizeVersionToken(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function resolveBibleVersion(
  requested: string,
  available: BibleVersion[],
) {
  const normalizedRequested = normalizeVersionToken(requested);
  if (!normalizedRequested) return null;

  const candidates = [
    requested,
    ...(VERSION_ALIASES[normalizedRequested] ?? []),
  ].map(normalizeVersionToken);

  return (
    available.find((version) => {
      const id = normalizeVersionToken(version.id);
      const abbreviation = normalizeVersionToken(version.abbreviation);
      const title = normalizeVersionToken(version.title);
      return candidates.some(
        (candidate) =>
          candidate === id || candidate === abbreviation || candidate === title,
      );
    }) ?? null
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeWhitespace(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextFromNode(node: Element) {
  return node.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function extractVerseNumber(value: string) {
  const match = value.match(/(\d{1,3})(?!.*\d)/);
  if (!match) return null;
  const verseNumber = parseInt(match[1], 10);
  return Number.isNaN(verseNumber) || verseNumber < 1 ? null : verseNumber;
}

function parsePassageHtmlIntoVerses(
  html: string,
  verseCount?: number,
): BibleVerse[] {
  if (typeof window === "undefined" || !html) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const verseMap = new Map<number, string[]>();

  const appendText = (verseNumber: number, text: string) => {
    if (!text) return;
    if (verseCount && verseNumber > verseCount) return;
    const existing = verseMap.get(verseNumber) ?? [];
    existing.push(text);
    verseMap.set(verseNumber, existing);
  };

  const verseNodes = Array.from(
    doc.querySelectorAll("[data-verse-id], [data-verse-org-ids], [data-sid]"),
  );

  for (const node of verseNodes) {
    const verseId =
      node.getAttribute("data-verse-id") ??
      node.getAttribute("data-verse-org-ids") ??
      node.getAttribute("data-sid") ??
      "";
    const verseNumber = extractVerseNumber(verseId);
    if (!verseNumber) continue;
    const text = extractTextFromNode(node);
    if (!text || text === String(verseNumber)) continue;
    appendText(verseNumber, text.replace(new RegExp(`^${verseNumber}\\s*`), ""));
  }

  if (verseMap.size > 0) {
    return [...verseMap.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([number, parts]) => ({
        number,
        text: normalizeWhitespace(parts.join(" ")),
      }))
      .filter((verse) => verse.text.length > 0);
  }

  const candidates = Array.from(
    doc.querySelectorAll(
      "[data-number], [data-usfm], [data-verse], [id], [class], span, p",
    ),
  );

  for (const node of candidates) {
    const identifiers = [
      node.getAttribute("data-number"),
      node.getAttribute("data-usfm"),
      node.getAttribute("data-verse"),
      node.getAttribute("id"),
      node.getAttribute("class"),
    ].filter((value): value is string => Boolean(value));
    const verseNumber = identifiers
      .map((value) => extractVerseNumber(value))
      .find((value) => value !== null);
    if (!verseNumber) continue;
    const text = extractTextFromNode(node);
    if (!text || text === String(verseNumber)) continue;
    appendText(verseNumber, text.replace(new RegExp(`^${verseNumber}\\s*`), ""));
  }

  const plainText = normalizeWhitespace(html);
  if (!plainText) return [];

  const matches = [...plainText.matchAll(/\b(\d{1,3})\b/g)].map((match) => ({
    index: match.index ?? 0,
    verse: parseInt(match[1], 10),
  }));

  const validMatches = matches.filter((match) => {
    if (match.verse < 1) return false;
    if (verseCount && match.verse > verseCount) return false;
    return true;
  });

  const parsed: BibleVerse[] = [];
  for (let i = 0; i < validMatches.length; i += 1) {
    const current = validMatches[i];
    const next = validMatches[i + 1];
    const start = current.index + String(current.verse).length;
    const end = next ? next.index : plainText.length;
    const text = plainText.slice(start, end).trim();
    if (text) {
      parsed.push({ number: current.verse, text });
    }
  }

  return parsed;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText} ${body}`.trim());
  }
  return (await response.json()) as T;
}

function inferTestament(bookId: string) {
  return NEW_TESTAMENT_BOOK_IDS.has(bookId)
    ? "New Testament"
    : "Old Testament";
}

function mapApiBibleVersions(response: ApiBibleCollectionResponse) {
  return response.data.map((version) => ({
    id: `api:${version.id}`,
    abbreviation: version.abbreviationLocal || version.abbreviation,
    books: [],
    isEnabled: true,
    languageTag: version.language.id,
    provider: "apiBible" as const,
    providerVersionId: version.id,
    sourceType: "apiBible" as const,
    supportsFullBible: true,
    title: version.nameLocal || version.name,
  }));
}

function mapCustomVersions(response: CustomTranslationCollectionResponse) {
  return response.data.map((version) => ({
    id: `custom:${version._id}`,
    abbreviation: version.abbreviation,
    books: [],
    isEnabled: version.enabled,
    languageTag: version.languageTag,
    provider: "custom" as const,
    providerVersionId: version._id,
    sourceType: version.sourceType,
    supportsFullBible: version.supportsFullBible,
    title: version.name,
  }));
}

function sortVersionsByPreference(versions: BibleVersion[]) {
  return [...versions].sort((left, right) => {
    if (left.provider !== right.provider) {
      if (left.provider === "apiBible") return -1;
      if (right.provider === "apiBible") return 1;
    }
    const scoreDiff = preferredVersionScore(left) - preferredVersionScore(right);
    if (scoreDiff !== 0) return scoreDiff;
    return left.abbreviation.localeCompare(right.abbreviation);
  });
}

function mapApiBibleBooks(response: ApiBibleBooksResponse) {
  return response.data.map((book, index) => ({
    book: book.name,
    chapters: (book.chapters ?? [])
      .map((chapter) => ({
        chapter: parseInt(chapter.number, 10),
        verseCount: 0,
      }))
      .filter((chapter) => Number.isFinite(chapter.chapter) && chapter.chapter > 0),
    id: book.id,
    order: index + 1,
    testament: inferTestament(book.id),
    usfm: book.id,
  })) satisfies BibleBookIndex[];
}

function chapterCacheId(translationId: string, bookId: string, chapter: number) {
  return `${SCRIPTURE_CACHE_VERSION}-${translationId}-${bookId}-${chapter}`;
}

function bookCacheId(versionId: string) {
  return `${SCRIPTURE_CACHE_VERSION}-${versionId}-books`;
}

function selectIndexVersion(versions: BibleVersion[]) {
  return (
    sortVersionsByPreference(versions).find((version) => version.supportsFullBible) ??
    sortVersionsByPreference(versions)[0] ??
    null
  );
}

export async function fetchBibleVersions() {
  const [apiBibleResult, customTranslationsResult] = await Promise.allSettled([
    fetchJson<ApiBibleCollectionResponse>(
      `${API_BIBLE_ROUTE}?kind=bibles&language=${DEFAULT_LANGUAGE}`,
    ),
    fetchJson<CustomTranslationCollectionResponse>(
      `${CUSTOM_TRANSLATIONS_ROUTE}?kind=enabled`,
    ),
  ]);

  if (apiBibleResult.status !== "fulfilled") {
    throw apiBibleResult.reason;
  }

  if (customTranslationsResult.status !== "fulfilled") {
    console.error(
      "Custom translation catalog unavailable, continuing with API.Bible only:",
      customTranslationsResult.reason,
    );
  }

  return sortVersionsByPreference([
    ...mapApiBibleVersions(apiBibleResult.value),
    ...(customTranslationsResult.status === "fulfilled"
      ? mapCustomVersions(customTranslationsResult.value)
      : []),
  ]);
}

async function fetchBooksForVersion(version: BibleVersion) {
  const cacheId = bookCacheId(version.id);

  try {
    const cached = await db.books.get(cacheId);
    if (cached) return cached.data as BibleBookIndex[];
  } catch (error) {
    console.error("Bible books cache read failed:", error);
  }

  let mapped: BibleBookIndex[];

  if (version.provider === "apiBible") {
    const response = await fetchJson<ApiBibleBooksResponse>(
      `${API_BIBLE_ROUTE}?kind=books&bibleId=${encodeURIComponent(
        version.providerVersionId,
      )}&include-chapters=true`,
    );
    mapped = mapApiBibleBooks(response);
  } else {
    const response = await fetchJson<CustomTranslationBooksResponse>(
      `${CUSTOM_TRANSLATIONS_ROUTE}?kind=index&translationId=${encodeURIComponent(
        version.id,
      )}`,
    );
    mapped = response.data;
  }

  try {
    await db.books.put({
      id: cacheId,
      translationId: version.id,
      data: mapped,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Bible books cache write failed:", error);
  }

  return mapped;
}

export async function fetchBibleBooks() {
  const versions = await fetchBibleVersions();
  const defaultVersion = selectIndexVersion(versions);
  if (!defaultVersion) {
    throw new Error("No Bible versions available.");
  }
  return await fetchBooksForVersion(defaultVersion);
}

async function fetchApiBibleChapterVerses(
  version: BibleVersion,
  book: BibleBookIndex,
  chapter: number,
) {
  const cacheId = chapterCacheId(version.id, book.id, chapter);

  try {
    const cached = await db.chapters.get(cacheId);
    if (cached) return cached.data as NormalizedBibleChapter;
  } catch (error) {
    console.error("Bible chapter cache read failed:", error);
  }

  const chapterId = `${book.id}.${chapter}`;
  const response = await fetchJson<ApiBibleChapterResponse>(
    `${API_BIBLE_ROUTE}?kind=chapter&bibleId=${encodeURIComponent(
      version.providerVersionId,
    )}&chapterId=${encodeURIComponent(
      chapterId,
    )}&content-type=html&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=true`,
  );

  const verses = parsePassageHtmlIntoVerses(
    response.data.content,
    response.data.verseCount,
  );

  const normalized: NormalizedBibleChapter = {
    book: book.book,
    chapter,
    reference: response.data.reference,
    translationId: version.id,
    translationLabel: version.abbreviation,
    verses,
  };

  try {
    await db.chapters.put({
      id: cacheId,
      translationId: version.id,
      bookId: book.id,
      chapter,
      data: normalized,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Bible chapter cache write failed:", error);
  }

  return normalized;
}

async function fetchCustomChapterVerses(
  version: BibleVersion,
  book: BibleBookIndex,
  chapter: number,
) {
  const cacheId = chapterCacheId(version.id, book.id, chapter);

  try {
    const cached = await db.chapters.get(cacheId);
    if (cached) return cached.data as NormalizedBibleChapter;
  } catch (error) {
    console.error("Bible chapter cache read failed:", error);
  }

  const response = await fetchJson<CustomTranslationChapterResponse>(
    `${CUSTOM_TRANSLATIONS_ROUTE}?kind=chapter&translationId=${encodeURIComponent(
      version.id,
    )}&book=${encodeURIComponent(book.book)}&bookId=${encodeURIComponent(
      book.id,
    )}&chapter=${chapter}`,
  );

  const normalized: NormalizedBibleChapter = {
    book: response.data.book,
    chapter: response.data.chapter,
    reference: response.data.reference,
    translationId: version.id,
    translationLabel: version.abbreviation,
    verses: response.data.verses,
  };

  try {
    await db.chapters.put({
      id: cacheId,
      translationId: version.id,
      bookId: book.id,
      chapter,
      data: normalized,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Bible chapter cache write failed:", error);
  }

  return normalized;
}

async function fetchChapterForVersion(
  version: BibleVersion,
  book: BibleBookIndex,
  chapter: number,
) {
  if (version.provider === "apiBible") {
    return await fetchApiBibleChapterVerses(version, book, chapter);
  }
  return await fetchCustomChapterVerses(version, book, chapter);
}

export async function fetchBibleChapterForVersion(
  versionLabel: string,
  bookName: string,
  chapter: number,
) {
  const versions = await fetchBibleVersions();
  const version = resolveBibleVersion(versionLabel, versions);
  if (!version) {
    throw new Error(`Unable to resolve version ${versionLabel}.`);
  }

  const books = await fetchBooksForVersion(version);
  const book = books.find((item) => item.book === bookName);
  if (!book) {
    throw new Error(`Unable to resolve book ${bookName}.`);
  }

  const chapterInfo = book.chapters.find((item) => item.chapter === chapter);
  if (!chapterInfo) {
    throw new Error(`Unable to resolve chapter ${bookName} ${chapter}.`);
  }

  return await fetchChapterForVersion(version, book, chapter);
}

export async function fetchBibleVerseCollection(
  bibleId: string,
  bookId: string,
  chapter: number,
) {
  const versions = await fetchBibleVersions();
  const version = resolveBibleVersion(bibleId, versions);
  if (!version) throw new Error(`Unable to resolve version ${bibleId}.`);
  const books = await fetchBooksForVersion(version);
  const book = books.find((entry) => entry.id === bookId);
  if (!book) throw new Error(`Unable to resolve book ${bookId}.`);
  const data = await fetchChapterForVersion(version, book, chapter);
  return {
    data: data.verses.map((verse) => ({
      id: `${bookId}.${chapter}.${verse.number}`,
      passage_id: `${bookId}.${chapter}.${verse.number}`,
      title: verse.number,
    })),
  };
}

export function formatPassage({ book, chapter, verse }: PassageSelection) {
  return `${book} ${chapter} : ${verse}`;
}

export function formatReference({ book, chapter, verse }: PassageSelection) {
  return `${book} ${chapter}:${verse}`;
}

export function chapterKeyFor({ book, chapter }: PassageSelection) {
  return `${book}-${chapter}`;
}

export function getBookId(books: BibleBookIndex[], bookName: string) {
  return books.find((book) => book.book === bookName)?.id;
}

function normalizeBookReference(value: string) {
  const normalizeOrdinal = (raw: string) => {
    if (/^1st$/i.test(raw) || /^i$/i.test(raw)) return "1";
    if (/^2nd$/i.test(raw) || /^ii$/i.test(raw)) return "2";
    if (/^3rd$/i.test(raw) || /^iii$/i.test(raw)) return "3";
    return raw;
  };

  const collapsed = value.trim().toLowerCase().replace(/\s+/g, " ");
  const expanded = collapsed
    .replace(/^(1st|2nd|3rd|iii|ii|i)([a-z])/i, "$1 $2")
    .replace(/^([123])([a-z])/i, "$1 $2");

  return expanded
    .split(" ")
    .filter(Boolean)
    .map((token) => normalizeOrdinal(token))
    .join(" ");
}

export function parseVerseReference(
  query: string,
  bibleBooks: BibleBookIndex[],
): PassageSelection | null {
  const match = query
    .trim()
    .match(
      /^((?:(?:[1-3]|1st|2nd|3rd|i|ii|iii)\s*)?[a-z]+(?:\s+[a-z]+)*)\s+(\d+)(?::(\d+))?$/i,
    );
  if (!match) return null;

  const bookQuery = normalizeBookReference(match[1]);
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : 1;

  const bookModel = bibleBooks.find(({ book }) => {
    const normalizedBook = normalizeBookReference(book);
    return (
      normalizedBook === bookQuery ||
      normalizedBook.startsWith(bookQuery) ||
      normalizedBook.replace(/\s+/g, "").startsWith(bookQuery.replace(/\s+/g, ""))
    );
  });

  if (!bookModel || chapter < 1 || chapter > bookModel.chapters.length) {
    return null;
  }

  const chapterInfo = bookModel.chapters.find((item) => item.chapter === chapter);
  return {
    book: bookModel.book,
    chapter,
    verse:
      chapterInfo && chapterInfo.verseCount > 0
        ? Math.max(1, Math.min(verse, chapterInfo.verseCount))
        : verse,
  };
}

export function useBibleVersions() {
  return useQuery({
    queryKey: ["bible-versions", SCRIPTURE_QUERY_VERSION],
    queryFn: async () => {
      try {
        return await fetchBibleVersions();
      } catch (error) {
        console.error("useBibleVersions queryFn failed", error);
        throw error;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useBibleBooks() {
  return useQuery({
    queryKey: ["bible-books", SCRIPTURE_QUERY_VERSION],
    queryFn: async () => {
      try {
        return await fetchBibleBooks();
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
  const { data: versions = [] } = useBibleVersions();
  const { data: bibleBooks = [] } = useBibleBooks();

  return useQuery({
    queryKey: ["verse-count", SCRIPTURE_QUERY_VERSION, bookId, chapter],
    queryFn: async () => {
      const defaultVersion = selectIndexVersion(versions);
      const book = bibleBooks.find((item) => item.id === bookId);
      const chapterInfo = book?.chapters.find((item) => item.chapter === chapter);
      if (!defaultVersion || !book || !chapterInfo) return 0;
      if (chapterInfo.verseCount > 0) return chapterInfo.verseCount;
      const data = await fetchChapterForVersion(defaultVersion, book, chapter);
      return data.verses.length;
    },
    enabled: Boolean(bookId) && Boolean(versions.length) && Boolean(bibleBooks.length),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useBibleChapters(
  visibleVersions: string[],
  bookId: string | undefined,
  chapter: number,
) {
  const { data: versions = [] } = useBibleVersions();
  const { data: bibleBooks = [] } = useBibleBooks();

  return useQueries({
    queries: visibleVersions.map((versionId) => {
      const version = resolveBibleVersion(versionId, versions);
      const book = bibleBooks.find((item) => item.id === bookId);
      const chapterInfo = book?.chapters.find((item) => item.chapter === chapter);
      return {
        queryKey: [
          "bible-chapter",
          SCRIPTURE_QUERY_VERSION,
          versionId,
          bookId,
          chapter,
        ],
        queryFn: async (): Promise<{ label: string; verses: BibleVerse[] }> => {
          if (!version || !book || !chapterInfo) {
            return { label: versionId, verses: [] };
          }
          try {
            const data = await fetchChapterForVersion(version, book, chapter);
            return { label: version.id, verses: data.verses };
          } catch (error) {
            console.error("useBibleChapters queryFn failed", error);
            throw error;
          }
        },
        enabled: Boolean(version) && Boolean(book) && Boolean(chapterInfo),
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
  const { data: versions = [] } = useBibleVersions();
  const { data: bibleBooks = [] } = useBibleBooks();

  return useQueries({
    queries: versions.map((version) => {
      const book = bibleBooks.find((item) => item.id === bookId);
      const chapterInfo = book?.chapters.find((item) => item.chapter === chapter);
      return {
        queryKey: [
          "bible-chapter-all",
          SCRIPTURE_QUERY_VERSION,
          version.id,
          bookId,
          chapter,
        ],
        queryFn: async (): Promise<{ label: string; verses: BibleVerse[] }> => {
          if (!book || !chapterInfo) {
            return { label: version.id, verses: [] };
          }
          try {
            const data = await fetchChapterForVersion(version, book, chapter);
            return { label: version.id, verses: data.verses };
          } catch (error) {
            console.error("useAllChapterVerses queryFn failed", error);
            throw error;
          }
        },
        enabled: enabled && Boolean(book) && Boolean(chapterInfo),
        staleTime: Infinity,
        gcTime: Infinity,
      };
    }),
  });
}

export function preferredVisibleVersions(
  requested: string[],
  available: BibleVersion[],
) {
  const resolvedRequested = requested
    .map((label) => resolveBibleVersion(label, available)?.id ?? null)
    .filter((label): label is string => Boolean(label))
    .filter((label, index, list) => list.indexOf(label) === index);

  if (resolvedRequested.length > 0) {
    return resolvedRequested.slice(0, 3);
  }

  return sortVersionsByPreference(available)
    .slice(0, 3)
    .map((version) => version.id);
}

export function toPassageSelection(
  params: URLSearchParams,
  bibleBooks: BibleBookIndex[],
) {
  const book = params.get("book");
  const chapter = parseInt(params.get("chapter") ?? "", 10);
  const verse = parseInt(params.get("verse") ?? "", 10);

  if (!book || Number.isNaN(chapter) || Number.isNaN(verse)) {
    return null;
  }

  const matchingBook = bibleBooks.find((item) => item.book === book);
  if (!matchingBook) return null;

  const chapterInfo = matchingBook.chapters.find((item) => item.chapter === chapter);
  if (!chapterInfo) return null;

  return {
    book,
    chapter,
    verse:
      chapterInfo.verseCount > 0
        ? Math.max(1, Math.min(verse, chapterInfo.verseCount))
        : verse,
  };
}

export function normalizeBookNameForRegex(book: string) {
  return escapeRegExp(book).replace(/\s+/g, "\\s+");
}
