"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useQueries } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit3,
  FileText,
  Pause,
  Play,
  Sparkles,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { ProductShell } from "@/components/product-shell";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  fetchBibleChapterForVersion,
  preferredVisibleVersions,
  type BibleVerse,
  type BibleVersion,
  useBibleVersions,
} from "@/lib/scripture";
import { useStudyStore } from "@/lib/study-store";
import { cn } from "@/lib/utils";
import { CANON } from "@/lib/reading-plan-templates";

type ReadingTab = "hub" | "journal" | "focus";
type ArchiveScope = "selected" | "all";

type TemplateCard = {
  cadenceLabel: string;
  category: string;
  durationDays: number;
  estimatedMinutes: number;
  featured: boolean;
  id: string;
  scopeLabel: string;
  summary: string;
  title: string;
};

type CustomPlanDraft = {
  book: string;
  durationDays: number;
  endChapter: number;
  startChapter: number;
  title: string;
};

type ReadingPlanEntry = {
  _id: Id<"userPlanEntries">;
  dueDate: string;
  dayNumber: number;
  passageBook: string;
  passageChapter: number;
  passageVerse: number;
  passageLabel: string;
  startChapter: number;
  endChapter: number;
  status: "pending" | "completed";
  reflection?: string;
  startedAt?: number;
  lastOpenedAt?: number;
  completedAt?: number;
};

type ReadingPlanCurrent = {
  plan: {
    _id: Id<"userPlans">;
    templateId: string;
    title: string;
    description: string;
    totalEntries: number;
    completedEntries: number;
    status: "active" | "completed" | "archived";
    currentDayNumber: number;
    startedAt?: number;
    lastOpenedAt?: number;
    lastCompletedAt?: number;
  };
  currentEntry: ReadingPlanEntry | null;
  primaryEntry: ReadingPlanEntry | null;
  hasStartedReading: boolean;
  progressPercent: number;
  streak: number;
  templateMeta: {
    category: string;
    cadenceLabel: string;
    durationDays: number;
    estimatedMinutes: number;
    featured: boolean;
    id: string;
    scopeLabel: string;
    summary: string;
    title: string;
  } | null;
  upcomingEntries: ReadingPlanEntry[];
  allEntries: ReadingPlanEntry[];
  journalEntries: ReadingPlanEntry[];
};

type ActivePlanSummary = {
  _id: Id<"userPlans">;
  completedEntries: number;
  currentDayNumber: number;
  description: string;
  progressPercent: number;
  title: string;
  totalEntries: number;
};

const dailyInsights = [
  {
    text: "Like cold water to a weary soul is good news from a distant land.",
    reference: "Proverbs 25:25",
  },
  {
    text: "Your word is a lamp to my feet and a light to my path.",
    reference: "Psalm 119:105",
  },
  {
    text: "The unfolding of your words gives light; it imparts understanding to the simple.",
    reference: "Psalm 119:130",
  },
  {
    text: "Incline my heart to your testimonies, and not to selfish gain.",
    reference: "Psalm 119:36",
  },
  {
    text: "Teach me your way, O Lord, that I may walk in your truth.",
    reference: "Psalm 86:11",
  },
  {
    text: "The entrance of wisdom begins with attention.",
    reference: "Proverbs 4:20",
  },
  {
    text: "Blessed is the one whose delight is in the law of the Lord.",
    reference: "Psalm 1:1-2",
  },
];

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

function formatLongDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(days: number) {
  return `${days} day${days === 1 ? "" : "s"}`;
}

function chapterRangeLabel(entry: ReadingPlanEntry) {
  if (entry.startChapter === entry.endChapter) {
    return `${entry.passageBook} ${entry.startChapter}`;
  }
  return `${entry.passageBook} ${entry.startChapter}-${entry.endChapter}`;
}

function relativeStartLabel(currentPlan: ReadingPlanCurrent) {
  if (currentPlan.plan.completedEntries === 0) return "Start Reading";
  if (currentPlan.primaryEntry) return "Continue Reading";
  return "Plan Complete";
}

function dailyInsight() {
  const date = new Date();
  const dayKey = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  );
  return dailyInsights[dayKey % dailyInsights.length];
}

export default function ReadingPlanPage() {
  const auth = useConvexAuth();
  const authIdentity = useQuery(api.auth.getUserIdentity);
  const syncViewerIdentity = useMutation(api.identity.syncViewerIdentity);
  const setIdentity = useStudyStore((s) => s.setIdentity);
  const identityId = useStudyStore((s) => s.identityId);
  const [storeReady, setStoreReady] = useState(false);
  const [activeTab, setActiveTab] = useState<ReadingTab>("hub");
  const [selectedEntryId, setSelectedEntryId] =
    useState<Id<"userPlanEntries"> | null>(null);
  const [readerOpenMobile, setReaderOpenMobile] = useState(false);
  const [plansSheetOpen, setPlansSheetOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveScope, setArchiveScope] = useState<ArchiveScope>("selected");
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [readerVersionId, setReaderVersionId] = useState("");
  const [selectedPlanId, setSelectedPlanId] =
    useState<Id<"userPlans"> | null>(null);

  const templates = useQuery(api.readingPlans.templates) ?? [];
  const activePlans = useQuery(api.readingPlans.active, {
    ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
  }) as ActivePlanSummary[] | undefined;
  const currentPlan = useQuery(api.readingPlans.current, {
    ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
    ...(selectedPlanId ? { planId: selectedPlanId } : {}),
  }) as ReadingPlanCurrent | null | undefined;
  const createPlan = useMutation(api.readingPlans.create);
  const createCustomPlan = useMutation(api.readingPlans.createCustom);
  const openPlanEntry = useMutation(api.readingPlans.openEntry);
  const toggleEntry = useMutation(api.readingPlans.toggleEntry);
  const saveReflection = useMutation(api.readingPlans.saveReflection);
  const archiveCurrent = useMutation(api.readingPlans.archiveCurrent);
  const archiveAll = useMutation(api.readingPlans.archiveAll);
  const { data: bibleVersions = [] } = useBibleVersions();

  useEffect(() => {
    let cancelled = false;

    const initIdentity = async () => {
      if (auth.isLoading) return;
      if (auth.isAuthenticated && authIdentity) {
        try {
          const synced = await syncViewerIdentity({
            identityId:
              (identityId as Id<"identities"> | null) ??
              authIdentity.identityId ??
              undefined,
          });
          setIdentity(synced.identityId, synced.displayName, false);
        } catch (error) {
          console.error(
            "Failed to sync signed-in identity in reading plan:",
            error,
          );
          setIdentity(
            authIdentity.identityId,
            authIdentity.fullName ?? authIdentity.email ?? "Anonymous",
            false,
          );
        } finally {
          if (!cancelled) setStoreReady(true);
        }
        return;
      }

      if (auth.isAuthenticated && authIdentity === undefined) return;

      try {
        const res = await fetch("/api/identity/anonymous", {
          method: "POST",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setIdentity(data.identityId, data.displayName, data.isAnonymous);
        } else {
          console.error(
            "Anonymous identity request failed in reading plan:",
            res.status,
          );
        }
      } catch (error) {
        console.error(
          "Failed to get anonymous identity in reading plan:",
          error,
        );
      } finally {
        if (!cancelled) setStoreReady(true);
      }
    };

    initIdentity();
    return () => {
      cancelled = true;
    };
  }, [
    auth.isAuthenticated,
    auth.isLoading,
    authIdentity,
    identityId,
    setIdentity,
    syncViewerIdentity,
  ]);

  useEffect(() => {
    if (!bibleVersions.length) return;
    const preferred = preferredVisibleVersions([], bibleVersions)[0];
    if (!preferred) return;
    if (
      !readerVersionId ||
      !bibleVersions.find((version) => version.id === readerVersionId)
    ) {
      setReaderVersionId(preferred);
    }
  }, [bibleVersions, readerVersionId]);

  useEffect(() => {
    if (!activePlans) return;
    if (activePlans.some((plan) => plan._id === selectedPlanId)) return;
    setSelectedPlanId(activePlans[0]?._id ?? null);
  }, [activePlans, selectedPlanId]);

  useEffect(() => {
    if (!currentPlan) {
      setSelectedEntryId(null);
      return;
    }

    const entries = currentPlan.allEntries;
    const nextSelected =
      entries.find((entry) => entry._id === selectedEntryId) ??
      currentPlan.currentEntry ??
      currentPlan.primaryEntry ??
      entries[0] ??
      null;

    if (nextSelected && nextSelected._id !== selectedEntryId) {
      setSelectedEntryId(nextSelected._id);
    }
  }, [currentPlan, selectedEntryId]);

  const groupedTemplates = useMemo(() => {
    const groups = new Map<string, TemplateCard[]>();
    for (const template of templates as TemplateCard[]) {
      const current = groups.get(template.category) ?? [];
      current.push(template);
      groups.set(template.category, current);
    }
    return Array.from(groups.entries());
  }, [templates]);

  const selectedEntry =
    currentPlan?.allEntries.find((entry) => entry._id === selectedEntryId) ??
    currentPlan?.currentEntry ??
    currentPlan?.primaryEntry ??
    null;

  useEffect(() => {
    setReflectionDraft(selectedEntry?.reflection ?? "");
  }, [selectedEntry?._id, selectedEntry?.reflection]);

  const startPlan = async (templateId: string, title: string) => {
    try {
      const planId = await createPlan({
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
        startDate: todayString(),
        templateId,
      });
      setSelectedPlanId(planId);
      setActiveTab("hub");
      setPlansSheetOpen(false);
      toast.success(`Started ${title}`);
    } catch (error) {
      console.error("Failed to create reading plan:", error);
      toast.error("Failed to create reading plan.");
    }
  };

  const startCustomPlan = async (draft: CustomPlanDraft) => {
    try {
      const result = await createCustomPlan({
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
        startDate: todayString(),
        title: draft.title,
        book: draft.book,
        startChapter: draft.startChapter,
        endChapter: draft.endChapter,
        durationDays: draft.durationDays,
      });
      setSelectedPlanId(result.planId);
      setActiveTab("hub");
      setPlansSheetOpen(false);
      toast.success(`Started ${draft.title}`);
    } catch (error) {
      console.error("Failed to create custom reading plan:", error);
      toast.error("Failed to create custom reading plan.");
    }
  };

  const openReading = async (entry: ReadingPlanEntry) => {
    try {
      await openPlanEntry({
        entryId: entry._id,
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
      });
      setSelectedEntryId(entry._id);
      setReaderOpenMobile(true);
    } catch (error) {
      console.error("Failed to open reading plan entry:", error);
      toast.error("Failed to open reading.");
    }
  };

  const handleToggleEntry = async (entryId: Id<"userPlanEntries">) => {
    try {
      await toggleEntry({
        entryId,
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
      });
    } catch (error) {
      console.error("Failed to toggle reading plan entry:", error);
      toast.error("Failed to update reading progress.");
    }
  };

  const handleSaveReflection = async () => {
    if (!selectedEntry) return;
    try {
      await saveReflection({
        entryId: selectedEntry._id,
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
        reflection: reflectionDraft,
      });
      toast.success("Journal saved.");
    } catch (error) {
      console.error("Failed to save reading plan reflection:", error);
      toast.error("Failed to save journal entry.");
    }
  };

  const handleArchiveCurrent = async () => {
    if (!currentPlan) return;
    try {
      await archiveCurrent({
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
        planId: currentPlan.plan._id,
      });
      setArchiveConfirmOpen(false);
      toast.success("Current plan archived.");
    } catch (error) {
      console.error("Failed to archive current plan:", error);
      toast.error("Failed to archive current plan.");
    }
  };

  const handleArchiveAll = async () => {
    try {
      await archiveAll({
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
      });
      setArchiveConfirmOpen(false);
      toast.success("All active plans archived.");
    } catch (error) {
      console.error("Failed to archive all reading plans:", error);
      toast.error("Failed to archive all active plans.");
    }
  };

  if (!storeReady) {
    return (
      <ProductShell>
        <div className="flex flex-1 items-center justify-center bg-white text-[13px] text-[#7a6758]">
          Loading plans...
        </div>
      </ProductShell>
    );
  }

  return (
    <ProductShell>
      <div className="reading-plan-page flex min-h-0 flex-1 overflow-hidden bg-white">
        <ReadingPlanRail
          activePlans={activePlans ?? []}
          currentPlan={currentPlan}
          onArchiveAll={() => {
            setArchiveScope("all");
            setArchiveConfirmOpen(true);
          }}
          onArchiveCurrent={() => {
            setArchiveScope("selected");
            setArchiveConfirmOpen(true);
          }}
          onOpenPlans={() => setPlansSheetOpen(true)}
          onSelectPlan={(planId) => {
            setSelectedPlanId(planId);
            setSelectedEntryId(null);
            setActiveTab("hub");
          }}
          selectedPlanId={selectedPlanId}
        />

        <main className="bible-app-scroll min-w-0 flex-1 overflow-y-auto bg-white px-4 py-5 md:px-7 xl:px-10">
          <PageHeader
            activeTab={activeTab}
            currentPlan={currentPlan}
            journalCount={currentPlan?.journalEntries.length ?? 0}
            onChangeTab={setActiveTab}
          />

          {!currentPlan ? (
            <BrowseState onOpenPlans={() => setPlansSheetOpen(true)} />
          ) : activeTab === "hub" ? (
            <HubTab
              currentPlan={currentPlan}
              onOpenReading={openReading}
              onToggleEntry={handleToggleEntry}
              selectedEntryId={selectedEntry?._id ?? null}
            />
          ) : activeTab === "journal" ? (
            <JournalTab currentPlan={currentPlan} onOpenReading={openReading} />
          ) : (
            <FocusTab currentPlan={currentPlan} onOpenReading={openReading} />
          )}
        </main>
      </div>

      <AnimatePresence>
        {plansSheetOpen ? (
          <PlansSheet
            groupedTemplates={groupedTemplates}
            onClose={() => setPlansSheetOpen(false)}
            onCreateCustomPlan={startCustomPlan}
            onStartPlan={startPlan}
            selectedTemplateId={currentPlan?.plan.templateId ?? null}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {archiveConfirmOpen ? (
          <ArchiveConfirmDialog
            activePlanCount={activePlans?.length ?? 0}
            archiveScope={archiveScope}
            currentPlan={currentPlan}
            onCancel={() => setArchiveConfirmOpen(false)}
            onConfirm={
              archiveScope === "all" ? handleArchiveAll : handleArchiveCurrent
            }
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {readerOpenMobile && currentPlan ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-[2px]"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          >
            <button
              aria-label="Close reader"
              className="absolute inset-0 rounded-full"
              onClick={() => setReaderOpenMobile(false)}
              type="button"
            />
            <motion.div
              animate={{ x: 0 }}
              className="reading-plan-page relative z-20 flex h-full w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl md:flex-row"
              exit={{ x: "100%" }}
              initial={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 200 }}
            >
              <ReaderPanel
                currentPlan={currentPlan}
                onClose={() => setReaderOpenMobile(false)}
                onSaveReflection={handleSaveReflection}
                onToggleEntry={handleToggleEntry}
                reflectionDraft={reflectionDraft}
                readerVersionId={readerVersionId}
                selectedEntry={selectedEntry}
                setReflectionDraft={setReflectionDraft}
                setReaderVersionId={setReaderVersionId}
                versions={bibleVersions}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ProductShell>
  );
}

function PageHeader({
  activeTab,
  currentPlan,
  journalCount,
  onChangeTab,
}: {
  activeTab: ReadingTab;
  currentPlan: ReadingPlanCurrent | null | undefined;
  journalCount: number;
  onChangeTab: (tab: ReadingTab) => void;
}) {
  return (
    <div
      className={cn(
        "mx-auto mb-5 flex w-full flex-col gap-4",
        currentPlan ? "max-w-3xl" : "max-w-5xl",
      )}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f6823c]">
            Reading Workspace
          </p>
          <h1 className="font-serif text-[22px] font-semibold leading-tight text-[#25140b] md:text-[24px]">
            {currentPlan ? currentPlan.plan.title : "Reading Plans"}
          </h1>
          <p className="max-w-[660px] text-[13px] leading-relaxed text-[#7a6758]">
            {currentPlan
              ? (currentPlan.templateMeta?.summary ??
                currentPlan.plan.description)
              : "Choose a curated path, read inside this page, and keep your progress, reflections, and current passage together."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {currentPlan?.templateMeta ? (
            <div className="flex items-center gap-5 rounded-xl border border-[#f1e8df] bg-white px-2 py-1.5">
              <div className="text-xs">
                <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                  Category
                </span>
                <span className="mt-0.5 block text-[12px] font-semibold text-[#25140b]">
                  {currentPlan.templateMeta.category}
                </span>
              </div>
              <div className="h-6 w-px bg-[#f1e8df]" />
              <div className="text-xs">
                <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                  Pace
                </span>
                <span className="mt-0.5 block text-[12px] font-semibold text-[#25140b]">
                  {currentPlan.templateMeta.cadenceLabel}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full border border-[#f1e8df] bg-white p-1">
        {[
          { id: "hub", label: "Reading Hub" },
          { id: "journal", label: "My Journal", count: journalCount },
          { id: "focus", label: "Breath & Focus" },
        ].map((tab) => (
          <button
            className={cn(
              "relative rounded-full px-2 py-1.5 text-[11px] font-semibold transition-colors",
              activeTab === tab.id
                ? "bg-[#3a2218] text-white"
                : "text-[#7a6758] hover:bg-[#fbf7f2] hover:text-[#25140b]",
            )}
            key={tab.id}
            onClick={() => onChangeTab(tab.id as ReadingTab)}
            type="button"
          >
            {tab.label}
            {"count" in tab &&
            typeof tab.count === "number" &&
            tab.count > 0 ? (
              <span className="absolute -right-0.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-white bg-[#f6823c] px-1 text-[8px] font-semibold text-white tabular-nums">
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadingPlanRail({
  activePlans,
  currentPlan,
  onArchiveAll,
  onArchiveCurrent,
  onOpenPlans,
  onSelectPlan,
  selectedPlanId,
}: {
  activePlans: ActivePlanSummary[];
  currentPlan: ReadingPlanCurrent | null | undefined;
  onArchiveAll: () => void;
  onArchiveCurrent: () => void;
  onOpenPlans: () => void;
  onSelectPlan: (planId: Id<"userPlans">) => void;
  selectedPlanId: Id<"userPlans"> | null;
}) {
  const insight = dailyInsight();

  return (
    <aside className="hidden min-h-0 w-[300px] shrink-0 overflow-y-auto border-r border-[#f1e8df] bg-white lg:block">
      <div className="bible-app-scroll flex h-full flex-col justify-between p-5">
        <div>
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b8878]">
                Your Paths
              </h2>
              <span className="text-[10px] tabular-nums text-[#9b8878]">
                {activePlans.length}
              </span>
            </div>

            {activePlans.length ? (
              <div className="space-y-1">
                {activePlans.map((plan) => {
                  const isSelected = plan._id === selectedPlanId;
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={cn(
                        "group w-full px-3 py-2.5 text-left transition-colors",
                        isSelected
                          ? "bg-[#fbf7f2]"
                          : "hover:bg-[#fbf7f2]/70",
                      )}
                      key={plan._id}
                      onClick={() => onSelectPlan(plan._id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-[#25140b]">
                            {plan.title}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-[#9b8878]">
                            Day {plan.currentDayNumber} of {plan.totalEntries}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "mt-0.5 shrink-0 text-[10px] font-semibold tabular-nums",
                            isSelected ? "text-[#f6823c]" : "text-[#9b8878]",
                          )}
                        >
                          {plan.progressPercent}%
                        </span>
                      </div>
                      <div className="mt-2 h-px w-full bg-[#f1e8df]">
                        <div
                          className={cn(
                            "h-full transition-[width] duration-500",
                            isSelected ? "bg-[#f6823c]" : "bg-[#d8c5b6]",
                          )}
                          style={{ width: `${plan.progressPercent}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#fbf7f2] px-3 py-4">
                <p className="font-serif text-[16px] font-semibold text-[#25140b]">
                  Find a path to begin
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#7a6758]">
                  Your active reading plans will live here.
                </p>
              </div>
            )}

            {currentPlan?.plan.status === "active" ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  className="rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a6758] transition-colors hover:bg-[#fbf7f2] hover:text-[#25140b]"
                  onClick={onArchiveCurrent}
                  type="button"
                >
                  Archive selected
                </button>
                {activePlans.length > 1 ? (
                  <button
                    className="rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a8502d] transition-colors hover:bg-[#fff1ea] hover:text-[#7f3319]"
                    onClick={onArchiveAll}
                    type="button"
                  >
                    Archive all
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>

          <button
            className="mt-5 flex w-full items-center justify-between rounded-full bg-[#3a2218] px-3 py-2 text-left text-[11px] font-semibold text-white transition-colors hover:bg-[#1f1209]"
            onClick={onOpenPlans}
            type="button"
          >
            <span>Browse all plans</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-8 border-l-2 border-[#e5d6c9] py-1 pl-4 text-[#7a6758]">
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9b8878]">
            Today&apos;s Insight
          </span>
          <p className="mt-1.5 font-serif text-[12px] italic leading-relaxed text-[#7a6758]">
            &quot;{insight.text}&quot;
          </p>
          <span className="mt-1.5 block text-[9px] text-[#9b8878]">
            {insight.reference}
          </span>
        </div>
      </div>
    </aside>
  );
}

function BrowseState({ onOpenPlans }: { onOpenPlans: () => void }) {
  return (
    <div className="mx-auto flex mt-24 w-full max-w-5xl items-center">
      <section className="w-full">
        <span className="inline-block rounded-full bg-[#fbf7f2] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a6758]">
          No active plan
        </span>
        <h2 className="mt-4 max-w-xl font-serif font-semibold text-[#25140b] text-xl">
          Start with one reading path and keep the workspace quiet.
        </h2>
        <p className="mt-3 max-w-xl text-sm text-[#7a6758]">
          The plan library now lives in a side sheet so this page stays focused
          on your current reading rhythm.
        </p>
        <button
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f6823c] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#dd6f2f]"
          onClick={onOpenPlans}
          type="button"
        >
          See all plans
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}

function PlansSheet({
  groupedTemplates,
  onClose,
  onCreateCustomPlan,
  onStartPlan,
  selectedTemplateId,
}: {
  groupedTemplates: [string, TemplateCard[]][];
  onClose: () => void;
  onCreateCustomPlan: (draft: CustomPlanDraft) => Promise<void>;
  onStartPlan: (templateId: string, title: string) => Promise<void>;
  selectedTemplateId: string | null;
}) {
  const defaultBook = CANON.find((book) => book.book === "John") ?? CANON[0];
  const [curatorOpen, setCuratorOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState<CustomPlanDraft>({
    book: defaultBook.book,
    durationDays: Math.min(defaultBook.chapters, 21),
    endChapter: defaultBook.chapters,
    startChapter: 1,
    title: `${defaultBook.book} Reading Path`,
  });
  const selectedBook =
    CANON.find((book) => book.book === customDraft.book) ?? defaultBook;

  const updateCustomBook = (bookName: string) => {
    const nextBook =
      CANON.find((book) => book.book === bookName) ?? defaultBook;
    setCustomDraft({
      book: nextBook.book,
      durationDays: Math.min(nextBook.chapters, customDraft.durationDays),
      endChapter: nextBook.chapters,
      startChapter: 1,
      title: `${nextBook.book} Reading Path`,
    });
  };

  const updateCustomRange = (
    key: "startChapter" | "endChapter",
    value: number,
  ) => {
    const nextValue = Math.max(1, Math.min(selectedBook.chapters, value));
    setCustomDraft((draft) => {
      if (key === "startChapter") {
        const startChapter = nextValue;
        const endChapter = Math.max(startChapter, draft.endChapter);
        return {
          ...draft,
          startChapter,
          endChapter,
          durationDays: Math.min(
            draft.durationDays,
            endChapter - startChapter + 1,
          ),
        };
      }
      const endChapter = Math.max(draft.startChapter, nextValue);
      return {
        ...draft,
        endChapter,
        durationDays: Math.min(
          draft.durationDays,
          endChapter - draft.startChapter + 1,
        ),
      };
    });
  };

  const chapterCount = customDraft.endChapter - customDraft.startChapter + 1;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-[2px]"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <button
        aria-label="Close plans"
        className="absolute inset-0 rounded-full"
        onClick={onClose}
        type="button"
      />
      <motion.aside
        animate={{ x: 0 }}
        className="reading-plan-page relative z-10 flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl"
        exit={{ x: "100%" }}
        initial={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 240 }}
      >
        <div className="px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f6823c]">
                Plan Library
              </p>
              <h2 className="mt-1 font-serif text-[24px] font-semibold leading-tight text-[#25140b]">
                Choose your next path
              </h2>
              <p className="mt-2 text-[12px] leading-relaxed text-[#7a6758]">
                Browse guided plans without crowding the reading workspace.
              </p>
            </div>
            <button
              className="px-2 py-1.5 text-[11px] font-semibold text-[#7a6758] hover:bg-[#fbf7f2] hover:text-[#25140b]"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
          <button
            className="mt-4 flex w-full items-center rounded-lg justify-between bg-[#fbf7f2] px-3 py-2 text-left text-[12px] font-semibold text-[#25140b] transition-colors hover:bg-[#f5eee6]"
            onClick={() => setCuratorOpen((open) => !open)}
            type="button"
          >
            <span>Curate your own plan</span>
            <ArrowRight className="h-4 w-4 text-[#f6823c]" />
          </button>
        </div>

        <div className="bible-app-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-7">
            {curatorOpen ? (
              <form
                className="bg-[#fbf7f2] p-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await onCreateCustomPlan(customDraft);
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f6823c]">
                  Custom Plan
                </p>
                <h3 className="mt-1 font-serif text-[18px] font-semibold text-[#25140b]">
                  Build a reading path
                </h3>
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                      Plan title
                    </span>
                    <input
                      className="mt-1 h-9 w-full bg-white px-3 text-[13px] text-[#25140b] outline-none"
                      onChange={(event) =>
                        setCustomDraft((draft) => ({
                          ...draft,
                          title: event.target.value,
                        }))
                      }
                      value={customDraft.title}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                      Book
                    </span>
                    <select
                      className="mt-1 h-9 w-full bg-white px-3 text-[13px] text-[#25140b] outline-none"
                      onChange={(event) => updateCustomBook(event.target.value)}
                      value={customDraft.book}
                    >
                      {CANON.map((book) => (
                        <option key={book.book} value={book.book}>
                          {book.book}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                        Start
                      </span>
                      <input
                        className="mt-1 h-9 w-full bg-white px-3 text-[13px] text-[#25140b] outline-none"
                        max={selectedBook.chapters}
                        min={1}
                        onChange={(event) =>
                          updateCustomRange(
                            "startChapter",
                            Number(event.target.value),
                          )
                        }
                        type="number"
                        value={customDraft.startChapter}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                        End
                      </span>
                      <input
                        className="mt-1 h-9 w-full bg-white px-3 text-[13px] text-[#25140b] outline-none"
                        max={selectedBook.chapters}
                        min={customDraft.startChapter}
                        onChange={(event) =>
                          updateCustomRange(
                            "endChapter",
                            Number(event.target.value),
                          )
                        }
                        type="number"
                        value={customDraft.endChapter}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                      Days
                    </span>
                    <input
                      className="mt-1 h-9 w-full bg-white px-3 text-[13px] text-[#25140b] outline-none"
                      max={chapterCount}
                      min={1}
                      onChange={(event) =>
                        setCustomDraft((draft) => ({
                          ...draft,
                          durationDays: Math.max(
                            1,
                            Math.min(chapterCount, Number(event.target.value)),
                          ),
                        }))
                      }
                      type="number"
                      value={customDraft.durationDays}
                    />
                  </label>
                </div>
                <div className="mt-4 bg-white px-2 py-1.5 text-[12px] text-[#7a6758]">
                  {customDraft.book} {customDraft.startChapter}
                  {customDraft.startChapter === customDraft.endChapter
                    ? ""
                    : `-${customDraft.endChapter}`}{" "}
                  across {customDraft.durationDays} day
                  {customDraft.durationDays === 1 ? "" : "s"}.
                </div>
                <button
                  className="mt-4 w-full bg-[#f6823c] px-2 py-1.5 text-[12px] font-semibold text-white hover:bg-[#dd6f2f]"
                  type="submit"
                >
                  Start Custom Plan
                </button>
              </form>
            ) : null}

            {groupedTemplates.map(([category, items]) => (
              <section className="space-y-3" key={category}>
                <div className="flex items-baseline justify-between pb-1 border-b">
                  <h3 className="font-serif text-[17px] font-semibold text-[#25140b]">
                    {category}
                  </h3>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                    {items.length} plans
                  </span>
                </div>
                <div className="space-y-5">
                  {items.map((template) => (
                    <div
                      className={cn(
                        "group grid items-start gap-3 py-2 transition-colors sm:grid-cols-[minmax(0,1fr)_auto]",
                        selectedTemplateId === template.id
                          ? "bg-[#fbf7f2]"
                          : "bg-white hover:bg-[#fbf7f2]",
                      )}
                      key={template.id}
                    >
                      <div className="min-w-0">
                        <h4 className="font-serif text-[16px] font-semibold leading-snug text-[#25140b] group-hover:text-[#f6823c]">
                          {template.title}
                        </h4>
                        <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[#7a6758]">
                          {template.summary}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="bg-[#fbf7f2] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#7a6758]">
                            {formatDuration(template.durationDays)}
                          </span>
                          <span className="bg-[#fbf7f2] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#7a6758]">
                            {template.cadenceLabel}
                          </span>
                          <span className="bg-[#fbf7f2] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#7a6758]">
                            ~{template.estimatedMinutes} min
                          </span>
                        </div>
                      </div>
                      <button
                        className="px-3 py-1.5 text-[12px] font-semibold text-[#f6823c] transition-colors hover:bg-white hover:text-[#dd6f2f]"
                        onClick={() => onStartPlan(template.id, template.title)}
                        type="button"
                      >
                        {selectedTemplateId === template.id
                          ? "Selected"
                          : "Select"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
}

function ArchiveConfirmDialog({
  activePlanCount,
  archiveScope,
  currentPlan,
  onCancel,
  onConfirm,
}: {
  activePlanCount: number;
  archiveScope: ArchiveScope;
  currentPlan: ReadingPlanCurrent | null | undefined;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <motion.div
        animate={{ y: 0, scale: 1 }}
        className="reading-plan-page w-full max-w-sm rounded-2xl border border-[#e5d6c9] bg-white p-5 shadow-2xl"
        exit={{ y: 8, scale: 0.98 }}
        initial={{ y: 8, scale: 0.98 }}
        transition={{ duration: 0.16, ease: [0.215, 0.61, 0.355, 1] }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f6823c]">
          {archiveScope === "all" ? "Archive All Plans" : "Archive Plan"}
        </p>
        <h2 className="mt-2 font-serif text-[22px] font-semibold leading-tight text-[#25140b]">
          {archiveScope === "all"
            ? `Archive all ${activePlanCount} active plans?`
            : `Archive ${currentPlan?.plan.title ?? "this plan"}?`}
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-[#7a6758]">
          {archiveScope === "all"
            ? "This clears every active path from your workspace. Their reading progress remains available in your archive."
            : "This removes only this path from your active workspace. Its reading progress remains available in your archive."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-full border border-[#f1e8df] px-2 py-1.5 text-[12px] font-semibold text-[#7a6758] hover:bg-[#fbf7f2] hover:text-[#25140b]"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-[#3a2218] px-2 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1f1209]"
            onClick={onConfirm}
            type="button"
          >
            {archiveScope === "all" ? "Archive all" : "Archive plan"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HubTab({
  currentPlan,
  onOpenReading,
  onToggleEntry,
  selectedEntryId,
}: {
  currentPlan: ReadingPlanCurrent;
  onOpenReading: (entry: ReadingPlanEntry) => Promise<void>;
  onToggleEntry: (entryId: Id<"userPlanEntries">) => Promise<void>;
  selectedEntryId: Id<"userPlanEntries"> | null;
}) {
  const heroEntry = currentPlan.primaryEntry ?? currentPlan.currentEntry;
  const ctaLabel = relativeStartLabel(currentPlan);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-7">
      <section className="rounded-2xl border border-[#f1e8df] bg-white p-5">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <span className="inline-block rounded-full bg-[#fbf7f2] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a6758]">
              Today&apos;s recommended entry
            </span>
            <h2 className="mt-4 font-serif text-[24px] font-semibold leading-snug text-[#25140b] md:text-[26px]">
              {heroEntry?.passageLabel ?? "Plan Complete"}
            </h2>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f6823c]">
              {heroEntry
                ? chapterRangeLabel(heroEntry)
                : "You finished every reading"}
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[#7a6758]">
              {heroEntry
                ? `Day ${heroEntry.dayNumber} of ${currentPlan.plan.totalEntries} · ${currentPlan.templateMeta?.cadenceLabel ?? "Daily reading"}`
                : "You have finished every scheduled reading in this plan. Well done!"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 md:justify-end">
            {heroEntry ? (
              <button
                className="flex items-center gap-2 rounded-full bg-[#f6823c] px-2 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#dd6f2f]"
                onClick={() => onOpenReading(heroEntry)}
                type="button"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
            {currentPlan.currentEntry && currentPlan.hasStartedReading ? (
              <button
                className="rounded-full border border-[#f1e8df] bg-white px-2 py-1.5 text-[12px] font-semibold text-[#25140b] transition-colors hover:bg-[#fbf7f2]"
                onClick={() => onOpenReading(currentPlan.currentEntry!)}
                type="button"
              >
                Open Reader
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 rounded-2xl border border-[#f1e8df] bg-white">
        <div className="text-center">
          <div className="px-3 py-4">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
              Progress
            </span>
            <span className="mt-1 block font-serif text-[22px] font-semibold text-[#25140b]">
              {currentPlan.progressPercent}%
            </span>
          </div>
        </div>
        <div className="border-x border-[#f1e8df] text-center">
          <div className="px-3 py-4">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
              Streak
            </span>
            <span className="mt-1 block font-serif text-[22px] font-semibold text-[#25140b]">
              {currentPlan.streak} days
            </span>
          </div>
        </div>
        <div className="text-center">
          <div className="px-3 py-4">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
              Pace
            </span>
            <span className="mt-1 block font-serif text-[22px] font-semibold text-[#25140b]">
              {currentPlan.templateMeta
                ? `~${currentPlan.templateMeta.estimatedMinutes}m`
                : "Daily"}
            </span>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-[18px] font-semibold text-[#25140b]">
              Journey Path
            </h3>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[#9b8878]">
              Select a day node to read or log completion
            </p>
          </div>
          <span className="rounded-full bg-[#fbf7f2] px-3 py-1 text-[10px] font-semibold text-[#7a6758]">
            {currentPlan.plan.completedEntries}/{currentPlan.plan.totalEntries}{" "}
            Done
          </span>
        </div>

        <div className="relative space-y-2 pl-2">
          {currentPlan.allEntries.map((entry) => {
            const isSelected = selectedEntryId === entry._id;
            const isPrimary = currentPlan.primaryEntry?._id === entry._id;
            return (
              <div
                key={entry._id}
                className="group relative pb-5 pl-10 last:pb-0"
              >
                <div className="absolute bottom-0 left-[11px] top-3 w-px bg-[#f1e8df] group-last:hidden" />
                <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center">
                  {entry.status === "completed" ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f6823c] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  ) : isPrimary ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#f6823c] bg-white">
                      <div className="h-2 w-2 rounded-full bg-[#f6823c]" />
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-[#e5d6c9] bg-white" />
                  )}
                </div>

                <div
                  className={cn(
                    "grid items-center gap-4 rounded-2xl border p-4 transition-colors md:grid-cols-[1fr_auto]",
                    entry.status === "completed"
                      ? "border-[#f1e8df] bg-white opacity-75 hover:opacity-100"
                      : isPrimary
                        ? "border-[#e5d6c9] bg-[#fbf7f2]"
                        : isSelected
                          ? "border-[#e5d6c9] bg-white"
                          : "border-[#f1e8df] bg-white hover:bg-[#fbf7f2]",
                  )}
                >
                  <button
                    className="min-w-0 rounded-full text-left"
                    onClick={() => onOpenReading(entry)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                        DAY {entry.dayNumber}
                      </span>
                      <span className="text-[9px] text-[#e5d6c9]">•</span>
                      <p
                        className={cn(
                          "font-serif text-[16px] font-semibold text-[#25140b]",
                          entry.status === "completed" &&
                            "text-[#9b8878] line-through decoration-[#e5d6c9]",
                        )}
                      >
                        {entry.passageLabel}
                      </p>
                      {isPrimary ? (
                        <span className="rounded-full border border-[#e5d6c9] bg-white px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#f6823c]">
                          Up Next
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#9b8878]">
                      {chapterRangeLabel(entry)} ·{" "}
                      {formatLongDate(entry.dueDate)}
                    </p>
                    {entry.reflection?.trim() ? (
                      <div className="mt-3 border-l border-[#e5d6c9] pl-3 text-[12px] italic leading-relaxed text-[#7a6758]">
                        &quot;{entry.reflection}&quot;
                      </div>
                    ) : null}
                  </button>

                  <div className="flex shrink-0 items-center gap-2 self-center">
                    <button
                      className="rounded-full border border-[#f1e8df] bg-white px-2 py-1.5 text-[12px] font-semibold text-[#25140b] hover:bg-[#fbf7f2]"
                      onClick={() => onOpenReading(entry)}
                      type="button"
                    >
                      {entry.startedAt ? "Resume" : "Read"}
                    </button>
                    <button
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border transition-all",
                        entry.status === "completed"
                          ? "border-[#f6823c] bg-[#f6823c] text-white"
                          : "border-[#f1e8df] bg-white text-[#9b8878] hover:border-[#f6823c] hover:text-[#f6823c]",
                      )}
                      onClick={async () => {
                        await onToggleEntry(entry._id);
                      }}
                      type="button"
                    >
                      <Check className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function JournalTab({
  currentPlan,
  onOpenReading,
}: {
  currentPlan: ReadingPlanCurrent;
  onOpenReading: (entry: ReadingPlanEntry) => Promise<void>;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1 mb-16">
        <h2 className="font-serif text-[22px] font-semibold tracking-tight text-[#25140b]">
          Reflections Library
        </h2>
        <p className="text-[13px] text-[#7a6758]">
          Your recorded memories, prayers, and lessons saved during each reading
          day.
        </p>
      </div>

      {currentPlan.journalEntries.length === 0 ? (
        <div>
          <FileText
            className="mb-6 h-10 w-10 text-[#9b8878]"
            strokeWidth={1.4}
          />
          <h3 className="font-serif text-xl font-semibold text-[#25140b]">
            Your journal is waiting
          </h3>
          <p className="mt-2 max-w-xl text-sm text-[#7a6758]">
            Write down contemplative reflections inside reading mode or complete
            specific daily readings to catalog your journey.
          </p>
          {currentPlan.primaryEntry ? (
            <button
              className="mt-6 rounded-lg bg-[#3a2218] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A1810]"
              onClick={() => onOpenReading(currentPlan.primaryEntry!)}
              type="button"
            >
              Browse Readings
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {currentPlan.journalEntries.map((entry) => (
            <div
              className="group relative flex flex-col justify-between rounded-lg border border-[#f1e8df] bg-white p-5 transition-colors hover:bg-[#fbf7f2]"
              key={entry._id}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                  <span>
                    {entry.completedAt
                      ? new Date(entry.completedAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : formatDateLabel(entry.dueDate)}
                  </span>
                  <span className="rounded-full border border-[#e5d6c9] bg-white px-2.5 py-0.5 text-[#7a6758]">
                    Day {entry.dayNumber}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif text-[18px] font-semibold text-[#25140b] group-hover:text-[#f6823c]">
                    {entry.passageLabel}
                  </h3>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#f6823c]">
                    Saved note
                  </p>
                </div>

                <p className="line-clamp-5 select-text text-[13px] italic leading-relaxed text-[#7a6758]">
                  &quot;{entry.reflection}&quot;
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#f1e8df] pt-4">
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9b8878]">
                  Reading Plan Devotion
                </span>
                <button
                  className="flex cursor-pointer items-center gap-1 rounded-lg px-4 py-2 text-xs font-semibold text-[#f6823c] hover:text-[#dd6f2f]"
                  onClick={() => onOpenReading(entry)}
                  type="button"
                >
                  <span>Revisit Scripture</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FocusTab({
  currentPlan,
  onOpenReading,
}: {
  currentPlan: ReadingPlanCurrent;
  onOpenReading: (entry: ReadingPlanEntry) => Promise<void>;
}) {
  const entry = currentPlan.primaryEntry ?? currentPlan.currentEntry;
  const [breathPhase, setBreathPhase] = useState<"Inhale" | "Hold" | "Exhale">(
    "Inhale",
  );
  const [cycleCount, setCycleCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBreathPhase((prev) => {
        if (prev === "Inhale") return "Hold";
        if (prev === "Hold") return "Exhale";
        return "Inhale";
      });
      setCycleCount((c) => c + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-3xl mx-auto mt-24 space-y-6">
      <div className="space-y-2 mb-8">
        <h2 className="font-serif text-[22px] font-semibold tracking-tight text-[#25140b]">
          Pause & Anchor
        </h2>
        <p className="text-sm text-[#7a6758] max-w-md">
          Clear away digital noise and quiet your thoughts for a moment before
          looking upon the sacred scripture. Quiet the outer self.
        </p>
      </div>

      <div className="relative overflow-hidden">
        <div className="space-y-8 py-4">
          <section className="p-4 pl-7">
            <div className="relative flex h-40 w-40 items-center justify-center">
              <motion.div
                animate={{
                  scale:
                    breathPhase === "Inhale"
                      ? 1.3
                      : breathPhase === "Hold"
                        ? 1.3
                        : 0.8,
                  opacity:
                    breathPhase === "Inhale"
                      ? 0.9
                      : breathPhase === "Hold"
                        ? 0.9
                        : 0.5,
                }}
                className="absolute inset-0 rounded-full border border-[#f6823c]/25 bg-[#fbf7f2]"
                transition={{ duration: 3.8, ease: "easeInOut" }}
              />
              <motion.div
                animate={{
                  scale:
                    breathPhase === "Inhale"
                      ? 1.15
                      : breathPhase === "Hold"
                        ? 1.15
                        : 0.85,
                }}
                className="relative z-20 flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[#f6823c] text-white"
                transition={{ duration: 3.8, ease: "easeInOut" }}
              >
                <span className="mb-1 block text-[8px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  {breathPhase === "Inhale"
                    ? "breathe in"
                    : breathPhase === "Hold"
                      ? "hold"
                      : "breathe out"}
                </span>
                <span className="font-serif text-[22px] font-semibold tracking-tight">
                  {breathPhase}
                </span>
              </motion.div>
            </div>
          </section>

          <div className="space-y-1.5 pt-4">
            <p className="text-[9px] uppercase tracking-[0.14em] text-[#9b8878]">
              Breath cycles completed:{" "}
              <span className="text-[12px] font-semibold text-[#f6823c]">
                {Math.floor(cycleCount / 3)}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-full border border-[#f1e8df] bg-white px-4 py-2 text-xs font-semibold text-[#7a6758] transition-colors hover:bg-[#fbf7f2] hover:text-[#25140b]"
              onClick={() => {
                setCycleCount(0);
                setBreathPhase("Inhale");
              }}
              type="button"
            >
              Reset Counter
            </button>
            {entry ? (
              <button
                className="rounded-full bg-[#f6823c] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#dd6f2f]"
                onClick={() => onOpenReading(entry)}
                type="button"
              >
                {entry.startedAt ? "Resume Reading" : "Proceed to Reading"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto inline-flex items-center gap-2.5 rounded-2xl border border-[#f1e8df] bg-[#fbf7f2] p-4 text-[12px] text-[#7a6758]">
        <Sparkles className="h-4 w-4 text-[#f6823c]" />
        <span className="font-serif italic">
          "Be still, and know that I am God." Psalm 46:10
        </span>
      </div>
    </div>
  );
}

function ReaderPanel({
  currentPlan,
  onClose,
  onSaveReflection,
  onToggleEntry,
  reflectionDraft,
  readerVersionId,
  selectedEntry,
  setReflectionDraft,
  setReaderVersionId,
  versions,
}: {
  currentPlan: ReadingPlanCurrent | null | undefined;
  onClose: () => void;
  onSaveReflection: () => Promise<void>;
  onToggleEntry: (entryId: Id<"userPlanEntries">) => Promise<void>;
  reflectionDraft: string;
  readerVersionId: string;
  selectedEntry: ReadingPlanEntry | null;
  setReflectionDraft: (value: string) => void;
  setReaderVersionId: (versionId: string) => void;
  versions: BibleVersion[];
}) {
  const chapterNumbers = useMemo(() => {
    if (!selectedEntry) return [];
    return Array.from(
      { length: selectedEntry.endChapter - selectedEntry.startChapter + 1 },
      (_, index) => selectedEntry.startChapter + index,
    );
  }, [selectedEntry]);

  const chapterQueries = useQueries({
    queries: chapterNumbers.map((chapter) => ({
      queryKey: [
        "reading-plan-panel",
        readerVersionId,
        selectedEntry?._id,
        selectedEntry?.passageBook,
        chapter,
      ],
      queryFn: async () => {
        if (!selectedEntry) {
          return null;
        }
        try {
          return await fetchBibleChapterForVersion(
            readerVersionId,
            selectedEntry.passageBook,
            chapter,
          );
        } catch (error) {
          console.error("Failed to load reading plan chapter:", error);
          throw error;
        }
      },
      enabled: Boolean(selectedEntry && readerVersionId),
      staleTime: Infinity,
      gcTime: Infinity,
    })),
  });

  const loading = chapterQueries.some((query) => query.isLoading);
  const hasError = chapterQueries.some((query) => query.isError);
  const chapterData = chapterQueries
    .map((query) => query.data)
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  const versionLabel =
    versions.find((version) => version.id === readerVersionId)?.abbreviation ??
    "";
  const audioText = useMemo(
    () =>
      chapterData
        .flatMap((chapter) =>
          chapter.verses.map(
            (verse) =>
              `${chapter.book} ${chapter.chapter}:${verse.number}. ${verse.text}`,
          ),
        )
        .join(" "),
    [chapterData],
  );
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [audioSupported, setAudioSupported] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioPaused, setAudioPaused] = useState(false);

  useEffect(() => {
    setAudioSupported(
      typeof window !== "undefined" && "speechSynthesis" in window,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedEntry?._id, readerVersionId]);

  const toggleAudioCompanion = () => {
    if (!audioText.trim()) {
      toast.error("Scripture audio is still loading.");
      return;
    }
    if (
      !audioSupported ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      toast.error("Audio companion is not supported in this browser.");
      return;
    }

    try {
      if (audioPlaying && !audioPaused) {
        window.speechSynthesis.pause();
        setAudioPaused(true);
        return;
      }

      if (audioPlaying && audioPaused) {
        window.speechSynthesis.resume();
        setAudioPaused(false);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(audioText);
      utterance.rate = 0.92;
      utterance.pitch = 0.95;
      utterance.onend = () => {
        setAudioPlaying(false);
        setAudioPaused(false);
        utteranceRef.current = null;
      };
      utterance.onerror = (event) => {
        console.error("Audio companion playback failed:", event.error);
        setAudioPlaying(false);
        setAudioPaused(false);
        utteranceRef.current = null;
        toast.error("Audio companion stopped unexpectedly.");
      };
      utteranceRef.current = utterance;
      setAudioPlaying(true);
      setAudioPaused(false);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Failed to control audio companion:", error);
      toast.error("Failed to start audio companion.");
    }
  };

  return (
    <>
      {!selectedEntry ? (
        <div className="flex flex-1 items-center justify-center bg-white p-8 text-center">
          <div className="max-w-sm space-y-3">
            <BookOpen className="mx-auto h-8 w-8 text-[#9b8878]" />
            <h3 className="font-serif text-[22px] font-semibold text-[#25140b]">
              Open a reading day
            </h3>
            <p className="text-[12px] leading-relaxed text-[#7a6758]">
              Select a chapter from your path. The text will open inside this
              calm, dedicated environment to protect your focus.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white p-5 text-[#25140b] md:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-[#f1e8df] pb-4">
              <div className="flex items-center gap-3">
                <button
                  aria-label="Back"
                  className="rounded-full p-1.5 text-[#7a6758] transition-colors hover:bg-[#fbf7f2] hover:text-[#25140b]"
                  onClick={onClose}
                  type="button"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                    {currentPlan?.plan.title ?? "Reading Plan"}
                  </span>
                  <span className="mt-0.5 block font-serif text-[15px] font-semibold text-[#25140b]">
                    {selectedEntry.passageLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-[#f1e8df] bg-white p-1">
                <select
                  className="h-7 rounded-lg bg-transparent px-2 text-[12px] font-semibold text-[#7a6758] outline-none"
                  onChange={(event) => setReaderVersionId(event.target.value)}
                  value={readerVersionId}
                >
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.abbreviation}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-7 flex items-center justify-between gap-5 rounded-2xl border border-[#f1e8df] bg-[#fbf7f2] p-4">
              <div className="flex items-center gap-3">
                <button
                  aria-label={
                    audioPlaying && !audioPaused
                      ? "Pause audio companion"
                      : "Play audio companion"
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3a2218] text-white transition-colors hover:bg-[#2A1810]"
                  onClick={toggleAudioCompanion}
                  type="button"
                >
                  {audioPlaying && !audioPaused ? (
                    <Pause className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                  )}
                </button>
                <div>
                  <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#f6823c]">
                    <Volume2 className="h-3 w-3" />
                    {!audioSupported
                      ? "Audio Unavailable"
                      : audioPlaying
                        ? audioPaused
                          ? "Audio Paused"
                          : "Audio Playing"
                        : "Audio Companion"}
                  </span>
                  <h4 className="font-serif text-[12px] font-semibold text-[#25140b]">
                    {selectedEntry.passageLabel} read aloud
                  </h4>
                </div>
              </div>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#f1e8df]">
                <div
                  className="h-full rounded-full bg-[#f6823c] transition-all"
                  style={{
                    width: audioPlaying
                      ? audioPaused
                        ? "50%"
                        : "100%"
                      : "18%",
                  }}
                />
              </div>
            </div>

            <div className="mx-auto max-w-2xl flex-1 space-y-8 selection:bg-[#fde6d8]">
              <div className="border-b border-[#f1e8df] pb-5 text-center">
                <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9b8878]">
                  Today&apos;s Scripture
                </span>
                <h2 className="font-serif text-[26px] font-semibold tracking-tight text-[#25140b]">
                  {selectedEntry.passageLabel}
                </h2>
                <p className="mt-1 text-[12px] italic text-[#7a6758]">
                  &quot;{chapterRangeLabel(selectedEntry)}&quot;
                </p>
              </div>

              {loading ? (
                <div className="space-y-4">
                  <div className="h-5 w-36 animate-pulse rounded bg-neutral-200/60" />
                  <div className="h-4 w-full animate-pulse rounded bg-neutral-200/50" />
                  <div className="h-4 w-[90%] animate-pulse rounded bg-neutral-200/50" />
                  <div className="h-4 w-[93%] animate-pulse rounded bg-neutral-200/50" />
                </div>
              ) : hasError ? (
                <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 text-[12px] leading-relaxed text-red-600">
                  Scripture text could not be loaded for this reading.
                </div>
              ) : (
                <div className="space-y-8">
                  {chapterData.map((chapter) => (
                    <article
                      key={`${chapter.book}-${chapter.chapter}`}
                      className="space-y-4"
                    >
                      <div className="mb-4 border-b border-[#f1e8df] pb-2">
                        <p className="font-serif text-[20px] font-semibold text-[#25140b]">
                          {chapter.book} {chapter.chapter}
                        </p>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9b8878]">
                          {versionLabel}
                        </p>
                      </div>
                      <div className="space-y-3">
                        {chapter.verses.map((verse) => (
                          <VerseRow
                            chapter={chapter.chapter}
                            highlighted={
                              chapter.chapter ===
                                selectedEntry.passageChapter &&
                              verse.number === selectedEntry.passageVerse
                            }
                            key={`${chapter.chapter}-${verse.number}`}
                            verse={verse}
                          />
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex h-full w-full flex-col justify-between border-l border-[#f1e8df] bg-[#fbf7f2] p-5 md:w-[430px] md:p-6">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-1.5 text-[#f6823c]">
                  <Edit3 className="h-4 w-4" />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em]">
                    Personal Journal
                  </span>
                </div>
                <h3 className="mt-1.5 font-serif text-[18px] font-semibold text-[#25140b]">
                  Devotional Reflection
                </h3>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[#7a6758]">
                  Record what you hear in the quiet, and keep it in your
                  reflection library.
                </p>
              </div>

              <div className="rounded-xl border border-[#f1e8df] bg-white p-4 text-[12px]">
                <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#f6823c]">
                  Reflection Prompt
                </span>
                <p className="italic leading-relaxed text-[#7a6758]">
                  &quot;How did today&apos;s reading comfort or convict
                  you?&quot;
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-[#9b8878]">
                  <span>Write Note</span>
                  <span className="tabular-nums">
                    {reflectionDraft.length} chars
                  </span>
                </div>

                <textarea
                  className="h-64 w-full resize-none rounded-2xl border border-[#f1e8df] bg-white p-4 text-[13px] leading-relaxed text-[#25140b] outline-none transition-colors placeholder:text-[#9b8878] focus:border-[#f6823c] focus:ring-1 focus:ring-[#f6823c]"
                  onChange={(event) => setReflectionDraft(event.target.value)}
                  placeholder="Type your notes, prayers, or lessons from this reading..."
                  value={reflectionDraft}
                />
              </div>
            </div>

            <div className="mt-6 space-y-2 border-t border-[#e5d6c9] pt-6">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f6823c] py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#dd6f2f]"
                onClick={async () => {
                  await onSaveReflection();
                  if (selectedEntry.status !== "completed") {
                    await onToggleEntry(selectedEntry._id);
                  }
                  onClose();
                }}
                type="button"
              >
                <span>Reflect & Complete Day {selectedEntry.dayNumber}</span>
                <CheckCircle2 className="h-4 w-4" />
              </button>

              <button
                className="w-full rounded-full border border-transparent bg-transparent py-1.5 text-[12px] font-semibold text-[#7a6758] transition-colors hover:bg-white hover:text-[#25140b]"
                onClick={onClose}
                type="button"
              >
                Cancel Reading
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function VerseRow({
  chapter,
  highlighted,
  verse,
}: {
  chapter: number;
  highlighted: boolean;
  verse: BibleVerse;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-xl px-2 py-1.5 transition-colors",
        highlighted ? "bg-[#fde6d8]/45" : "bg-transparent",
      )}
    >
      <span className="pt-0.5 text-[10px] font-semibold text-[#9b8878]">
        {chapter}:{verse.number}
      </span>
      <p className="font-serif text-[15px] leading-relaxed text-[#25140b] md:text-[16px]">
        {verse.text}
      </p>
    </div>
  );
}
