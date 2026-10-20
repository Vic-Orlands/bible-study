"use client";

import { useMemo, useState } from "react";
import { CANON } from "@/lib/reading-plan-templates";

type TemplateCard = {
  cadenceLabel: string;
  category: string;
  durationDays: number;
  estimatedMinutes: number;
  id: string;
  scopeLabel: string;
  summary: string;
  title: string;
};

export function PlanBrowser({
  templates,
  onStart,
  onCustom,
}: {
  templates: TemplateCard[];
  onStart: (templateId: string, title: string) => Promise<void>;
  onCustom: (draft: {
    book: string;
    durationDays: number;
    endChapter: number;
    startChapter: number;
    title: string;
  }) => Promise<void>;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [book, setBook] = useState(CANON[0]?.book ?? "John");
  const [startChapter, setStartChapter] = useState(1);
  const [endChapter, setEndChapter] = useState(1);
  const [days, setDays] = useState(7);
  const [title, setTitle] = useState("");
  const groups = useMemo(() => {
    const map = new Map<string, TemplateCard[]>();
    for (const template of templates) {
      map.set(template.category, [...(map.get(template.category) ?? []), template]);
    }
    return [...map.entries()];
  }, [templates]);
  const selectedBook = CANON.find((item) => item.book === book);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[length:var(--text-xl)] font-medium">Today</h1>
        <p className="mt-1 max-w-md text-[length:var(--text-sm)] text-[var(--mute)]">
          Choose a reading plan and keep the passage, journal, and progress together.
        </p>
      </header>
      {groups.map(([category, items]) => (
        <section key={category}>
          <h2 className="text-[length:var(--text-xs)] uppercase tracking-[0.14em] text-[var(--mute)]">
            {category}
          </h2>
          <div className="mt-3 grid gap-3">
            {items.map((template) => (
              <article className="rounded-2xl border border-[var(--line)] bg-[var(--sheet)] p-4" key={template.id}>
                <h3 className="text-[length:var(--text-lg)] font-medium">{template.title}</h3>
                <p className="mt-1 text-[length:var(--text-sm)] text-[var(--mute)]">{template.summary}</p>
                <p className="mt-2 text-[length:var(--text-xs)] text-[var(--mute)]">
                  {template.scopeLabel} · {template.durationDays} days · {template.estimatedMinutes} min
                </p>
                <button
                  className="mt-3 rounded-full bg-[var(--accent)] px-3 py-1.5 text-[length:var(--text-xs)] font-medium text-[var(--accent-ink)]"
                  onClick={() => void onStart(template.id, template.title)}
                  type="button"
                >
                  Start
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
      <section>
        <button
          className="text-[length:var(--text-sm)] text-[var(--accent)]"
          onClick={() => setCustomOpen((open) => !open)}
          type="button"
        >
          Custom plan
        </button>
        {customOpen ? (
          <form
            className="mt-3 grid gap-2 rounded-2xl border border-[var(--line)] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void onCustom({
                book,
                durationDays: days,
                endChapter,
                startChapter,
                title: title || `${book} ${startChapter}-${endChapter}`,
              });
            }}
          >
            <input
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[length:var(--text-sm)] outline-none"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title"
              value={title}
            />
            <select
              className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[length:var(--text-sm)]"
              onChange={(event) => {
                setBook(event.target.value);
                setStartChapter(1);
                setEndChapter(1);
              }}
              value={book}
            >
              {CANON.map((item) => (
                <option key={item.book}>{item.book}</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <NumberField label="Start" max={selectedBook?.chapters ?? 1} onChange={setStartChapter} value={startChapter} />
              <NumberField label="End" max={selectedBook?.chapters ?? 1} onChange={setEndChapter} value={endChapter} />
              <NumberField label="Days" max={365} onChange={setDays} value={days} />
            </div>
            <button className="rounded-full bg-[var(--ink)] px-3 py-2 text-[length:var(--text-sm)] text-[var(--paper)]" type="submit">
              Start custom plan
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function NumberField({
  label,
  max,
  value,
  onChange,
}: {
  label: string;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-[length:var(--text-xs)] text-[var(--mute)]">
      {label}
      <input
        className="mt-1 w-full rounded-xl border border-[var(--line)] bg-transparent px-2 py-2 text-[length:var(--text-sm)] text-[var(--ink)]"
        max={max}
        min={1}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}
