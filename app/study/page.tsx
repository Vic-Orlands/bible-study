"use client";

import { BiblePage } from "@/components/bible/bible-page";
import { AppShell } from "@/components/shell/app-shell";

export default function StudyPage() {
  return (
    <AppShell>
      <BiblePage />
    </AppShell>
  );
}
