"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Anchor,
  ArrowUp,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Heart,
  Link2,
  List,
  MessageCircle,
  Mic,
  Share2,
  Upload,
  Users,
} from "lucide-react";

import { ProductShell } from "@/components/product-shell";
import { cn } from "@/lib/utils";

const communities = ["John 1 Study Group", "Gospel of John", "Women's Fellowship", "Young Adults"];

const popularStudies = [
  ["Sermon on the Mount", "Matthew 5-7 · 1.2K members", "https://i.pravatar.cc/96?u=mount"],
  ["Psalms of Comfort", "Psalms · 802 members", "https://i.pravatar.cc/96?u=psalms"],
  ["Grace in Romans", "Romans · 1.6K members", "https://i.pravatar.cc/96?u=romans"],
];

const members = [
  "https://i.pravatar.cc/96?u=study-1",
  "https://i.pravatar.cc/96?u=study-2",
  "https://i.pravatar.cc/96?u=study-3",
  "https://i.pravatar.cc/96?u=study-4",
];

export default function CommunityPage() {
  return (
    <ProductShell>
      <div className="flex min-h-0 flex-1 overflow-hidden bg-white">
        <CommunityRail />
        <motion.main
          animate={{ opacity: 1, y: 0 }}
          className="bible-app-scroll min-w-0 flex-1 overflow-y-auto p-5"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
        >
          <section className="border border-[#f1e8df] bg-white p-6 shadow-[0_14px_42px_rgba(31,18,9,0.04)]">
            <GroupHeader />
            <VerseNavigator />
            <Discussion />
          </section>
        </motion.main>
        <ContributionPanel />
      </div>
    </ProductShell>
  );
}

function CommunityRail() {
  return (
    <aside className="hidden w-[292px] shrink-0 border-r border-[#f1e8df] bg-white p-4 lg:block">
      <RailBlock title="My Communities">
        {communities.map((community, index) => (
          <button
            className={cn(
              "flex w-full items-center gap-3 px-3 py-3 text-left text-[13px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]",
              index === 0 && "bg-[#f5efe7] text-[#25140b]",
            )}
            key={community}
            type="button"
          >
            <Users className="h-4 w-4 text-[#7a6758]" />
            {community}
          </button>
        ))}
      </RailBlock>

      <RailBlock title="Popular Studies">
        {popularStudies.map(([title, meta, avatar]) => (
          <button className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-[#fbf7f2]" key={title} type="button">
            <img alt="" className="h-8 w-8 rounded-full object-cover" src={avatar} />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-[#3a2218]">{title}</span>
              <span className="block truncate text-[11px] font-medium text-[#9b8878]">{meta}</span>
            </span>
          </button>
        ))}
        <button className="cta-button mt-3 w-full border border-[#e5d6c9] px-3 py-2 text-[12px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]" type="button">
          View All
        </button>
      </RailBlock>
    </aside>
  );
}

function RailBlock({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="mb-4 border border-[#f1e8df] bg-white p-4">
      <h2 className="mb-3 text-[13px] font-semibold text-[#25140b]">{title}</h2>
      {children}
    </section>
  );
}

function GroupHeader() {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-[#f1e8df] pb-5">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-3xl font-semibold text-[#25140b]">John 1 Study Group</h1>
          <span className="border border-[#f1e8df] bg-[#fbf7f2] px-3 py-1 text-[11px] font-semibold text-[#7a6758]">Public Study</span>
        </div>
        <p className="mt-2 text-[13px] font-medium text-[#5d493a]">Exploring the prologue to John’s Gospel together.</p>
        <div className="mt-4 flex items-center gap-3">
          <AvatarStack />
          <span className="text-[12px] font-medium text-[#7a6758]">+34 members</span>
        </div>
      </div>
      <button className="cta-button bg-[#2e6b3d] px-7 py-3 text-sm font-semibold text-white hover:bg-[#245632]" type="button">
        Join
      </button>
    </div>
  );
}

function AvatarStack() {
  return (
    <div className="flex items-center">
      {members.map((src, index) => (
        <img
          alt=""
          className={cn("h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm", index > 0 && "-ml-3")}
          key={src}
          src={src}
        />
      ))}
    </div>
  );
}

function VerseNavigator() {
  return (
    <div className="border-b border-[#f1e8df] py-5">
      <div className="mb-5 flex items-center justify-center gap-4">
        <button className="flex h-8 w-8 items-center justify-center text-[#7a6758] hover:text-[#3a2218]" type="button">
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button className="flex h-8 w-8 items-center justify-center text-[#7a6758] hover:text-[#3a2218]" type="button">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-serif text-xl font-semibold text-[#25140b]">John 1 : 3</span>
        <button className="flex h-8 w-8 items-center justify-center text-[#7a6758] hover:text-[#3a2218]" type="button">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button className="flex h-8 w-8 items-center justify-center text-[#7a6758] hover:text-[#3a2218]" type="button">
          <ChevronsRight className="h-4 w-4" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button className="icon-button flex h-9 w-9 items-center justify-center border border-[#f1e8df] text-[#7a6758] hover:bg-[#fbf7f2]" type="button">
            <Bookmark className="h-4 w-4" />
          </button>
          <button className="icon-button flex h-9 w-9 items-center justify-center border border-[#f1e8df] text-[#7a6758] hover:bg-[#fbf7f2]" type="button">
            <Share2 className="h-4 w-4" />
          </button>
          <button className="icon-button flex h-9 w-9 items-center justify-center border border-[#f1e8df] text-[#7a6758] hover:bg-[#fbf7f2]" type="button">
            <Upload className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-start gap-5 bg-[#fff3e8] px-7 py-5">
        <span className="text-sm font-semibold text-[#d5a12c]">3</span>
        <p className="font-serif text-lg leading-8 text-[#25140b]">
          All things were made by him; and without him was not any thing made that was made.
        </p>
        <Bookmark className="ml-auto h-6 w-6 shrink-0 fill-[#d5a12c] text-[#d5a12c]" />
      </div>
    </div>
  );
}

function Discussion() {
  return (
    <section className="pt-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#25140b]">Insights & Discussion</h2>
        <button className="cta-button flex items-center gap-2 border border-[#e5d6c9] px-4 py-2 text-[12px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]" type="button">
          Newest
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <Comment
        avatar="https://i.pravatar.cc/96?u=grace-community"
        badge="Leader"
        likes={12}
        name="Grace M."
        text="This verse shows that everything has purpose and origin in Him. What does that change in how we live day to day?"
        time="2h ago"
      />
      <Comment
        avatar="https://i.pravatar.cc/96?u=ethan-community"
        likes={8}
        name="Ethan L."
        text="It reminds me that even the small things are not random."
        time="1h ago"
      />
    </section>
  );
}

function Comment({
  avatar,
  badge,
  likes,
  name,
  text,
  time,
}: {
  avatar: string;
  badge?: string;
  likes: number;
  name: string;
  text: string;
  time: string;
}) {
  return (
    <article className="mb-5 flex gap-3">
      <img alt="" className="h-8 w-8 rounded-full object-cover" src={avatar} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#25140b]">{name}</span>
          <span className="text-[11px] font-medium text-[#9b8878]">{time}</span>
          {badge && <span className="bg-[#e8f4e9] px-2 py-0.5 text-[10px] font-semibold text-[#2e6b3d]">{badge}</span>}
        </div>
        <p className="max-w-[620px] text-[14px] leading-6 text-[#3a2218]">{text}</p>
        <div className="mt-3 flex items-center gap-5">
          <button className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7a6758] hover:text-[#3a2218]" type="button">
            <Heart className="h-3.5 w-3.5" />
            {likes}
          </button>
          <button className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7a6758] hover:text-[#3a2218]" type="button">
            <MessageCircle className="h-3.5 w-3.5" />
            Reply
          </button>
        </div>
      </div>
    </article>
  );
}

function ContributionPanel() {
  const [tab, setTab] = useState<"insight" | "question">("insight");

  return (
    <aside className="hidden w-[390px] shrink-0 border-l border-[#f1e8df] bg-white p-4 xl:block">
      <div className="border border-[#f1e8df] bg-white">
        <div className="relative flex border-b border-[#f1e8df]">
          {[
            ["insight", "Share an Insight"],
            ["question", "Ask a Question"],
          ].map(([value, label]) => (
            <button
              className={cn("relative h-12 flex-1 text-[13px] font-semibold", tab === value ? "text-[#2e6b3d]" : "text-[#7a6758]")}
              key={value}
              onClick={() => setTab(value as "insight" | "question")}
              type="button"
            >
              {label}
              {tab === value && (
                <motion.span
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-[#2e6b3d]"
                  layoutId="community-compose-tab"
                  transition={{ duration: 0.22, ease: [0.645, 0.045, 0.355, 1] }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          <textarea
            className="min-h-[132px] w-full resize-none border border-[#f1e8df] bg-white p-4 text-sm leading-6 text-[#3a2218] outline-none placeholder:text-[#b09d8d] focus:border-[#f6823c]"
            placeholder={tab === "insight" ? "Share your thoughts on John 1:3...\nBe respectful and build others up." : "Ask your question about John 1:3...\nInvite others into the passage."}
          />
          <div className="mt-3 flex items-center gap-5 border-y border-[#f1e8df] py-3">
            {[
              ["B", "font-semibold"],
              ["I", "italic"],
              ["List", ""],
              ["Quote", ""],
            ].map(([label, style]) => (
              <button className={cn("text-sm text-[#3a2218] hover:text-[#f6823c]", style)} key={label} type="button">
                {label === "List" ? <List className="h-4 w-4" /> : label === "Quote" ? "“”" : label}
              </button>
            ))}
            <button className="ml-auto text-[#3a2218] hover:text-[#f6823c]" type="button">
              <Link2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex gap-3">
            <button className="cta-button flex flex-1 items-center justify-center gap-2 border border-[#e5d6c9] px-3 py-2 text-[12px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]" type="button">
              <FileText className="h-3.5 w-3.5" />
              Attach File
            </button>
            <button className="cta-button flex flex-1 items-center justify-center gap-2 border border-[#e5d6c9] px-3 py-2 text-[12px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]" type="button">
              <Anchor className="h-3.5 w-3.5" />
              Audio Note
            </button>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-[#25140b]">Contribute as guest (optional)</h3>
            <label className="mt-3 block text-[12px] font-semibold text-[#5d493a]">Name</label>
            <input className="mt-1 h-10 w-full border border-[#f1e8df] px-3 text-sm text-[#3a2218] outline-none placeholder:text-[#b09d8d] focus:border-[#f6823c]" placeholder="Michael" />
            <label className="mt-3 block text-[12px] font-semibold text-[#5d493a]">Email (optional)</label>
            <input className="mt-1 h-10 w-full border border-[#f1e8df] px-3 text-sm text-[#3a2218] outline-none placeholder:text-[#b09d8d] focus:border-[#f6823c]" placeholder="you@example.com" />
            <button className="cta-button mt-4 flex w-full items-center justify-center gap-2 bg-[#2e6b3d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#245632]" type="button">
              Post {tab === "insight" ? "Insight" : "Question"}
              <ArrowUp className="h-4 w-4" />
            </button>
            <p className="mt-4 text-center text-[12px] text-[#7a6758]">
              or <span className="font-semibold text-[#2e6b3d]">Sign in for full experience</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
