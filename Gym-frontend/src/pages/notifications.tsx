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
  ChevronLeft,
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
import { toast } from "sonner";
import { notificationService, AppNotification } from "../utils/supabase/notification-service";
import styles from "../components/shared/NotificationPanel.module.css";

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

const TYPE_CONFIG = {
  SUCCESS: { icon: CheckCircle, accent: "var(--success)" },
  INFO: { icon: Info, accent: "var(--primary)" },
  WARNING: { icon: AlertTriangle, accent: "var(--warning)" },
  DANGER: { icon: XCircle, accent: "var(--destructive)" },
} as const;

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  CRITICAL: { label: "Critical", bg: "color-mix(in srgb, var(--destructive) 15%, transparent)", text: "var(--destructive)" },
  HIGH: { label: "High", bg: "color-mix(in srgb, var(--warning) 25%, transparent)", text: "#92400e" },
  MEDIUM: { label: "Medium", bg: "var(--muted)", text: "var(--muted-foreground)" },
  LOW: { label: "Low", bg: "var(--muted)", text: "var(--muted-foreground)" },
};

const MODULE_ICON: Record<string, React.ElementType> = {
  MEMBERS: Users,
  BILLING: CreditCard,
  BOOKINGS: Calendar,
  LEADS: TrendingUp,
  FOLLOW_UPS: TrendingUp,
  FINANCIALS: FileText,
  PAYROLL: Briefcase,
  INVENTORY: Package,
  ASSETS: Settings,
  GENERAL: Zap,
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
      className={`${styles.row} ${isUnread ? styles.rowUnread : ""}`}
      style={{ "--row-accent": cfg.accent } as React.CSSProperties}
    >
      <div className={styles.rowIcon}>
        <IconComponent />
      </div>

      <div className={styles.rowContent}>
        <div className={styles.rowTitleLine}>
          <p className={`${styles.rowTitle} ${isUnread ? styles.rowTitleUnread : styles.rowTitleRead}`}>
            {notification.count > 1
              ? `${notification.title} (×${notification.count})`
              : notification.title}
          </p>
          {showPriorityBadge && priority && (
            <span
              className={styles.priorityBadge}
              style={{ background: priority.bg, color: priority.text }}
            >
              {priority.label}
            </span>
          )}
        </div>

        <p className={styles.rowMessage}>{notification.message}</p>

        <div className={styles.rowMeta}>
          <span className={styles.rowMetaTime}>{timeAgo(notification.createdAt)}</span>
          <span className={styles.rowMetaModule}>
            <ModuleIcon />
            <span>{notification.module.toLowerCase().replace("_", " ")}</span>
          </span>
          {notification.actionUrl && (
            <span className={styles.rowView}>
              View <ChevronRight style={{ height: 12, width: 12 }} />
            </span>
          )}
        </div>
      </div>

      {isUnread && <span className={styles.unreadDot} />}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className={styles.deleteBtn}
        aria-label="Dismiss"
      >
        <Trash2 style={{ height: 14, width: 14 }} />
      </button>
    </div>
  );
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className={styles.sectionLabel}>
      <span>{label}</span>
      <span className={styles.sectionCount}>{count}</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className={styles.skeletonRow}>
      <div className={styles.skeletonBlock} style={{ height: 34, width: 34, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 2 }}>
        <div className={styles.skeletonBlock} style={{ height: 10, width: "70%" }} />
        <div className={styles.skeletonBlock} style={{ height: 9, width: "100%" }} />
        <div className={styles.skeletonBlock} style={{ height: 9, width: "40%" }} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type FilterTab = "all" | "unread";

export function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // keep last known value rather than flashing to 0
    }
  }, []);

  useEffect(() => {
    setPage(0);
    loadPage(0, true);
    refreshUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      refreshUnreadCount();
    } catch {
      toast.error("Failed to mark notification as read");
    }
  }

  async function handleDelete(id: number) {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      refreshUnreadCount();
    } catch {
      toast.error("Failed to delete notification");
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      toast.error("Failed to mark all notifications as read");
    }
  }

  const visible = filter === "unread"
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const todayItems = visible.filter((n) => isToday(n.createdAt));
  const yesterdayItems = visible.filter((n) => isYesterday(n.createdAt));
  const earlierItems = visible.filter((n) => !isToday(n.createdAt) && !isYesterday(n.createdAt));

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          className={styles.iconBtn}
          aria-label="Back"
          style={{ marginBottom: 12 }}
        >
          <ChevronLeft style={{ height: 18, width: 18 }} />
        </button>

        <div className={styles.headerTop} style={{ alignItems: "center" }}>
          <div className={styles.titleRow}>
            <div className={styles.bellBadge} style={{ height: 44, width: 44 }}>
              <Bell style={{ height: 21, width: 21 }} />
            </div>
            <div className={styles.titleText}>
              <h2 style={{ fontSize: 20 }}>Notifications</h2>
              <p>{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
            </div>
            {unreadCount > 0 && (
              <span className={styles.unreadPill}>{unreadCount > 99 ? "99+" : unreadCount}</span>
            )}
          </div>

          <div className={styles.headerActions}>
            <button
              onClick={() => { loadPage(0, true); refreshUnreadCount(); }}
              disabled={refreshing}
              className={styles.iconBtn}
              aria-label="Refresh"
            >
              <RefreshCw className={refreshing ? styles.spin : ""} style={{ height: 16, width: 16 }} />
            </button>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className={styles.markAllBtn}>
                <BellOff style={{ height: 14, width: 14 }} />
                Mark all read
              </button>
            )}
          </div>
        </div>

        <div className={styles.tabs} role="tablist" style={{ maxWidth: 280, marginTop: 18 }}>
          <button
            role="tab"
            aria-selected={filter === "all"}
            onClick={() => setFilter("all")}
            className={`${styles.tab} ${filter === "all" ? styles.tabActive : ""}`}
          >
            All
          </button>
          <button
            role="tab"
            aria-selected={filter === "unread"}
            onClick={() => setFilter("unread")}
            className={`${styles.tab} ${filter === "unread" ? styles.tabActive : ""}`}
          >
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--card)" }}>
        {refreshing ? (
          <div>
            {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Inbox />
            </div>
            <div>
              <p className={styles.emptyTitle}>
                {filter === "unread" ? "No unread notifications" : "You're all caught up"}
              </p>
              <p className={styles.emptySub}>
                {filter === "unread"
                  ? "Switch to All to see your full history"
                  : "New alerts will appear here automatically"}
              </p>
            </div>
            {filter === "unread" && (
              <button onClick={() => setFilter("all")} className={styles.emptyLink}>
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
            <div ref={loaderRef} className={styles.loadMore}>
              {loading && (
                <div className={styles.loadMoreText}>
                  <RefreshCw className={styles.spin} style={{ height: 14, width: 14 }} />
                  Loading more…
                </div>
              )}
              {!hasMore && visible.length > 0 && (
                <p className={styles.endText}>— End of notifications —</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
