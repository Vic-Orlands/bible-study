"use client";

import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient()],
});

export async function signInWithGoogle(callbackURL = "/study") {
  return await authClient.signIn.social({
    provider: "google",
    callbackURL,
  });
}
