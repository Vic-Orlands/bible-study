"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useStudyStore } from "@/lib/study-store";
import { parseVerseReference, useBibleBooks } from "@/lib/bible-queries";
import { fetchHelloAoChapter, extractChapterVerses } from "@/lib/helloao";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const VERSE_REGEX = /((?:(?:[123]|I{1,3})\s)?[A-Za-z][A-Za-z]*(?:\s[A-Za-z][A-Za-z]*)?)\s+(\d+):(\d+)/gi;

export function RichScriptureText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(VERSE_REGEX);
  const result: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 4 === 0) {
      result.push(parts[i]);
    } else if (i % 4 === 1) {
      const book = parts[i];
      const chapter = parts[i + 1];
      const verse = parts[i + 2];
      const reference = book + " " + chapter + ":" + verse;
      
      result.push(
        <VerseLink
          key={reference + "-" + i}
          book={book}
          chapter={parseInt(chapter)}
          verse={parseInt(verse)}
          reference={reference}
        />
      );
      i += 2;
    }
  }

  return <div className={cn("rich-scripture-text whitespace-pre-wrap", className)}>{result}</div>;
}

function normalizeBookForApi(rawBook: string): string {
  return rawBook
    .replace(/^(I{1,3})\s+/, (match) => {
      const count = match.trim().length;
      return count + "";
    })
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, "");
}

function VerseLink({ book, chapter, verse, reference }: { book: string; chapter: number; verse: number; reference: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setPassage = useStudyStore((s) => s.setPassage);
  const setFlashingVerse = useStudyStore((s) => s.setFlashingVerse);
  const { data: bibleBooks } = useBibleBooks();

  const handleLinkClick = () => {
    if (!bibleBooks) return;
    const selection = parseVerseReference(reference, bibleBooks);
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
    return () => { active = false; };
  }, [isHovered, book, chapter, verse, previewText]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.span
          className="cursor-pointer text-[#c5a059] font-serif italic font-medium hover:text-[#a24723] transition-colors inline-block"
          style={{ fontFamily: "Newsreader, serif" }}
          onClick={handleLinkClick}
          onMouseEnter={() => setIsHovered(true)}
          whileHover={{ scale: 1.02 }}
        >
          {reference}
        </motion.span>
      </TooltipTrigger>
      <TooltipContent className="z-[100] w-64 p-3 border-[#e5d6c9] bg-white shadow-xl rounded-lg pointer-events-none" side="top" sideOffset={8}>
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