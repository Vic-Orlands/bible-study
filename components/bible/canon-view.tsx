"use client";

import { RefObject, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CanonRibbon } from "@/components/bible/canon-ribbon";
import { DiffSpans } from "@/components/bible/diff-spans";
import { Icon } from "@/components/bible/icons";
import { MoreMenu } from "@/components/bible/more-menu";
import { useCompact } from "@/components/bible/use-compact";
import { bookKick, bookSide, metaFor, sectionsFor, versionYear } from "@/lib/book-meta";
import { ChapterTick } from "@/lib/chapter-ticks";
import { CrossReference, BibleVerse } from "@/lib/scripture";
import { changedWordCount, diffWords } from "@/lib/word-diff";

export type ReaderColumn = {
  id: string;
  abbreviation: string;
  title: string;
  verses: BibleVerse[];
  loading: boolean;
  error: string | null;
};

export type ReaderVersion = { id: string; abbreviation: string; title: string };

type Side = "primary" | "secondary";

export function CanonView({
  rootRef,
  book,
  chapter,
  versesInBook,
  primary,
  secondary,
  versions,
  compare,
  opening,
  selected,
  highlighted,
  noteVerse,
  noteDraft,
  crossRefs,
  ticks,
  opened,
  noted,
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
  onOpenChapter,
  onMenu,
  onClearSelection,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  book: string;
  chapter: number;
  versesInBook: number;
  primary?: ReaderColumn;
  secondary?: ReaderColumn;
  versions: ReaderVersion[];
  compare: boolean;
  opening: boolean;
  selected: number[];
  highlighted: Set<number>;
  noteVerse: number | null;
  noteDraft: string;
  crossRefs: CrossReference[];
  ticks: ChapterTick[];
  opened: Set<string>;
  noted: Set<string>;
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
  onOpenChapter: (book: string, chapter: number) => void;
  onMenu: (menu: Side | null) => void;
  onClearSelection: () => void;
}) {
  const compact = useCompact();
  const pickRef = useRef<HTMLButtonElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [more, setMore] = useState(false);
  const [refsOpen, setRefsOpen] = useState(false);
  const [draft, setDraft] = useState(noteDraft);
  const [mobilePane, setMobilePane] = useState<"a" | "both" | "b">("both");
  const [menuBox, setMenuBox] = useState<{ left: number; top: number } | null>(null);
  const [pill, setPill] = useState<{ left: number; top: number } | null>(null);
  const [hot, setHot] = useState<number | null>(null);
  const [lit, setLit] = useState<{ verse: number; index: number; left: string; right: string; x: number; y: number } | null>(
    null,
  );
  const active = selected[selected.length - 1] ?? null;
  const sections = sectionsFor(book, chapter);
  const wordsLeft = useMemo(() => {
    const verses = primary?.verses ?? [];
    const start = verses.findIndex((verse) => verse.number >= (active ?? 1));
    const slice = start < 0 ? verses : verses.slice(start);
    const words = slice.reduce((sum, verse) => sum + verse.text.split(/\s+/).filter(Boolean).length, 0);
    return Math.max(1, Math.round(words / 180));
  }, [active, primary?.verses]);
  const progress = versesInBook > 0 ? Math.round((chapter / versesInBook) * 100) : 0;
  const firstLine = primary?.verses[0]?.text ?? "";
  const minuteLabel = `${Math.max(1, Math.round(((primary?.verses ?? []).reduce((sum, verse) => sum + verse.text.split(/\s+/).filter(Boolean).length, 0)) / 180))} min`;

  useLayoutEffect(() => {
    setDraft(noteDraft);
  }, [noteDraft, noteVerse]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const anchor = menu === "secondary" ? pickRef.current : menu === "primary" ? primaryRef.current : null;
    if (!root || !anchor) {
      setMenuBox(null);
      return;
    }
    const row = anchor.getBoundingClientRect();
    const frame = root.getBoundingClientRect();
    setMenuBox({ left: row.left - frame.left, top: row.bottom - frame.top + 10 });
  }, [menu, compare, compact, primary?.id, secondary?.id, rootRef]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || compare || opening || active == null) {
      setPill(null);
      return;
    }
    const node = root.querySelector<HTMLElement>(`[data-verse="${active}"]`);
    if (!node) return;
    const row = node.getBoundingClientRect();
    const frame = root.getBoundingClientRect();
    setPill({ left: row.left - frame.left + (compact ? 24 : 80), top: row.bottom - frame.top + 12 });
  }, [active, compare, opening, compact, primary?.verses, rootRef]);

  const rows = useMemo(() => {
    if (!primary || !secondary) return [];
    return primary.verses.map((verse) => {
      const other = secondary.verses.find((item) => item.number === verse.number);
      const diff = diffWords(verse.text, other?.text ?? "");
      return { verse, diff, changed: other ? changedWordCount(verse.text, other.text) : 0 };
    });
  }, [primary, secondary]);
  const identical = rows.filter((row) => row.changed === 0 && secondary?.verses.some((verse) => verse.number === row.verse.number)).length;
  const differed = rows.reduce((sum, row) => sum + row.diff.right.filter((piece) => piece.changed && piece.text.trim()).length, 0);

  const blocks = (verses: BibleVerse[]) => {
    const groups: { title: string | null; verses: BibleVerse[] }[] = [];
    for (const verse of verses) {
      const title = sections.find((section) => section.from === verse.number)?.title ?? null;
      if (title || groups.length === 0) groups.push({ title, verses: [verse] });
      else groups[groups.length - 1].verses.push(verse);
    }
    return groups;
  };

  const showCompare = () => {
    onCompare(true);
    if (!secondary) onMenu("secondary");
  };

  return (
    <div className={`reader-root canon-root${compact ? " mobile" : ""}${compare ? " compare" : ""}${opening ? " opening" : ""}`} ref={rootRef}>
      <div className="top">
        <span className="book">{book}</span>
        <span className="meta">
          <b>{chapter}</b>
          <span>·</span>
          <span>{compare && secondary ? `${primary?.abbreviation ?? ""} / ${secondary.abbreviation}` : primary?.abbreviation ?? ""}</span>
        </span>
        <div className="r">
          {compact ? (
            <>
              <button aria-label="Search" className="ib" onClick={() => window.dispatchEvent(new Event("bible-search"))} type="button">
                <Icon name="search" size={20} />
              </button>
              <button aria-label="Compare" className={compare ? "ib on" : "ib"} onClick={() => (compare ? onCompare(false) : showCompare())} type="button">
                <Icon name="compare" size={18} />
              </button>
            </>
          ) : (
            <>
              <button className={compare ? "btn on" : "btn o"} onClick={() => (compare ? onCompare(false) : showCompare())} type="button">
                <Icon name="compare" size={16} /> Compare
              </button>
              <button aria-label="Search" className="ib" onClick={() => window.dispatchEvent(new Event("bible-search"))} type="button">
                <Icon name="search" size={19} />
              </button>
              <button aria-label="Settings" className="ib" onClick={() => window.dispatchEvent(new Event("bible-settings"))} type="button">
                <Icon name="aa" size={20} />
              </button>
              <button aria-label="More" className="ib" onClick={() => setMore((open) => !open)} type="button">
                <Icon name="more" size={20} />
              </button>
            </>
          )}
        </div>
      </div>
      {more ? <MoreMenu onClose={() => setMore(false)} /> : null}
      {opening ? (
        <div className="op">
          <div className="kick">{bookKick(book)}</div>
          <div className="hero">
            <span className="book">{book}</span>
            <span className="chn">{chapter}</span>
          </div>
          <div className="first">{firstLine}</div>
          <div className="facts">
            <span>
              <b>{primary?.verses.length ?? 0}</b> verses
            </span>
            <span>
              <b>{minuteLabel.replace(" min", "")}</b> min
            </span>
            <span>{planLabel ?? `${metaFor(book).genre} · chapter ${chapter} of ${versesInBook}`}</span>
          </div>
        </div>
      ) : null}
      <div className="rd">
        {compare && compact ? (
          <>
            <div className="seg">
              <div className="seg3">
                <span className="th" style={{ transform: `translateX(${mobilePane === "a" ? "0%" : mobilePane === "both" ? "100%" : "200%"})` }} />
                <button className={mobilePane === "a" ? "" : "m"} onClick={() => setMobilePane("a")} type="button">
                  {primary?.abbreviation}
                </button>
                <button className={mobilePane === "both" ? "" : "m"} onClick={() => setMobilePane("both")} type="button">
                  Both
                </button>
                <button className={mobilePane === "b" ? "" : "m"} onClick={() => { setMobilePane("b"); onMenu("secondary"); }} type="button">
                  {secondary?.abbreviation ?? "B"}
                </button>
              </div>
            </div>
            <div className="col">
              {(mobilePane === "b" ? secondary?.verses ?? [] : primary?.verses ?? []).length === 0 ? (
                <p className="sec">{primary?.loading ? "Loading…" : primary?.error ?? "No text"}</p>
              ) : (
                blocks(mobilePane === "b" ? secondary?.verses ?? [] : primary?.verses ?? []).map((group) => (
                  <div key={group.title ?? group.verses[0]?.number}>
                    {group.title ? <div className="sec">{group.title}</div> : null}
                    {group.verses.map((verse) => {
                      const other = (mobilePane === "b" ? primary : secondary)?.verses.find((item) => item.number === verse.number);
                      const diff = other ? diffWords(mobilePane === "b" ? other.text : verse.text, mobilePane === "b" ? verse.text : other.text) : null;
                      return (
                        <button className={hot === verse.number ? "vr sel" : "vr"} data-verse={verse.number} key={verse.number} onClick={(event) => onSelect(verse.number, event.shiftKey)} type="button">
                          <span className="n">{verse.number}</span>
                          <span className="t">
                            {diff && mobilePane === "both" ? <DiffSpans pieces={diff.left} /> : verse.text}
                            {diff && mobilePane === "both" ? (
                              <span className="t2">
                                <span className="tag">{secondary?.abbreviation}</span>
                                <DiffSpans pieces={diff.right} />
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
        {compare && !compact && primary ? (
          <div className="cmp">
            <div className="ch">
              <button className="vn" onClick={() => onMenu(menu === "primary" ? null : "primary")} ref={primaryRef} type="button">
                <span className="nm">{primary.title}</span>
                <span className="yr">
                  {primary.abbreviation}
                  {versionYear(primary.abbreviation) ? ` · ${versionYear(primary.abbreviation)}` : ""}
                </span>
              </button>
              <button aria-label="Swap versions" className="swp" onClick={onSwap} type="button">
                <Icon name="swap" size={18} />
              </button>
              <div className="vn">
                <button className={menu === "secondary" ? "pick open" : "pick"} onClick={() => onMenu(menu === "secondary" ? null : "secondary")} ref={pickRef} type="button">
                  <span className="nm">{secondary?.title ?? "Choose a version"}</span>
                  <span className="yr">
                    {secondary ? `${secondary.abbreviation}${versionYear(secondary.abbreviation) ? ` · ${versionYear(secondary.abbreviation)}` : ""}` : "Right side"}
                  </span>
                  <Icon name="chev" size={15} />
                </button>
              </div>
              <span className="stat">
                <b>{identical}</b> of {rows.length} verses identical · {differed} words differ
              </span>
            </div>
            {secondary ? blocks(primary.verses).map((group) => (
              <div key={group.title ?? group.verses[0]?.number}>
                {group.title ? (
                  <div className="csec">
                    <span>{group.title}</span>
                    <span />
                    <span />
                  </div>
                ) : null}
                {group.verses.map((verse) => {
                  const row = rows.find((item) => item.verse.number === verse.number);
                  if (!row) return null;
                  return (
                    <div className={hot === verse.number ? "cr hot" : "cr"} data-verse={verse.number} key={verse.number}>
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
                              x: frame ? box.left - frame.left : 0,
                              y: frame ? box.top - frame.top : 0,
                            });
                          }}
                          onLeave={() => {
                            setHot(null);
                            setLit(null);
                          }}
                          pieces={row.diff.left}
                        />
                      </span>
                      <span className="n">{verse.number}</span>
                      <span className="t">
                        <DiffSpans litIndex={lit?.verse === verse.number ? lit.index : null} pieces={row.diff.right} />
                      </span>
                    </div>
                  );
                })}
              </div>
            )) : null}
          </div>
        ) : null}
        {!compare ? (
          <>
            {compact ? null : (
              <>
                <div className="side" style={{ left: 64, top: 36 }}>
                  <b>{bookSide(book)}</b>
                  {planLabel ?? `Chapter ${chapter} of ${versesInBook}`}
                  <div className="prog">
                    <i style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="side" style={{ right: 64, top: 36, textAlign: "right" }}>
                  <b>{wordsLeft} min left</b>
                  in this chapter
                </div>
              </>
            )}
            <div className="col">
              {primary?.error ? <p className="sec">{primary.error}</p> : null}
              {primary?.loading && (primary.verses.length ?? 0) === 0 ? <p className="sec">Loading…</p> : null}
              {blocks(primary?.verses ?? []).map((group) => (
                <div key={group.title ?? group.verses[0]?.number}>
                  {group.title ? <div className="sec">{group.title}</div> : null}
                  {group.verses.map((verse) => (
                    <button
                      className={selected.includes(verse.number) ? "vr sel" : "vr"}
                      data-verse={verse.number}
                      key={verse.number}
                      onClick={(event) => onSelect(verse.number, event.shiftKey)}
                      type="button"
                    >
                      <span className="n">{verse.number}</span>
                      <span className="t" data-verse-anchor={verse.number}>
                        {verse.text}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
      {pill && active != null ? (
        <div className="menu" style={{ left: pill.left, top: pill.top }}>
          <div className="swatches">
            {["#F2C94C", "#8FC79A", "#8DB4F2"].map((color) => (
              <button aria-label={highlighted.has(active) ? "Remove highlight" : "Highlight"} className="sw" key={color} onClick={() => onHighlight(active)} style={{ background: color }} type="button" />
            ))}
          </div>
          <button onClick={() => onNote(noteVerse === active ? null : active)} type="button">
            <Icon name="note" size={16} /> Note
          </button>
          <button onClick={showCompare} type="button">
            <Icon name="compare" size={15} /> Compare
          </button>
          <button
            onClick={() => {
              onSelect(active, false);
              setRefsOpen(true);
            }}
            type="button"
          >
            <Icon name="link" size={16} /> References
          </button>
          <button
            onClick={() => {
              const text = primary?.verses.find((verse) => verse.number === active)?.text ?? "";
              void navigator.clipboard.writeText(`${book} ${chapter}:${active} ${text}`).then(
                () => toast.success("Copied"),
                (error) => {
                  console.error("Failed to copy verse:", error);
                  toast.error("Could not copy");
                },
              );
            }}
            type="button"
          >
            <Icon name="share" size={16} />
          </button>
        </div>
      ) : null}
      {noteVerse != null && pill ? (
        <form
          className="note-card"
          style={{ left: pill.left, top: pill.top + 52 }}
          onSubmit={(event) => {
            event.preventDefault();
            void onSaveNote(noteVerse, draft, "observation");
          }}
        >
          <textarea aria-label="Note" onChange={(event) => setDraft(event.target.value)} value={draft} />
          <button className="save" type="submit">
            Save
          </button>
        </form>
      ) : null}
      {refsOpen && active != null && pill ? (
        <div className="vm" style={{ left: pill.left, top: pill.top + 52 }}>
          {crossRefs.filter((reference) => reference.sourceVerse === active).slice(0, 8).map((reference) => (
            <button className="it" key={reference.target} onClick={() => onOpenReference(reference.target)} type="button">
              <b>{reference.target.split(" ")[0]?.slice(0, 3).toUpperCase()}</b>
              <span>{reference.target}</span>
            </button>
          ))}
          <div className="ft">
            <button onClick={() => onDiscuss(active)} type="button">
              Discuss this verse
            </button>
          </div>
        </div>
      ) : null}
      {menu && menuBox ? (
        <div className="vm" style={{ left: menuBox.left, top: menuBox.top }}>
          {versions.slice(0, 8).map((version) => {
            const on = (menu === "primary" ? primary?.id : secondary?.id) === version.id;
            const locked = menu === "secondary" && version.id === primary?.id;
            return (
              <button
                className={on ? "it on" : "it"}
                key={version.id}
                onClick={() => {
                  if (locked) return;
                  onChooseVersion(version.id, menu);
                  onMenu(null);
                }}
                type="button"
              >
                <b>{version.abbreviation}</b>
                <span>{version.title}</span>
                <em>{on ? <Icon name="check" size={16} /> : locked ? "Left side" : versionYear(version.abbreviation)}</em>
              </button>
            );
          })}
          <div className="ft">Compare up to two versions side by side.</div>
        </div>
      ) : null}
      {lit ? (
        <div className="tip" style={{ left: Math.max(16, lit.x - 20), top: Math.max(72, lit.y - 108) }}>
          <div className="k">Word difference · v{lit.verse}</div>
          <div className="pair">
            {lit.left} <span style={{ color: "var(--mute)" }}>→</span> <em>{lit.right}</em>
          </div>
        </div>
      ) : null}
      <CanonRibbon
        activeBook={book}
        activeChapter={chapter}
        mobile={compact}
        noted={noted}
        onOpen={(tick) => onOpenChapter(tick.book, tick.chapter)}
        opened={opened}
        onScrub={onClearSelection}
        preview={(name, number) => {
          if (name === book && number === chapter && firstLine) return `“${firstLine}”`;
          return "";
        }}
        ticks={ticks}
      />
    </div>
  );
}
