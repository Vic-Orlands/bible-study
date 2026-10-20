"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppShell } from "@/components/shell/app-shell";
import { CompletionCard } from "@/components/today/completion-card";
import { PlanBrowser } from "@/components/today/plan-browser";
import { PlanReader, useReflectionDraft } from "@/components/today/plan-reader";
import { ReadingWorkspace } from "@/components/today/reading-workspace";
import { usePlans } from "@/components/today/use-plans";
import { spring } from "@/lib/motion";

export default function TodayPage() {
  const plans = usePlans();
  const [readerOpen, setReaderOpen] = useState(false);
  const [reflection, setReflection] = useReflectionDraft(plans.selectedEntry);
  const [completedTitle, setCompletedTitle] = useState<string | null>(null);

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1">
        <div className="app-scroll min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-4 py-8">
            {plans.current === undefined ? (
              <p className="text-[length:var(--text-sm)] text-[var(--mute)]">Loading plans</p>
            ) : plans.current ? (
              <ReadingWorkspace
                activePlans={plans.active}
                current={plans.current}
                onArchive={() => void plans.archive()}
                onOpen={(entry) => {
                  void plans.openReading(entry);
                  setReaderOpen(true);
                }}
                onSelectPlan={plans.setSelectedPlanId}
                onToggle={(entryId) => void plans.toggle(entryId)}
                selectedPlanId={plans.current.plan._id}
              />
            ) : (
              <PlanBrowser onCustom={plans.startCustom} onStart={plans.startPlan} templates={plans.templates} />
            )}
            {plans.completed.length > 0 ? (
              <section className="mt-8" id="completed-plans">
                <h2 className="text-[length:var(--text-xs)] uppercase tracking-[0.14em] text-[var(--mute)]">
                  Completed
                </h2>
                <div className="mt-3 space-y-2">
                  {plans.completed.map((plan) => (
                    <button
                      className="block w-full rounded-2xl border border-[var(--line)] px-3 py-3 text-left text-[length:var(--text-sm)]"
                      key={plan._id}
                      onClick={() => plans.setSelectedPlanId(plan._id)}
                      type="button"
                    >
                      {plan.title}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
        <AnimatePresence>
          {readerOpen && plans.selectedEntry ? (
            <motion.div
              className="fixed inset-0 z-30 flex justify-end bg-[var(--ink)]/20 md:static md:bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="h-full w-full max-w-xl"
                initial={{ x: 24 }}
                animate={{ x: 0 }}
                exit={{ x: 24 }}
                transition={spring}
              >
                <PlanReader
                  entry={plans.selectedEntry}
                  onClose={() => setReaderOpen(false)}
                  onReflection={setReflection}
                  onSave={() => {
                    if (!plans.selectedEntry) return;
                    void plans.saveJournal(plans.selectedEntry._id, reflection);
                  }}
                  onToggle={() => {
                    if (!plans.selectedEntry) return;
                    void plans.toggle(plans.selectedEntry._id).then((result) => {
                      if (result?.completedNow) setCompletedTitle(plans.current?.plan.title ?? "Plan");
                    });
                  }}
                  onVersion={plans.setReaderVersionId}
                  reflection={reflection}
                  versionId={plans.readerVersionId}
                  versions={plans.versions}
                />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {completedTitle ? (
          <CompletionCard
            onClose={() => setCompletedTitle(null)}
            onViewCompleted={() => {
              setCompletedTitle(null);
              document.getElementById("completed-plans")?.scrollIntoView({ block: "start" });
            }}
            title={completedTitle}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
