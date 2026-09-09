"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import AnimatedBible from "@/components/animated-bible";

export default function HomePage() {
  const router = useRouter();
  const openBible = useCallback(() => router.replace("/study"), [router]);

  useEffect(() => {
    router.prefetch("/study");
  }, [router]);

  return (
    <main className="min-h-svh bg-[#1f1f1f]">
      <AnimatedBible onComplete={openBible} />
    </main>
  );
}
