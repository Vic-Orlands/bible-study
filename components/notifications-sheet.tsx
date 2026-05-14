"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bell, CheckCheck, Heart, AtSign, MessageCircle, Trash2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";

type NotificationFilter = "all" | "unread" | "mentions";

function formatNotificationTime(createdAt: number) {
  const date = new Date(createdAt);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function NotificationsSheet({
  identityId,
  open,
  onClose,
  onOpenNotification,
}: {
  identityId?: Id<"identities">;
  open: boolean;
  onClose: () => void;
  onOpenNotification?: (notification: {
    passageBook: string;
    passageChapter: number;
    passageVerse?: number;
    commentId?: Id<"comments">;
  }) => void | Promise<void>;
}) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const notifications = useQuery(api.notifications.list, {
    ...(identityId ? { identityId } : {}),
    ...(filter === "all" ? {} : { filter }),
  });
  const unreadNotifications = useQuery(api.notifications.list, {
    ...(identityId ? { identityId } : {}),
    filter: "unread",
  });
  const markAllRead = useMutation(api.notifications.markAllRead);
  const markRead = useMutation(api.notifications.markRead);
  const clearAll = useMutation(api.notifications.clearAll);

  const unreadCount = unreadNotifications?.length ?? 0;
  const hasNotifications = (notifications?.length ?? 0) > 0;

  const headerActions = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 border-b border-[#f1e8df] bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9b8878]">
            Inbox
          </span>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f6823c] px-1.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <button
              className="flex items-center gap-1.5 border border-[#e5d6c9] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]"
              onClick={async () => {
                try {
                  await markAllRead({ ...(identityId ? { identityId } : {}) });
                } catch (e) {
                  console.error("Failed to mark all notifications as read:", e);
                }
              }}
              type="button"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Read all
            </button>
          )}
          {hasNotifications && (
            <button
              className="flex items-center gap-1.5 border border-[#f1e8df] bg-[#fff8f4] px-2.5 py-1.5 text-[11px] font-semibold text-[#a24723] hover:bg-[#fff1e8]"
              onClick={async () => {
                try {
                  await clearAll({ ...(identityId ? { identityId } : {}) });
                } catch (e) {
                  console.error("Failed to clear notifications:", e);
                }
              }}
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="flex w-full gap-1">
          {(["all", "unread", "mentions"] as NotificationFilter[]).map((value) => (
            <button
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                filter === value
                  ? "bg-[#3a2218] text-white"
                  : "bg-[#fbf7f2] text-[#7a6758] hover:bg-[#f1e8df] hover:text-[#3a2218]",
              )}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>
    ),
    [clearAll, filter, hasNotifications, identityId, markAllRead, unreadCount],
  );

  return (
    <BottomSheet isOpen={open} onClose={onClose} title="Notifications">
      <div className="-m-4 flex h-full flex-col bg-[#fbf7f2]">
        {headerActions}

        <div className="bible-app-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {notifications === undefined ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#f6823c] border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center border border-[#f1e8df] bg-white px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#fbf7f2] text-[#9b8878]">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-[13px] font-semibold text-[#3a2218]">No notifications</p>
              <p className="mt-1 text-[11px] text-[#9b8878]">
                {filter === "unread"
                  ? "You're all caught up."
                  : filter === "mentions"
                    ? "No mentions yet."
                    : "Nothing new yet."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((notification) => {
                const iconMap = {
                  reply: MessageCircle,
                  like: Heart,
                  mention: AtSign,
                  comment: MessageCircle,
                };
                const Icon = iconMap[notification.type] ?? MessageCircle;
                return (
                  <button
                    className={cn(
                      "flex w-full items-start gap-3 border border-[#f1e8df] bg-white px-4 py-3 text-left transition-colors hover:border-[#f6823c] hover:bg-[#fffaf5]",
                      !notification.read && "border-[#f6d4bd] bg-[#fff8f1]",
                    )}
                    key={notification._id}
                    onClick={async () => {
                      try {
                        if (!notification.read) {
                          await markRead({
                            id: notification._id,
                            ...(identityId ? { identityId } : {}),
                          });
                        }
                        await onOpenNotification?.({
                          passageBook: notification.passageBook,
                          passageChapter: notification.passageChapter,
                          passageVerse: notification.passageVerse,
                          commentId: notification.commentId,
                        });
                        onClose();
                      } catch (e) {
                        console.error("Failed to open notification:", e);
                      }
                    }}
                    type="button"
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        notification.type === "like"
                          ? "bg-[#fff3e8] text-[#f6823c]"
                          : "bg-[#f5efe7] text-[#7a6758]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[12px] leading-5 text-[#25140b]">
                          <span className="font-semibold">{notification.actorName}</span>{" "}
                          {notification.type === "reply"
                            ? "replied to your comment"
                            : notification.type === "like"
                              ? "liked your comment"
                              : notification.type === "mention"
                                ? "mentioned you"
                                : "commented"}
                        </p>
                        {!notification.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#f6823c]" />
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 font-serif text-[12px] leading-relaxed text-[#5d493a]">
                        {notification.preview}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#9b8878]">
                        <span>
                          {notification.passageBook} {notification.passageChapter}:
                          {notification.passageVerse ?? 1}
                        </span>
                        <span>{formatNotificationTime(notification.createdAt)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
