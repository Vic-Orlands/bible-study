"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchBibleChapterForVersion, BibleVersion } from "@/lib/scripture";
import { PlanEntry } from "@/components/today/use-plans";

export function PlanReader({
  entry,
  versionId,
  versions,
  reflection,
  onReflection,
  onVersion,
  onSave,
  onToggle,
  onClose,
}: {
  entry: PlanEntry;
  versionId: string;
  versions: BibleVersion[];
  reflection: string;
  onReflection: (value: string) => void;
  onVersion: (versionId: string) => void;
  onSave: () => void;
  onToggle: () => void;
  onClose: () => void;
}) {
  const version = versions.find((item) => item.id === versionId);
  const chapter = useQuery({
    queryKey: ["plan-chapter", versionId, entry.passageBook, entry.passageChapter],
    queryFn: async () => {
      try {
        return await fetchBibleChapterForVersion(versionId, entry.passageBook, entry.passageChapter);
      } catch (error) {
        console.error("Failed to load plan chapter:", error);
        throw error;
      }
    },
    enabled: Boolean(versionId),
  });

  return (
    <aside className="flex h-full w-full max-w-xl flex-col border-l border-[var(--line)] bg-[var(--sheet)]">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <div>
          <p className="text-[length:var(--text-lg)] font-medium">{entry.passageLabel}</p>
          <p className="text-[length:var(--text-xs)] text-[var(--mute)]">
            Day {entry.dayNumber}
            {version ? ` · ${version.abbreviation}` : ""}
          </p>
        </div>
        <button className="text-[length:var(--text-sm)] text-[var(--mute)]" onClick={onClose} type="button">
          Close
        </button>
      </header>
      <div className="app-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <label className="block text-[length:var(--text-xs)] text-[var(--mute)]">
          Translation
          <select
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-transparent px-2 py-2 text-[length:var(--text-sm)] text-[var(--ink)]"
            onChange={(event) => onVersion(event.target.value)}
            value={versionId}
          >
            {versions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.abbreviation}
              </option>
            ))}
          </select>
        </label>
        {chapter.isLoading ? (
          <p className="text-[length:var(--text-sm)] text-[var(--mute)]">Loading reading</p>
        ) : null}
        {chapter.error ? (
          <p className="text-[length:var(--text-sm)] text-[var(--accent)]">Unable to load this reading.</p>
        ) : null}
        {chapter.data?.verses.map((verse) => (
          <p className="text-[length:var(--scripture)] leading-7" key={verse.number}>
            <span className="mr-2 text-[length:var(--text-xs)] text-[var(--mute)]">{verse.number}</span>
            {verse.text}
          </p>
        ))}
        <textarea
          className="min-h-28 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-[length:var(--text-sm)] outline-none"
          onChange={(event) => onReflection(event.target.value)}
          placeholder="Journal"
          value={reflection}
        />
      </div>
      <footer className="flex gap-2 border-t border-[var(--line)] px-4 py-3">
        <button className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[length:var(--text-xs)]" onClick={onSave} type="button">
          Save journal
        </button>
        <button className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-[length:var(--text-xs)] font-medium text-[var(--accent-ink)]" onClick={onToggle} type="button">
          {entry.status === "completed" ? "Mark unread" : "Mark complete"}
        </button>
      </footer>
    </aside>
  );
}

export function useReflectionDraft(entry: PlanEntry | null) {
  const [reflection, setReflection] = useState(entry?.reflection ?? "");
  useEffect(() => {
    setReflection(entry?.reflection ?? "");
  }, [entry?._id, entry?.reflection]);
  return [reflection, setReflection] as const;
}
