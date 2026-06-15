"use client";

import { ProductShell } from "@/components/product-shell";
import { CustomTranslationsManager } from "@/components/custom-translations-manager";
import { Toaster } from "@/components/ui/sonner";

export default function AdminPage() {
  return (
    <ProductShell>
      <CustomTranslationsManager />
      <Toaster />
    </ProductShell>
  );
}
