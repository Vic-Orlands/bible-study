"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BibleVersion } from "@/lib/scripture";
import { spring } from "@/lib/motion";

export function VersionMenu({
  open,
  versions,
  activeIds,
  loading,
  error,
  onClose,
  onChoose,
}: {
  open: boolean;
  versions: BibleVersion[];
  activeIds: string[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onChoose: (versionId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...versions]
      .sort((left, right) => left.title.localeCompare(right.title))
      .filter(
        (version) =>
          version.abbreviation.toLowerCase().includes(needle) ||
          version.title.toLowerCase().includes(needle),
      );
  }, [query, versions]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-64 rounded-2xl border border-[var(--line)] bg-[var(--sheet)] p-2"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={spring}
        >
          <input
            autoFocus
            className="mb-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[length:var(--text-xs)] outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search translations"
            value={query}
          />
          <div className="app-scroll max-h-64 overflow-y-auto">
            {matches.map((version) => {
              const active = activeIds.includes(version.id);
              return (
                <button
                  className="flex w-full items-center justify-between px-2 py-2 text-left hover:bg-[var(--soft)] disabled:opacity-40"
                  disabled={active}
                  key={version.id}
                  onClick={() => {
                    onChoose(version.id);
                    onClose();
                    setQuery("");
                  }}
                  type="button"
                >
                  <span>
                    <span className="block text-[length:var(--text-sm)] font-medium">
                      {version.abbreviation}
                    </span>
                    <span className="block text-[length:var(--text-xs)] text-[var(--mute)]">
                      {version.title}
                    </span>
                  </span>
                  {active ? (
                    <span className="text-[length:var(--text-xs)] text-[var(--accent)]">On</span>
                  ) : null}
                </button>
              );
            })}
            {loading ? (
              <p className="px-2 py-2 text-[length:var(--text-xs)] text-[var(--mute)]">
                Loading translations
              </p>
            ) : null}
            {error ? (
              <p className="px-2 py-2 text-[length:var(--text-xs)] text-[var(--accent)]">{error}</p>
            ) : null}
            {!loading && matches.length === 0 ? (
              <p className="px-2 py-2 text-[length:var(--text-xs)] text-[var(--mute)]">
                No translations found
              </p>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
