"use client";

import { BibleVerse } from "@/lib/scripture";
import { VerseBody, VerseExtras } from "@/components/bible/verse-tools";

export function ScriptureColumn({
  verses,
  loading,
  error,
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
  verses: BibleVerse[];
  loading: boolean;
  error: string | null;
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
  if (loading && verses.length === 0) {
    return <p className="text-[length:var(--text-sm)] text-[var(--mute)]">Loading chapter</p>;
  }
  if (error) {
    return <p className="text-[length:var(--text-sm)] text-[var(--accent)]">{error}</p>;
  }
  if (verses.length === 0) {
    return <p className="text-[length:var(--text-sm)] text-[var(--mute)]">This chapter has no verses yet.</p>;
  }

  return (
    <div className="space-y-1">
      {verses.map((verse) => {
        const active = selected.includes(verse.number);
        return (
          <article key={verse.number}>
            <VerseBody
              highlighted={highlighted.has(verse.number)}
              number={verse.number}
              onSelect={onSelect}
              selected={active}
              text={verse.text}
            />
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
  );
}
