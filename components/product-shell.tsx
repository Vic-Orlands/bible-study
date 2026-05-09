"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Bell, BookOpen, CalendarDays, ChevronDown, Users } from "lucide-react";

import BibleLogo from "@/components/logo";
import { CheckCircleIcon } from "@/components/ui/check-circle";
import { WifiIcon } from "@/components/ui/wifi";
import { useStudyStore } from "@/lib/study-store";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/reading-plan", label: "Reading Plan", icon: CalendarDays },
  { href: "/community", label: "Community", icon: Users },
];

export function ProductShell({ children, onOpenNotifications }: { children: ReactNode, onOpenNotifications?: () => void }) {
  return (
    <main className="bible-app flex h-screen flex-col overflow-hidden bg-white">
      <ProductTopNav onOpenNotifications={onOpenNotifications} />
      {children}
    </main>
  );
}

function ProductTopNav({ onOpenNotifications }: { onOpenNotifications?: () => void }) {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const guestName = useStudyStore((s) => s.guestName);

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

  return (
    <header className="z-10 flex h-14 shrink-0 items-center gap-4 border-b border-[#f1e8df] bg-white px-5">
      <Link className="flex w-[220px] items-center gap-2" href="/study">
        <BibleLogo className="h-8 w-8" />
        <span className="font-serif text-[15px] font-semibold tracking-tight text-[#25140b]">
          Bible Study
        </span>
      </Link>

      <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-8">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;

          return (
            <Link
              className={cn(
                "relative flex items-center gap-1.5 px-1 py-4 text-sm font-medium text-[#7a6758] hover:text-[#3a2218]",
                active && "font-semibold text-[#25140b]",
              )}
              href={href}
              key={href}
            >
              <Icon className="h-4 w-4" />
              {label}
              {active && (
                <motion.span
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f6823c]"
                  layoutId="top-nav-indicator"
                  transition={{ duration: 0.22, ease: [0.645, 0.045, 0.355, 1] }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <button
          className={cn(
            "cta-button hidden items-center gap-1.5 border border-[#f1e8df] bg-[#fbf7f2] px-3 py-1.5 text-[13px] font-semibold md:flex",
            isOnline ? "text-[#2e6b3d]" : "text-[#a24723]",
          )}
          type="button"
        >
          {isOnline ? (
            <CheckCircleIcon animateOnParentHover className="h-3.5 w-3.5" size={14} />
          ) : (
            <WifiIcon animateOnParentHover className="h-3.5 w-3.5" size={14} />
          )}
          {isOnline ? "Online" : "Offline"}
        </button>
        <button className="icon-button flex h-[30px] w-[30px] items-center justify-center text-[#7a6758] hover:bg-[#fbf7f2] hover:text-[#3a2218]" type="button" onClick={onOpenNotifications}>
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-[#fbf7f2] p-1 pr-2 rounded-full transition-colors duration-150">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3a2218] text-[11px] font-semibold text-[#f6823c]">
            {guestName.startsWith("Anonymous-") ? "AN" : guestName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden flex-col justify-center md:flex">
            <span className="text-[12px] font-semibold leading-tight text-[#25140b]">{guestName}</span>
            <span className="text-[10px] leading-tight text-[#7a6758]">guest@biblestudy.app</span>
          </div>
          <ChevronDown className="h-3 w-3 text-[#7a6758]" />
        </div>
      </div>
    </header>
  );
}
