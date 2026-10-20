"use client";

import { useEffect } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useStudyStore } from "@/lib/study-store";

export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const auth = useConvexAuth();
  const authIdentity = useQuery(api.auth.getUserIdentity);
  const syncViewerIdentity = useMutation(api.identity.syncViewerIdentity);
  const identityId = useStudyStore((state) => state.identityId);
  const setIdentity = useStudyStore((state) => state.setIdentity);
  const setIdentityReady = useStudyStore((state) => state.setIdentityReady);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (auth.isLoading) return;
      if (auth.isAuthenticated && authIdentity) {
        try {
          const synced = await syncViewerIdentity({
            identityId:
              (identityId as Id<"identities"> | null) ??
              authIdentity.identityId ??
              undefined,
          });
          setIdentity(synced.identityId, synced.displayName, false);
        } catch (error) {
          console.error("Failed to sync signed-in identity:", error);
          setIdentity(
            authIdentity.identityId,
            authIdentity.fullName ?? authIdentity.email ?? "Anonymous",
            false,
          );
        } finally {
          if (!cancelled) setIdentityReady(true);
        }
        return;
      }
      if (auth.isAuthenticated && authIdentity === undefined) return;

      try {
        const response = await fetch("/api/identity/anonymous", {
          method: "POST",
          cache: "no-store",
        });
        if (!response.ok) {
          console.error("Anonymous identity request failed:", response.status);
          return;
        }
        const data = await response.json();
        setIdentity(data.identityId, data.displayName, data.isAnonymous);
      } catch (error) {
        console.error("Failed to get anonymous identity:", error);
      } finally {
        if (!cancelled) setIdentityReady(true);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [
    auth.isAuthenticated,
    auth.isLoading,
    authIdentity,
    identityId,
    setIdentity,
    setIdentityReady,
    syncViewerIdentity,
  ]);

  return children;
}
