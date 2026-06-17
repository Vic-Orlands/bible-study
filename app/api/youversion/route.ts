import { NextRequest, NextResponse } from "next/server";
import { readServerCache, writeServerCache } from "@/lib/server-cache";

const YOUVERSION_API_BASE = "https://api.youversion.com/v1";
const YOUVERSION_CACHE_TTL_SECONDS = 60 * 60 * 12;

async function fetchYouVersion(path: string, searchParams: URLSearchParams) {
  const appKey = process.env.YVP_APP_KEY;
  if (!appKey) {
    console.error("Missing YVP_APP_KEY for YouVersion requests.");
    throw new Error("Missing YVP_APP_KEY");
  }

  const cacheKey = `youversion:${path}?${searchParams.toString()}`;

  const cached = await readServerCache<unknown>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(`${YOUVERSION_API_BASE}${path}?${searchParams.toString()}`, {
    headers: {
      "X-YVP-App-Key": appKey,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("YouVersion request failed:", response.status, body);
    throw new Error(`YouVersion API returned ${response.status}`);
  }

  const data = await response.json();

  await writeServerCache(cacheKey, data, YOUVERSION_CACHE_TTL_SECONDS);

  return data;
}

type YouVersionBiblesPage = {
  data?: unknown[];
  next_page_token?: string | null;
  total_size?: number;
};

async function fetchAllYouVersionBibles(languageRange: string) {
  const allData: unknown[] = [];
  let nextPageToken: string | null | undefined = null;
  let totalSize: number | undefined;

  do {
    const upstreamParams = new URLSearchParams();
    upstreamParams.append("language_ranges[]", languageRange);
    upstreamParams.append("page_size", "99");
    if (nextPageToken) {
      upstreamParams.append("page_token", nextPageToken);
    }

    const page = (await fetchYouVersion("/bibles", upstreamParams)) as YouVersionBiblesPage;
    allData.push(...(page.data ?? []));
    totalSize = page.total_size;
    nextPageToken = page.next_page_token;
  } while (nextPageToken);

  return {
    data: allData,
    next_page_token: null,
    total_size: totalSize ?? allData.length,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");

  try {
    if (kind === "bibles") {
      const languageRange = searchParams.get("languageRange");
      if (!languageRange) {
        return NextResponse.json({ error: "languageRange is required" }, { status: 400 });
      }

      const data = await fetchAllYouVersionBibles(languageRange);
      return NextResponse.json(data);
    }

    if (kind === "index") {
      const bibleId = searchParams.get("bibleId");
      if (!bibleId) {
        return NextResponse.json({ error: "bibleId is required" }, { status: 400 });
      }

      const data = await fetchYouVersion(`/bibles/${bibleId}/index`, new URLSearchParams());
      return NextResponse.json(data);
    }

    if (kind === "passage") {
      const bibleId = searchParams.get("bibleId");
      const passageId = searchParams.get("passageId");
      const format = searchParams.get("format") ?? "html";
      if (!bibleId || !passageId) {
        return NextResponse.json({ error: "bibleId and passageId are required" }, { status: 400 });
      }

      const upstreamParams = new URLSearchParams();
      upstreamParams.set("format", format);
      upstreamParams.set(
        "include_headings",
        searchParams.get("includeHeadings") === "true" ? "true" : "false",
      );
      upstreamParams.set(
        "include_notes",
        searchParams.get("includeNotes") === "true" ? "true" : "false",
      );

      const data = await fetchYouVersion(`/bibles/${bibleId}/passages/${passageId}`, upstreamParams);
      return NextResponse.json(data);
    }

    if (kind === "verses") {
      const bibleId = searchParams.get("bibleId");
      const bookId = searchParams.get("bookId");
      const chapter = searchParams.get("chapter");
      if (!bibleId || !bookId || !chapter) {
        return NextResponse.json(
          { error: "bibleId, bookId, and chapter are required" },
          { status: 400 },
        );
      }

      const data = await fetchYouVersion(
        `/bibles/${bibleId}/books/${bookId}/chapters/${chapter}/verses`,
        new URLSearchParams(),
      );
      return NextResponse.json(data);
    }

    if (kind === "chapter-verses") {
      const bibleId = searchParams.get("bibleId");
      const passageId = searchParams.get("passageId");
      if (!bibleId || !passageId) {
        return NextResponse.json(
          { error: "bibleId and passageId are required" },
          { status: 400 },
        );
      }

      const verseCollection = (await fetchYouVersion(
        `/bibles/${bibleId}/chapters/${passageId}/verses`,
        new URLSearchParams(),
      )) as {
        data: { passage_id: string; title: number }[];
      };

      const verses = await Promise.all(
        verseCollection.data.map(async (verse) => {
          const verseData = (await fetchYouVersion(
            `/bibles/${bibleId}/passages/${verse.passage_id}`,
            new URLSearchParams({ format: "text" }),
          )) as {
            content: string;
          };
          return {
            number: verse.title,
            text: verseData.content.trim(),
          };
        }),
      );

      return NextResponse.json({
        bibleId,
        passageId,
        verses,
      });
    }

    return NextResponse.json({ error: "Unsupported kind" }, { status: 400 });
  } catch (error) {
    console.error("YouVersion proxy error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
