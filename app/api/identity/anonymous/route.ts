import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";

async function hashIp(ip: string) {
  const ipData = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", ipData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function POST(request: Request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    console.error("Missing NEXT_PUBLIC_CONVEX_URL for anonymous identity route.");
    return new Response(
      JSON.stringify({ error: "Anonymous identity service unavailable." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const ipHash = await hashIp(ip);
    const client = new ConvexHttpClient(convexUrl);

    const existing = await client.query(api.identity.getByIpHash, { ipHash });
    if (existing) {
      return new Response(
        JSON.stringify({
          identityId: existing._id,
          displayName: existing.displayName,
          isAnonymous: existing.isAnonymous,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const identityId = await client.mutation(api.identity.createFromIp, {
      ipHash,
    });

    return new Response(
      JSON.stringify({
        identityId,
        displayName: `Anonymous-${ipHash.slice(0, 4).toUpperCase()}`,
        isAnonymous: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Failed to create anonymous identity:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create anonymous identity." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
