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
  RefreshCw,
  ChevronRight,
  Users,
  CreditCard,
  Calendar,
  TrendingUp,
  Package,
  Briefcase,
  FileText,
  Settings,
  Zap,
  Inbox,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { notificationService, AppNotification } from "../../utils/supabase/notification-service";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
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

function isYesterday(isoString: string): boolean {
  const d = new Date(isoString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  );
}

// ── Type / priority configs ───────────────────────────────────────────────────

const TYPE_CONFIG = {
  SUCCESS: {
    icon: CheckCircle,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    dot: "bg-emerald-500",
    border: "border-l-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    rowBg: "bg-emerald-50/40",
  },
  INFO: {
    icon: Info,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
    dot: "bg-sky-500",
    border: "border-l-sky-500",
    badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    rowBg: "bg-sky-50/40",
  },
  WARNING: {
    icon: AlertTriangle,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    dot: "bg-amber-500",
    border: "border-l-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    rowBg: "bg-amber-50/40",
  },
  DANGER: {
    icon: XCircle,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    dot: "bg-red-500",
    border: "border-l-red-500",
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
    rowBg: "bg-red-50/40",
  },
} as const;

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string; ring: string }> = {
  CRITICAL: { label: "Critical", bg: "bg-red-100",    text: "text-red-700",    ring: "ring-1 ring-red-300"    },
  HIGH:     { label: "High",     bg: "bg-orange-100", text: "text-orange-700", ring: "ring-1 ring-orange-300" },
  MEDIUM:   { label: "Medium",   bg: "bg-yellow-100", text: "text-yellow-700", ring: "ring-1 ring-yellow-300" },
  LOW:      { label: "Low",      bg: "bg-gray-100",   text: "text-gray-600",   ring: "ring-1 ring-gray-200"   },
};

const MODULE_ICON: Record<string, React.ElementType> = {
  MEMBERS:    Users,
  BILLING:    CreditCard,
  BOOKINGS:   Calendar,
  LEADS:      TrendingUp,
  FOLLOW_UPS: TrendingUp,
  FINANCIALS: FileText,
  PAYROLL:    Briefcase,
  INVENTORY:  Package,
  ASSETS:     Settings,
  GENERAL:    Zap,
};

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
  const ModuleIcon = MODULE_ICON[notification.module] ?? Zap;
  const priority = PRIORITY_CONFIG[notification.priority];
  const isUnread = !notification.isRead;
  const showPriorityBadge = notification.priority === "CRITICAL" || notification.priority === "HIGH";

  function handleClick() {
    if (isUnread) onRead(notification.id);
    if (notification.actionUrl) navigate(notification.actionUrl);
  }

  return (
    <div
      onClick={handleClick}
      className={`
        group relative flex gap-3.5 px-5 py-4 cursor-pointer
        transition-all duration-200 ease-in-out
        border-l-[3px] border-b border-border/30 last:border-b-0
        hover:bg-muted/60 hover:shadow-sm
        ${isUnread ? `${cfg.border} ${cfg.rowBg}` : "border-l-transparent bg-background"}
      `}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 mt-0.5 h-9 w-9 rounded-xl ${cfg.iconBg} flex items-center justify-center shadow-sm ring-1 ring-black/5`}>
        <IconComponent className={`h-4.5 w-4.5 ${cfg.iconColor}`} style={{ height: 18, width: 18 }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5 pr-6">
        {/* Title + badge */}
        <div className="flex items-start gap-2 flex-wrap">
          <p className={`text-[13px] leading-snug flex-1 min-w-0 ${isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/75"}`}>
            {notification.count > 1
              ? `${notification.title} (×${notification.count})`
              : notification.title}
          </p>
          {showPriorityBadge && priority && (
            <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${priority.bg} ${priority.text} ${priority.ring}`}>
              {priority.label}
            </span>
          )}
        </div>

        {/* Message */}
        <p className="text-[12.5px] text-muted-foreground leading-relaxed line-clamp-2">
          {notification.message}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 pt-0.5">
          <span className="text-[11px] text-muted-foreground/60 font-medium tabular-nums">
            {timeAgo(notification.createdAt)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
            <ModuleIcon className="h-3 w-3" />
            <span className="capitalize">{notification.module.toLowerCase().replace("_", " ")}</span>
          </span>
          {notification.actionUrl && (
            <span className="flex items-center gap-0.5 text-[11px] text-primary/60 group-hover:text-primary font-medium transition-colors ml-auto">
              View <ChevronRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      {/* Unread dot */}
      {isUnread && (
        <span className={`absolute top-4 right-10 h-2 w-2 rounded-full ${cfg.dot} ring-2 ring-background`} />
      )}

      {/* Delete on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className="absolute top-3.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-50"
        aria-label="Dismiss"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-2 bg-muted/60 border-b border-border/30 sticky top-0 z-10 backdrop-blur-sm">
      <span className="text-[10.5px] font-bold text-muted-foreground/70 uppercase tracking-[0.08em]">
        {label}
      </span>
      <span className="inline-flex items-center justify-center h-4.5 min-w-[18px] px-1.5 rounded-full bg-muted-foreground/15 text-[10px] font-semibold text-muted-foreground/60" style={{ height: 18 }}>
        {count}
      </span>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex gap-3.5 px-5 py-4 border-b border-border/30 animate-pulse">
      <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-muted" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="h-3 bg-muted rounded-lg w-3/4" />
        <div className="h-2.5 bg-muted rounded-lg w-full" />
        <div className="h-2.5 bg-muted rounded-lg w-2/5" />
      </div>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onCountChange: (count: number) => void;
}

type FilterTab = "all" | "unread";

export function NotificationPanel({ open, onClose, onCountChange }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(async (pageNum: number, replace = false) => {
    if (replace) setRefreshing(true); else setLoading(true);
    try {
      const data = await notificationService.getNotifications(pageNum, 20);
      setNotifications((prev) => (replace ? data.content : [...prev, ...data.content]));
      setHasMore(pageNum < data.totalPages - 1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setPage(0);
      loadPage(0, true);
    }
  }, [open, loadPage]);

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
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const visible = filter === "unread"
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const todayItems    = visible.filter((n) => isToday(n.createdAt));
  const yesterdayItems = visible.filter((n) => isYesterday(n.createdAt));
  const earlierItems  = visible.filter((n) => !isToday(n.createdAt) && !isYesterday(n.createdAt));

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[380px] md:w-[420px] p-0 flex flex-col gap-0 border-l border-border/60 shadow-2xl bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 rounded-l-2xl overflow-hidden"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <SheetHeader className="flex-shrink-0 p-0 border-b border-slate-100">
          <div className="px-5 py-4 pr-14 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="flex items-center gap-3 text-foreground">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/15">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="leading-tight">
                  <p className="text-[15px] font-bold">Notifications</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold leading-none ring-1 ring-primary/15">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </SheetTitle>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => loadPage(0, true)}
                  disabled={refreshing}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
                  aria-label="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/60 transition-colors whitespace-nowrap"
                  >
                    <BellOff className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="mt-3.5">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </SheetHeader>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-white">
          {refreshing ? (
            <div className="divide-y divide-border/30">
              {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-5 px-8 py-24 text-center">
              <div className="h-20 w-20 rounded-2xl bg-primary/8 flex items-center justify-center ring-1 ring-primary/15" style={{ background: "rgba(43,122,120,0.08)" }}>
                <Inbox className="h-9 w-9 text-primary/50" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-foreground">
                  {filter === "unread" ? "No unread notifications" : "You're all caught up"}
                </p>
                <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed max-w-[220px]">
                  {filter === "unread"
                    ? "Switch to All to see your full history"
                    : "New alerts will appear here automatically"}
                </p>
              </div>
              {filter === "unread" && (
                <button
                  onClick={() => setFilter("all")}
                  className="text-[12.5px] font-semibold text-primary hover:text-primary/80 px-4 py-2 rounded-lg hover:bg-primary/8 transition-colors"
                  style={{ "--tw-bg-opacity": 1 } as React.CSSProperties}
                >
                  View all notifications
                </button>
              )}
            </div>
          ) : (
            <>
              {todayItems.length > 0 && (
                <div>
                  <SectionLabel label="Today" count={todayItems.length} />
                  {todayItems.map((n) => (
                    <NotificationRow key={n.id} notification={n} onRead={handleRead} onDelete={handleDelete} />
                  ))}
                </div>
              )}

              {yesterdayItems.length > 0 && (
                <div>
                  <SectionLabel label="Yesterday" count={yesterdayItems.length} />
                  {yesterdayItems.map((n) => (
                    <NotificationRow key={n.id} notification={n} onRead={handleRead} onDelete={handleDelete} />
                  ))}
                </div>
              )}

              {earlierItems.length > 0 && (
                <div>
                  <SectionLabel label="Earlier" count={earlierItems.length} />
                  {earlierItems.map((n) => (
                    <NotificationRow key={n.id} notification={n} onRead={handleRead} onDelete={handleDelete} />
                  ))}
                </div>
              )}

              {/* Infinite scroll sentinel */}
              <div ref={loaderRef} className="py-8 flex items-center justify-center">
                {loading && (
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground/60">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Loading more…
                  </div>
                )}
                {!hasMore && visible.length > 0 && (
                  <p className="text-[11px] text-muted-foreground/40 font-medium">— End of notifications —</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {notifications.length > 0 && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-slate-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 flex items-center justify-between">
            <p className="text-[11.5px] text-muted-foreground">
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""} total
            </p>
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="text-[11.5px] font-semibold text-primary hover:text-primary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded-md hover:bg-primary/8"
            >
              Mark all read
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
