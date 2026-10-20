"use client";

import { RefObject, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { CrossReference } from "@/lib/scripture";
import { referenceRelation } from "@/lib/reference-relation";

type Point = { x: number; y: number };

export function ThreadWires({
  rootRef,
  sourceBook,
  verse,
  references,
  onOpen,
  overlay = false,
}: {
  rootRef: RefObject<HTMLElement | null>;
  sourceBook: string;
  verse: number | null;
  references: CrossReference[];
  onOpen: (target: string) => void;
  overlay?: boolean;
}) {
  const reduce = useReducedMotion();
  const related = references.filter((reference) => reference.sourceVerse === verse).slice(0, 4);
  const primary = related.slice(0, 2);
  const secondary = related.slice(2);
  const signature = related.map((reference) => `${reference.target}:${reference.text}`).join("|");
  const referencesRef = useRef(references);
  referencesRef.current = references;
  const [paths, setPaths] = useState<{ d: string; label: string; x: number; y: number }[]>([]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const current = referencesRef.current
      .filter((reference) => reference.sourceVerse === verse)
      .slice(0, 4);
    const primaryRefs = current.slice(0, 2);
    const secondaryRefs = current.slice(2);
    if (!root || verse == null) {
      setPaths([]);
      return;
    }
    const measure = () => {
      const rootBox = root.getBoundingClientRect();
      const source = visibleElement(root, `[data-verse-anchor="${verse}"]`);
      if (!source) return;
      const sourceBox = source.getBoundingClientRect();
      const start = {
        x: sourceBox.right - rootBox.left,
        y: sourceBox.top - rootBox.top + sourceBox.height / 2,
      };
      const next = primaryRefs.flatMap((reference, index) => {
        const card = visibleElement(root, `[data-thread-card="${index}"]`);
        if (!card) return [];
        const box = card.getBoundingClientRect();
        const end = {
          x: box.left - rootBox.left,
          y: box.top - rootBox.top + 22,
        };
        return [
          {
            d: curve(start, end),
            label: referenceRelation(sourceBook, reference.target, reference.text),
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2 - 8,
          },
        ];
      });
      secondaryRefs.forEach((reference, index) => {
        const from = visibleElement(root, `[data-thread-card="${index}"]`);
        const card = visibleElement(root, `[data-thread-card="s${index}"]`);
        if (!from || !card) return;
        const fromBox = from.getBoundingClientRect();
        const box = card.getBoundingClientRect();
        const startPoint = {
          x: fromBox.left - rootBox.left + 28,
          y: fromBox.bottom - rootBox.top,
        };
        const end = {
          x: box.left - rootBox.left,
          y: box.top - rootBox.top + 18,
        };
        next.push({
          d: curve(startPoint, end),
          label: referenceRelation(sourceBook, reference.target, reference.text),
          x: (startPoint.x + end.x) / 2,
          y: (startPoint.y + end.y) / 2,
        });
      });
      setPaths(next);
    };
    measure();
    const scroller = root.closest(".reader-scroll");
    scroller?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      scroller?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [rootRef, signature, sourceBook, verse]);

  if (verse == null) return null;

  const wires = (
      <svg className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible lg:block" data-thread-svg>
        {paths.map((path, index) => (
          <g key={`${path.d}-${index}`}>
            <motion.path
              d={path.d}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1}
              initial={reduce ? undefined : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.75, delay: index * 0.15, ease: "easeInOut" }}
            />
            <motion.circle
              r="2.2"
              fill="var(--accent)"
              style={{ offsetPath: `path('${path.d}')` }}
              initial={reduce ? undefined : { offsetDistance: "0%" }}
              animate={reduce ? undefined : { offsetDistance: "100%" }}
              transition={{ duration: 0.75, delay: index * 0.15, ease: "easeInOut" }}
            />
            <text
              fill="var(--accent)"
              fontSize="12"
              x={path.x}
              y={path.y}
            >
              {path.label}
            </text>
          </g>
        ))}
      </svg>
  );

  return (
    <>
      {overlay && rootRef.current ? createPortal(wires, rootRef.current) : null}
      <div className="relative hidden min-h-full flex-col gap-3 pt-8 lg:flex">
        {primary.map((reference, index) => (
          <button
            className="rounded-2xl border border-[var(--line)] bg-[var(--sheet)] px-3 py-3 text-left"
            data-thread-card={index}
            key={reference.target}
            onClick={() => onOpen(reference.target)}
            type="button"
          >
            <span className="text-[length:var(--text-xs)] text-[var(--accent)]">
              {referenceRelation(sourceBook, reference.target, reference.text)}
            </span>
            <span className="mt-1 block text-[length:var(--text-sm)] font-medium">{reference.target}</span>
          </button>
        ))}
        {secondary.map((reference, index) => (
          <button
            className="ml-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-left"
            data-thread-card={`s${index}`}
            key={reference.target}
            onClick={() => onOpen(reference.target)}
            type="button"
          >
            <span className="text-[length:var(--text-xs)] text-[var(--accent)]">
              {referenceRelation(sourceBook, reference.target, reference.text)}
            </span>
            <span className="mt-1 block text-[length:var(--text-sm)]">{reference.target}</span>
          </button>
        ))}
      </div>
      <div className="thread-only mt-4 space-y-2 lg:hidden">
        {related.map((reference) => (
          <button
            className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--sheet)] px-3 py-2 text-left"
            key={`m-${reference.target}`}
            onClick={() => onOpen(reference.target)}
            type="button"
          >
            <span className="h-8 w-px bg-[var(--accent)]" />
            <span>
              <span className="block text-[length:var(--text-xs)] text-[var(--accent)]">
                {referenceRelation(sourceBook, reference.target, reference.text)}
              </span>
              <span className="block text-[length:var(--text-sm)]">{reference.target}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function visibleElement(root: HTMLElement, selector: string) {
  return [...root.querySelectorAll(selector)].find((element) => element.getClientRects().length > 0) ?? null;
}

function curve(start: Point, end: Point) {
  const mid = start.x + (end.x - start.x) * 0.55;
  return `M ${start.x} ${start.y} C ${mid} ${start.y}, ${mid} ${end.y}, ${end.x} ${end.y}`;
}
