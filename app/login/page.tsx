"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { signInWithGoogle } from "@/lib/auth-client";

function getCallbackURL() {
  if (typeof window === "undefined") return "/study";
  const callbackURL = new URLSearchParams(window.location.search).get(
    "callbackURL",
  );
  if (!callbackURL || !callbackURL.startsWith("/")) return "/study";
  return callbackURL;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [callbackURL, setCallbackURL] = useState("/study");

  useEffect(() => {
    setCallbackURL(getCallbackURL());
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(callbackURL);
    } catch (e) {
      console.error(e);
      toast.error("Failed to sign in with Google.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--paper)] px-4 text-[var(--ink)]">
      <section className="w-full max-w-sm rounded-3xl border border-[var(--line)] bg-[var(--sheet)] p-6">
        <div className="mb-8 flex items-center justify-between">
          <Link className="text-[length:var(--text-md)] font-medium" href="/study">
            Bible
          </Link>
        </div>
        <h1 className="text-[length:var(--text-xl)] font-medium">Sign in to continue</h1>
        <p className="mt-2 text-[length:var(--text-sm)] leading-6 text-[var(--mute)]">
          Use Google to keep bookmarks, notes, discussions, and audio notes.
        </p>
        <button
          className="mt-7 flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 py-3 text-[length:var(--text-sm)] font-medium text-[var(--accent-ink)] disabled:opacity-60"
          disabled={loading}
          onClick={handleSignIn}
          type="button"
        >
          {loading ? "Signing in" : "Continue with Google"}
        </button>
      </section>
    </main>
  );
}
