"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";

import BibleLogo from "@/components/logo";
import { Toaster } from "@/components/ui/sonner";
import { authClient, signInWithGoogle } from "@/lib/auth-client";

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
  const session = authClient.useSession();

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
    <main className="flex min-h-screen items-center justify-center bg-[#fbf7f2] px-4 text-[#25140b]">
      <Toaster />
      <section className="w-full max-w-[380px] border border-[#eadccf] bg-white p-6 shadow-[0_22px_70px_rgba(31,18,9,0.12)]">
        <div className="mb-8 flex items-center justify-between">
          <Link className="flex items-center gap-2" href="/">
            <BibleLogo className="h-8 w-8" />
            <span className="font-serif text-[15px] font-semibold">
              Bible Study
            </span>
          </Link>
          <Link
            className="text-[12px] font-semibold text-[#7a6758] hover:text-[#3a2218]"
            href="/study"
          >
            Study
          </Link>
        </div>

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#3a2218]">
          <BookOpen className="h-7 w-7 text-[#f6823c]" />
        </div>

        <h1 className="text-2xl font-semibold tracking-normal">
          Sign in to continue
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#7a6758]">
          Use Google to sync your bookmarks, notes, comments, and audio notes.
        </p>

        <button
          className="mt-7 flex w-full items-center justify-center gap-3 bg-[#3a2218] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f1209] disabled:opacity-60"
          disabled={loading || session.isPending}
          onClick={handleSignIn}
          type="button"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[12px] font-bold text-[#3a2218]">
                G
              </span>
              Continue with Google
            </>
          )}
        </button>
      </section>
    </main>
  );
}
