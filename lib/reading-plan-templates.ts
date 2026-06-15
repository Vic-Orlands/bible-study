import type { PassageSelection } from "./scripture";

type CanonBook = {
  book: string;
  chapters: number;
  testament: "Old Testament" | "New Testament";
};

export type ReadingPlanTemplate = {
  description: string;
  durationDays: number;
  id: string;
  readings: {
    dayNumber: number;
    endChapter: number;
    passageLabel: string;
    selection: PassageSelection;
    startChapter: number;
  }[];
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

type ChapterRef = { book: string; chapter: number };

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

function flattenChapters(books: CanonBook[]) {
  const chapters: ChapterRef[] = [];
  for (const book of books) {
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      chapters.push({ book: book.book, chapter });
    }
  }
  return chapters;
}

function formatPassageLabel(readings: ChapterRef[]) {
  const first = readings[0];
  const last = readings[readings.length - 1];
  if (!first || !last) return "";
  if (first.book === last.book) {
    return first.chapter === last.chapter
      ? `${first.book} ${first.chapter}`
      : `${first.book} ${first.chapter}-${last.chapter}`;
  }
  return `${first.book} ${first.chapter} - ${last.book} ${last.chapter}`;
}

function buildTemplate(
  id: string,
  title: string,
  description: string,
  chapters: ChapterRef[],
  durationDays: number,
): ReadingPlanTemplate {
  const chunkSize = Math.max(1, Math.ceil(chapters.length / durationDays));
  const readings = chunk(chapters, chunkSize).map((group, index) => {
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

  return {
    description,
    durationDays: readings.length,
    id,
    readings,
    title,
  };
}

const WHOLE_BIBLE = buildTemplate(
  "whole-bible-year",
  "Whole Bible in a Year",
  "A steady path through the full canon across a year.",
  flattenChapters(CANON),
  365,
);

const NEW_TESTAMENT = buildTemplate(
  "new-testament-180",
  "New Testament in 180 Days",
  "A focused six-month walk through the New Testament.",
  flattenChapters(CANON.filter((book) => book.testament === "New Testament")),
  180,
);

const GOSPELS = buildTemplate(
  "gospels-90",
  "Gospels in 90 Days",
  "Ninety days with Matthew, Mark, Luke, and John.",
  flattenChapters(CANON.filter((book) =>
    ["Matthew", "Mark", "Luke", "John"].includes(book.book),
  )),
  90,
);

const PSALMS_PROVERBS = buildTemplate(
  "psalms-proverbs-60",
  "Psalms & Proverbs in 60 Days",
  "A wisdom-focused plan through Psalms and Proverbs.",
  flattenChapters(CANON.filter((book) =>
    ["Psalms", "Proverbs"].includes(book.book),
  )),
  60,
);

export const READING_PLAN_TEMPLATES: ReadingPlanTemplate[] = [
  WHOLE_BIBLE,
  NEW_TESTAMENT,
  GOSPELS,
  PSALMS_PROVERBS,
];

export function getReadingPlanTemplate(templateId: string) {
  return READING_PLAN_TEMPLATES.find((template) => template.id === templateId) ?? null;
}
