"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { SideSheet } from "@/components/ui/side-sheet";
import { useAppearance } from "@/components/appearance-provider";
import { authClient } from "@/lib/auth-client";
import { requestPushToken } from "@/lib/firebase-messaging";
import { identityArgs } from "@/lib/identity";
import { Direction, Scheme, ScriptureSize } from "@/lib/appearance";
import { useStudyStore } from "@/lib/study-store";
import { cn } from "@/lib/utils";

const directions: { id: Direction; title: string; detail: string }[] = [
  { id: "canon", title: "Canon", detail: "Lapis ribbon and a single reading column" },
  { id: "thread", title: "Thread", detail: "Signal wires, notes, and diff compare" },
];

const schemes: { id: Scheme; title: string }[] = [
  { id: "light", title: "Light" },
  { id: "dark", title: "Dark" },
];

const sizes: ScriptureSize[] = [16, 18];

export function SettingsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const appearance = useAppearance();
  const identityId = useStudyStore((state) => state.identityId);
  const isAnonymous = useStudyStore((state) => state.isAnonymous);
  const admin = useQuery(api.auth.getAdminState);
  const preferences = useQuery(api.notifications.preferences, identityArgs(identityId));
  const savePreferences = useMutation(api.notifications.savePreferences);
  const registerPushToken = useMutation(api.notifications.registerPushToken);

  const enablePush = async () => {
    try {
      const token = await requestPushToken();
      if (!token) return;
      await registerPushToken({ ...identityArgs(identityId), token });
      toast.success("Notifications enabled");
    } catch (error) {
      console.error("Failed to enable push notifications:", error);
      toast.error("Could not enable notifications");
    }
  };

  const toggleDaily = async () => {
    if (!preferences) return;
    try {
      await savePreferences({
        ...identityArgs(identityId),
        comments: preferences.comments,
        dailyReminder: !preferences.dailyReminder,
        likes: preferences.likes,
        mentions: preferences.mentions,
        planMilestones: preferences.planMilestones,
        reminderHour: preferences.reminderHour,
        replies: preferences.replies,
        verseOfDay: preferences.verseOfDay,
      });
    } catch (error) {
      console.error("Failed to save notification preferences:", error);
      toast.error("Could not save notification settings");
    }
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
      router.push("/login");
      onClose();
    } catch (error) {
      console.error("Failed to sign out:", error);
      toast.error("Could not sign out");
    }
  };

  return (
    <SideSheet open={open} title="Settings" onClose={onClose}>
      <div className="space-y-6 px-4 py-4">
        <section>
          <h3 className="text-[length:var(--text-xs)] font-medium uppercase tracking-[0.14em] text-[var(--mute)]">
            Direction
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {directions.map((direction) => {
              const active = appearance.direction === direction.id;
              return (
                <button
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left",
                    active
                      ? "border-[var(--accent)] bg-[var(--soft)]"
                      : "border-[var(--line)] bg-[var(--paper)]",
                  )}
                  key={direction.id}
                  onClick={() => appearance.setDirection(direction.id)}
                  type="button"
                >
                  <span className="block text-[length:var(--text-sm)] font-medium">{direction.title}</span>
                  <span className="mt-1 block text-[length:var(--text-xs)] leading-5 text-[var(--mute)]">
                    {direction.detail}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-[length:var(--text-xs)] font-medium uppercase tracking-[0.14em] text-[var(--mute)]">
            Appearance
          </h3>
          <div className="mt-3 flex gap-2">
            {schemes.map((scheme) => (
              <button
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[length:var(--text-sm)]",
                  appearance.scheme === scheme.id
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--line)] text-[var(--mute)]",
                )}
                key={scheme.id}
                onClick={() => appearance.setScheme(scheme.id)}
                type="button"
              >
                {scheme.title}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[length:var(--text-xs)] font-medium uppercase tracking-[0.14em] text-[var(--mute)]">
            Scripture size
          </h3>
          <div className="mt-3 flex gap-2">
            {sizes.map((size) => (
              <button
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[length:var(--text-sm)]",
                  appearance.scriptureSize === size
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--line)] text-[var(--mute)]",
                )}
                key={size}
                onClick={() => appearance.setScriptureSize(size)}
                type="button"
              >
                {size}px
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-[length:var(--text-xs)] font-medium uppercase tracking-[0.14em] text-[var(--mute)]">
            Notifications
          </h3>
          <button
            className="flex w-full items-center justify-between rounded-2xl border border-[var(--line)] px-3 py-3 text-left text-[length:var(--text-sm)]"
            onClick={() => void toggleDaily()}
            type="button"
          >
            Daily reminder
            <span className="text-[var(--accent)]">
              {preferences?.dailyReminder ? "On" : "Off"}
            </span>
          </button>
          <button
            className="w-full rounded-full border border-[var(--line)] px-3 py-2 text-[length:var(--text-sm)]"
            onClick={() => void enablePush()}
            type="button"
          >
            Enable push on this device
          </button>
        </section>

        <section className="space-y-2">
          <h3 className="text-[length:var(--text-xs)] font-medium uppercase tracking-[0.14em] text-[var(--mute)]">
            Account
          </h3>
          {isAnonymous ? (
            <button
              className="w-full rounded-full bg-[var(--accent)] px-3 py-2 text-[length:var(--text-sm)] font-medium text-[var(--accent-ink)]"
              onClick={() => {
                router.push(`/login?callbackURL=${encodeURIComponent(window.location.pathname)}`);
                onClose();
              }}
              type="button"
            >
              Sign in
            </button>
          ) : (
            <button
              className="w-full rounded-full border border-[var(--line)] px-3 py-2 text-[length:var(--text-sm)]"
              onClick={() => void signOut()}
              type="button"
            >
              Sign out
            </button>
          )}
          {admin?.isAdmin ? (
            <button
              className="w-full rounded-full border border-[var(--line)] px-3 py-2 text-[length:var(--text-sm)]"
              onClick={() => {
                router.push("/admin");
                onClose();
              }}
              type="button"
            >
              Translations
            </button>
          ) : null}
        </section>
      </div>
    </SideSheet>
  );
}
