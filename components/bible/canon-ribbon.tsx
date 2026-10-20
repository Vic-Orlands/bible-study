"use client";

import { useEffect, useRef, useState } from "react";
import { ChapterTick, tickKey } from "@/lib/chapter-ticks";

export function CanonRibbon({
  ticks,
  activeBook,
  activeChapter,
  opened,
  noted,
  onOpen,
}: {
  ticks: ChapterTick[];
  activeBook: string;
  activeChapter: number;
  opened: Set<string>;
  noted: Set<string>;
  onOpen: (tick: ChapterTick) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const [label, setLabel] = useState<{ tick: ChapterTick; x: number } | null>(null);
  const stateRef = useRef({ ticks, activeBook, activeChapter, opened, noted });
  stateRef.current = { ticks, activeBook, activeChapter, opened, noted };

  const draw = () => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const { ticks: chapterTicks, activeBook: book, activeChapter: chapter, opened: read, noted: marks } =
      stateRef.current;
    const width = wrap.clientWidth;
    const height = 64;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext("2d");
    if (!context || chapterTicks.length === 0) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const styles = getComputedStyle(wrap);
    const ink = styles.getPropertyValue("--ink").trim() || "#161513";
    const line = styles.getPropertyValue("--line").trim() || "#e4dfd6";
    const accent = styles.getPropertyValue("--accent").trim() || "#2f5dff";
    const pointer = pointerRef.current;
    const activeIndex = chapterTicks.findIndex(
      (tick) => tick.book === book && tick.chapter === chapter,
    );
    const activeX =
      activeIndex >= 0 ? ((activeIndex + 0.5) / chapterTicks.length) * width : width / 2;

    chapterTicks.forEach((tick, index) => {
      const x = ((index + 0.5) / chapterTicks.length) * width;
      const dist = pointer == null ? Math.abs(x - activeX) : Math.abs(x - pointer);
      const mag = Math.max(0, 1 - dist / 78);
      const bar = 7 + mag * mag * 32;
      const key = tickKey(tick.book, tick.chapter);
      const current = tick.book === book && tick.chapter === chapter;
      context.globalAlpha = current ? 1 : read.has(key) ? 0.9 : 0.45;
      context.strokeStyle = current ? accent : read.has(key) ? ink : line;
      context.lineWidth = mag > 0.55 ? 1.5 : 1;
      context.beginPath();
      context.moveTo(x, height - 10);
      context.lineTo(x, height - 10 - bar);
      context.stroke();
      if (marks.has(key)) {
        context.globalAlpha = 1;
        context.fillStyle = accent;
        context.beginPath();
        context.arc(x, height - 12 - bar, 1.6, 0, Math.PI * 2);
        context.fill();
      }
    });
  };

  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    drawRef.current();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(() => drawRef.current());
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [activeBook, activeChapter, noted, opened, ticks]);

  const tickAt = (clientX: number) => {
    const wrap = wrapRef.current;
    const chapterTicks = stateRef.current.ticks;
    if (!wrap || chapterTicks.length === 0) return null;
    const rect = wrap.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const index = Math.min(
      chapterTicks.length - 1,
      Math.max(0, Math.floor((x / rect.width) * chapterTicks.length)),
    );
    pointerRef.current = x;
    const tick = chapterTicks[index];
    setLabel({ tick, x });
    draw();
    return tick;
  };

  return (
    <div className="relative border-t border-[var(--line)] bg-[var(--sheet)] px-3 pb-2 pt-1" ref={wrapRef}>
      <canvas
        aria-label="Chapter ribbon"
        className="block w-full touch-none"
        onPointerCancel={() => {
          draggingRef.current = false;
          pointerRef.current = null;
          setLabel(null);
          draw();
        }}
        onPointerDown={(event) => {
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          tickAt(event.clientX);
        }}
        onPointerLeave={() => {
          if (draggingRef.current) return;
          pointerRef.current = null;
          setLabel(null);
          draw();
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current && event.buttons === 0) {
            tickAt(event.clientX);
            return;
          }
          if (draggingRef.current) tickAt(event.clientX);
        }}
        onPointerUp={(event) => {
          const tick = tickAt(event.clientX);
          const shouldOpen = draggingRef.current;
          draggingRef.current = false;
          pointerRef.current = null;
          setLabel(null);
          draw();
          if (shouldOpen && tick) onOpen(tick);
        }}
        ref={canvasRef}
      />
      {label ? (
        <div
          className="pointer-events-none absolute top-1 text-[length:var(--text-sm)] font-medium"
          style={{ left: label.x, transform: "translateX(-50%)" }}
        >
          {label.tick.book} {label.tick.chapter}
        </div>
      ) : (
        <p className="pointer-events-none absolute left-3 top-1 text-[length:var(--text-xs)] text-[var(--mute)]">
          {ticks.length} chapters
        </p>
      )}
    </div>
  );
}
