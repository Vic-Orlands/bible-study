"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Bell, Search, Settings } from "lucide-react";
import { NotificationsSheet } from "@/components/notifications-sheet";
import { SearchOverlay } from "@/components/shell/search-overlay";
import { SettingsSheet } from "@/components/shell/settings-sheet";
import { Id } from "@/convex/_generated/dataModel";
import { settle } from "@/lib/motion";
import { useStudyStore } from "@/lib/study-store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/reading-plan", label: "Today" },
  { href: "/study", label: "Bible" },
  { href: "/notes", label: "Notes" },
  { href: "/groups", label: "Groups" },
];

function isActive(pathname: string, href: string) {
  if (href === "/groups") return pathname === "/groups" || pathname === "/community";
  if (href === "/study") return pathname === "/study" || pathname === "/";
  return pathname === href;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const identityId = useStudyStore((state) => state.identityId);
  const setPassage = useStudyStore((state) => state.setPassage);
  const setFocusedCommentId = useStudyStore((state) => state.setFocusedCommentId);

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--sheet)] px-3 md:px-5">
        <Link className="text-[length:var(--text-md)] font-medium tracking-tight" href="/study">
          Bible
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-6 md:flex">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                className={cn(
                  "relative py-4 text-[length:var(--text-sm)] text-[var(--mute)]",
                  active && "font-medium text-[var(--ink)]",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
                {active ? (
                  <motion.span
                    className="absolute inset-x-0 bottom-0 h-px bg-[var(--accent)]"
                    layoutId="nav-indicator"
                    transition={settle}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button
            aria-label="Search"
            className="flex h-9 w-9 items-center justify-center text-[var(--mute)]"
            onClick={() => setSearchOpen(true)}
            type="button"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center text-[var(--mute)]"
            onClick={() => setNotificationsOpen(true)}
            type="button"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            aria-label="Settings"
            className="flex h-9 items-center gap-1.5 rounded-full px-2 text-[length:var(--text-sm)] text-[var(--mute)]"
            onClick={() => setSettingsOpen(true)}
            type="button"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      <nav className="flex shrink-0 border-t border-[var(--line)] bg-[var(--sheet)] md:hidden">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              className={cn(
                "flex-1 py-3 text-center text-[length:var(--text-xs)] text-[var(--mute)]",
                active && "font-medium text-[var(--ink)]",
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationsSheet
        identityId={identityId ? (identityId as Id<"identities">) : undefined}
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onOpenNotification={(notification) => {
          setPassage({
            book: notification.passageBook,
            chapter: notification.passageChapter,
            verse: notification.passageVerse ?? 1,
          });
          setFocusedCommentId(notification.commentId ?? null);
          router.push("/groups");
        }}
      />
    </div>
  );
}
