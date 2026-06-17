import { NextRequest, NextResponse } from "next/server";
import { readServerCache, writeServerCache } from "@/lib/server-cache";

const API_BIBLE_CACHE_TTL_SECONDS = 60 * 60 * 12;

async function fetchApiBible(path: string, searchParams: URLSearchParams) {
  const apiUrl = process.env.API_BIBLE_URL;
  const apiKey = process.env.API_BIBLE_KEY;

  if (!apiUrl || !apiKey) {
    console.error("Missing API_BIBLE_URL or API_BIBLE_KEY for API.Bible requests.");
    throw new Error("Missing API.Bible environment configuration.");
  }

  const cacheKey = `api-bible:${path}?${searchParams.toString()}`;

  const cached = await readServerCache<unknown>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(`${apiUrl}${path}?${searchParams.toString()}`, {
    headers: {
      "api-key": apiKey,
    },
    next: { revalidate: 60 * 60 * 12 },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("API.Bible request failed:", response.status, body);
    throw new Error(`API.Bible request failed with status ${response.status}.`);
  }

  const data = await response.json();

  await writeServerCache(cacheKey, data, API_BIBLE_CACHE_TTL_SECONDS);

  return data;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");

  try {
    if (kind === "bibles") {
      const upstream = new URLSearchParams();
      for (const key of ["language", "abbreviation", "name", "ids", "include-full-details"]) {
        const value = searchParams.get(key);
        if (value) upstream.set(key, value);
      }
      const data = await fetchApiBible("/v1/bibles", upstream);
      return NextResponse.json(data);
    }

    if (kind === "books") {
      const bibleId = searchParams.get("bibleId");
      if (!bibleId) {
        return NextResponse.json({ error: "bibleId is required." }, { status: 400 });
      }

      const upstream = new URLSearchParams();
      upstream.set(
        "include-chapters",
        searchParams.get("include-chapters") === "true" ? "true" : "false",
      );
      const data = await fetchApiBible(`/v1/bibles/${bibleId}/books`, upstream);
      return NextResponse.json(data);
    }

    if (kind === "chapter") {
      const bibleId = searchParams.get("bibleId");
      const chapterId = searchParams.get("chapterId");
      if (!bibleId || !chapterId) {
        return NextResponse.json(
          { error: "bibleId and chapterId are required." },
          { status: 400 },
        );
      }

      const upstream = new URLSearchParams();
      for (const key of [
        "content-type",
        "include-notes",
        "include-titles",
        "include-chapter-numbers",
        "include-verse-numbers",
        "include-verse-spans",
        "parallels",
      ]) {
        const value = searchParams.get(key);
        if (value) upstream.set(key, value);
      }

      const data = await fetchApiBible(
        `/v1/bibles/${bibleId}/chapters/${chapterId}`,
        upstream,
      );
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unsupported kind." }, { status: 400 });
  } catch (error) {
    console.error("API.Bible proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch API.Bible data." },
      { status: 500 },
    );
  }
}
