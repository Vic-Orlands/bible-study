"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/study");
  }, [router]);

  return <main className="min-h-svh bg-[var(--paper)]" />;
}
