"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export function ChapterOpener({
  book,
  chapter,
  open,
}: {
  book: string;
  chapter: number;
  open: boolean;
}) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex items-end bg-[var(--paper)] px-6 pb-16"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[length:var(--text-xl)] font-medium tracking-tight">{book}</p>
            <p className="text-[length:var(--text-lg)] text-[var(--mute)]">{chapter}</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
