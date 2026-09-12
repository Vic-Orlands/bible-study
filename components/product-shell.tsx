"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BookOpen, CalendarDays, Users } from "lucide-react";

import BibleLogo from "@/components/logo";
import { NotificationsSheet } from "@/components/notifications-sheet";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useStudyStore } from "@/lib/study-store";
import { authClient } from "@/lib/auth-client";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/study", label: "Study", shortLabel: "Study", icon: BookOpen },
  {
    href: "/reading-plan",
    label: "Reading Plan",
    shortLabel: "Plan",
    icon: CalendarDays,
  },
  { href: "/community", label: "Community", shortLabel: "Community", icon: Users },
];

export function ProductShell({
  children,
  onOpenSettings,
  onOpenBookmarks,
  onOpenProfile,
  onOpenSignIn,
  onOpenNotification,
}: {
  children: ReactNode;
  onOpenSettings?: () => void;
  onOpenBookmarks?: () => void;
  onOpenProfile?: () => void;
  onOpenSignIn?: () => void;
  onOpenNotification?: (notification: {
    passageBook: string;
    passageChapter: number;
    passageVerse?: number;
    commentId?: Id<"comments">;
  }) => void | Promise<void>;
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const auth = useConvexAuth();
  const identityId = useStudyStore((s) => s.identityId);

  return (
    <main className="bible-app flex h-screen flex-col overflow-hidden bg-white">
      <ProductTopNav
        onOpenSettings={onOpenSettings}
        onOpenBookmarks={onOpenBookmarks}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenProfile={() => {
          if (auth.isAuthenticated) onOpenProfile?.();
          else onOpenSignIn?.();
        }}
        onOpenSignIn={onOpenSignIn}
        profileOpen={profileOpen}
        onProfileOpen={() => setProfileOpen((o) => !o)}
      />
      {children}
      <NotificationsSheet
        identityId={identityId ? (identityId as Id<"identities">) : undefined}
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onOpenNotification={onOpenNotification}
      />
    </main>
  );
}

function ProductTopNav({
  onOpenNotifications,
  onOpenSettings,
  onOpenBookmarks,
  onOpenProfile,
  onOpenSignIn,
  profileOpen,
  onProfileOpen,
}: {
  onOpenNotifications: () => void;
  onOpenSettings?: () => void;
  onOpenBookmarks?: () => void;
  onOpenProfile?: () => void;
  onOpenSignIn?: () => void;
  profileOpen: boolean;
  onProfileOpen: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const auth = useConvexAuth();
  const identity = useQuery(api.auth.getUserIdentity);
  const userName = identity?.fullName ?? identity?.email ?? "Anonymous";
  const userId = identity?.userId;
  const isSignedIn = auth.isAuthenticated || !!userId;
  const callbackURL = pathname || "/study";
  const loginHref = `/login?callbackURL=${encodeURIComponent(callbackURL)}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateStatus = () => setIsOnline(window.navigator.onLine);

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        onProfileOpen();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [profileOpen, onProfileOpen]);

  return (
    <header className="chrome-bar relative z-10 flex h-14 shrink-0 items-center border-b border-black/[0.06] bg-white/80 px-4 backdrop-blur-xl md:h-[52px] md:px-6">
      <Link
        className="relative z-10 flex min-w-0 shrink-0 items-center gap-2.5"
        href="/study"
      >
        <BibleLogo className="h-7 w-7" />
        <span className="hidden text-[15px] font-semibold tracking-[-0.02em] text-[#171412] md:block">
          Bible Study
        </span>
      </Link>

      <nav
        aria-label="Primary"
        className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full bg-[#f4f1ec] p-0.5"
      >
        {navItems.map(({ href, icon: Icon, label, shortLabel }) => {
          const active = pathname === href;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={label}
              className={cn(
                "relative flex h-8 items-center justify-center rounded-full px-3 text-[13px] font-medium transition-colors md:px-4",
                active
                  ? "bg-white text-[#171412] shadow-[0_1px_2px_rgba(37,20,11,0.08)]"
                  : "text-[#8a8178] hover:text-[#171412]",
              )}
              key={href}
              href={href}
            >
              <Icon className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">{shortLabel}</span>
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 ml-auto flex shrink-0 items-center gap-0.5">
        <button
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#3a322c] transition-colors hover:bg-[#f4f1ec]"
          title="Notifications"
          type="button"
          onClick={onOpenNotifications}
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <div className="relative" ref={profileMenuRef}>
          <button
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
            className="relative flex h-9 w-9 items-center justify-center rounded-full"
            onClick={onProfileOpen}
            type="button"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3a2218] text-[11px] font-semibold text-[#f4eadc]">
              {userId ? userName.slice(0, 2).toUpperCase() : "AN"}
            </span>
            <span
              aria-hidden
              className={cn(
                "absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
                isOnline ? "bg-[#34c759]" : "bg-[#c7c7cc]",
              )}
            />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-[calc(100%+10px)] z-30 w-60 overflow-hidden rounded-2xl border border-black/[0.06] bg-white py-1.5 shadow-[0_18px_50px_rgba(37,20,11,0.12)]"
                exit={{ opacity: 0, y: -4 }}
                initial={{ opacity: 0, y: -4 }}
                role="menu"
                transition={{ duration: 0.16, ease: [0.215, 0.61, 0.355, 1] }}
              >
                <div className="px-4 py-3">
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#171412]">
                    {userName}
                  </p>
                  {mounted ? (
                    <p className="mt-0.5 text-[12px] text-[#8a8178]">
                      {identity?.email ?? "guest@biblestudy.app"}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[12px] text-[#8a8178]">
                    {isOnline ? "Online" : "Offline"}
                  </p>
                </div>
                <div className="border-t border-black/[0.05] py-1">
                  <button
                    className="w-full px-4 py-2.5 text-left text-[14px] text-[#171412] hover:bg-[#f7f5f2]"
                    onClick={() => {
                      onProfileOpen();
                      onOpenBookmarks?.();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    Bookmarks
                  </button>
                  <button
                    className="w-full px-4 py-2.5 text-left text-[14px] text-[#171412] hover:bg-[#f7f5f2]"
                    onClick={() => {
                      onProfileOpen();
                      onOpenSettings?.();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    Settings
                  </button>
                  <button
                    className="w-full px-4 py-2.5 text-left text-[14px] text-[#171412] hover:bg-[#f7f5f2]"
                    onClick={() => {
                      onProfileOpen();
                      onOpenProfile?.();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    Profile
                  </button>
                  <button
                    className="w-full px-4 py-2.5 text-left text-[14px] font-medium text-[#f6823c] hover:bg-[#f7f5f2]"
                    onClick={async () => {
                      onProfileOpen();
                      if (isSignedIn) {
                        try {
                          await authClient.signOut();
                        } catch (e) {
                          console.error(e);
                        }
                      } else {
                        onOpenSignIn?.();
                        router.push(loginHref);
                      }
                    }}
                    role="menuitem"
                    type="button"
                  >
                    {isSignedIn ? "Log Out" : "Sign In"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
