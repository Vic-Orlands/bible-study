"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { CanonView } from "@/components/bible/canon-view";
import { ThreadView } from "@/components/bible/thread-view";
import { useScripture } from "@/components/bible/use-scripture";
import { useAppearance } from "@/components/appearance-provider";
import { metaFor } from "@/lib/book-meta";
import { ticksFromBooks, tickKey } from "@/lib/chapter-ticks";
import { identityArgs } from "@/lib/identity";
import { markChapterOpened, readOpenedChapters } from "@/lib/opened-chapters";
import { parseVerseReference } from "@/lib/bible-queries";
import { fetchCrossRefChapter } from "@/lib/study-data";
import { CrossReference } from "@/lib/scripture";
import { useStudyStore } from "@/lib/study-store";

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
  const currentPlan = useQuery(api.readingPlans.current, identityId ? identityArgs(identityId) : "skip");
  const [compare, setCompare] = useState(false);
  const [menu, setMenu] = useState<"primary" | "secondary" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [noteVerse, setNoteVerse] = useState<number | null>(null);
  const [opening, setOpening] = useState(false);
  const [holdOpener, setHoldOpener] = useState(false);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);

  const ticks = useMemo(() => ticksFromBooks(scripture.books), [scripture.books]);
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
    setHoldOpener(new URLSearchParams(window.location.search).get("screen") === "opener");
  }, []);

  useEffect(() => {
    setOpened(markChapterOpened(scripture.passage.book, scripture.passage.chapter));
    setSelected([]);
    setAnchor(null);
    setNoteVerse(null);
    const hold = new URLSearchParams(window.location.search).get("screen") === "opener";
    setOpening(true);
    if (hold) return;
    const timer = window.setTimeout(() => setOpening(false), 700);
    return () => window.clearTimeout(timer);
  }, [scripture.passage.book, scripture.passage.chapter]);

  useEffect(() => {
    if (window.location.pathname !== "/study") return;
    const params = new URLSearchParams(window.location.search);
    params.set("book", scripture.passage.book);
    params.set("chapter", String(scripture.passage.chapter));
    params.set("verse", String(scripture.passage.verse));
    const next = `/study?${params.toString()}`;
    if (`${window.location.pathname}${window.location.search}` === next) return;
    window.history.replaceState(window.history.state, "", next);
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
    node?.scrollIntoView({ block: "nearest" });
  }, [primary?.verses.length, scripture.passage.verse, scripture.passage.chapter]);

  const openChapter = (book: string, chapter: number, verse = 1) => {
    scripture.setPassage({ book, chapter, verse });
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
    router.push(`/groups?book=${encodeURIComponent(scripture.passage.book)}&chapter=${scripture.passage.chapter}&verse=${verse}`);
  };

  const openReference = (target: string) => {
    const parsed = parseVerseReference(target, scripture.books);
    if (!parsed) {
      toast("Could not open that reference");
      return;
    }
    openChapter(parsed.book, parsed.chapter, parsed.verse);
  };

  const chooseVersion = (versionId: string, side: "primary" | "secondary") => {
    const primaryId = scripture.visibleVersions[0];
    const secondaryId = scripture.visibleVersions[1];
    if (side === "secondary") {
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
  const planLabel = currentPlan?.currentEntry
    ? `Day ${currentPlan.currentEntry.dayNumber} of ${currentPlan.plan.totalEntries}`
    : null;
  const shared = {
    rootRef: frameRef,
    book: scripture.passage.book,
    chapter: scripture.passage.chapter,
    primary,
    secondary,
    versions: scripture.versions.map((version) => ({
      id: version.id,
      abbreviation: version.abbreviation,
      title: version.title,
    })),
    compare,
    selected,
    highlighted,
    noteVerse,
    noteDraft: activeVerse ? noteFor(activeVerse) : "",
    crossRefs,
    planLabel,
    menu,
    onSelect: selectVerse,
    onHighlight: (verse: number) => void highlight(verse),
    onNote: setNoteVerse,
    onSaveNote: saveNote,
    onDiscuss: discuss,
    onOpenReference: openReference,
    onCompare: (on: boolean) => {
      setCompare(on);
      if (on && !secondary) setMenu("secondary");
      if (!on) setMenu(null);
    },
    onChooseVersion: (id: string, side: "primary" | "secondary") => {
      chooseVersion(id, side);
      setMenu(null);
    },
    onSwap: () => {
      const primaryId = scripture.visibleVersions[0];
      const secondaryId = scripture.visibleVersions[1];
      if (!primaryId || !secondaryId) return;
      scripture.setVisibleVersions([secondaryId, primaryId]);
    },
    onMenu: setMenu,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {direction === "thread" ? (
        <ThreadView {...shared} />
      ) : (
        <CanonView
          {...shared}
          noted={noted}
          onClearSelection={() => {
            setSelected([]);
            setAnchor(null);
            setNoteVerse(null);
          }}
          onOpenChapter={(nextBook, nextChapter) => openChapter(nextBook, nextChapter, 1)}
          opened={opened}
          opening={opening || holdOpener}
          ticks={ticks}
          versesInBook={metaFor(scripture.passage.book).chapters}
        />
      )}
    </div>
  );
}
