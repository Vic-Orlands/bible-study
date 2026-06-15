"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  Plus,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trash2,
  Calendar,
  Sparkles,
  BookMarked,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ProductShell } from "@/components/product-shell";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useStudyStore } from "@/lib/study-store";
import { cn } from "@/lib/utils";

function todayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(days: number) {
  return `${days} day${days === 1 ? "" : "s"}`;
}

function estimateReadingTime(start: number, end: number) {
  const chapters = end - start + 1;
  const mins = chapters * 3;
  return `${mins} min${mins === 1 ? "" : "s"}`;
}

function CircularProgress({ percent }: { percent: number }) {
  const radius = 45;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="#f1e8df"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <motion.circle
          stroke="#f6823c"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          animate={{ strokeDashoffset }}
          initial={{ strokeDashoffset: circumference }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span className="absolute font-serif text-[15px] font-bold text-[#25140b]">{percent}%</span>
    </div>
  );
}

function AnimatedCheckbox({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      className={cn(
        "flex h-6 w-6 items-center justify-center border transition-all duration-200",
        checked
          ? "border-[#2e6b3d] bg-[#2e6b3d] text-white shadow-sm"
          : "border-[#e5d6c9] bg-white hover:border-[#f6823c]",
      )}
      onClick={onClick}
      type="button"
    >
      {checked && (
        <motion.svg
          className="h-3.5 w-3.5 stroke-current"
          fill="none"
          strokeWidth="3.5"
          viewBox="0 0 24 24"
        >
          <motion.path
            d="M20 6L9 17L4 12"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        </motion.svg>
      )}
    </button>
  );
}

export default function ReadingPlanPage() {
  const identityId = useStudyStore((state) => state.identityId);
  const setPassage = useStudyStore((state) => state.setPassage);
  const templates = useQuery(api.readingPlans.templates, {});
  const currentPlan = useQuery(api.readingPlans.current, {
    ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
  });
  const createPlan = useMutation(api.readingPlans.create);
  const toggleEntry = useMutation(api.readingPlans.toggleEntry);
  const archivePlan = useMutation(api.readingPlans.archiveCurrent);
  const resetPlan = useMutation(api.readingPlans.resetCurrent);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"dashboard" | "browse">("dashboard");
  const [viewMode, setViewMode] = useState<"timeline" | "roadmap">("timeline");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const isPlanActive = !!currentPlan?.plan;
  const displayTab = isPlanActive ? activeTab : "browse";

  const currentWeekNum = useMemo(() => {
    if (!currentPlan) return 1;
    const activeDay = currentPlan.todayEntry?.dayNumber ?? currentPlan?.plan?.currentDayNumber ?? 1;
    return Math.ceil(activeDay / 7);
  }, [currentPlan]);

  const [activeWeek, setActiveWeek] = useState(1);
  const [hasInitializedWeek, setHasInitializedWeek] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  useEffect(() => {
    if (currentPlan && !hasInitializedWeek) {
      setActiveWeek(currentWeekNum);
      setExpandedWeek(currentWeekNum);
      setHasInitializedWeek(true);
    }
  }, [currentPlan, currentWeekNum, hasInitializedWeek]);

  useEffect(() => {
    if (!currentPlan) {
      setHasInitializedWeek(false);
      setExpandedWeek(null);
    }
  }, [currentPlan]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  const openReading = (entry: {
    passageBook: string;
    passageChapter: number;
    passageVerse: number;
  }) => {
    setPassage({
      book: entry.passageBook,
      chapter: entry.passageChapter,
      verse: entry.passageVerse,
    });
    router.push(
      `/study?book=${encodeURIComponent(entry.passageBook)}&chapter=${entry.passageChapter}&verse=${entry.passageVerse}`,
    );
  };

  const handleStartPlan = async (templateId: string, title: string) => {
    try {
      await createPlan({
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
        startDate: todayString(),
        templateId,
      });
      toast.success(`Started ${title}`);
      setActiveTab("dashboard");
      setHasInitializedWeek(false);
    } catch (error) {
      console.error("Failed to start reading plan:", error);
      toast.error("Failed to start reading plan.");
    }
  };

  const handleRestartPlan = async () => {
    if (!window.confirm("Are you sure you want to restart your current plan? This will clear all completed readings for this plan.")) {
      return;
    }
    try {
      await resetPlan({
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
      });
      toast.success("Reading plan restarted.");
      setSettingsOpen(false);
      setHasInitializedWeek(false);
    } catch (error) {
      console.error("Failed to restart plan:", error);
      toast.error("Failed to restart reading plan.");
    }
  };

  const handleLeavePlan = async () => {
    if (!window.confirm("Are you sure you want to leave your current plan? This will archive your progress.")) {
      return;
    }
    try {
      await archivePlan({
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
      });
      toast.success("Reading plan archived.");
      setSettingsOpen(false);
      setActiveTab("browse");
    } catch (error) {
      console.error("Failed to leave plan:", error);
      toast.error("Failed to archive reading plan.");
    }
  };

  const handleToggleEntry = async (entryId: Id<"userPlanEntries">) => {
    try {
      await toggleEntry({
        entryId,
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
      });
    } catch (error) {
      console.error("Failed to toggle entry:", error);
      toast.error("Failed to update progress.");
    }
  };

  const allEntries = useMemo(() => {
    return currentPlan?.allEntries ?? [];
  }, [currentPlan]);

  const totalWeeks = useMemo(() => {
    if (allEntries.length === 0) return 0;
    return Math.ceil(allEntries.length / 7);
  }, [allEntries]);

  const currentWeekEntries = useMemo(() => {
    return allEntries.filter((entry) => Math.ceil(entry.dayNumber / 7) === activeWeek);
  }, [allEntries, activeWeek]);

  const roadmapWeeks = useMemo(() => {
    const weeksMap: Record<number, typeof allEntries> = {};
    for (const entry of allEntries) {
      const w = Math.ceil(entry.dayNumber / 7);
      if (!weeksMap[w]) weeksMap[w] = [];
      weeksMap[w].push(entry);
    }
    return Object.entries(weeksMap).map(([wNum, items]) => {
      const w = parseInt(wNum);
      const completed = items.filter((i) => i.status === "completed").length;
      return {
        weekNumber: w,
        items,
        completed,
        total: items.length,
      };
    });
  }, [allEntries]);

  return (
    <ProductShell>
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#f1e8df] px-6">
          <div className="flex items-center gap-6">
            <h1 className="font-serif text-xl font-semibold text-[#25140b]">
              {displayTab === "dashboard" && currentPlan?.plan
                ? currentPlan.plan.title
                : "Reading Plans"}
            </h1>
            {isPlanActive && (
              <div className="flex gap-1 border-l border-[#f1e8df] pl-6">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-full",
                    activeTab === "dashboard"
                      ? "bg-[#3a2218] text-white"
                      : "text-[#7a6758] hover:bg-[#fbf7f2] hover:text-[#3a2218]",
                  )}
                  type="button"
                >
                  My Plan
                </button>
                <button
                  onClick={() => setActiveTab("browse")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-full",
                    activeTab === "browse"
                      ? "bg-[#3a2218] text-white"
                      : "text-[#7a6758] hover:bg-[#fbf7f2] hover:text-[#3a2218]",
                  )}
                  type="button"
                >
                  Browse Plans
                </button>
              </div>
            )}
          </div>

          {displayTab === "dashboard" && currentPlan?.plan && (
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#f1e8df] text-[#7a6758] hover:bg-[#fbf7f2] hover:text-[#3a2218]"
                type="button"
                aria-label="Plan Settings"
              >
                <Settings className="h-4 w-4" />
              </button>

              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-[calc(100%+6px)] z-20 w-48 border border-[#e5d6c9] bg-white shadow-[0_14px_36px_rgba(31,18,9,0.08)] py-1"
                  >
                    <button
                      onClick={handleRestartPlan}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-[#3a2218] hover:bg-[#fbf7f2]"
                      type="button"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-[#7a6758]" />
                      Restart Plan
                    </button>
                    <button
                      onClick={handleLeavePlan}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-[#f6823c] hover:bg-[#fbf7f2]"
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Leave Plan
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </header>

        <div className="bible-app-scroll flex-1 overflow-y-auto bg-[#fbf7f2] p-6">
          {templates === undefined || currentPlan === undefined ? (
            <div className="flex h-64 items-center justify-center text-sm text-[#7a6758]">
              Loading plans...
            </div>
          ) : displayTab === "browse" ? (
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 text-center md:text-left">
                <h2 className="font-serif text-2xl font-semibold text-[#25140b]">
                  Explore Curated Plans
                </h2>
                <p className="mt-1 text-sm text-[#7a6758]">
                  Select a reading rhythm to help you stay connected to the scriptures daily.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex flex-col justify-between border border-[#f1e8df] bg-white p-6 shadow-sm transition-all duration-200"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-serif text-lg font-semibold text-[#25140b]">
                          {template.title}
                        </h3>
                        <span className="shrink-0 bg-[#fff3e8] px-2.5 py-1 text-[11px] font-semibold text-[#f6823c] rounded-full">
                          {formatDuration(template.durationDays)}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-[#7a6758]">
                        {template.description}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-[#f1e8df] pt-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7a6758]">
                        <Clock3 className="h-3.5 w-3.5" />
                        ~9 mins / day
                      </div>
                      <button
                        onClick={() => handleStartPlan(template.id, template.title)}
                        className="cta-button flex items-center gap-1.5 bg-[#2e6b3d] px-4 py-2 text-xs font-semibold text-white hover:bg-[#245632]"
                        type="button"
                      >
                        Start Plan
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-6xl space-y-6">
              {/* Dashboard Row */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Hero Focus Card */}
                <div className="flex flex-col justify-between border border-[#f1e8df] bg-white p-6 shadow-sm md:col-span-1">
                  <div>
                    <span className="text-[10px] font-semibold tracking-wider text-[#9b8878] uppercase">
                      Today's Reading
                    </span>
                    <h3 className="mt-2 font-serif text-2xl font-bold text-[#25140b]">
                      {currentPlan?.todayEntry?.passageLabel ?? "Plan Complete!"}
                    </h3>
                    {currentPlan?.todayEntry && (
                      <p className="mt-1 text-[11px] text-[#7a6758]">
                        Day {currentPlan?.todayEntry?.dayNumber} of {currentPlan?.plan?.totalEntries} •{" "}
                        {estimateReadingTime(
                          currentPlan?.todayEntry?.startChapter ?? 1,
                          currentPlan?.todayEntry?.endChapter ?? 1,
                        )}
                      </p>
                    )}
                  </div>

                  {currentPlan?.todayEntry ? (
                    <div className="mt-6 flex items-center gap-3">
                      <button
                        onClick={() => currentPlan?.todayEntry && openReading(currentPlan.todayEntry)}
                        className="cta-button flex flex-1 items-center justify-center gap-2 bg-[#2e6b3d] py-2.5 text-xs font-semibold text-white hover:bg-[#245632]"
                        type="button"
                      >
                        Read Now
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <AnimatedCheckbox
                        checked={currentPlan?.todayEntry?.status === "completed"}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentPlan?.todayEntry) {
                            handleToggleEntry(currentPlan.todayEntry._id);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#2e6b3d]">
                      <Sparkles className="h-4 w-4" />
                      Amazing job! You've finished this plan.
                    </div>
                  )}
                </div>

                {/* Progress Card */}
                <div className="flex items-center justify-between border border-[#f1e8df] bg-white p-6 shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold tracking-wider text-[#9b8878] uppercase">
                      Progress
                    </span>
                    <h4 className="font-serif text-2xl font-bold text-[#25140b]">
                      {currentPlan?.progressPercent ?? 0}%
                    </h4>
                    <p className="text-[11px] leading-tight text-[#7a6758]">
                      {currentPlan?.plan?.completedEntries ?? 0} of {currentPlan?.plan?.totalEntries ?? 0} read
                    </p>
                  </div>
                  <CircularProgress percent={currentPlan?.progressPercent ?? 0} />
                </div>

                {/* Streak Card */}
                <div className="flex items-center justify-between border border-[#f1e8df] bg-white p-6 shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold tracking-wider text-[#9b8878] uppercase">
                      Active Streak
                    </span>
                    <h4 className="font-serif text-2xl font-bold text-[#25140b]">
                      {currentPlan?.streak ?? 0} Day{(currentPlan?.streak ?? 0) === 1 ? "" : "s"}
                    </h4>
                    <p className="text-[11px] leading-tight text-[#7a6758]">
                      Consistency builds habit.
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff3e8]">
                    <Flame className="h-6 w-6 text-[#f6823c]" />
                  </div>
                </div>
              </div>

              {/* Navigation timeline */}
              <div className="border border-[#f1e8df] bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f1e8df] px-6 py-4">
                  <div className="flex items-center gap-4">
                    <h3 className="font-serif text-base font-semibold text-[#25140b]">
                      {viewMode === "timeline" ? `Week ${activeWeek} Readings` : "Plan Roadmap"}
                    </h3>

                    {viewMode === "timeline" && totalWeeks > 1 && (
                      <div className="flex items-center gap-1 border-l border-[#f1e8df] pl-4">
                        <button
                          disabled={activeWeek === 1}
                          onClick={() => setActiveWeek((w) => Math.max(1, w - 1))}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#f1e8df] text-[#7a6758] disabled:opacity-30 hover:bg-[#fbf7f2] hover:text-[#3a2218]"
                          type="button"
                          aria-label="Previous Week"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-semibold text-[#3a2218] px-1">
                          {activeWeek} / {totalWeeks}
                        </span>
                        <button
                          disabled={activeWeek === totalWeeks}
                          onClick={() => setActiveWeek((w) => Math.min(totalWeeks, w + 1))}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#f1e8df] text-[#7a6758] disabled:opacity-30 hover:bg-[#fbf7f2] hover:text-[#3a2218]"
                          type="button"
                          aria-label="Next Week"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => setViewMode("timeline")}
                      className={cn(
                        "px-3 py-1.5 text-[11px] font-semibold rounded-full",
                        viewMode === "timeline"
                          ? "bg-[#3a2218] text-white"
                          : "text-[#7a6758] hover:bg-[#fbf7f2] hover:text-[#3a2218]",
                      )}
                      type="button"
                    >
                      Timeline View
                    </button>
                    <button
                      onClick={() => setViewMode("roadmap")}
                      className={cn(
                        "px-3 py-1.5 text-[11px] font-semibold rounded-full",
                        viewMode === "roadmap"
                          ? "bg-[#3a2218] text-white"
                          : "text-[#7a6758] hover:bg-[#fbf7f2] hover:text-[#3a2218]",
                      )}
                      type="button"
                    >
                      Full Roadmap
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {viewMode === "timeline" ? (
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
                      {currentWeekEntries.map((entry) => {
                        const isToday = entry.dueDate === todayString();
                        const isCompleted = entry.status === "completed";

                        return (
                          <div
                            key={entry._id}
                            className={cn(
                              "flex flex-col justify-between border p-4 transition-all duration-200 min-h-[140px]",
                              isToday
                                ? "border-[#f6823c] bg-[#fffcf9] ring-1 ring-[#f6823c]/20"
                                : "border-[#f1e8df] bg-white",
                              isCompleted && "bg-opacity-60",
                            )}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#9b8878]">
                                  Day {entry.dayNumber}
                                </span>
                                {isToday && (
                                  <span className="bg-[#f6823c] px-1.5 py-0.5 text-[8px] font-bold text-white uppercase rounded-none">
                                    Today
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => openReading(entry)}
                                className="mt-3 block text-left hover:underline"
                                type="button"
                              >
                                <span className="font-serif text-sm font-semibold text-[#25140b] leading-tight block">
                                  {entry.passageLabel}
                                </span>
                              </button>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-[#f1e8df] pt-3">
                              <span className="text-[10px] text-[#7a6758]">
                                {formatDateLabel(entry.dueDate)}
                              </span>
                              <AnimatedCheckbox
                                checked={isCompleted}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleEntry(entry._id);
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {roadmapWeeks.map((week) => {
                        const isCurrentWeek = week.weekNumber === currentWeekNum;
                        const isExpanded = expandedWeek === week.weekNumber;

                        return (
                          <div
                            key={week.weekNumber}
                            className={cn(
                              "border border-[#f1e8df]",
                              isCurrentWeek && "border-[#f6823c]/50 bg-[#fffcf9]/30",
                            )}
                          >
                            <button
                              onClick={() =>
                                setExpandedWeek((w) => (w === week.weekNumber ? null : week.weekNumber))
                              }
                              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[#fbf7f2]"
                              type="button"
                            >
                              <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-[#7a6758]" />
                                <span className="font-serif text-sm font-semibold text-[#25140b]">
                                  Week {week.weekNumber}
                                </span>
                                {isCurrentWeek && (
                                  <span className="bg-[#f6823c]/10 text-[#f6823c] px-2 py-0.5 text-[9px] font-bold uppercase rounded-none">
                                    Current
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-4">
                                <span className="text-xs text-[#7a6758]">
                                  {week.completed} / {week.total} completed
                                </span>
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 text-[#7a6758] transition-transform duration-200",
                                    isExpanded && "transform rotate-180",
                                  )}
                                />
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-[#f1e8df] bg-white divide-y divide-[#f1e8df]">
                                {week.items.map((entry) => {
                                  const isCompleted = entry.status === "completed";
                                  return (
                                    <div
                                      key={entry._id}
                                      className="flex items-center justify-between px-6 py-3 hover:bg-[#fbf7f2]"
                                    >
                                      <div className="flex items-center gap-4">
                                        <span className="w-14 text-xs font-semibold text-[#9b8878]">
                                          Day {entry.dayNumber}
                                        </span>
                                        <button
                                          onClick={() => openReading(entry)}
                                          className="font-serif text-sm font-semibold text-[#25140b] hover:underline"
                                          type="button"
                                        >
                                          {entry.passageLabel}
                                        </button>
                                      </div>

                                      <div className="flex items-center gap-6">
                                        <span className="text-xs text-[#7a6758]">
                                          {formatDateLabel(entry.dueDate)}
                                        </span>
                                        <AnimatedCheckbox
                                          checked={isCompleted}
                                          onClick={() => handleToggleEntry(entry._id)}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProductShell>
  );
}
