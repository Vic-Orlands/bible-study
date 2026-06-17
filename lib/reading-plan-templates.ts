import type { PassageSelection } from "./scripture";

type CanonBook = {
  book: string;
  chapters: number;
  testament: "Old Testament" | "New Testament";
};

type ChapterRef = { book: string; chapter: number };

type ReadingPlanCategory =
  | "Beginner"
  | "Wisdom"
  | "Church Life"
  | "Jesus"
  | "New Testament"
  | "Whole Bible";

export type ReadingPlanTemplate = {
  cadenceLabel: string;
  category: ReadingPlanCategory;
  durationDays: number;
  estimatedMinutes: number;
  featured: boolean;
  id: string;
  readings: {
    dayNumber: number;
    endChapter: number;
    passageLabel: string;
    selection: PassageSelection;
    startChapter: number;
  }[];
  scopeLabel: string;
  summary: string;
  title: string;
};

const CANON: CanonBook[] = [
  { book: "Genesis", chapters: 50, testament: "Old Testament" },
  { book: "Exodus", chapters: 40, testament: "Old Testament" },
  { book: "Leviticus", chapters: 27, testament: "Old Testament" },
  { book: "Numbers", chapters: 36, testament: "Old Testament" },
  { book: "Deuteronomy", chapters: 34, testament: "Old Testament" },
  { book: "Joshua", chapters: 24, testament: "Old Testament" },
  { book: "Judges", chapters: 21, testament: "Old Testament" },
  { book: "Ruth", chapters: 4, testament: "Old Testament" },
  { book: "1 Samuel", chapters: 31, testament: "Old Testament" },
  { book: "2 Samuel", chapters: 24, testament: "Old Testament" },
  { book: "1 Kings", chapters: 22, testament: "Old Testament" },
  { book: "2 Kings", chapters: 25, testament: "Old Testament" },
  { book: "1 Chronicles", chapters: 29, testament: "Old Testament" },
  { book: "2 Chronicles", chapters: 36, testament: "Old Testament" },
  { book: "Ezra", chapters: 10, testament: "Old Testament" },
  { book: "Nehemiah", chapters: 13, testament: "Old Testament" },
  { book: "Esther", chapters: 10, testament: "Old Testament" },
  { book: "Job", chapters: 42, testament: "Old Testament" },
  { book: "Psalms", chapters: 150, testament: "Old Testament" },
  { book: "Proverbs", chapters: 31, testament: "Old Testament" },
  { book: "Ecclesiastes", chapters: 12, testament: "Old Testament" },
  { book: "Song of Solomon", chapters: 8, testament: "Old Testament" },
  { book: "Isaiah", chapters: 66, testament: "Old Testament" },
  { book: "Jeremiah", chapters: 52, testament: "Old Testament" },
  { book: "Lamentations", chapters: 5, testament: "Old Testament" },
  { book: "Ezekiel", chapters: 48, testament: "Old Testament" },
  { book: "Daniel", chapters: 12, testament: "Old Testament" },
  { book: "Hosea", chapters: 14, testament: "Old Testament" },
  { book: "Joel", chapters: 3, testament: "Old Testament" },
  { book: "Amos", chapters: 9, testament: "Old Testament" },
  { book: "Obadiah", chapters: 1, testament: "Old Testament" },
  { book: "Jonah", chapters: 4, testament: "Old Testament" },
  { book: "Micah", chapters: 7, testament: "Old Testament" },
  { book: "Nahum", chapters: 3, testament: "Old Testament" },
  { book: "Habakkuk", chapters: 3, testament: "Old Testament" },
  { book: "Zephaniah", chapters: 3, testament: "Old Testament" },
  { book: "Haggai", chapters: 2, testament: "Old Testament" },
  { book: "Zechariah", chapters: 14, testament: "Old Testament" },
  { book: "Malachi", chapters: 4, testament: "Old Testament" },
  { book: "Matthew", chapters: 28, testament: "New Testament" },
  { book: "Mark", chapters: 16, testament: "New Testament" },
  { book: "Luke", chapters: 24, testament: "New Testament" },
  { book: "John", chapters: 21, testament: "New Testament" },
  { book: "Acts", chapters: 28, testament: "New Testament" },
  { book: "Romans", chapters: 16, testament: "New Testament" },
  { book: "1 Corinthians", chapters: 16, testament: "New Testament" },
  { book: "2 Corinthians", chapters: 13, testament: "New Testament" },
  { book: "Galatians", chapters: 6, testament: "New Testament" },
  { book: "Ephesians", chapters: 6, testament: "New Testament" },
  { book: "Philippians", chapters: 4, testament: "New Testament" },
  { book: "Colossians", chapters: 4, testament: "New Testament" },
  { book: "1 Thessalonians", chapters: 5, testament: "New Testament" },
  { book: "2 Thessalonians", chapters: 3, testament: "New Testament" },
  { book: "1 Timothy", chapters: 6, testament: "New Testament" },
  { book: "2 Timothy", chapters: 4, testament: "New Testament" },
  { book: "Titus", chapters: 3, testament: "New Testament" },
  { book: "Philemon", chapters: 1, testament: "New Testament" },
  { book: "Hebrews", chapters: 13, testament: "New Testament" },
  { book: "James", chapters: 5, testament: "New Testament" },
  { book: "1 Peter", chapters: 5, testament: "New Testament" },
  { book: "2 Peter", chapters: 3, testament: "New Testament" },
  { book: "1 John", chapters: 5, testament: "New Testament" },
  { book: "2 John", chapters: 1, testament: "New Testament" },
  { book: "3 John", chapters: 1, testament: "New Testament" },
  { book: "Jude", chapters: 1, testament: "New Testament" },
  { book: "Revelation", chapters: 22, testament: "New Testament" },
];

function flattenChapters(books: CanonBook[]) {
  const chapters: ChapterRef[] = [];
  for (const book of books) {
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      chapters.push({ book: book.book, chapter });
    }
  }
  return chapters;
}

function chaptersForBook(bookName: string, start = 1, end?: number) {
  const book = CANON.find((entry) => entry.book === bookName);
  if (!book) {
    throw new Error(`Unknown reading plan book: ${bookName}`);
  }

  const lastChapter = end ?? book.chapters;
  const chapters: ChapterRef[] = [];
  for (let chapter = start; chapter <= lastChapter; chapter += 1) {
    chapters.push({ book: bookName, chapter });
  }
  return chapters;
}

function formatPassageLabel(group: ChapterRef[]) {
  const first = group[0];
  const last = group[group.length - 1];
  if (!first || !last) return "";
  if (first.book === last.book) {
    return first.chapter === last.chapter
      ? `${first.book} ${first.chapter}`
      : `${first.book} ${first.chapter}-${last.chapter}`;
  }
  return `${first.book} ${first.chapter} - ${last.book} ${last.chapter}`;
}

function partitionChapters(chapters: ChapterRef[], durationDays: number) {
  const days = Math.max(1, Math.min(durationDays, chapters.length));
  const baseSize = Math.floor(chapters.length / days);
  const remainder = chapters.length % days;
  const groups: ChapterRef[][] = [];
  let cursor = 0;

  for (let day = 0; day < days; day += 1) {
    const size = baseSize + (day < remainder ? 1 : 0);
    groups.push(chapters.slice(cursor, cursor + size));
    cursor += size;
  }

  return groups.filter((group) => group.length > 0);
}

function toReadings(groups: ChapterRef[][]) {
  return groups.map((group, index) => {
    const first = group[0];
    const last = group[group.length - 1];
    return {
      dayNumber: index + 1,
      endChapter: last.chapter,
      passageLabel: formatPassageLabel(group),
      selection: {
        book: first.book,
        chapter: first.chapter,
        verse: 1,
      },
      startChapter: first.chapter,
    };
  });
}

function formatList(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function uniqueBooks(chapters: ChapterRef[]) {
  return chapters.filter((chapter, index, all) => all.findIndex((entry) => entry.book === chapter.book) === index);
}

function deriveScopeLabel(chapters: ChapterRef[]) {
  const books = uniqueBooks(chapters).map((chapter) => chapter.book);
  const newTestamentBooks = CANON.filter((book) => book.testament === "New Testament").map(
    (book) => book.book,
  );
  const oldTestamentBooks = CANON.filter((book) => book.testament === "Old Testament").map(
    (book) => book.book,
  );

  if (books.length === CANON.length) {
    return "Whole Bible";
  }
  if (
    books.length === newTestamentBooks.length &&
    books.every((book) => newTestamentBooks.includes(book))
  ) {
    return "New Testament";
  }
  if (
    books.length === oldTestamentBooks.length &&
    books.every((book) => oldTestamentBooks.includes(book))
  ) {
    return "Old Testament";
  }
  if (books.length <= 3) {
    return formatList(books);
  }
  if (books.length <= 5) {
    return `${books[0]} to ${books[books.length - 1]}`;
  }
  return `${books.length} books`;
}

function deriveCadenceLabel(groups: ChapterRef[][]) {
  const sizes = groups.map((group) => group.length);
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  const average = Math.round(sizes.reduce((sum, size) => sum + size, 0) / sizes.length);

  if (min === 1 && max === 1) {
    return "1 chapter a day";
  }
  if (min === max) {
    return `${min} chapters a day`;
  }
  if (max - min <= 1) {
    return `${min}-${max} chapters a day`;
  }
  return `About ${average} chapters a day`;
}

function deriveEstimatedMinutes(groups: ChapterRef[][]) {
  const averageChapters =
    groups.reduce((sum, group) => sum + group.length, 0) / Math.max(groups.length, 1);
  return Math.max(5, Math.round(averageChapters * 4));
}

function deriveSummary(scopeLabel: string, durationDays: number) {
  return `${scopeLabel} • ${durationDays} daily readings`;
}

function buildGeneratedTemplate({
  category,
  chapters,
  durationDays,
  featured,
  id,
  title,
}: Pick<ReadingPlanTemplate, "category" | "featured" | "id" | "title"> & {
  chapters: ChapterRef[];
  durationDays: number;
}) {
  const groups = partitionChapters(chapters, durationDays);
  const readings = toReadings(groups);
  const scopeLabel = deriveScopeLabel(chapters);
  return {
    category,
    durationDays: readings.length,
    cadenceLabel: deriveCadenceLabel(groups),
    estimatedMinutes: deriveEstimatedMinutes(groups),
    featured,
    id,
    readings,
    scopeLabel,
    summary: deriveSummary(scopeLabel, readings.length),
    title,
  } satisfies ReadingPlanTemplate;
}

function buildCuratedTemplate({
  category,
  chapters,
  featured,
  id,
  title,
}: Pick<ReadingPlanTemplate, "category" | "featured" | "id" | "title"> & {
  chapters: ChapterRef[][];
}) {
  const readings = toReadings(chapters);
  const flatChapters = chapters.flat();
  const scopeLabel = deriveScopeLabel(flatChapters);
  return {
    category,
    cadenceLabel: deriveCadenceLabel(chapters),
    durationDays: readings.length,
    estimatedMinutes: deriveEstimatedMinutes(chapters),
    featured,
    id,
    readings,
    scopeLabel,
    summary: deriveSummary(scopeLabel, readings.length),
    title,
  } satisfies ReadingPlanTemplate;
}

const START_WITH_JOHN = buildCuratedTemplate({
  id: "start-with-john-21",
  title: "Start with John",
  category: "Beginner",
  featured: true,
  chapters: chaptersForBook("John").map((chapter) => [chapter]),
});

const PSALMS_30 = buildGeneratedTemplate({
  id: "psalms-30",
  title: "Psalms in 30 Days",
  category: "Wisdom",
  featured: true,
  chapters: chaptersForBook("Psalms"),
  durationDays: 30,
});

const PROVERBS_31 = buildCuratedTemplate({
  id: "proverbs-31",
  title: "Proverbs in 31 Days",
  category: "Wisdom",
  featured: false,
  chapters: chaptersForBook("Proverbs").map((chapter) => [chapter]),
});

const ACTS_AND_EARLY_CHURCH = buildGeneratedTemplate({
  id: "acts-early-church-45",
  title: "Acts & the Early Church",
  category: "Church Life",
  featured: false,
  chapters: [
    ...chaptersForBook("Acts"),
    ...chaptersForBook("James"),
    ...chaptersForBook("Galatians"),
    ...chaptersForBook("1 Thessalonians"),
    ...chaptersForBook("2 Thessalonians"),
  ],
  durationDays: 45,
});

const PSALMS_AND_PROVERBS = buildGeneratedTemplate({
  id: "psalms-proverbs-60",
  title: "Psalms & Proverbs",
  category: "Wisdom",
  featured: false,
  chapters: [...chaptersForBook("Psalms"), ...chaptersForBook("Proverbs")],
  durationDays: 60,
});

const GOSPELS_90 = buildGeneratedTemplate({
  id: "gospels-90",
  title: "Gospels in 90 Days",
  category: "Jesus",
  featured: true,
  chapters: [
    ...chaptersForBook("Matthew"),
    ...chaptersForBook("Mark"),
    ...chaptersForBook("Luke"),
    ...chaptersForBook("John"),
    ...chaptersForBook("Acts", 1, 1),
  ],
  durationDays: 90,
});

const NEW_TESTAMENT_180 = buildGeneratedTemplate({
  id: "new-testament-180",
  title: "New Testament in 180 Days",
  category: "New Testament",
  featured: true,
  chapters: flattenChapters(CANON.filter((book) => book.testament === "New Testament")),
  durationDays: 180,
});

const WHOLE_BIBLE = buildGeneratedTemplate({
  id: "whole-bible-year",
  title: "Whole Bible in a Year",
  category: "Whole Bible",
  featured: true,
  chapters: flattenChapters(CANON),
  durationDays: 365,
});

export const READING_PLAN_TEMPLATES: ReadingPlanTemplate[] = [
  START_WITH_JOHN,
  PSALMS_30,
  PROVERBS_31,
  ACTS_AND_EARLY_CHURCH,
  PSALMS_AND_PROVERBS,
  GOSPELS_90,
  NEW_TESTAMENT_180,
  WHOLE_BIBLE,
];

export function getReadingPlanTemplate(templateId: string) {
  return READING_PLAN_TEMPLATES.find((template) => template.id === templateId) ?? null;
}
