import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

const HELLO_AO_API_BASE = "https://bible.helloao.org/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }

  const cacheKey = `helloao:${path}`;

  try {
    // Check Upstash Redis Cache
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Fetch from HelloAO
    const response = await fetch(`${HELLO_AO_API_BASE}/${path}`);
    if (!response.ok) {
      return NextResponse.json(
        { error: `HelloAO API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Store in Upstash Redis Cache (cache for 30 days since Bible text rarely changes)
    if (process.env.UPSTASH_REDIS_REST_URL) {
      await redis.set(cacheKey, data, { ex: 60 * 60 * 24 * 30 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("HelloAO Proxy Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
