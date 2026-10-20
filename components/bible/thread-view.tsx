"use client";

import { RefObject, useLayoutEffect, useMemo, useState } from "react";
import { DiffSpans } from "@/components/bible/diff-spans";
import { Icon } from "@/components/bible/icons";
import { MoreMenu } from "@/components/bible/more-menu";
import { ReaderColumn, ReaderVersion } from "@/components/bible/canon-view";
import { useCompact } from "@/components/bible/use-compact";
import { bookKick, chapterMark, metaFor, refCategory, refCode, sectionsFor, versionYear } from "@/lib/book-meta";
import { referenceRelation } from "@/lib/reference-relation";
import { BibleVerse, CrossReference } from "@/lib/scripture";
import { changedWordCount, diffWords } from "@/lib/word-diff";

type Side = "primary" | "secondary";
type Wire = { d: string; second: boolean; label: string; x: number; y: number };
type Port = { verse: number; top: number; count: number };

const DIRECT = [
  [70, 40],
  [70, 262],
  [70, 486],
];
const SECOND = [
  [370, 128],
  [370, 350],
];

function rel(node: HTMLElement, root: HTMLElement) {
  const box = node.getBoundingClientRect();
  const frame = root.getBoundingClientRect();
  return {
    x: box.left - frame.left,
    y: box.top - frame.top,
    w: box.width,
    h: box.height,
    r: box.right - frame.left,
    b: box.bottom - frame.top,
  };
}

function point(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }, t: number) {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
}

export function ThreadView({
  rootRef,
  book,
  chapter,
  primary,
  secondary,
  versions,
  compare,
  selected,
  highlighted,
  noteVerse,
  noteDraft,
  crossRefs,
  planLabel,
  menu,
  onSelect,
  onHighlight,
  onNote,
  onSaveNote,
  onDiscuss,
  onOpenReference,
  onCompare,
  onChooseVersion,
  onSwap,
  onMenu,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  book: string;
  chapter: number;
  primary?: ReaderColumn;
  secondary?: ReaderColumn;
  versions: ReaderVersion[];
  compare: boolean;
  selected: number[];
  highlighted: Set<number>;
  noteVerse: number | null;
  noteDraft: string;
  crossRefs: CrossReference[];
  planLabel: string | null;
  menu: Side | null;
  onSelect: (verse: number, shiftKey: boolean) => void;
  onHighlight: (verse: number) => void;
  onNote: (verse: number | null) => void;
  onSaveNote: (verse: number, content: string, type: "observation" | "interpretation" | "application") => Promise<void>;
  onDiscuss: (verse: number) => void;
  onOpenReference: (target: string) => void;
  onCompare: (on: boolean) => void;
  onChooseVersion: (id: string, side: Side) => void;
  onSwap: () => void;
  onMenu: (menu: Side | null) => void;
}) {
  const compact = useCompact();
  const [more, setMore] = useState(false);
  const [threadOn, setThreadOn] = useState(false);
  const [draft, setDraft] = useState(noteDraft);
  const [noteType, setNoteType] = useState<"observation" | "interpretation" | "application">("observation");
  const [ports, setPorts] = useState<Port[]>([]);
  const [tools, setTools] = useState<{ left: number; top: number } | null>(null);
  const [wires, setWires] = useState<Wire[]>([]);
  const [menuBox, setMenuBox] = useState<{ left: number; top: number } | null>(null);
  const [page, setPage] = useState(0);
  const [hot, setHot] = useState<number | null>(null);
  const [lit, setLit] = useState<{ verse: number; index: number; left: string; right: string; x: number; y: number } | null>(null);
  const active = selected[selected.length - 1] ?? null;
  const sections = sectionsFor(book, chapter);
  const abbr = metaFor(book).abbr;
  const shown = threadOn && active != null && !compare;
  const direct = crossRefs.filter((reference) => reference.sourceVerse === active).slice(0, 3);
  const second = crossRefs.filter((reference) => reference.sourceVerse === active).slice(3, 5);
  const verseCount = primary?.verses.length ?? 0;
  const minutes = Math.max(
    1,
    Math.round(
      (primary?.verses ?? []).reduce((sum, verse) => sum + verse.text.split(/\s+/).filter(Boolean).length, 0) / 180,
    ),
  );
  const threadCount = useMemo(() => new Set(crossRefs.map((reference) => reference.sourceVerse).filter((verse) => verse != null)).size, [crossRefs]);

  useLayoutEffect(() => {
    setDraft(noteDraft);
  }, [noteDraft, noteVerse]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const sheet = root?.querySelector<HTMLElement>(".sheet");
    if (!root || !sheet || compare) {
      setPorts([]);
      setTools(null);
      return;
    }
    const counts = new Map<number, number>();
    for (const reference of crossRefs) {
      if (reference.sourceVerse == null) continue;
      counts.set(reference.sourceVerse, (counts.get(reference.sourceVerse) ?? 0) + 1);
    }
    const next: Port[] = [];
    let last = -99;
    const sheetBox = sheet.getBoundingClientRect();
    for (const [verse, count] of [...counts.entries()].sort((a, b) => a[0] - b[0])) {
      const node = root.querySelector<HTMLElement>(`.v[data-verse="${verse}"]`);
      const rect = node?.getClientRects()[node.getClientRects().length - 1];
      if (!rect) continue;
      const y = (rect.top + rect.bottom) / 2 - sheetBox.top - 8;
      if (Math.abs(y - last) < 10) continue;
      last = y;
      next.push({ verse, top: y, count });
    }
    setPorts(next);
    if (active == null) {
      setTools(null);
      return;
    }
    const verse = root.querySelector<HTMLElement>(`.v[data-verse="${active}"]`);
    const rect = verse?.getClientRects()[0];
    if (!rect) return;
    const frame = root.getBoundingClientRect();
    setTools({ left: rect.left - frame.left, top: rect.top - frame.top - 46 });
  }, [active, compare, crossRefs, compact, primary?.verses, rootRef, shown]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !shown) {
      setWires([]);
      return;
    }
    const port = root.querySelector<HTMLElement>(".port.on");
    if (!port) {
      setWires([]);
      return;
    }
    const origin = rel(port, root);
    const px = origin.r - 3.5;
    const py = origin.y + origin.h / 2;
    const next: Wire[] = [];
    if (compact) {
      const tray = root.querySelector<HTMLElement>(".tray");
      if (!tray) return;
      const trayBox = rel(tray, root);
      root.querySelectorAll<HTMLElement>(".tray .card").forEach((card) => {
        const cardBox = rel(card, root);
        const cx = cardBox.x + 20;
        const cy = cardBox.y;
        next.push({
          second: false,
          label: "",
          x: 0,
          y: 0,
          d: `M${px} ${py} C${px} ${py + 60} ${px + 4} ${trayBox.y - 30} ${px} ${trayBox.y + 8} L${px} ${trayBox.y + 18} Q${px} ${trayBox.y + 26} ${px - 8} ${trayBox.y + 26} L${cx + 8} ${trayBox.y + 26} Q${cx} ${trayBox.y + 26} ${cx} ${trayBox.y + 34} L${cx} ${cy}`,
        });
      });
      setWires(next);
      return;
    }
    root.querySelectorAll<HTMLElement>(".field .card").forEach((card) => {
      const cardBox = rel(card, root);
      const tx = cardBox.x - 1;
      const ty = cardBox.y + 19.5;
      const order = card.dataset.order;
      if (card.classList.contains("o2") && order) {
        const parent = root.querySelector<HTMLElement>(`.field .card[data-direct="${card.dataset.from}"]`);
        if (!parent) return;
        const from = rel(parent, root);
        const sx = from.r;
        const sy = from.y + 19.5;
        const mx = (sx + tx) / 2;
        const labelAt = point({ x: sx, y: sy }, { x: mx, y: sy }, { x: mx, y: ty }, { x: tx, y: ty }, 0.5);
        next.push({ d: `M${sx} ${sy} C${mx} ${sy} ${mx} ${ty} ${tx} ${ty}`, second: true, label: card.dataset.relation ?? "", x: labelAt.x, y: labelAt.y });
        return;
      }
      const mx = px + (tx - px) * 0.55;
      const c1 = { x: mx, y: py };
      const c2 = { x: tx - (tx - px) * 0.45, y: ty };
      const labelAt = point({ x: px, y: py }, c1, c2, { x: tx, y: ty }, 0.7);
      next.push({
        d: `M${px} ${py} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${tx} ${ty}`,
        second: false,
        label: card.dataset.relation ?? "",
        x: labelAt.x,
        y: labelAt.y,
      });
    });
    setWires(next);
  }, [shown, ports, compact, direct.length, second.length, noteVerse, rootRef]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const anchor = root?.querySelector<HTMLElement>(".pk.open");
    if (!root || !anchor || menu !== "secondary") {
      setMenuBox(null);
      return;
    }
    const box = rel(anchor, root);
    setMenuBox({ left: box.x, top: box.b + 8 });
  }, [menu, compare, rootRef, secondary?.id]);

  const rows = useMemo(() => {
    if (!primary || !secondary) return [];
    return primary.verses.map((verse) => {
      const other = secondary.verses.find((item) => item.number === verse.number);
      const diff = diffWords(verse.text, other?.text ?? "");
      const changed = other ? changedWordCount(verse.text, other.text) + changedWordCount(other.text, verse.text) : 0;
      return { verse, diff, changed };
    });
  }, [primary, secondary]);
  const paired = rows.filter((row) => secondary?.verses.some((verse) => verse.number === row.verse.number));
  const identical = paired.filter((row) => row.changed === 0).length;
  const match = paired.length === 0 ? 0 : Math.round((identical / paired.length) * 100);

  const blocks = (verses: BibleVerse[]) => {
    const groups: { title: string | null; verses: BibleVerse[] }[] = [];
    for (const verse of verses) {
      const title = sections.find((section) => section.from === verse.number)?.title ?? null;
      if (title || groups.length === 0) groups.push({ title, verses: [verse] });
      else groups[groups.length - 1].verses.push(verse);
    }
    return groups;
  };

  const paragraph = (verses: BibleVerse[]) => {
    const chunks: { title: string | null; verses: BibleVerse[] }[] = [];
    let current: BibleVerse[] = [];
    let title: string | null = null;
    const flush = () => {
      if (current.length === 0) return;
      chunks.push({ title, verses: current });
      current = [];
      title = null;
    };
    for (const verse of verses) {
      const section = sections.find((item) => item.from === verse.number);
      if (section) {
        flush();
        title = section.title;
      }
      current.push(verse);
      if (verse.number === 5 || verse.number === 9) flush();
    }
    flush();
    return chunks;
  };

  const card = (reference: CrossReference, index: number, order: "direct" | "second") => {
    const relation = referenceRelation(book, reference.target, reference.text, order === "second");
    return (
      <button
        className={order === "second" ? "card o2" : "card"}
        data-direct={order === "direct" ? index : undefined}
        data-from={order === "second" ? index % Math.max(direct.length, 1) : undefined}
        data-order={order}
        data-relation={relation}
        key={`${order}-${reference.target}`}
        onClick={() => onOpenReference(reference.target)}
        style={
          compact
            ? { left: 18 + index * 250, position: "absolute" }
            : {
                left: (order === "direct" ? DIRECT : SECOND)[index]?.[0],
                top: (order === "direct" ? DIRECT : SECOND)[index]?.[1],
              }
        }
        type="button"
      >
        <div className="ch">
          <span>{refCode(reference.target)}</span>
          <span>{compact ? relation : refCategory(reference.target)}</span>
        </div>
        <p>{reference.text}</p>
        {order === "direct" && !compact ? (
          <div className="cf">
            <span>Open ↗</span>
            <span>Pin</span>
          </div>
        ) : null}
      </button>
    );
  };

  return (
    <div className={`reader-root thread-root${compact ? " mobile" : ""}`} ref={rootRef}>
      <div className="bar">
        <div className="crumb">
          <button aria-label="More" className="logo" onClick={() => setMore((open) => !open)} type="button" />
          {compact ? null : (
            <>
              <span>Scripture</span>
              <i>/</i>
            </>
          )}
          <span>{book}</span>
          <i>/</i>
          <span>{String(chapter).padStart(2, "0")}</span>
          <i>/</i>
          <span>{compare && secondary ? `${primary?.abbreviation ?? ""} ⇄ ${secondary.abbreviation}` : primary?.abbreviation}</span>
        </div>
        {compact ? null : (
          <div className="ruler">
            {Array.from({ length: Math.max(verseCount, 1) }, (_, index) => (
              <span className={index + 1 === active ? "on" : index + 1 < (active ?? verseCount) ? "r" : ""} key={index} />
            ))}
          </div>
        )}
        <div className="keys">
          {compact ? (
            <button className="k on" onClick={() => (compare ? onCompare(false) : onCompare(true))} type="button">
              <span className="led" />
              {compare ? "Diff" : "Thread"}
            </button>
          ) : (
            <>
              <button className="k" onClick={() => window.dispatchEvent(new Event("bible-search"))} type="button">
                <b>⌘K</b>Find
              </button>
              <button className={compare ? "k on" : "k"} onClick={() => (compare ? onCompare(false) : onCompare(true))} type="button">
                <b>C</b>Compare
              </button>
              <button
                className={compare ? "k" : "k on"}
                onClick={() => {
                  if (compare) {
                    onCompare(false);
                    return;
                  }
                  if (active != null) setThreadOn((on) => !on);
                }}
                type="button"
              >
                <span className="led" />
                <b>T</b>Thread
              </button>
            </>
          )}
        </div>
      </div>
      {more ? <MoreMenu onClose={() => setMore(false)} /> : null}
      {compare && primary && !compact ? (
        <div className="cmp">
          <div className="hd2">
            <button className="vh" onClick={() => onMenu(menu === "primary" ? null : "primary")} type="button">
              <span className="ab">A</span>
              <span className="nm">{primary.title}</span>
              <span>
                {primary.abbreviation}
                {versionYear(primary.abbreviation) ? ` · ${versionYear(primary.abbreviation)}` : ""}
              </span>
            </button>
            <button className="swp" onClick={onSwap} type="button">
              <span>
                <Icon name="swap" size={14} />
              </span>
              S
            </button>
            <button className={menu === "secondary" ? "vh b pk open" : "vh b"} onClick={() => onMenu(menu === "secondary" ? null : "secondary")} type="button">
              <span className="ab">B</span>
              <span className="nm">{secondary?.title ?? "Choose"}</span>
              <span>
                {secondary
                  ? `${secondary.abbreviation}${versionYear(secondary.abbreviation) ? ` · ${versionYear(secondary.abbreviation)}` : ""}`
                  : "Right side"}{" "}
                ▾
              </span>
            </button>
            <div className="sim">
              Match <b>{match}%</b>
              <span className="m">
                {Array.from({ length: 10 }, (_, index) => (
                  <i className={index < Math.round(match / 10) ? "f" : ""} key={index} />
                ))}
              </span>
              {identical}/{paired.length} identical
            </div>
          </div>
          <div className="rows">
            {blocks(primary.verses).map((group) => (
              <div key={group.title ?? group.verses[0]?.number}>
                {group.title ? (
                  <div className="rsec">
                    <span>{group.title}</span>
                    <span />
                    <span>{group.title}</span>
                  </div>
                ) : null}
                {group.verses.map((verse) => {
                  const row = rows.find((item) => item.verse.number === verse.number);
                  if (!row) return null;
                  return (
                    <div className={hot === verse.number ? "row hot" : "row"} key={verse.number}>
                      <span className="t">
                        <DiffSpans
                          litIndex={lit?.verse === verse.number ? lit.index : null}
                          onEnter={(index, node) => {
                            const pair = row.diff.right.filter((piece) => piece.changed && piece.text.trim())[index];
                            const frame = rootRef.current?.getBoundingClientRect();
                            const box = node.getBoundingClientRect();
                            setHot(verse.number);
                            setLit({
                              verse: verse.number,
                              index,
                              left: node.textContent ?? "",
                              right: pair?.text ?? "",
                              x: frame ? box.right - frame.left : 0,
                              y: frame ? box.bottom - frame.top : 0,
                            });
                          }}
                          onLeave={() => {
                            setHot(null);
                            setLit(null);
                          }}
                          pieces={row.diff.left}
                        />
                      </span>
                      <span className="g">
                        <span>{String(verse.number).padStart(2, "0")}</span>
                        <span className={row.changed ? "dl" : "dl z"}>{row.changed ? `Δ${row.changed}` : "="}</span>
                      </span>
                      <span className="t">
                        <DiffSpans litIndex={lit?.verse === verse.number ? lit.index : null} pieces={row.diff.right} />
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {compare && compact && primary ? (
        <div
          className="sheet"
          onPointerUp={(event) => {
            const start = Number(event.currentTarget.dataset.x ?? event.clientX);
            if (event.clientX - start > 48) setPage(0);
            if (start - event.clientX > 48) setPage(1);
          }}
          onPointerDown={(event) => {
            event.currentTarget.dataset.x = String(event.clientX);
          }}
        >
          <div className="pg" id="pgA" style={{ transform: `translateX(${page === 0 ? "0%" : "-100%"})` }}>
            <div className="hd" style={{ padding: 0, marginBottom: 14 }}>
              <span>
                <b style={{ color: "var(--ink)" }}>A</b> · {primary.title}
              </span>
              <span>{versionYear(primary.abbreviation)}</span>
            </div>
            {primary.verses.map((verse) => {
              const other = secondary?.verses.find((item) => item.number === verse.number);
              const diff = other ? diffWords(verse.text, other.text) : null;
              return (
                <div className="mrow" key={verse.number}>
                  <span className="n">{String(verse.number).padStart(2, "0")}</span>
                  <span>{diff ? <DiffSpans pieces={diff.left} /> : verse.text}</span>
                </div>
              );
            })}
          </div>
          <div className="pg" id="pgB" style={{ transform: `translateX(${page === 1 ? "0%" : "100%"})`, boxShadow: "-1px 0 0 var(--line)" }}>
            <div className="hd" style={{ padding: 0, marginBottom: 14 }}>
              <span>
                <b style={{ color: "var(--acc)" }}>B</b> · {secondary?.title}
              </span>
              <span>{secondary ? versionYear(secondary.abbreviation) : ""}</span>
            </div>
            {(secondary?.verses ?? []).map((verse) => {
              const other = primary.verses.find((item) => item.number === verse.number);
              const diff = other ? diffWords(other.text, verse.text) : null;
              return (
                <div className="mrow" key={verse.number}>
                  <span className="n">{String(verse.number).padStart(2, "0")}</span>
                  <span>{diff ? <DiffSpans pieces={diff.right} /> : verse.text}</span>
                </div>
              );
            })}
          </div>
          {page === 0 && secondary ? (
            <div className="peek">
              <i>{secondary.abbreviation} →</i>
            </div>
          ) : null}
        </div>
      ) : null}
      {!compare ? (
        <div className={`sheet${shown && compact ? " threaded" : ""}`}>
          <div className="hd">
            <span>{bookKick(book)}</span>
            <span>
              {compact
                ? primary?.abbreviation
                : `${(primary?.title ?? "").replace(/ Version$/, "")} · ${versionYear(primary?.abbreviation ?? "") || primary?.abbreviation || ""} · ${active ?? verseCount} of ${verseCount} vv`}
            </span>
          </div>
          <div className="ttl">
            {book} <em>{chapterMark(chapter)}</em>
          </div>
          <div className="txt">
            {primary?.error ? <p>{primary.error}</p> : null}
            {primary?.loading && verseCount === 0 ? <p>Loading…</p> : null}
            {paragraph(primary?.verses ?? []).map((chunk) => (
              <div key={`${chunk.title}-${chunk.verses[0]?.number}`}>
                {chunk.title ? <span className="s">{chunk.title}</span> : null}
                <p>
                  {chunk.verses.map((verse) => (
                    <button
                      className={`v${selected.includes(verse.number) ? " sel" : ""}${highlighted.has(verse.number) ? " mark" : ""}`}
                      data-verse={verse.number}
                      key={verse.number}
                      onClick={(event) => onSelect(verse.number, event.shiftKey)}
                      type="button"
                    >
                      <span className="n">{verse.number}</span>
                      {verse.text}{" "}
                    </button>
                  ))}
                </p>
              </div>
            ))}
          </div>
          <div className="ports">
            {ports.map((port) => (
              <span className={shown && port.verse === active ? "port on" : "port"} key={port.verse} style={{ top: port.top }}>
                {port.count}
              </span>
            ))}
          </div>
          {compact ? null : (
            <div className="foot">
              <span>{planLabel ?? `${bookKick(book)} ${book}`}</span>
              <span>
                {String(minutes).padStart(2, "0")}:00 min
              </span>
            </div>
          )}
        </div>
      ) : null}
      {!compare && !compact ? (
        <div className="field">
          <span className="flabel">{shown ? `Thread · ${abbr} ${String(chapter).padStart(2, "0")}:${String(active).padStart(2, "0")}` : "Field · select a verse to pull its thread"}</span>
          {shown ? direct.map((reference, index) => card(reference, index, "direct")) : null}
          {shown && !noteVerse ? second.map((reference, index) => card(reference, index, "second")) : null}
          <div className="statline">
            {shown ? (
              <>
                <b>{direct.length}</b> direct · <b>{second.length}</b> second-order · depth 2 ·{" "}
                <button onClick={() => setThreadOn(false)} type="button">
                  <b>T</b> to toggle
                </button>
              </>
            ) : (
              <>
                {verseCount} verses · {threadCount} threads in view
              </>
            )}
          </div>
        </div>
      ) : null}
      {shown && compact ? (
        <div className="tray">
          <span className="tl">
            <b>●</b> Thread · {abbr} {String(chapter).padStart(2, "0")}:{String(active).padStart(2, "0")} · {direct.length} direct
          </span>
          {direct.map((reference, index) => card(reference, index, "direct"))}
        </div>
      ) : null}
      {shown ? (
        <svg className="wire">
          {wires.map((wire) => (
            <path className={wire.second ? "o2" : undefined} d={wire.d} key={wire.d} />
          ))}
        </svg>
      ) : null}
      {wires.map((wire) =>
        wire.label ? (
          <span className="tagl" key={`${wire.label}-${wire.x}-${wire.y}`} style={{ left: wire.x, top: wire.y }}>
            {wire.label}
          </span>
        ) : null,
      )}
      {active != null && tools && !shown && !compare ? (
        <div className="tools" style={{ left: tools.left, top: tools.top }}>
          <button className="on" onClick={() => setThreadOn(true)} type="button">
            <b>T</b>Thread
          </button>
          <button onClick={() => onNote(noteVerse === active ? null : active)} type="button">
            <b>N</b>Note
          </button>
          <button onClick={() => active != null && onHighlight(active)} type="button">
            <b>H</b>Mark
          </button>
          <button onClick={() => onCompare(true)} type="button">
            <b>C</b>Compare
          </button>
          <button onClick={() => active != null && onDiscuss(active)} type="button">
            <b>D</b>Discuss
          </button>
        </div>
      ) : null}
      {noteVerse != null && !compare ? (
        <form
          className="note"
          onSubmit={(event) => {
            event.preventDefault();
            void onSaveNote(noteVerse, draft, noteType);
          }}
          style={compact ? undefined : { left: 852, top: 120 }}
        >
          <div className="ch">
            <span>
              <b>●</b> Note · {abbr} {String(chapter).padStart(2, "0")}:{String(noteVerse).padStart(2, "0")}
            </span>
            <button onClick={() => onNote(null)} type="button">
              Close
            </button>
          </div>
          <div className="q">{primary?.verses.find((verse) => verse.number === noteVerse)?.text}</div>
          <textarea aria-label="Note" onChange={(event) => setDraft(event.target.value)} value={draft} />
          <div className="tg">
            {(["observation", "interpretation", "application"] as const).map((type) => (
              <button className={noteType === type ? "on" : ""} key={type} onClick={() => setNoteType(type)} type="button">
                {type}
              </button>
            ))}
            <button className="sv" type="submit">
              Save
            </button>
          </div>
        </form>
      ) : null}
      {menu ? (
        <div className="vmenu" style={menuBox ? { left: menuBox.left, top: menuBox.top } : { right: 36, top: 140 }}>
          {versions.slice(0, 8).map((version, index) => {
            const on = (menu === "primary" ? primary?.id : secondary?.id) === version.id;
            const locked = menu === "secondary" && version.id === primary?.id;
            return (
              <button
                className={locked ? "" : on ? "on" : ""}
                key={version.id}
                onClick={() => {
                  if (locked) return;
                  onChooseVersion(version.id, menu);
                  onMenu(null);
                }}
                type="button"
              >
                <span>{index + 1}</span>
                <b>{version.abbreviation}</b>
                <span>{version.title}</span>
              </button>
            );
          })}
          <div className="ft">Max two · A stays, B swaps</div>
        </div>
      ) : null}
      {compare && compact ? (
        <div className="pager">
          <button className={page === 0 ? "on" : ""} onClick={() => setPage(0)} type="button">
            A · {primary?.abbreviation}
          </button>
          <button aria-label="Swap" onClick={onSwap} type="button">
            <Icon name="swap" size={14} />
          </button>
          <button className={page === 1 ? "onb" : ""} onClick={() => setPage(1)} type="button">
            B · {secondary?.abbreviation}
          </button>
        </div>
      ) : null}
      {lit && compare ? (
        <div className="tipT" style={{ left: lit.x - 20, top: lit.y + 12 }}>
          <span className="o">Diff · {String(lit.verse).padStart(2, "0")} · word</span>
          <div className="p">
            {lit.left} → <em>{lit.right}</em>
          </div>
        </div>
      ) : null}
    </div>
  );
}
