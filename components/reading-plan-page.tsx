"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  Plus,
} from "lucide-react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ProductShell } from "@/components/product-shell";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  READING_PLAN_TEMPLATES,
  type ReadingPlanTemplate,
} from "@/lib/reading-plan-templates";
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

type ReadingPlanTemplateCard = Pick<
  ReadingPlanTemplate,
  | "cadenceLabel"
  | "category"
  | "durationDays"
  | "estimatedMinutes"
  | "featured"
  | "id"
  | "scopeLabel"
  | "summary"
  | "title"
>;

type ReadingPlanCurrent = {
  plan: {
    _id: Id<"userPlans">;
    templateId: string;
    title: string;
    description: string;
    totalEntries: number;
    completedEntries: number;
  };
  primaryEntry: {
    _id: Id<"userPlanEntries">;
    dueDate: string;
    dayNumber: number;
    passageBook: string;
    passageChapter: number;
    passageVerse: number;
    passageLabel: string;
    status: "pending" | "completed";
  } | null;
  hasStartedReading: boolean;
  progressPercent: number;
  streak: number;
  templateMeta: {
    category: string;
    cadenceLabel: string;
    estimatedMinutes: number;
    scopeLabel: string;
    summary: string;
  } | null;
  upcomingEntries: {
    _id: Id<"userPlanEntries">;
    dueDate: string;
    dayNumber: number;
    passageBook: string;
    passageChapter: number;
    passageVerse: number;
    passageLabel: string;
    status: "pending" | "completed";
  }[];
};

export default function ReadingPlanPage() {
  const auth = useConvexAuth();
  const authIdentity = useQuery(api.auth.getUserIdentity);
  const syncViewerIdentity = useMutation(api.identity.syncViewerIdentity);
  const setIdentity = useStudyStore((s) => s.setIdentity);
  const identityId = useStudyStore((s) => s.identityId);
  const [storeReady, setStoreReady] = useState(false);

  const setPassage = useStudyStore((state) => state.setPassage);
  const currentPlan = useQuery(api.readingPlans.current, {
    ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
  });
  const createPlan = useMutation(api.readingPlans.create);
  const openPlanEntry = useMutation(api.readingPlans.openEntry);
  const toggleEntry = useMutation(api.readingPlans.toggleEntry);
  const router = useRouter();

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
        } catch (e) {
          console.error("Failed to sync signed-in identity in reading plan:", e);
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
      } catch (e) {
        console.error("Failed to get anonymous identity in reading plan:", e);
      } finally {
        if (!cancelled) setStoreReady(true);
      }
    };

    initIdentity();
    return () => {
      cancelled = true;
    };
  }, [
    auth.isLoading,
    auth.isAuthenticated,
    authIdentity,
    identityId,
    setIdentity,
    syncViewerIdentity,
  ]);

  const templateCards = useMemo<ReadingPlanTemplateCard[]>(
    () =>
      READING_PLAN_TEMPLATES.map((template) => ({
        cadenceLabel: template.cadenceLabel,
        category: template.category,
        durationDays: template.durationDays,
        estimatedMinutes: template.estimatedMinutes,
        featured: template.featured,
        id: template.id,
        scopeLabel: template.scopeLabel,
        summary: template.summary,
        title: template.title,
      })),
    [],
  );
  const displayPlan = useMemo(() => {
    if (!currentPlan) {
      return null;
    }
    if (!currentPlan.primaryEntry) {
      return null;
    }
    if ((currentPlan.upcomingEntries ?? []).length === 0) {
      return null;
    }
    return currentPlan;
  }, [currentPlan]);
  const groupedTemplates = useMemo(() => {
    const groups = new Map<string, ReadingPlanTemplateCard[]>();
    for (const template of templateCards) {
      const existing = groups.get(template.category) ?? [];
      existing.push(template);
      groups.set(template.category, existing);
    }
    return Array.from(groups.entries());
  }, [templateCards]);

  const openReading = async (entry: {
    _id?: Id<"userPlanEntries">;
    passageBook: string;
    passageChapter: number;
    passageVerse: number;
  }) => {
    try {
      if (entry._id) {
        await openPlanEntry({
          entryId: entry._id,
          ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
        });
      }
    } catch (error) {
      console.error("Failed to record reading plan open:", error);
    }

    setPassage({
      book: entry.passageBook,
      chapter: entry.passageChapter,
      verse: entry.passageVerse,
    });
    router.push(
      `/study?book=${encodeURIComponent(entry.passageBook)}&chapter=${entry.passageChapter}&verse=${entry.passageVerse}`,
    );
  };

  const startPlan = async (templateId: string, title: string) => {
    try {
      await createPlan({
        ...(identityId ? { identityId: identityId as Id<"identities"> } : {}),
        startDate: todayString(),
        templateId,
      });
      toast.success(`Started ${title}`);
    } catch (error) {
      console.error("Failed to create reading plan:", error);
      toast.error("Failed to create reading plan.");
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
          activePlan={displayPlan}
          groupedTemplates={groupedTemplates}
          templates={templateCards}
          onStartPlan={startPlan}
        />

        <motion.main
          animate={{ opacity: 1, y: 0 }}
          className="bible-app-scroll min-w-0 flex-1 overflow-y-auto p-5"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
        >
          <section className="border border-[#f1e8df] bg-white p-6 shadow-[0_14px_42px_rgba(31,18,9,0.04)]">
            {displayPlan ? (
              <ActivePlanContent
                currentPlan={displayPlan}
                onOpenReading={openReading}
                onToggleEntry={handleToggleEntry}
              />
            ) : (
              <BrowseContent
                templates={templateCards}
                onStartPlan={startPlan}
              />
            )}
          </section>
        </motion.main>

        <ReadingPlanSidePanel
          activePlan={displayPlan}
          templates={templateCards}
          onOpenReading={openReading}
        />
      </div>
    </ProductShell>
  );
}

function ReadingPlanRail({
  activePlan,
  groupedTemplates,
  templates,
  onStartPlan,
}: {
  activePlan: ReadingPlanCurrent | null | undefined;
  groupedTemplates: [string, ReadingPlanTemplateCard[]][];
  templates: ReadingPlanTemplateCard[];
  onStartPlan: (templateId: string, title: string) => Promise<void>;
}) {
  const currentPlan = activePlan ?? null;
  const featuredTemplates = templates.filter((template) => template.featured).slice(0, 3);

  return (
    <aside className="bible-app-scroll hidden min-h-0 w-[292px] shrink-0 overflow-y-auto border-r border-[#f1e8df] bg-white p-4 lg:block">
      {currentPlan ? (
        <RailBlock title="Current Plan">
          <div className="px-3 py-3">
            <p className="text-[13px] font-semibold text-[#25140b]">
              {currentPlan.plan.title}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#7a6758]">
              {currentPlan.templateMeta?.scopeLabel ?? currentPlan.plan.description}
            </p>
            <div className="mt-3 text-[11px] font-medium text-[#9b8878]">
              {currentPlan.plan.completedEntries} of {currentPlan.plan.totalEntries} complete
            </div>
          </div>
        </RailBlock>
      ) : (
        <RailBlock title="Featured Plans">
          {featuredTemplates.map((template) => (
            <button
              className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-[#fbf7f2]"
              key={template.id}
              onClick={() => onStartPlan(template.id, template.title)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-[#3a2218]">
                  {template.title}
                </span>
                <span className="block truncate text-[11px] font-medium text-[#9b8878]">
                  {formatDuration(template.durationDays)} · {template.cadenceLabel}
                </span>
              </span>
              <Plus className="h-4 w-4 text-[#9b8878]" />
            </button>
          ))}
        </RailBlock>
      )}

      {groupedTemplates.map(([category, items]) => (
        <RailBlock
          key={`${category}-${items.map((template) => template.id).join("-")}`}
          title={category}
        >
          {items.map((template) => (
            <button
              className={cn(
                "flex w-full items-center gap-3 px-3 py-3 text-left text-[13px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]",
                currentPlan?.plan.templateId === template.id && "bg-[#f5efe7] text-[#25140b]",
              )}
              key={template.id}
              onClick={() => onStartPlan(template.id, template.title)}
              type="button"
            >
              <BookOpen className="h-4 w-4 shrink-0 text-[#7a6758]" />
              <span className="min-w-0">
                <span className="block truncate">{template.title}</span>
                <span className="block truncate text-[11px] font-medium text-[#9b8878]">
                  {formatDuration(template.durationDays)}
                </span>
              </span>
            </button>
          ))}
        </RailBlock>
      ))}
    </aside>
  );
}

function RailBlock({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="mb-4 border border-[#f1e8df] bg-white p-4">
      <h2 className="mb-3 text-[13px] font-semibold text-[#25140b]">{title}</h2>
      {children}
    </section>
  );
}

function BrowseContent({
  templates,
  onStartPlan,
}: {
  templates: ReadingPlanTemplateCard[];
  onStartPlan: (templateId: string, title: string) => Promise<void>;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-[#f1e8df] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-semibold text-[#25140b]">
              Reading Plans
            </h1>
          </div>
          <p className="mt-1 text-[13px] font-medium text-[#5d493a]">
            Choose a curated path and move straight into today&apos;s reading.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[320px_1fr]">
        <motion.article
          animate={{ opacity: 1, y: 0 }}
          className="border border-[#f1e8df] bg-white p-7"
          initial={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.18, delay: 0.04, ease: [0.215, 0.61, 0.355, 1] }}
        >
          <div className="mb-10 flex items-center gap-3">
            <CalendarDays className="h-7 w-7 text-[#d5a12c]" />
            <div>
              <p className="text-base font-semibold text-[#25140b]">Start a Plan</p>
              <p className="text-[11px] font-medium text-[#9b8878]">
                Curated daily rhythms
              </p>
            </div>
          </div>
          <h2 className="font-serif text-4xl font-semibold text-[#25140b]">
            Read with structure.
          </h2>
          <p className="mt-5 max-w-[240px] text-sm leading-6 text-[#5d493a]">
            Pick a plan, open the first passage immediately, and let your progress stay tied to your study flow.
          </p>
          {templates[0] && (
            <button
              className="cta-button mt-9 flex w-full items-center justify-center gap-2 bg-[#2e6b3d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#245632]"
              onClick={() => onStartPlan(templates[0].id, templates[0].title)}
              type="button"
            >
              Start {templates[0].title}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <p className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium text-[#7a6758]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#2e6b3d]" />
            Plans open directly into Study
          </p>
        </motion.article>

        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="border border-[#f1e8df] bg-white p-6"
          initial={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.18, delay: 0.08, ease: [0.215, 0.61, 0.355, 1] }}
        >
          <h2 className="mb-5 text-sm font-semibold text-[#25140b]">Available Plans</h2>
          <div className="space-y-0">
            {templates.map((template) => (
              <button
                className="flex w-full items-center justify-between border-b border-[#f1e8df] px-4 py-4 text-left last:border-b-0 hover:bg-[#fbf7f2]"
                key={template.id}
                onClick={() => onStartPlan(template.id, template.title)}
                type="button"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#3a2218]">
                      {template.title}
                    </span>
                    {template.featured && (
                      <span className="bg-[#fff3e8] px-2 py-0.5 text-[10px] font-semibold text-[#a24723]">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="mt-1 max-w-[620px] text-[12px] leading-5 text-[#7a6758]">
                    {template.scopeLabel}
                  </p>
                  <p className="mt-2 text-[11px] font-medium text-[#9b8878]">
                    {template.category} · {formatDuration(template.durationDays)} ·{" "}
                    {template.cadenceLabel} · ~{template.estimatedMinutes} min
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#9b8878]" />
              </button>
            ))}
          </div>
        </motion.section>
      </div>
    </>
  );
}

function ActivePlanContent({
  currentPlan,
  onOpenReading,
  onToggleEntry,
}: {
  currentPlan: ReadingPlanCurrent;
  onOpenReading: (entry: {
    passageBook: string;
    passageChapter: number;
    passageVerse: number;
  }) => void;
  onToggleEntry: (entryId: Id<"userPlanEntries">) => Promise<void>;
}) {
  if (!currentPlan) {
    console.error("ActivePlanContent rendered without a current plan.");
    return null;
  }

  const primaryEntry = currentPlan.primaryEntry;
  const actionLabel = primaryEntry
    ? currentPlan.hasStartedReading
      ? "Continue Reading"
      : "Start Reading"
    : null;
  const listEntries = (currentPlan.upcomingEntries ?? []).slice(0, 6);

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-[#f1e8df] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-semibold text-[#25140b]">
              {currentPlan.plan.title}
            </h1>
          </div>
          <p className="mt-1 text-[13px] font-medium text-[#5d493a]">
            {currentPlan.templateMeta?.scopeLabel ?? currentPlan.plan.description}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[320px_1fr]">
        <motion.article
          animate={{ opacity: 1, y: 0 }}
          className="border border-[#f1e8df] bg-white p-7"
          initial={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.18, delay: 0.04, ease: [0.215, 0.61, 0.355, 1] }}
        >
          <div className="mb-10 flex items-center gap-3">
            <CalendarDays className="h-7 w-7 text-[#d5a12c]" />
            <div>
              <p className="text-base font-semibold text-[#25140b]">Current Reading</p>
              <p className="text-[11px] font-medium text-[#9b8878]">
                {primaryEntry?.dueDate
                  ? formatDateLabel(primaryEntry.dueDate)
                  : "Plan complete"}
              </p>
            </div>
          </div>

          <h2 className="font-serif text-4xl font-semibold text-[#25140b]">
            {primaryEntry?.passageLabel ?? "Plan Complete"}
          </h2>
          <p className="mt-5 max-w-[240px] text-sm leading-6 text-[#5d493a]">
            {primaryEntry
              ? `Day ${primaryEntry.dayNumber} of ${currentPlan.plan.totalEntries} · ${currentPlan.templateMeta?.cadenceLabel ?? "Daily reading"}`
              : "You’ve finished every reading in this plan."}
          </p>

          {primaryEntry && actionLabel ? (
            <button
              className="cta-button mt-9 flex w-full items-center justify-center gap-2 bg-[#2e6b3d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#245632]"
              onClick={() => onOpenReading(primaryEntry)}
              type="button"
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="mt-9 flex items-center justify-center gap-2 border border-[#eadccf] bg-[#fffaf5] px-4 py-3 text-[12px] font-medium text-[#5d493a]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#2e6b3d]" />
              Start another plan from the rail
            </div>
          )}

          <p className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium text-[#7a6758]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#2e6b3d]" />
            {currentPlan.plan.completedEntries} of {currentPlan.plan.totalEntries} complete
          </p>
        </motion.article>

        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="border border-[#f1e8df] bg-white p-6"
          initial={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.18, delay: 0.08, ease: [0.215, 0.61, 0.355, 1] }}
        >
          <h2 className="mb-5 text-sm font-semibold text-[#25140b]">Up Next</h2>
          <div className="space-y-0">
            {listEntries.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-[#7a6758]">
                No more readings remain in this plan.
              </div>
            ) : (
              listEntries.map((entry) => (
                <div
                  className={cn(
                    "flex w-full items-center justify-between border-b border-[#f1e8df] px-4 py-3 text-left last:border-b-0 hover:bg-[#fbf7f2]",
                    primaryEntry?._id === entry._id && "bg-[#fff3e8]",
                  )}
                  key={entry._id}
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    onClick={() => onOpenReading(entry)}
                    type="button"
                  >
                    <span className="w-20 text-[13px] font-medium text-[#7a6758]">
                      {formatDateLabel(entry.dueDate)}
                    </span>
                    <span className="flex-1 text-[13px] font-semibold text-[#3a2218]">
                      {entry.passageLabel}
                    </span>
                  </button>
                  <span className="ml-3 flex items-center gap-2">
                    <button
                      className={cn(
                        "flex h-5 w-5 items-center justify-center border border-[#e5d6c9]",
                        entry.status === "completed" && "border-[#d5a12c] bg-white",
                      )}
                      onClick={async () => {
                        await onToggleEntry(entry._id);
                      }}
                      type="button"
                    >
                      {entry.status === "completed" && (
                        <Check className="h-3 w-3 text-[#2e6b3d]" />
                      )}
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.section>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Progress"
          meta={currentPlan.plan.title}
          value={`${currentPlan.progressPercent}%`}
        />
        <StatCard
          label="Completed"
          meta="Readings"
          value={`${currentPlan.plan.completedEntries}`}
        />
        <StatCard
          icon={<Flame className="h-6 w-6 text-[#f6823c]" />}
          label="Streak"
          meta="Days"
          value={`${currentPlan.streak}`}
        />
      </div>
    </>
  );
}

function ReadingPlanSidePanel({
  activePlan,
  templates,
  onOpenReading,
}: {
  activePlan: ReadingPlanCurrent | null | undefined;
  templates: ReadingPlanTemplateCard[];
  onOpenReading: (entry: {
    passageBook: string;
    passageChapter: number;
    passageVerse: number;
  }) => void;
}) {
  return (
    <aside className="bible-app-scroll hidden min-h-0 w-[360px] shrink-0 overflow-y-auto border-l border-[#f1e8df] bg-white p-4 xl:block">
      <div className="border border-[#f1e8df] bg-white">
        <div className="border-b border-[#f1e8df] px-5 py-4">
          <h2 className="text-[13px] font-semibold text-[#25140b]">
            {activePlan ? "Plan Summary" : "Getting Started"}
          </h2>
        </div>
        <div className="p-5">
          {activePlan ? (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3">
                <SummaryTile
                  label="Length"
                  value={formatDuration(activePlan.plan.totalEntries)}
                />
                <SummaryTile
                  label="Session"
                  value={`~${activePlan.templateMeta?.estimatedMinutes ?? 10} min`}
                />
                <SummaryTile
                  label="Category"
                  value={activePlan.templateMeta?.category ?? "Plan"}
                />
                <SummaryTile
                  label="Remaining"
                  value={`${Math.max(
                    activePlan.plan.totalEntries - activePlan.plan.completedEntries,
                    0,
                  )}`}
                />
              </div>

              {activePlan.primaryEntry && (
                <button
                  className="cta-button flex w-full items-center justify-center gap-2 bg-[#2e6b3d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#245632]"
                  onClick={() => onOpenReading(activePlan.primaryEntry!)}
                  type="button"
                >
                  {activePlan.hasStartedReading ? "Continue Reading" : "Start Reading"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-[13px] leading-6 text-[#5d493a]">
                Reading plans work best when they feel close to the rest of your study flow. Pick a plan from the rail, then open today&apos;s passage directly in Study.
              </p>
              <div className="mt-5 space-y-3">
                {templates.slice(0, 4).map((template) => (
                  <div key={template.id} className="border border-[#f1e8df] bg-[#fbf7f2] p-3">
                    <p className="text-[12px] font-semibold text-[#25140b]">
                      {template.title}
                    </p>
                    <p className="mt-1 text-[11px] text-[#7a6758]">
                      {template.scopeLabel} · {template.cadenceLabel}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#f1e8df] bg-[#fbf7f2] p-3">
      <p className="text-lg font-semibold text-[#25140b]">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-[#9b8878]">
        {label}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  meta,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  meta: string;
  value: string;
}) {
  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[96px] items-center justify-between border border-[#f1e8df] bg-white p-5"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.16, ease: [0.215, 0.61, 0.355, 1] }}
    >
      <div>
        <p className="text-[13px] font-medium text-[#7a6758]">{label}</p>
        <p className="mt-1 font-serif text-3xl font-semibold text-[#25140b]">{value}</p>
        <p className="text-[11px] font-medium text-[#9b8878]">{meta}</p>
      </div>
      {icon ?? <Clock3 className="h-6 w-6 text-[#7a6758]" />}
    </motion.article>
  );
}
