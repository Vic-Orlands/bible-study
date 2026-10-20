"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DiffPiece } from "@/lib/word-diff";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function DiffLine({ pieces }: { pieces: DiffPiece[] }) {
  return pieces.map((piece, index) =>
    piece.changed ? (
      <mark className="diff-word bg-transparent text-inherit" key={index}>
        {piece.text}
      </mark>
    ) : (
      <span key={index}>{piece.text}</span>
    ),
  );
}

export function VersePill({
  highlighted,
  onHighlight,
  onNote,
  onReferences,
  onDiscuss,
}: {
  highlighted: boolean;
  onHighlight: () => void;
  onNote: () => void;
  onReferences: () => void;
  onDiscuss: () => void;
}) {
  const actions = [
    { label: highlighted ? "Highlighted" : "Highlight", onClick: onHighlight },
    { label: "Note", onClick: onNote },
    { label: "References", onClick: onReferences },
    { label: "Discuss", onClick: onDiscuss },
  ];
  return (
    <motion.div
      className="canon-only mt-2 inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--sheet)] p-1"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={spring}
    >
      {actions.map((action) => (
        <button
          className="rounded-full px-2.5 py-1 text-[length:var(--text-xs)] text-[var(--ink)] hover:bg-[var(--soft)]"
          key={action.label}
          onClick={action.onClick}
          type="button"
        >
          {action.label}
        </button>
      ))}
    </motion.div>
  );
}

export function InlineNote({
  quote,
  initial,
  onSave,
}: {
  quote: string;
  initial: string;
  onSave: (content: string, type: "observation" | "interpretation" | "application") => Promise<void>;
}) {
  const [content, setContent] = useState(initial);
  const [type, setType] = useState<"observation" | "interpretation" | "application">("observation");
  const [saving, setSaving] = useState(false);

  return (
    <motion.form
      className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--sheet)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={spring}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!content.trim()) return;
        setSaving(true);
        try {
          await onSave(content.trim(), type);
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="border-b border-[var(--line)] px-3 py-3 text-[length:var(--scripture)] leading-7">
        {quote}
      </p>
      <textarea
        className="min-h-24 w-full resize-none bg-transparent px-3 py-3 text-[length:var(--text-sm)] outline-none"
        onChange={(event) => setContent(event.target.value)}
        placeholder="Write a note"
        value={content}
      />
      <div className="flex items-center justify-between gap-2 px-3 pb-3">
        <select
          className="bg-transparent text-[length:var(--text-xs)] text-[var(--mute)] outline-none"
          onChange={(event) =>
            setType(event.target.value as "observation" | "interpretation" | "application")
          }
          value={type}
        >
          <option value="observation">Observation</option>
          <option value="interpretation">Interpretation</option>
          <option value="application">Application</option>
        </select>
        <button
          className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-[length:var(--text-xs)] font-medium text-[var(--accent-ink)] disabled:opacity-50"
          disabled={saving || !content.trim()}
          type="submit"
        >
          Save note
        </button>
      </div>
    </motion.form>
  );
}

export function VerseBody({
  number,
  text,
  pieces,
  selected,
  highlighted,
  onSelect,
}: {
  number: number;
  text?: string;
  pieces?: DiffPiece[];
  selected: boolean;
  highlighted: boolean;
  onSelect: (verse: number, shiftKey: boolean) => void;
}) {
  return (
    <button
      className={cn(
        "grid w-full grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-xl px-1 py-1.5 text-left",
        selected && "bg-[var(--soft)]",
        highlighted && "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]",
      )}
      data-verse={number}
      onClick={(event) => onSelect(number, event.shiftKey)}
      type="button"
    >
      <span className={cn("pt-1 text-[length:var(--text-xs)] text-[var(--mute)]", highlighted && "text-[var(--accent)]")}>
        {number}
      </span>
      <span className="text-[length:var(--scripture)] leading-7" data-verse-anchor={number}>
        {pieces ? <DiffLine pieces={pieces} /> : text}
      </span>
    </button>
  );
}

export function VerseExtras({
  showPill,
  showNote,
  highlighted,
  quote,
  note,
  onHighlight,
  onNote,
  onReferences,
  onDiscuss,
  onSave,
}: {
  showPill: boolean;
  showNote: boolean;
  highlighted: boolean;
  quote: string;
  note: string;
  onHighlight: () => void;
  onNote: () => void;
  onReferences: () => void;
  onDiscuss: () => void;
  onSave: (content: string, type: "observation" | "interpretation" | "application") => Promise<void>;
}) {
  return (
    <div className="pl-11">
      <AnimatePresence>
        {showPill ? (
          <VersePill
            highlighted={highlighted}
            onDiscuss={onDiscuss}
            onHighlight={onHighlight}
            onNote={onNote}
            onReferences={onReferences}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {showNote ? <InlineNote initial={note} onSave={onSave} quote={quote} /> : null}
      </AnimatePresence>
    </div>
  );
}
