import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { api } from "../convex/_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/identity/anonymous",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const ipData = new TextEncoder().encode(ip);
    const hashBuffer = await crypto.subtle.digest("SHA-256", ipData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);

    const existing = await ctx.runQuery(api.identity.getByIpHash, { ipHash });
    if (existing) {
      return new Response(
        JSON.stringify({
          identityId: existing._id,
          displayName: existing.displayName,
          isAnonymous: existing.isAnonymous,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const id = await ctx.runMutation(api.identity.createFromIp, { ipHash });
    return new Response(
      JSON.stringify({
        identityId: id,
        displayName: `Anonymous-${ipHash.slice(0, 4).toUpperCase()}`,
        isAnonymous: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

export default http;