import {
  CommentaryBlock,
  CommentaryChapter,
  CrossRefChapter,
  CrossReference,
} from "./scripture";

const HELLOAO_COMMENTARY_ID = "tyndale";

type HelloAoContentPart =
  | string
  | {
      lineBreak?: boolean;
      text?: string;
    };

function partToText(parts: HelloAoContentPart[] | undefined) {
  if (!parts) return "";
  return parts
    .map((part) => {
      if (typeof part === "string") return part;
      if (part.lineBreak) return " ";
      return part.text ?? "";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveHelloAoBookId(book: string) {
  const response = await fetch("/api/helloao?path=BSB/books.json", {
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error(`HelloAO book index request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    books?: { commonName: string; id: string }[];
  };
  const match = data.books?.find((item) => item.commonName === book);
  if (!match) {
    throw new Error(`Unable to resolve HelloAO book id for ${book}`);
  }
  return match.id;
}

export async function fetchCommentaryChapter(book: string, chapter: number) {
  const bookId = await resolveHelloAoBookId(book);
  const response = await fetch(
    `/api/helloao?path=c/${HELLOAO_COMMENTARY_ID}/${bookId}/${chapter}.json`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Commentary request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    book?: {
      introductionSummary?: string | null;
      introduction?: string | null;
    };
    chapter?: {
      content?: {
        type?: string;
        number?: number;
        content?: HelloAoContentPart[] | string[];
      }[];
    };
  };

  const blocks: CommentaryBlock[] = [];
  const introduction =
    data.book?.introductionSummary?.trim() || data.book?.introduction?.trim() || "";

  if (introduction) {
    blocks.push({ type: "heading", text: introduction });
  }

  for (const item of data.chapter?.content ?? []) {
    if (item.type === "heading") {
      const text = partToText(item.content);
      if (text) blocks.push({ type: "heading", text });
      continue;
    }
    if (item.type === "verse" && typeof item.number === "number") {
      const text = partToText(item.content);
      if (text) {
        blocks.push({
          type: "verse",
          number: item.number,
          text,
        });
      }
    }
  }

  return {
    book,
    chapter,
    blocks,
  } satisfies CommentaryChapter;
}

function normalizeCrossRefTarget(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.join(" ");
  if (value && typeof value === "object") {
    const ref = (value as Record<string, unknown>).reference;
    if (typeof ref === "string") return ref;
  }
  return "";
}

function normalizeCrossRefText(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (value && typeof value === "object") {
    const content = (value as Record<string, unknown>).content;
    if (typeof content === "string") return content;
  }
  return "";
}

function parseCrossReferenceRecord(record: Record<string, unknown>) {
  const sourceCandidate =
    record.source ?? record.from ?? record.verse ?? record.source_verse ?? null;
  const sourceVerse =
    typeof sourceCandidate === "number"
      ? sourceCandidate
      : typeof sourceCandidate === "string"
        ? parseInt(sourceCandidate, 10) || null
        : null;

  const target =
    normalizeCrossRefTarget(record.target) ||
    normalizeCrossRefTarget(record.to) ||
    normalizeCrossRefTarget(record.ref) ||
    normalizeCrossRefTarget(record.reference);

  const text =
    normalizeCrossRefText(record.text) ||
    normalizeCrossRefText(record.content) ||
    normalizeCrossRefText(record.note) ||
    normalizeCrossRefText(record.preview);

  if (!target && !text) return null;

  return {
    sourceVerse,
    target,
    text,
  } satisfies CrossReference;
}

function parseCrossReferenceArray(data: unknown): CrossReference[] {
  if (!Array.isArray(data)) return [];
  const parsed: CrossReference[] = [];
  for (const item of data) {
    if (Array.isArray(item)) {
      const [source, target, text] = item;
      parsed.push({
        sourceVerse:
          typeof source === "number"
            ? source
            : typeof source === "string"
              ? parseInt(source, 10) || null
              : null,
        target: normalizeCrossRefTarget(target),
        text: normalizeCrossRefText(text),
      });
      continue;
    }

    if (item && typeof item === "object") {
      const parsedRecord = parseCrossReferenceRecord(item as Record<string, unknown>);
      if (parsedRecord) parsed.push(parsedRecord);
    }
  }

  return parsed.filter((item) => item.target || item.text);
}

export async function fetchCrossRefChapter(book: string, chapter: number) {
  const bookId = await resolveHelloAoBookId(book);
  const response = await fetch(
    `/api/helloao?path=d/open-cross-ref/${bookId}/${chapter}.json`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Cross-reference request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    chapter?: {
      crossReferences?: unknown;
      content?: {
        verse?: number;
        references?: {
          book?: string;
          chapter?: number;
          verse?: number;
          endVerse?: number;
          score?: number;
        }[];
      }[];
    };
    crossReferences?: unknown;
  };

  const chapterContentReferences =
    data.chapter?.content?.flatMap((entry) =>
      (entry.references ?? []).map((reference) => {
        const startVerse = reference.verse;
        const endVerse = reference.endVerse;
        const targetBook = reference.book ?? "";
        const targetChapter = reference.chapter;
        const target =
          targetBook && typeof targetChapter === "number" && typeof startVerse === "number"
            ? `${targetBook} ${targetChapter}:${startVerse}${typeof endVerse === "number" ? `-${endVerse}` : ""}`
            : "";

        return {
          sourceVerse: typeof entry.verse === "number" ? entry.verse : null,
          target,
          text:
            typeof reference.score === "number"
              ? `Related passage (score ${reference.score})`
              : "Related passage",
        } satisfies CrossReference;
      }),
    ) ?? [];

  const chapterReferences = parseCrossReferenceArray(data.chapter?.crossReferences);
  const rootReferences = parseCrossReferenceArray(data.crossReferences);
  const references =
    chapterContentReferences.length > 0
      ? chapterContentReferences
      : chapterReferences.length > 0
        ? chapterReferences
        : rootReferences;

  return {
    book,
    chapter,
    references,
  } satisfies CrossRefChapter;
}
