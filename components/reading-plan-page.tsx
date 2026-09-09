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
  ChevronDown,
  Download,
  Edit3,
  FileText,
  Pause,
  Play,
  Plus,
  Share2,
  Sparkles,
  Trophy,
  Volume2,
  Wind,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ProductShell } from "@/components/product-shell";
import {
  WorkspaceCanvas,
  WorkspaceIconButton,
  WorkspaceMenu,
  WorkspaceMenuItem,
  WorkspacePill,
  WorkspaceRow,
  WorkspaceSection,
  WorkspaceSurface,
} from "@/components/workspace";
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

type ReadingTab = "home" | "journal" | "completed";
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

type CompletedPlanSummary = {
  _id: Id<"userPlans">;
  completedAt: number;
  completedEntries: number;
  description: string;
  durationDays: number;
  title: string;
  totalEntries: number;
};

type CompletionCelebration = Pick<
  CompletedPlanSummary,
  "completedAt" | "completedEntries" | "durationDays" | "title" | "totalEntries"
>;

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
  if (currentPlan.plan.completedEntries === 0) return "Start reading";
  if (currentPlan.primaryEntry) return "Continue reading";
  return "Plan complete";
}

function dueLabel(date: string) {
  const today = todayString();
  if (date === today) return "Today";
  const diff = Math.round(
    (new Date(`${date}T00:00:00`).getTime() -
      new Date(`${today}T00:00:00`).getTime()) /
      86400000,
  );
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDateLabel(date);
}

function openedMeta(entry: ReadingPlanEntry) {
  if (!entry.lastOpenedAt) {
    return entry.status === "completed"
      ? `Completed · ${dueLabel(entry.dueDate)}`
      : `Day ${entry.dayNumber} · ${dueLabel(entry.dueDate)}`;
  }
  const days = Math.max(
    0,
    Math.floor((Date.now() - entry.lastOpenedAt) / 86400000),
  );
  if (days === 0) return "Pick up where you left off · Today";
  if (days === 1) return "Pick up where you left off · 1d ago";
  return `Pick up where you left off · ${days}d ago`;
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
  const [activeTab, setActiveTab] = useState<ReadingTab>("home");
  const [plansMenuOpen, setPlansMenuOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [pathExpanded, setPathExpanded] = useState(false);
  const [selectedEntryId, setSelectedEntryId] =
    useState<Id<"userPlanEntries"> | null>(null);
  const [readerOpenMobile, setReaderOpenMobile] = useState(false);
  const [plansSheetOpen, setPlansSheetOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveScope, setArchiveScope] = useState<ArchiveScope>("selected");
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [readerVersionId, setReaderVersionId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<Id<"userPlans"> | null>(
    null,
  );
  const [completionCelebration, setCompletionCelebration] =
    useState<CompletionCelebration | null>(null);

  const templates = useQuery(api.readingPlans.templates) ?? [];
  const activePlans = useQuery(api.readingPlans.active, {
    ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
  }) as ActivePlanSummary[] | undefined;
  const completedPlans = (useQuery(api.readingPlans.completed, {
    ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
  }) ?? []) as CompletedPlanSummary[];
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
    const visiblePlans = [...activePlans, ...completedPlans];
    if (visiblePlans.some((plan) => plan._id === selectedPlanId)) return;
    setSelectedPlanId(activePlans[0]?._id ?? completedPlans[0]?._id ?? null);
  }, [activePlans, completedPlans, selectedPlanId]);

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
      setActiveTab("home");
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
      setActiveTab("home");
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
      const result = await toggleEntry({
        entryId,
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
      });
      if (result.completedNow && currentPlan) {
        setCompletionCelebration({
          completedAt: result.completedAt ?? Date.now(),
          completedEntries: currentPlan.plan.totalEntries,
          durationDays:
            currentPlan.templateMeta?.durationDays ??
            currentPlan.plan.totalEntries,
          title: currentPlan.plan.title,
          totalEntries: currentPlan.plan.totalEntries,
        });
      }
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

  const handleShareCompletion = async () => {
    if (!completionCelebration) return;
    const shareText = `I completed the ${completionCelebration.title} reading plan on Bible Study.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Reading plan complete",
          text: shareText,
        });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      toast.success("Achievement copied to your clipboard.");
    } catch (error) {
      console.error("Failed to share reading plan completion:", error);
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success("Achievement copied to your clipboard.");
      } catch (clipboardError) {
        console.error(
          "Failed to copy reading plan completion:",
          clipboardError,
        );
        toast.error("Could not share your achievement.");
      }
    }
  };

  const handleSaveCompletionPng = async () => {
    if (!completionCelebration) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1000;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not supported");

      const gradient = context.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      gradient.addColorStop(0, "#fff8ed");
      gradient.addColorStop(0.55, "#fbe6c8");
      gradient.addColorStop(1, "#f6b96c");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#f6823c";
      context.beginPath();
      context.arc(1330, 170, 250, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#3a2218";
      context.font = "600 38px Georgia";
      context.fillText("BIBLE STUDY", 120, 140);
      context.font = "600 84px Georgia";
      context.fillText("Plan complete.", 120, 330);
      context.font = "500 54px Georgia";
      const title = completionCelebration.title.slice(0, 42);
      context.fillText(title, 120, 420);
      context.font = "500 34px Arial";
      context.fillStyle = "#7a6758";
      context.fillText(
        `${completionCelebration.completedEntries} readings · ${formatDuration(completionCelebration.durationDays)}`,
        120,
        510,
      );
      context.font = "italic 38px Georgia";
      context.fillStyle = "#3a2218";
      context.fillText("One faithful step at a time.", 120, 780);
      context.font = "500 28px Arial";
      context.fillStyle = "#7a6758";
      context.fillText(
        `Completed ${new Date(completionCelebration.completedAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}`,
        120,
        850,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((png) => {
          if (png) resolve(png);
          else reject(new Error("Could not create achievement image"));
        }, "image/png");
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${completionCelebration.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-complete.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Achievement saved as a PNG.");
    } catch (error) {
      console.error("Failed to save reading plan completion PNG:", error);
      toast.error("Could not save your achievement image.");
    }
  };

  if (!storeReady) {
    return (
      <ProductShell>
        <WorkspaceSurface className="reading-plan-page">
          <WorkspaceCanvas>
            <div className="flex flex-1 items-center justify-center py-24 text-[13px] text-[#8a8178]">
              Loading plans...
            </div>
          </WorkspaceCanvas>
        </WorkspaceSurface>
      </ProductShell>
    );
  }

  const featuredTemplates = (templates as TemplateCard[])
    .filter((template) => template.featured)
    .slice(0, 4);
  const suggestedTemplates =
    featuredTemplates.length > 0
      ? featuredTemplates
      : (templates as TemplateCard[]).slice(0, 4);

  return (
    <ProductShell>
      <WorkspaceSurface className="reading-plan-page">
        <WorkspaceCanvas stacked={activeTab === "home"}>
          {activeTab === "completed" ? (
            <CompletedPlansTab
              completedPlans={completedPlans}
              onBack={() => setActiveTab("home")}
              onReviewPlan={(planId) => {
                setSelectedPlanId(planId);
                setSelectedEntryId(null);
                setActiveTab("home");
              }}
              onSharePlan={(plan) =>
                setCompletionCelebration({
                  completedAt: plan.completedAt,
                  completedEntries: plan.completedEntries,
                  durationDays: plan.durationDays,
                  title: plan.title,
                  totalEntries: plan.totalEntries,
                })
              }
            />
          ) : activeTab === "journal" && currentPlan ? (
            <JournalTab
              currentPlan={currentPlan}
              onBack={() => setActiveTab("home")}
              onOpenReading={openReading}
            />
          ) : !currentPlan ? (
            <BrowseState
              onOpenPlans={() => setPlansSheetOpen(true)}
              onStartPlan={startPlan}
              suggestedTemplates={suggestedTemplates}
            />
          ) : (
            <PlanHome
              activePlans={activePlans ?? []}
              completedCount={completedPlans.length}
              currentPlan={currentPlan}
              onArchiveAll={() => {
                setArchiveScope("all");
                setArchiveConfirmOpen(true);
                setPlansMenuOpen(false);
              }}
              onArchiveCurrent={() => {
                setArchiveScope("selected");
                setArchiveConfirmOpen(true);
                setPlansMenuOpen(false);
              }}
              onOpenFocus={() => setFocusOpen(true)}
              onOpenJournal={() => setActiveTab("journal")}
              onOpenPlans={() => {
                setPlansMenuOpen(false);
                setPlansSheetOpen(true);
              }}
              onOpenReading={openReading}
              onSelectPlan={(planId) => {
                setSelectedPlanId(planId);
                setSelectedEntryId(null);
                setPlansMenuOpen(false);
                setActiveTab("home");
              }}
              onToggleEntry={handleToggleEntry}
              onViewCompleted={() => {
                setPlansMenuOpen(false);
                setActiveTab("completed");
              }}
              pathExpanded={pathExpanded}
              plansMenuOpen={plansMenuOpen}
              selectedEntryId={selectedEntry?._id ?? null}
              selectedPlanId={selectedPlanId}
              setPathExpanded={setPathExpanded}
              setPlansMenuOpen={setPlansMenuOpen}
            />
          )}
        </WorkspaceCanvas>
      </WorkspaceSurface>

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
        {completionCelebration ? (
          <CompletionCelebrationDialog
            completion={completionCelebration}
            onClose={() => setCompletionCelebration(null)}
            onSavePng={handleSaveCompletionPng}
            onShare={handleShareCompletion}
            onViewCompleted={() => {
              setCompletionCelebration(null);
              setActiveTab("completed");
            }}
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
              className="reading-plan-page relative z-20 flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:flex-row md:rounded-[28px] md:my-4 md:mr-4"
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

      <AnimatePresence>
        {focusOpen && currentPlan ? (
          <FocusSheet
            currentPlan={currentPlan}
            onClose={() => setFocusOpen(false)}
            onOpenReading={async (entry) => {
              setFocusOpen(false);
              await openReading(entry);
            }}
          />
        ) : null}
      </AnimatePresence>
    </ProductShell>
  );
}

function PlanHome({
  activePlans,
  completedCount,
  currentPlan,
  onArchiveAll,
  onArchiveCurrent,
  onOpenFocus,
  onOpenJournal,
  onOpenPlans,
  onOpenReading,
  onSelectPlan,
  onToggleEntry,
  onViewCompleted,
  pathExpanded,
  plansMenuOpen,
  selectedEntryId,
  selectedPlanId,
  setPathExpanded,
  setPlansMenuOpen,
}: {
  activePlans: ActivePlanSummary[];
  completedCount: number;
  currentPlan: ReadingPlanCurrent;
  onArchiveAll: () => void;
  onArchiveCurrent: () => void;
  onOpenFocus: () => void;
  onOpenJournal: () => void;
  onOpenPlans: () => void;
  onOpenReading: (entry: ReadingPlanEntry) => Promise<void>;
  onSelectPlan: (planId: Id<"userPlans">) => void;
  onToggleEntry: (entryId: Id<"userPlanEntries">) => Promise<void>;
  onViewCompleted: () => void;
  pathExpanded: boolean;
  plansMenuOpen: boolean;
  selectedEntryId: Id<"userPlanEntries"> | null;
  selectedPlanId: Id<"userPlans"> | null;
  setPathExpanded: (value: boolean) => void;
  setPlansMenuOpen: (value: boolean) => void;
}) {
  const insight = dailyInsight();
  const heroEntry = currentPlan.primaryEntry ?? currentPlan.currentEntry;
  const ctaLabel = relativeStartLabel(currentPlan);
  const upcoming = currentPlan.upcomingEntries.filter(
    (entry) => entry._id !== heroEntry?._id,
  );
  const recentJournal = currentPlan.journalEntries.slice(-2).reverse();
  const recentCompleted = currentPlan.allEntries
    .filter((entry) => entry.status === "completed")
    .slice(-3)
    .reverse();
  const remainingPath = (
    pathExpanded
      ? currentPlan.allEntries.filter((entry) => entry._id !== heroEntry?._id)
      : upcoming
  ).slice(0, pathExpanded ? 40 : undefined);
  const todayDate = new Date().toLocaleDateString([], {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efe8dc] text-[#3a322c]">
            <BookOpen className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.035em] text-[#171412]">
            {currentPlan.plan.title}
          </h1>
          <p className="mt-1 text-[14px] text-[#8a8178]">
            {currentPlan.plan.status === "completed"
              ? "Finished"
              : `Going through this path · Day ${currentPlan.plan.currentDayNumber} of ${currentPlan.plan.totalEntries}`}
            {currentPlan.templateMeta
              ? ` · ${currentPlan.templateMeta.cadenceLabel}`
              : ""}
          </p>
          <div className="mt-4 h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-[#efece7]">
            <div
              className="h-full rounded-full bg-[#171412] transition-[width] duration-500"
              style={{ width: `${currentPlan.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="relative shrink-0" data-workspace-menu-root>
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f1ec] px-3 py-1.5 text-[13px] font-medium text-[#3a322c] transition-colors hover:bg-[#ece7df]"
            onClick={() => setPlansMenuOpen(!plansMenuOpen)}
            type="button"
          >
            Plans
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <WorkspaceMenu
            onClose={() => setPlansMenuOpen(false)}
            open={plansMenuOpen}
          >
            <p className="px-3 pb-1 pt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a8178]">
              Your paths
            </p>
            {activePlans.length ? (
              activePlans.map((plan) => (
                <WorkspaceMenuItem
                  active={plan._id === selectedPlanId}
                  description={`Day ${plan.currentDayNumber} of ${plan.totalEntries} · ${plan.progressPercent}%`}
                  icon={<BookOpen className="h-4 w-4" />}
                  key={plan._id}
                  onClick={() => onSelectPlan(plan._id)}
                  title={plan.title}
                />
              ))
            ) : (
              <p className="px-3 py-2 text-[13px] text-[#8a8178]">
                No active paths yet.
              </p>
            )}
            <WorkspaceMenuItem
              description="Choose a curated or custom path"
              icon={<Plus className="h-4 w-4" />}
              onClick={onOpenPlans}
              title="Browse library"
            />
            <WorkspaceMenuItem
              description={
                completedCount
                  ? `${completedCount} finished`
                  : "Nothing finished yet"
              }
              icon={<Trophy className="h-4 w-4" />}
              onClick={onViewCompleted}
              title="Completed"
            />
            {currentPlan.plan.status === "active" ? (
              <div className="mt-1 border-t border-black/[0.05] pt-1">
                <button
                  className="w-full px-3 py-2 text-left text-[13px] text-[#8a8178] hover:bg-[#f7f5f2] hover:text-[#171412]"
                  onClick={onArchiveCurrent}
                  type="button"
                >
                  Archive this plan
                </button>
                {activePlans.length > 1 ? (
                  <button
                    className="w-full px-3 py-2 text-left text-[13px] text-[#a24723] hover:bg-[#f7f5f2]"
                    onClick={onArchiveAll}
                    type="button"
                  >
                    Archive all active plans
                  </button>
                ) : null}
              </div>
            ) : null}
          </WorkspaceMenu>
        </div>
      </header>

      <WorkspaceSection
        action={
          <span className="text-[13px] text-[#8a8178]">{todayDate}</span>
        }
        label="Today"
      >
        {heroEntry ? (
          <WorkspaceRow
            active={selectedEntryId === heroEntry._id}
            icon={<BookOpen className="h-4 w-4" />}
            meta={openedMeta(heroEntry)}
            onClick={() => {
              void onOpenReading(heroEntry);
            }}
            title={heroEntry.passageLabel}
            trailing={
              <span className="text-[12px] font-medium text-[#171412]">
                {ctaLabel}
              </span>
            }
          />
        ) : (
          <WorkspaceRow
            icon={<Check className="h-4 w-4" />}
            meta="Every scheduled reading is complete"
            title="Plan complete"
          />
        )}
      </WorkspaceSection>

      {currentPlan.allEntries.length > 1 ? (
        <WorkspaceSection
          action={
            currentPlan.allEntries.length > upcoming.length + 1 ? (
              <button
                className="text-[13px] font-medium text-[#8a8178] hover:text-[#171412]"
                onClick={() => setPathExpanded(!pathExpanded)}
                type="button"
              >
                {pathExpanded ? "Show less" : "All"}
              </button>
            ) : null
          }
          label={pathExpanded ? "Full path" : upcoming.length ? "Up next" : "Path"}
        >
          {remainingPath.length ? (
            remainingPath.map((entry) => {
            const isDone = entry.status === "completed";
            return (
              <WorkspaceRow
                active={selectedEntryId === entry._id}
                icon={
                  isDone ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-[11px] font-semibold tabular-nums">
                      {entry.dayNumber}
                    </span>
                  )
                }
                key={entry._id}
                meta={`${chapterRangeLabel(entry)} · ${dueLabel(entry.dueDate)}`}
                onClick={() => {
                  void onOpenReading(entry);
                }}
                title={entry.passageLabel}
                trailing={
                  <button
                    aria-label={
                      isDone ? "Mark as unread" : "Mark as complete"
                    }
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
                      isDone
                        ? "border-[#171412] bg-[#171412] text-white"
                        : "border-[#e6e1da] text-[#c5bfb8] hover:border-[#171412] hover:text-[#171412]",
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onToggleEntry(entry._id);
                    }}
                    type="button"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                }
              />
            );
          })
          ) : (
            <WorkspaceRow
              icon={<BookOpen className="h-4 w-4" />}
              meta={`${currentPlan.plan.totalEntries} days in this path`}
              onClick={() => setPathExpanded(true)}
              title="View the full path"
            />
          )}
        </WorkspaceSection>
      ) : null}

      {recentJournal.length > 0 ? (
        <WorkspaceSection
          action={
            currentPlan.journalEntries.length > 2 ? (
              <button
                className="text-[13px] font-medium text-[#8a8178] hover:text-[#171412]"
                onClick={onOpenJournal}
                type="button"
              >
                All
              </button>
            ) : null
          }
          label="Showing up in your notes"
        >
          {recentJournal.map((entry) => (
            <WorkspaceRow
              icon={<FileText className="h-4 w-4" />}
              key={entry._id}
              meta={entry.reflection}
              onClick={() => {
                void onOpenReading(entry);
              }}
              title={entry.passageLabel}
            />
          ))}
        </WorkspaceSection>
      ) : (
        <WorkspaceSection label="Journal">
          <WorkspaceRow
            icon={<FileText className="h-4 w-4" />}
            meta="Write from inside today’s reading"
            onClick={
              heroEntry
                ? () => {
                    void onOpenReading(heroEntry);
                  }
                : undefined
            }
            title="Nothing saved yet"
          />
        </WorkspaceSection>
      )}

      {recentCompleted.length > 0 ? (
        <WorkspaceSection label="Recently finished">
          {recentCompleted.map((entry) => (
            <WorkspaceRow
              icon={<Check className="h-4 w-4" />}
              key={entry._id}
              meta={
                entry.completedAt
                  ? new Date(entry.completedAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : dueLabel(entry.dueDate)
              }
              onClick={() => {
                void onOpenReading(entry);
              }}
              title={entry.passageLabel}
            />
          ))}
        </WorkspaceSection>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          className="inline-flex items-center gap-2 rounded-full bg-[#f4f1ec] px-3.5 py-2 text-[13px] font-medium text-[#3a322c] hover:bg-[#ece7df]"
          onClick={onOpenFocus}
          type="button"
        >
          <Wind className="h-3.5 w-3.5" />
          Pause first
        </button>
        {currentPlan.journalEntries.length > 0 ? (
          <button
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium text-[#8a8178] hover:bg-[#f7f5f2] hover:text-[#171412]"
            onClick={onOpenJournal}
            type="button"
          >
            Open journal
          </button>
        ) : null}
      </div>

      <blockquote className="border-t border-black/[0.05] pt-6">
        <p className="text-[14px] leading-relaxed text-[#5c564f]">
          “{insight.text}”
        </p>
        <WorkspacePill className="mt-3">{insight.reference}</WorkspacePill>
      </blockquote>
    </div>
  );
}

function BrowseState({
  onOpenPlans,
  onStartPlan,
  suggestedTemplates,
}: {
  onOpenPlans: () => void;
  onStartPlan: (templateId: string, title: string) => Promise<void>;
  suggestedTemplates: TemplateCard[];
}) {
  return (
    <div className="space-y-8">
      <header>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efe8dc] text-[#3a322c]">
          <BookOpen className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.035em] text-[#171412]">
          Reading plans
        </h1>
        <p className="mt-1 max-w-md text-[14px] leading-relaxed text-[#8a8178]">
          Start one quiet path. Progress, reflections, and today’s passage stay
          together here.
        </p>
      </header>

      <WorkspaceSection
        action={
          <button
            className="text-[13px] font-medium text-[#8a8178] hover:text-[#171412]"
            onClick={onOpenPlans}
            type="button"
          >
            All
          </button>
        }
        label="Suggested"
      >
        {suggestedTemplates.map((template) => (
          <WorkspaceRow
            icon={<BookOpen className="h-4 w-4" />}
            key={template.id}
            meta={`${formatDuration(template.durationDays)} · ${template.cadenceLabel}`}
            onClick={() => {
              void onStartPlan(template.id, template.title);
            }}
            title={template.title}
            trailing={
              <span className="text-[12px] font-medium text-[#171412]">Start</span>
            }
          />
        ))}
      </WorkspaceSection>

      <button
        className="inline-flex items-center gap-2 rounded-full bg-[#171412] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2a221c]"
        onClick={onOpenPlans}
        type="button"
      >
        Browse the library
        <ArrowRight className="h-4 w-4" />
      </button>
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
        <div className="px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#171412]">
                Library
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#8a8178]">
                Pick a guided path, or build a quiet one of your own.
              </p>
            </div>
            <WorkspaceIconButton aria-label="Close library" onClick={onClose}>
              <X className="h-4 w-4" />
            </WorkspaceIconButton>
          </div>
          <button
            className="mt-5 flex w-full items-center justify-between rounded-2xl bg-[#f4f1ec] px-4 py-3 text-left text-[14px] font-semibold text-[#171412] transition-colors hover:bg-[#ece7df]"
            onClick={() => setCuratorOpen((open) => !open)}
            type="button"
          >
            <span>Curate your own plan</span>
            <Plus className="h-4 w-4 text-[#8a8178]" />
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
              <section className="space-y-1" key={category}>
                <div className="flex items-center justify-between px-1 pb-2">
                  <h3 className="text-[13px] font-medium text-[#8a8178]">
                    {category}
                  </h3>
                  <span className="text-[12px] text-[#b4ada6]">
                    {items.length}
                  </span>
                </div>
                {items.map((template) => (
                  <WorkspaceRow
                    active={selectedTemplateId === template.id}
                    icon={<BookOpen className="h-4 w-4" />}
                    key={template.id}
                    meta={`${formatDuration(template.durationDays)} · ${template.cadenceLabel} · ~${template.estimatedMinutes} min`}
                    onClick={() => {
                      void onStartPlan(template.id, template.title);
                    }}
                    title={template.title}
                    trailing={
                      <span className="text-[12px] font-medium text-[#171412]">
                        {selectedTemplateId === template.id ? "Current" : "Start"}
                      </span>
                    }
                  />
                ))}
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

function CompletedPlansTab({
  completedPlans,
  onBack,
  onReviewPlan,
  onSharePlan,
}: {
  completedPlans: CompletedPlanSummary[];
  onBack: () => void;
  onReviewPlan: (planId: Id<"userPlans">) => void;
  onSharePlan: (plan: CompletedPlanSummary) => void;
}) {
  return (
    <div className="space-y-8">
      <header>
        <button
          className="text-[13px] font-medium text-[#8a8178] hover:text-[#171412]"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
        <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.035em] text-[#171412]">
          Completed
        </h1>
        <p className="mt-1 text-[14px] text-[#8a8178]">
          {completedPlans.length
            ? `${completedPlans.length} finished path${completedPlans.length === 1 ? "" : "s"}`
            : "Finished paths will live here."}
        </p>
      </header>

      {completedPlans.length === 0 ? (
        <WorkspaceRow
          icon={<Trophy className="h-4 w-4" />}
          meta="Complete a plan to keep its passages and notes"
          title="Nothing here yet"
        />
      ) : (
        <div>
          {completedPlans.map((plan) => (
            <WorkspaceRow
              icon={<Trophy className="h-4 w-4" />}
              key={plan._id}
              meta={`${plan.completedEntries}/${plan.totalEntries} readings · ${formatDuration(plan.durationDays)} · ${new Date(plan.completedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`}
              onClick={() => onReviewPlan(plan._id)}
              title={plan.title}
              trailing={
                <button
                  className="text-[12px] font-medium text-[#8a8178] hover:text-[#171412]"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSharePlan(plan);
                  }}
                  type="button"
                >
                  Share
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JournalTab({
  currentPlan,
  onBack,
  onOpenReading,
}: {
  currentPlan: ReadingPlanCurrent;
  onBack: () => void;
  onOpenReading: (entry: ReadingPlanEntry) => Promise<void>;
}) {
  return (
    <div className="space-y-8">
      <header>
        <button
          className="text-[13px] font-medium text-[#8a8178] hover:text-[#171412]"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
        <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.035em] text-[#171412]">
          Journal
        </h1>
        <p className="mt-1 text-[14px] text-[#8a8178]">
          Notes saved with each reading day.
        </p>
      </header>

      {currentPlan.journalEntries.length === 0 ? (
        <div>
          <WorkspaceRow
            icon={<FileText className="h-4 w-4" />}
            meta="Write from inside a reading to keep it here"
            title="Your journal is waiting"
          />
          {currentPlan.primaryEntry ? (
            <button
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#171412] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2a221c]"
              onClick={() => {
                void onOpenReading(currentPlan.primaryEntry!);
              }}
              type="button"
            >
              Open today’s reading
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          {currentPlan.journalEntries.map((entry) => (
            <article key={entry._id}>
              <div className="flex items-center justify-between gap-3">
                <WorkspacePill>
                  {entry.passageLabel}
                </WorkspacePill>
                <span className="text-[12px] text-[#8a8178]">
                  Day {entry.dayNumber}
                </span>
              </div>
              <p className="mt-3 text-[16px] leading-7 text-[#171412]">
                {entry.reflection}
              </p>
              <button
                className="mt-3 text-[13px] font-medium text-[#8a8178] hover:text-[#171412]"
                onClick={() => {
                  void onOpenReading(entry);
                }}
                type="button"
              >
                Revisit scripture
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function FocusSheet({
  currentPlan,
  onClose,
  onOpenReading,
}: {
  currentPlan: ReadingPlanCurrent;
  onClose: () => void;
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
      setCycleCount((count) => count + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/35 px-3 py-3 backdrop-blur-[2px] sm:items-center"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <button
        aria-label="Close pause"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-[28px] bg-white px-6 py-7 shadow-[0_24px_80px_rgba(37,20,11,0.16)]"
        exit={{ opacity: 0, y: 12 }}
        initial={{ opacity: 0, y: 16 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#171412]">
              Pause
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#8a8178]">
              One quiet cycle before you open the passage.
            </p>
          </div>
          <WorkspaceIconButton aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </WorkspaceIconButton>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="relative flex h-36 w-36 items-center justify-center">
            <motion.div
              animate={{
                scale:
                  breathPhase === "Exhale" ? 0.82 : 1.18,
                opacity: breathPhase === "Exhale" ? 0.45 : 0.9,
              }}
              className="absolute inset-0 rounded-full bg-[#efe8dc]"
              transition={{ duration: 3.8, ease: "easeInOut" }}
            />
            <div className="relative z-10 text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8a8178]">
                {breathPhase === "Inhale"
                  ? "breathe in"
                  : breathPhase === "Hold"
                    ? "hold"
                    : "breathe out"}
              </p>
              <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[#171412]">
                {breathPhase}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[13px] text-[#8a8178]">
          {Math.floor(cycleCount / 3)} cycles
        </p>

        <div className="mt-6 flex items-center gap-2">
          <button
            className="flex-1 rounded-full bg-[#f4f1ec] px-4 py-2.5 text-[13px] font-medium text-[#3a322c] hover:bg-[#ece7df]"
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
              className="flex-1 rounded-full bg-[#171412] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2a221c]"
              onClick={() => {
                void onOpenReading(entry);
              }}
              type="button"
            >
              {entry.startedAt ? "Resume reading" : "Begin reading"}
            </button>
          ) : null}
        </div>
      </motion.section>
    </motion.div>
  );
}

function CompletionCelebrationDialog({
  completion,
  onClose,
  onSavePng,
  onShare,
  onViewCompleted,
}: {
  completion: CompletionCelebration;
  onClose: () => void;
  onSavePng: () => Promise<void>;
  onShare: () => Promise<void>;
  onViewCompleted: () => void;
}) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#25140b]/55 px-4 backdrop-blur-[3px]"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <button
        aria-label="Close celebration"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <motion.section
        animate={{ opacity: 1, scale: 1, y: 0 }}
        aria-labelledby="completion-title"
        className="reading-plan-page relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#f6cf9d] bg-[#fffaf4] p-5 shadow-2xl sm:p-7"
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#f6823c]/20 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-36 w-36 rounded-full bg-[#f6c57b]/30 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6823c] text-white shadow-lg shadow-[#f6823c]/25">
              <Trophy className="h-6 w-6" />
            </span>
            <Sparkles className="h-6 w-6 text-[#e8a044]" />
          </div>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#bc5f25]">
            A faithful finish
          </p>
          <h2
            className="mt-2 font-serif text-3xl font-semibold leading-tight text-[#25140b]"
            id="completion-title"
          >
            Congratulations — you completed a plan.
          </h2>
          <div className="mt-5 border border-[#efddcb] bg-white/80 p-4">
            <p className="font-serif text-xl font-semibold text-[#25140b]">
              {completion.title}
            </p>
            <p className="mt-1 text-[12px] text-[#7a6758]">
              {completion.completedEntries}/{completion.totalEntries} readings ·{" "}
              {formatDuration(completion.durationDays)}
            </p>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#bc5f25]">
              Completed{" "}
              {new Date(completion.completedAt).toLocaleDateString([], {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3a2218] px-3 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#1f1209]"
              onClick={onShare}
              type="button"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e5d6c9] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#3a2218] transition-colors hover:bg-[#fbf7f2]"
              onClick={onSavePng}
              type="button"
            >
              <Download className="h-4 w-4" />
              Save PNG
            </button>
          </div>
          <button
            className="mt-4 w-full text-center text-[12px] font-semibold text-[#f6823c] transition-colors hover:text-[#c95f25]"
            onClick={onViewCompleted}
            type="button"
          >
            View completed plans
          </button>
        </div>
      </motion.section>
    </motion.div>
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
            <div className="mb-6 flex items-center justify-between pb-1">
              <div className="flex items-center gap-3">
                <WorkspaceIconButton aria-label="Back" onClick={onClose}>
                  <ArrowLeft className="h-5 w-5" />
                </WorkspaceIconButton>
                <div>
                  <span className="block text-[12px] text-[#8a8178]">
                    {currentPlan?.plan.title ?? "Reading plan"}
                  </span>
                  <span className="mt-0.5 block text-[18px] font-semibold tracking-[-0.02em] text-[#171412]">
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
