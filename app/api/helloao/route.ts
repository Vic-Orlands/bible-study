import { NextRequest, NextResponse } from "next/server";
import { readServerCache, writeServerCache } from "@/lib/server-cache";

const HELLO_AO_API_BASE = "https://bible.helloao.org/api";
const HELLO_AO_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }

  const cacheKey = `helloao:${path}`;

  try {
    const cached = await readServerCache<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const response = await fetch(`${HELLO_AO_API_BASE}/${path}`);
    if (!response.ok) {
      console.error("HelloAO request failed:", response.status, path);
      return NextResponse.json(
        { error: `HelloAO API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    await writeServerCache(cacheKey, data, HELLO_AO_CACHE_TTL_SECONDS);

    return NextResponse.json(data);
  } catch (error) {
    console.error("HelloAO Proxy Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
