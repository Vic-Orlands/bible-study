"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AnimatePresence, motion } from "motion/react";
import { X, MessageCircle, Heart, AtSign, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NotificationFilter = "all" | "unread" | "mentions";

export function NotificationsSheet({
  identityId,
  open,
  onClose,
}: {
  identityId?: Id<"identities">;
  open: boolean;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const notifications = useQuery(api.notifications.list, {
    ...(identityId ? { identityId } : {}),
    ...(filter === "all" ? {} : { filter }),
  });
  const markAllRead = useMutation(api.notifications.markAllRead);
  const clearAll = useMutation(api.notifications.clearAll);
  const markRead = useMutation(api.notifications.markRead);

  const unreadCount =
    useQuery(api.notifications.list, {
      ...(identityId ? { identityId } : {}),
      filter: "unread",
    })
      ?.length ?? 0;

  const handleMarkAllRead = async () => {
    try {
      await markAllRead({ ...(identityId ? { identityId } : {}) });
    } catch (e) {
      console.error("Failed to mark all read:", e);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <motion.div
        animate={{ y: 0 }}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-t-2xl border-t border-[#f1e8df] bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
        exit={{ y: "100%" }}
        initial={{ y: "100%" }}
        transition={{ duration: 0.3, ease: [0.215, 0.61, 0.355, 1] }}
      >
        <div className="flex items-center justify-between border-b border-[#f1e8df] px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold text-[#25140b]">Notifications</h2>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f6823c] px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                className="flex items-center gap-1 text-[11px] font-semibold text-[#3a2218] hover:text-[#f6823c]"
                onClick={handleMarkAllRead}
                type="button"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Read all
              </button>
            )}
            <button
              className="flex h-7 w-7 items-center justify-center text-[#7a6758] hover:text-[#3a2218]"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-[#f1e8df] px-4 py-2">
          {(["all", "unread", "mentions"] as NotificationFilter[]).map((f) => (
            <button
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                filter === f ? "bg-[#3a2218] text-white" : "text-[#7a6758] hover:bg-[#f1e8df]",
              )}
              key={f}
              onClick={() => setFilter(f)}
              type="button"
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {notifications === undefined ? (
            <div className="flex items-center justify-center h-24">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#f6823c] border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-3 text-3xl">🔔</div>
              <p className="text-[13px] font-semibold text-[#3a2218]">No notifications</p>
              <p className="mt-1 text-[11px] text-[#9b8878]">
                {filter === "unread" ? "You're all caught up!" : filter === "mentions" ? "No mentions yet." : "Nothing new yet."}
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const icons = {
                reply: MessageCircle,
                like: Heart,
                mention: AtSign,
                comment: MessageCircle,
              };
              const Icon = icons[notif.type] ?? MessageCircle;
              return (
                <div
                  key={notif._id}
                  className={cn(
                    "flex items-start gap-3 border-b border-[#f1e8df] px-4 py-3 transition-colors cursor-pointer hover:bg-[#fbf7f2]",
                    !notif.read && "bg-[#fff3e8]",
                  )}
                  onClick={async () => {
                    if (!notif.read) {
                      try {
                        await markRead({
                          id: notif._id,
                          ...(identityId ? { identityId } : {}),
                        });
                      } catch (e) {
                        console.error("Failed to mark read:", e);
                      }
                    }
                  }}
                >
                  <div className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    notif.type === "like" ? "bg-[#fff3e8] text-[#f6823c]" : "bg-[#f1e8df] text-[#7a6758]",
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-[#25140b]">
                      <span className="font-semibold">{notif.actorName}</span>
                      {" "}
                      {notif.type === "reply" ? "replied to your comment" : notif.type === "like" ? "liked your comment" : notif.type === "mention" ? "mentioned you" : "commented"}
                    </p>
                    <p className="mt-0.5 line-clamp-2 font-serif text-[11px] text-[#7a6758]">
                      {notif.preview}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#9b8878]">
                      {notif.passageBook} {notif.passageChapter}:{notif.passageVerse ?? "?"}
                    </p>
                  </div>
                  {!notif.read && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f6823c]" />}
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </>
  );
}
