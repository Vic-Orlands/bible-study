"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { metaFor } from "@/lib/book-meta";
import { ChapterTick, tickKey } from "@/lib/chapter-ticks";

const FIRST_LINES: Record<string, string> = {
  "Genesis 1": "In the beginning God created the heaven and the earth.",
  "Psalms 1": "Blessed is the man that walketh not in the counsel of the ungodly …",
  "Psalms 23": "The LORD is my shepherd; I shall not want.",
  "Proverbs 1": "The proverbs of Solomon the son of David, king of Israel;",
  "Isaiah 53": "Who hath believed our report? and to whom is the arm of the LORD revealed?",
  "Matthew 1": "The book of the generation of Jesus Christ, the son of David …",
  "Mark 1": "The beginning of the gospel of Jesus Christ, the Son of God;",
  "John 1": "In the beginning was the Word, and the Word was with God …",
  "Romans 8": "There is therefore now no condemnation to them which are in Christ Jesus …",
  "Revelation 1": "The Revelation of Jesus Christ, which God gave unto him …",
  "Exodus 3": "Now Moses kept the flock of Jethro his father in law …",
};

function fish(x: number, center: number, radius: number, depth: number) {
  const delta = x - center;
  const distance = Math.abs(delta);
  if (distance >= radius || depth <= 0) return x;
  const ratio = distance / radius;
  return center + Math.sign(delta) * radius * (((depth + 1) * ratio) / (depth * ratio + 1));
}

function easeOut(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return 1 - (1 - t) ** 3;
}

function seg(value: number, start: number, end: number) {
  return Math.min(1, Math.max(0, (value - start) / (end - start)));
}

type Hover = {
  book: string;
  chapter: number;
  genre: string;
  total: number;
  read: boolean;
  note: boolean;
  x: number;
};

export function CanonRibbon({
  ticks,
  activeBook,
  activeChapter,
  opened,
  noted,
  mobile,
  preview,
  onOpen,
  onScrub,
}: {
  ticks: ChapterTick[];
  activeBook: string;
  activeChapter: number;
  opened: Set<string>;
  noted: Set<string>;
  mobile: boolean;
  preview?: (book: string, chapter: number) => string;
  onOpen: (tick: ChapterTick) => void;
  onScrub?: () => void;
}) {
  const ribRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const expRef = useRef(0);
  const cxRef = useRef<number | null>(null);
  const dragRef = useRef(false);
  const frameRef = useRef(0);
  const hoverRef = useRef<Hover | null>(null);
  const stateRef = useRef({ ticks, activeBook, activeChapter, opened, noted, mobile, preview });
  stateRef.current = { ticks, activeBook, activeChapter, opened, noted, mobile, preview };
  const [exp, setExp] = useState(0);
  const [hover, setHover] = useState<Hover | null>(null);
  const [place, setPlace] = useState({ name: 40, info: 48 });

  const draw = () => {
    const rib = ribRef.current;
    const canvas = canvasRef.current;
    if (!rib || !canvas) return;
    const { ticks: chapters, activeBook: book, activeChapter: chapter, opened: read, noted: marks, mobile: compact } =
      stateRef.current;
    const width = rib.clientWidth;
    const height = rib.clientHeight;
    if (width < 2 || height < 2) return;
    const dpr = 2;
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const styles = getComputedStyle(document.documentElement);
    const ink = styles.getPropertyValue("--ink").trim();
    const accent = styles.getPropertyValue("--acc").trim();
    const mute = styles.getPropertyValue("--mute").trim();
    const family = getComputedStyle(document.body).fontFamily;
    const count = chapters.length;
    if (count === 0) return;
    const pad = compact ? 20 : 40;
    const span = width - pad * 2;
    const expanded = expRef.current;
    const base = compact ? height - 40 : height - 34;
    const center = cxRef.current == null ? -9999 : cxRef.current;
    const radius = compact ? 120 : 170;
    const depth = expanded * (compact ? 16 : 6);
    const xs = chapters.map((_, index) => fish(pad + ((index + 0.5) / count) * span, center, radius, depth));
    let nearest = -1;
    let best = 1e9;
    if (expanded > 0.05) {
      xs.forEach((x, index) => {
        const distance = Math.abs(x - center);
        if (distance < best) {
          best = distance;
          nearest = index;
        }
      });
    }
    const active = chapters.findIndex((tick) => tick.book === book && tick.chapter === chapter);
    if (!compact) {
      context.font = `500 10px ${family}`;
      context.letterSpacing = "1.4px";
      let last = "";
      chapters.forEach((tick, index) => {
        const genre = metaFor(tick.book).genre;
        if (genre === last) return;
        last = genre;
        if (genre === "Acts") return;
        const label = genre === "Prophecy" ? "REV" : genre.toUpperCase();
        context.fillStyle = mute;
        context.globalAlpha = 0.9 * (1 - expanded);
        context.textAlign = "left";
        context.fillText(label, xs[index] + 6, base - 38);
        context.globalAlpha = 0.7 * (1 - expanded);
        context.fillRect(xs[index], base - 47, 1, 12);
      });
      context.globalAlpha = 1;
      context.letterSpacing = "0px";
    }
    for (let index = 0; index < count; index += 1) {
      const tick = chapters[index];
      const x = xs[index];
      const gap = index < count - 1 ? xs[index + 1] - x : x - xs[index - 1];
      const magnitude = gap / (span / count);
      const first = tick.chapter === 1;
      const openedChapter = read.has(tickKey(tick.book, tick.chapter));
      let bar = (first ? (compact ? 16 : 19) : compact ? 10 : 12) * (1 + expanded * 0.9) * (1 + (magnitude - 1) * 0.18);
      let thickness = Math.max(compact ? 0.5 : 0.7, Math.min(gap * 0.42, 4));
      let color = ink;
      let alpha = openedChapter ? (compact ? 0.42 : 0.66) : compact ? 0.1 : 0.15;
      if (compact && first) alpha += 0.25;
      if (index === active) {
        color = accent;
        alpha = 1;
        bar = (compact ? 24 : 30) * (1 + expanded * 0.6);
        thickness = Math.max(thickness, 2);
      }
      if (index === nearest) {
        color = accent;
        alpha = 1;
        bar += 10 * expanded;
      }
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.beginPath();
      context.roundRect(x - thickness / 2, base - bar, thickness, bar, Math.min(thickness / 2, 1.5));
      context.fill();
      if (marks.has(tickKey(tick.book, tick.chapter))) {
        context.globalAlpha = 0.9;
        context.fillStyle = accent;
        context.beginPath();
        context.arc(x, base - bar - 4 - expanded * 3, compact ? 1.1 : 1.3, 0, Math.PI * 2);
        context.fill();
      }
      const room = compact ? 2.6 : 3.5;
      const numbered =
        expanded > 0.3 &&
        gap > room &&
        ((tick.chapter % 5 === 0 && !(chapters[index + 1]?.chapter === 1) && tick.chapter > 2) || (first && gap > room));
      if (numbered) {
        context.globalAlpha = ((expanded - 0.3) / 0.7) * 0.9;
        context.fillStyle = first ? ink : mute;
        context.font = `${first ? 600 : 400} ${compact ? 9 : 10}px ${family}`;
        context.textAlign = "center";
        context.fillText(first ? metaFor(tick.book).abbr : String(tick.chapter), x, base + 14);
        context.textAlign = "left";
      }
    }
    context.globalAlpha = 1;
    if (active >= 0) {
      const x = xs[active];
      context.font = `500 ${compact ? 10.5 : 11.5}px ${family}`;
      context.fillStyle = accent;
      context.globalAlpha = 1 - expanded;
      context.textAlign = "left";
      context.fillText(`${book} ${chapter}`, x + 7, base - (compact ? 18 : 22));
      context.beginPath();
      context.arc(x, base - (compact ? 27 : 33), 2.4, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
    const next = nearest >= 0 ? chapters[nearest] : null;
    const nextHover = next
      ? {
          book: next.book,
          chapter: next.chapter,
          genre: metaFor(next.book).genre,
          total: metaFor(next.book).chapters,
          read: read.has(tickKey(next.book, next.chapter)),
          note: marks.has(tickKey(next.book, next.chapter)),
          x: xs[nearest],
        }
      : null;
    hoverRef.current = nextHover;
    setHover((current) => {
      if (!nextHover && !current) return current;
      if (
        current &&
        nextHover &&
        current.book === nextHover.book &&
        current.chapter === nextHover.chapter &&
        Math.abs(current.x - nextHover.x) < 0.5
      ) {
        return current;
      }
      return nextHover;
    });
  };
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    drawRef.current();
    const rib = ribRef.current;
    if (!rib) return;
    const observer = new ResizeObserver(() => drawRef.current());
    observer.observe(rib);
    return () => observer.disconnect();
  }, [ticks, activeBook, activeChapter, opened, noted, mobile, exp]);

  useEffect(() => {
    const name = nameRef.current;
    const info = infoRef.current;
    const rib = ribRef.current;
    if (!hover || !name || !info || !rib) return;
    const width = rib.clientWidth;
    const nameWidth = name.offsetWidth;
    const left = mobile ? (width - nameWidth) / 2 : Math.min(Math.max(hover.x - nameWidth * 0.28, 40), width - 40 - nameWidth);
    setPlace({ name: left, info: mobile ? (width - info.offsetWidth) / 2 : left + 8 });
  }, [hover, mobile, exp]);

  const animate = (target: number) => {
    cancelAnimationFrame(frameRef.current);
    const start = expRef.current;
    const began = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - began) / 280);
      expRef.current = start + (target - start) * easeOut(progress);
      setExp(expRef.current);
      draw();
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  };

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = ribRef.current?.getBoundingClientRect();
    return rect ? event.clientX - rect.left : 0;
  };

  const readCount = ticks.reduce(
    (count, tick) => count + (opened.has(tickKey(tick.book, tick.chapter)) ? 1 : 0),
    0,
  );
  const quote = hover
    ? preview?.(hover.book, hover.chapter) ||
      (FIRST_LINES[`${hover.book} ${hover.chapter}`]
        ? `“${FIRST_LINES[`${hover.book} ${hover.chapter}`]}”`
        : "")
    : "";

  return (
    <>
      <div className="dim" style={{ opacity: 0.95 * easeOut(exp) }} />
      <div className="scr" style={{ bottom: 0, opacity: easeOut(seg(exp, 0.25, 1)) }}>
        {hover ? (
          <>
            <div className="nm" ref={nameRef} style={{ left: place.name, bottom: mobile ? 150 : 156 }}>
              {hover.book}
              <i>{hover.chapter}</i>
            </div>
            <div className="inf" ref={infoRef} style={{ left: place.info, bottom: mobile ? 118 : 120 }}>
              <span>
                <b>{hover.genre}</b>
              </span>
              <span>
                Chapter {hover.chapter} of {hover.total}
              </span>
              <span>{hover.read ? "Read" : "Not yet read"}</span>
              {hover.note ? <span style={{ color: "var(--acc)" }}>● Your note</span> : null}
            </div>
            <div className="pv" style={{ left: place.name + (mobile ? 4 : 8), bottom: mobile ? 250 : 330 }}>
              {quote}
            </div>
          </>
        ) : null}
      </div>
      <div className="rib" ref={ribRef} style={{ height: (mobile ? 92 : 96) + exp * 150 }}>
        <canvas
          ref={canvasRef}
          onPointerDown={(event) => {
            dragRef.current = true;
            onScrub?.();
            cxRef.current = point(event);
            event.currentTarget.setPointerCapture(event.pointerId);
            animate(1);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            cxRef.current = point(event);
            draw();
          }}
          onPointerUp={(event) => {
            if (!dragRef.current) return;
            dragRef.current = false;
            cxRef.current = point(event);
            draw();
            const current = hoverRef.current;
            const tick = current
              ? ticks.find((item) => item.book === current.book && item.chapter === current.chapter) ?? null
              : null;
            animate(0);
            if (tick) onOpen(tick);
          }}
          onPointerCancel={() => {
            dragRef.current = false;
            animate(0);
          }}
        />
        {mobile ? null : (
          <>
            <span className="rl">
              <b>{readCount.toLocaleString("en-US")}</b> of {ticks.length.toLocaleString("en-US")} chapters read
            </span>
            <span className="rr">
              Drag to travel · <span className="kbd">R</span>
            </span>
          </>
        )}
      </div>
    </>
  );
}
