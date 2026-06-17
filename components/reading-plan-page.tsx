"use client";

import { useEffect, useMemo, useState } from "react";
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
  Clock3,
  Edit3,
  FileText,
  Flame,
  Play,
  Sparkles,
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

type ReadingTab = "hub" | "journal" | "focus";

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

export default function ReadingPlanPage() {
  const auth = useConvexAuth();
  const authIdentity = useQuery(api.auth.getUserIdentity);
  const syncViewerIdentity = useMutation(api.identity.syncViewerIdentity);
  const setIdentity = useStudyStore((s) => s.setIdentity);
  const identityId = useStudyStore((s) => s.identityId);
  const [storeReady, setStoreReady] = useState(false);
  const [activeTab, setActiveTab] = useState<ReadingTab>("hub");
  const [selectedEntryId, setSelectedEntryId] = useState<Id<"userPlanEntries"> | null>(null);
  const [readerOpenMobile, setReaderOpenMobile] = useState(false);
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [readerVersionId, setReaderVersionId] = useState("");

  const templates = useQuery(api.readingPlans.templates) ?? [];
  const currentPlan = useQuery(api.readingPlans.current, {
    ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
  }) as ReadingPlanCurrent | null | undefined;
  const createPlan = useMutation(api.readingPlans.create);
  const openPlanEntry = useMutation(api.readingPlans.openEntry);
  const toggleEntry = useMutation(api.readingPlans.toggleEntry);
  const saveReflection = useMutation(api.readingPlans.saveReflection);
  const archiveCurrent = useMutation(api.readingPlans.archiveCurrent);
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
          console.error("Failed to sync signed-in identity in reading plan:", error);
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
          console.error("Anonymous identity request failed in reading plan:", res.status);
        }
      } catch (error) {
        console.error("Failed to get anonymous identity in reading plan:", error);
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
    if (!readerVersionId || !bibleVersions.find((version) => version.id === readerVersionId)) {
      setReaderVersionId(preferred);
    }
  }, [bibleVersions, readerVersionId]);

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

  const featuredTemplates = useMemo(
    () => (templates as TemplateCard[]).filter((template) => template.featured).slice(0, 4),
    [templates],
  );

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
      await createPlan({
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
        startDate: todayString(),
        templateId,
      });
      setActiveTab("hub");
      toast.success(`Started ${title}`);
    } catch (error) {
      console.error("Failed to create reading plan:", error);
      toast.error("Failed to create reading plan.");
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
    try {
      await archiveCurrent({
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
      });
      toast.success("Current plan archived.");
    } catch (error) {
      console.error("Failed to archive current plan:", error);
      toast.error("Failed to archive current plan.");
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
      <div className="flex min-h-0 flex-1 overflow-hidden bg-white">
        <ReadingPlanRail
          currentPlan={currentPlan}
          featuredTemplates={featuredTemplates}
          groupedTemplates={groupedTemplates}
          onArchiveCurrent={handleArchiveCurrent}
          onStartPlan={startPlan}
          selectedTemplateId={currentPlan?.plan.templateId ?? null}
        />

        <main className="bible-app-scroll min-w-0 flex-1 overflow-y-auto bg-white px-4 py-5 md:px-6 md:py-6 xl:px-8">
          <PageHeader
            activeTab={activeTab}
            currentPlan={currentPlan}
            journalCount={currentPlan?.journalEntries.length ?? 0}
            onChangeTab={setActiveTab}
          />

          {!currentPlan ? (
            <BrowseState
              featuredTemplates={featuredTemplates}
              groupedTemplates={groupedTemplates}
              onStartPlan={startPlan}
            />
          ) : activeTab === "hub" ? (
            <HubTab
              currentPlan={currentPlan}
              onOpenReading={openReading}
              onToggleEntry={handleToggleEntry}
              selectedEntryId={selectedEntry?._id ?? null}
            />
          ) : activeTab === "journal" ? (
            <JournalTab
              currentPlan={currentPlan}
              onOpenReading={openReading}
            />
          ) : (
            <FocusTab
              currentPlan={currentPlan}
              onOpenReading={openReading}
            />
          )}
        </main>

      </div>

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
              className="absolute inset-0"
              onClick={() => setReaderOpenMobile(false)}
              type="button"
            />
            <motion.div
              animate={{ x: 0 }}
              className="relative z-20 flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl md:flex-row"
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
    <div className="mb-8 flex flex-col gap-5 border-b border-[#EDECE4] pb-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Reading Workspace
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-neutral-900 md:text-5xl">
            {currentPlan ? currentPlan.plan.title : "Reading Plans"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500 md:text-base">
            {currentPlan
              ? currentPlan.templateMeta?.summary ?? currentPlan.plan.description
              : "Choose a curated path, read inside this page, and keep your progress, reflections, and current passage together."}
          </p>
        </div>

        {currentPlan?.templateMeta ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-[#EDECE4] bg-white px-4 py-2 text-xs text-neutral-500 shadow-sm">
              <span className="block text-[9px] font-bold uppercase leading-none text-neutral-400">
                Category
              </span>
              <span className="mt-1 block font-serif font-bold text-neutral-800">
                {currentPlan.templateMeta.category}
              </span>
            </div>
            <div className="rounded-xl border border-[#EDECE4] bg-white px-4 py-2 text-xs text-neutral-500 shadow-sm">
              <span className="block text-[9px] font-bold uppercase leading-none text-neutral-400">
                Pace
              </span>
              <span className="mt-1 block font-serif font-bold text-neutral-800">
                {currentPlan.templateMeta.cadenceLabel}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#EDECE4] bg-[#FAF9F5] p-1">
        {[
          { id: "hub", label: "Reading Hub" },
          { id: "journal", label: "My Journal", count: journalCount },
          { id: "focus", label: "Breath & Focus" },
        ].map((tab) => (
          <button
            className={cn(
              "relative rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wide text-neutral-500 transition-all duration-300",
              activeTab === tab.id
                ? "bg-[#2E4A3F] text-white shadow-sm"
                : "hover:bg-neutral-200/50 hover:text-neutral-900",
            )}
            key={tab.id}
            onClick={() => onChangeTab(tab.id as ReadingTab)}
            type="button"
          >
            {tab.label}
            {"count" in tab && typeof tab.count === "number" && tab.count > 0 ? (
              <span className="absolute -right-0.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-amber-500 px-1 text-[9px] font-bold text-white">
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
  currentPlan,
  featuredTemplates,
  groupedTemplates,
  onArchiveCurrent,
  onStartPlan,
  selectedTemplateId,
}: {
  currentPlan: ReadingPlanCurrent | null | undefined;
  featuredTemplates: TemplateCard[];
  groupedTemplates: [string, TemplateCard[]][];
  onArchiveCurrent: () => Promise<void>;
  onStartPlan: (templateId: string, title: string) => Promise<void>;
  selectedTemplateId: string | null;
}) {
  return (
    <aside className="hidden min-h-0 w-[300px] shrink-0 overflow-y-auto border-r border-[#EDECE4] bg-white px-0 py-0 lg:block">
      <div className="bible-app-scroll h-full space-y-8 px-6 py-6">
      {currentPlan ? (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Active Itinerary
            </span>
            <BookOpen className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-[#1E332B] bg-gradient-to-br from-[#2E4A3F] to-[#1E332B] p-5 text-[#F3EFE0] shadow-md">
            <div className="relative z-10">
              <span className="rounded border border-emerald-800 bg-emerald-900/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-200">
                Active Itinerary
              </span>
              <h2 className="mt-2 font-serif text-lg font-bold leading-tight text-white">
                {currentPlan.plan.title}
              </h2>
              <p className="mt-1 text-[11px] text-emerald-200/70">
                {currentPlan.templateMeta?.category ?? "Plan"}
              </p>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <span className="font-serif text-[22px] font-bold text-white">
                    {currentPlan.progressPercent}%
                  </span>
                  <span className="block text-[10px] text-emerald-300">
                    completed
                  </span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-800 bg-emerald-950/40 text-emerald-200 shadow-inner">
                  <Clock3 className="h-4 w-4" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-[#3D5E4F] opacity-20 blur-xl" />
          </div>
          <button
            className="mt-4 w-full rounded-xl border border-[#EDECE4] bg-white px-3 py-2 text-[12px] font-semibold text-[#a24723] transition-colors hover:bg-[#FAF9F5]"
            onClick={onArchiveCurrent}
            type="button"
          >
            Archive Current Plan
          </button>
        </section>
      ) : (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Featured Plans
            </span>
            <BookOpen className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-3 space-y-2">
            {featuredTemplates.map((template) => (
              <button
                className="w-full rounded-xl border border-[#EDECE4] bg-white p-3.5 text-left transition-all duration-300 hover:bg-[#FAF9F5] hover:border-neutral-300"
                key={template.id}
                onClick={() => onStartPlan(template.id, template.title)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-serif text-sm font-bold text-[#2E4A3F]">
                    {template.title}
                    </span>
                    <span className="mt-1 block text-[10px] text-neutral-400">
                      {template.category}
                    </span>
                  </span>
                  <span className="rounded bg-[#EFECE6]/40 px-1.5 py-0.5 font-mono text-[9px] uppercase text-neutral-400">
                    {formatDuration(template.durationDays)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <span className="block border-b border-[#EDECE4] pb-2 text-[10px] font-bold uppercase tracking-widest text-[#2E4A3F]">
          Itinerary Options
        </span>
        {groupedTemplates.map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            {category}
            </h3>
            <div className="space-y-2">
              {items.map((template) => (
                <button
                  className={cn(
                    "w-full rounded-xl border p-3.5 text-left transition-all duration-300",
                    selectedTemplateId === template.id
                      ? "border-[#E2DDD2] bg-white shadow-sm text-[#1F332B]"
                      : "border-transparent bg-transparent text-neutral-600 hover:border-neutral-200 hover:bg-white/60",
                  )}
                  key={template.id}
                  onClick={() => onStartPlan(template.id, template.title)}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("truncate font-serif text-sm tracking-tight", selectedTemplateId === template.id && "font-bold text-[#2E4A3F]")}>
                      {template.title}
                    </span>
                    {selectedTemplateId === template.id ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2E4A3F]" />
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-400">
                    <span>{template.category}</span>
                    <span className="rounded bg-[#EFECE6]/40 px-1 text-[9px] font-mono uppercase">
                      {formatDuration(template.durationDays)}
                    </span>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-neutral-200/50">
                    <div
                      className="h-full bg-[#2E4A3F]"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((template.estimatedMinutes / 20) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="rounded-xl border border-[#EBE6D7] bg-[#F3EFE0]/60 p-4 text-neutral-700">
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#2E4A3F]">
          Today&apos;s Insight
        </span>
        <p className="mt-1.5 font-serif text-xs italic leading-relaxed text-neutral-600">
          "Like cold water to a weary soul is good news from a distant land."
        </p>
        <span className="mt-2 block text-right font-mono text-[10px] text-neutral-400">
          — Proverbs 25:25
        </span>
      </div>
      </div>
    </aside>
  );
}

function BrowseState({
  featuredTemplates,
  groupedTemplates,
  onStartPlan,
}: {
  featuredTemplates: TemplateCard[];
  groupedTemplates: [string, TemplateCard[]][];
  onStartPlan: (templateId: string, title: string) => Promise<void>;
}) {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-[#EDECE4] bg-gradient-to-br from-[#1E332B] via-[#2E4A3F] to-[#253C33] p-8 text-[#F3EFE0] shadow-lg">
          <span className="inline-block rounded-full border border-emerald-800/80 bg-emerald-900/60 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-200">
            Start a Curated Plan
          </span>
          <h2 className="mt-4 max-w-[720px] font-serif text-4xl font-bold leading-tight text-white md:text-5xl">
            Keep scripture, structure, and reflection in one calm reading flow.
          </h2>
          <p className="mt-4 max-w-[780px] text-sm leading-relaxed text-emerald-100/80 md:text-base">
            Pick a plan, stay inside this page to read, and carry your journal and focus tools along with the day&apos;s passage.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {featuredTemplates.slice(0, 2).map((template) => (
            <button
              className="rounded-2xl border border-[#EDECE4] bg-white p-5 text-left transition-colors hover:bg-[#FAF9F5]"
              key={template.id}
              onClick={() => onStartPlan(template.id, template.title)}
              type="button"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#a24723]">
                Featured
              </p>
              <h3 className="mt-3 font-serif text-2xl font-bold text-[#25140b]">
                {template.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {template.summary}
              </p>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                {formatDuration(template.durationDays)} · {template.cadenceLabel}
              </p>
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        {groupedTemplates.map(([category, items]) => (
          <section key={category}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-2xl font-bold text-[#25140b]">
                {category}
              </h3>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                {items.length} plans
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {items.map((template) => (
                <button
                  className="rounded-2xl border border-[#EDECE4] bg-white p-5 text-left transition-colors hover:bg-[#FAF9F5]"
                  key={template.id}
                  onClick={() => onStartPlan(template.id, template.title)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif text-[22px] font-bold leading-tight text-[#25140b]">
                        {template.title}
                      </h4>
                      <p className="mt-2 text-[13px] leading-6 text-[#7a6758]">
                        {template.summary}
                      </p>
                    </div>
                    {template.featured && (
                      <span className="rounded-full border border-[#f2dcc5] bg-[#fff2e6] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a24723]">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9b8878]">
                    <span className="rounded-full border border-[#f1e8df] bg-[#fbf7f2] px-2 py-1">
                      {formatDuration(template.durationDays)}
                    </span>
                    <span className="rounded-full border border-[#f1e8df] bg-[#fbf7f2] px-2 py-1">
                      {template.cadenceLabel}
                    </span>
                    <span className="rounded-full border border-[#f1e8df] bg-[#fbf7f2] px-2 py-1">
                      ~{template.estimatedMinutes} min
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
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
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[#15241E] bg-gradient-to-br from-[#1E332B] via-[#2E4A3F] to-[#253C33] p-6 text-[#F3EFE0] shadow-lg md:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <span className="inline-block rounded-full border border-emerald-800/80 bg-emerald-900/60 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-200">
              Today&apos;s Recommended Entry
            </span>
            <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-white md:text-5xl">
              {heroEntry?.passageLabel ?? "Plan Complete"}
            </h2>
            <p className="mt-2 text-xs italic text-emerald-300">
              {heroEntry ? chapterRangeLabel(heroEntry) : "You finished every reading"}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-emerald-100/80">
              {heroEntry
                ? `Day ${heroEntry.dayNumber} of ${currentPlan.plan.totalEntries} · ${currentPlan.templateMeta?.cadenceLabel ?? "Daily reading"}`
                : "You have finished every scheduled reading in this plan."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {heroEntry ? (
                <button
                  className="flex items-center gap-2 rounded-xl bg-[#EA7C5A] px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-[#EA7C5A]/15 transition-all"
                  onClick={() => onOpenReading(heroEntry)}
                  type="button"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
              {currentPlan.currentEntry && currentPlan.hasStartedReading ? (
                <button
                  className="rounded-xl border border-emerald-800/50 bg-emerald-900/30 px-4 py-3.5 text-xs font-bold text-[#F3EFE0] transition-colors hover:bg-emerald-900/50"
                  onClick={() => onOpenReading(currentPlan.currentEntry!)}
                  type="button"
                >
                  Open Reader
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MetricTile
              icon={<CheckCircle2 className="h-4 w-4 text-[#2e6b3d]" />}
              label="Progress"
              value={`${currentPlan.progressPercent}%`}
            />
            <MetricTile
              icon={<Flame className="h-4 w-4 text-[#f6823c]" />}
              label="Streak"
              value={`${currentPlan.streak} day${currentPlan.streak === 1 ? "" : "s"}`}
            />
            <MetricTile
              icon={<Clock3 className="h-4 w-4 text-[#7a6758]" />}
              label="Pace"
              value={currentPlan.templateMeta ? `~${currentPlan.templateMeta.estimatedMinutes} min` : "Daily"}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#EDECE4] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold text-neutral-900 md:text-2xl">
              Journey Path
            </h3>
            <p className="text-xs text-neutral-400">
              Click a day card to open reading or log complete state
            </p>
          </div>
          <span className="rounded bg-[#EFECE6] px-2.5 py-1 font-mono text-xs text-neutral-500">
            {currentPlan.plan.completedEntries}/{currentPlan.plan.totalEntries} Done
          </span>
        </div>

        <div className="space-y-3">
          {currentPlan.allEntries.map((entry) => {
            const isSelected = selectedEntryId === entry._id;
            const isPrimary = currentPlan.primaryEntry?._id === entry._id;
            return (
              <div
                className={cn(
                  "grid gap-4 rounded-2xl border px-4 py-4 transition-all duration-300 md:grid-cols-[88px_minmax(0,1fr)_auto]",
                  entry.status === "completed"
                    ? "border-neutral-200/60 bg-white/60 opacity-75 hover:opacity-100 hover:bg-white"
                    : isPrimary
                      ? "scale-[1.01] border-[#EA7C5A] bg-white shadow-md shadow-[#EA7C5A]/5"
                      : isSelected
                        ? "border-neutral-300 bg-[#FAF9F5]"
                        : "border-[#EDECE4] bg-white hover:border-neutral-300",
                )}
                key={entry._id}
              >
                <button
                  className={cn(
                    "flex h-[68px] flex-col items-center justify-center rounded-2xl border text-center transition-colors",
                    entry.status === "completed"
                      ? "border-[#EFECE6] bg-[#EFECE6] text-neutral-500"
                      : isPrimary
                        ? "border-[#EA7C5A] bg-[#EA7C5A] text-white shadow-sm"
                        : "border-transparent bg-[#F3EFE0] text-[#2E4A3F]",
                  )}
                  onClick={() => onOpenReading(entry)}
                  type="button"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
                    Day
                  </span>
                  <span className="mt-1 font-serif text-[24px] font-semibold leading-none">
                    {entry.dayNumber}
                  </span>
                </button>

                <button
                  className="min-w-0 text-left"
                  onClick={() => onOpenReading(entry)}
                  type="button"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("font-serif text-base font-bold tracking-tight md:text-lg", entry.status === "completed" ? "text-neutral-500 line-through decoration-neutral-300" : "text-neutral-900")}>
                      {entry.passageLabel}
                    </p>
                    {isPrimary ? (
                      <span className="rounded-full border border-[#f2dcc5] bg-[#fff2e6] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a24723]">
                        Up Next
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs font-medium text-neutral-500">
                    {chapterRangeLabel(entry)} · {formatLongDate(entry.dueDate)}
                  </p>
                  {entry.reflection?.trim() ? (
                    <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#5d493a]">
                      {entry.reflection}
                    </p>
                  ) : null}
                </button>

                <div className="flex items-center gap-2 self-start">
                  <button
                    className="rounded-xl border border-[#EDECE4] bg-white px-3 py-2 text-[12px] font-semibold text-[#25140b] transition-colors hover:bg-[#FAF9F5]"
                    onClick={() => onOpenReading(entry)}
                    type="button"
                  >
                    {entry.startedAt ? "Resume" : "Read"}
                  </button>
                  <button
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
                      entry.status === "completed"
                        ? "border-[#2E4A3F] bg-[#2E4A3F] text-[#F3EFE0]"
                        : "border-[#EDECE4] bg-transparent text-neutral-300 hover:border-[#2E4A3F] hover:text-[#2E4A3F]",
                    )}
                    onClick={async () => {
                      await onToggleEntry(entry._id);
                    }}
                    type="button"
                  >
                    <Check className="h-4 w-4" />
                  </button>
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
    <div className="space-y-6">
      <div className="border-b border-[#EDECE4] pb-6">
        <h1 className="mb-2 font-serif text-3xl font-bold leading-none tracking-tight text-neutral-900">
          My Library of Reflections
        </h1>
        <p className="text-sm text-neutral-500">
          Every recorded memory, spiritual note, and highlight saved during your readings.
        </p>
      </div>

      {currentPlan.journalEntries.length === 0 ? (
        <div className="mx-auto rounded-3xl border border-[#EDECE4] bg-white py-20 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-neutral-300" />
          <h3 className="font-serif text-lg font-bold text-neutral-800">
            Your journal is waiting
          </h3>
          <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-neutral-500">
            Write down contemplative reflections inside reading mode or complete specific daily readings to catalog your journey.
          </p>
          {currentPlan.primaryEntry ? (
            <button
              className="mt-6 rounded-xl bg-[#2E4A3F] px-4 py-2.5 text-xs font-bold text-[#F3EFE0]"
              onClick={() => onOpenReading(currentPlan.primaryEntry!)}
              type="button"
            >
              Browse Readings
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {currentPlan.journalEntries.map((entry) => (
            <div
              className="group relative flex flex-col justify-between rounded-2xl border border-[#EDECE4] bg-white p-6 shadow-sm transition-transform duration-300 hover:scale-[1.01]"
              key={entry._id}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between font-mono text-[10px] text-neutral-400">
                  <span>{entry.completedAt ? new Date(entry.completedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : formatDateLabel(entry.dueDate)}</span>
                  <span className="rounded border border-[#EDECE4] bg-[#FAF9F5] px-2 py-0.5">
                    {currentPlan.plan.title} - Day {entry.dayNumber}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-[#1F332B]">
                    {entry.passageLabel}
                  </h3>
                  <p className="text-xs italic text-neutral-400">
                    Saved reflection
                  </p>
                </div>

                <p className="line-clamp-4 select-text text-sm leading-relaxed text-neutral-600">
                  &quot;{entry.reflection}&quot;
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4 text-xs">
                <span className="text-[10px] font-bold text-[#2E4A3F]">
                  Reading Plan Devotions
                </span>
                <button
                  className="flex cursor-pointer items-center gap-1 text-xs font-bold text-[#EA7C5A] hover:text-[#D76949]"
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

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-bold tracking-tight text-neutral-900">
          Pause & Anchor
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-neutral-500">
          Clear away digital noise and quiet your thoughts for a moment before looking upon the sacred scripture. Quiet the outer self.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[32px] border border-[#EDECE4] bg-white p-10 text-center shadow-sm md:p-14">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F3EFE0]/30 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-10 py-6">
          <div className="relative flex h-64 w-64 items-center justify-center mx-auto">
            <motion.div
              animate={{ scale: [0.9, 1.4, 1.4, 0.9], opacity: [0.65, 1, 1, 0.65] }}
              className="absolute inset-0 rounded-full border border-[#2E4A3F]/20 bg-[rgba(74,117,98,0.06)]"
              transition={{ duration: 8, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            />
            <motion.div
              animate={{ scale: [0.85, 1.2, 1.2, 0.85] }}
              className="relative z-20 flex h-36 w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#2E4A3F] to-[#1F332B] text-white shadow-xl shadow-[#2E4A3F]/10"
              transition={{ duration: 8, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            >
              <span className="mb-1 block text-xs font-mono uppercase tracking-widest text-emerald-200">
                inhale
              </span>
              <span className="text-3xl font-serif font-black text-[#F3EFE0]">
                In
              </span>
            </motion.div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-serif font-bold text-neutral-800">
              Fill your lungs with gratitude.
            </h3>
            <p className="text-xs font-mono text-neutral-400">
              Breath cycles completed: pause and continue when you are ready
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              className="rounded-xl bg-[#2E4A3F] px-5 py-2.5 text-xs font-bold text-white"
              onClick={() => {}}
              type="button"
            >
              Reset Anchor
            </button>
            {entry ? (
              <button
                className="rounded-xl border border-neutral-200 bg-neutral-100 px-5 py-2.5 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-200"
                onClick={() => onOpenReading(entry)}
                type="button"
              >
                {entry.startedAt ? "Resume Reading" : "Proceed to Reading"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto inline-flex items-center gap-2.5 rounded-xl border border-[#EBE6D7] bg-[#F3EFE0]/40 p-4 text-xs text-neutral-600">
        <Sparkles className="h-4 w-4 text-[#EA7C5A]" />
        <span>"Be still, and know that I am God." — Psalm 46:10</span>
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
    versions.find((version) => version.id === readerVersionId)?.abbreviation ?? "";

  return (
    <>
      {!selectedEntry ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div>
            <p className="font-serif text-[28px] font-semibold text-[#25140b]">
              Open a reading day
            </p>
            <p className="mt-2 max-w-[360px] text-[13px] leading-6 text-[#7a6758]">
              The scripture text stays here so the reading plan page can be your guided reading workspace.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#FAF6EE] p-6 text-[#2C2314] transition-colors duration-500 md:p-12">
            <div className="mb-8 flex items-center justify-between border-b border-black/5 pb-6">
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full p-1 hover:bg-black/5"
                  onClick={onClose}
                  type="button"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <span className="block font-mono text-[9px] uppercase tracking-wider opacity-60">
                    {currentPlan?.plan.title ?? "Reading Plan"}
                  </span>
                  <span className="mt-0.5 block font-serif text-sm font-bold">
                    {selectedEntry.passageLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-black/5 bg-[#FCFBF8]/30 p-1 backdrop-blur">
                <select
                  className="h-7 rounded border border-transparent bg-transparent px-1 text-xs font-bold text-neutral-600 outline-none"
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

            <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-[#EA7C5A]/25 bg-[#EA7C5A]/10 p-4">
              <div className="flex items-center gap-3">
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2E4A3F] text-white transition-transform active:scale-95"
                  type="button"
                >
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </button>
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#EA7C5A]">
                    Audio companion
                  </span>
                  <h4 className="font-serif text-xs font-bold text-[#1F332B]">
                    {selectedEntry.passageLabel} ambient guide
                  </h4>
                </div>
              </div>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full w-1/3 bg-[#EA7C5A]" />
              </div>
            </div>

            <div className="mx-auto max-w-2xl flex-1 space-y-10 selection:bg-amber-200/80">
              <div className="border-b border-black/5 pb-6 text-center">
                <span className="mb-1 block font-mono text-xs uppercase tracking-widest opacity-50">
                  Today&apos;s reading passage
                </span>
                <h2 className="font-serif text-3xl font-bold tracking-tight">
                  {selectedEntry.passageLabel}
                </h2>
                <p className="mt-1 text-sm italic opacity-60">
                  &quot;{chapterRangeLabel(selectedEntry)}&quot;
                </p>
              </div>

              <p className="mx-auto max-w-lg rounded-xl bg-black/5 px-4 py-3 text-xs italic leading-relaxed opacity-60">
                <span className="font-bold">Highlight Tip:</span> Use this devotional panel to read, reflect, and complete the day&apos;s entry.
              </p>

            {loading ? (
              <div className="space-y-3">
                <div className="h-6 w-44 animate-pulse rounded bg-[#e9dfd1]" />
                <div className="h-4 w-full animate-pulse rounded bg-[#eee5d8]" />
                <div className="h-4 w-[88%] animate-pulse rounded bg-[#eee5d8]" />
                <div className="h-4 w-[92%] animate-pulse rounded bg-[#eee5d8]" />
              </div>
            ) : hasError ? (
              <div className="rounded-2xl border border-[#f2dcc5] bg-[#fff2e6] p-4 text-[13px] leading-6 text-[#a24723]">
                Scripture text could not be loaded for this reading.
              </div>
            ) : (
              <div className="space-y-8">
                {chapterData.map((chapter) => (
                  <article key={`${chapter.book}-${chapter.chapter}`}>
                    <div className="mb-4 border-b border-black/5 pb-2">
                      <p className="font-serif text-2xl font-bold">
                        {chapter.book} {chapter.chapter}
                      </p>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-wider opacity-50">
                        {versionLabel}
                      </p>
                    </div>
                    <div className="space-y-4">
                      {chapter.verses.map((verse) => (
                        <VerseRow
                          chapter={chapter.chapter}
                          highlighted={
                            chapter.chapter === selectedEntry.passageChapter &&
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

          <div className="flex h-full w-full flex-col justify-between border-l border-[#EDECE4] bg-[#FCFBF8] p-6 md:w-[360px] md:p-8">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-1.5 text-[#EA7C5A]">
                  <Edit3 className="h-4 w-4" />
                  <span className="font-sans text-[10px] font-black uppercase tracking-widest">
                    Personal Journal
                  </span>
                </div>
                <h3 className="mt-1 font-serif text-xl font-bold text-[#1F332B]">
                  Devotional Reflection
                </h3>
                <p className="mt-1 text-xs text-neutral-400">
                  Record what you hear in the quiet, and keep it in your reflection library.
                </p>
              </div>

              <div className="rounded-xl border border-[#EDECE4] bg-[#FAF9F5] p-3 text-xs">
                <span className="mb-1 block font-bold text-[#2E4A3F]">
                  Reflection Suggestion
                </span>
                <p className="italic leading-relaxed text-neutral-500">
                  &quot;How did today&apos;s reading comfort or convict you?&quot;
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-neutral-400">
                    Write Note
                  </span>
                  <span className="text-[10px] font-bold tracking-wider text-neutral-400">
                    {reflectionDraft.length} chars
                  </span>
                </div>

                <textarea
                  className="h-56 w-full resize-none rounded-xl border border-[#EDECE4] bg-white p-3.5 text-xs leading-relaxed text-neutral-700 shadow-inner outline-none focus:border-[#2E4A3F] focus:ring-1 focus:ring-[#2E4A3F]"
                  onChange={(event) => setReflectionDraft(event.target.value)}
                  placeholder="Type your notes, prayers, or lessons from this reading..."
                  value={reflectionDraft}
                />
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t border-neutral-200 pt-6">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2E4A3F] py-4 text-xs font-bold text-white shadow-md transition-all hover:scale-[1.01] hover:bg-[#20342C]"
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
                className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 text-xs font-bold text-neutral-500 transition-colors hover:bg-neutral-100"
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
        "grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-xl border-l-2 px-3 py-2",
        highlighted ? "border-[#f6823c] bg-[#fff8f1]" : "border-transparent",
      )}
    >
      <span className="pt-0.5 text-[11px] font-semibold text-[#9b8878]">
        {chapter}:{verse.number}
      </span>
      <p className="font-serif text-[18px] leading-8 text-[#25140b]">
        {verse.text}
      </p>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#eadfd4] bg-[#fffaf5] p-4">
      <div className="flex items-center gap-2 text-[#7a6758]">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-3 font-serif text-[24px] font-semibold text-[#25140b]">
        {value}
      </p>
    </div>
  );
}
