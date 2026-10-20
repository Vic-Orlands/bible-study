"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "@/components/shell/app-shell";
import { AudioRecorder } from "@/components/notes/audio-recorder";
import { identityArgs } from "@/lib/identity";
import { useStudyStore } from "@/lib/study-store";
import { cn } from "@/lib/utils";

export default function NotesPage() {
  const router = useRouter();
  const identityId = useStudyStore((state) => state.identityId);
  const passage = useStudyStore((state) => state.selectedPassage);
  const setPassage = useStudyStore((state) => state.setPassage);
  const noteQuery = useQuery(api.notes.listMine, identityArgs(identityId));
  const bookmarkQuery = useQuery(api.bookmarks.listForGuest, identityArgs(identityId));
  const notes = useMemo(() => noteQuery ?? [], [noteQuery]);
  const bookmarks = useMemo(() => bookmarkQuery ?? [], [bookmarkQuery]);
  const updateNote = useMutation(api.notes.update);
  const removeNote = useMutation(api.notes.remove);
  const removeBookmarks = useMutation(api.bookmarks.removeMany);
  const [scope, setScope] = useState<"chapter" | "all">("chapter");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const visibleNotes = useMemo(
    () =>
      scope === "all"
        ? notes
        : notes.filter(
            (note) =>
              note.passageBook === passage.book && note.passageChapter === passage.chapter,
          ),
    [notes, passage.book, passage.chapter, scope],
  );
  const visibleBookmarks = useMemo(
    () =>
      scope === "all"
        ? bookmarks
        : bookmarks.filter(
            (bookmark) =>
              bookmark.passageBook === passage.book &&
              bookmark.passageChapter === passage.chapter,
          ),
    [bookmarks, passage.book, passage.chapter, scope],
  );

  const openPassage = (book: string, chapter: number, verse: number) => {
    setPassage({ book, chapter, verse });
    router.push("/study");
  };

  return (
    <AppShell>
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
          <header className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-[length:var(--text-xl)] font-medium">Notes</h1>
              <p className="text-[length:var(--text-sm)] text-[var(--mute)]">
                {passage.book} {passage.chapter}
              </p>
            </div>
            <div className="flex rounded-full border border-[var(--line)] p-1">
              {(["chapter", "all"] as const).map((item) => (
                <button
                  className={cn(
                    "rounded-full px-3 py-1 text-[length:var(--text-xs)]",
                    scope === item ? "bg-[var(--soft)]" : "text-[var(--mute)]",
                  )}
                  key={item}
                  onClick={() => setScope(item)}
                  type="button"
                >
                  {item === "chapter" ? "This chapter" : "All"}
                </button>
              ))}
            </div>
          </header>

          <section className="space-y-3">
            <h2 className="text-[length:var(--text-lg)] font-medium">Highlights</h2>
            {visibleBookmarks.length === 0 ? (
              <p className="text-[length:var(--text-sm)] text-[var(--mute)]">No highlights yet.</p>
            ) : (
              visibleBookmarks.map((bookmark) => (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] px-3 py-3" key={bookmark._id}>
                  <button
                    className="text-left text-[length:var(--text-sm)]"
                    onClick={() =>
                      openPassage(bookmark.passageBook, bookmark.passageChapter, bookmark.passageVerse)
                    }
                    type="button"
                  >
                    {bookmark.passageBook} {bookmark.passageChapter}:{bookmark.passageVerse}
                  </button>
                  <button
                    className="text-[length:var(--text-xs)] text-[var(--mute)]"
                    onClick={() => {
                      void removeBookmarks({
                        ...identityArgs(identityId),
                        passageBook: bookmark.passageBook,
                        passageChapter: bookmark.passageChapter,
                        passageVerses: [bookmark.passageVerse],
                      }).catch((error) => {
                        console.error(error);
                        toast.error("Could not remove highlight");
                      });
                    }}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-[length:var(--text-lg)] font-medium">Written</h2>
            {visibleNotes.length === 0 ? (
              <p className="text-[length:var(--text-sm)] text-[var(--mute)]">No notes yet.</p>
            ) : (
              visibleNotes.map((note) => (
                <article className="rounded-2xl border border-[var(--line)] bg-[var(--sheet)] p-3" key={note._id}>
                  <button
                    className="text-[length:var(--text-xs)] text-[var(--accent)]"
                    onClick={() =>
                      openPassage(note.passageBook, note.passageChapter, note.passageVerse ?? 1)
                    }
                    type="button"
                  >
                    {note.passageBook} {note.passageChapter}
                    {note.passageVerse ? `:${note.passageVerse}` : ""} · {note.type}
                  </button>
                  <textarea
                    className="mt-2 w-full resize-none bg-transparent text-[length:var(--text-sm)] leading-6 outline-none"
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [note._id]: event.target.value }))
                    }
                    value={drafts[note._id] ?? note.content}
                  />
                  <div className="mt-2 flex gap-3 text-[length:var(--text-xs)] text-[var(--mute)]">
                    <button
                      onClick={() => {
                        void updateNote({
                          id: note._id as Id<"notes">,
                          ...identityArgs(identityId),
                          content: drafts[note._id] ?? note.content,
                        }).catch((error) => {
                          console.error(error);
                          toast.error("Could not update note");
                        });
                      }}
                      type="button"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        void removeNote({
                          id: note._id as Id<"notes">,
                          ...identityArgs(identityId),
                        }).catch((error) => {
                          console.error(error);
                          toast.error("Could not delete note");
                        });
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>

          <AudioRecorder passage={passage} />
        </div>
      </div>
    </AppShell>
  );
}
