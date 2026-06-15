type UnknownRecord = Record<string, unknown>;

export type CustomTranslationSourceType = "json";

export type CustomTranslationConfig = {
  abbreviation: string;
  chapterUrlTemplate: string;
  enabled: boolean;
  id: string;
  indexUrl: string;
  languageTag: string;
  licenseNotes?: string;
  name: string;
  sourceType: CustomTranslationSourceType;
  supportsFullBible: boolean;
};

export type CustomTranslationBook = {
  book: string;
  chapters: { chapter: number; verseCount: number }[];
  id: string;
  order: number;
  testament: "Old Testament" | "New Testament";
  usfm: string;
};

export type CustomTranslationChapter = {
  book: string;
  chapter: number;
  reference: string;
  verses: { number: number; text: string }[];
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

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.data)) return value.data;
  if (isRecord(value) && Array.isArray(value.books)) return value.books;
  if (isRecord(value) && Array.isArray(value.verses)) return value.verses;
  return null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function inferTestament(bookId: string) {
  return NEW_TESTAMENT_BOOK_IDS.has(bookId)
    ? "New Testament"
    : "Old Testament";
}

function fillChapterUrlTemplate(
  template: string,
  bookId: string,
  chapter: number,
  bookName: string,
) {
  return template
    .replaceAll("{bookId}", encodeURIComponent(bookId))
    .replaceAll("{chapter}", encodeURIComponent(String(chapter)))
    .replaceAll("{bookName}", encodeURIComponent(bookName));
}

export function normalizeCustomTranslationBooks(
  payload: unknown,
): CustomTranslationBook[] {
  const entries = readArray(payload);
  if (!entries) {
    throw new Error("Custom translation index payload must include a books array.");
  }

  return entries.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error("Custom translation index book entry must be an object.");
    }

    const rawId =
      readString(entry.id) ??
      readString(entry.bookId) ??
      readString(entry.usfm) ??
      readString(entry.abbreviation);
    const rawBook =
      readString(entry.book) ??
      readString(entry.name) ??
      readString(entry.title) ??
      readString(entry.nameLong);

    if (!rawId || !rawBook) {
      throw new Error("Each custom translation book must include id and name.");
    }

    const chapterEntries = readArray(entry.chapters);
    if (!chapterEntries) {
      throw new Error(`Book ${rawBook} is missing chapters.`);
    }

    const chapters = chapterEntries
      .map((chapterEntry, chapterIndex) => {
        if (!isRecord(chapterEntry)) {
          throw new Error(`Book ${rawBook} has an invalid chapter entry.`);
        }

        const chapter =
          readNumber(chapterEntry.chapter) ??
          readNumber(chapterEntry.number) ??
          chapterIndex + 1;
        const verseCount =
          readNumber(chapterEntry.verseCount) ??
          readNumber(chapterEntry.verses) ??
          0;

        return {
          chapter,
          verseCount,
        };
      })
      .filter((chapter) => chapter.chapter > 0);

    const normalizedId = rawId.toUpperCase();
    return {
      book: rawBook,
      chapters,
      id: normalizedId,
      order: index + 1,
      testament: inferTestament(normalizedId),
      usfm: normalizedId,
    };
  });
}

export function normalizeCustomTranslationChapter(
  payload: unknown,
  fallback: {
    book: string;
    chapter: number;
  },
): CustomTranslationChapter {
  const verseEntries = readArray(payload);
  if (!verseEntries) {
    throw new Error("Custom translation chapter payload must include a verses array.");
  }

  const verses = verseEntries
    .map((entry, index) => {
      if (!isRecord(entry)) {
        throw new Error("Custom translation verse entry must be an object.");
      }

      const number =
        readNumber(entry.number) ??
        readNumber(entry.verse) ??
        readNumber(entry.id) ??
        index + 1;
      const text = readString(entry.text) ?? readString(entry.content) ?? "";

      return {
        number,
        text: text.trim(),
      };
    })
    .filter((verse) => verse.number > 0 && verse.text.length > 0);

  const record = isRecord(payload) ? payload : null;
  const referenceText = record ? readString(record.reference) : null;
  const referenceChapterMatch = referenceText?.match(/\s+(\d+)(?::\d+)?(?:-\d+)?$/);
  const book =
    (record &&
      (readString(record.book) ??
        readString(record.bookName) ??
        referenceText?.replace(/\s+\d+(?::\d+)?(?:-\d+)?$/, ""))) ||
    fallback.book;
  const chapter =
    (record &&
      (readNumber(record.chapter) ??
        readNumber(record.chapterNumber) ??
        readNumber(referenceChapterMatch?.[1]))) ||
    fallback.chapter;
  const reference = referenceText || `${book} ${chapter}`;

  return {
    book,
    chapter,
    reference,
    verses,
  };
}

export async function fetchCustomTranslationIndex(
  config: Pick<CustomTranslationConfig, "indexUrl">,
) {
  const response = await fetch(config.indexUrl, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Custom translation index request failed: ${response.status} ${body}`);
  }

  const payload = await response.json();
  return normalizeCustomTranslationBooks(payload);
}

export async function fetchCustomTranslationChapter(
  config: Pick<CustomTranslationConfig, "chapterUrlTemplate">,
  params: {
    book: string;
    bookId: string;
    chapter: number;
  },
) {
  const url = fillChapterUrlTemplate(
    config.chapterUrlTemplate,
    params.bookId,
    params.chapter,
    params.book,
  );
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Custom translation chapter request failed: ${response.status} ${body}`);
  }

  const payload = await response.json();
  return normalizeCustomTranslationChapter(payload, {
    book: params.book,
    chapter: params.chapter,
  });
}
