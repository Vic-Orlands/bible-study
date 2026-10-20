"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { useState } from "react";
import { AppearanceProvider } from "@/components/appearance-provider";
import { ViewerProvider } from "@/components/viewer-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth-client";
import { convex } from "@/lib/convex";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          <ViewerProvider>
            <AppearanceProvider>
              {children}
              <Toaster />
            </AppearanceProvider>
          </ViewerProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ConvexBetterAuthProvider>
  );
}
