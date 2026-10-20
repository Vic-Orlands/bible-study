import { CANON } from "@/lib/reading-plan-templates";

export type BookMeta = { book: string; abbr: string; genre: string; chapters: number };

export const BOOK_META: BookMeta[] = [
  ["Genesis", "GEN", 50, "Law"],
  ["Exodus", "EXO", 40, "Law"],
  ["Leviticus", "LEV", 27, "Law"],
  ["Numbers", "NUM", 36, "Law"],
  ["Deuteronomy", "DEU", 34, "Law"],
  ["Joshua", "JOS", 24, "History"],
  ["Judges", "JDG", 21, "History"],
  ["Ruth", "RUT", 4, "History"],
  ["1 Samuel", "1SA", 31, "History"],
  ["2 Samuel", "2SA", 24, "History"],
  ["1 Kings", "1KI", 22, "History"],
  ["2 Kings", "2KI", 25, "History"],
  ["1 Chronicles", "1CH", 29, "History"],
  ["2 Chronicles", "2CH", 36, "History"],
  ["Ezra", "EZR", 10, "History"],
  ["Nehemiah", "NEH", 13, "History"],
  ["Esther", "EST", 10, "History"],
  ["Job", "JOB", 42, "Poetry"],
  ["Psalms", "PSA", 150, "Poetry"],
  ["Proverbs", "PRO", 31, "Poetry"],
  ["Ecclesiastes", "ECC", 12, "Poetry"],
  ["Song of Solomon", "SNG", 8, "Poetry"],
  ["Isaiah", "ISA", 66, "Prophets"],
  ["Jeremiah", "JER", 52, "Prophets"],
  ["Lamentations", "LAM", 5, "Prophets"],
  ["Ezekiel", "EZK", 48, "Prophets"],
  ["Daniel", "DAN", 12, "Prophets"],
  ["Hosea", "HOS", 14, "Prophets"],
  ["Joel", "JOL", 3, "Prophets"],
  ["Amos", "AMO", 9, "Prophets"],
  ["Obadiah", "OBA", 1, "Prophets"],
  ["Jonah", "JON", 4, "Prophets"],
  ["Micah", "MIC", 7, "Prophets"],
  ["Nahum", "NAM", 3, "Prophets"],
  ["Habakkuk", "HAB", 3, "Prophets"],
  ["Zephaniah", "ZEP", 3, "Prophets"],
  ["Haggai", "HAG", 2, "Prophets"],
  ["Zechariah", "ZEC", 14, "Prophets"],
  ["Malachi", "MAL", 4, "Prophets"],
  ["Matthew", "MAT", 28, "Gospels"],
  ["Mark", "MRK", 16, "Gospels"],
  ["Luke", "LUK", 24, "Gospels"],
  ["John", "JHN", 21, "Gospels"],
  ["Acts", "ACT", 28, "Acts"],
  ["Romans", "ROM", 16, "Letters"],
  ["1 Corinthians", "1CO", 16, "Letters"],
  ["2 Corinthians", "2CO", 13, "Letters"],
  ["Galatians", "GAL", 6, "Letters"],
  ["Ephesians", "EPH", 6, "Letters"],
  ["Philippians", "PHP", 4, "Letters"],
  ["Colossians", "COL", 4, "Letters"],
  ["1 Thessalonians", "1TH", 5, "Letters"],
  ["2 Thessalonians", "2TH", 3, "Letters"],
  ["1 Timothy", "1TI", 6, "Letters"],
  ["2 Timothy", "2TI", 4, "Letters"],
  ["Titus", "TIT", 3, "Letters"],
  ["Philemon", "PHM", 1, "Letters"],
  ["Hebrews", "HEB", 13, "Letters"],
  ["James", "JAS", 5, "Letters"],
  ["1 Peter", "1PE", 5, "Letters"],
  ["2 Peter", "2PE", 3, "Letters"],
  ["1 John", "1JN", 5, "Letters"],
  ["2 John", "2JN", 1, "Letters"],
  ["3 John", "3JN", 1, "Letters"],
  ["Jude", "JUD", 1, "Letters"],
  ["Revelation", "REV", 22, "Prophecy"],
].map(([book, abbr, chapters, genre]) => ({
  book: book as string,
  abbr: abbr as string,
  chapters: chapters as number,
  genre: genre as string,
}));

const BY_BOOK = new Map(BOOK_META.map((book) => [book.book, book]));

export function metaFor(book: string) {
  return BY_BOOK.get(book) ?? { book, abbr: book.slice(0, 3).toUpperCase(), genre: "History", chapters: 1 };
}

export const JOHN_SECTIONS = [
  { title: "The Word", from: 1 },
  { title: "The Witness of John", from: 6 },
  { title: "The Word Became Flesh", from: 14 },
];

export function sectionsFor(book: string, chapter: number) {
  if (book === "John" && chapter === 1) return JOHN_SECTIONS;
  return [];
}

export function bookKick(book: string) {
  if (["Matthew", "Mark", "Luke", "John"].includes(book)) return "The Gospel according to";
  return "The Book of";
}

export function bookSide(book: string) {
  if (["Matthew", "Mark", "Luke", "John"].includes(book)) return `The Gospel of ${book}`;
  return book;
}

const YEARS: Record<string, string> = { KJV: "1611", WEB: "2000", ASV: "1901" };

export function versionYear(abbreviation: string) {
  return YEARS[abbreviation.toUpperCase()] ?? "";
}

const ROMAN: [number, string][] = [
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
];

export function chapterMark(chapter: number) {
  let value = chapter;
  let mark = "";
  for (const [amount, glyph] of ROMAN) {
    while (value >= amount) {
      mark += glyph;
      value -= amount;
    }
  }
  return mark || String(chapter);
}

export function refCode(target: string) {
  const meta = BOOK_META.find((book) => target.startsWith(`${book.book} `) || target === book.book);
  if (!meta) return target.toUpperCase();
  const rest = target.slice(meta.book.length).trim();
  const match = rest.match(/^(\d+):(\d+)/);
  if (!match) return meta.abbr;
  return `${meta.abbr} ${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}`;
}

export function refCategory(target: string) {
  const book = CANON.find((item) => target.startsWith(`${item.book} `) || target === item.book);
  if (!book) return "";
  const meta = metaFor(book.book);
  const side = book.testament === "Old Testament" ? "OT" : "NT";
  return `${side} · ${meta.genre}`;
}
