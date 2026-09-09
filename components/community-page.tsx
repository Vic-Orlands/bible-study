"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bold,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Italic,
  Link2,
  List,
  MessageCircle,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ProductShell } from "@/components/product-shell";
import {
  WorkspaceCanvas,
  WorkspaceIconButton,
  WorkspaceMenu,
  WorkspaceMenuItem,
  WorkspacePill,
  WorkspaceRow,
  WorkspaceSection,
  WorkspaceSurface,
} from "@/components/workspace";
import { cn } from "@/lib/utils";

type Group = {
  description: string;
  id: string;
  members: number;
  name: string;
  passage: string;
  privacy: "Private" | "Public";
  progressLabel: string;
};

type Post = {
  avatar: string;
  badge?: string;
  id: string;
  liked: boolean;
  likes: number;
  name: string;
  replies: number;
  text: string;
  time: string;
  verse: string;
};

type Verse = {
  number: number;
  text: string;
};

const groups: Group[] = [
  {
    description: "Reading the prologue together, one verse at a time.",
    id: "john-1",
    members: 38,
    name: "John 1",
    passage: "John 1",
    privacy: "Public",
    progressLabel: "Verse 3 of 51",
  },
  {
    description: "A slower walk through the Gospel of John.",
    id: "gospel-john",
    members: 124,
    name: "Gospel of John",
    passage: "John 8",
    privacy: "Public",
    progressLabel: "Chapter 8 of 21",
  },
  {
    description: "A quiet circle for prayer and weekly reading.",
    id: "family",
    members: 1,
    name: "Family",
    passage: "Romans 8",
    privacy: "Private",
    progressLabel: "Just you",
  },
  {
    description: "Young adults gathering around the Sermon on the Mount.",
    id: "young-adults",
    members: 56,
    name: "Young Adults",
    passage: "Matthew 5",
    privacy: "Public",
    progressLabel: "Step 1 of 4",
  },
];

const suggestedGroups: Group[] = [
  {
    description: "Comfort from the psalms, one evening at a time.",
    id: "psalms-comfort",
    members: 802,
    name: "Psalms of Comfort",
    passage: "Psalms",
    privacy: "Public",
    progressLabel: "Join to begin",
  },
  {
    description: "Tracing grace through Romans with a shared thread.",
    id: "grace-romans",
    members: 1600,
    name: "Grace in Romans",
    passage: "Romans",
    privacy: "Public",
    progressLabel: "Join to begin",
  },
];

const johnVerses: Verse[] = [
  {
    number: 1,
    text: "In the beginning was the Word, and the Word was with God, and the Word was God.",
  },
  {
    number: 2,
    text: "The same was in the beginning with God.",
  },
  {
    number: 3,
    text: "All things were made by him; and without him was not any thing made that was made.",
  },
  {
    number: 4,
    text: "In him was life; and the life was the light of men.",
  },
  {
    number: 5,
    text: "And the light shineth in darkness; and the darkness comprehended it not.",
  },
  {
    number: 6,
    text: "There was a man sent from God, whose name was John.",
  },
  {
    number: 7,
    text: "The same came for a witness, to bear witness of the Light, that all men through him might believe.",
  },
  {
    number: 8,
    text: "He was not that Light, but was sent to bear witness of that Light.",
  },
];

const initialPosts: Post[] = [
  {
    avatar: "https://i.pravatar.cc/96?u=grace-community",
    badge: "Leader",
    id: "grace",
    liked: false,
    likes: 12,
    name: "Grace M.",
    replies: 3,
    text: "This verse shows that everything has purpose and origin in Him. What does that change in how we live day to day?",
    time: "2h ago",
    verse: "John 1:3",
  },
  {
    avatar: "https://i.pravatar.cc/96?u=ethan-community",
    id: "ethan",
    liked: false,
    likes: 8,
    name: "Ethan L.",
    replies: 1,
    text: "It reminds me that even the small things are not random.",
    time: "1h ago",
    verse: "John 1:3",
  },
  {
    avatar: "https://i.pravatar.cc/96?u=mia-community",
    id: "mia",
    liked: true,
    likes: 5,
    name: "Mia K.",
    replies: 0,
    text: "I keep coming back to “without him was not any thing made.” It makes ordinary work feel held.",
    time: "36m ago",
    verse: "John 1:3",
  },
];

const memberAvatars = [
  "https://i.pravatar.cc/96?u=study-1",
  "https://i.pravatar.cc/96?u=study-2",
  "https://i.pravatar.cc/96?u=study-3",
  "https://i.pravatar.cc/96?u=study-4",
];

export default function CommunityPage() {
  const [groupId, setGroupId] = useState(groups[0].id);
  const [joinedIds, setJoinedIds] = useState<string[]>([groups[0].id, groups[2].id]);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [verseIndex, setVerseIndex] = useState(2);
  const [posts, setPosts] = useState(initialPosts);
  const [composer, setComposer] = useState("");
  const [composerMode, setComposerMode] = useState<"insight" | "question">(
    "insight",
  );
  const [composerFocused, setComposerFocused] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const group = groups.find((item) => item.id === groupId) ?? groups[0];
  const verse = johnVerses[verseIndex] ?? johnVerses[0];
  const joined = joinedIds.includes(group.id);
  const myGroups = groups.filter((item) => joinedIds.includes(item.id));

  const toggleJoin = () => {
    setJoinedIds((current) => {
      if (current.includes(group.id)) {
        return current.filter((id) => id !== group.id);
      }
      return [...current, group.id];
    });
    toast.success(
      joined ? `Left ${group.name}` : `Joined ${group.name}`,
    );
  };

  const openGroup = (id: string) => {
    setGroupId(id);
    setGroupsOpen(false);
    setVerseIndex(2);
    setReplyingTo(null);
  };

  const postContribution = () => {
    const text = composer.trim();
    if (!text) {
      toast.error("Write a little before posting.");
      return;
    }
    const next: Post = {
      avatar: "https://i.pravatar.cc/96?u=you-community",
      id: `local-${Date.now()}`,
      liked: false,
      likes: 0,
      name: "You",
      replies: 0,
      text,
      time: "Just now",
      verse: `John 1:${verse.number}`,
    };
    setPosts((current) => [next, ...current]);
    setComposer("");
    setComposerFocused(false);
    setReplyingTo(null);
    toast.success(
      composerMode === "question" ? "Question posted." : "Insight posted.",
    );
  };

  return (
    <ProductShell>
      <WorkspaceSurface>
        <WorkspaceCanvas stacked>
          <div className="space-y-8">
            <header>
              <div className="-mx-5 -mt-6 overflow-hidden rounded-t-[28px] md:-mx-8 md:-mt-8">
                <div className="h-28 bg-[linear-gradient(120deg,#ead7ef_0%,#f3d4c4_48%,#f6e2b8_100%)]" />
              </div>
              <div className="relative -mt-7 flex items-end justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white bg-[#f4eef8] text-[#5b3d73] shadow-[0_8px_24px_rgba(37,20,11,0.08)]">
                  <Users className="h-6 w-6" />
                </div>
                <div className="relative mb-1" data-workspace-menu-root>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f1ec] px-3 py-1.5 text-[13px] font-medium text-[#3a322c] hover:bg-[#ece7df]"
                    onClick={() => setGroupsOpen((open) => !open)}
                    type="button"
                  >
                    Groups
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <WorkspaceMenu
                    onClose={() => setGroupsOpen(false)}
                    open={groupsOpen}
                    widthClassName="w-[340px]"
                  >
                    <p className="px-3 pb-1 pt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a8178]">
                      Your groups
                    </p>
                    {myGroups.map((item) => (
                      <WorkspaceMenuItem
                        active={item.id === group.id}
                        description={`${item.privacy} · ${item.members === 1 ? "Just you" : `${item.members} members`}`}
                        icon={<Users className="h-4 w-4" />}
                        key={item.id}
                        onClick={() => openGroup(item.id)}
                        title={item.name}
                      />
                    ))}
                    <p className="mt-1 border-t border-black/[0.05] px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a8178]">
                      Discover
                    </p>
                    {suggestedGroups.map((item) => (
                      <WorkspaceMenuItem
                        description={`${item.members.toLocaleString()} members`}
                        icon={<Plus className="h-4 w-4" />}
                        key={item.id}
                        onClick={() => {
                          setJoinedIds((current) =>
                            current.includes(item.id)
                              ? current
                              : [...current, item.id],
                          );
                          toast.success(`Joined ${item.name}`);
                          setGroupsOpen(false);
                        }}
                        title={item.name}
                      />
                    ))}
                  </WorkspaceMenu>
                </div>
              </div>

              <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.035em] text-[#171412]">
                {group.name}
              </h1>
              <p className="mt-1 text-[14px] text-[#8a8178]">
                {joined
                  ? group.privacy === "Private"
                    ? "Just you · Invite"
                    : `${group.members} members · ${group.privacy}`
                  : `${group.members} members · ${group.privacy}`}
                <button
                  className="ml-2 font-medium text-[#171412] underline-offset-2 hover:underline"
                  onClick={toggleJoin}
                  type="button"
                >
                  {joined ? "Leave" : "Join"}
                </button>
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center">
                  {memberAvatars.map((src, index) => (
                    <Image
                      alt=""
                      className={cn(
                        "h-7 w-7 rounded-full border-2 border-white object-cover",
                        index > 0 && "-ml-2",
                      )}
                      height={28}
                      key={src}
                      src={src}
                      width={28}
                    />
                  ))}
                </div>
                <span className="text-[13px] text-[#8a8178]">
                  The thread is open.
                </span>
              </div>
            </header>

            <WorkspaceSection label="Current thread">
              <div className="rounded-2xl bg-[#f7f5f2] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#171412]">
                    Going through {group.passage}
                  </p>
                  <div className="flex items-center gap-1">
                    <WorkspaceIconButton
                      aria-label="Previous verse"
                      onClick={() =>
                        setVerseIndex((index) => Math.max(0, index - 1))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </WorkspaceIconButton>
                    <WorkspaceIconButton
                      aria-label="Next verse"
                      onClick={() =>
                        setVerseIndex((index) =>
                          Math.min(johnVerses.length - 1, index + 1),
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </WorkspaceIconButton>
                  </div>
                </div>
                <p className="mt-1 text-[13px] text-[#8a8178]">
                  {group.progressLabel}
                </p>
                <p className="mt-4 text-[16px] leading-7 text-[#171412]">
                  {verse.text}
                </p>
                <div className="mt-3">
                  <WorkspacePill>
                    {group.passage} : {verse.number}
                  </WorkspacePill>
                </div>
              </div>
            </WorkspaceSection>

            {noticeVisible ? (
              <button
                className="flex w-full items-center gap-3 rounded-2xl bg-[#f4f1ec] px-3 py-3 text-left hover:bg-[#ece7df]"
                onClick={() => setNoticeVisible(false)}
                type="button"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-[#3a322c]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-[#171412]">
                    What’s new in Community
                  </span>
                  <span className="block text-[13px] text-[#8a8178]">
                    Share one insight on the verse in front of you.
                  </span>
                </span>
                <X className="h-4 w-4 text-[#b4ada6]" />
              </button>
            ) : null}

            <WorkspaceSection
              action={
                <span className="text-[13px] text-[#8a8178]">Newest</span>
              }
              label="Discussion"
            >
              {posts.map((post) => (
                <article
                  className="flex gap-3 rounded-2xl px-1 py-3.5"
                  key={post.id}
                >
                  <Image
                    alt=""
                    className="mt-0.5 h-9 w-9 rounded-full object-cover"
                    height={36}
                    src={post.avatar}
                    width={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-[#171412]">
                        {post.name}
                      </span>
                      <span className="text-[12px] text-[#8a8178]">
                        {post.time}
                      </span>
                      {post.badge ? (
                        <WorkspacePill>{post.badge}</WorkspacePill>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[15px] leading-6 text-[#2b2622]">
                      {post.text}
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                      <WorkspacePill>{post.verse}</WorkspacePill>
                      <button
                        className={cn(
                          "inline-flex min-h-8 items-center gap-1.5 text-[13px] font-medium",
                          post.liked ? "text-[#171412]" : "text-[#8a8178] hover:text-[#171412]",
                        )}
                        onClick={() =>
                          setPosts((current) =>
                            current.map((item) =>
                              item.id === post.id
                                ? {
                                    ...item,
                                    liked: !item.liked,
                                    likes: item.liked
                                      ? item.likes - 1
                                      : item.likes + 1,
                                  }
                                : item,
                            ),
                          )
                        }
                        type="button"
                      >
                        <Heart
                          className={cn("h-4 w-4", post.liked && "fill-current")}
                        />
                        {post.likes}
                      </button>
                      <button
                        className="inline-flex min-h-8 items-center gap-1.5 text-[13px] font-medium text-[#8a8178] hover:text-[#171412]"
                        onClick={() => {
                          setReplyingTo(post.name);
                          setComposerMode("insight");
                          setComposerFocused(true);
                          setComposer((value) =>
                            value ? value : `Replying to ${post.name}: `,
                          );
                        }}
                        type="button"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {post.replies > 0 ? `Reply · ${post.replies}` : "Reply"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </WorkspaceSection>

            <section className="rounded-[22px] bg-[#f7f5f2] p-4">
              <div className="mb-3 flex items-center gap-1">
                {[
                  ["insight", "Insight"],
                  ["question", "Question"],
                ].map(([value, label]) => (
                  <button
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[13px] font-medium",
                      composerMode === value
                        ? "bg-white text-[#171412] shadow-[0_1px_2px_rgba(37,20,11,0.06)]"
                        : "text-[#8a8178] hover:text-[#171412]",
                    )}
                    key={value}
                    onClick={() =>
                      setComposerMode(value as "insight" | "question")
                    }
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              {replyingTo ? (
                <div className="mb-2 flex items-center justify-between text-[12px] text-[#8a8178]">
                  <span>Replying to {replyingTo}</span>
                  <button
                    className="hover:text-[#171412]"
                    onClick={() => setReplyingTo(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
              <textarea
                className="min-h-[92px] w-full resize-none bg-transparent text-[15px] leading-6 text-[#171412] outline-none placeholder:text-[#b4ada6]"
                onBlur={() => {
                  if (!composer.trim()) setComposerFocused(false);
                }}
                onChange={(event) => setComposer(event.target.value)}
                onFocus={() => setComposerFocused(true)}
                placeholder={
                  composerMode === "question"
                    ? `Ask about John 1:${verse.number}…`
                    : `Share a thought on John 1:${verse.number}…`
                }
                value={composer}
              />
              <AnimatePresence>
                {composerFocused || composer.trim() ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center justify-between gap-3 border-t border-black/[0.05] pt-3"
                    exit={{ opacity: 0, y: 6 }}
                    initial={{ opacity: 0, y: 6 }}
                  >
                    <div className="flex items-center gap-1 text-[#8a8178]">
                      <WorkspaceIconButton aria-label="Bold" type="button">
                        <Bold className="h-4 w-4" />
                      </WorkspaceIconButton>
                      <WorkspaceIconButton aria-label="Italic" type="button">
                        <Italic className="h-4 w-4" />
                      </WorkspaceIconButton>
                      <WorkspaceIconButton aria-label="List" type="button">
                        <List className="h-4 w-4" />
                      </WorkspaceIconButton>
                      <WorkspaceIconButton aria-label="Link" type="button">
                        <Link2 className="h-4 w-4" />
                      </WorkspaceIconButton>
                    </div>
                    <button
                      className="rounded-full bg-[#171412] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2a221c]"
                      onClick={postContribution}
                      type="button"
                    >
                      Post
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </section>

            <WorkspaceSection label="Suggested">
              {suggestedGroups.map((item) => (
                <WorkspaceRow
                  icon={<Users className="h-4 w-4" />}
                  key={item.id}
                  meta={`${item.members.toLocaleString()} members · ${item.passage}`}
                  onClick={() => {
                    setJoinedIds((current) =>
                      current.includes(item.id) ? current : [...current, item.id],
                    );
                    toast.success(`Joined ${item.name}`);
                  }}
                  title={item.name}
                  trailing={
                    <span className="text-[12px] font-medium text-[#171412]">
                      Join
                    </span>
                  }
                />
              ))}
            </WorkspaceSection>
          </div>
        </WorkspaceCanvas>
      </WorkspaceSurface>
    </ProductShell>
  );
}
