"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle,
  Download,
  Heart,
  Link2,
  List,
  MessageCircle,
  Mic,
  Play,
  Search,
  SendHorizontal,
  Share2,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { ProductShell } from "@/components/product-shell";
import { Toaster } from "@/components/ui/sonner";
import { type BibleVerse } from "@/lib/helloao";
import {
  useBibleBooks,
  useBibleChapters,
  useAllChapterVerses,
  useVerseCount,
  translations,
  formatPassage,
  formatReference,
  chapterKeyFor,
  getBookId,
  parseVerseReference,
  type BibleBookIndex,
} from "@/lib/bible-queries";
import {
  useStudyStore,
  type PassageSelection,
  type RightTab,
} from "@/lib/study-store";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { MagnifyingGlassIcon } from "@/components/ui/magnifying-glass";
import { RichScriptureText } from "@/components/rich-scripture-text";

type SearchHit = {
  book: string;
  chapter: number;
  label: string;
  verse: number;
  text: string;
};

const waveform = [
  8, 12, 18, 24, 16, 28, 20, 14, 26, 18, 12, 22, 30, 16, 10, 24, 20, 14, 28, 18,
  12, 16, 24, 20, 14, 10, 18, 26, 12, 22, 16, 28, 20, 14, 8, 18, 24, 16, 12, 26,
  20, 14, 10, 22, 18, 28, 16, 12, 20, 24,
];

const activityItems = [
  {
    title: "42 readers opened Genesis 1:1 today",
    meta: "Reading activity",
    level: 0,
  },
  {
    title: "Grace M. commented on the creation account",
    meta: "Comment",
    level: 1,
  },
  {
    title: "Genesis 1:1 became the most discussed verse",
    meta: "Trend",
    level: 1,
  },
  { title: "7 personal notes were added", meta: "Study notes", level: 0 },
  { title: "3 audio reflections were recorded", meta: "Audio", level: 1 },
  {
    title: "12 members compared KJV, ASV, and BSB",
    meta: "Translations",
    level: 1,
  },
];

const panelVariants = {
  animate: (side: "left" | "right") => ({
    opacity: 1,
    width: side === "left" ? 268 : 360,
    x: 0,
  }),
  exit: (side: "left" | "right") => ({
    opacity: 0,
    width: 0,
    x: side === "left" ? -34 : 34,
  }),
  initial: (side: "left" | "right") => ({
    opacity: 0,
    width: 0,
    x: side === "left" ? -34 : 34,
  }),
};

const panelTransition = {
  duration: 0.28,
  ease: [0.645, 0.045, 0.355, 1],
} as const;

const fadeMotion = {
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  initial: { opacity: 0, y: 6 },
  transition: { duration: 0.16, ease: [0.215, 0.61, 0.355, 1] },
} as const;

function useOutsideClick<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose, open]);

  return ref;
}

export default function BibleApp() {
  const {
    data: bibleBooks = [],
    error: booksQueryError,
    isLoading: bibleBooksLoading,
  } = useBibleBooks();
  const bibleBooksError = booksQueryError
    ? "Unable to load the Bible index."
    : null;

  const selectedPassage = useStudyStore((s) => s.selectedPassage);
  const visibleVersions = useStudyStore((s) => s.visibleVersions);
  const sidebars = useStudyStore((s) => s.sidebars);
  const rightTab = useStudyStore((s) => s.rightTab);
  const commentTarget = useStudyStore((s) => s.commentTarget);
  const setPassage = useStudyStore((s) => s.setPassage);
  const setVisibleVersions = useStudyStore((s) => s.setVisibleVersions);
  const patchSidebars = useStudyStore((s) => s.patchSidebars);
  const setRightTab = useStudyStore((s) => s.setRightTab);
  const setCommentTarget = useStudyStore((s) => s.setCommentTarget);
  const setVersePrefill = useStudyStore((s) => s.setVersePrefill);

  const [storeReady, setStoreReady] = useState(false);

  useEffect(() => {
    setStoreReady(true);
  }, []);

  const { leftOpen, rightOpen } = sidebars;
  const guestId = useStudyStore((s) => s.guestId);
  const highlightedVerse = useStudyStore((s) => s.highlightedVerse);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sheetView, setSheetView] = useState<
    "bookmarks" | "settings" | "profile" | "login"
  >("bookmarks");
  const toggleBookmark = useMutation(api.bookmarks.toggle);
  const bookmarks = useQuery(api.bookmarks.listForGuest, { guestId }) || [];

  const bookId = useMemo(
    () => getBookId(bibleBooks, selectedPassage.book),
    [bibleBooks, selectedPassage.book],
  );

  const chapterQueries = useBibleChapters(
    visibleVersions,
    bookId,
    selectedPassage.chapter,
  );

  const [searchActive, setSearchActive] = useState(false);

  const allChapterQueries = useAllChapterVerses(
    bookId,
    selectedPassage.chapter,
    searchActive,
  );

  const allChapterVerses = useMemo(() => {
    const map: Record<string, BibleVerse[]> = {};
    for (const q of allChapterQueries) {
      if (q.data) map[q.data.label] = q.data.verses;
    }
    return map;
  }, [allChapterQueries]);

  const chapterVerses = useMemo(() => {
    const map: Record<string, BibleVerse[]> = {};
    for (const q of chapterQueries) {
      if (q.data) map[q.data.label] = q.data.verses;
    }
    return map;
  }, [chapterQueries]);

  const chapterErrors = useMemo(() => {
    const map: Record<string, string> = {};
    chapterQueries.forEach((q, i) => {
      if (q.error)
        map[visibleVersions[i]] = "Unable to load this translation right now.";
    });
    return map;
  }, [chapterQueries, visibleVersions]);

  const chapterLoading = chapterQueries.some((q) => q.isLoading);

  const showToast = useCallback((title: string, description?: string) => {
    toast(title, {
      description,
      icon: <span className="mt-1 flex h-2 w-2 shrink-0 bg-[#f6823c]" />,
    });
  }, []);

  const handlePassageChange = useCallback(
    (selection: PassageSelection) => {
      setPassage(selection);
      showToast(`Opened ${formatReference(selection)}`);
    },
    [setPassage, showToast],
  );

  const handleVerseComment = useCallback(
    (target: string) => {
      const parts = target.split(" ");
      const passage = parts.slice(1).join(" ");
      setVersePrefill(passage);
      setCommentTarget(target);
      if (rightTab !== "Study" && rightTab !== "Notes") {
        setRightTab("Notes");
      }
      patchSidebars({ rightOpen: true });
    },
    [setCommentTarget, setRightTab, patchSidebars, rightTab, setVersePrefill],
  );

  return (
    <ProductShell
      onOpenNotifications={() => {
        setSheetView("profile");
        setNotificationsOpen(true);
      }}
      onOpenSettings={() => {
        setSheetView("settings");
        setNotificationsOpen(true);
      }}
      onOpenBookmarks={() => {
        setSheetView("bookmarks");
        setBookmarksOpen(true);
      }}
    >
      <div className="flex flex-1 overflow-hidden bg-white">
        {!storeReady ? (
          <div className="min-w-0 flex-1 bg-white" />
        ) : (
          <>
            <AnimatePresence initial={false}>
              {leftOpen && (
                <LeftPanel
                  allChapterVerses={allChapterVerses}
                  bibleBooks={bibleBooks}
                  bibleBooksError={bibleBooksError}
                  bibleBooksLoading={bibleBooksLoading}
                  chapterVerses={chapterVerses}
                  selectedPassage={selectedPassage}
                  visibleVersions={visibleVersions}
                  onCollapse={() => patchSidebars({ leftOpen: false })}
                  onOpenBookmarks={() => {
                    setSheetView("bookmarks");
                    setBookmarksOpen(true);
                  }}
                  onPassageChange={handlePassageChange}
                  onSearchActive={setSearchActive}
                />
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {!leftOpen && (
                <RailOpenHandle
                  side="left"
                  onClick={() => patchSidebars({ leftOpen: true })}
                />
              )}
            </AnimatePresence>
            <Reader
              bibleBooks={bibleBooks}
              bibleBooksError={bibleBooksError}
              bibleBooksLoading={bibleBooksLoading}
              chapterErrors={chapterErrors}
              chapterLoading={chapterLoading}
              chapterVerses={chapterVerses}
              selectedPassage={selectedPassage}
              visibleVersions={visibleVersions}
              isBookmarked={bookmarks.some(
                (b) =>
                  b.passageBook === selectedPassage.book &&
                  b.passageChapter === selectedPassage.chapter &&
                  b.passageVerse === (highlightedVerse ? parseInt(highlightedVerse.split("-").pop()!) : selectedPassage.verse),
              )}
              onBookmark={async () => {
                const verseToBookmark = highlightedVerse
                  ? parseInt(highlightedVerse.split("-").pop()!)
                  : selectedPassage.verse;
                const added = await toggleBookmark({
                  guestId,
                  passageBook: selectedPassage.book,
                  passageChapter: selectedPassage.chapter,
                  passageVerse: verseToBookmark,
                });
                showToast(
                  added
                    ? `Bookmarked ${selectedPassage.book} ${selectedPassage.chapter}:${verseToBookmark}`
                    : `Removed bookmark for ${selectedPassage.book} ${selectedPassage.chapter}:${verseToBookmark}`,
                );
              }}
              onPassageChange={handlePassageChange}
              onToast={showToast}
              onVerseComment={handleVerseComment}
              onVersionsChange={setVisibleVersions}
            />
            <AnimatePresence initial={false}>
              {rightOpen && (
                <RightPanel
                  commentTarget={commentTarget}
                  selectedPassage={selectedPassage}
                  tab={rightTab}
                  onCollapse={() => patchSidebars({ rightOpen: false })}
                  onTabChange={setRightTab}
                />
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {!rightOpen && (
                <RailOpenHandle
                  side="right"
                  onClick={() => patchSidebars({ rightOpen: true })}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      <Toaster />

      <BottomSheet
        isOpen={bookmarksOpen || notificationsOpen}
        onClose={() => {
          setBookmarksOpen(false);
          setNotificationsOpen(false);
          setDeletingId(null);
        }}
        title={
          sheetView === "bookmarks"
            ? "My Bookmarks"
            : sheetView === "settings"
              ? "Settings"
              : sheetView === "profile"
                ? "My Profile"
                : "Welcome"
        }
      >
        {sheetView === "bookmarks" && (
          <div className="flex flex-col gap-2">
            {bookmarks.length === 0 ? (
              <p className="text-[13px] text-[#7a6758] p-4 text-center">
                No bookmarks yet.
              </p>
            ) : (
              bookmarks.map((b) => (
                <div
                  key={b._id}
                  className="group relative flex items-center border border-[#f1e8df] bg-white hover:border-[#f6823c] transition-colors"
                >
                  <button
                    className="flex-1 text-left p-4 !transform-none hover:!transform-none"
                    onClick={() => {
                      handlePassageChange({
                        book: b.passageBook,
                        chapter: b.passageChapter,
                        verse: b.passageVerse,
                      });
                      setBookmarksOpen(false);
                      setNotificationsOpen(false);
                    }}
                  >
                    <span className="text-[14px] font-bold text-[#25140b]">
                      {b.passageBook} {b.passageChapter}:{b.passageVerse}
                    </span>
                    {(() => {
                      const versionKey = `${b.passageBook}-${b.passageChapter}`;
                      const verseText = chapterVerses[versionKey]?.find(
                        (v) => v.number === b.passageVerse,
                      )?.text;
                      return verseText ? (
                        <p className="mt-1 font-serif text-[13px] leading-relaxed text-[#5d493a] line-clamp-2">
                          {verseText}
                        </p>
                      ) : null;
                    })()}
                  </button>

                  <div className="pr-2">
                    <AnimatePresence mode="wait">
                      {deletingId === b._id ? (
                        <motion.div
                          key="confirm"
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: 20, opacity: 0 }}
                          className="flex items-center gap-1"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                          }}
                        >
                          <button
                            onClick={() => setDeletingId(null)}
                            className="p-2 text-[#7a6758] hover:bg-[#fbf7f2] hover:text-[#3a2218] transition-colors"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              await toggleBookmark({
                                guestId,
                                passageBook: b.passageBook,
                                passageChapter: b.passageChapter,
                                passageVerse: b.passageVerse,
                              });
                              setDeletingId(null);
                              toast.success("Bookmark removed");
                            }}
                            className="p-2 text-[#2e6b3d] hover:bg-[#f0f9f0] rounded transition-colors"
                            title="Confirm Delete"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ) : (
                        <motion.button
                          key="delete"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="p-2 text-[#9b8878] hover:text-[#a24723] hover:bg-[#fff5f5] rounded transition-colors"
                          onClick={() => setDeletingId(b._id)}
                          title="Delete bookmark"
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {sheetView === "profile" && (
          <div className="p-4 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[#3a2218] flex items-center justify-center text-xl font-bold text-[#f6823c]">
                {useStudyStore.getState().guestName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#25140b]">
                  {useStudyStore.getState().guestName}
                </h3>
                <p className="text-sm text-[#7a6758]">guest@biblestudy.app</p>
              </div>
            </div>
            <button className="w-full bg-[#3a2218] text-white py-3 rounded-lg font-semibold hover:bg-[#1f1209] transition-colors">
              {useStudyStore.getState().guestName.startsWith("Anonymous-")
                ? "Sign In to Sync"
                : "Log Out"}
            </button>
          </div>
        )}

        {sheetView === "settings" && (
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 border border-[#f1e8df] bg-white">
              <span className="text-sm font-medium">Dark Mode</span>
              <div className="h-5 w-10 bg-[#e5d6c9] rounded-full" />
            </div>
            <div className="flex items-center justify-between p-3 border border-[#f1e8df] bg-white">
              <span className="text-sm font-medium">FontSize</span>
              <span className="text-xs text-[#9b8878]">14px</span>
            </div>
          </div>
        )}
      </BottomSheet>
    </ProductShell>
  );
}

function LeftPanel({
  allChapterVerses,
  bibleBooks,
  bibleBooksError,
  bibleBooksLoading,
  chapterVerses,
  selectedPassage,
  visibleVersions,
  onCollapse,
  onOpenBookmarks,
  onPassageChange,
  onSearchActive,
}: {
  allChapterVerses: Record<string, BibleVerse[]>;
  bibleBooks: BibleBookIndex[];
  bibleBooksError: string | null;
  bibleBooksLoading: boolean;
  chapterVerses: Record<string, BibleVerse[]>;
  selectedPassage: PassageSelection;
  visibleVersions: string[];
  onCollapse: () => void;
  onOpenBookmarks?: () => void;
  onPassageChange: (selection: PassageSelection) => void;
  onSearchActive: (active: boolean) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(true);
  const [openBook, setOpenBook] = useState(selectedPassage.book);
  const [openChapter, setOpenChapter] = useState(
    chapterKeyFor(selectedPassage),
  );
  const [activeFilter, setActiveFilter] = useState<
    | "All"
    | "Old Testament"
    | "New Testament"
    | "Bookmarks"
    | "Notes"
    | "Study"
    | "Audio"
  >("All");

  useEffect(() => {
    setOpenBook(selectedPassage.book);
    setOpenChapter(chapterKeyFor(selectedPassage));
  }, [selectedPassage]);

  const referenceMatch = useMemo(
    () =>
      debouncedTerm.trim().length > 0
        ? parseVerseReference(debouncedTerm, bibleBooks)
        : null,
    [debouncedTerm, bibleBooks],
  );

  const searchHits = useMemo((): SearchHit[] => {
    const q = debouncedTerm.trim().toLowerCase();
    if (q.length < 2) return [];
    const hits: SearchHit[] = [];
    const source =
      Object.keys(allChapterVerses).length > 0 ? allChapterVerses : chapterVerses;
    for (const [label, verses] of Object.entries(source)) {
      for (const { number, text } of verses) {
        if (text.toLowerCase().includes(q)) {
          hits.push({
            book: selectedPassage.book,
            chapter: selectedPassage.chapter,
            label,
            verse: number,
            text,
          });
        }
      }
    }
    return hits.slice(0, 30);
  }, [debouncedTerm, chapterVerses, allChapterVerses, selectedPassage]);

  useEffect(() => {
    onSearchActive(debouncedTerm.trim().length >= 2);
  }, [debouncedTerm, onSearchActive]);

  const filteredBibleBooks = useMemo(
    () =>
      activeFilter === "All"
        ? bibleBooks
        : activeFilter === "Old Testament" || activeFilter === "New Testament"
          ? bibleBooks.filter(({ testament }) => testament === activeFilter)
          : bibleBooks,
    [activeFilter, bibleBooks],
  );

  const hasQuery = debouncedTerm.trim().length >= 2;
  const showResults =
    hasQuery && (searchHits.length > 0 || referenceMatch !== null);

  return (
    <motion.aside
      animate="animate"
      className="relative hidden shrink-0 flex-col overflow-visible border-r border-[#f1e8df] bg-white lg:flex"
      custom="left"
      exit="exit"
      initial="initial"
      transition={panelTransition}
      variants={panelVariants}
    >
      <RailCollapseHandle side="left" onClick={onCollapse} />
      <div className="border-b border-[#f1e8df] px-4 py-4 pb-0">
        <div className="flex items-center justify-between">
          <div />
          <button
            className="icon-button flex h-[30px] w-[30px] items-center justify-center text-[#7a6758] hover:bg-[#fbf7f2]"
            onClick={onCollapse}
            type="button"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          className="flex w-full items-center justify-between py-3 text-left text-[12px] font-semibold text-[#3a2218] hover:text-[#25140b]"
          onClick={() => {
            const next = !searchOpen;
            setSearchOpen(next);
            if (next) setIndexOpen(false);
          }}
          type="button"
        >
          <span>Search Scripture</span>
          {searchOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-[#9b8878]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[#9b8878]" />
          )}
        </button>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            searchOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 bg-[#fbf7f2] px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-[#9b8878]" />
              <input
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[#25140b] outline-none placeholder:text-[#9b8878]"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search verses, topics, or keywords"
                value={searchTerm}
              />
              {searchTerm && (
                <button
                  className="icon-button flex h-5 w-5 shrink-0 items-center justify-center text-[#9b8878]"
                  onClick={() => setSearchTerm("")}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center mt-1 gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {(
                [
                  "All",
                  "Old Testament",
                  "New Testament",
                  "Bookmarks",
                  "Notes",
                  "Study",
                  "Audio",
                ] as const
              ).map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    className={cn(
                      "relative px-3 py-2 text-[11px] font-semibold tracking-tight transition-colors duration-200",
                      isActive
                        ? "text-[#25140b]"
                        : "text-[#9b8878] hover:text-[#5d493a]",
                    )}
                    key={filter}
                    onClick={() => {
                      setActiveFilter(filter);
                      if (filter === "Bookmarks" && onOpenBookmarks) {
                        onOpenBookmarks();
                      }
                    }}
                    type="button"
                  >
                    {isActive && (
                      <motion.div
                        className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f6823c] shadow-[0_-1px_4px_rgba(246,130,60,0.4)]"
                        layoutId="left-panel-filter-indicator"
                        transition={{
                          type: "spring",
                          bounce: 0.15,
                          duration: 0.4,
                        }}
                      />
                    )}
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bible-app-scroll flex-1 overflow-y-auto py-3">
        {searchOpen && (
          <section className="px-3">
            {hasQuery && showResults && (
              <>
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9b8878]">
                    Matches in {selectedPassage.book} {selectedPassage.chapter}
                  </span>
                </div>

                {referenceMatch && (
                  <button
                    className="mb-2 w-full border-[1.5px] border-[#f6823c] bg-[#fff3e8] px-3 py-2.5 text-left"
                    onClick={() => onPassageChange(referenceMatch)}
                    type="button"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#25140b]">
                        {referenceMatch.book} {referenceMatch.chapter}:
                        {referenceMatch.verse}
                      </span>
                      <span className="bg-[#fbf7f2] px-1.5 py-px text-[10px] font-semibold tracking-[0.03em] text-[#3a2218]">
                        Jump to
                      </span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-[#5d493a]">
                      Navigate to this passage
                    </p>
                  </button>
                )}

                {searchHits.map((hit, index) => (
                  <button
                    className={cn(
                      "mb-2 w-full border-[1.5px] border-transparent px-3 py-2.5 text-left hover:border-[#e5d6c9] hover:bg-[#fbf7f2]",
                      index === 0 &&
                        !referenceMatch &&
                        "border-[#f6823c] bg-[#fff3e8]",
                    )}
                    key={`${hit.label}-${hit.verse}`}
                    onClick={() =>
                      onPassageChange({
                        book: hit.book,
                        chapter: hit.chapter,
                        verse: hit.verse,
                      })
                    }
                    type="button"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#25140b]">
                        {hit.book} {hit.chapter}:{hit.verse}
                      </span>
                      <span className="bg-[#fbf7f2] px-1.5 py-px text-[10px] font-semibold tracking-[0.03em] text-[#3a2218]">
                        {hit.label}
                      </span>
                    </div>
                    <p className="line-clamp-2 font-serif text-[12px] leading-relaxed text-[#5d493a]">
                      {hit.text}
                    </p>
                  </button>
                ))}
              </>
            )}

            {hasQuery && !showResults && (
              <p className="px-1 py-1 text-[12px] font-medium text-[#9b8878]">
                No matches in {selectedPassage.book} {selectedPassage.chapter}
              </p>
            )}

            {hasQuery && debouncedTerm !== searchTerm && (
              <div className="flex items-center justify-center h-[10vh] opacity-60">
                <div className="h-4 w-4 border-2 border-[#f6823c] border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-[11px] font-medium text-[#7a6758]">
                  Searching...
                </span>
              </div>
            )}
            {!hasQuery && (
              <div className="flex flex-col items-center justify-center h-[10vh] border border-[#f1e8df] bg-[#fbf7f2] rounded-lg mt-2 px-3 py-4 text-center opacity-80">
                <MagnifyingGlassIcon
                  animateOnParentHover
                  className="text-[#9b8878] mb-1.5"
                />
                <p className="text-[10px] font-medium text-[#7a6758] leading-tight">
                  Easily search the Scriptures across different versions
                </p>
              </div>
            )}
          </section>
        )}

        <button
          className="flex w-full items-center justify-between border-b border-[#f1e8df] px-3 py-3 text-left text-[12px] font-semibold text-[#3a2218] hover:text-[#25140b]"
          onClick={() =>
            setIndexOpen((o) => {
              if (!o) setSearchOpen(false);
              return !o;
            })
          }
          type="button"
        >
          <span>Full Index</span>
          {indexOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-[#9b8878]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[#9b8878]" />
          )}
        </button>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            indexOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <ScriptureIndex
              bibleBooks={filteredBibleBooks}
              bibleBooksError={bibleBooksError}
              bibleBooksLoading={bibleBooksLoading}
              openBook={openBook}
              openChapter={openChapter}
              selectedPassage={selectedPassage}
              onBookChange={setOpenBook}
              onChapterChange={setOpenChapter}
              onPassageChange={onPassageChange}
            />
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function ScriptureIndex({
  bibleBooks,
  bibleBooksError,
  bibleBooksLoading,
  onBookChange,
  onChapterChange,
  onPassageChange,
  openBook,
  openChapter,
  selectedPassage,
}: {
  bibleBooks: BibleBookIndex[];
  bibleBooksError: string | null;
  bibleBooksLoading: boolean;
  onBookChange: (book: string) => void;
  onChapterChange: (chapter: string) => void;
  onPassageChange: (selection: PassageSelection) => void;
  openBook: string;
  openChapter: string;
  selectedPassage: PassageSelection;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const activePathRef = useRef<SVGPathElement>(null);
  const clipRectRef = useRef<SVGRectElement>(null);

  const [bookName, chapterValue] = openChapter.split("-");
  const chapter = Number(chapterValue);
  const indexBookId = useMemo(
    () => (openBook === bookName ? getBookId(bibleBooks, bookName) : undefined),
    [bibleBooks, bookName, openBook],
  );

  const {
    data: verseCount = 0,
    error: verseCountQueryError,
    isLoading: verseCountLoading,
  } = useVerseCount(indexBookId, chapter);
  const verseCountError = verseCountQueryError
    ? "Unable to load verses."
    : null;

  const calculatePath = useCallback(() => {
    if (
      !containerRef.current ||
      !pathRef.current ||
      !activePathRef.current ||
      !clipRectRef.current
    )
      return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const getRelY = (id: string, edge: "top" | "bottom") => {
      const el = container.querySelector(`[data-marker="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return edge === "top" ? r.top - rect.top : r.bottom - rect.top;
    };

    const chaptersTop = getRelY("chapters", "top");
    const chaptersBottom = getRelY("chapters", "bottom");
    const versesTop = getRelY("verses", "top");
    const versesBottom = getRelY("verses", "bottom");
    const height = rect.height;
    let activeEnd = height;

    if (versesTop !== null && versesBottom !== null) {
      activeEnd = versesTop + (versesBottom - versesTop) * 0.7;
    } else if (chaptersTop !== null) {
      activeEnd = chaptersTop + 80;
    }

    const x0 = 26,
      x1 = 44,
      x2 = 62,
      radius = 14;
    const curve = (xs: number, ys: number, xe: number, ye: number) => {
      const my = (ys + ye) / 2;
      return `C ${xs} ${my}, ${xe} ${my}, ${xe} ${ye}`;
    };

    let d = `M ${x0} -20`;

    if (chaptersTop !== null && chaptersBottom !== null) {
      const t1s = chaptersTop - radius;
      const t1e = Math.max(t1s + 1, chaptersTop + radius);
      if (t1s > -20) d += ` L ${x0} ${t1s}`;
      d += ` ${curve(x0, t1s, x1, t1e)}`;

      if (versesTop !== null && versesBottom !== null) {
        const t2s = Math.max(t1e, versesTop - radius);
        const t2e = Math.max(t2s + 1, versesTop + radius);
        const t3s = Math.max(t2e, versesBottom - radius);
        const t3e = Math.max(t3s + 1, versesBottom + radius);
        const t4s = Math.max(t3e, chaptersBottom - radius);
        const t4e = Math.max(t4s + 1, chaptersBottom + radius);
        d += ` L ${x1} ${t2s} ${curve(x1, t2s, x2, t2e)}`;
        d += ` L ${x2} ${t3s} ${curve(x2, t3s, x1, t3e)}`;
        d += ` L ${x1} ${t4s} ${curve(x1, t4s, x0, t4e)}`;
        d += ` L ${x0} ${Math.max(t4e, height + 20)}`;
      } else {
        const t4s = Math.max(t1e, chaptersBottom - radius);
        const t4e = Math.max(t4s + 1, chaptersBottom + radius);
        d += ` L ${x1} ${t4s} ${curve(x1, t4s, x0, t4e)}`;
        d += ` L ${x0} ${Math.max(t4e, height + 20)}`;
      }
    } else {
      d += ` L ${x0} ${height + 20}`;
    }

    pathRef.current.setAttribute("d", d);
    activePathRef.current.setAttribute("d", d);
    clipRectRef.current.setAttribute("height", activeEnd.toString());
  }, []);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      calculatePath();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [calculatePath, openBook, openChapter]);

  if (bibleBooksLoading) {
    return (
      <div className="px-3 py-4 text-[12px] font-medium text-[#7a6758]">
        Loading Bible index…
      </div>
    );
  }
  if (bibleBooksError) {
    return (
      <div className="px-3 py-4 text-[12px] font-semibold text-[#25140b]">
        {bibleBooksError}
      </div>
    );
  }

  return (
    <div className="relative mt-3" ref={containerRef}>
      <svg className="pointer-events-none absolute left-0 top-0 h-full w-[80px]">
        <path
          ref={pathRef}
          fill="none"
          stroke="#f1e8df"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <g clipPath="url(#scripture-index-active)">
          <path
            ref={activePathRef}
            fill="none"
            stroke="#f6823c"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.25"
          />
        </g>
        <defs>
          <clipPath id="scripture-index-active">
            <rect ref={clipRectRef} height="0" width="88" x="0" y="0" />
          </clipPath>
        </defs>
      </svg>

      <div className="relative z-10 flex flex-col gap-1">
        {bibleBooks.map(({ book, chapters, order }) => (
          <div className="flex flex-col" key={book}>
            <button
              className={cn(
                "flex w-full items-center justify-between py-2.5 pl-12 pr-3 text-left text-[13px] font-semibold text-[#3a2218] hover:text-[#25140b]",
                openBook === book && "text-[#25140b]",
              )}
              onClick={() => {
                onBookChange(openBook === book ? "" : book);
                onChapterChange(`${book}-1`);
              }}
              type="button"
            >
              {book}
              {openBook === book ? (
                <ChevronUp className="h-3.5 w-3.5 text-[#9b8878]" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-[#9b8878]" />
              )}
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                openBook === book
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className="pb-6 pt-2"
                  data-marker={openBook === book ? "chapters" : undefined}
                >
                  {chapters.map(({ chapter: ch }) => {
                    const key = `${book}-${ch}`;
                    const isOpenChapter = openChapter === key;
                    return (
                      <div key={key}>
                        <button
                          className={cn(
                            "flex w-full items-center justify-between py-2 pl-[64px] pr-3 text-left text-[12px] font-medium text-[#5d493a] hover:text-[#25140b]",
                            isOpenChapter && "text-[#25140b]",
                          )}
                          onClick={() => onChapterChange(key)}
                          type="button"
                        >
                          Chapter {ch}
                          {isOpenChapter ? (
                            <ChevronUp className="h-3 w-3 text-[#9b8878]" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-[#9b8878]" />
                          )}
                        </button>

                        <div
                          className={cn(
                            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                            isOpenChapter
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0",
                          )}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div
                              className="grid grid-cols-5 gap-x-2 gap-y-2 py-3 pl-[84px] pr-3"
                              data-marker={
                                openChapter === key ? "verses" : undefined
                              }
                            >
                              {isOpenChapter && verseCountLoading && (
                                <p className="col-span-5 text-[11px] font-medium text-[#7a6758]">
                                  Loading…
                                </p>
                              )}
                              {isOpenChapter && verseCountError && (
                                <p className="col-span-5 text-[11px] font-semibold text-[#25140b]">
                                  {verseCountError}
                                </p>
                              )}
                              {isOpenChapter &&
                                !verseCountLoading &&
                                !verseCountError &&
                                Array.from(
                                  { length: verseCount },
                                  (_, i) => i + 1,
                                ).map((verse) => (
                                  <button
                                    className={cn(
                                      "flex h-7 w-7 items-center justify-center text-[12px] font-medium text-[#7a6758] hover:text-[#f6823c]",
                                      selectedPassage.book === book &&
                                        selectedPassage.chapter === ch &&
                                        selectedPassage.verse === verse &&
                                        "font-semibold text-[#f6823c]",
                                    )}
                                    key={verse}
                                    onClick={() =>
                                      onPassageChange({
                                        book,
                                        chapter: ch,
                                        verse,
                                      })
                                    }
                                    type="button"
                                  >
                                    {verse}
                                  </button>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Reader({
  bibleBooks,
  bibleBooksError,
  bibleBooksLoading,
  chapterErrors,
  chapterLoading,
  chapterVerses,
  selectedPassage,
  visibleVersions,
  onBookmark,
  onPassageChange,
  onToast,
  onVerseComment,
  onVersionsChange,
}: {
  bibleBooks: BibleBookIndex[];
  bibleBooksError: string | null;
  bibleBooksLoading: boolean;
  chapterErrors: Record<string, string>;
  chapterLoading: boolean;
  chapterVerses: Record<string, BibleVerse[]>;
  selectedPassage: PassageSelection;
  visibleVersions: string[];
  isBookmarked?: boolean;
  onBookmark: () => void;
  onPassageChange: (selection: PassageSelection) => void;
  onToast: (title: string, description?: string) => void;
  onVerseComment: (target: string) => void;
  onVersionsChange: (versions: string[]) => void;
}) {
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [versionSearch, setVersionSearch] = useState("");
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const readerScrollRef = useRef<HTMLDivElement>(null);

  const versionMenuRef = useOutsideClick<HTMLDivElement>(
    versionMenuOpen,
    () => {
      setVersionMenuOpen(false);
      setReplaceTarget(null);
    },
  );

  const visibleTranslationModels = useMemo(
    () => translations.filter(({ label }) => visibleVersions.includes(label)),
    [visibleVersions],
  );

  const visibleTranslations = useMemo(
    () =>
      visibleTranslationModels.map((t) => ({
        ...t,
        error: chapterErrors[t.label],
        isLoading: chapterLoading,
        verses: chapterVerses[t.label] ?? [],
      })),
    [visibleTranslationModels, chapterErrors, chapterLoading, chapterVerses],
  );

  const availableTranslations = useMemo(
    () =>
      translations.filter(({ label, name }) => {
        const q = versionSearch.trim().toLowerCase();
        return (
          label.toLowerCase().includes(q) || name.toLowerCase().includes(q)
        );
      }),
    [versionSearch],
  );

  const canCloseVersion = visibleVersions.length > 1;

  const currentBookIndex = useMemo(
    () => bibleBooks.findIndex(({ book }) => book === selectedPassage.book),
    [bibleBooks, selectedPassage.book],
  );
  const currentBook =
    currentBookIndex >= 0 ? bibleBooks[currentBookIndex] : undefined;
  const totalChapters = currentBook?.chapters.length ?? 0;
  const booksReady = bibleBooks.length > 0;
  const atFirstChapter = selectedPassage.chapter === 1;
  const atLastChapter =
    totalChapters > 0 && selectedPassage.chapter === totalChapters;
  const atFirstBook = currentBookIndex <= 0;
  const atLastBook = currentBookIndex >= bibleBooks.length - 1;

  const goFirstChapter = useCallback(() => {
    if (!atFirstChapter)
      onPassageChange({ book: selectedPassage.book, chapter: 1, verse: 1 });
  }, [atFirstChapter, selectedPassage.book, onPassageChange]);

  const goPrevChapter = useCallback(() => {
    if (selectedPassage.chapter > 1) {
      onPassageChange({
        book: selectedPassage.book,
        chapter: selectedPassage.chapter - 1,
        verse: 1,
      });
    } else if (currentBookIndex > 0) {
      const prev = bibleBooks[currentBookIndex - 1];
      onPassageChange({
        book: prev.book,
        chapter: prev.chapters.length,
        verse: 1,
      });
    }
  }, [selectedPassage, bibleBooks, currentBookIndex, onPassageChange]);

  const goNextChapter = useCallback(() => {
    if (selectedPassage.chapter < totalChapters) {
      onPassageChange({
        book: selectedPassage.book,
        chapter: selectedPassage.chapter + 1,
        verse: 1,
      });
    } else if (currentBookIndex < bibleBooks.length - 1) {
      const next = bibleBooks[currentBookIndex + 1];
      onPassageChange({ book: next.book, chapter: 1, verse: 1 });
    }
  }, [
    selectedPassage,
    bibleBooks,
    currentBookIndex,
    totalChapters,
    onPassageChange,
  ]);

  const goLastChapter = useCallback(() => {
    if (!atLastChapter && totalChapters > 0)
      onPassageChange({
        book: selectedPassage.book,
        chapter: totalChapters,
        verse: 1,
      });
  }, [atLastChapter, totalChapters, selectedPassage.book, onPassageChange]);

  useEffect(() => {
    if (chapterLoading) return;
    const el = readerScrollRef.current?.querySelector(
      `[data-verse="${selectedPassage.verse}"]`,
    );
    if (el)
      (el as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  }, [
    selectedPassage.verse,
    selectedPassage.chapter,
    selectedPassage.book,
    chapterLoading,
  ]);

  const closeVersion = (label: string) => {
    if (!canCloseVersion) return;
    onVersionsChange(visibleVersions.filter((v) => v !== label));
  };

  const addVersion = (label: string) => {
    const mode = replaceTarget ? "changed" : "added";
    let next: string[];
    if (visibleVersions.includes(label)) {
      next = visibleVersions;
    } else if (replaceTarget) {
      next = visibleVersions.map((v) => (v === replaceTarget ? label : v));
    } else if (visibleVersions.length < 3) {
      next = translations
        .map((t) => t.label)
        .filter((l) => [...visibleVersions, label].includes(l))
        .slice(0, 3);
    } else {
      next = visibleVersions;
    }
    onVersionsChange(next);
    setVersionMenuOpen(false);
    setVersionSearch("");
    setReplaceTarget(null);
    onToast(`${label} ${mode} in comparison`);
  };

  const handleVersionChoice = (label: string) => {
    if (
      visibleVersions.length >= 3 &&
      replaceTarget === null &&
      !visibleVersions.includes(label)
    ) {
      onToast(
        "Maximum number of versions selected",
        "Remove one translation first, or click a version label to swap it.",
      );
      return;
    }
    addVersion(label);
  };

  const openVersionMenu = (target: string | null = null) => {
    setReplaceTarget(target);
    setVersionMenuOpen(true);
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#f1e8df] bg-white px-5 py-2.5">
        <NavButton
          disabled={!booksReady || (atFirstBook && atFirstChapter)}
          icon={<ChevronsLeft className="h-3.5 w-3.5" />}
          onClick={goFirstChapter}
        />
        <NavButton
          disabled={!booksReady || (atFirstBook && atFirstChapter)}
          icon={<ChevronLeft className="h-3.5 w-3.5" />}
          onClick={goPrevChapter}
        />
        <PassagePicker
          bibleBooks={bibleBooks}
          bibleBooksError={bibleBooksError}
          bibleBooksLoading={bibleBooksLoading}
          selectedPassage={selectedPassage}
          onPassageChange={onPassageChange}
        />
        <NavButton
          disabled={!booksReady || (atLastBook && atLastChapter)}
          icon={<ChevronRight className="h-3.5 w-3.5" />}
          onClick={goNextChapter}
        />
        <NavButton
          disabled={!booksReady || (atLastBook && atLastChapter)}
          icon={<ChevronsRight className="h-3.5 w-3.5" />}
          onClick={goLastChapter}
        />

        <div className="flex-1" />

        <motion.div className="flex items-center gap-3" layout>
          <AnimatePresence initial={false}>
            {visibleVersions.map((version) => (
              <motion.button
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "text-[13px] font-semibold uppercase tracking-[0.04em] text-[#3a2218] transition-colors duration-150 ease-out hover:text-[#f6823c]",
                  replaceTarget === version && "text-[#f6823c]",
                )}
                exit={{ opacity: 0, y: -4 }}
                initial={{ opacity: 0, y: 4 }}
                key={version}
                layout
                onClick={() => openVersionMenu(version)}
                transition={{ duration: 0.15, ease: [0.215, 0.61, 0.355, 1] }}
                type="button"
              >
                {version}
              </motion.button>
            ))}
          </AnimatePresence>

          <div className="relative" ref={versionMenuRef}>
            <button
              aria-label="Add Bible version"
              className="flex w-40 items-center rounded-full justify-between gap-2 border border-[#e5d6c9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3a2218] outline-none transition-colors duration-150 ease-out hover:border-[#f6823c] focus:border-[#f6823c]"
              onClick={() => {
                setReplaceTarget(null);
                setVersionMenuOpen((o) => !o);
              }}
              type="button"
            >
              {replaceTarget
                ? `Change ${replaceTarget}`
                : visibleVersions.length >= 3
                  ? "3 versions max"
                  : "Add version"}
              <ChevronDown className="ml-1 h-4 w-4 shrink-0 text-gray-400" />
            </button>

            <AnimatePresence>
              {versionMenuOpen && (
                <motion.section
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-[calc(100%+6px)] z-30 w-56 border border-[#e5d6c9] bg-white p-2 shadow-[0_14px_36px_rgba(31,18,9,0.10)]"
                  exit={{ opacity: 0, y: -4 }}
                  initial={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: [0.215, 0.61, 0.355, 1] }}
                >
                  <div className="mb-1.5 flex items-center gap-2 border border-[#f1e8df] bg-[#fbf7f2] px-2 py-1.5">
                    <Search className="h-3.5 w-3.5 text-[#9b8878]" />
                    <input
                      autoFocus
                      className="min-w-0 flex-1 bg-transparent text-[12px] text-[#25140b] outline-none placeholder:text-[#9b8878]"
                      onChange={(e) => setVersionSearch(e.target.value)}
                      placeholder="Search translations"
                      value={versionSearch}
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto bible-app-scroll">
                    {availableTranslations.map(({ label, name }) => {
                      const selected = visibleVersions.includes(label);
                      return (
                        <button
                          className={cn(
                            "flex w-full flex-col px-3 py-2 text-left hover:bg-[#fbf7f2]",
                            selected &&
                              "cursor-default opacity-50 hover:bg-white",
                          )}
                          disabled={selected}
                          key={label}
                          onClick={() => handleVersionChoice(label)}
                          type="button"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-bold text-[#3a2218]">
                              {label}
                            </span>
                            {selected && (
                              <span className="text-[10px] font-medium text-[#f6823c]">
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#7a6758] truncate">
                            {name}
                          </span>
                        </button>
                      );
                    })}
                    {availableTranslations.length === 0 && (
                      <p className="px-3 py-2 text-[12px] font-medium text-[#9b8878]">
                        No translations found
                      </p>
                    )}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          <button
            aria-label={`Bookmark ${formatPassage(selectedPassage)}`}
            className="icon-button flex h-8 w-8 items-center justify-center border border-[#e5d6c9] text-[#7a6758] hover:border-[#f6823c] hover:bg-[#fbf7f2] hover:text-[#3a2218]"
            onClick={onBookmark}
            type="button"
          >
            <Bookmark className="h-4 w-4" />
          </button>
        </motion.div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-w-0 shrink-0 justify-center overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleTranslations.map(({ label }) => (
              <TranslationHeader
                canClose={canCloseVersion}
                key={label}
                label={label}
                onClose={() => closeVersion(label)}
                onSwap={() => openVersionMenu(label)}
                visibleCount={visibleTranslations.length}
              />
            ))}
          </AnimatePresence>
        </div>

        <div
          className="bible-app-scroll min-h-0 flex-1 overflow-y-auto"
          ref={readerScrollRef}
        >
          <div className="flex min-h-full min-w-0 flex-1 justify-center overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              {visibleTranslations.map((translation) => (
                <TranslationVerses
                  key={translation.label}
                  onComment={onVerseComment}
                  selectedPassage={selectedPassage}
                  visibleCount={visibleTranslations.length}
                  {...translation}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ReaderFooter />
    </section>
  );
}

function PassagePicker({
  bibleBooks,
  bibleBooksError,
  bibleBooksLoading,
  selectedPassage,
  onPassageChange,
}: {
  bibleBooks: BibleBookIndex[];
  bibleBooksError: string | null;
  bibleBooksLoading: boolean;
  selectedPassage: PassageSelection;
  onPassageChange: (selection: PassageSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftBook, setDraftBook] = useState(selectedPassage.book);
  const [draftChapter, setDraftChapter] = useState(selectedPassage.chapter);
  const chapterScrollRef = useRef<HTMLDivElement>(null);
  const verseScrollRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const pickerRef = useOutsideClick<HTMLDivElement>(open, close);

  const selectedBook = bibleBooks.find(({ book }) => book === draftBook);
  const oldTestamentBooks = bibleBooks.filter(
    ({ testament }) => testament === "Old Testament",
  );
  const newTestamentBooks = bibleBooks.filter(
    ({ testament }) => testament === "New Testament",
  );

  const verseCountBookId =
    open && !bibleBooksLoading && !bibleBooksError && selectedBook
      ? selectedBook.id
      : undefined;

  const {
    data: draftVerseCount = 0,
    error: draftVerseCountQueryError,
    isLoading: draftVerseCountLoading,
  } = useVerseCount(verseCountBookId, draftChapter);
  const draftVerseCountError = draftVerseCountQueryError
    ? "Unable to load verses."
    : null;

  const toggleOpen = () => {
    if (!open) {
      setDraftBook(selectedPassage.book);
      setDraftChapter(selectedPassage.chapter);
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    chapterScrollRef.current?.scrollTo({ top: 0 });
    verseScrollRef.current?.scrollTo({ top: 0 });
  }, [draftBook]);

  useEffect(() => {
    verseScrollRef.current?.scrollTo({ top: 0 });
  }, [draftChapter]);

  const elasticTransition = {
    duration: 0.42,
    ease: [0.34, 1.56, 0.64, 1],
  } as const;
  const elasticItemMotion = (index: number, step = 0.018) => ({
    animate: { opacity: 1, y: [-20, 4, 0] },
    initial: { opacity: 0, y: -20 },
    transition: { ...elasticTransition, delay: Math.min(index, 32) * step },
  });

  return (
    <div className="relative" ref={pickerRef}>
      <button
        className="cta-button flex items-center gap-1 border border-[#e5d6c9] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#25140b] hover:border-[#f6823c]"
        onClick={toggleOpen}
        type="button"
      >
        {formatPassage(selectedPassage)}
        <ChevronDown className="h-3 w-3 text-[#9b8878]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.section
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 top-[calc(100%+6px)] z-40 grid h-[380px] w-[620px] grid-cols-[170px_150px_1fr] items-stretch overflow-hidden border border-[#e5d6c9] bg-white shadow-[0_18px_44px_rgba(31,18,9,0.12)]"
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={elasticTransition}
          >
            <div className="flex min-h-0 flex-col border-r border-[#f1e8df] p-2">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9b8878]">
                Book
              </p>
              <div className="bible-app-scroll min-h-0 flex-1 overflow-y-auto">
                {bibleBooksLoading && (
                  <p className="px-2 py-2 text-[12px] font-medium text-[#7a6758]">
                    Loading books…
                  </p>
                )}
                {bibleBooksError && (
                  <p className="px-2 py-2 text-[12px] font-semibold text-[#25140b]">
                    {bibleBooksError}
                  </p>
                )}
                {!bibleBooksLoading && !bibleBooksError && (
                  <>
                    <p className="px-2 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#f6823c]">
                      Old Testament
                    </p>
                    {oldTestamentBooks.map(({ book, chapters }, index) => (
                      <motion.button
                        className={cn(
                          "w-full px-2 py-2 text-left text-[12px] font-semibold text-[#5d493a] hover:text-[#25140b]",
                          draftBook === book && "text-[#f6823c]",
                        )}
                        key={book}
                        onClick={() => {
                          setDraftBook(book);
                          setDraftChapter(chapters[0]?.chapter ?? 1);
                        }}
                        type="button"
                        {...elasticItemMotion(index)}
                      >
                        {book}
                      </motion.button>
                    ))}
                    <p className="mt-2 border-t border-[#f1e8df] px-2 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#f6823c]">
                      New Testament
                    </p>
                    {newTestamentBooks.map(({ book, chapters }, index) => (
                      <motion.button
                        className={cn(
                          "w-full px-2 py-2 text-left text-[12px] font-semibold text-[#5d493a] hover:text-[#25140b]",
                          draftBook === book && "text-[#f6823c]",
                        )}
                        key={book}
                        onClick={() => {
                          setDraftBook(book);
                          setDraftChapter(chapters[0]?.chapter ?? 1);
                        }}
                        type="button"
                        {...elasticItemMotion(oldTestamentBooks.length + index)}
                      >
                        {book}
                      </motion.button>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col border-r border-[#f1e8df] p-2">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9b8878]">
                Chapter
              </p>
              <div
                className="bible-app-scroll min-h-0 flex-1 overflow-y-auto"
                ref={chapterScrollRef}
              >
                <AnimatePresence mode="popLayout">
                  <motion.div key={draftBook}>
                    {selectedBook?.chapters.map(({ chapter }, index) => (
                      <motion.button
                        className={cn(
                          "w-full px-2 py-2 text-left text-[12px] font-medium text-[#5d493a] hover:text-[#25140b]",
                          draftChapter === chapter &&
                            "font-semibold text-[#f6823c]",
                        )}
                        key={chapter}
                        onClick={() => setDraftChapter(chapter)}
                        type="button"
                        {...elasticItemMotion(index)}
                      >
                        Chapter {chapter}
                      </motion.button>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="flex min-h-0 flex-col p-2">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9b8878]">
                Verse
              </p>
              <div
                className="bible-app-scroll min-h-0 flex-1 overflow-y-auto"
                ref={verseScrollRef}
              >
                <AnimatePresence mode="popLayout">
                  <motion.div
                    className="grid grid-cols-6 gap-1"
                    key={`${draftBook}-${draftChapter}`}
                  >
                    {draftVerseCountLoading && (
                      <p className="col-span-6 px-2 py-2 text-[12px] font-medium text-[#7a6758]">
                        Loading…
                      </p>
                    )}
                    {draftVerseCountError && (
                      <p className="col-span-6 px-2 py-2 text-[12px] font-semibold text-[#25140b]">
                        {draftVerseCountError}
                      </p>
                    )}
                    {!draftVerseCountLoading &&
                      !draftVerseCountError &&
                      Array.from(
                        { length: draftVerseCount },
                        (_, i) => i + 1,
                      ).map((verse, index) => (
                        <motion.button
                          className={cn(
                            "flex h-8 items-center justify-center text-[12px] font-medium text-[#7a6758] hover:text-[#f6823c]",
                            selectedPassage.book === draftBook &&
                              selectedPassage.chapter === draftChapter &&
                              selectedPassage.verse === verse &&
                              "font-semibold text-[#f6823c]",
                          )}
                          key={verse}
                          onClick={() => {
                            onPassageChange({
                              book: draftBook,
                              chapter: draftChapter,
                              verse,
                            });
                            setOpen(false);
                          }}
                          type="button"
                          {...elasticItemMotion(index, 0.009)}
                        >
                          {verse}
                        </motion.button>
                      ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({
  disabled = false,
  icon,
  onClick,
}: {
  disabled?: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn(
        "icon-button flex h-7 w-7 items-center justify-center border border-[#e5d6c9] text-[#7a6758] hover:border-[#f6823c] hover:bg-[#fbf7f2]",
        disabled &&
          "cursor-default opacity-35 hover:border-[#e5d6c9] hover:bg-white",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
    </button>
  );
}

const translationColumnMotion = (visibleCount: number) => ({
  animate: {
    flex: visibleCount === 1 ? "0 0 52%" : "1 1 0%",
    maxWidth: visibleCount === 1 ? "52%" : "none",
    opacity: 1,
    width: visibleCount === 1 ? "52%" : "100%",
    x: 0,
  },
  exit: { flex: 0, opacity: 0, width: 0, x: 0 },
  initial: { flex: 0, opacity: 0, width: 0, x: -96 },
});

function TranslationHeader({
  canClose,
  label,
  onClose,
  onSwap,
  visibleCount,
}: {
  canClose: boolean;
  label: string;
  onClose: () => void;
  onSwap: () => void;
  visibleCount: number;
}) {
  const mp = translationColumnMotion(visibleCount);
  return (
    <motion.div
      animate={mp.animate}
      className="overflow-hidden bg-white"
      exit={mp.exit}
      initial={mp.initial}
      transition={{ type: "spring", bounce: 0, duration: 0.48 }}
    >
      <div className="flex min-w-[320px] items-center justify-between border-b border-r border-[#f1e8df] bg-white px-5 py-3 last:border-r-0">
        <button
          className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#3a2218] hover:text-[#f6823c]"
          onClick={onSwap}
          type="button"
        >
          <div className="flex flex-col text-left">
            <span className="text-[12px] font-bold">{label}</span>
            <span className="text-[11px] font-normal text-[#7a6758] truncate max-w-[180px]">
              {translations.find((t) => t.label === label)?.name}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 text-[#9b8878]" />
        </button>
        <button
          aria-label={`Close ${label}`}
          className={cn(
            "icon-button flex h-[30px] w-[30px] items-center justify-center text-[#9b8878] hover:bg-[#fbf7f2]",
            !canClose && "cursor-default opacity-35 hover:scale-100",
          )}
          disabled={!canClose}
          onClick={onClose}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function TranslationVerses({
  error,
  isLoading,
  label,
  onComment,
  selectedPassage,
  visibleCount,
  verses,
}: {
  error?: string;
  isLoading: boolean;
  label: string;
  onComment: (target: string) => void;
  selectedPassage: PassageSelection;
  visibleCount: number;
  verses: BibleVerse[];
}) {
  const mp = translationColumnMotion(visibleCount);
  const flashingVerse = useStudyStore((s) => s.flashingVerse);
  const highlightedVerse = useStudyStore((s) => s.highlightedVerse);
  const setHighlightedVerse = useStudyStore((s) => s.setHighlightedVerse);
  return (
    <motion.div
      animate={mp.animate}
      className="overflow-hidden bg-white"
      exit={mp.exit}
      initial={mp.initial}
      transition={{ type: "spring", bounce: 0, duration: 0.48 }}
    >
      <article className="flex min-h-full min-w-[320px] flex-col border-r border-[#f1e8df] last:border-r-0">
        <div className="flex-1 space-y-4 px-5 py-4 pb-24">
          {isLoading && (
            <p className="px-2 py-2 text-[12px] font-medium text-[#7a6758]">
              Loading {label}…
            </p>
          )}
          {!isLoading && error && (
            <p className="px-2 py-2 text-[13px] font-semibold text-[#25140b]">
              {error}
            </p>
          )}
          {!isLoading &&
            !error &&
            verses.map(({ number, text }) => {
              const verseKey = `${selectedPassage.book}-${selectedPassage.chapter}-${number}`;
              const isFlashing = flashingVerse === verseKey;
              return (
                <motion.div
                  animate={
                    isFlashing
                      ? {
                          backgroundColor: ["#ffffff", "#fff3e8", "#ffffff"],
                        }
                      : {}
                  }
                  className={cn(
                    "group relative flex gap-3 px-2 py-2 transition-colors duration-150 ease-out hover:bg-[#fbf7f2]",
                    number === selectedPassage.verse && "bg-[#fff3e8]",
                    highlightedVerse === verseKey && "bg-[#fff3e8]",
                  )}
                  data-verse={number}
                  key={`${label}-${selectedPassage.book}-${selectedPassage.chapter}-${number}`}
                  transition={
                    isFlashing
                      ? { duration: 1.5, repeat: 1, ease: "easeInOut" }
                      : {}
                  }
                >
                  <span className="min-w-4 pt-0.5 text-[11px] font-semibold leading-tight text-[#f6823c]">
                    {number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-[14px] leading-[1.65] text-[#25140b]">
                      {text}
                    </p>
                    <button
                      aria-label={`Comment on ${label} ${selectedPassage.book} ${selectedPassage.chapter}:${number}`}
                      className={cn(
                        "absolute right-2 top-0 bottom-0 my-auto hidden h-7 w-7 items-center justify-center bg-white/80 text-[#9b8878] rounded-full backdrop-blur-sm transition-colors duration-150 ease-out hover:text-[#3a2218] group-hover:flex",
                        (number === selectedPassage.verse || highlightedVerse === verseKey) && "flex",
                      )}
                      onClick={() => {
                        setHighlightedVerse(verseKey);
                        onComment(
                          `${label} ${selectedPassage.book} ${selectedPassage.chapter}:${number}`,
                        );
                      }}
                      type="button"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </article>
    </motion.div>
  );
}

function ReaderFooter() {
  const [activeTab, setActiveTab] = useState("Parallel");
  return (
    <>
      <div className="flex h-11 shrink-0 items-center gap-6 border-t border-[#f1e8df] bg-white px-5">
        {["Parallel", "Cross-Refs", "Notes", "Interlinear"].map((tab) => (
          <button
            className={cn(
              "relative flex h-full items-center gap-1.5 text-[12px]",
              activeTab === tab
                ? "font-semibold text-[#25140b]"
                : "text-[#7a6758]",
            )}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab === "Parallel" && activeTab === tab && (
              <List className="h-3.5 w-3.5" />
            )}
            {tab}
            {activeTab === tab && (
              <motion.span
                className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f6823c] shadow-[0_-1px_4px_rgba(246,130,60,0.4)]"
                layoutId="reader-tab-indicator"
                transition={{ duration: 0.22, ease: [0.645, 0.045, 0.355, 1] }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#f1e8df] bg-white px-5 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-[#fbf7f2]">
            <BookOpen className="h-4 w-4 text-[#3a2218]" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#9b8878]">
              Current Plan
            </p>
            <p className="text-[13px] font-semibold text-[#25140b]">
              Gospel of John
            </p>
          </div>
        </div>
        <div className="min-w-0 flex-1 px-4">
          <p className="mb-1 text-[12px] font-semibold text-[#25140b]">
            Today: John 1–3{" "}
            <span className="font-normal text-[#9b8878]">· Day 3 of 21</span>
          </p>
          <div className="h-1 bg-[#f1e8df]">
            <div className="h-full w-[42%] bg-[#f6823c]" />
          </div>
        </div>
      </div>
    </>
  );
}

function RightPanel({
  commentTarget,
  selectedPassage,
  tab,
  onCollapse,
  onTabChange,
}: {
  commentTarget: string;
  selectedPassage: PassageSelection;
  tab: RightTab;
  onCollapse: () => void;
  onOpenBookmarks?: () => void;
  onTabChange: (tab: RightTab) => void;
}) {
  return (
    <motion.aside
      animate="animate"
      className="relative hidden shrink-0 flex-col overflow-visible border-l border-[#f1e8df] bg-white xl:flex"
      custom="right"
      exit="exit"
      initial="initial"
      transition={panelTransition}
      variants={panelVariants}
    >
      <RailCollapseHandle side="right" onClick={onCollapse} />
      <div className="flex items-center justify-between border-b border-[#f1e8df] bg-white px-4">
        <div className="flex gap-1">
          {(["Study", "Notes", "Audio Notes", "Activity"] as RightTab[]).map(
            (item) => (
              <button
                className={cn(
                  "relative h-11 px-2 text-[12px]",
                  tab === item
                    ? "font-semibold text-[#25140b]"
                    : "text-[#7a6758]",
                )}
                key={item}
                onClick={() => onTabChange(item)}
                type="button"
              >
                {item}
                {tab === item && (
                  <motion.span
                    className="absolute inset-x-2 bottom-0 h-0.5 bg-[#f6823c]"
                    layoutId="right-tab-indicator"
                    transition={{
                      duration: 0.22,
                      ease: [0.645, 0.045, 0.355, 1],
                    }}
                  />
                )}
              </button>
            ),
          )}
        </div>
        <button
          className="icon-button flex h-[30px] w-[30px] items-center justify-center text-[#7a6758] hover:bg-[#fbf7f2]"
          onClick={onCollapse}
          type="button"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div className="h-full" key={tab} {...fadeMotion}>
            {tab === "Study" && (
              <PublicStudy
                commentTarget={commentTarget}
                selectedPassage={selectedPassage}
              />
            )}
            {tab === "Notes" && (
              <PersonalNotes
                commentTarget={commentTarget}
                selectedPassage={selectedPassage}
              />
            )}
            {tab === "Audio Notes" && (
              <AudioNotesPanel selectedPassage={selectedPassage} />
            )}
            {tab === "Activity" && (
              <ActivityPanel selectedPassage={selectedPassage} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

function PublicStudy({
  commentTarget,
  selectedPassage,
}: {
  commentTarget: string;
  selectedPassage: PassageSelection;
}) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [optimisticLikes, setOptimisticLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
  const toggle = (id: string) =>
    setReplyingTo((c) => (c === id ? null : id));

  const guestId = useStudyStore((s) => s.guestId);
  const guestName = useStudyStore((s) => s.guestName);
  const comments = useQuery(api.comments.listForPassage, {
    passageBook: selectedPassage.book,
    passageChapter: selectedPassage.chapter,
  });

  const toggleLike = useMutation(api.comments.toggleLike);
  const createComment = useMutation(api.comments.create);

  const handleLike = async (commentId: string, currentLikes: string[]) => {
    const alreadyLiked = currentLikes.includes(guestId);
    const newCount = alreadyLiked ? currentLikes.length - 1 : currentLikes.length + 1;
    setOptimisticLikes((prev) => ({
      ...prev,
      [commentId]: { count: newCount, liked: !alreadyLiked },
    }));
    try {
      await toggleLike({ id: commentId as Id<"comments">, guestId });
    } catch (e) {
      console.error(e);
      setOptimisticLikes((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    }
  };

  const handleReplySend = async (commentId: string) => {
    const text = replyText[commentId]?.trim();
    if (!text) return;
    const parent = comments?.find((c) => c._id === commentId);
    if (!parent) return;
    try {
      await createComment({
        guestId,
        guestName,
        passageBook: parent.passageBook,
        passageChapter: parent.passageChapter,
        passageVerse: parent.passageVerse,
        translationLabel: parent.translationLabel,
        content: text,
        parentId: commentId as Id<"comments">,
      });
      setReplyText((prev) => ({ ...prev, [commentId]: "" }));
      setReplyingTo(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to send reply.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-4">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div>
          <span className="text-[13px] font-semibold text-[#25140b]">
            Public Study
          </span>
          <span className="ml-2 text-[11px] text-[#9b8878]">
            {comments?.length ?? 0} comments
          </span>
        </div>
        <button
          className="cta-button flex items-center gap-1.5 border border-[#e5d6c9] px-2.5 py-1.5 text-[11px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]"
          type="button"
        >
          <Share2 className="h-3 w-3" />
          Share
        </button>
      </div>

      <div className="mb-4 flex shrink-0 items-center">
        {[
          "https://i.pravatar.cc/96?u=bible-grace",
          "https://i.pravatar.cc/96?u=bible-ethan",
        ].map((src, i) => (
          <Image
            alt=""
            className={cn(
              "h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm",
              i > 0 && "-ml-3",
            )}
            height={32}
            key={src}
            src={src}
            width={32}
          />
        ))}
        <div className="-ml-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#fbf7f2] text-[11px] font-semibold text-[#7a6758] shadow-sm">
          +8
        </div>
      </div>

      <div className="bible-app-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        {comments === undefined ? (
          <p className="text-[12px] text-[#7a6758]">Loading feed...</p>
        ) : comments.length === 0 ? (
          <p className="text-[12px] text-[#7a6758]">
            Be the first to comment on this chapter.
          </p>
        ) : (
          comments.map((comment) => {
            const optimistic = optimisticLikes[comment._id];
            const likesCount = optimistic?.count ?? comment.likes.length;
            const isLiked = optimistic?.liked ?? comment.likes.includes(guestId);
            return (
              <ChatMessage
                key={comment._id}
                avatar={`https://ui-avatars.com/api/?name=${comment.guestName}&background=random`}
                isReplying={replyingTo === comment._id}
                likeIcon={isLiked ? "heart" : "thumb"}
                likes={likesCount}
                name={comment.guestName}
                onReply={() => toggle(comment._id)}
                onLike={() => handleLike(comment._id, comment.likes)}
                reference={`${comment.passageBook} ${comment.passageChapter}:${comment.passageVerse}`}
                replyValue={replyText[comment._id] ?? ""}
                onReplyChange={(v) => setReplyText((prev) => ({ ...prev, [comment._id]: v }))}
                onReplySend={() => handleReplySend(comment._id)}
                time={new Date(comment._creationTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              >
                <RichScriptureText
                  text={comment.content}
                  className="font-serif text-[13px] leading-relaxed text-[#3a2218]"
                />
              </ChatMessage>
            );
          })
        )}
      </div>

      <Composer target={commentTarget} selectedPassage={selectedPassage} />
    </div>
  );
}

function PersonalNotes({
  commentTarget,
  selectedPassage,
}: {
  commentTarget: string;
  selectedPassage: PassageSelection;
}) {
  const guestId = useStudyStore((s) => s.guestId);
  const notes = useQuery(api.notes.listForPassage, {
    guestId,
    passageBook: selectedPassage.book,
    passageChapter: selectedPassage.chapter,
  });

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-4">
      <div className="mb-4 shrink-0">
        <h2 className="text-[13px] font-semibold text-[#25140b]">My Notes</h2>
        <p className="mt-0.5 text-[11px] text-[#9b8878]">
          Private study notes for {commentTarget}
        </p>
      </div>

      <div className="bible-app-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        {notes === undefined ? (
          <p className="text-[12px] text-[#7a6758]">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-[12px] text-[#7a6758]">
            No notes yet for {selectedPassage.book} {selectedPassage.chapter}.
          </p>
        ) : (
          notes.map((note) => (
            <article
              key={note._id}
              className="mb-3 border border-[#f1e8df] bg-[#fbf7f2] p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#25140b] capitalize">
                  {note.type}
                </span>
                <span className="text-[10px] text-[#9b8878]">
                  v{note.passageVerse}
                </span>
              </div>
              <RichScriptureText
                text={note.content}
                className="font-serif text-[13px] leading-relaxed text-[#3a2218]"
              />
            </article>
          ))
        )}
      </div>

      <Composer target={commentTarget} selectedPassage={selectedPassage} />
    </div>
  );
}

function ActivityPanel({
  selectedPassage,
}: {
  selectedPassage: PassageSelection;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [path, setPath] = useState("");
  const [clipHeight, setClipHeight] = useState(0);

  const stats = useQuery(api.activity.statsForPassage, {
    passageBook: selectedPassage.book,
    passageChapter: selectedPassage.chapter,
  });

  const recent = useQuery(api.activity.recentForPassage, {
    passageBook: selectedPassage.book,
    passageChapter: selectedPassage.chapter,
  });

  const displayItems = useMemo(() => {
    if (!recent) return [];
    return recent.map((r, i) => ({
      title: `${r.guestName} left a ${r.type}`,
      meta: r.preview || "Attached a file or audio",
      level: i % 2 === 0 ? 0 : 1,
    }));
  }, [recent]);

  const calculatePath = useCallback(() => {
    if (!containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const bounds = displayItems.map((_, i) => {
      const el = itemRefs.current[i];
      if (!el) return { bottom: 0, height: 0, top: 0 };
      const r = el.getBoundingClientRect();
      return {
        bottom: r.bottom - cr.top,
        height: r.height,
        top: r.top - cr.top,
      };
    });
    if (!bounds.length || bounds[0].height === 0) return;

    const px = 7,
      sx = 25;
    let d = `M ${displayItems[0].level === 1 ? sx : px} ${bounds[0].top + 4}\n`;
    for (let i = 0; i < displayItems.length; i++) {
      const cx = displayItems[i].level === 1 ? sx : px;
      d += `L ${cx} ${bounds[i].bottom}\n`;
      if (i < displayItems.length - 1) {
        const nx = displayItems[i + 1].level === 1 ? sx : px;
        const mid =
          bounds[i].bottom + (bounds[i + 1].top - bounds[i].bottom) / 2;
        d +=
          cx === nx
            ? `L ${nx} ${bounds[i + 1].top}\n`
            : `C ${cx} ${mid}, ${nx} ${mid}, ${nx} ${bounds[i + 1].top}\n`;
      } else {
        d += `L ${cx} ${bounds[i].bottom + 12}\n`;
      }
    }
    setPath(d);
    setClipHeight(bounds[bounds.length - 1]?.bottom + 12 || 0);
  }, [displayItems]);

  useEffect(() => {
    calculatePath();
    const observer = new ResizeObserver(calculatePath);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [calculatePath]);

  return (
    <div className="bible-app-scroll h-full overflow-y-auto px-4 py-4">
      <div className="mb-5">
        <h2 className="text-[13px] font-semibold text-[#25140b]">
          Verse Activity
        </h2>
        <p className="mt-0.5 text-[11px] text-[#9b8878]">
          Live signals around {selectedPassage.book} {selectedPassage.chapter}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-3 border border-[#f1e8df] bg-[#fbf7f2]">
        {[
          [`${stats?.commentCount ?? 0}`, "Comments"],
          [`${stats?.noteCount ?? 0}`, "Notes"],
          [`${stats?.audioCount ?? 0}`, "Audio"],
        ].map(([value, label]) => (
          <div
            className="border-r border-[#f1e8df] p-3 last:border-r-0"
            key={label}
          >
            <p className="text-lg font-semibold text-[#25140b]">{value}</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9b8878]">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="relative" ref={containerRef}>
        <svg className="pointer-events-none absolute left-0 top-0 h-full w-10">
          <path
            d={path}
            fill="none"
            stroke="#f1e8df"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <g clipPath="url(#activity-active-clip)">
            <path
              d={path}
              fill="none"
              stroke="#f6823c"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </g>
          <defs>
            <clipPath id="activity-active-clip">
              <rect height={clipHeight + 10} width="80" x="-10" y="-10" />
            </clipPath>
          </defs>
        </svg>

        <div className="flex flex-col gap-[18px] pl-9">
          {displayItems.length === 0 && (
            <p className="text-[12px] text-[#7a6758]">No activity yet.</p>
          )}
          {displayItems.map((item, i) => (
            <div
              className={cn(
                "transition-colors duration-150 ease-out",
                item.level === 0 && "-ml-4",
              )}
              key={`${item.title}-${i}`}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
            >
              <p
                className={cn(
                  "text-[13px] leading-snug",
                  i <= 3
                    ? "font-semibold text-[#25140b]"
                    : "font-medium text-[#7a6758]",
                )}
              >
                {item.title}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#9b8878] truncate max-w-full">
                {item.meta}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatMessage({
  avatar,
  children,
  isReplying,
  likeIcon = "thumb",
  likes,
  name,
  onReply,
  onLike,
  reference,
  replyValue,
  onReplyChange,
  onReplySend,
  time,
}: {
  avatar: string;
  children: React.ReactNode;
  isReplying: boolean;
  likeIcon?: "heart" | "thumb";
  likes: number;
  name: string;
  onReply: () => void;
  onLike?: () => void;
  reference: string;
  replyValue?: string;
  onReplyChange?: (v: string) => void;
  onReplySend?: () => void;
  time: string;
}) {
  const [flashHeart, setFlashHeart] = useState(false);
  const LikeIcon = likeIcon === "heart" ? Heart : ThumbsUp;

  const handleLike = () => {
    if (likeIcon !== "heart") {
      setFlashHeart(true);
      setTimeout(() => setFlashHeart(false), 600);
    }
    onLike?.();
  };

  return (
    <motion.div
      className="mb-3 border border-[#f1e8df] bg-[#fbf7f2] p-3"
      layout
      transition={{ duration: 0.18, ease: [0.215, 0.61, 0.355, 1] }}
    >
      <div className="mb-2 flex items-start gap-2">
        <Image
          alt=""
          className="h-7 w-7 rounded-full object-cover"
          height={28}
          src={avatar}
          width={28}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-[#25140b]">
              {name}
            </span>
            <span className="bg-[#fff3e8] px-1.5 py-px text-[10px] font-semibold tracking-[0.03em] text-[#3a2218]">
              {reference}
            </span>
          </div>
          <span className="text-[10px] text-[#9b8878]">{time}</span>
        </div>
      </div>

      {children}

      <div className="mt-3 flex items-center justify-between">
        <button
          aria-label={`Reply to ${name}`}
          className="icon-button flex h-7 w-7 items-center justify-center text-[#7a6758] hover:bg-transparent hover:text-[#3a2218]"
          onClick={onReply}
          type="button"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-1.5">
          {flashHeart && (
            <motion.div
              animate={{ scale: [1, 1.4, 0], opacity: [1, 1, 0] }}
              className="absolute"
              initial={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Heart className="h-3.5 w-3.5 fill-current text-[#f6823c]" />
            </motion.div>
          )}
          <motion.button
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold hover:text-[#f6823c]",
              likeIcon === "heart"
                ? "text-[#f6823c] bg-[#fff3e8]"
                : "text-[#7a6758]",
            )}
            type="button"
            onClick={handleLike}
            whileTap={{ scale: 0.8 }}
          >
            <LikeIcon
              className={cn(
                "h-3.5 w-3.5",
                likeIcon === "heart" && "fill-current",
              )}
            />
            {likes}
          </motion.button>
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          isReplying
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-3 border-t border-[#f1e8df] pt-3">
            <ChatInput
              compact
              onChange={onReplyChange}
              onSend={onReplySend}
              placeholder={`Reply to ${name}…`}
              value={replyValue}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VoiceNoteBubble() {
  return (
    <div className="flex items-center gap-2 border border-[#f1e8df] bg-white px-2.5 py-2">
      <button
        className="icon-button flex h-8 w-8 shrink-0 items-center justify-center border border-[#e5d6c9] text-[#3a2218] hover:border-[#f6823c] hover:bg-[#fff3e8]"
        type="button"
      >
        <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
      </button>
      <div className="flex h-7 min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
        {waveform.slice(0, 34).map((h, i) => (
          <span
            className={cn("block w-0.5 bg-[#e5d6c9]", i < 13 && "bg-[#f6823c]")}
            key={`v-${h}-${i}`}
            style={{ height: Math.max(6, h - 4) }}
          />
        ))}
      </div>
      <span className="font-mono text-[10px] text-[#9b8878]">0:42</span>
    </div>
  );
}

function Composer({
  target,
  selectedPassage,
}: {
  target: string;
  selectedPassage: PassageSelection;
}) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const guestId = useStudyStore((s) => s.guestId);
  const guestName = useStudyStore((s) => s.guestName);
  const rightTab = useStudyStore((s) => s.rightTab);
  const versePrefill = useStudyStore((s) => s.versePrefill);
  const setVersePrefill = useStudyStore((s) => s.setVersePrefill);
  const createComment = useMutation(api.comments.create);
  const createNote = useMutation(api.notes.create);

  const handleSend = async () => {
    const text = content.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setContent("");
    setVersePrefill(null);
    try {
      if (rightTab === "Study") {
        await createComment({
          guestId,
          guestName,
          passageBook: selectedPassage.book,
          passageChapter: selectedPassage.chapter,
          passageVerse: selectedPassage.verse,
          translationLabel: "BSB",
          content: text,
        });
      } else {
        await createNote({
          guestId,
          guestName,
          passageBook: selectedPassage.book,
          passageChapter: selectedPassage.chapter,
          passageVerse: selectedPassage.verse,
          content: text,
          type: "observation",
        });
      }
    } catch (e) {
      console.error("Send failed:", e);
      setContent(text);
      toast.error("Failed to send.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      animate={isSending ? { y: [0, -8, 0] } : {}}
      className="mt-4 shrink-0 overflow-hidden border-[1.5px] border-[#e5d6c9] bg-white focus-within:border-[#f6823c]"
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-2 border-b border-[#f1e8df] px-3 py-2">
        {["B", "I", "U"].map((item) => (
          <button
            className="icon-button flex h-6 w-6 items-center justify-center text-[12px] font-semibold text-[#3a2218] hover:text-[#f6823c]"
            key={item}
            type="button"
          >
            {item}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-[#e5d6c9]" />
        <button
          className="icon-button flex h-6 w-6 items-center justify-center text-[#3a2218] hover:text-[#f6823c]"
          type="button"
        >
          <Link2 className="h-3 w-3" />
        </button>
      </div>
      {versePrefill && (
        <div className="flex items-center gap-2 border-b border-[#f1e8df] bg-[#fff3e8] px-3 py-1.5">
          <span className="text-[11px] font-semibold text-[#25140b]">Reference(s):</span>
          <span className="text-[11px] text-[#7a6758]">{versePrefill}</span>
          <button
            aria-label="Clear reference"
            className="icon-button ml-auto flex h-5 w-5 items-center justify-center text-[#9b8878] hover:text-[#3a2218]"
            onClick={() => setVersePrefill(null)}
            type="button"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <ChatInput
        onChange={(v) => setContent(v)}
        onSend={handleSend}
        placeholder={`Write a note on ${target}…`}
        value={content}
      />
    </motion.div>
  );
}

function ChatInput({
  compact = false,
  placeholder,
  value,
  onChange,
  onSend,
}: {
  compact?: boolean;
  placeholder: string;
  value?: string;
  onChange?: (val: string) => void;
  onSend?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      const newHeight = Math.min(el.scrollHeight, 140);
      el.style.height = `${newHeight}px`;
    }
  }, [value]);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 bg-white px-3 py-2",
        compact && "border border-[#e5d6c9]",
      )}
    >
      <textarea
        ref={textareaRef}
        className="w-full resize-none overflow-y-auto bg-transparent text-[13px] leading-relaxed text-[#3a2218] outline-none placeholder:text-[#9b8878] bible-app-scroll py-1"
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend?.();
          }
        }}
        placeholder={placeholder}
        rows={1}
        value={value ?? ""}
      />
      <div className="flex items-center justify-end gap-1">
        <button
          aria-label="Record voice note"
          className="icon-button flex h-7 w-7 shrink-0 items-center justify-center text-[#7a6758] hover:bg-[#fff3e8] hover:text-[#3a2218]"
          onClick={() => toast("Voice note recording coming soon")}
          type="button"
        >
          <Mic className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Send message"
          className="icon-button flex h-7 w-7 shrink-0 items-center justify-center bg-[#3a2218] text-white hover:bg-[#1f1209] active:scale-95"
          onClick={() => onSend?.()}
          type="button"
        >
          <SendHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function FileRow({
  icon,
  label,
  meta,
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border border-[#f1e8df] bg-[#fbf7f2] px-2.5 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-white">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-[#25140b]">
          {label}
        </p>
        <p className="text-[10px] text-[#9b8878]">{meta}</p>
      </div>
      <button
        className="icon-button flex h-[30px] w-[30px] items-center justify-center text-[#9b8878] hover:bg-[#fff3e8]"
        type="button"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AudioNotesPanel({
  selectedPassage,
}: {
  selectedPassage: PassageSelection;
}) {
  const guestId = useStudyStore((s) => s.guestId);
  const guestName = useStudyStore((s) => s.guestName);
  const notes = useQuery(api.audioNotes.listForPassage, {
    passageBook: selectedPassage.book,
    passageChapter: selectedPassage.chapter,
  });
  const createAudioNote = useMutation(api.audioNotes.create);
  const updateTranscript = useMutation(api.audioNotes.updateTranscript);
  const deleteAudioNote = useMutation(api.audioNotes.remove);

  const [isRecording, setIsRecording] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<any[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        // Optimistic UI: Immediately show processing note
        const tempId = Date.now().toString();
        const optimisticNote = {
          _id: tempId,
          guestName,
          _creationTime: Date.now(),
          isProcessing: true,
          transcript: "Uploading...",
        };
        setPendingUploads((prev) => [optimisticNote, ...prev]);

        try {
          // 1. Get signed URL from our Next.js API
          const presignRes = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: "audio-note.webm",
              contentType: "audio/webm",
            }),
          });
          const { uploadUrl, publicUrl, key } = await presignRes.json();

          // 2. Upload to Cloudflare R2 via PUT (wait for it before proceeding)
          setPendingUploads((prev) =>
            prev.map((p) =>
              p._id === tempId ? { ...p, transcript: "Saving to R2..." } : p,
            ),
          );
          await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "audio/webm" },
            body: blob,
          });

          setPendingUploads((prev) =>
            prev.map((p) =>
              p._id === tempId ? { ...p, transcript: "Transcribing..." } : p,
            ),
          );

          // 3. Create DB record with R2 URL
          const noteId = await createAudioNote({
            guestId,
            guestName,
            passageBook: selectedPassage.book,
            passageChapter: selectedPassage.chapter,
            passageVerse: selectedPassage.verse,
            audioUrl: publicUrl,
            audioKey: key,
            size: blob.size,
            mimeType: "audio/webm",
            duration: 0,
          });

          // Remove from pending since Convex will now show it as isProcessing=true
          setPendingUploads((prev) => prev.filter((p) => p._id !== tempId));

          // 4. Trigger Deepgram transcript with R2 URL
          const trRes = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: publicUrl }),
          });
          const { transcript } = await trRes.json();

          if (transcript) {
            await updateTranscript({ id: noteId, transcript });
          } else {
            await updateTranscript({
              id: noteId,
              transcript: "Transcription failed.",
            });
          }
        } catch (e) {
          toast.error("Failed to process audio");
          setPendingUploads((prev) => prev.filter((p) => p._id !== tempId));
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
  };

  const allNotes = [...pendingUploads, ...(notes || [])];

  return (
    <div className="bible-app-scroll h-full overflow-y-auto px-4 py-4">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[13px] font-semibold text-[#25140b]">
            Audio Notes
          </h2>
          <p className="mt-0.5 text-[11px] text-[#9b8878]">
            Recordings, uploads, playback, and transcripts
          </p>
        </div>
        <motion.button
          className={cn(
            "cta-button flex items-center gap-1.5 border border-[#e5d6c9] px-2.5 py-1.5 text-[11px] font-semibold",
            isRecording
              ? "bg-[#fff3e8] text-[#f6823c]"
              : "bg-white text-[#3a2218] hover:bg-[#fbf7f2]",
          )}
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          whileTap={{ scale: 0.9 }}
        >
          {isRecording ? (
            <span className="h-2 w-2 bg-[#f6823c] rounded-full animate-pulse" />
          ) : (
            <Mic className="h-3 w-3" />
          )}
          {isRecording ? "Stop" : "Record"}
        </motion.button>
      </div>
      <div className="space-y-3">
        {notes === undefined && pendingUploads.length === 0 ? (
          <p className="text-[12px] text-[#7a6758]">Loading audio notes...</p>
        ) : allNotes.length === 0 ? (
          <p className="text-[12px] text-[#7a6758]">No audio notes yet.</p>
        ) : (
          allNotes.map((n) => (
            <AudioNote
              key={n._id}
              note={n}
              onDelete={() => deleteAudioNote({ id: n._id, guestId })}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AudioNote({
  note,
  compact = false,
  onDelete,
}: {
  note: any;
  compact?: boolean;
  onDelete?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (note.url) {
      audioRef.current = new Audio(note.url);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, [note.url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <section
      className={cn(
        "border border-[#f1e8df] bg-[#fbf7f2] p-3",
        compact && "mt-4",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Mic className="h-3.5 w-3.5 text-[#f6823c]" />
        <span className="text-[12px] font-semibold text-[#25140b]">
          Audio Note
        </span>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center bg-[#3a2218] text-[10px] font-semibold text-[#f6823c]">
          {note.guestName.startsWith("Anonymous-")
            ? "AN"
            : note.guestName.slice(0, 2).toUpperCase()}
        </div>
        <span className="text-[11px] font-medium text-[#3a2218]">
          {note.guestName}
        </span>
        <span className="text-[10px] text-[#9b8878]">
          · {new Date(note._creationTime).toLocaleDateString()}
        </span>
        {onDelete && (
          <button
            className="ml-auto text-[#9b8878] hover:text-[#f6823c]"
            onClick={onDelete}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="mb-2 flex items-center gap-2">
        <button
          className="icon-button flex h-[38px] w-[38px] items-center justify-center border-2 border-[#3a2218] text-[#3a2218] hover:bg-[#3a2218] hover:text-white"
          type="button"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <span className="h-2 w-2 bg-current" />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
          )}
        </button>
        <div className="flex h-8 flex-1 items-center gap-0.5 overflow-hidden">
          {waveform.map((h, i) => (
            <span
              className={cn(
                "block w-0.5 bg-[#e5d6c9]",
                i < 18 && "bg-[#f6823c]",
              )}
              key={`${h}-${i}`}
              style={{ height: h }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-[#9b8878]">00:00</span>
        <button
          className="cta-button border border-[#e5d6c9] px-2 py-0.5 text-[11px] font-semibold text-[#3a2218]"
          type="button"
        >
          1.25×
        </button>
        <span className="font-mono text-[11px] text-[#9b8878]">03:42</span>
      </div>
    </section>
  );
}

function RailCollapseHandle({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "icon-button rail-handle absolute top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center border border-[#f1e8df] bg-white text-[#7a6758] shadow-[0_8px_24px_rgba(31,18,9,0.12)] hover:bg-[#fbf7f2]",
        side === "left" ? "-right-4" : "-left-4",
      )}
      onClick={onClick}
      type="button"
    >
      {side === "left" ? (
        <ChevronsLeft className="h-3.5 w-3.5" />
      ) : (
        <ChevronsRight className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function RailOpenHandle({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <motion.div
      animate="animate"
      className="relative hidden w-3 shrink-0 bg-white lg:block"
      custom={side}
      exit="exit"
      initial="initial"
      transition={{ duration: 0.22, ease: [0.215, 0.61, 0.355, 1] }}
      variants={{
        animate: { opacity: 1, width: 12, x: 0 },
        exit: { opacity: 0, width: 0, x: side === "left" ? -8 : 8 },
        initial: { opacity: 0, width: 0, x: side === "left" ? -8 : 8 },
      }}
    >
      <button
        className={cn(
          "icon-button rail-handle absolute top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center border border-[#f1e8df] bg-white text-[#7a6758] shadow-[0_8px_24px_rgba(31,18,9,0.12)] hover:bg-[#fbf7f2]",
          side === "left" ? "-right-4" : "-left-4",
        )}
        onClick={onClick}
        type="button"
      >
        {side === "left" ? (
          <ChevronsRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronsLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </motion.div>
  );
}
