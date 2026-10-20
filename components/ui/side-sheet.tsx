"use client";

import { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { spring } from "@/lib/motion";

export function SideSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            aria-label="Close"
            className="fixed inset-0 z-40 bg-[var(--ink)]/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            type="button"
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--line)] bg-[var(--sheet)]"
            initial={{ x: 28, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 28, opacity: 0 }}
            transition={spring}
          >
            <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <h2 className="text-[length:var(--text-lg)] font-medium">{title}</h2>
              <button
                aria-label="Close panel"
                className="flex h-8 w-8 items-center justify-center text-[var(--mute)]"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="app-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
