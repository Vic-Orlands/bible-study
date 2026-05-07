"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Headphones,
  Search,
  Share2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BibleLogo from "@/components/logo";
import { ArrowRightIcon } from "@/components/ui/arrow-right";

const features = [
  {
    icon: BookOpen,
    title: "Multi-Translation Reader",
    text: "Read Scripture across 8+ translations with focused, beautiful formatting.",
    image:
      "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1400&q=80",
  },
  {
    icon: Share2,
    title: "Compare Translations",
    text: "Place versions side by side and trace meaning across every verse.",
    image:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1400&q=80",
  },
  {
    icon: Users,
    title: "Study Groups",
    text: "Create circles, discuss passages, and study with people you trust.",
    image:
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1400&q=80",
  },
  {
    icon: Search,
    title: "Searchable Index",
    text: "Find verses, notes, people, topics, and insights without losing your place.",
    image:
      "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1400&q=80",
  },
  {
    icon: Headphones,
    title: "Audio Notes",
    text: "Record reflections after study and turn them into searchable transcripts.",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
  },
  {
    icon: Calendar,
    title: "Reading Plans",
    text: "Build daily rhythms, track progress, and keep your plans in sync offline.",
    image:
      "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=1400&q=80",
  },
];

const featureLines = [
  ["Private", "your notes and highlights belong to your own study library"],
  ["Blazing fast", "chapter lookup, search, and translation switching"],
  ["Offline ready", "download passages and notes before you leave signal"],
  [
    "Collaborative",
    "groups, comments, attachments, and shared insight threads",
  ],
  ["Audio notes", "record reflections with automatic transcription"],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <section className="grid h-[calc(100vh)] lg:grid-cols-[70%_30%] xl:grid-cols-[70%_30%]">
        <div className="relative flex flex-col px-6 pb-8 md:px-9">
          <nav className="flex items-center justify-between z-20 mb-20 pt-10">
            <div className="flex items-center gap-2 font-serif text-xl tracking-tight font-medium">
              <BibleLogo />
              <span className="sr-only">Bible App</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
              <Link
                href="/updates"
                className="hover:text-foreground transition-colors"
              >
                Updates
              </Link>
              <Link
                href="/auth/login"
                className="px-3 py-1.5 rounded-full border border-border hover:bg-white/5 transition-colors text-foreground"
              >
                Sign In
              </Link>
            </div>
          </nav>

          <div className="hero-copy max-w-[880px]">
            <h1 className="max-w-[980px] text-[clamp(3.2rem,4vw,5rem)] font-semibold leading-[1.02] tracking-normal text-white">
              Fast and lightweight app for studying scripture together
            </h1>
            <Button
              asChild
              size="lg"
              className="rounded-full mt-8 text-base shadow-glow"
            >
              <Link href="/study">
                Start Reading
                <ArrowRightIcon animateOnParentHover className="ml-1" />
              </Link>
            </Button>

            <p className="mt-7 text-base font-semibold text-white/45">
              Free for personal study. Built for community.
            </p>
          </div>

          <div className="mt-24 w-full max-w-[780px] space-y-2 text-[18px] font-semibold leading-7 text-white md:mt-auto">
            {featureLines.map(([lead, rest]) => (
              <p key={lead}>
                <span className="text-white">{lead}</span>{" "}
                <span className="text-white/45">{rest}</span>
              </p>
            ))}
          </div>
        </div>

        <aside
          id="features"
          className="feature-rail overflow-y-auto border-l border-white/[0.07] lg:sticky"
        >
          <div className="divide-y divide-[#141414]">
            {features.map(({ icon: Icon, title, text, image }, index) => (
              <article
                key={title}
                className="feature-panel relative min-h-[390px] overflow-hidden bg-[#152534] md:min-h-[430px] lg:min-h-[390px]"
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 30vw, 100vw"
                  className="object-cover"
                  priority={index < 2}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,14,16,0.1)_0%,rgba(245,95,31,0.42)_62%,rgba(245,95,31,0.96)_100%)]" />
                <div className="absolute inset-x-[10%] top-[11%] rounded-lg border border-white/10 bg-[#111]/88 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-sm">
                  <div className="mb-4 flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="grid grid-cols-[90px_1fr] gap-4 text-[11px] text-white/52">
                    <div className="space-y-2">
                      {["Genesis", "Psalms", "John", "Romans", "Notes"].map(
                        (item) => (
                          <div
                            key={item}
                            className="rounded bg-white/[0.04] px-2 py-1"
                          >
                            {item}
                          </div>
                        ),
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 w-36 rounded bg-white/10" />
                      <div className="space-y-1.5">
                        <div className="h-2 w-full rounded bg-white/10" />
                        <div className="h-2 w-10/12 rounded bg-white/10" />
                        <div className="h-2 w-8/12 rounded bg-accent/60" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-14 rounded bg-white/[0.06]" />
                        <div className="h-14 rounded bg-white/[0.06]" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="rounded-lg border border-white/15 bg-black/50 p-4 backdrop-blur-md">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-orange-300" />
                      <h2 className="text-lg font-semibold">{title}</h2>
                    </div>
                    <p className="text-sm leading-5 text-white/72">{text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
