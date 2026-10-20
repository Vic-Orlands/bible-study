"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  getBookId,
  parseVerseReference,
  useBibleBooks,
  useBibleChapters,
} from "@/lib/bible-queries";
import { identityArgs } from "@/lib/identity";
import { spring } from "@/lib/motion";
import { useStudyStore } from "@/lib/study-store";

export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const passage = useStudyStore((state) => state.selectedPassage);
  const visibleVersions = useStudyStore((state) => state.visibleVersions);
  const setPassage = useStudyStore((state) => state.setPassage);
  const identityId = useStudyStore((state) => state.identityId);
  const { data: books = [] } = useBibleBooks();
  const noteQuery = useQuery(api.notes.listMine, identityArgs(identityId));
  const bookmarkQuery = useQuery(api.bookmarks.listForGuest, identityArgs(identityId));
  const notes = useMemo(() => noteQuery ?? [], [noteQuery]);
  const bookmarks = useMemo(() => bookmarkQuery ?? [], [bookmarkQuery]);
  const bookId = getBookId(books, passage.book);
  const chapterQueries = useBibleChapters(
    visibleVersions.slice(0, 1),
    bookId,
    passage.chapter,
  );
  const verses = useMemo(
    () => chapterQueries[0]?.data?.verses ?? [],
    [chapterQueries],
  );

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const reference = useMemo(
    () => (query.trim() ? parseVerseReference(query, books) : null),
    [books, query],
  );

  const verseHits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2 || reference) return [];
    return verses
      .filter((verse) => verse.text.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [query, reference, verses]);

  const noteHits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return notes
      .filter((note) => note.content.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [notes, query]);

  const bookmarkHits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return bookmarks
      .filter((bookmark) =>
        `${bookmark.passageBook} ${bookmark.passageChapter}`.toLowerCase().includes(needle),
      )
      .slice(0, 6);
  }, [bookmarks, query]);

  const openPassage = (book: string, chapter: number, verse: number) => {
    setPassage({ book, chapter, verse });
    router.push("/study");
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            aria-label="Close search"
            className="fixed inset-0 z-40 bg-[var(--ink)]/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            type="button"
          />
          <motion.div
            className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-xl px-3 pt-16"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
          >
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--sheet)] shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
              <input
                autoFocus
                className="w-full bg-transparent px-4 py-3 text-[length:var(--text-md)] outline-none placeholder:text-[var(--mute)]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a reference, note, or this chapter"
                value={query}
              />
              <div className="app-scroll max-h-80 overflow-y-auto border-t border-[var(--line)]">
                {reference ? (
                  <button
                    className="block w-full px-4 py-3 text-left text-[length:var(--text-sm)] hover:bg-[var(--soft)]"
                    onClick={() => openPassage(reference.book, reference.chapter, reference.verse)}
                    type="button"
                  >
                    Open {reference.book} {reference.chapter}:{reference.verse}
                  </button>
                ) : null}
                {verseHits.map((verse) => (
                  <button
                    className="block w-full px-4 py-3 text-left hover:bg-[var(--soft)]"
                    key={verse.number}
                    onClick={() => openPassage(passage.book, passage.chapter, verse.number)}
                    type="button"
                  >
                    <span className="text-[length:var(--text-xs)] text-[var(--mute)]">
                      {passage.book} {passage.chapter}:{verse.number}
                    </span>
                    <span className="mt-1 block text-[length:var(--text-sm)]">{verse.text}</span>
                  </button>
                ))}
                {noteHits.map((note) => (
                  <button
                    className="block w-full px-4 py-3 text-left hover:bg-[var(--soft)]"
                    key={note._id}
                    onClick={() => {
                      setPassage({
                        book: note.passageBook,
                        chapter: note.passageChapter,
                        verse: note.passageVerse ?? 1,
                      });
                      router.push("/notes");
                      onClose();
                    }}
                    type="button"
                  >
                    <span className="text-[length:var(--text-xs)] text-[var(--mute)]">
                      Note · {note.passageBook} {note.passageChapter}
                      {note.passageVerse ? `:${note.passageVerse}` : ""}
                    </span>
                    <span className="mt-1 block text-[length:var(--text-sm)]">{note.content}</span>
                  </button>
                ))}
                {bookmarkHits.map((bookmark) => (
                  <button
                    className="block w-full px-4 py-3 text-left text-[length:var(--text-sm)] hover:bg-[var(--soft)]"
                    key={bookmark._id}
                    onClick={() =>
                      openPassage(
                        bookmark.passageBook,
                        bookmark.passageChapter,
                        bookmark.passageVerse,
                      )
                    }
                    type="button"
                  >
                    Highlight · {bookmark.passageBook} {bookmark.passageChapter}:{bookmark.passageVerse}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
