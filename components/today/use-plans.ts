"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { identityArgs } from "@/lib/identity";
import { preferredVisibleVersions, useBibleVersions } from "@/lib/scripture";
import { useStudyStore } from "@/lib/study-store";

export type PlanEntry = {
  _id: Id<"userPlanEntries">;
  completedAt?: number;
  dayNumber: number;
  dueDate: string;
  endChapter: number;
  passageBook: string;
  passageChapter: number;
  passageLabel: string;
  passageVerse: number;
  reflection?: string;
  startChapter: number;
  startedAt?: number;
  status: "pending" | "completed";
};

export type CurrentPlan = {
  allEntries: PlanEntry[];
  currentEntry: PlanEntry | null;
  hasStartedReading: boolean;
  journalEntries: PlanEntry[];
  plan: {
    _id: Id<"userPlans">;
    completedEntries: number;
    description: string;
    status: "active" | "completed" | "archived";
    templateId: string;
    title: string;
    totalEntries: number;
  };
  primaryEntry: PlanEntry | null;
  progressPercent: number;
  streak: number;
  templateMeta: {
    cadenceLabel: string;
    durationDays: number;
    estimatedMinutes: number;
    summary: string;
  } | null;
  upcomingEntries: PlanEntry[];
};

export function usePlans() {
  const identityId = useStudyStore((state) => state.identityId);
  const [selectedPlanId, setSelectedPlanId] = useState<Id<"userPlans"> | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<Id<"userPlanEntries"> | null>(null);
  const [readerVersionId, setReaderVersionId] = useState("");
  const { data: versions = [] } = useBibleVersions();
  const templateQuery = useQuery(api.readingPlans.templates);
  const activeQuery = useQuery(api.readingPlans.active, identityArgs(identityId));
  const completedQuery = useQuery(api.readingPlans.completed, identityArgs(identityId));
  const templates = useMemo(() => templateQuery ?? [], [templateQuery]);
  const active = useMemo(() => activeQuery ?? [], [activeQuery]);
  const completed = useMemo(() => completedQuery ?? [], [completedQuery]);
  const current = useQuery(api.readingPlans.current, {
    ...identityArgs(identityId),
    ...(selectedPlanId ? { planId: selectedPlanId } : {}),
  }) as CurrentPlan | null | undefined;
  const createPlan = useMutation(api.readingPlans.create);
  const createCustomPlan = useMutation(api.readingPlans.createCustom);
  const openPlanEntry = useMutation(api.readingPlans.openEntry);
  const toggleEntry = useMutation(api.readingPlans.toggleEntry);
  const saveReflection = useMutation(api.readingPlans.saveReflection);
  const archiveCurrent = useMutation(api.readingPlans.archiveCurrent);

  useEffect(() => {
    if (!versions.length) return;
    const preferred = preferredVisibleVersions([], versions)[0];
    if (!preferred) return;
    if (!readerVersionId || !versions.some((version) => version.id === readerVersionId)) {
      setReaderVersionId(preferred);
    }
  }, [readerVersionId, versions]);

  useEffect(() => {
    const visible = [...active, ...completed];
    if (visible.some((plan) => plan._id === selectedPlanId)) return;
    setSelectedPlanId(active[0]?._id ?? completed[0]?._id ?? null);
  }, [active, completed, selectedPlanId]);

  const selectedEntry = useMemo(() => {
    if (!current) return null;
    return (
      current.allEntries.find((entry) => entry._id === selectedEntryId) ??
      current.currentEntry ??
      current.primaryEntry ??
      null
    );
  }, [current, selectedEntryId]);

  const startPlan = async (templateId: string, title: string) => {
    try {
      const planId = await createPlan({
        ...identityArgs(identityId),
        startDate: new Date().toISOString().slice(0, 10),
        templateId,
      });
      setSelectedPlanId(planId);
      toast.success(`Started ${title}`);
    } catch (error) {
      console.error("Failed to create reading plan:", error);
      toast.error("Could not start the plan");
    }
  };

  const startCustom = async (draft: {
    book: string;
    durationDays: number;
    endChapter: number;
    startChapter: number;
    title: string;
  }) => {
    try {
      const result = await createCustomPlan({
        ...identityArgs(identityId),
        startDate: new Date().toISOString().slice(0, 10),
        ...draft,
      });
      setSelectedPlanId(result.planId);
      toast.success(`Started ${draft.title}`);
    } catch (error) {
      console.error("Failed to create custom reading plan:", error);
      toast.error("Could not start the custom plan");
    }
  };

  const openReading = async (entry: PlanEntry) => {
    try {
      await openPlanEntry({ entryId: entry._id, ...identityArgs(identityId) });
      setSelectedEntryId(entry._id);
    } catch (error) {
      console.error("Failed to open reading plan entry:", error);
      toast.error("Could not open the reading");
    }
  };

  const toggle = async (entryId: Id<"userPlanEntries">) => {
    try {
      return await toggleEntry({ entryId, ...identityArgs(identityId) });
    } catch (error) {
      console.error("Failed to toggle reading plan entry:", error);
      toast.error("Could not update progress");
      return null;
    }
  };

  const saveJournal = async (entryId: Id<"userPlanEntries">, reflection: string) => {
    try {
      await saveReflection({ entryId, ...identityArgs(identityId), reflection });
      toast.success("Journal saved");
    } catch (error) {
      console.error("Failed to save reading plan reflection:", error);
      toast.error("Could not save the journal");
    }
  };

  const archive = async () => {
    if (!current) return;
    try {
      await archiveCurrent({ ...identityArgs(identityId), planId: current.plan._id });
      toast.success("Plan archived");
    } catch (error) {
      console.error("Failed to archive current plan:", error);
      toast.error("Could not archive the plan");
    }
  };

  return {
    active,
    archive,
    completed,
    current,
    openReading,
    readerVersionId,
    saveJournal,
    selectedEntry,
    setReaderVersionId,
    setSelectedEntryId,
    setSelectedPlanId,
    startCustom,
    startPlan,
    templates,
    toggle,
    versions,
  };
}
