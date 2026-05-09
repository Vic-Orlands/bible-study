"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Filter,
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
import { cn } from "@/lib/utils";

type RightTab = "Study" | "Notes" | "Audio Notes" | "Activity";
type PassageSelection = {
  book: string;
  chapter: number;
  verse: number;
};

const STUDY_SIDEBARS_STORAGE_KEY = "bible-study:study-sidebars";

type StudySidebarsState = {
  leftOpen: boolean;
  rightOpen: boolean;
};

const searchResults = [
  [
    "John 1:1",
    "NIV",
    "In the beginning was the Word, and the Word was with God, and the Word was God.",
  ],
  [
    "Romans 8:28",
    "ESV",
    "And we know that for those who love God all things work together for good.",
  ],
  ["Psalm 23:1", "KJV", "The LORD is my shepherd; I shall not want."],
  [
    "John 3:16",
    "NIV",
    "For God so loved the world, that he gave his only Son.",
  ],
  [
    "Philippians 4:13",
    "ESV",
    "I can do all things through him who strengthens me.",
  ],
];

const bibleIndex = [
  {
    book: "Genesis",
    chapters: [
      { chapter: 1, verses: 31 },
      { chapter: 2, verses: 25 },
      { chapter: 3, verses: 24 },
    ],
    level: 0,
  },
  {
    book: "Exodus",
    chapters: [
      { chapter: 1, verses: 22 },
      { chapter: 2, verses: 25 },
      { chapter: 3, verses: 22 },
    ],
    level: 1,
  },
  {
    book: "Leviticus",
    chapters: [
      { chapter: 1, verses: 17 },
      { chapter: 2, verses: 16 },
    ],
    level: 1,
  },
  {
    book: "Numbers",
    chapters: [
      { chapter: 1, verses: 54 },
      { chapter: 2, verses: 34 },
    ],
    level: 0,
  },
  {
    book: "John",
    chapters: [
      { chapter: 1, verses: 51 },
      { chapter: 2, verses: 25 },
      { chapter: 3, verses: 36 },
    ],
    level: 1,
  },
];

const translationVerses: Record<string, string[]> = {
  KJV: [
    "In the beginning was the Word, and the Word was with God, and the Word was God.",
    "The same was in the beginning with God.",
    "All things were made by him; and without him was not any thing made that was made.",
    "In him was life; and the life was the light of men.",
    "And the light shineth in darkness; and the darkness comprehended it not.",
    "There was a man sent from God, whose name was John.",
  ],
  NIV: [
    "In the beginning was the Word, and the Word was with God, and the Word was God.",
    "He was with God in the beginning.",
    "Through him all things were made; without him nothing was made that has been made.",
    "In him was life, and that life was the light of all mankind.",
    "The light shines in the darkness, and the darkness has not overcome it.",
    "There was a man sent from God whose name was John.",
  ],
  ESV: [
    "In the beginning was the Word, and the Word was with God, and the Word was God.",
    "He was in the beginning with God.",
    "All things were made through him, and without him was not any thing made that was made.",
    "In him was life, and the life was the light of men.",
    "The light shines in the darkness, and the darkness has not overcome it.",
    "There was a man sent from God, whose name was John.",
  ],
};

const translations = [
  {
    label: "KJV",
  },
  {
    label: "NIV",
  },
  {
    label: "ESV",
  },
  { label: "NASB" },
  { label: "NLT" },
  { label: "NKJV" },
  { label: "CSB" },
  { label: "AMP" },
];

const waveform = [
  8, 12, 18, 24, 16, 28, 20, 14, 26, 18, 12, 22, 30, 16, 10, 24, 20, 14, 28, 18,
  12, 16, 24, 20, 14, 10, 18, 26, 12, 22, 16, 28, 20, 14, 8, 18, 24, 16, 12, 26,
  20, 14, 10, 22, 18, 28, 16, 12, 20, 24,
];

const activityItems = [
  {
    title: "42 readers opened John 1:3 today",
    meta: "Reading activity",
    level: 0,
  },
  {
    title: "Grace M. commented on creation through the Word",
    meta: "Comment",
    level: 1,
  },
  {
    title: "John 1:3 became the most discussed verse in this study",
    meta: "Trend",
    level: 1,
  },
  { title: "7 personal notes were added", meta: "Study notes", level: 0 },
  { title: "3 audio reflections were recorded", meta: "Audio", level: 1 },
  {
    title: "12 members compared KJV, NIV, and ESV",
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

const formatPassage = ({ book, chapter, verse }: PassageSelection) =>
  `${book} ${chapter} : ${verse}`;

const chapterKeyFor = ({ book, chapter }: PassageSelection) => `${book}-${chapter}`;

const getChapter = (bookName: string, chapterNumber: number) =>
  bibleIndex
    .find(({ book }) => book === bookName)
    ?.chapters.find(({ chapter }) => chapter === chapterNumber);

const getVerses = (label: string, selection: PassageSelection) => {
  const source = translationVerses[label] ?? translationVerses.NIV;

  if (selection.book === "John" && selection.chapter === 1) {
    if (selection.verse <= source.length) {
      return source;
    }

    return [
      ...source,
      ...Array.from(
        { length: selection.verse - source.length },
        (_, index) =>
          `John 1:${source.length + index + 1} rendered in ${label}. This mock continuation keeps the selected verse visible while the API integration comes later.`,
      ),
    ];
  }

  const count = Math.min(
    getChapter(selection.book, selection.chapter)?.verses ?? 6,
    Math.max(6, selection.verse),
  );
  return Array.from({ length: count }, (_, index) => {
    const verse = index + 1;
    return `${selection.book} ${selection.chapter}:${verse} rendered in ${label}. This mock passage keeps the reading layout responsive while the API integration comes later.`;
  });
};

function useOutsideClick<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose, open]);

  return ref;
}

export default function BibleApp() {
  const [rightTab, setRightTab] = useState<RightTab>("Notes");
  const [sidebars, setSidebars] = useState<StudySidebarsState>({
    leftOpen: true,
    rightOpen: true,
  });
  const [sidebarsReady, setSidebarsReady] = useState(false);
  const [commentTarget, setCommentTarget] = useState("John 1:3");
  const [selectedPassage, setSelectedPassage] = useState<PassageSelection>({
    book: "John",
    chapter: 1,
    verse: 3,
  });
  const { leftOpen, rightOpen } = sidebars;

  useEffect(() => {
    const saved = window.localStorage.getItem(STUDY_SIDEBARS_STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<StudySidebarsState>;

        setSidebars({
          leftOpen:
            typeof parsed.leftOpen === "boolean" ? parsed.leftOpen : true,
          rightOpen:
            typeof parsed.rightOpen === "boolean" ? parsed.rightOpen : true,
        });
      } catch {
        window.localStorage.removeItem(STUDY_SIDEBARS_STORAGE_KEY);
      }
    }

    setSidebarsReady(true);
  }, []);

  const updateSidebars = useCallback((nextState: Partial<StudySidebarsState>) => {
    setSidebars((current) => {
      const next = { ...current, ...nextState };
      window.localStorage.setItem(
        STUDY_SIDEBARS_STORAGE_KEY,
        JSON.stringify(next),
      );

      return next;
    });
  }, []);

  const setLeftOpen = useCallback(
    (open: boolean) => updateSidebars({ leftOpen: open }),
    [updateSidebars],
  );

  const setRightOpen = useCallback(
    (open: boolean) => updateSidebars({ rightOpen: open }),
    [updateSidebars],
  );

  const showToast = useCallback((title: string, description?: string) => {
    toast(title, {
      description,
      icon: <span className="mt-1 flex h-2 w-2 shrink-0 bg-[#f6823c]" />,
    });
  }, []);

  const handlePassageChange = (selection: PassageSelection) => {
    setSelectedPassage(selection);
    setCommentTarget(`${selection.book} ${selection.chapter}:${selection.verse}`);
    showToast(`Opened ${selection.book} ${selection.chapter}:${selection.verse}`);
  };

  const handleVerseComment = (target: string) => {
    setCommentTarget(target);
    setRightTab("Notes");
    setRightOpen(true);
  };

  return (
    <ProductShell>
      <div className="flex flex-1 overflow-hidden bg-white">
        {!sidebarsReady ? (
          <div className="min-w-0 flex-1 bg-white" />
        ) : (
          <>
            <AnimatePresence initial={false}>
              {leftOpen && (
                <LeftPanel
                  selectedPassage={selectedPassage}
                  onCollapse={() => setLeftOpen(false)}
                  onPassageChange={handlePassageChange}
                />
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {!leftOpen && (
                <RailOpenHandle side="left" onClick={() => setLeftOpen(true)} />
              )}
            </AnimatePresence>
            <Reader
              selectedPassage={selectedPassage}
              onBookmark={() =>
                showToast(`Bookmarked ${selectedPassage.book} ${selectedPassage.chapter}:${selectedPassage.verse}`)
              }
              onPassageChange={handlePassageChange}
              onToast={showToast}
              onVerseComment={handleVerseComment}
            />
            <AnimatePresence initial={false}>
              {rightOpen && (
                <RightPanel
                  commentTarget={commentTarget}
                  tab={rightTab}
                  onCollapse={() => setRightOpen(false)}
                  onTabChange={setRightTab}
                />
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {!rightOpen && (
                <RailOpenHandle side="right" onClick={() => setRightOpen(true)} />
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
  selectedPassage,
  onCollapse,
  onPassageChange,
}: {
  selectedPassage: PassageSelection;
  onCollapse: () => void;
  onPassageChange: (selection: PassageSelection) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(true);
  const [indexOpen, setIndexOpen] = useState(true);
  const [openBook, setOpenBook] = useState(selectedPassage.book);
  const [openChapter, setOpenChapter] = useState(chapterKeyFor(selectedPassage));

  useEffect(() => {
    setOpenBook(selectedPassage.book);
    setOpenChapter(chapterKeyFor(selectedPassage));
  }, [selectedPassage]);

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
            onClick={() => {
              setSearchOpen((open) => {
                const nextOpen = !open;
                if (nextOpen) {
                  setIndexOpen(false);
                }
                return nextOpen;
              });
            }}
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
              <Search className="h-3.5 w-3.5 text-[#9b8878]" />
              <input
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[#25140b] outline-none placeholder:text-[#9b8878]"
                placeholder="Search verses, topics, or keywords"
              />
              <button
                className="icon-button flex h-5 w-5 items-center justify-center text-[#9b8878]"
                type="button"
              >
                <Filter className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mb-2 mt-3 flex items-center gap-1.5">
              <button
                className="cta-button bg-[#3a2218] px-3 py-1 text-[11px] font-semibold text-white"
                type="button"
              >
                All
              </button>
              <button
                className="cta-button border border-[#e5d6c9] bg-white px-3 py-1 text-[11px] font-medium text-[#3a2218]"
                type="button"
              >
                Old Testament
              </button>
            </div>

            <div className="mt-2 flex gap-4">
              <button
                className="border-b-2 border-[#f6823c] pb-1 text-[12px] font-semibold text-[#25140b]"
                type="button"
              >
                Notes
              </button>
              <button className="pb-1 text-[12px] text-[#7a6758]" type="button">
                Audio
              </button>
              <button className="pb-1 text-[12px] text-[#7a6758]" type="button">
                Files
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bible-app-scroll flex-1 overflow-y-auto py-3">
        {searchOpen && (
          <section className="px-3">
            <div className="mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9b8878]">
                Top Results
              </span>
            </div>

            {searchResults.map(([passage, version, text], index) => (
              <button
                className={cn(
                  "mb-2 w-full border-[1.5px] border-transparent px-3 py-2.5 text-left hover:border-[#e5d6c9] hover:bg-[#fbf7f2]",
                  index === 0 && "border-[#f6823c] bg-[#fff3e8]",
                )}
                key={passage}
                type="button"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#25140b]">
                    {passage}
                  </span>
                  <span className="bg-[#fbf7f2] px-1.5 py-px text-[10px] font-semibold tracking-[0.03em] text-[#3a2218]">
                    {version}
                  </span>
                </div>
                <p className="font-serif text-[12px] leading-relaxed text-[#5d493a]">
                  {text}
                </p>
              </button>
            ))}
          </section>
        )}

        <button
          className="flex w-full items-center justify-between border-b border-[#f1e8df] px-3 py-3 text-left text-[12px] font-semibold text-[#3a2218] hover:text-[#25140b]"
          onClick={() => {
            setIndexOpen((open) => {
              const nextOpen = !open;
              if (nextOpen) {
                setSearchOpen(false);
              }
              return nextOpen;
            });
          }}
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
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out px-2",
            indexOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <ScriptureIndex
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
  onBookChange,
  onChapterChange,
  onPassageChange,
  openBook,
  openChapter,
  selectedPassage,
}: {
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

  const calculatePath = useCallback(() => {
    if (
      !containerRef.current ||
      !pathRef.current ||
      !activePathRef.current ||
      !clipRectRef.current
    ) {
      return;
    }

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const getRelY = (id: string, edge: "top" | "bottom") => {
      const element = container.querySelector(`[data-marker="${id}"]`);
      if (!element) {
        return null;
      }

      const elementRect = element.getBoundingClientRect();
      return edge === "top"
        ? elementRect.top - rect.top
        : elementRect.bottom - rect.top;
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

    const x0 = 26;
    const x1 = 44;
    const x2 = 62;
    const radius = 14;
    const curve = (xStart: number, yStart: number, xEnd: number, yEnd: number) => {
      const middleY = (yStart + yEnd) / 2;
      return `C ${xStart} ${middleY}, ${xEnd} ${middleY}, ${xEnd} ${yEnd}`;
    };

    let nextPath = `M ${x0} -20`;

    if (chaptersTop !== null && chaptersBottom !== null) {
      const t1Start = chaptersTop - radius;
      const t1End = Math.max(t1Start + 1, chaptersTop + radius);

      if (t1Start > -20) {
        nextPath += ` L ${x0} ${t1Start}`;
      }

      nextPath += ` ${curve(x0, t1Start, x1, t1End)}`;

      if (versesTop !== null && versesBottom !== null) {
        const t2Start = Math.max(t1End, versesTop - radius);
        const t2End = Math.max(t2Start + 1, versesTop + radius);
        const t3Start = Math.max(t2End, versesBottom - radius);
        const t3End = Math.max(t3Start + 1, versesBottom + radius);
        const t4Start = Math.max(t3End, chaptersBottom - radius);
        const t4End = Math.max(t4Start + 1, chaptersBottom + radius);

        nextPath += ` L ${x1} ${t2Start}`;
        nextPath += ` ${curve(x1, t2Start, x2, t2End)}`;
        nextPath += ` L ${x2} ${t3Start}`;
        nextPath += ` ${curve(x2, t3Start, x1, t3End)}`;
        nextPath += ` L ${x1} ${t4Start}`;
        nextPath += ` ${curve(x1, t4Start, x0, t4End)}`;
        nextPath += ` L ${x0} ${Math.max(t4End, height + 20)}`;
      } else {
        const t4Start = Math.max(t1End, chaptersBottom - radius);
        const t4End = Math.max(t4Start + 1, chaptersBottom + radius);

        nextPath += ` L ${x1} ${t4Start}`;
        nextPath += ` ${curve(x1, t4Start, x0, t4End)}`;
        nextPath += ` L ${x0} ${Math.max(t4End, height + 20)}`;
      }
    } else {
      nextPath += ` L ${x0} ${height + 20}`;
    }

    pathRef.current.setAttribute("d", nextPath);
    activePathRef.current.setAttribute("d", nextPath);
    clipRectRef.current.setAttribute("height", activeEnd.toString());
  }, []);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      calculatePath();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [calculatePath, openBook, openChapter]);

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
        {bibleIndex.map(({ book, chapters, level }) => (
          <div className="flex flex-col" key={book}>
            <button
              className={cn(
                "flex w-full items-center justify-between py-2.5 pl-12 pr-3 text-left text-[13px] font-semibold text-[#3a2218] hover:text-[#25140b]",
                openBook === book && "text-[#25140b]",
                level === 0 && "pl-12",
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
                  {chapters.map(({ chapter, verses }) => {
                    const chapterKey = `${book}-${chapter}`;

                    return (
                      <div key={chapterKey}>
                        <button
                          className={cn(
                            "flex w-full items-center justify-between py-2 pl-[64px] pr-3 text-left text-[12px] font-medium text-[#5d493a] hover:text-[#25140b]",
                            openChapter === chapterKey && "text-[#25140b]",
                          )}
                          onClick={() => onChapterChange(chapterKey)}
                          type="button"
                        >
                          Chapter {chapter}
                          {openChapter === chapterKey ? (
                            <ChevronUp className="h-3 w-3 text-[#9b8878]" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-[#9b8878]" />
                          )}
                        </button>
                        <div
                          className={cn(
                            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                            openChapter === chapterKey
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0",
                          )}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div
                              className="grid grid-cols-5 gap-x-2 gap-y-2 py-3 pl-[84px] pr-3"
                              data-marker={
                                openChapter === chapterKey
                                  ? "verses"
                                  : undefined
                              }
                            >
                              {Array.from(
                                { length: Math.min(verses, 18) },
                                (_, index) => index + 1,
                              ).map((verse) => (
                                <button
                                  className={cn(
                                    "flex h-7 w-7 items-center justify-center text-[12px] font-medium text-[#7a6758] hover:text-[#f6823c]",
                                    selectedPassage.book === book &&
                                      selectedPassage.chapter === chapter &&
                                      selectedPassage.verse === verse &&
                                      "font-semibold text-[#f6823c]",
                                  )}
                                  key={verse}
                                  onClick={() =>
                                    onPassageChange({ book, chapter, verse })
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
  selectedPassage,
  onBookmark,
  onPassageChange,
  onToast,
  onVerseComment,
}: {
  selectedPassage: PassageSelection;
  onBookmark: () => void;
  onPassageChange: (selection: PassageSelection) => void;
  onToast: (title: string, description?: string) => void;
  onVerseComment: (target: string) => void;
}) {
  const [visibleVersions, setVisibleVersions] = useState(
    translations.slice(0, 3).map((translation) => translation.label),
  );
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
  const visibleTranslations = translations
    .filter((translation) => visibleVersions.includes(translation.label))
    .map((translation) => ({
      ...translation,
      verses: getVerses(translation.label, selectedPassage),
    }));
  const availableTranslations = translations.filter(({ label }) =>
    label.toLowerCase().includes(versionSearch.trim().toLowerCase()),
  );
  const canCloseVersion = visibleTranslations.length > 1;

  const closeVersion = (label: string) => {
    if (!canCloseVersion) {
      return;
    }

    setVisibleVersions((current) =>
      current.filter((version) => version !== label),
    );
  };

  const addVersion = (label: string) => {
    const mode = replaceTarget ? "changed" : "added";
    setVisibleVersions((current) => {
      if (current.includes(label)) {
        return current;
      }

      if (replaceTarget) {
        return current.map((version) => (version === replaceTarget ? label : version));
      }

      if (current.length >= 3) {
        return current;
      }

      return translations
        .map((translation) => translation.label)
        .filter((version) => [...current, label].includes(version))
        .slice(0, 3);
    });
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
        "Remove one translation first, or click a selected version label to swap it.",
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
        <NavButton icon={<ChevronsLeft className="h-3.5 w-3.5" />} />
        <NavButton icon={<ChevronLeft className="h-3.5 w-3.5" />} />
        <PassagePicker
          selectedPassage={selectedPassage}
          onPassageChange={onPassageChange}
        />
        <NavButton icon={<ChevronRight className="h-3.5 w-3.5" />} />
        <NavButton icon={<ChevronsRight className="h-3.5 w-3.5" />} />

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
                setVersionMenuOpen((open) => !open);
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
                      onChange={(event) => setVersionSearch(event.target.value)}
                      placeholder="Search translations"
                      value={versionSearch}
                    />
                  </div>
                  {availableTranslations.map(({ label }) => {
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
        <motion.div
          className="flex min-w-0 shrink-0 justify-center overflow-hidden"
          layout
        >
          <AnimatePresence initial={false}>
            {visibleTranslations.map(({ label }) => (
              <TranslationHeader
                canClose={canCloseVersion}
                key={label}
                label={label}
                onClose={() => closeVersion(label)}
                visibleCount={visibleTranslations.length}
              />
            ))}
          </AnimatePresence>
        </motion.div>
        <motion.div
          className="bible-app-scroll min-h-0 flex-1 overflow-y-auto"
          layout
          ref={readerScrollRef}
        >
          <motion.div
            className="flex min-h-full min-w-0 flex-1 justify-center overflow-hidden"
            layout
          >
            <AnimatePresence initial={false}>
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
          </motion.div>
        </motion.div>
      </div>

      <ReaderFooter />
    </section>
  );
}

function PassagePicker({
  selectedPassage,
  onPassageChange,
}: {
  selectedPassage: PassageSelection;
  onPassageChange: (selection: PassageSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftBook, setDraftBook] = useState(selectedPassage.book);
  const [draftChapter, setDraftChapter] = useState(selectedPassage.chapter);
  const ref = useOutsideClick<HTMLDivElement>(open, () => setOpen(false));
  const chapterScrollRef = useRef<HTMLDivElement>(null);
  const verseScrollRef = useRef<HTMLDivElement>(null);
  const selectedBook = bibleIndex.find(({ book }) => book === draftBook) ?? bibleIndex[0];
  const selectedChapter =
    selectedBook.chapters.find(({ chapter }) => chapter === draftChapter) ??
    selectedBook.chapters[0];
  const oldTestamentBooks = bibleIndex.filter(({ book }) => book !== "John");
  const newTestamentBooks = bibleIndex.filter(({ book }) => book === "John");
  const elasticTransition = {
    duration: 0.42,
    ease: [0.34, 1.56, 0.64, 1],
  } as const;
  const elasticItemMotion = (index: number, step = 0.018) => ({
    animate: { opacity: 1, y: [ -20, 4, 0 ] },
    initial: { opacity: 0, y: -20 },
    transition: {
      ...elasticTransition,
      delay: Math.min(index, 32) * step,
    },
  });

  useEffect(() => {
    if (!open) {
      setDraftBook(selectedPassage.book);
      setDraftChapter(selectedPassage.chapter);
    }
  }, [open, selectedPassage]);

  useEffect(() => {
    chapterScrollRef.current?.scrollTo({ top: 0 });
    verseScrollRef.current?.scrollTo({ top: 0 });
  }, [draftBook]);

  useEffect(() => {
    verseScrollRef.current?.scrollTo({ top: 0 });
  }, [draftChapter]);

  return (
    <div className="relative" ref={ref}>
      <button
        className="cta-button flex items-center gap-1 border border-[#e5d6c9] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#25140b] hover:border-[#f6823c]"
        onClick={() => setOpen((current) => !current)}
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
                <p className="px-2 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#f6823c]">
                  Old Testament
                </p>
                {oldTestamentBooks.map(({ book }, index) => (
                  <motion.button
                    className={cn(
                      "w-full px-2 py-2 text-left text-[12px] font-semibold text-[#5d493a] hover:text-[#25140b]",
                      draftBook === book && "text-[#f6823c]",
                    )}
                    key={book}
                    onClick={() => {
                      const firstChapter = bibleIndex.find(
                        (item) => item.book === book,
                      )?.chapters[0]?.chapter;
                      setDraftBook(book);
                      setDraftChapter(firstChapter ?? 1);
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
                {newTestamentBooks.map(({ book }, index) => (
                  <motion.button
                    className={cn(
                      "w-full px-2 py-2 text-left text-[12px] font-semibold text-[#5d493a] hover:text-[#25140b]",
                      draftBook === book && "text-[#f6823c]",
                    )}
                    key={book}
                    onClick={() => {
                      const firstChapter = bibleIndex.find(
                        (item) => item.book === book,
                      )?.chapters[0]?.chapter;
                      setDraftBook(book);
                      setDraftChapter(firstChapter ?? 1);
                    }}
                    type="button"
                    {...elasticItemMotion(oldTestamentBooks.length + index)}
                  >
                    {book}
                  </motion.button>
                ))}
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
                    {selectedBook.chapters.map(({ chapter }, index) => (
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
                    {Array.from(
                      { length: Math.min(selectedChapter.verses, 72) },
                      (_, index) => index + 1,
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

function NavButton({ icon }: { icon: React.ReactNode }) {
  return (
    <button
      className="icon-button flex h-7 w-7 items-center justify-center border border-[#e5d6c9] text-[#7a6758] hover:border-[#f6823c] hover:bg-[#fbf7f2]"
      type="button"
    >
      {icon}
    </button>
  );
}

const translationColumnMotion = (visibleCount: number) => ({
  animate: {
    flex: visibleCount === 1 ? "0 0 50%" : "1 1 0%",
    maxWidth: visibleCount === 1 ? "50%" : "none",
    opacity: 1,
    width: visibleCount === 1 ? "50%" : "100%",
    x: 0,
  },
  exit: {
    flex: 0,
    opacity: 0,
    width: 0,
    x: 0,
  },
  initial: {
    flex: 0,
    opacity: 0,
    width: 0,
    x: -96,
  },
});

function TranslationHeader({
  canClose,
  label,
  onClose,
  visibleCount,
}: {
  canClose: boolean;
  label: string;
  onClose: () => void;
  visibleCount: number;
}) {
  const motionProps = translationColumnMotion(visibleCount);

  return (
    <motion.div
      animate={motionProps.animate}
      className="overflow-hidden bg-white"
      exit={motionProps.exit}
      initial={motionProps.initial}
      layout
      transition={{ type: "spring", bounce: 0, duration: 0.48 }}
    >
      <div className="flex min-w-[320px] items-center justify-between border-b border-r border-[#f1e8df] bg-white px-5 py-3 last:border-r-0">
        <button
          className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#3a2218]"
          type="button"
        >
          {label}
          <ChevronDown className="h-3 w-3 text-[#9b8878]" />
        </button>
        <button
          aria-label={`Close ${label} version`}
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
  label,
  onComment,
  selectedPassage,
  visibleCount,
  verses,
}: {
  label: string;
  onComment: (target: string) => void;
  selectedPassage: PassageSelection;
  visibleCount: number;
  verses: string[];
}) {
  const motionProps = translationColumnMotion(visibleCount);

  return (
    <motion.div
      animate={motionProps.animate}
      className="self-stretch overflow-hidden bg-white"
      exit={motionProps.exit}
      initial={motionProps.initial}
      layout
      transition={{ type: "spring", bounce: 0, duration: 0.48 }}
    >
      <article className="flex min-h-full min-w-[320px] flex-col overflow-visible border-r border-[#f1e8df] last:border-r-0">

        <div className="flex-1 space-y-4 px-5 py-4 pb-24">
          {verses.map((text, index) => (
            <div
              className={cn(
                "group relative flex gap-3 px-2 py-2 transition-colors duration-150 ease-out hover:bg-[#fbf7f2]",
                index + 1 === selectedPassage.verse && "bg-[#fff3e8]",
              )}
              key={`${label}-${selectedPassage.book}-${selectedPassage.chapter}-${index}`}
            >
              <span className="min-w-4 pt-0.5 text-[11px] font-semibold leading-tight text-[#f6823c]">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-[14px] leading-[1.65] text-[#25140b]">
                  {text}
                </p>
                <button
                  aria-label={`Comment on ${label} John 1:${index + 1}`}
                  className={cn(
                    "absolute right-2 top-2 hidden h-7 w-7 items-center justify-center bg-white/80 text-[#9b8878] backdrop-blur-sm transition-colors duration-150 ease-out hover:text-[#3a2218] group-hover:flex",
                    index + 1 === selectedPassage.verse && "flex",
                  )}
                  onClick={() =>
                    onComment(
                      `${label} ${selectedPassage.book} ${selectedPassage.chapter}:${index + 1}`,
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
  return (
    <>
      <div className="flex h-11 shrink-0 items-center gap-6 border-t border-[#f1e8df] bg-white px-5">
        {["Parallel", "Cross-Refs", "Notes", "Interlinear"].map(
          (tab, index) => (
            <button
              className={cn(
                "relative flex h-full items-center gap-1.5 text-[12px]",
                index === 0 ? "font-semibold text-[#25140b]" : "text-[#7a6758]",
              )}
              key={tab}
              type="button"
            >
              {index === 0 && <List className="h-3.5 w-3.5" />}
              {tab}
              {index === 0 && (
                <motion.span
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f6823c]"
                  layoutId="reader-tab-indicator"
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
            Today: John 1-3{" "}
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
        ].map((src, index) => (
          <img
            alt=""
            className={cn(
              "h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm",
              index > 0 && "-ml-3",
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
          onReply={() =>
            setReplyingTo((current) =>
              current === "Grace M." ? null : "Grace M.",
            )
          }
          reference="John 1:3"
          time="2h ago"
        >
          <p className="font-serif text-[13px] leading-relaxed text-[#3a2218]">
            The Word creates everything. Through Him, nothing exists apart from
            His will and purpose.
          </p>
        </ChatMessage>

        <ChatMessage
          avatar="https://i.pravatar.cc/96?u=bible-ethan"
          isReplying={replyingTo === "Ethan L."}
          likeIcon="heart"
          likes={8}
          name="Ethan L."
          onReply={() =>
            setReplyingTo((current) =>
              current === "Ethan L." ? null : "Ethan L.",
            )
          }
          reference="John 1:3"
          time="1h ago"
        >
          <p className="font-serif text-[13px] leading-relaxed text-[#3a2218]">
            It reminds me that even the smallest things are not random.
          </p>
        </ChatMessage>

        <ChatMessage
          avatar="https://i.pravatar.cc/96?u=bible-miriam"
          isReplying={replyingTo === "Miriam A."}
          likes={5}
          name="Miriam A."
          onReply={() =>
            setReplyingTo((current) =>
              current === "Miriam A." ? null : "Miriam A.",
            )
          }
          reference="John 1:3"
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
            John emphasizes that creation happens through the Word, not apart
            from Him.
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
                john-outline.png
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
    if (!containerRef.current) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const bounds = activityItems.map((_, index) => {
      const element = itemRefs.current[index];
      if (!element) {
        return { bottom: 0, height: 0, top: 0 };
      }

      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom - containerRect.top,
        height: rect.height,
        top: rect.top - containerRect.top,
      };
    });

    if (!bounds.length || bounds[0].height === 0) {
      return;
    }

    const primaryX = 7;
    const secondaryX = 25;
    let d = `M ${activityItems[0].level === 1 ? secondaryX : primaryX} ${bounds[0].top + 4}\n`;

    for (let index = 0; index < activityItems.length; index += 1) {
      const currentX = activityItems[index].level === 1 ? secondaryX : primaryX;
      d += `L ${currentX} ${bounds[index].bottom}\n`;

      if (index < activityItems.length - 1) {
        const nextX =
          activityItems[index + 1].level === 1 ? secondaryX : primaryX;
        const midY =
          bounds[index].bottom +
          (bounds[index + 1].top - bounds[index].bottom) / 2;
        d +=
          currentX === nextX
            ? `L ${nextX} ${bounds[index + 1].top}\n`
            : `C ${currentX} ${midY}, ${nextX} ${midY}, ${nextX} ${bounds[index + 1].top}\n`;
      } else {
        d += `L ${currentX} ${bounds[index].bottom + 12}\n`;
      }
    }

    setPath(d);
    setClipHeight(bounds[3].bottom + 12);
  }, []);

  useEffect(() => {
    calculatePath();
    const observer = new ResizeObserver(calculatePath);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [calculatePath]);

  return (
    <div className="bible-app-scroll h-full overflow-y-auto px-4 py-4">
      <div className="mb-5">
        <h2 className="text-[13px] font-semibold text-[#25140b]">
          Verse Activity
        </h2>
        <p className="mt-0.5 text-[11px] text-[#9b8878]">
          Live signals around John 1:3
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
          {activityItems.map((item, index) => (
            <div
              className={cn(
                "transition-colors duration-150 ease-out",
                item.level === 0 && "-ml-4",
              )}
              key={item.title}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
            >
              <p
                className={cn(
                  "text-[13px] leading-snug",
                  index <= 3
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
            <ChatInput compact placeholder={`Reply to ${name}...`} />
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
        {waveform.slice(0, 34).map((height, index) => (
          <span
            className={cn(
              "block w-0.5 bg-[#e5d6c9]",
              index < 13 && "bg-[#f6823c]",
            )}
            key={`voice-${height}-${index}`}
            style={{ height: Math.max(6, height - 4) }}
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
      <ChatInput placeholder={`Write a note on ${target}...`} />
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

function Files() {
  return (
    <div className="space-y-1.5">
      <FileRow
        icon={<FileText className="h-3.5 w-3.5 text-[#f6823c]" />}
        label="sermon-outline.pdf"
        meta="PDF · 245 KB"
      />
      <FileRow
        icon={<ImageIcon className="h-3.5 w-3.5 text-[#f6823c]" />}
        label="map-of-judea.png"
        meta="PNG · 1.2 MB"
      />
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
          {waveform.map((height, index) => (
            <span
              className={cn(
                "block w-0.5 bg-[#e5d6c9]",
                index < 18 && "bg-[#f6823c]",
              )}
              key={`${height}-${index}`}
              style={{ height }}
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
          1.25x
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
