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
  try {
    const response = await fetch(
      `${HELLO_AO_API_BASE}/${translationId}/${bookId}/${chapter}.json`,
    );

    if (!response.ok) {
      throw new Error(
        `HelloAO chapter request failed: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as HelloAoChapterResponse;
  } catch (error) {
    console.error("Failed to fetch HelloAO chapter", error);
    throw error;
  }
}

export async function fetchHelloAoBooks(translationId = "BSB") {
  try {
    const response = await fetch(`${HELLO_AO_API_BASE}/${translationId}/books.json`);

    if (!response.ok) {
      throw new Error(
        `HelloAO books request failed: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as HelloAoBooksResponse;
  } catch (error) {
    console.error("Failed to fetch HelloAO books", error);
    throw error;
  }
}
