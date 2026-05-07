"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { motion } from "motion/react";
import { Bell, BookOpen, CalendarDays, CheckCircle2, ChevronDown, Users } from "lucide-react";

import BibleLogo from "@/components/logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/bible", label: "Study", icon: BookOpen },
  { href: "/reading-plan", label: "Reading Plan", icon: CalendarDays },
  { href: "/community", label: "Community", icon: Users },
];

export function ProductShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      duration: 0.9,
      easing: (time: number) => Math.min(1, 1.001 - 2 ** (-10 * time)),
      wrapper: window,
    });

    return () => lenis.destroy();
  }, []);

  return (
    <main className="bible-app flex h-screen flex-col overflow-hidden bg-white">
      <ProductTopNav />
      {children}
    </main>
  );
}

function ProductTopNav() {
  const pathname = usePathname();

  return (
    <header className="z-10 flex h-14 shrink-0 items-center gap-4 border-b border-[#f1e8df] bg-white px-5">
      <Link className="flex w-[220px] items-center gap-2" href="/bible">
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
        <button className="cta-button hidden items-center gap-1.5 border border-[#f1e8df] bg-[#fbf7f2] px-3 py-1.5 text-[13px] font-semibold text-[#2e6b3d] md:flex" type="button">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Offline Ready
        </button>
        <button className="icon-button flex h-[30px] w-[30px] items-center justify-center text-[#7a6758] hover:bg-[#fbf7f2] hover:text-[#3a2218]" type="button">
          <Bell className="h-4 w-4" />
        </button>
        <button className="icon-button flex h-8 w-8 items-center justify-center bg-[#3a2218] text-sm font-semibold text-[#f6823c]" type="button">
          JD
        </button>
        <ChevronDown className="h-3.5 w-3.5 text-[#7a6758]" />
      </div>
    </header>
  );
}
