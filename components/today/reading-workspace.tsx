"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CurrentPlan, PlanEntry } from "@/components/today/use-plans";
import { cn } from "@/lib/utils";

type Section = "reading" | "journal" | "stillness";

export function ReadingWorkspace({
  activePlans,
  current,
  onArchive,
  onOpen,
  onSelectPlan,
  onToggle,
  selectedPlanId,
}: {
  activePlans: { _id: string; progressPercent: number; title: string }[];
  current: CurrentPlan;
  onArchive: () => void;
  onOpen: (entry: PlanEntry) => void;
  onSelectPlan: (planId: CurrentPlan["plan"]["_id"]) => void;
  onToggle: (entryId: PlanEntry["_id"]) => void;
  selectedPlanId: string | null;
}) {
  const [section, setSection] = useState<Section>("reading");
  const entry = current.primaryEntry ?? current.currentEntry;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[length:var(--text-xl)] font-medium">{current.plan.title}</h1>
          <p className="text-[length:var(--text-sm)] text-[var(--mute)]">
            {current.progressPercent}% · {current.streak} day streak
          </p>
        </div>
        <button className="text-[length:var(--text-xs)] text-[var(--mute)]" onClick={onArchive} type="button">
          Archive
        </button>
      </header>
      {activePlans.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {activePlans.map((plan) => (
            <button
              className={cn(
                "rounded-full border px-3 py-1 text-[length:var(--text-xs)]",
                plan._id === selectedPlanId ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)]",
              )}
              key={plan._id}
              onClick={() => onSelectPlan(plan._id as CurrentPlan["plan"]["_id"])}
              type="button"
            >
              {plan.title}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        {(
          [
            ["reading", "Reading"],
            ["journal", "Journal"],
            ["stillness", "Stillness"],
          ] as const
        ).map(([id, label]) => (
          <button
            className={cn(
              "rounded-full px-3 py-1 text-[length:var(--text-xs)]",
              section === id ? "bg-[var(--soft)]" : "text-[var(--mute)]",
            )}
            key={id}
            onClick={() => setSection(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {section === "reading" ? (
        <section className="space-y-3">
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--sheet)] p-4">
            <p className="text-[length:var(--text-xs)] uppercase tracking-[0.14em] text-[var(--mute)]">Today</p>
            <h2 className="mt-2 text-[length:var(--text-xl)] font-medium">
              {entry?.passageLabel ?? "Plan complete"}
            </h2>
            <p className="mt-1 text-[length:var(--text-sm)] text-[var(--mute)]">
              {entry
                ? `Day ${entry.dayNumber} of ${current.plan.totalEntries}`
                : "Every scheduled reading is finished."}
            </p>
            {entry ? (
              <button
                className="mt-4 rounded-full bg-[var(--accent)] px-3 py-1.5 text-[length:var(--text-xs)] font-medium text-[var(--accent-ink)]"
                onClick={() => onOpen(entry)}
                type="button"
              >
                {current.hasStartedReading ? "Continue reading" : "Start reading"}
              </button>
            ) : null}
          </article>
          {current.upcomingEntries.map((item) => (
            <button
              className="flex w-full items-center justify-between rounded-2xl border border-[var(--line)] px-3 py-3 text-left"
              key={item._id}
              onClick={() => onOpen(item)}
              type="button"
            >
              <span>
                <span className="block text-[length:var(--text-sm)]">{item.passageLabel}</span>
                <span className="text-[length:var(--text-xs)] text-[var(--mute)]">Day {item.dayNumber}</span>
              </span>
              <span className="text-[length:var(--text-xs)] text-[var(--mute)]">{item.status}</span>
            </button>
          ))}
          <button
            className="text-[length:var(--text-xs)] text-[var(--mute)]"
            onClick={() => entry && onToggle(entry._id)}
            type="button"
          >
            Toggle today’s completion
          </button>
        </section>
      ) : null}
      {section === "journal" ? (
        <section className="space-y-3">
          {current.journalEntries.length === 0 ? (
            <p className="text-[length:var(--text-sm)] text-[var(--mute)]">No journal entries yet.</p>
          ) : (
            current.journalEntries.map((item) => (
              <button
                className="block w-full rounded-2xl border border-[var(--line)] px-3 py-3 text-left"
                key={item._id}
                onClick={() => onOpen(item)}
                type="button"
              >
                <span className="text-[length:var(--text-xs)] text-[var(--mute)]">{item.passageLabel}</span>
                <span className="mt-1 block text-[length:var(--text-sm)]">{item.reflection}</span>
              </button>
            ))
          )}
        </section>
      ) : null}
      {section === "stillness" ? <Stillness onOpen={() => entry && onOpen(entry)} /> : null}
    </div>
  );
}

function Stillness({ onOpen }: { onOpen: () => void }) {
  const [phase, setPhase] = useState<"Inhale" | "Hold" | "Exhale">("Inhale");
  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhase((current) => (current === "Inhale" ? "Hold" : current === "Hold" ? "Exhale" : "Inhale"));
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="flex flex-col items-start gap-4">
      <motion.div
        animate={{ scale: phase === "Exhale" ? 0.86 : 1 }}
        className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--accent)] text-[length:var(--text-sm)] font-medium text-[var(--accent-ink)]"
        transition={{ duration: 3.6, ease: "easeInOut" }}
      >
        {phase}
      </motion.div>
      <p className="max-w-sm text-[length:var(--text-sm)] text-[var(--mute)]">
        Be still, and know that I am God. Psalm 46:10
      </p>
      <button className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[length:var(--text-xs)]" onClick={onOpen} type="button">
        Continue reading
      </button>
    </section>
  );
}
