"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "@/components/shell/app-shell";
import { RichScriptureText } from "@/components/rich-scripture-text";
import { identityArgs } from "@/lib/identity";
import { useStudyStore } from "@/lib/study-store";
import { cn } from "@/lib/utils";

type CommentDoc = {
  _id: Id<"comments">;
  _creationTime: number;
  content: string;
  guestName?: string;
  likes: string[];
  ownerKey?: string;
  parentId?: Id<"comments">;
  passageVerse: number;
};

export default function GroupsPage() {
  const passage = useStudyStore((state) => state.selectedPassage);
  const identityId = useStudyStore((state) => state.identityId);
  const focusedCommentId = useStudyStore((state) => state.focusedCommentId);
  const visibleVersions = useStudyStore((state) => state.visibleVersions);
  const comments = useQuery(api.comments.list, {
    passageBook: passage.book,
    passageChapter: passage.chapter,
  }) as CommentDoc[] | undefined;
  const stats = useQuery(api.activity.statsForPassage, {
    ...identityArgs(identityId),
    passageBook: passage.book,
    passageChapter: passage.chapter,
  });
  const createComment = useMutation(api.comments.create);
  const updateComment = useMutation(api.comments.update);
  const removeComment = useMutation(api.comments.remove);
  const toggleLike = useMutation(api.comments.toggleLike);
  const [verseFilter, setVerseFilter] = useState<number | null>(passage.verse);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<Id<"comments"> | null>(null);
  const [editing, setEditing] = useState<Id<"comments"> | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    setVerseFilter(passage.verse);
  }, [passage.book, passage.chapter, passage.verse]);

  useEffect(() => {
    if (!focusedCommentId) return;
    document.getElementById(`comment-${focusedCommentId}`)?.scrollIntoView({ block: "center" });
  }, [comments, focusedCommentId]);

  const threads = useMemo(() => {
    const list = comments ?? [];
    const top = list.filter((comment) => !comment.parentId && (verseFilter == null || comment.passageVerse === verseFilter));
    return top.map((comment) => ({
      comment,
      replies: list.filter((reply) => reply.parentId === comment._id),
    }));
  }, [comments, verseFilter]);

  const verses = useMemo(
    () => [...new Set((comments ?? []).map((comment) => comment.passageVerse))].sort((a, b) => a - b),
    [comments],
  );

  const send = async () => {
    if (!content.trim()) return;
    try {
      await createComment({
        ...identityArgs(identityId),
        passageBook: passage.book,
        passageChapter: passage.chapter,
        passageVerse: verseFilter ?? passage.verse,
        translationLabel: visibleVersions[0] ?? "Bible",
        content: content.trim(),
        parentId: replyTo ?? undefined,
      });
      setContent("");
      setReplyTo(null);
    } catch (error) {
      console.error("Failed to post discussion:", error);
      toast.error("Could not post");
    }
  };

  return (
    <AppShell>
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
          <header>
            <h1 className="text-[length:var(--text-xl)] font-medium">Groups</h1>
            <p className="text-[length:var(--text-sm)] text-[var(--mute)]">
              {passage.book} {passage.chapter}
              {stats
                ? ` · ${stats.commentCount} discussions · ${stats.noteCount} notes · ${stats.audioCount} audio`
                : ""}
            </p>
          </header>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={verseFilter == null} label="Chapter" onClick={() => setVerseFilter(null)} />
            {verses.map((verse) => (
              <FilterChip
                active={verseFilter === verse}
                key={verse}
                label={`${verse}`}
                onClick={() => setVerseFilter(verse)}
              />
            ))}
          </div>
          <div className="space-y-3">
            {threads.length === 0 ? (
              <p className="text-[length:var(--text-sm)] text-[var(--mute)]">No discussion on this passage yet.</p>
            ) : (
              threads.map(({ comment, replies }) => (
                <article
                  className="rounded-2xl border border-[var(--line)] bg-[var(--sheet)] p-3"
                  id={`comment-${comment._id}`}
                  key={comment._id}
                >
                  <CommentBody
                    comment={comment}
                    editing={editing === comment._id}
                    editDraft={editDraft}
                    identityId={identityId}
                    onDelete={() => {
                      void removeComment({ id: comment._id, ...identityArgs(identityId) }).catch((error) => {
                        console.error(error);
                        toast.error("Could not delete discussion");
                      });
                    }}
                    onEdit={() => {
                      setEditing(comment._id);
                      setEditDraft(comment.content);
                    }}
                    onLike={() => {
                      void toggleLike({ id: comment._id, ...identityArgs(identityId) }).catch((error) => {
                        console.error(error);
                        toast.error("Could not update like");
                      });
                    }}
                    onReply={() => setReplyTo(comment._id)}
                    onSave={async () => {
                      try {
                        await updateComment({
                          id: comment._id,
                          ...identityArgs(identityId),
                          content: editDraft,
                        });
                        setEditing(null);
                      } catch (error) {
                        console.error(error);
                        toast.error("Could not update discussion");
                      }
                    }}
                    setEditDraft={setEditDraft}
                  />
                  <div className="mt-3 space-y-3 border-l border-[var(--line)] pl-3">
                    {replies.map((reply) => (
                      <CommentBody
                        comment={reply}
                        editing={editing === reply._id}
                        editDraft={editDraft}
                        identityId={identityId}
                        key={reply._id}
                        onDelete={() => {
                          void removeComment({ id: reply._id, ...identityArgs(identityId) }).catch((error) => {
                            console.error(error);
                            toast.error("Could not delete reply");
                          });
                        }}
                        onEdit={() => {
                          setEditing(reply._id);
                          setEditDraft(reply.content);
                        }}
                        onLike={() => {
                          void toggleLike({ id: reply._id, ...identityArgs(identityId) }).catch((error) => {
                            console.error(error);
                            toast.error("Could not update like");
                          });
                        }}
                        onReply={() => setReplyTo(comment._id)}
                        onSave={async () => {
                          try {
                            await updateComment({
                              id: reply._id,
                              ...identityArgs(identityId),
                              content: editDraft,
                            });
                            setEditing(null);
                          } catch (error) {
                            console.error(error);
                            toast.error("Could not update reply");
                          }
                        }}
                        setEditDraft={setEditDraft}
                      />
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
          <form
            className="rounded-2xl border border-[var(--line)] bg-[var(--sheet)] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <p className="text-[length:var(--text-xs)] text-[var(--mute)]">
              {replyTo ? "Replying" : `Verse ${verseFilter ?? passage.verse}`}
            </p>
            <textarea
              className="mt-2 min-h-20 w-full resize-none bg-transparent text-[length:var(--text-sm)] outline-none"
              onChange={(event) => setContent(event.target.value)}
              placeholder="Join the discussion"
              value={content}
            />
            <div className="flex justify-end gap-2">
              {replyTo ? (
                <button className="text-[length:var(--text-xs)] text-[var(--mute)]" onClick={() => setReplyTo(null)} type="button">
                  Cancel reply
                </button>
              ) : null}
              <button className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-[length:var(--text-xs)] font-medium text-[var(--accent-ink)]" type="submit">
                Post
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-full border px-3 py-1 text-[length:var(--text-xs)]",
        active ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--mute)]",
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function CommentBody({
  comment,
  editing,
  editDraft,
  identityId,
  onDelete,
  onEdit,
  onLike,
  onReply,
  onSave,
  setEditDraft,
}: {
  comment: CommentDoc;
  editing: boolean;
  editDraft: string;
  identityId: string | null;
  onDelete: () => void;
  onEdit: () => void;
  onLike: () => void;
  onReply: () => void;
  onSave: () => Promise<void>;
  setEditDraft: (value: string) => void;
}) {
  const mine = Boolean(identityId && comment.ownerKey === identityId);
  return (
    <div id={`comment-${comment._id}`}>
      <p className="text-[length:var(--text-xs)] text-[var(--mute)]">
        {comment.guestName || "Anonymous"} · {comment.passageVerse}
      </p>
      {editing ? (
        <textarea
          className="mt-2 w-full resize-none bg-transparent text-[length:var(--text-sm)] outline-none"
          onChange={(event) => setEditDraft(event.target.value)}
          value={editDraft}
        />
      ) : (
        <div className="mt-1 text-[length:var(--text-sm)] leading-6">
          <RichScriptureText text={comment.content} />
        </div>
      )}
      <div className="mt-2 flex gap-3 text-[length:var(--text-xs)] text-[var(--mute)]">
        <button onClick={onLike} type="button">
          {comment.likes.length} likes
        </button>
        <button onClick={onReply} type="button">
          Reply
        </button>
        {mine ? (
          editing ? (
            <button onClick={() => void onSave()} type="button">
              Save
            </button>
          ) : (
            <button onClick={onEdit} type="button">
              Edit
            </button>
          )
        ) : null}
        {mine ? (
          <button onClick={onDelete} type="button">
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}
