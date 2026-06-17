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
    <div className="mb-8 flex flex-col gap-6 border-b border-[#EDECE4]/50 pb-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#EA7C5A]">
            Reading Workspace
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl lg:text-5xl text-wrap-balance leading-none">
            {currentPlan ? currentPlan.plan.title : "Reading Plans"}
          </h1>
          <p className="max-w-[700px] text-xs leading-relaxed text-neutral-500 md:text-sm">
            {currentPlan
              ? currentPlan.templateMeta?.summary ?? currentPlan.plan.description
              : "Choose a curated path, read inside this page, and keep your progress, reflections, and current passage together."}
          </p>
        </div>

        {currentPlan?.templateMeta ? (
          <div className="flex items-center gap-6 rounded-2xl border border-[#EDECE4]/60 bg-[#FAF9F5]/50 px-5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)] shrink-0">
            <div className="text-xs">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-neutral-400">
                Category
              </span>
              <span className="mt-0.5 block font-serif font-bold text-neutral-800">
                {currentPlan.templateMeta.category}
              </span>
            </div>
            <div className="h-6 w-px bg-[#EDECE4]" />
            <div className="text-xs">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-neutral-400">
                Pace
              </span>
              <span className="mt-0.5 block font-serif font-bold text-neutral-800">
                {currentPlan.templateMeta.cadenceLabel}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="inline-flex w-fit items-center gap-1 rounded-full border border-[#EDECE4]/60 bg-[#FAF9F5] p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
        {[
          { id: "hub", label: "Reading Hub" },
          { id: "journal", label: "My Journal", count: journalCount },
          { id: "focus", label: "Breath & Focus" },
        ].map((tab) => (
          <button
            className={cn(
              "relative rounded-full px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
              activeTab === tab.id
                ? "bg-[#3a2218] text-[#FDFCF9] shadow-[0_2px_8px_rgba(58,34,24,0.15)]"
                : "text-neutral-500 hover:text-neutral-900",
            )}
            key={tab.id}
            onClick={() => onChangeTab(tab.id as ReadingTab)}
            type="button"
          >
            {tab.label}
            {"count" in tab && typeof tab.count === "number" && tab.count > 0 ? (
              <span className="absolute -right-0.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-white bg-[#EA7C5A] px-1 font-mono text-[8px] font-bold text-white tabular-nums">
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
    <aside className="hidden min-h-0 w-[300px] shrink-0 overflow-y-auto border-r border-[#EDECE4]/80 bg-[#FDFCF9] lg:block">
      <div className="bible-app-scroll h-full flex flex-col justify-between p-6">
        <div className="space-y-8">
          {currentPlan ? (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Active Itinerary
                </span>
                <BookOpen className="h-4 w-4 text-neutral-400" />
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-[#EDECE4] bg-[#FAF9F5] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div>
                  <span className="inline-block rounded-full bg-[#EFECE6] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                    Active Plan
                  </span>
                  <h2 className="mt-3 font-serif text-lg font-bold leading-tight text-neutral-900">
                    {currentPlan.plan.title}
                  </h2>
                  <p className="mt-1 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                    {currentPlan.templateMeta?.category ?? "Plan"}
                  </p>
                  
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Completion</span>
                      <span className="font-semibold text-neutral-800">{currentPlan.progressPercent}%</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-[#EFECE6]">
                      <div
                        className="h-full rounded-full bg-[#EA7C5A] transition-all duration-500"
                        style={{ width: `${currentPlan.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button
                className="mt-3 w-full rounded-xl border border-transparent bg-transparent py-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 transition-colors hover:text-neutral-600"
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
                    className="group w-full rounded-xl border border-transparent bg-[#FAF9F5]/40 p-3.5 text-left transition-all hover:bg-[#FAF9F5] hover:shadow-sm"
                    key={template.id}
                    onClick={() => onStartPlan(template.id, template.title)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="block font-serif text-[13px] font-bold text-neutral-800 group-hover:text-neutral-900 transition-colors">
                        {template.title}
                      </span>
                      <span className="shrink-0 rounded bg-[#EFECE6]/60 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-neutral-500">
                        {formatDuration(template.durationDays)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-400">
                      <span>{template.category}</span>
                      <span>~{template.estimatedMinutes}m daily</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-6">
            <span className="block border-b border-[#EDECE4]/60 pb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Itinerary Options
            </span>
            {groupedTemplates.map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((template) => (
                    <button
                      className={cn(
                        "group w-full rounded-xl border p-3.5 text-left transition-all",
                        selectedTemplateId === template.id
                          ? "border-[#E5D6C9] bg-white shadow-sm text-neutral-900"
                          : "border-transparent bg-[#FAF9F5]/30 text-neutral-600 hover:bg-[#FAF9F5] hover:shadow-sm",
                      )}
                      key={template.id}
                      onClick={() => onStartPlan(template.id, template.title)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          "truncate font-serif text-sm tracking-tight text-neutral-800 group-hover:text-neutral-900 transition-colors",
                          selectedTemplateId === template.id && "font-bold"
                        )}>
                          {template.title}
                        </span>
                        {selectedTemplateId === template.id ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#EA7C5A]" />
                        ) : null}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-400">
                        <span>{template.category}</span>
                        <span className="font-mono text-[9px] uppercase">
                          {formatDuration(template.durationDays)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>

        <div className="mt-8 border-l-2 border-[#E5D6C9] pl-4 py-1 text-neutral-700">
          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">
            Today&apos;s Insight
          </span>
          <p className="mt-1.5 font-serif text-[12px] italic leading-relaxed text-neutral-600">
            "Like cold water to a weary soul is good news from a distant land."
          </p>
          <span className="mt-1.5 block font-mono text-[9px] text-neutral-400">
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
    <div className="space-y-12">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative overflow-hidden rounded-3xl border border-[#EDECE4]/60 bg-gradient-to-br from-[#FDFCF9] via-[#FAF9F5] to-[#F3EFE0]/40 p-8 text-neutral-900 shadow-sm md:p-10">
          <div className="relative z-10 max-w-[700px]">
            <span className="inline-block rounded-full bg-[#EFECE6] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
              Start a Curated Plan
            </span>
            <h2 className="mt-5 font-serif text-3xl font-bold leading-tight text-neutral-900 md:text-4xl lg:text-5xl text-wrap-balance">
              Keep scripture, structure, and reflection in one calm reading flow.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500 md:text-base">
              Pick a plan, read at your own pace inside this workspace, and keep your journal notes and focus tools aligned with the day&apos;s passage.
            </p>
          </div>
          <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-[#EFECE6]/40 blur-3xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {featuredTemplates.slice(0, 2).map((template) => (
            <button
              className="group rounded-2xl border border-[#EDECE4]/50 bg-white p-6 text-left shadow-[0_4px_20px_rgba(0,0,0,0.015)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
              key={template.id}
              onClick={() => onStartPlan(template.id, template.title)}
              type="button"
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#EA7C5A]">
                Featured
              </p>
              <h3 className="mt-3 font-serif text-xl font-bold leading-snug text-neutral-900 group-hover:text-[#EA7C5A] transition-colors">
                {template.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500 line-clamp-2">
                {template.summary}
              </p>
              <p className="mt-4 text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                {formatDuration(template.durationDays)} · {template.cadenceLabel}
              </p>
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-10">
        {groupedTemplates.map(([category, items]) => (
          <section key={category} className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-[#EDECE4]/50 pb-2">
              <h3 className="font-serif text-xl font-bold text-neutral-900">
                {category}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                {items.length} plans
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {items.map((template) => (
                <button
                  className="group flex flex-col justify-between rounded-2xl border border-[#EDECE4]/50 bg-[#FAF9F5]/20 p-5 text-left transition-all duration-300 hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                  key={template.id}
                  onClick={() => onStartPlan(template.id, template.title)}
                  type="button"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-serif text-lg font-bold leading-tight text-neutral-900 group-hover:text-[#EA7C5A] transition-colors">
                        {template.title}
                      </h4>
                      {template.featured && (
                        <span className="shrink-0 rounded-full bg-[#FAF9F5] border border-[#EBE6D7] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#EA7C5A]">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-500 line-clamp-3">
                      {template.summary}
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    <span className="rounded bg-[#EFECE6]/50 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-neutral-600">
                      {formatDuration(template.durationDays)}
                    </span>
                    <span className="rounded bg-[#EFECE6]/50 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-neutral-600">
                      {template.cadenceLabel}
                    </span>
                    <span className="rounded bg-[#EFECE6]/50 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-neutral-600">
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
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2E2822] via-[#1F1A15] to-[#14100C] p-6 text-[#FAF6EE] shadow-lg md:p-8">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex flex-col justify-between">
            <div>
              <span className="inline-block rounded-full bg-[#EA7C5A] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
                Today&apos;s recommended entry
              </span>
              <h2 className="mt-5 font-serif text-3xl font-bold leading-tight text-white md:text-5xl">
                {heroEntry?.passageLabel ?? "Plan Complete"}
              </h2>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-amber-200/80">
                {heroEntry ? chapterRangeLabel(heroEntry) : "You finished every reading"}
              </p>
              <p className="mt-4 max-w-xl text-xs leading-relaxed text-neutral-300">
                {heroEntry
                  ? `Day ${heroEntry.dayNumber} of ${currentPlan.plan.totalEntries} · ${currentPlan.templateMeta?.cadenceLabel ?? "Daily reading"}`
                  : "You have finished every scheduled reading in this plan. Well done!"}
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {heroEntry ? (
                <button
                  className="flex items-center gap-2 rounded-xl bg-[#EA7C5A] px-6 py-3 text-xs font-bold text-white shadow-lg shadow-[#EA7C5A]/10 hover:bg-[#D76949]"
                  onClick={() => onOpenReading(heroEntry)}
                  type="button"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4.5 w-4.5" />
                </button>
              ) : null}
              {currentPlan.currentEntry && currentPlan.hasStartedReading ? (
                <button
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-white hover:bg-white/10"
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
              icon={<CheckCircle2 className="h-4 w-4 text-[#EA7C5A]" />}
              label="Progress"
              value={`${currentPlan.progressPercent}%`}
            />
            <MetricTile
              icon={<Flame className="h-4 w-4 text-amber-400" />}
              label="Streak"
              value={`${currentPlan.streak} day${currentPlan.streak === 1 ? "" : "s"}`}
            />
            <MetricTile
              icon={<Clock3 className="h-4 w-4 text-neutral-300" />}
              label="Pace"
              value={currentPlan.templateMeta ? `~${currentPlan.templateMeta.estimatedMinutes} min` : "Daily"}
            />
          </div>
        </div>
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[#EA7C5A]/5 blur-3xl" />
      </section>

      <section className="rounded-3xl border border-[#EDECE4]/60 bg-[#FAF9F5]/30 p-6">
        <div className="mb-6 flex items-center justify-between border-b border-[#EDECE4]/50 pb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-neutral-900">
              Journey Path
            </h3>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">
              Select a card to read or toggle complete state
            </p>
          </div>
          <span className="rounded-full bg-[#EFECE6] px-3 py-1 font-mono text-[10px] font-bold text-neutral-600">
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
                  "grid gap-4 items-center rounded-2xl p-4 transition-all duration-300 md:grid-cols-[72px_minmax(0,1fr)_auto]",
                  entry.status === "completed"
                    ? "border border-[#EDECE4]/45 bg-white/40 opacity-70 hover:opacity-100 hover:bg-white"
                    : isPrimary
                      ? "scale-[1.01] border-2 border-[#EA7C5A] bg-white shadow-md shadow-[#EA7C5A]/5"
                      : isSelected
                        ? "border border-neutral-300 bg-[#FAF9F5]"
                        : "border border-[#EDECE4]/60 bg-white hover:border-neutral-300",
                )}
                key={entry._id}
              >
                <button
                  className={cn(
                    "flex h-[56px] w-[56px] flex-col items-center justify-center rounded-xl border text-center transition-colors",
                    entry.status === "completed"
                      ? "border-transparent bg-[#EFECE6] text-neutral-500"
                      : isPrimary
                        ? "border-transparent bg-[#EA7C5A] text-white shadow-sm"
                        : "border-transparent bg-[#FAF9F5] text-neutral-800",
                  )}
                  onClick={() => onOpenReading(entry)}
                  type="button"
                >
                  <span className="text-[8px] font-bold uppercase tracking-wider opacity-70">
                    Day
                  </span>
                  <span className="font-serif text-lg font-bold leading-none">
                    {entry.dayNumber}
                  </span>
                </button>

                <button
                  className="min-w-0 text-left"
                  onClick={() => onOpenReading(entry)}
                  type="button"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("font-serif text-base font-bold tracking-tight text-neutral-900", entry.status === "completed" && "text-neutral-400 line-through decoration-neutral-300")}>
                      {entry.passageLabel}
                    </p>
                    {isPrimary ? (
                      <span className="rounded-full bg-[#FAF9F5] border border-[#EBE6D7] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#EA7C5A]">
                        Up Next
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[10px] text-neutral-400 font-medium uppercase tracking-wider">
                    {chapterRangeLabel(entry)} · {formatLongDate(entry.dueDate)}
                  </p>
                  {entry.reflection?.trim() ? (
                    <div className="mt-2 border-l border-[#E5D6C9] pl-3">
                      <p className="line-clamp-2 text-xs italic leading-relaxed text-neutral-500">
                        &quot;{entry.reflection}&quot;
                      </p>
                    </div>
                  ) : null}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 hover:bg-[#FAF9F5]"
                    onClick={() => onOpenReading(entry)}
                    type="button"
                  >
                    {entry.startedAt ? "Resume" : "Read"}
                  </button>
                  <button
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border transition-all",
                      entry.status === "completed"
                        ? "border-[#EA7C5A] bg-[#EA7C5A] text-white"
                        : "border-neutral-200 bg-transparent text-neutral-300 hover:border-[#EA7C5A] hover:text-[#EA7C5A]",
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
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-neutral-900">
          Reflections Library
        </h2>
        <p className="text-xs text-neutral-500">
          Your recorded memories, prayers, and lessons saved during each reading day.
        </p>
      </div>

      {currentPlan.journalEntries.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-3xl border border-[#EDECE4]/60 bg-[#FAF9F5]/30 py-16 px-6 text-center">
          <FileText className="mx-auto mb-4 h-10 w-10 text-neutral-300" />
          <h3 className="font-serif text-lg font-bold text-neutral-800">
            Your journal is waiting
          </h3>
          <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-neutral-500">
            Write down contemplative reflections inside reading mode or complete specific daily readings to catalog your journey.
          </p>
          {currentPlan.primaryEntry ? (
            <button
              className="mt-6 rounded-xl bg-[#3a2218] px-5 py-3 text-xs font-bold text-[#FDFCF9] shadow-sm hover:bg-[#2A1810]"
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
              className="group relative flex flex-col justify-between rounded-2xl border border-[#EDECE4]/50 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.015)] transition-all duration-300 hover:scale-[1.005] hover:shadow-[0_8px_30px_rgba(0,0,0,0.035)]"
              key={entry._id}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  <span>{entry.completedAt ? new Date(entry.completedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : formatDateLabel(entry.dueDate)}</span>
                  <span className="rounded-full bg-[#FAF9F5] border border-[#EBE6D7] px-2.5 py-0.5 text-neutral-500">
                    Day {entry.dayNumber}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-neutral-900 group-hover:text-[#EA7C5A] transition-colors">
                    {entry.passageLabel}
                  </h3>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#EA7C5A]">
                    Saved note
                  </p>
                </div>

                <p className="line-clamp-5 select-text text-sm italic leading-relaxed text-neutral-600">
                  &quot;{entry.reflection}&quot;
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4">
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                  Reading Plan Devotion
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
  const [breathPhase, setBreathPhase] = useState<"Inhale" | "Hold" | "Exhale">("Inhale");
  const [cycleCount, setCycleCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBreathPhase((prev) => {
        if (prev === "Inhale") return "Hold";
        if (prev === "Hold") return "Exhale";
        setCycleCount((c) => c + 1);
        return "Inhale";
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-10 text-center">
      <div className="space-y-2 max-w-md mx-auto">
        <h2 className="font-serif text-3xl font-bold tracking-tight text-neutral-900">
          Pause & Anchor
        </h2>
        <p className="text-xs leading-relaxed text-neutral-500">
          Clear away digital noise and quiet your thoughts for a moment before looking upon the sacred scripture. Quiet the outer self.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#2E2822] via-[#1F1A15] to-[#14100C] p-8 text-center shadow-lg md:p-12 border border-white/5">
        <div className="relative z-10 space-y-10 py-4">
          <div className="relative flex h-64 w-64 items-center justify-center mx-auto">
            <motion.div
              animate={{
                scale: breathPhase === "Inhale" ? 1.35 : breathPhase === "Hold" ? 1.35 : 0.95,
                opacity: breathPhase === "Inhale" ? 0.9 : breathPhase === "Hold" ? 0.9 : 0.5,
              }}
              className="absolute inset-0 rounded-full border border-[#EA7C5A]/20 bg-[#EA7C5A]/5 shadow-[0_0_50px_rgba(234,124,90,0.08)]"
              transition={{ duration: 3.8, ease: "easeInOut" }}
            />
            <motion.div
              animate={{
                scale: breathPhase === "Inhale" ? 1.15 : breathPhase === "Hold" ? 1.15 : 0.85,
              }}
              className="relative z-20 flex h-36 w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#EA7C5A] to-[#B05338] text-white shadow-xl shadow-[#EA7C5A]/15"
              transition={{ duration: 3.8, ease: "easeInOut" }}
            >
              <span className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-amber-200/90">
                {breathPhase === "Inhale" ? "breathe in" : breathPhase === "Hold" ? "hold" : "breathe out"}
              </span>
              <span className="text-2xl font-serif font-bold tracking-tight">
                {breathPhase}
              </span>
            </motion.div>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-serif text-base font-bold text-white">
              Fill your lungs with gratitude.
            </h3>
            <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
              Completed cycles: <span className="text-[#EA7C5A] font-bold font-sans text-xs">{cycleCount}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-white/10 transition-colors"
              onClick={() => {
                setCycleCount(0);
                setBreathPhase("Inhale");
              }}
              type="button"
            >
              Reset
            </button>
            {entry ? (
              <button
                className="rounded-xl bg-[#EA7C5A] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#D76949] transition-all"
                onClick={() => onOpenReading(entry)}
                type="button"
              >
                {entry.startedAt ? "Resume Reading" : "Proceed to Reading"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto inline-flex items-center gap-2.5 rounded-2xl border border-[#EDECE4]/60 bg-[#FAF9F5] p-4 text-xs text-neutral-600 shadow-sm">
        <Sparkles className="h-4 w-4 text-[#EA7C5A]" />
        <span className="font-serif italic">"Be still, and know that I am God." — Psalm 46:10</span>
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
        <div className="flex flex-1 items-center justify-center p-8 text-center bg-[#FDFCF9]">
          <div className="space-y-3 max-w-sm">
            <BookOpen className="mx-auto h-8 w-8 text-neutral-300" />
            <h3 className="font-serif text-2xl font-bold text-neutral-800">
              Open a reading day
            </h3>
            <p className="text-xs leading-relaxed text-neutral-500">
              Select a chapter from your path. The text will open inside this calm, dedicated environment to protect your focus.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#FDFCF9] p-6 text-neutral-800 transition-colors duration-500 md:p-10">
            <div className="mb-8 flex items-center justify-between border-b border-neutral-100 pb-5">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-full p-1.5 hover:bg-neutral-100 text-neutral-500 transition-colors"
                  onClick={onClose}
                  type="button"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <span className="block text-[8px] font-bold uppercase tracking-widest text-neutral-400">
                    {currentPlan?.plan.title ?? "Reading Plan"}
                  </span>
                  <span className="mt-0.5 block font-serif text-sm font-bold text-neutral-800">
                    {selectedEntry.passageLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-[#FAF9F5]/80 p-1">
                <select
                  className="h-7 rounded-lg bg-transparent px-2 text-xs font-bold text-neutral-600 outline-none"
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

            <div className="mb-8 flex items-center justify-between gap-5 rounded-2xl border border-[#EDECE4] bg-[#FAF9F5] p-4">
              <div className="flex items-center gap-3">
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3a2218] text-white transition-all hover:bg-[#2A1810]"
                  type="button"
                >
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                </button>
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#EA7C5A]">
                    Audio Companion
                  </span>
                  <h4 className="font-serif text-[11px] font-bold text-neutral-800">
                    {selectedEntry.passageLabel} ambient guide
                  </h4>
                </div>
              </div>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full w-1/3 bg-[#EA7C5A]" />
              </div>
            </div>

            <div className="mx-auto max-w-xl flex-1 space-y-10 selection:bg-amber-100">
              <div className="border-b border-neutral-100 pb-5 text-center">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                  Today&apos;s Scripture
                </span>
                <h2 className="font-serif text-3xl font-bold tracking-tight text-neutral-900">
                  {selectedEntry.passageLabel}
                </h2>
                <p className="mt-1 text-xs italic text-neutral-500">
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
                <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 text-xs leading-relaxed text-red-600">
                  Scripture text could not be loaded for this reading.
                </div>
              ) : (
                <div className="space-y-8">
                  {chapterData.map((chapter) => (
                    <article key={`${chapter.book}-${chapter.chapter}`} className="space-y-4">
                      <div className="mb-4 border-b border-neutral-100 pb-2">
                        <p className="font-serif text-xl font-bold text-neutral-800">
                          {chapter.book} {chapter.chapter}
                        </p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                          {versionLabel}
                        </p>
                      </div>
                      <div className="space-y-3">
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

          <div className="flex h-full w-full flex-col justify-between border-l border-[#EDECE4]/80 bg-[#FAF9F5] p-6 md:w-[360px] md:p-8">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-1.5 text-[#EA7C5A]">
                  <Edit3 className="h-4 w-4" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">
                    Personal Journal
                  </span>
                </div>
                <h3 className="mt-1.5 font-serif text-lg font-bold text-neutral-900">
                  Devotional Reflection
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                  Record what you hear in the quiet, and keep it in your reflection library.
                </p>
              </div>

              <div className="rounded-xl border border-[#EDECE4]/60 bg-white p-4 text-xs shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                <span className="mb-1 block font-bold text-[#EA7C5A] uppercase tracking-wider text-[9px]">
                  Reflection Prompt
                </span>
                <p className="italic leading-relaxed text-neutral-500">
                  &quot;How did today&apos;s reading comfort or convict you?&quot;
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-neutral-400">
                  <span>Write Note</span>
                  <span className="font-mono tabular-nums">{reflectionDraft.length} chars</span>
                </div>

                <textarea
                  className="h-56 w-full resize-none rounded-2xl border border-neutral-200 bg-white p-4 text-xs leading-relaxed text-neutral-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] outline-none focus:border-[#EA7C5A] focus:ring-1 focus:ring-[#EA7C5A] transition-all"
                  onChange={(event) => setReflectionDraft(event.target.value)}
                  placeholder="Type your notes, prayers, or lessons from this reading..."
                  value={reflectionDraft}
                />
              </div>
            </div>

            <div className="mt-6 space-y-2 border-t border-neutral-200/80 pt-6">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#EA7C5A] py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#D76949] transition-all"
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
                className="w-full rounded-xl border border-transparent bg-transparent py-2.5 text-xs font-semibold text-neutral-400 hover:text-neutral-600 transition-colors"
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
        "grid grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-xl px-3 py-2.5 transition-all duration-300",
        highlighted ? "bg-[#EA7C5A]/5 border-l-2 border-[#EA7C5A]" : "border-l-2 border-transparent",
      )}
    >
      <span className="pt-0.5 text-[10px] font-bold text-neutral-400 font-mono">
        {chapter}:{verse.number}
      </span>
      <p className="font-serif text-base md:text-[17px] leading-relaxed text-neutral-800">
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
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[1px] p-4">
      <div className="flex items-center gap-2 text-neutral-300">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">
          {label}
        </span>
      </div>
      <p className="mt-2 font-serif text-2xl font-bold text-white tabular-nums">
        {value}
      </p>
    </div>
  );
}
