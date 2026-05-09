import { db } from "./db";

const HELLO_AO_API_BASE = "https://bible.helloao.org/api";

export type HelloAoContentPart =
  | string
  | {
      lineBreak?: boolean;
      noteId?: number;
      poem?: number;
      text?: string;
    };

export type HelloAoChapterContent =
  | {
      content: HelloAoContentPart[];
      number: number;
      type: "verse";
    }
  | {
      content?: HelloAoContentPart[];
      type: "heading" | "line_break";
    };

export type HelloAoChapterResponse = {
  book: {
    commonName: string;
    id: string;
    name: string;
    numberOfChapters: number;
    order: number;
  };
  chapter: {
    content: HelloAoChapterContent[];
    number: number;
  };
  numberOfVerses: number;
  translation: {
    id: string;
    name: string;
    shortName: string;
  };
};

export type HelloAoBook = {
  commonName: string;
  id: string;
  name: string;
  numberOfChapters: number;
  order: number;
};

export type HelloAoBooksResponse = {
  books: HelloAoBook[];
};

export type BibleVerse = {
  number: number;
  text: string;
};

function contentToText(content: HelloAoContentPart[]) {
  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (part.lineBreak) {
        return " ";
      }

      return part.text ?? "";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractChapterVerses(chapter: HelloAoChapterResponse) {
  return chapter.chapter.content.flatMap((item): BibleVerse[] => {
    if (item.type !== "verse") {
      return [];
    }

    return [
      {
        number: item.number,
        text: contentToText(item.content),
      },
    ];
  });
}

export async function fetchHelloAoChapter(
  translationId: string,
  bookId: string,
  chapter: number,
) {
  const cacheId = `${translationId}-${bookId}-${chapter}`;
  try {
    const cached = await db.chapters.get(cacheId);
    if (cached) return cached.data as HelloAoChapterResponse;
  } catch (e) {
    console.error("Dexie get error:", e);
  }

  try {
    const response = await fetch(
      `/api/helloao?path=${translationId}/${bookId}/${chapter}.json`,
    );

    if (!response.ok) {
      throw new Error(
        `HelloAO chapter request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    try {
      await db.chapters.put({
        id: cacheId,
        translationId,
        bookId,
        chapter,
        data,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.error("Dexie put error:", e);
    }
    return data as HelloAoChapterResponse;
  } catch (error) {
    console.error("Failed to fetch HelloAO chapter", error);
    try {
      const cached = await db.chapters.get(cacheId);
      if (cached) return cached.data as HelloAoChapterResponse;
    } catch (e) {}
    throw error;
  }
}

export async function fetchHelloAoBooks(translationId = "BSB") {
  const cacheId = `${translationId}-books`;
  try {
    const cached = await db.books.get(cacheId);
    if (cached) return cached.data as HelloAoBooksResponse;
  } catch (e) {}

  try {
    const response = await fetch(
      `/api/helloao?path=${translationId}/books.json`,
    );

    if (!response.ok) {
      throw new Error(
        `HelloAO books request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    try {
      await db.books.put({
        id: cacheId,
        translationId,
        data,
        timestamp: Date.now(),
      });
    } catch (e) {}
    return data as HelloAoBooksResponse;
  } catch (error) {
    console.error("Failed to fetch HelloAO books", error);
    try {
      const cached = await db.books.get(cacheId);
      if (cached) return cached.data as HelloAoBooksResponse;
    } catch (e) {}
    throw error;
  }
}
