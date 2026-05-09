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
  Download,
  FileText,
  Heart,
  ImageIcon,
  Link2,
  List,
  MessageCircle,
  Mic,
  Play,
  Search,
  SendHorizontal,
  Share2,
  ThumbsUp,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { ProductShell } from "@/components/product-shell";
import { Toaster } from "@/components/ui/sonner";
import { type BibleVerse } from "@/lib/helloao";
import {
  useBibleBooks,
  useBibleChapters,
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

  const [storeReady, setStoreReady] = useState(() =>
    useStudyStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (useStudyStore.persist.hasHydrated()) {
      setStoreReady(true);
      return;
    }
    return useStudyStore.persist.onFinishHydration(() => setStoreReady(true));
  }, []);

  const { leftOpen, rightOpen } = sidebars;

  const bookId = useMemo(
    () => getBookId(bibleBooks, selectedPassage.book),
    [bibleBooks, selectedPassage.book],
  );

  const chapterQueries = useBibleChapters(
    visibleVersions,
    bookId,
    selectedPassage.chapter,
  );

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
      setCommentTarget(target);
      setRightTab("Notes");
      patchSidebars({ rightOpen: true });
    },
    [setCommentTarget, setRightTab, patchSidebars],
  );

  return (
    <ProductShell>
      <div className="flex flex-1 overflow-hidden bg-white">
        {!storeReady ? (
          <div className="min-w-0 flex-1 bg-white" />
        ) : (
          <>
            <AnimatePresence initial={false}>
              {leftOpen && (
                <LeftPanel
                  bibleBooks={bibleBooks}
                  bibleBooksError={bibleBooksError}
                  bibleBooksLoading={bibleBooksLoading}
                  chapterVerses={chapterVerses}
                  selectedPassage={selectedPassage}
                  visibleVersions={visibleVersions}
                  onCollapse={() => patchSidebars({ leftOpen: false })}
                  onPassageChange={handlePassageChange}
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
              onBookmark={() =>
                showToast(`Bookmarked ${formatReference(selectedPassage)}`)
              }
              onPassageChange={handlePassageChange}
              onToast={showToast}
              onVerseComment={handleVerseComment}
              onVersionsChange={setVisibleVersions}
            />
            <AnimatePresence initial={false}>
              {rightOpen && (
                <RightPanel
                  commentTarget={commentTarget}
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
    </ProductShell>
  );
}

function LeftPanel({
  bibleBooks,
  bibleBooksError,
  bibleBooksLoading,
  chapterVerses,
  selectedPassage,
  visibleVersions,
  onCollapse,
  onPassageChange,
}: {
  bibleBooks: BibleBookIndex[];
  bibleBooksError: string | null;
  bibleBooksLoading: boolean;
  chapterVerses: Record<string, BibleVerse[]>;
  selectedPassage: PassageSelection;
  visibleVersions: string[];
  onCollapse: () => void;
  onPassageChange: (selection: PassageSelection) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(true);
  const [indexOpen, setIndexOpen] = useState(true);
  const [openBook, setOpenBook] = useState(selectedPassage.book);
  const [openChapter, setOpenChapter] = useState(
    chapterKeyFor(selectedPassage),
  );
  const [activeFilter, setActiveFilter] = useState<
    "All" | "Old Testament" | "New Testament"
  >("All");

  useEffect(() => {
    setOpenBook(selectedPassage.book);
    setOpenChapter(chapterKeyFor(selectedPassage));
  }, [selectedPassage]);

  const referenceMatch = useMemo(
    () =>
      searchTerm.trim().length > 0
        ? parseVerseReference(searchTerm, bibleBooks)
        : null,
    [searchTerm, bibleBooks],
  );

  const searchHits = useMemo((): SearchHit[] => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 2) return [];
    const hits: SearchHit[] = [];
    for (const label of visibleVersions) {
      for (const { number, text } of chapterVerses[label] ?? []) {
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
  }, [searchTerm, chapterVerses, visibleVersions, selectedPassage]);

  const filteredBibleBooks = useMemo(
    () =>
      activeFilter === "All"
        ? bibleBooks
        : bibleBooks.filter(({ testament }) => testament === activeFilter),
    [activeFilter, bibleBooks],
  );

  const hasQuery = searchTerm.trim().length >= 2;
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
      <div className="border-b border-[#f1e8df] px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-2 text-[13px] font-semibold text-[#25140b]"
            onClick={() =>
              setSearchOpen((o) => {
                if (!o) setIndexOpen(false);
                return !o;
              })
            }
            type="button"
          >
            Search Scripture
            {searchOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-[#9b8878]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[#9b8878]" />
            )}
          </button>
          <button
            className="icon-button flex h-[30px] w-[30px] items-center justify-center text-[#7a6758] hover:bg-[#fbf7f2]"
            onClick={onCollapse}
            type="button"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            searchOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mt-3 flex items-center gap-2 bg-[#fbf7f2] px-3 py-2">
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

            <div className="mb-2 mt-3 flex flex-wrap items-center gap-1.5">
              {(["All", "Old Testament", "New Testament"] as const).map(
                (filter) => (
                  <button
                    className={cn(
                      "cta-button px-3 py-1 text-[11px] font-semibold",
                      activeFilter === filter
                        ? "bg-[#3a2218] text-white"
                        : "border border-[#e5d6c9] bg-white text-[#3a2218]",
                    )}
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    type="button"
                  >
                    {filter}
                  </button>
                ),
              )}
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
                    Results in {selectedPassage.book} {selectedPassage.chapter}
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

            {!hasQuery && (
              <p className="px-1 py-1 text-[11px] font-medium text-[#9b8878]">
                Searching {selectedPassage.book} {selectedPassage.chapter}{" "}
                across {visibleVersions.join(", ")}
              </p>
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
          Full Index
          {indexOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-[#9b8878]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[#9b8878]" />
          )}
        </button>

        <div
          className={cn(
            "grid px-2 transition-[grid-template-rows,opacity] duration-200 ease-out",
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
              className="flex w-40 items-center justify-between gap-2 border border-[#e5d6c9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3a2218] outline-none transition-colors duration-150 ease-out hover:border-[#f6823c] focus:border-[#f6823c]"
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
                  {availableTranslations.map(({ label, name }) => {
                    const selected = visibleVersions.includes(label);
                    return (
                      <button
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-left text-[12px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]",
                          selected &&
                            "cursor-default text-[#b09d8d] hover:bg-white",
                        )}
                        disabled={selected}
                        key={label}
                        onClick={() => handleVersionChoice(label)}
                        title={name}
                        type="button"
                      >
                        {label}
                        {selected && (
                          <span className="text-[10px] font-medium text-[#9b8878]">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {availableTranslations.length === 0 && (
                    <p className="px-3 py-2 text-[12px] font-medium text-[#9b8878]">
                      No translations found
                    </p>
                  )}
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
          className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#3a2218] hover:text-[#f6823c]"
          onClick={onSwap}
          type="button"
        >
          {label}
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
            verses.map(({ number, text }) => (
              <div
                className={cn(
                  "group relative flex gap-3 px-2 py-2 transition-colors duration-150 ease-out hover:bg-[#fbf7f2]",
                  number === selectedPassage.verse && "bg-[#fff3e8]",
                )}
                data-verse={number}
                key={`${label}-${selectedPassage.book}-${selectedPassage.chapter}-${number}`}
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
                      "absolute right-2 top-2 hidden h-7 w-7 items-center justify-center bg-white/80 text-[#9b8878] backdrop-blur-sm transition-colors duration-150 ease-out hover:text-[#3a2218] group-hover:flex",
                      number === selectedPassage.verse && "flex",
                    )}
                    onClick={() =>
                      onComment(
                        `${label} ${selectedPassage.book} ${selectedPassage.chapter}:${number}`,
                      )
                    }
                    type="button"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
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
                className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f6823c]"
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
  tab,
  onCollapse,
  onTabChange,
}: {
  commentTarget: string;
  tab: RightTab;
  onCollapse: () => void;
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
            {tab === "Study" && <PublicStudy commentTarget={commentTarget} />}
            {tab === "Notes" && <PersonalNotes commentTarget={commentTarget} />}
            {tab === "Audio Notes" && <AudioNotesPanel />}
            {tab === "Activity" && <ActivityPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

function PublicStudy({ commentTarget }: { commentTarget: string }) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const toggle = (name: string) =>
    setReplyingTo((c) => (c === name ? null : name));

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-4">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div>
          <span className="text-[13px] font-semibold text-[#25140b]">
            Public Study
          </span>
          <span className="ml-2 text-[11px] text-[#9b8878]">12 members</span>
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
          "https://i.pravatar.cc/96?u=bible-miriam",
          "https://i.pravatar.cc/96?u=bible-aaron",
        ].map((src, i) => (
          <img
            alt=""
            className={cn(
              "h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm",
              i > 0 && "-ml-3",
            )}
            key={src}
            src={src}
          />
        ))}
        <div className="-ml-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#fbf7f2] text-[11px] font-semibold text-[#7a6758] shadow-sm">
          +8
        </div>
      </div>

      <div className="bible-app-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        <ChatMessage
          avatar="https://i.pravatar.cc/96?u=bible-grace"
          isReplying={replyingTo === "Grace M."}
          likes={12}
          name="Grace M."
          onReply={() => toggle("Grace M.")}
          reference="Genesis 1:1"
          time="2h ago"
        >
          <p className="font-serif text-[13px] leading-relaxed text-[#3a2218]">
            "In the beginning" — the opening words ground everything in God's
            sovereign creative act. Nothing precedes Him.
          </p>
        </ChatMessage>
        <ChatMessage
          avatar="https://i.pravatar.cc/96?u=bible-ethan"
          isReplying={replyingTo === "Ethan L."}
          likeIcon="heart"
          likes={8}
          name="Ethan L."
          onReply={() => toggle("Ethan L.")}
          reference="Genesis 1:2"
          time="1h ago"
        >
          <p className="font-serif text-[13px] leading-relaxed text-[#3a2218]">
            The formless void before creation reminds me that order is a gift,
            not a given.
          </p>
        </ChatMessage>
        <ChatMessage
          avatar="https://i.pravatar.cc/96?u=bible-miriam"
          isReplying={replyingTo === "Miriam A."}
          likes={5}
          name="Miriam A."
          onReply={() => toggle("Miriam A.")}
          reference="Genesis 1:3"
          time="28m ago"
        >
          <VoiceNoteBubble />
        </ChatMessage>
      </div>

      <Composer target={commentTarget} />
    </div>
  );
}

function PersonalNotes({ commentTarget }: { commentTarget: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-4">
      <div className="mb-4 shrink-0">
        <h2 className="text-[13px] font-semibold text-[#25140b]">My Notes</h2>
        <p className="mt-0.5 text-[11px] text-[#9b8878]">
          Private study notes for {commentTarget}
        </p>
      </div>

      <div className="bible-app-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        <article className="mb-3 border border-[#f1e8df] bg-[#fbf7f2] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#25140b]">
              Observation
            </span>
            <span className="text-[10px] text-[#9b8878]">Today</span>
          </div>
          <p className="font-serif text-[13px] leading-relaxed text-[#3a2218]">
            The Hebrew "Bereshit" carries weight — not just a start in time but
            the founding moment of all existence.
          </p>
        </article>

        <article className="mb-3 border border-[#f1e8df] bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#25140b]">
              Images
            </span>
            <button
              className="cta-button flex items-center gap-1.5 border border-[#e5d6c9] px-2.5 py-1.5 text-[11px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]"
              type="button"
            >
              <Upload className="h-3 w-3" />
              Upload
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-[#f1e8df] bg-[#fbf7f2] p-2">
              <div className="mb-2 flex h-20 items-center justify-center bg-white text-[#f6823c]">
                <ImageIcon className="h-5 w-5" />
              </div>
              <p className="truncate text-[11px] font-semibold text-[#3a2218]">
                creation-timeline.png
              </p>
            </div>
            <div className="border border-dashed border-[#e5d6c9] bg-[#fbf7f2] p-2">
              <div className="flex h-20 items-center justify-center text-[#9b8878]">
                <Upload className="h-5 w-5" />
              </div>
            </div>
          </div>
        </article>
      </div>

      <Composer target={commentTarget} />
    </div>
  );
}

function ActivityPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [path, setPath] = useState("");
  const [clipHeight, setClipHeight] = useState(0);

  const calculatePath = useCallback(() => {
    if (!containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const bounds = activityItems.map((_, i) => {
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
    let d = `M ${activityItems[0].level === 1 ? sx : px} ${bounds[0].top + 4}\n`;
    for (let i = 0; i < activityItems.length; i++) {
      const cx = activityItems[i].level === 1 ? sx : px;
      d += `L ${cx} ${bounds[i].bottom}\n`;
      if (i < activityItems.length - 1) {
        const nx = activityItems[i + 1].level === 1 ? sx : px;
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
    setClipHeight(bounds[3].bottom + 12);
  }, []);

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
          Live signals around Genesis 1
        </p>
      </div>

      <div className="mb-5 grid grid-cols-3 border border-[#f1e8df] bg-[#fbf7f2]">
        {[
          ["42", "Read"],
          ["18", "Studied"],
          ["27", "Comments"],
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
          {activityItems.map((item, i) => (
            <div
              className={cn(
                "transition-colors duration-150 ease-out",
                item.level === 0 && "-ml-4",
              )}
              key={item.title}
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
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#9b8878]">
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
  reference,
  time,
}: {
  avatar: string;
  children: React.ReactNode;
  isReplying: boolean;
  likeIcon?: "heart" | "thumb";
  likes: number;
  name: string;
  onReply: () => void;
  reference: string;
  time: string;
}) {
  const LikeIcon = likeIcon === "heart" ? Heart : ThumbsUp;
  return (
    <motion.div
      className="mb-3 border border-[#f1e8df] bg-[#fbf7f2] p-3"
      layout
      transition={{ duration: 0.18, ease: [0.215, 0.61, 0.355, 1] }}
    >
      <div className="mb-2 flex items-center gap-2">
        <img
          alt=""
          className="h-7 w-7 rounded-full object-cover"
          src={avatar}
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-[12px] font-semibold text-[#25140b]">
            {name}
          </span>
          <span className="text-[10px] text-[#9b8878]">{time}</span>
        </div>
        <span className="bg-[#fff3e8] px-1.5 py-px text-[10px] font-semibold tracking-[0.03em] text-[#3a2218]">
          {reference}
        </span>
      </div>

      {children}

      <div className="mt-3 flex items-center justify-between">
        <button
          aria-label={`Reply to ${name}`}
          className="icon-button flex h-7 w-7 items-center justify-center text-[#7a6758] hover:bg-white hover:text-[#3a2218]"
          onClick={onReply}
          type="button"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </button>
        <button
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7a6758] hover:text-[#3a2218]"
          type="button"
        >
          <LikeIcon className="h-3.5 w-3.5" />
          {likes}
        </button>
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
            <ChatInput compact placeholder={`Reply to ${name}…`} />
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

function Composer({ target }: { target: string }) {
  return (
    <div className="mt-4 shrink-0 overflow-hidden border-[1.5px] border-[#e5d6c9] bg-white focus-within:border-[#f6823c]">
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
      <ChatInput placeholder={`Write a note on ${target}…`} />
    </div>
  );
}

function ChatInput({
  compact = false,
  placeholder,
}: {
  compact?: boolean;
  placeholder: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 bg-white px-3 py-2",
        compact && "border border-[#e5d6c9]",
      )}
    >
      <input
        className="min-w-0 flex-1 bg-transparent text-[13px] text-[#3a2218] outline-none placeholder:text-[#9b8878]"
        placeholder={placeholder}
      />
      <button
        aria-label="Record voice note"
        className="icon-button flex h-7 w-7 items-center justify-center text-[#7a6758] hover:bg-[#fff3e8] hover:text-[#3a2218]"
        type="button"
      >
        <Mic className="h-3.5 w-3.5" />
      </button>
      <button
        aria-label="Send message"
        className="icon-button flex h-7 w-7 items-center justify-center bg-[#3a2218] text-white hover:bg-[#1f1209]"
        type="button"
      >
        <SendHorizontal className="h-3.5 w-3.5" />
      </button>
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

function AudioNotesPanel() {
  return (
    <div className="bible-app-scroll h-full overflow-y-auto px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-[#25140b]">
            Audio Notes
          </h2>
          <p className="mt-0.5 text-[11px] text-[#9b8878]">
            Recordings, uploads, playback, and transcripts
          </p>
        </div>
        <button
          className="cta-button flex items-center gap-1.5 border border-[#e5d6c9] px-2.5 py-1.5 text-[11px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]"
          type="button"
        >
          <Mic className="h-3 w-3" />
          Record
        </button>
      </div>
      <div className="space-y-3">
        <AudioNote />
        <AudioNote />
      </div>
    </div>
  );
}

function AudioNote({ compact = false }: { compact?: boolean }) {
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
          PA
        </div>
        <span className="text-[11px] font-medium text-[#3a2218]">
          Pastor Aaron
        </span>
        <span className="text-[10px] text-[#9b8878]">· Today, 9:41 AM</span>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <button
          className="icon-button flex h-[38px] w-[38px] items-center justify-center border-2 border-[#3a2218] text-[#3a2218] hover:bg-[#3a2218] hover:text-white"
          type="button"
        >
          <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
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
