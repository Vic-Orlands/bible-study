"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { CanonRibbon } from "@/components/bible/canon-ribbon";
import { ChapterOpener } from "@/components/bible/chapter-opener";
import { CompareView } from "@/components/bible/compare-view";
import { PassagePicker } from "@/components/bible/passage-picker";
import { ReferencesPanel } from "@/components/bible/references-panel";
import { ScriptureColumn } from "@/components/bible/scripture-column";
import { ThreadWires } from "@/components/bible/thread-wires";
import { VersionMenu } from "@/components/bible/version-menu";
import { useScripture } from "@/components/bible/use-scripture";
import { useAppearance } from "@/components/appearance-provider";
import { ticksFromBooks, tickKey } from "@/lib/chapter-ticks";
import { identityArgs } from "@/lib/identity";
import { markChapterOpened, readOpenedChapters } from "@/lib/opened-chapters";
import { parseVerseReference } from "@/lib/bible-queries";
import { fetchCrossRefChapter } from "@/lib/study-data";
import { CrossReference } from "@/lib/scripture";
import { useStudyStore } from "@/lib/study-store";
import { cn } from "@/lib/utils";

export function BiblePage() {
  const router = useRouter();
  const { direction } = useAppearance();
  const frameRef = useRef<HTMLDivElement>(null);
  const scripture = useScripture();
  const identityId = useStudyStore((state) => state.identityId);
  const bookmarkQuery = useQuery(api.bookmarks.listForGuest, identityArgs(identityId));
  const noteQuery = useQuery(api.notes.listMine, identityArgs(identityId));
  const bookmarks = useMemo(() => bookmarkQuery ?? [], [bookmarkQuery]);
  const notes = useMemo(() => noteQuery ?? [], [noteQuery]);
  const toggleBookmark = useMutation(api.bookmarks.toggle);
  const addBookmarks = useMutation(api.bookmarks.addMany);
  const createNote = useMutation(api.notes.create);
  const [compare, setCompare] = useState(false);
  const [menu, setMenu] = useState<"primary" | "secondary" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [noteVerse, setNoteVerse] = useState<number | null>(null);
  const [referencesOpen, setReferencesOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);

  const ticks = useMemo(() => ticksFromBooks(scripture.books), [scripture.books]);
  const activeIndex = ticks.findIndex(
    (tick) => tick.book === scripture.passage.book && tick.chapter === scripture.passage.chapter,
  );
  const primary = scripture.columns[0];
  const secondary = scripture.columns[1];
  const highlighted = useMemo(() => {
    const verses = new Set<number>();
    for (const bookmark of bookmarks) {
      if (
        bookmark.passageBook === scripture.passage.book &&
        bookmark.passageChapter === scripture.passage.chapter
      ) {
        verses.add(bookmark.passageVerse);
      }
    }
    return verses;
  }, [bookmarks, scripture.passage.book, scripture.passage.chapter]);
  const noted = useMemo(() => {
    const keys = new Set<string>();
    for (const bookmark of bookmarks) keys.add(tickKey(bookmark.passageBook, bookmark.passageChapter));
    for (const note of notes) keys.add(tickKey(note.passageBook, note.passageChapter));
    return keys;
  }, [bookmarks, notes]);

  useEffect(() => {
    setOpened(readOpenedChapters());
  }, []);

  useEffect(() => {
    setOpened(markChapterOpened(scripture.passage.book, scripture.passage.chapter));
    setOpening(true);
    const timer = window.setTimeout(() => setOpening(false), 900);
    setSelected([]);
    setAnchor(null);
    setNoteVerse(null);
    return () => window.clearTimeout(timer);
  }, [scripture.passage.book, scripture.passage.chapter]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("book", scripture.passage.book);
    params.set("chapter", String(scripture.passage.chapter));
    params.set("verse", String(scripture.passage.verse));
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [scripture.passage]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const chapter = await fetchCrossRefChapter(scripture.passage.book, scripture.passage.chapter);
        if (!cancelled) setCrossRefs(chapter.references);
      } catch (error) {
        console.error("Failed to load cross references:", error);
        if (!cancelled) setCrossRefs([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [scripture.passage.book, scripture.passage.chapter]);

  useEffect(() => {
    const verse = scripture.passage.verse;
    if (!verse || !primary?.verses.length) return;
    const node = frameRef.current?.querySelector(`[data-verse="${verse}"]`);
    node?.scrollIntoView({ block: "center" });
  }, [primary?.verses.length, scripture.passage.verse, scripture.passage.chapter]);

  const openChapter = (book: string, chapter: number, verse = 1) => {
    scripture.setPassage({ book, chapter, verse });
  };

  const stepChapter = (delta: number) => {
    if (ticks.length === 0 || activeIndex < 0) return;
    const next = ticks[activeIndex + delta];
    if (next) openChapter(next.book, next.chapter, 1);
  };

  const selectVerse = (verse: number, shiftKey: boolean) => {
    if (shiftKey && anchor !== null) {
      const start = Math.min(anchor, verse);
      const end = Math.max(anchor, verse);
      setSelected(Array.from({ length: end - start + 1 }, (_, index) => start + index));
      return;
    }
    setAnchor(verse);
    setSelected([verse]);
    scripture.setPassage({ ...scripture.passage, verse });
    if (direction === "thread") setNoteVerse(verse);
  };

  const noteFor = (verse: number) =>
    notes.find(
      (note) =>
        note.passageBook === scripture.passage.book &&
        note.passageChapter === scripture.passage.chapter &&
        note.passageVerse === verse,
    )?.content ?? "";

  const highlight = async (verse: number) => {
    const verses = selected.length > 1 && selected.includes(verse) ? selected : [verse];
    try {
      if (verses.length > 1) {
        await addBookmarks({
          ...identityArgs(identityId),
          passageBook: scripture.passage.book,
          passageChapter: scripture.passage.chapter,
          passageVerses: verses,
        });
        toast.success("Highlighted");
        return;
      }
      await toggleBookmark({
        ...identityArgs(identityId),
        passageBook: scripture.passage.book,
        passageChapter: scripture.passage.chapter,
        passageVerse: verse,
      });
    } catch (error) {
      console.error("Failed to update highlight:", error);
      toast.error("Could not update highlight");
    }
  };

  const saveNote = async (
    verse: number,
    content: string,
    type: "observation" | "interpretation" | "application",
  ) => {
    try {
      await createNote({
        ...identityArgs(identityId),
        passageBook: scripture.passage.book,
        passageChapter: scripture.passage.chapter,
        passageVerse: verse,
        content,
        type,
      });
      toast.success("Note saved");
    } catch (error) {
      console.error("Failed to save note:", error);
      toast.error("Could not save note");
    }
  };

  const discuss = (verse: number) => {
    scripture.setPassage({ ...scripture.passage, verse });
    router.push("/groups");
  };

  const openReference = (target: string) => {
    const parsed = parseVerseReference(target, scripture.books);
    if (!parsed) {
      toast("Could not open that reference");
      return;
    }
    openChapter(parsed.book, parsed.chapter, parsed.verse);
    setReferencesOpen(false);
  };

  const chooseVersion = (versionId: string) => {
    const primaryId = scripture.visibleVersions[0];
    const secondaryId = scripture.visibleVersions[1];
    if (menu === "secondary") {
      if (!primaryId || primaryId === versionId) return;
      scripture.setVisibleVersions([primaryId, versionId]);
      setCompare(true);
      return;
    }
    scripture.setVisibleVersions(
      secondaryId && secondaryId !== versionId ? [versionId, secondaryId] : [versionId],
    );
  };

  const activeVerse = selected[selected.length - 1] ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="relative z-20 flex shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--sheet)] px-3 py-2 md:px-5">
        <button aria-label="Previous chapter" className="flex h-8 w-8 items-center justify-center" onClick={() => stepChapter(-1)} type="button">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <PassagePicker books={scripture.books} onChange={(passage) => openChapter(passage.book, passage.chapter, passage.verse)} passage={scripture.passage} />
        <button aria-label="Next chapter" className="flex h-8 w-8 items-center justify-center" onClick={() => stepChapter(1)} type="button">
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="text-[length:var(--text-xs)] font-medium"
            onClick={() => setMenu("primary")}
            type="button"
          >
            {primary?.abbreviation ?? "Version"}
          </button>
          {compare && secondary ? (
            <button
              className="text-[length:var(--text-xs)] font-medium text-[var(--accent)]"
              onClick={() => setMenu("secondary")}
              type="button"
            >
              {secondary.abbreviation}
            </button>
          ) : null}
          <button
            className={cn(
              "rounded-full border px-3 py-1 text-[length:var(--text-xs)]",
              compare ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)]",
            )}
            onClick={() => {
              if (compare) {
                setCompare(false);
                return;
              }
              setCompare(true);
              if (!secondary) setMenu("secondary");
            }}
            type="button"
          >
            Compare
          </button>
          <div className="relative">
            <VersionMenu
              activeIds={scripture.visibleVersions}
              error={scripture.versionsError}
              loading={scripture.versionsLoading}
              onChoose={chooseVersion}
              onClose={() => setMenu(null)}
              open={menu !== null}
              versions={scripture.versions}
            />
          </div>
        </div>
      </header>

      <div className="reader-scroll app-scroll relative min-h-0 flex-1 overflow-y-auto">
        <ChapterOpener book={scripture.passage.book} chapter={scripture.passage.chapter} open={opening} />
        <div className="reader-frame reader-split relative px-4 py-8 md:px-6" ref={frameRef}>
          <div>
            <p className="text-[length:var(--text-xl)] font-medium tracking-tight">{scripture.passage.book}</p>
            <p className="mb-6 text-[length:var(--text-lg)] text-[var(--mute)]">{scripture.passage.chapter}</p>
            {scripture.versionsError || scripture.booksError ? (
              <p className="text-[length:var(--text-sm)] text-[var(--accent)]">
                {scripture.versionsError ?? scripture.booksError}
              </p>
            ) : null}
            {compare && primary && secondary ? (
              <CompareView
                highlighted={highlighted}
                noteDraft={activeVerse ? noteFor(activeVerse) : ""}
                noteVerse={noteVerse}
                onDiscuss={discuss}
                onHighlight={(verse) => void highlight(verse)}
                onNote={setNoteVerse}
                onReferences={(verse) => {
                  selectVerse(verse, false);
                  setReferencesOpen(true);
                }}
                onSaveNote={saveNote}
                onSelect={selectVerse}
                primary={primary}
                secondary={secondary}
                selected={selected}
              />
            ) : (
              <ScriptureColumn
                error={primary?.error ?? null}
                highlighted={highlighted}
                loading={Boolean(primary?.loading || scripture.versionsLoading)}
                noteDraft={activeVerse ? noteFor(activeVerse) : ""}
                noteVerse={noteVerse}
                onDiscuss={discuss}
                onHighlight={(verse) => void highlight(verse)}
                onNote={(verse) => setNoteVerse(verse)}
                onReferences={(verse) => {
                  selectVerse(verse, false);
                  setReferencesOpen(true);
                }}
                onSaveNote={saveNote}
                onSelect={selectVerse}
                selected={selected}
                verses={primary?.verses ?? []}
              />
            )}
            <div className="lg:hidden">
              <ThreadWires
                onOpen={openReference}
                references={crossRefs}
                rootRef={frameRef}
                sourceBook={scripture.passage.book}
                verse={direction === "thread" ? activeVerse : null}
              />
            </div>
          </div>
          <div className="thread-only relative hidden lg:block">
            <ThreadWires
              overlay
              onOpen={openReference}
              references={crossRefs}
              rootRef={frameRef}
              sourceBook={scripture.passage.book}
              verse={activeVerse}
            />
          </div>
        </div>
      </div>

      <div className="canon-only">
        <CanonRibbon
          activeBook={scripture.passage.book}
          activeChapter={scripture.passage.chapter}
          noted={noted}
          onOpen={(tick) => openChapter(tick.book, tick.chapter, 1)}
          opened={opened}
          ticks={ticks}
        />
      </div>

      <ReferencesPanel
        book={scripture.passage.book}
        chapter={scripture.passage.chapter}
        onClose={() => setReferencesOpen(false)}
        onOpen={openReference}
        open={referencesOpen}
        verse={activeVerse}
      />
    </div>
  );
}
