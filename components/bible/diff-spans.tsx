"use client";

import { DiffPiece } from "@/lib/word-diff";

export function DiffSpans({
  pieces,
  onEnter,
  onLeave,
  litIndex,
}: {
  pieces: DiffPiece[];
  onEnter?: (index: number, node: HTMLElement) => void;
  onLeave?: () => void;
  litIndex?: number | null;
}) {
  let changed = 0;
  return (
    <>
      {pieces.map((piece, index) => {
        if (!piece.text.trim()) {
          return <span key={index}>{piece.text}</span>;
        }
        if (!piece.changed) {
          return (
            <span className="w" key={index}>
              {piece.text}
            </span>
          );
        }
        const mark = changed;
        changed += 1;
        return (
          <span
            className={litIndex === mark ? "w d lit" : "w d"}
            key={index}
            onMouseEnter={onEnter ? (event) => onEnter(mark, event.currentTarget) : undefined}
            onMouseLeave={onLeave}
          >
            {piece.text}
          </span>
        );
      })}
    </>
  );
}
