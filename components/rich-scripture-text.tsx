"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useStudyStore } from "@/lib/study-store";
import { parseVerseReference, useBibleBooks } from "@/lib/bible-queries";
import { fetchHelloAoChapter, extractChapterVerses } from "@/lib/helloao";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Matches: "John 1:1", "1 John 1:1", "I John 1:1", "1st John 1:1",
//          "john 1:1", "John 1", "John 1: 1", "John 1:1 - 10",
//          "Song of Solomon 1:1", "1 Peter 1:1-5"
const VERSE_REGEX = /((?:(?:[123]|I{1,3}|1st|2nd|3rd)\s)?[A-Za-z]+(?:\s[A-Za-z]+)*)\s+(\d+)(?:\s*[:\.]\s*(\d+)(?:\s*[-–—]\s*(\d+))?)?/gi;

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

export function RichScriptureText({ text, className }: { text: string; className?: string }) {
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
      />
    );

    lastIndex = match.index + match.length;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return <div className={cn("rich-scripture-text whitespace-pre-wrap", className)}>{result}</div>;
}

function normalizeBookForApi(rawBook: string): string {
  return rawBook
    .replace(/^(I{1,3})\s+/, (match) => match.trim().length.toString())
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
    const selection = parseVerseReference(`${book} ${chapter}:${verse}`, bibleBooks);
    if (selection) {
      setPassage(selection);
      setFlashingVerse(selection.book + "-" + selection.chapter + "-" + selection.verse);
    }
  };

  useEffect(() => {
    let active = true;
    if (isHovered && !previewText) {
      setLoading(true);
      fetchHelloAoChapter("BSB", normalizeBookForApi(book), chapter)
        .then((data) => {
          if (!active) return;
          const verses = extractChapterVerses(data);
          const match = verses.find((v) => v.number === verse);
          setPreviewText(match ? match.text : "Verse not found.");
        })
        .catch(() => {
          if (active) setPreviewText("Failed to load preview.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [isHovered, book, chapter, verse, previewText]);

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
