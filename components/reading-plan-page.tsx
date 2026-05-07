"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  Flame,
  MoreHorizontal,
  Plus,
  Sun,
  Users,
} from "lucide-react";

import { ProductShell } from "@/components/product-shell";
import { cn } from "@/lib/utils";

const myPlans = [
  ["Daily Journey", "42%"],
  ["Chronological", "28%"],
  ["New Testament in a Year", "10%"],
];

const discoverPlans = ["Life of Jesus", "Topical Studies", "Whole Bible in a Year", "Psalms of the Month"];

const week = [
  ["M", "5", true],
  ["T", "6", true],
  ["W", "6", true],
  ["T", "7", false],
  ["F", "8", false],
  ["S", "9", false],
  ["S", "10", false],
] as const;

const readings = [
  ["May 7", "John 1-3", true],
  ["May 8", "John 4-6", false],
  ["May 9", "John 7-9", false],
  ["May 10", "John 10-12", false],
] as const;

export default function ReadingPlanPage() {
  return (
    <ProductShell>
      <div className="flex min-h-0 flex-1 overflow-hidden bg-white">
        <ReadingPlanRail />
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="bible-app-scroll min-w-0 flex-1 overflow-y-auto p-5"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
        >
          <div className="border border-[#f1e8df] bg-white p-5 shadow-[0_14px_42px_rgba(31,18,9,0.04)]">
            <PlanHeader />
            <div className="mt-6 grid gap-5 xl:grid-cols-[300px_1fr]">
              <TodayCard />
              <WeekPanel />
            </div>
            <StatsGrid />
          </div>
        </motion.section>
      </div>
    </ProductShell>
  );
}

function ReadingPlanRail() {
  return (
    <aside className="hidden w-[300px] shrink-0 border-r border-[#f1e8df] bg-white p-4 lg:block">
      <RailBlock title="My Plans">
        {myPlans.map(([name, progress], index) => (
          <button
            className={cn(
              "flex w-full items-center justify-between px-3 py-3 text-left text-[13px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]",
              index === 0 && "bg-[#f5efe7] text-[#25140b]",
            )}
            key={name}
            type="button"
          >
            <span className="flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-[#7a6758]" />
              {name}
            </span>
            <span className="text-[12px] text-[#2e6b3d]">{progress}</span>
          </button>
        ))}
        <button className="cta-button mt-3 flex w-full items-center justify-center gap-2 border border-[#e5d6c9] px-3 py-2 text-[12px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]" type="button">
          <Plus className="h-3.5 w-3.5" />
          Create New Plan
        </button>
      </RailBlock>

      <RailBlock title="Discover Plans">
        {discoverPlans.map((plan) => (
          <button className="flex w-full items-center gap-3 px-3 py-3 text-left text-[13px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]" key={plan} type="button">
            <CalendarDays className="h-4 w-4 text-[#7a6758]" />
            {plan}
          </button>
        ))}
        <button className="cta-button mt-3 w-full border border-[#e5d6c9] px-3 py-2 text-[12px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]" type="button">
          View All
        </button>
      </RailBlock>
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

function PlanHeader() {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#f1e8df] pb-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-3xl font-semibold text-[#25140b]">Daily Journey</h1>
          <button className="icon-button flex h-8 w-8 items-center justify-center text-[#7a6758] hover:bg-[#fbf7f2]" type="button">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1 text-[13px] font-medium text-[#5d493a]">A daily plan through the Bible to build a steady habit.</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="cta-button border border-[#e5d6c9] px-5 py-2.5 text-sm font-semibold text-[#3a2218] hover:bg-[#fbf7f2]" type="button">
          Customize
        </button>
        <button className="cta-button flex items-center gap-2 bg-[#2e6b3d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#245632]" type="button">
          <Users className="h-4 w-4" />
          Invite
        </button>
        <button className="icon-button flex h-10 w-10 items-center justify-center border border-[#e5d6c9] text-[#7a6758] hover:bg-[#fbf7f2]" type="button">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TodayCard() {
  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="border border-[#f1e8df] bg-white p-7"
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.18, delay: 0.04, ease: [0.215, 0.61, 0.355, 1] }}
    >
      <div className="mb-10 flex items-center gap-3">
        <Sun className="h-7 w-7 text-[#d5a12c]" />
        <div>
          <p className="text-base font-semibold text-[#25140b]">Today</p>
          <p className="text-[11px] font-medium text-[#9b8878]">May 7, 2026</p>
        </div>
      </div>
      <h2 className="font-serif text-4xl font-semibold text-[#25140b]">John 1-3</h2>
      <p className="mt-5 max-w-[220px] text-sm leading-6 text-[#5d493a]">The Word, life, and the call to believe.</p>
      <button className="cta-button mt-9 flex w-full items-center justify-center gap-2 bg-[#2e6b3d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#245632]" type="button">
        Continue Reading
        <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium text-[#7a6758]">
        <CheckCircle2 className="h-3.5 w-3.5 text-[#2e6b3d]" />
        Downloaded for offline
      </p>
    </motion.article>
  );
}

function WeekPanel() {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="border border-[#f1e8df] bg-white p-6"
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.18, delay: 0.08, ease: [0.215, 0.61, 0.355, 1] }}
    >
      <h2 className="mb-5 text-sm font-semibold text-[#25140b]">This Week</h2>
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#f1e8df] pb-5">
        {week.map(([day, date, done], index) => (
          <button
            className={cn(
              "relative flex h-14 w-14 flex-col items-center justify-center border border-[#f1e8df] bg-[#fbf7f2] text-[12px] font-semibold text-[#3a2218] hover:border-[#e5d6c9]",
              index === 3 && "border-[#d5a12c] bg-white text-[#25140b]",
            )}
            key={`${day}-${date}`}
            type="button"
          >
            <span>{day}</span>
            <span>{date}</span>
            {done && <CheckCircle2 className="absolute bottom-1 h-3 w-3 text-[#2e6b3d]" />}
            {index === 3 && <span className="absolute -bottom-2 h-2 w-2 bg-[#2e6b3d]" />}
          </button>
        ))}
      </div>

      <div className="space-y-0">
        {readings.map(([date, passage, active]) => (
          <button
            className={cn(
              "flex w-full items-center justify-between border-b border-[#f1e8df] px-4 py-3 text-left last:border-b-0 hover:bg-[#fbf7f2]",
              active && "bg-[#fff3e8]",
            )}
            key={date}
            type="button"
          >
            <span className="w-20 text-[13px] font-medium text-[#7a6758]">{date}</span>
            <span className="flex-1 text-[13px] font-semibold text-[#3a2218]">{passage}</span>
            <span className={cn("flex h-5 w-5 items-center justify-center border border-[#e5d6c9]", active && "border-[#d5a12c] bg-white")}>
              {active && <Check className="h-3 w-3 text-[#2e6b3d]" />}
            </span>
          </button>
        ))}
      </div>
    </motion.section>
  );
}

function StatsGrid() {
  const stats = [
    ["Progress", "42%", "This Plan", "progress"],
    ["Completed", "63", "Days", "text"],
    ["Streak", "7", "Days", "text"],
    ["Time in God's Word", "18h 24m", "This Plan", "text"],
  ];

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map(([label, value, meta, kind], index) => (
        <motion.article
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[96px] items-center justify-between border border-[#f1e8df] bg-white p-5"
          initial={{ opacity: 0, y: 8 }}
          key={label}
          transition={{ duration: 0.16, delay: 0.05 * index, ease: [0.215, 0.61, 0.355, 1] }}
        >
          <div>
            <p className="text-[13px] font-medium text-[#7a6758]">{label}</p>
            <p className="mt-1 font-serif text-3xl font-semibold text-[#25140b]">{value}</p>
            <p className="text-[11px] font-medium text-[#9b8878]">{meta}</p>
          </div>
          {kind === "progress" && (
            <div className="relative h-16 w-16">
              <svg viewBox="0 0 64 64">
                <circle cx="32" cy="32" fill="none" r="26" stroke="#f1e8df" strokeWidth="5" />
                <circle cx="32" cy="32" fill="none" r="26" stroke="#2e6b3d" strokeDasharray="68 164" strokeLinecap="round" strokeWidth="5" transform="rotate(-90 32 32)" />
              </svg>
            </div>
          )}
          {label === "Streak" && <Flame className="h-6 w-6 text-[#f6823c]" />}
          {label === "Time in God's Word" && <Clock3 className="h-6 w-6 text-[#7a6758]" />}
        </motion.article>
      ))}
    </div>
  );
}
