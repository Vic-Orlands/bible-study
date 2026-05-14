"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  Headphones,
  Calendar,
  Share2,
  Search,
  DownloadCloud,
  PenTool,
} from "lucide-react";
import Image from "next/image";
import { motion } from "motion/react";

const allFeatures = [
  {
    id: "multi-trans",
    icon: BookOpen,
    title: "Multi-Translation Reader",
    description:
      "Read the Bible in 8+ translations with beautiful, distraction-free formatting tailored for deep study.",
  },
  {
    id: "compare",
    icon: Share2,
    title: "Compare Translations",
    description:
      "View the same verse side-by-side in different Bible versions to capture the full nuance of the original text.",
  },
  {
    id: "groups",
    icon: Users,
    title: "Study Groups",
    description:
      "Create or join study groups. Journey alongside your community, share private thoughts, and grow together.",
  },
  {
    id: "search",
    icon: Search,
    title: "Searchable Index",
    description:
      "Find verses, themes, and insights quickly with our lightning-fast, powerful semantic search engine.",
  },
  {
    id: "audio",
    icon: Headphones,
    title: "Audio Notes & Bibles",
    description:
      "Record audio notes with automatic transcriptions, or listen to high-quality dramatized audio Bibles on the go.",
  },
  {
    id: "plans",
    icon: Calendar,
    title: "Reading Plans",
    description:
      "Stay on track with customizable daily reading plans and devotional structures that fit your spiritual rhythm.",
  },
  {
    id: "collab",
    icon: PenTool,
    title: "Collaborative Study Notes",
    description:
      "Create detailed study notes for verses. Organize your thoughts with text, files, and annotations shared instantly.",
  },
  {
    id: "offline",
    icon: DownloadCloud,
    title: "Works Offline",
    description:
      "Download scripture and notes for offline access. Sync automatically the moment you reconnect.",
  },
];

const highlightFeatures = [
  { term: "Multi-version", text: "8+ translations with beautiful typography" },
  { term: "Social", text: "create groups and share collaborative notes" },
  { term: "Offline", text: "full access without internet connection" },
  { term: "Audio", text: "record notes and get automatic transcriptions" },
];

export default function HomePage() {
  return (
    <main className="flex flex-col md:flex-row h-screen bg-[#0E0E0E] text-white md:overflow-hidden selection:bg-white/20">
      {/* Left Static Panel */}
      <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col justify-between p-8 md:p-12 lg:p-16 relative z-10 bg-background border-r border-border md:h-screen shrink-0 overflow-y-auto scrollbar-hide">

        
        {/* Header */}
        <header className="flex items-center justify-between z-20">
          <div className="flex items-center gap-2 font-serif text-xl tracking-tight font-medium">
            <BookOpen className="size-6 text-neutral-300" />
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
              href="/login"
              className="px-3 py-1.5 rounded-full border border-border hover:bg-white/5 transition-colors text-foreground"
            >
              Sign In
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col justify-center mt-20 mb-16 md:my-0 pb-8 min-h-[40vh]">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-balance leading-[1.05]"
          >
            Explore Scripture Together
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="text-lg text-muted-foreground text-balance mt-6 max-w-md"
          >
            A modern Bible study platform for reading, comparing translations,
            and deepening your spiritual journey with a community.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="flex items-center gap-4 mt-8"
          >
            <Link href="/study">
              <Button
                size="lg"
                className="bg-[#2A2A2A] text-white hover:bg-[#333] border-none shadow-sm gap-2 h-12 rounded-xl px-6 text-base font-medium"
              >
                <BookOpen className="size-5 text-neutral-400" />
                Start Reading
              </Button>
            </Link>
            <span className="text-sm font-medium tracking-wide text-neutral-500 uppercase px-2 py-1 bg-white/5 rounded-md border border-white/10 hidden sm:inline-block">
              Free Access
            </span>
          </motion.div>
        </div>

        {/* Highlight Features Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="space-y-3 pt-8 pb-4"
        >
          {highlightFeatures.map((feat, i) => (
            <div
              key={i}
              className="text-[14px] lg:text-[15px]  text-neutral-400 leading-tight"
            >
              <strong className="text-white font-medium">{feat.term}</strong>{" "}
              {feat.text}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right Scrolling Image Panel */}
      <div className="w-full md:w-[55%] lg:w-[60%] h-[50vh] md:h-screen md:overflow-y-auto bg-[#131313] md:snap-y md:snap-mandatory scroll-smooth relative">
        <div className="py-12 md:py-32 px-4 md:px-12 lg:px-24 space-y-24 md:space-y-48">
          {allFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full aspect-[4/3] sm:aspect-[16/10] md:snap-center relative flex flex-col group isolation-auto"
              >
                {/* Mockup Container Background (Simulating Apple/MacOS UI frame) */}
                <div className="absolute inset-0 rounded-[20px] md:rounded-[32px] overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl transition-all duration-700">
                  {/* Mock Window Controls */}
                  <div className="h-10 w-full bg-[#1e1e1e] border-b border-white/5 flex items-center px-4 gap-2 z-20 relative">
                    <div className="size-3 rounded-full bg-[#FF5F56] shadow-[inset_0px_1px_2px_rgba(255,255,255,0.2)]"></div>
                    <div className="size-3 rounded-full bg-[#FFBD2E] shadow-[inset_0px_1px_2px_rgba(255,255,255,0.2)]"></div>
                    <div className="size-3 rounded-full bg-[#27C93F] shadow-[inset_0px_1px_2px_rgba(255,255,255,0.2)]"></div>
                    <div className="flex-1 flex justify-center opacity-40">
                      <div className="w-1/3 max-w-[200px] h-5 bg-black/40 rounded-md"></div>
                    </div>
                  </div>

                  {/* Feature Image */}
                  <div className="relative w-full h-[calc(100%-40px)] bg-[#111]">
                    <Image
                      src={`https://picsum.photos/seed/${feature.id}bible/1200/900`}
                      alt={feature.title}
                      fill
                      className="object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      unoptimized
                    />
                    {/* Bottom Gradient for text readability */}
                    <div className="absolute bottom-0 inset-x-0 h-2/3 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/80 to-transparent pointer-events-none" />
                  </div>
                </div>

                {/* Floating Feature Overlay */}
                <div className="absolute bottom-4 inset-x-4 md:bottom-8 md:inset-x-8 z-30 pointer-events-none">
                  <div className="backdrop-blur-xl bg-black/50 border border-white/10 p-5 md:p-6 rounded-2xl shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/10 rounded-xl shrink-0">
                        <Icon className="size-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-white tracking-tight">
                          {feature.title}
                        </h3>
                        <p className="text-sm md:text-base text-neutral-300 mt-1 max-w-lg leading-relaxed text-balance">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
