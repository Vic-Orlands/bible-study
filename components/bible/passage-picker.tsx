"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BibleBookIndex } from "@/lib/scripture";
import { PassageSelection } from "@/lib/study-store";
import { spring } from "@/lib/motion";

export function PassagePicker({
  books,
  passage,
  onChange,
}: {
  books: BibleBookIndex[];
  passage: PassageSelection;
  onChange: (passage: PassageSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [bookName, setBookName] = useState(passage.book);
  const book = useMemo(
    () => books.find((item) => item.book === bookName) ?? books.find((item) => item.book === passage.book),
    [bookName, books, passage.book],
  );

  return (
    <div className="relative">
      <button
        className="rounded-full px-2 py-1 text-[length:var(--text-sm)] font-medium"
        onClick={() => {
          setBookName(passage.book);
          setOpen((value) => !value);
        }}
        type="button"
      >
        {passage.book} {passage.chapter}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="absolute left-0 top-[calc(100%+8px)] z-30 flex w-[22rem] max-w-[80vw] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--sheet)]"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={spring}
          >
            <div className="app-scroll max-h-72 w-1/2 overflow-y-auto border-r border-[var(--line)]">
              {books.map((item) => (
                <button
                  className="block w-full px-3 py-2 text-left text-[length:var(--text-sm)] hover:bg-[var(--soft)]"
                  key={item.id}
                  onClick={() => setBookName(item.book)}
                  type="button"
                >
                  {item.book}
                </button>
              ))}
            </div>
            <div className="app-scroll max-h-72 w-1/2 overflow-y-auto">
              {(book?.chapters ?? []).map((chapter) => (
                <button
                  className="block w-full px-3 py-2 text-left text-[length:var(--text-sm)] hover:bg-[var(--soft)]"
                  key={chapter.chapter}
                  onClick={() => {
                    onChange({ book: book?.book ?? passage.book, chapter: chapter.chapter, verse: 1 });
                    setOpen(false);
                  }}
                  type="button"
                >
                  {chapter.chapter}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
