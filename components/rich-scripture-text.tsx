"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useStudyStore } from "@/lib/study-store";
import { parseVerseReference, useBibleBooks } from "@/lib/bible-queries";
import { fetchHelloAoChapter, extractChapterVerses } from "@/lib/helloao";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const BIBLE_BOOK_PATTERN =
  "(?:Genesis|Gen|Exodus|Exod|Ex|Leviticus|Lev|Numbers|Num|Deuteronomy|Deut|Joshua|Josh|Judges|Judg|Ruth|(?:1st|1|I)\\s*Samuel|(?:2nd|2|II)\\s*Samuel|(?:1st|1|I)\\s*Kings|(?:2nd|2|II)\\s*Kings|(?:1st|1|I)\\s*Chronicles|(?:2nd|2|II)\\s*Chronicles|Ezra|Nehemiah|Neh|Esther|Esth|Job|Psalms?|Psalm|Ps|Proverbs|Prov|Ecclesiastes|Eccl|Song\\s+of\\s+Solomon|Song\\s+of\\s+Songs|Song|Isaiah|Isa|Jeremiah|Jer|Lamentations|Lam|Ezekiel|Ezek|Daniel|Dan|Hosea|Hos|Joel|Amos|Obadiah|Obad|Jonah|Micah|Mic|Nahum|Nah|Habakkuk|Hab|Zephaniah|Zeph|Haggai|Hag|Zechariah|Zech|Malachi|Mal|Matthew|Matt|Mark|Luke|John|Acts|Romans|Rom|(?:1st|1|I)\\s*Corinthians|(?:2nd|2|II)\\s*Corinthians|Galatians|Gal|Ephesians|Eph|Philippians|Phil|Colossians|Col|(?:1st|1|I)\\s*Thessalonians|(?:2nd|2|II)\\s*Thessalonians|(?:1st|1|I)\\s*Timothy|(?:2nd|2|II)\\s*Timothy|Titus|Philemon|Philem|Hebrews|Heb|James|Jas|(?:1st|1|I)\\s*Peter|(?:2nd|2|II)\\s*Peter|(?:1st|1|I)\\s*John|(?:2nd|2|II)\\s*John|(?:3rd|3|III)\\s*John|Jude|Revelation|Rev)";

const VERSE_REGEX = new RegExp(
  `\\b(${BIBLE_BOOK_PATTERN})\\s+(\\d+)(?:\\s*[:\\.]\\s*(\\d+)(?:\\s*[-–—]\\s*(\\d+))?)?\\b`,
  "gi",
);

interface VerseMatch {
  book: string;
  chapter: string;
  verse?: string;
  endVerse?: string;
  fullText: string;
  index: number;
  length: number;
}

function parseMatches(text: string): VerseMatch[] {
  const matches: VerseMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = VERSE_REGEX.exec(text)) !== null) {
    matches.push({
      book: m[1],
      chapter: m[2],
      verse: m[3],
      endVerse: m[4],
      fullText: m[0],
      index: m.index,
      length: m[0].length,
    });
  }
  return matches;
}

export function RichScriptureText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const matches = parseMatches(text);
  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const displayRef = match.verse
      ? `${match.book} ${match.chapter}:${match.verse}${match.endVerse ? `-${match.endVerse}` : ""}`
      : `${match.book} ${match.chapter}`;

    result.push(
      <VerseLink
        key={match.index}
        book={match.book}
        chapter={parseInt(match.chapter, 10)}
        verse={match.verse ? parseInt(match.verse, 10) : 1}
        endVerse={match.endVerse ? parseInt(match.endVerse, 10) : undefined}
        reference={displayRef}
      />,
    );

    lastIndex = match.index + match.length;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return (
    <div className={cn("rich-scripture-text whitespace-pre-wrap", className)}>
      {result}
    </div>
  );
}

function normalizeBookName(rawBook: string) {
  return (
    rawBook
      // 1stTimothy -> 1 Timothy
      // 1st Timothy -> 1 Timothy
      .replace(/^(1st|first)\s*/i, "1 ")
      .replace(/^(2nd|second)\s*/i, "2 ")
      .replace(/^(3rd|third)\s*/i, "3 ")

      // I Timothy -> 1 Timothy
      // IITimothy -> 2 Timothy
      // IIIJohn -> 3 John
      .replace(/^III\s*/i, "3 ")
      .replace(/^II\s*/i, "2 ")
      .replace(/^I\s*/i, "1 ")

      // 1Timothy -> 1 Timothy
      .replace(/^([1-3])(?=[A-Za-z])/, "$1 ")

      .trim()
      .replace(/\s+/g, " ")
  );
}

function normalizeBookForApi(
  rawBook: string,
  bibleBooks?: { book: string; id: string }[],
) {
  const normalizedBook = normalizeBookName(rawBook);

  const selection = bibleBooks
    ? parseVerseReference(`${normalizedBook} 1:1`, bibleBooks as any)
    : null;

  if (selection && bibleBooks) {
    const matchedBook = bibleBooks.find((item) => item.book === selection.book);
    if (matchedBook) {
      return matchedBook.id;
    }
  }

  return normalizedBook
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, "");
}

function VerseLink({
  book,
  chapter,
  verse,
  endVerse,
  reference,
}: {
  book: string;
  chapter: number;
  verse: number;
  endVerse?: number;
  reference: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setPassage = useStudyStore((s) => s.setPassage);
  const setFlashingVerse = useStudyStore((s) => s.setFlashingVerse);
  const { data: bibleBooks } = useBibleBooks();

  const handleLinkClick = () => {
    if (!bibleBooks) return;

    const normalizedBook = normalizeBookName(book);
    const selection = parseVerseReference(
      `${normalizedBook} ${chapter}:${verse}`,
      bibleBooks,
    );

    if (selection) {
      setPassage(selection);
      setFlashingVerse(
        selection.book + "-" + selection.chapter + "-" + selection.verse,
      );
    }
  };

  useEffect(() => {
    let active = true;
    if (isHovered && !previewText) {
      setLoading(true);
      fetchHelloAoChapter("BSB", normalizeBookForApi(book, bibleBooks), chapter)
        .then((data) => {
          if (!active) return;
          const verses = extractChapterVerses(data);
          const match = verses.find((v) => v.number === verse);
          setPreviewText(match ? match.text : "Verse not found.");
        })
        .catch((error) => {
          console.error("Failed to load verse preview:", error);
          if (active) setPreviewText("Failed to load preview.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [isHovered, book, bibleBooks, chapter, verse, previewText]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.span
          className="inline-block cursor-pointer font-serif font-medium italic text-[#c5a059] transition-colors hover:text-[#a24723]"
          style={{ fontFamily: "Newsreader, serif" }}
          onClick={handleLinkClick}
          onMouseEnter={() => setIsHovered(true)}
          whileHover={{ scale: 1.02 }}
        >
          {reference}
        </motion.span>
      </TooltipTrigger>
      <TooltipContent
        className="pointer-events-none z-[100] w-64 rounded-lg border-[#e5d6c9] bg-white p-3 shadow-xl"
        side="top"
        sideOffset={8}
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9b8878]">
            {reference} (BSB)
          </span>
          {loading ? (
            <div className="h-4 w-full animate-pulse rounded bg-[#fbf7f2]" />
          ) : (
            <p className="font-serif text-[13px] leading-relaxed text-[#3a2218]">
              {previewText}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
