import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Info,
  AlertTriangle,
  XCircle,
  Bell,
  BellOff,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { notificationService, AppNotification } from "../../utils/supabase/notification-service";

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isToday(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const TYPE_CONFIG = {
  SUCCESS: { icon: CheckCircle, dot: "bg-green-500", text: "text-green-600" },
  INFO:    { icon: Info,        dot: "bg-blue-500",  text: "text-blue-600"  },
  WARNING: { icon: AlertTriangle, dot: "bg-yellow-500", text: "text-yellow-600" },
  DANGER:  { icon: XCircle,    dot: "bg-red-500",   text: "text-red-600"   },
} as const;

// ── Notification row ──────────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onRead,
  onDelete,
}: {
  notification: AppNotification;
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.INFO;
  const IconComponent = cfg.icon;

  function handleClick() {
    onRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  }

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0 ${
        !notification.isRead ? "bg-accent/20" : ""
      }`}
      onClick={handleClick}
    >
      {/* Color dot */}
      <span className={`mt-1.5 flex-shrink-0 h-2 w-2 rounded-full ${cfg.dot}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm truncate ${!notification.isRead ? "font-semibold" : "font-medium"}`}>
            {notification.count > 1
              ? `${notification.title} (${notification.count})`
              : notification.title}
          </p>
          {notification.priority === "CRITICAL" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 uppercase tracking-wide">
              Critical
            </span>
          )}
          {notification.priority === "HIGH" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 uppercase tracking-wide">
              High
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className="flex-shrink-0 p-1 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent transition-colors"
        aria-label="Dismiss notification"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onCountChange: (count: number) => void;
}

export function NotificationPanel({ open, onClose, onCountChange }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(async (pageNum: number, replace = false) => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications(pageNum, 20);
      setNotifications((prev) => (replace ? data.content : [...prev, ...data.content]));
      setHasMore(pageNum < data.totalPages - 1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Load first page when panel opens
  useEffect(() => {
    if (open) {
      setPage(0);
      loadPage(0, true);
    }
  }, [open, loadPage]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          const next = page + 1;
          setPage(next);
          loadPage(next);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page, loadPage]);

  async function handleRead(id: number) {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    const newUnread = notifications.filter((n) => !n.isRead && n.id !== id).length;
    onCountChange(newUnread);
  }

  async function handleDelete(id: number) {
    await notificationService.deleteNotification(id);
    const remaining = notifications.filter((n) => n.id !== id);
    setNotifications(remaining);
    onCountChange(remaining.filter((n) => !n.isRead).length);
  }

  async function handleMarkAllRead() {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    onCountChange(0);
  }

  // Group into Today / Earlier
  const today = notifications.filter((n) => isToday(n.createdAt));
  const earlier = notifications.filter((n) => !isToday(n.createdAt));
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({unreadCount} unread)
                </span>
              )}
            </SheetTitle>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <BellOff className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-16">
              <CheckCircle className="h-10 w-10 text-green-500 opacity-60" />
              <p className="text-sm font-medium">You're all caught up</p>
              <p className="text-xs opacity-60">No new notifications</p>
            </div>
          ) : (
            <>
              {today.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 sticky top-0">
                    Today
                  </p>
                  {today.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onRead={handleRead}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
              {earlier.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 sticky top-0">
                    Earlier
                  </p>
                  {earlier.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onRead={handleRead}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}

              {/* Infinite scroll trigger */}
              <div ref={loaderRef} className="h-8 flex items-center justify-center">
                {loading && (
                  <span className="text-xs text-muted-foreground">Loading...</span>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
