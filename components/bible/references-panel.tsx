"use client";

import { useEffect, useState } from "react";
import { SideSheet } from "@/components/ui/side-sheet";
import { fetchCommentaryChapter, fetchCrossRefChapter } from "@/lib/study-data";
import { CommentaryBlock, CrossReference } from "@/lib/scripture";
import { referenceRelation } from "@/lib/reference-relation";

export function ReferencesPanel({
  open,
  book,
  chapter,
  verse,
  onClose,
  onOpen,
}: {
  open: boolean;
  book: string;
  chapter: number;
  verse: number | null;
  onClose: () => void;
  onOpen: (target: string) => void;
}) {
  const [references, setReferences] = useState<CrossReference[]>([]);
  const [commentary, setCommentary] = useState<CommentaryBlock[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || verse == null) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [crossRefs, notes] = await Promise.all([
          fetchCrossRefChapter(book, chapter),
          fetchCommentaryChapter(book, chapter),
        ]);
        if (cancelled) return;
        setReferences(crossRefs.references.filter((reference) => reference.sourceVerse === verse));
        setCommentary(
          notes.blocks.filter((block) => block.type === "heading" || block.number === verse),
        );
        setError(null);
      } catch (loadError) {
        console.error("Failed to load references:", loadError);
        if (!cancelled) setError("References are unavailable right now.");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [book, chapter, open, verse]);

  return (
    <SideSheet open={open} title={verse ? `${book} ${chapter}:${verse}` : "References"} onClose={onClose}>
      <div className="space-y-4 px-4 py-4">
        {error ? <p className="text-[length:var(--text-sm)] text-[var(--accent)]">{error}</p> : null}
        <section className="space-y-2">
          <h3 className="text-[length:var(--text-xs)] uppercase tracking-[0.14em] text-[var(--mute)]">
            Cross references
          </h3>
          {references.length === 0 ? (
            <p className="text-[length:var(--text-sm)] text-[var(--mute)]">No cross references for this verse.</p>
          ) : (
            references.map((reference) => (
              <button
                className="block w-full rounded-2xl border border-[var(--line)] px-3 py-3 text-left"
                key={`${reference.target}-${reference.text}`}
                onClick={() => onOpen(reference.target)}
                type="button"
              >
                <span className="text-[length:var(--text-xs)] text-[var(--accent)]">
                  {referenceRelation(book, reference.target, reference.text)}
                </span>
                <span className="mt-1 block text-[length:var(--text-sm)] font-medium">{reference.target}</span>
                <span className="mt-1 block text-[length:var(--text-xs)] text-[var(--mute)]">{reference.text}</span>
              </button>
            ))
          )}
        </section>
        <section className="space-y-2">
          <h3 className="text-[length:var(--text-xs)] uppercase tracking-[0.14em] text-[var(--mute)]">
            Commentary
          </h3>
          {commentary.length === 0 ? (
            <p className="text-[length:var(--text-sm)] text-[var(--mute)]">No commentary for this verse.</p>
          ) : (
            commentary.map((block, index) => (
              <p className="text-[length:var(--text-sm)] leading-6" key={`${block.type}-${index}`}>
                {block.text}
              </p>
            ))
          )}
        </section>
      </div>
    </SideSheet>
  );
}
