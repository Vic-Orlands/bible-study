"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Bell, BookOpen, CalendarDays, ChevronDown, Users } from "lucide-react";

import BibleLogo from "@/components/logo";
import { CheckCircleIcon } from "@/components/ui/check-circle";
import { WifiIcon } from "@/components/ui/wifi";
import { NotificationsSheet } from "@/components/notifications-sheet";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useStudyStore } from "@/lib/study-store";
import { authClient } from "@/lib/auth-client";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/reading-plan", label: "Reading Plan", icon: CalendarDays },
  { href: "/community", label: "Community", icon: Users },
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
    <header className="z-10 flex h-14 shrink-0 items-center gap-2 border-b border-[#f1e8df] bg-white px-3 md:gap-4 md:px-5">
      <Link
        className="flex shrink-0 items-center gap-2 md:w-[220px]"
        href="/study"
      >
        <BibleLogo className="h-8 w-8" />
        <span className="hidden font-serif text-[15px] font-semibold tracking-tight text-[#25140b] sm:block">
          Bible Study
        </span>
      </Link>

      <nav className="flex min-w-0 flex-1 items-center justify-center gap-1 md:absolute md:left-1/2 md:flex-none md:-translate-x-1/2 md:gap-8">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;

          return (
            <Link
              aria-label={label}
              className={cn(
                "relative flex h-14 min-w-10 items-center justify-center gap-1.5 px-2 text-[13px] font-medium text-[#7a6758] hover:text-[#3a2218] md:min-w-0 md:px-1 md:text-sm",
                active && "font-semibold text-[#25140b]",
              )}
              key={href}
              href={href}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden lg:inline">{label}</span>
              {active && (
                <motion.span
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f6823c]"
                  layoutId="top-nav-indicator"
                  transition={{
                    duration: 0.22,
                    ease: [0.645, 0.045, 0.355, 1],
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-3">
        <button
          className={cn(
            "cta-button hidden items-center gap-1.5 border border-[#f1e8df] bg-[#fbf7f2] px-3 py-1.5 text-[13px] font-semibold md:flex",
            isOnline ? "text-[#2e6b3d]" : "text-[#a24723]",
          )}
          type="button"
        >
          {isOnline ? (
            <CheckCircleIcon
              animateOnParentHover
              className="h-3.5 w-3.5"
              size={14}
            />
          ) : (
            <WifiIcon animateOnParentHover className="h-3.5 w-3.5" size={14} />
          )}
          {isOnline ? "Online" : "Offline"}
        </button>
        <button
          className="icon-button flex h-[30px] w-[30px] items-center justify-center text-[#7a6758] hover:bg-[#fbf7f2] hover:text-[#3a2218]"
          type="button"
          onClick={onOpenNotifications}
        >
          <Bell className="h-4 w-4" />
        </button>
        <div className="relative" ref={profileMenuRef}>
          <div
            className="flex cursor-pointer items-center gap-1 rounded-full p-1 transition-colors duration-150 hover:bg-[#fbf7f2] md:gap-2 md:pr-2"
            onClick={onProfileOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3a2218] text-[11px] font-semibold text-[#f6823c]">
              {userId ? userName.slice(0, 2).toUpperCase() : "AN"}
            </div>
            {mounted && (
              <div className="hidden flex-col justify-center md:flex">
                <span className="text-[12px] font-semibold leading-tight text-[#25140b]">
                  {userName}
                </span>
                <span className="text-[10px] leading-tight text-[#7a6758]">
                  {identity?.email ?? "guest@biblestudy.app"}
                </span>
              </div>
            )}
            <ChevronDown className="hidden h-3 w-3 text-[#7a6758] sm:block" />
          </div>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-[calc(100%+6px)] z-30 w-56 border border-[#e5d6c9] bg-white shadow-[0_14px_36px_rgba(31,18,9,0.10)]"
                exit={{ opacity: 0, y: -4 }}
                initial={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.215, 0.61, 0.355, 1] }}
              >
                <div className="px-4 py-2 border-b border-[#f1e8df]">
                  <p className="text-[13px] font-semibold text-[#25140b]">
                    {userName}
                  </p>
                </div>
                <div className="py-1 *:!transform-none hover:!transform-none">
                  <button
                    className="w-full px-4 py-2 text-left text-[12px] font-medium text-[#3a2218] hover:bg-[#fbf7f2]"
                    onClick={() => {
                      onProfileOpen();
                      onOpenBookmarks?.();
                    }}
                  >
                    Bookmarks
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-[12px] font-medium text-[#3a2218] hover:bg-[#fbf7f2]"
                    onClick={() => {
                      onProfileOpen();
                      onOpenSettings?.();
                    }}
                  >
                    Settings
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-[12px] font-medium text-[#3a2218] hover:bg-[#fbf7f2]"
                    onClick={() => {
                      onProfileOpen();
                      onOpenProfile?.();
                    }}
                  >
                    Profile
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-[12px] font-semibold text-[#f6823c] hover:bg-[#fbf7f2]"
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
