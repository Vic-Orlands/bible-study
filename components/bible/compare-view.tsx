"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { BibleVerse } from "@/lib/scripture";
import { changedWordCount, diffWords, DiffPiece } from "@/lib/word-diff";
import { DiffLine, VerseBody, VerseExtras } from "@/components/bible/verse-tools";

type Column = {
  id: string;
  abbreviation: string;
  verses: BibleVerse[];
  loading: boolean;
  error: string | null;
};

export function CompareView({
  primary,
  secondary,
  selected,
  highlighted,
  noteVerse,
  noteDraft,
  onSelect,
  onHighlight,
  onNote,
  onReferences,
  onDiscuss,
  onSaveNote,
}: {
  primary: Column;
  secondary: Column;
  selected: number[];
  highlighted: Set<number>;
  noteVerse: number | null;
  noteDraft: string;
  onSelect: (verse: number, shiftKey: boolean) => void;
  onHighlight: (verse: number) => void;
  onNote: (verse: number) => void;
  onReferences: (verse: number) => void;
  onDiscuss: (verse: number) => void;
  onSaveNote: (
    verse: number,
    content: string,
    type: "observation" | "interpretation" | "application",
  ) => Promise<void>;
}) {
  const [mobileSide, setMobileSide] = useState<"a" | "b">("a");
  const [swipe, setSwipe] = useState(false);
  const [scan, setScan] = useState(0);
  const secondaryByNumber = new Map(secondary.verses.map((verse) => [verse.number, verse.text]));

  useEffect(() => {
    setScan((value) => value + 1);
  }, [secondary.id]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setSwipe(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="flex rounded-full border border-[var(--line)] p-1">
          {(["a", "b"] as const).map((side) => (
            <button
              className={
                mobileSide === side
                  ? "rounded-full bg-[var(--soft)] px-3 py-1 text-[length:var(--text-xs)]"
                  : "px-3 py-1 text-[length:var(--text-xs)] text-[var(--mute)]"
              }
              key={side}
              onClick={() => setMobileSide(side)}
              type="button"
            >
              {side === "a" ? primary.abbreviation : secondary.abbreviation}
            </button>
          ))}
        </div>
        <span className="text-[length:var(--text-xs)] text-[var(--mute)]">Swipe</span>
      </div>
      <div className="mb-2 hidden grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-3 text-[length:var(--text-xs)] text-[var(--mute)] lg:grid">
        <span />
        <span>{primary.abbreviation}</span>
        <span>{secondary.abbreviation}</span>
        <span className="delta-count">Δ</span>
      </div>
      <motion.div
        drag={swipe ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={(_, info) => {
          if (info.offset.x < -48) setMobileSide("b");
          if (info.offset.x > 48) setMobileSide("a");
        }}
      >
        <div className="relative">
          <motion.div
            key={scan}
            className="thread-only pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-[var(--accent)]"
            initial={{ y: 0, opacity: 0.9 }}
            animate={{ y: 280, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          {primary.verses.map((verse) => {
            const right = secondaryByNumber.get(verse.number) ?? "";
            const diff = diffWords(verse.text, right);
            const active = selected.includes(verse.number);
            const pieces = mobileSide === "a" ? diff.left : diff.right;
            return (
              <article className="border-b border-[var(--line)] py-2" key={verse.number}>
                <DesktopRow
                  count={changedWordCount(verse.text, right)}
                  highlighted={highlighted.has(verse.number)}
                  left={diff.left}
                  number={verse.number}
                  onSelect={onSelect}
                  right={diff.right}
                />
                <div className="lg:hidden">
                  <VerseBody
                    highlighted={highlighted.has(verse.number)}
                    number={verse.number}
                    onSelect={onSelect}
                    pieces={pieces}
                    selected={active}
                  />
                </div>
                {active ? (
                  <VerseExtras
                    highlighted={highlighted.has(verse.number)}
                    note={noteDraft}
                    onDiscuss={() => onDiscuss(verse.number)}
                    onHighlight={() => onHighlight(verse.number)}
                    onNote={() => onNote(verse.number)}
                    onReferences={() => onReferences(verse.number)}
                    onSave={(content, type) => onSaveNote(verse.number, content, type)}
                    quote={verse.text}
                    showNote={noteVerse === verse.number}
                    showPill={selected[selected.length - 1] === verse.number}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      </motion.div>
      {primary.loading || secondary.loading ? (
        <p className="mt-4 text-[length:var(--text-sm)] text-[var(--mute)]">Loading translations</p>
      ) : null}
      {primary.error || secondary.error ? (
        <p className="mt-4 text-[length:var(--text-sm)] text-[var(--accent)]">
          {primary.error ?? secondary.error}
        </p>
      ) : null}
    </div>
  );
}

function DesktopRow({
  number,
  left,
  right,
  count,
  highlighted,
  onSelect,
}: {
  number: number;
  left: DiffPiece[];
  right: DiffPiece[];
  count: number;
  highlighted: boolean;
  onSelect: (verse: number, shiftKey: boolean) => void;
}) {
  return (
    <div className="hidden grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-3 lg:grid">
      <button
        className={highlighted ? "pt-1 text-left text-[length:var(--text-xs)] text-[var(--accent)]" : "pt-1 text-left text-[length:var(--text-xs)] text-[var(--mute)]"}
        onClick={(event) => onSelect(number, event.shiftKey)}
        type="button"
      >
        {number}
      </button>
      <button
        className="text-left text-[length:var(--scripture)] leading-7"
        data-verse={number}
        data-verse-anchor={number}
        onClick={(event) => onSelect(number, event.shiftKey)}
        type="button"
      >
        <DiffLine pieces={left} />
      </button>
      <button
        className="text-left text-[length:var(--scripture)] leading-7"
        onClick={(event) => onSelect(number, event.shiftKey)}
        type="button"
      >
        <DiffLine pieces={right} />
      </button>
      <span className="delta-count pt-1 text-[length:var(--text-xs)]">{count}</span>
    </div>
  );
}
