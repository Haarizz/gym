import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { AspectRatio } from "../components/ui/aspect-ratio";
import { Slider } from "../components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import styles from "../components/analytics/community-analytics.module.css";
import hub from "../components/community/community-hub.module.css";
import api from "../api/axiosConfig";
import { communityService, TrendingTopic, LeaderboardEntry, CommunityEngagementStats } from "../utils/supabase/community-service";
import { membersService } from "../utils/supabase/members-service";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Crown,
  HelpCircle,
  Lightbulb,
  Sparkles,
  Flame,
  Heart,
  Image as ImageIcon,
  Loader2,
  Medal,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Share2,
  Star,
  Target,
  Trophy,
  Archive,
  MoreVertical,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";

type CropRatioOption = "1:1" | "4:5" | "9:16";

type CommunityPostImage = {
  src: string;
  alt: string;
  label: string;
  description: string;
  aspectRatio: CropRatioOption;
  cropPosition: number;
  cropZoom: number;
};

type CommunityPost = {
  id: number;
  authorUserId: number;
  authorUsername: string;
  authorRoles: string[];
  avatar?: string;
  createdAt: string;
  content: string;
  likes: number;
  comments: number;
  likedByMe?: boolean;
  type: "achievement" | "question" | "tip";
  topic: string;
  image?: CommunityPostImage;
  archived?: boolean;
};

type CommunityComment = {
  id: number;
  postId: number;
  content: string;
  authorUserId: number;
  authorUsername: string;
  authorRoles: string[];
  createdAt: string;
};

type CommunityEvent = {
  id: number;
  title: string;
  date: string;
  participants: number;
  description: string;
  location: string;
  host: string;
};

type MemberAchievement = {
  id: number;
  member: string;
  achievement: string;
  date: string;
  badge: "strength" | "consistency" | "cardio";
  summary: string;
};

type CommunityPostDraft = {
  type: CommunityPost["type"];
  topic: string;
  content: string;
  uploadedPhoto: {
    src: string;
    fileName: string;
  } | null;
  aspectRatio: CropRatioOption;
  cropPosition: number;
  cropZoom: number;
};

const createWorkoutFeedPhoto = (
  width: number,
  height: number,
  accent: string,
  title: string,
  subtitle: string,
  equipment: "barbell" | "dumbbells" | "treadmill",
) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="wall" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
        <linearGradient id="floor" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#111827" />
          <stop offset="100%" stop-color="#1f2937" />
        </linearGradient>
        <linearGradient id="accentGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.92" />
          <stop offset="100%" stop-color="#f8fafc" stop-opacity="0.1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#wall)" />
      <rect y="${Math.round(height * 0.74)}" width="${width}" height="${Math.round(height * 0.26)}" fill="url(#floor)" />
      <circle cx="${Math.round(width * 0.82)}" cy="${Math.round(height * 0.16)}" r="${Math.round(width * 0.22)}" fill="${accent}" opacity="0.22" />
      <circle cx="${Math.round(width * 0.18)}" cy="${Math.round(height * 0.22)}" r="${Math.round(width * 0.18)}" fill="#f97316" opacity="0.08" />
      <rect x="${Math.round(width * 0.07)}" y="${Math.round(height * 0.08)}" width="${Math.round(width * 0.86)}" height="${Math.round(height * 0.58)}" rx="34" fill="#0b1220" opacity="0.55" />
      <rect x="${Math.round(width * 0.07)}" y="${Math.round(height * 0.08)}" width="${Math.round(width * 0.86)}" height="${Math.round(height * 0.58)}" rx="34" fill="url(#accentGlow)" opacity="0.18" />
      <rect x="${Math.round(width * 0.11)}" y="${Math.round(height * 0.12)}" width="${Math.round(width * 0.3)}" height="16" rx="8" fill="#cbd5e1" opacity="0.75" />
      <rect x="${Math.round(width * 0.11)}" y="${Math.round(height * 0.16)}" width="${Math.round(width * 0.22)}" height="12" rx="6" fill="#94a3b8" opacity="0.75" />
      <rect x="${Math.round(width * 0.12)}" y="${Math.round(height * 0.77)}" width="${Math.round(width * 0.76)}" height="18" rx="9" fill="#020617" opacity="0.95" />
      <circle cx="${Math.round(width * 0.5)}" cy="${Math.round(height * 0.44)}" r="${Math.round(width * 0.07)}" fill="#f8fafc" />
      <rect x="${Math.round(width * 0.45)}" y="${Math.round(height * 0.49)}" width="${Math.round(width * 0.1)}" height="${Math.round(height * 0.13)}" rx="22" fill="#f8fafc" />
      <rect x="${Math.round(width * 0.38)}" y="${Math.round(height * 0.51)}" width="${Math.round(width * 0.1)}" height="24" rx="12" fill="#f8fafc" transform="rotate(-18 ${Math.round(width * 0.38)} ${Math.round(height * 0.51)})" />
      <rect x="${Math.round(width * 0.52)}" y="${Math.round(height * 0.51)}" width="${Math.round(width * 0.1)}" height="24" rx="12" fill="#f8fafc" transform="rotate(18 ${Math.round(width * 0.62)} ${Math.round(height * 0.51)})" />
      <rect x="${Math.round(width * 0.43)}" y="${Math.round(height * 0.61)}" width="${Math.round(width * 0.07)}" height="${Math.round(height * 0.17)}" rx="18" fill="#f8fafc" transform="rotate(8 ${Math.round(width * 0.46)} ${Math.round(height * 0.61)})" />
      <rect x="${Math.round(width * 0.5)}" y="${Math.round(height * 0.61)}" width="${Math.round(width * 0.07)}" height="${Math.round(height * 0.17)}" rx="18" fill="#f8fafc" transform="rotate(-8 ${Math.round(width * 0.54)} ${Math.round(height * 0.61)})" />
      ${
        equipment === "barbell"
          ? `
      <rect x="${Math.round(width * 0.2)}" y="${Math.round(height * 0.34)}" width="18" height="${Math.round(height * 0.34)}" rx="9" fill="#94a3b8" />
      <rect x="${Math.round(width * 0.78)}" y="${Math.round(height * 0.34)}" width="18" height="${Math.round(height * 0.34)}" rx="9" fill="#94a3b8" />
      <rect x="${Math.round(width * 0.22)}" y="${Math.round(height * 0.34)}" width="${Math.round(width * 0.56)}" height="14" rx="7" fill="#e2e8f0" />
      <circle cx="${Math.round(width * 0.24)}" cy="${Math.round(height * 0.35)}" r="34" fill="${accent}" />
      <circle cx="${Math.round(width * 0.76)}" cy="${Math.round(height * 0.35)}" r="34" fill="${accent}" />
      <circle cx="${Math.round(width * 0.24)}" cy="${Math.round(height * 0.35)}" r="20" fill="#0f172a" />
      <circle cx="${Math.round(width * 0.76)}" cy="${Math.round(height * 0.35)}" r="20" fill="#0f172a" />
      `
          : equipment === "treadmill"
            ? `
      <rect x="${Math.round(width * 0.18)}" y="${Math.round(height * 0.56)}" width="${Math.round(width * 0.24)}" height="${Math.round(height * 0.08)}" rx="18" fill="#334155" />
      <rect x="${Math.round(width * 0.38)}" y="${Math.round(height * 0.4)}" width="18" height="${Math.round(height * 0.22)}" rx="9" fill="#94a3b8" />
      <rect x="${Math.round(width * 0.38)}" y="${Math.round(height * 0.4)}" width="${Math.round(width * 0.18)}" height="14" rx="7" fill="#e2e8f0" transform="rotate(-24 ${Math.round(width * 0.38)} ${Math.round(height * 0.4)})" />
      <rect x="${Math.round(width * 0.58)}" y="${Math.round(height * 0.46)}" width="${Math.round(width * 0.12)}" height="12" rx="6" fill="${accent}" />
      <circle cx="${Math.round(width * 0.27)}" cy="${Math.round(height * 0.66)}" r="26" fill="#0f172a" />
      <circle cx="${Math.round(width * 0.42)}" cy="${Math.round(height * 0.66)}" r="26" fill="#0f172a" />
      `
            : `
      <circle cx="${Math.round(width * 0.21)}" cy="${Math.round(height * 0.64)}" r="44" fill="${accent}" />
      <circle cx="${Math.round(width * 0.79)}" cy="${Math.round(height * 0.64)}" r="44" fill="${accent}" />
      <circle cx="${Math.round(width * 0.21)}" cy="${Math.round(height * 0.64)}" r="18" fill="#0f172a" />
      <circle cx="${Math.round(width * 0.79)}" cy="${Math.round(height * 0.64)}" r="18" fill="#0f172a" />
      <rect x="${Math.round(width * 0.25)}" y="${Math.round(height * 0.63)}" width="${Math.round(width * 0.5)}" height="18" rx="9" fill="#e2e8f0" />
      <rect x="${Math.round(width * 0.13)}" y="${Math.round(height * 0.31)}" width="${Math.round(width * 0.16)}" height="${Math.round(height * 0.24)}" rx="26" fill="#111827" opacity="0.45" />
      <rect x="${Math.round(width * 0.71)}" y="${Math.round(height * 0.31)}" width="${Math.round(width * 0.16)}" height="${Math.round(height * 0.24)}" rx="26" fill="#111827" opacity="0.45" />
      `
      }
      <text x="${Math.round(width * 0.11)}" y="${Math.round(height * 0.86)}" fill="#f8fafc" font-size="${Math.round(width * 0.048)}" font-family="Arial, sans-serif" font-weight="700">${title}</text>
      <text x="${Math.round(width * 0.11)}" y="${Math.round(height * 0.91)}" fill="#cbd5e1" font-size="${Math.round(width * 0.024)}" font-family="Arial, sans-serif">${subtitle}</text>
    </svg>
  `)}`;

const cropRatioOptions: Array<{ value: CropRatioOption; label: string; helper: string }> = [
  { value: "1:1", label: "1:1", helper: "Square" },
  { value: "4:5", label: "4:5", helper: "Portrait" },
  { value: "9:16", label: "9:16", helper: "Story" },
];

const createEmptyPostDraft = (): CommunityPostDraft => ({
  type: "achievement",
  topic: "",
  content: "",
  uploadedPhoto: null,
  aspectRatio: "4:5",
  cropPosition: 50,
  cropZoom: 100,
});

const safeFormatTime = (isoString?: string) => {
  if (!isoString) return "Just now";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Just now";
  return formatDistanceToNow(date, { addSuffix: true });
};

// Events, achievements, and leaderboard are now fetched from the backend — no hardcoded arrays.

const getAspectRatioValue = (aspectRatio: CropRatioOption) => {
  switch (aspectRatio) {
    case "1:1":
      return 1;
    case "4:5":
      return 4 / 5;
    case "9:16":
      return 9 / 16;
    default:
      return 4 / 5;
  }
};

const getImageFrameWidthClass = (aspectRatio: CropRatioOption) => {
  switch (aspectRatio) {
    case "9:16":
      return "max-w-[120px]";
    case "4:5":
      return "max-w-[150px]";
    case "1:1":
    default:
      return "max-w-[150px]";
  }
};

const getCropPreviewStyle = (cropPosition: number, cropZoom: number) => ({
  objectPosition: `50% ${cropPosition}%`,
  transform: `scale(${cropZoom / 100})`,
  transformOrigin: "center center",
});

const createUploadedPhotoLabel = (fileName: string) =>
  fileName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim() || "Workout Upload";

// ── Presentation helpers (module level so they aren't re-created each render) ──

type CommunityTab = "feed" | "events" | "achievements" | "leaderboard";

const TYPE_META: Record<CommunityPost["type"], { label: string; plural: string; icon: typeof Trophy }> = {
  achievement: { label: "Achievement", plural: "Achievements", icon: Trophy },
  question: { label: "Question", plural: "Questions", icon: HelpCircle },
  tip: { label: "Tip", plural: "Tips", icon: Lightbulb },
};

const AVATAR_COLORS = ["#2a78d6", "#1baf7a", "#eb6834", "#6250d6", "#c2410c", "#0e9fb5", "#b45309", "#be185d"];
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};
const initialsOf = (name: string) =>
  (name.includes("@") ? name.split("@")[0] : name)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

function TypePill({ type }: { type: CommunityPost["type"] }) {
  const Icon = TYPE_META[type]?.icon ?? Star;
  return (
    <span className={hub.typePill} data-ptype={type}>
      <Icon size={11} />{TYPE_META[type]?.label ?? type}
    </span>
  );
}

function InitialsAvatar({ name, small }: { name: string; small?: boolean }) {
  return (
    <span className={`${hub.avatar} ${small ? hub.avatarSm : ""}`} style={{ ["--av" as any]: avatarColor(name) }} aria-hidden>
      {initialsOf(name)}
    </span>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Trophy; title: string; text: string }) {
  return (
    <div className={hub.emptyState}>
      <span className={hub.emptyIcon}><Icon size={24} /></span>
      <span className={hub.emptyTitle}>{title}</span>
      <span className={hub.emptyText}>{text}</span>
    </div>
  );
}

function Ranked({ title, sub, icon: Icon, tone, rows, metric }: {
  title: string; sub: string; icon: typeof Trophy; tone: string; rows: LeaderboardEntry[]; metric: (e: LeaderboardEntry) => string;
}) {
  return (
    <div className={`${styles.card} ${styles.panel}`}>
      <div className={styles.panelHead}>
        <div>
          <h3 className={styles.panelTitle} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconSm}`} data-tone={tone}><Icon size={14} /></span>{title}
          </h3>
          <div className={styles.panelSub}>{sub}</div>
        </div>
      </div>
      <div>
        {rows.slice(0, 5).map((entry, idx) => (
          <div key={entry.userId} className={hub.boardRow}>
            <span className={hub.medal} data-rank={idx + 1}>{idx + 1}</span>
            <InitialsAvatar name={entry.username} small />
            <span className={hub.personName}>{entry.username}</span>
            <span className={hub.countPill}>{metric(entry)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Community() {
  const [feedPosts, setFeedPosts] = useState<CommunityPost[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedFilter, setFeedFilter] = useState<"all" | CommunityPost["type"]>("all");
  const [feedView, setFeedView] = useState<"feed" | "archived">("feed");
  const [activeTab, setActiveTab] = useState<CommunityTab>("feed");
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [postDraft, setPostDraft] = useState<CommunityPostDraft>(createEmptyPostDraft);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  // Guards against a slow, still-in-flight fetchFeed() (e.g. the initial
  // page-load fetch, which is far more likely to be slow on a real deployed
  // network than on localhost) resolving AFTER a newer local update — like the
  // optimistic post-create prepend — and clobbering it back to the stale list.
  const fetchRequestIdRef = useRef(0);
  // BG_08: Post to Feed had no in-flight guard, so each extra click created another
  // identical post. The ref blocks clicks that land before React re-renders; the
  // state drives the disabled button / "Posting..." label.
  const isSubmittingPostRef = useRef(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activePost, setActivePost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isDeletingPostId, setIsDeletingPostId] = useState<number | null>(null);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<number | null>(null);

  // Real data state
  const [activeMemberCount, setActiveMemberCount] = useState(0);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [engagementStats, setEngagementStats] = useState<CommunityEngagementStats | null>(null);

  const currentUserId = useMemo(() => Number(sessionStorage.getItem("userId") ?? NaN), []);
  const currentRoles = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("roles");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }, []);
  const isAdmin = currentRoles.some((role) => {
    const normalized = String(role).toUpperCase();
    return normalized === "GYMBIOS_ADMIN" || normalized === "ROLE_GYMBIOS_ADMIN";
  });
  const canDeletePost = (post: CommunityPost) =>
    isAdmin || (Number.isFinite(currentUserId) && Number(post.authorUserId) === Number(currentUserId));

  const canDeleteComment = (comment: CommunityComment) =>
    isAdmin || (Number.isFinite(currentUserId) && Number(comment.authorUserId) === Number(currentUserId));

  const filteredPosts = feedPosts;

  // Fetch real sidebar / stats data
  const loadRealData = useCallback(async () => {
    try {
      const [membersResp, topics, board, engagement] = await Promise.all([
        membersService.getMembers({ status: "active" }, { page: 1, limit: 1 }).catch(() => ({ members: [], pagination: { total: 0 } } as any)),
        communityService.getTrendingTopics().catch(() => []),
        communityService.getLeaderboard().catch(() => []),
        communityService.getEngagementStats().catch(() => null),
      ]);
      setActiveMemberCount(membersResp?.pagination?.total ?? membersResp?.members?.length ?? 0);
      setTrendingTopics(topics);
      setLeaderboard(board);
      setEngagementStats(engagement);
    } catch {
      // silent — best-effort
    }
  }, []);

  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  const deletePost = async (post: CommunityPost) => {
    if (isDeletingPostId != null) return;
    if (!canDeletePost(post)) return;
    const ok = window.confirm("Delete this post?");
    if (!ok) return;

    setIsDeletingPostId(post.id);
    try {
      await api.delete(`/community/posts/${post.id}`);
      setFeedPosts((prev) => prev.filter((p) => p.id !== post.id));
      if (activePost?.id === post.id) {
        setIsCommentsOpen(false);
      }
      toast.success("Post deleted");
    } catch (error: any) {
      toast.error("Couldn't delete post", { description: error?.response?.data?.message || error?.message });
    } finally {
      setIsDeletingPostId(null);
    }
  };

  const toggleArchivePost = async (post: CommunityPost, archived: boolean) => {
    if (isDeletingPostId != null) return;
    if (!canDeletePost(post)) return;
    const ok = window.confirm(
      archived
        ? "Archive this post? It will be hidden from everyone."
        : "Unarchive this post? It will be visible to everyone.",
    );
    if (!ok) return;

    setIsDeletingPostId(post.id);
    try {
      await api.post(`/community/posts/${post.id}/${archived ? "archive" : "unarchive"}`);
      setFeedPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success(archived ? "Post archived" : "Post restored");
    } catch (error: any) {
      toast.error("Couldn't update post", { description: error?.response?.data?.message || error?.message });
    } finally {
      setIsDeletingPostId(null);
    }
  };

  const deleteComment = async (comment: CommunityComment) => {
    if (!activePost) return;
    if (isDeletingCommentId != null) return;
    if (!canDeleteComment(comment)) return;
    const ok = window.confirm("Delete this comment?");
    if (!ok) return;

    setIsDeletingCommentId(comment.id);
    try {
      await api.delete(`/community/posts/${activePost.id}/comments/${comment.id}`);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      setFeedPosts((prev) =>
        prev.map((p) => (p.id === activePost.id ? { ...p, comments: Math.max(0, (p.comments ?? 0) - 1) } : p))
      );
      setActivePost((prev) => (prev ? { ...prev, comments: Math.max(0, (prev.comments ?? 0) - 1) } : prev));
      toast.success("Comment deleted");
    } catch (error: any) {
      toast.error("Couldn't delete comment", { description: error?.response?.data?.message || error?.message });
    } finally {
      setIsDeletingCommentId(null);
    }
  };

  const fetchFeed = async (q: string, type: string, view: "feed" | "archived") => {
    const requestId = ++fetchRequestIdRef.current;
    setIsLoadingFeed(true);
    try {
      const response = await api.get("/community/posts", {
        params: {
          q: q.trim() ? q.trim() : undefined,
          type: type === "all" ? undefined : type,
          archived: view === "archived" ? true : undefined,
          page: 1,
          limit: 30,
        },
      });

      // A newer fetch (or a local optimistic update, e.g. from creating a post)
      // has since superseded this request — applying this stale response now
      // would silently undo that newer state, so discard it.
      if (requestId !== fetchRequestIdRef.current) return;

      const postsFromApi = (response.data?.posts ?? []).map((post: any): CommunityPost => ({
        id: post.id,
        authorUserId: post.authorUserId ?? post.author_user_id ?? 0,
        authorUsername: post.authorUsername ?? post.author_username ?? "Unknown",
        authorRoles: post.authorRoles ?? post.author_roles ?? [],
        avatar: undefined,
        createdAt: post.createdAt ?? post.created_at ?? new Date().toISOString(),
        content: post.content,
        likes: post.likeCount ?? post.like_count ?? 0,
        comments: post.commentCount ?? post.comment_count ?? 0,
        likedByMe: post.likedByMe ?? post.liked_by_me ?? false,
        type: (post.type ?? "achievement") as CommunityPost["type"],
        topic: post.topic ?? "",
        archived: post.archived ?? false,
        image: post.image
          ? {
            src: post.image.dataUrl ?? post.image.data_url,
            alt: `${post.topic ?? "Workout"} photo`,
            label: "Workout photo",
            description: `Cropped to ${(post.image.aspectRatio ?? post.image.aspect_ratio ?? "4:5") as string}.`,
            aspectRatio: (post.image.aspectRatio ?? post.image.aspect_ratio ?? "4:5") as CropRatioOption,
            cropPosition: post.image.cropPosition ?? post.image.crop_position ?? 50,
            cropZoom: post.image.cropZoom ?? post.image.crop_zoom ?? 100,
          }
          : undefined,
      }));

      setFeedPosts(postsFromApi);
    } catch (error: any) {
      if (requestId !== fetchRequestIdRef.current) return;
      console.error(error);
      toast.error("Unable to load community feed.", {
        description: "Check the backend is running on :8080 and you are logged in.",
      });
    } finally {
      if (requestId === fetchRequestIdRef.current) setIsLoadingFeed(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeed(searchTerm, feedFilter, feedView);
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, feedFilter, feedView]);

  // Compute engagement week-over-week change from real data
  const engagementDelta = useMemo(() => {
    if (!engagementStats || engagementStats.weekly.length < 2) return null;
    const weeks = engagementStats.weekly;
    const current = weeks[weeks.length - 1];
    const previous = weeks[weeks.length - 2];
    const curTotal = current.likes + current.comments;
    const prevTotal = previous.likes + previous.comments;
    if (prevTotal === 0) return curTotal > 0 ? 100 : 0;
    return Math.round(((curTotal - prevTotal) / prevTotal) * 100);
  }, [engagementStats]);

  const topTopic = useMemo(() => {
    if (trendingTopics.length > 0) return trendingTopics[0].topic;
    return null;
  }, [trendingTopics]);

  // Achievement-type posts from the feed
  const achievementPosts = useMemo(
    () => feedPosts.filter((p) => p.type === "achievement"),
    [feedPosts],
  );

  const stats = useMemo(() => {
    const distinctTypes = new Set(feedPosts.map((p) => p.type));
    return {
      activeMembers: activeMemberCount,
      postsToday: feedPosts.filter((p) => {
        const d = new Date(p.createdAt);
        return !Number.isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
      }).length,
      postTypes: distinctTypes.size,
      totalEngagement: engagementStats ? engagementStats.totalLikes + engagementStats.totalComments : 0,
    };
  }, [feedPosts, activeMemberCount, engagementStats]);

  const resetPostDraft = () => {
    setPostDraft(createEmptyPostDraft());

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  };

  const handleCreatePostOpenChange = (open: boolean) => {
    // Don't let the dialog close (and the draft reset) while a post is still sending.
    if (!open && isSubmittingPostRef.current) return;
    setIsCreatePostOpen(open);

    if (!open) {
      resetPostDraft();
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file for the community post.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        toast.error("That photo could not be previewed.");
        return;
      }

      setPostDraft((currentDraft) => ({
        ...currentDraft,
        uploadedPhoto: {
          src: reader.result,
          fileName: file.name,
        },
        cropPosition: 50,
        cropZoom: 100,
      }));

      toast.success("Workout photo ready.", {
        description: "Choose 1:1, 4:5, or 9:16 and adjust the crop before posting.",
      });
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveUploadedPhoto = () => {
    setPostDraft((currentDraft) => ({
      ...currentDraft,
      uploadedPhoto: null,
      cropPosition: 50,
      cropZoom: 100,
    }));

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  };

  const handleCreatePost = () => {
    if (isSubmittingPostRef.current) return;
    const topic = postDraft.topic.trim();
    const content = postDraft.content.trim();

    if (!topic || !content) {
      toast.error("Add a topic and a short update before posting.");
      return;
    }

    const payload: any = {
      topic,
      content,
      type: postDraft.type,
    };

    if (postDraft.uploadedPhoto) {
      // Backend uses SNAKE_CASE naming strategy, so send snake_case to ensure it deserializes.
      payload.image_data_url = postDraft.uploadedPhoto.src;
      payload.image_aspect_ratio = postDraft.aspectRatio;
      payload.image_crop_position = postDraft.cropPosition;
      payload.image_crop_zoom = postDraft.cropZoom;
    }

    isSubmittingPostRef.current = true;
    setIsSubmittingPost(true);
    api.post("/community/posts", payload)
      .then((response) => {
        const post = response.data;
        const normalized: CommunityPost = {
          id: post.id,
          authorUserId: post.authorUserId ?? post.author_user_id ?? 0,
          authorUsername: post.authorUsername ?? post.author_username ?? "Unknown",
          authorRoles: post.authorRoles ?? post.author_roles ?? [],
          avatar: undefined,
          createdAt: post.createdAt ?? post.created_at ?? new Date().toISOString(),
          content: post.content,
          likes: post.likeCount ?? post.like_count ?? 0,
          comments: post.commentCount ?? post.comment_count ?? 0,
          likedByMe: post.likedByMe ?? post.liked_by_me ?? false,
          type: (post.type ?? "achievement") as CommunityPost["type"],
          topic: post.topic ?? "",
          image: post.image
            ? {
              src: post.image.dataUrl ?? post.image.data_url,
              alt: `${post.topic ?? "Workout"} photo`,
              label: createUploadedPhotoLabel(postDraft.uploadedPhoto?.fileName ?? "Workout upload"),
              description: `Uploaded and cropped to ${(post.image.aspectRatio ?? post.image.aspect_ratio ?? "4:5") as string}.`,
              aspectRatio: (post.image.aspectRatio ?? post.image.aspect_ratio ?? "4:5") as CropRatioOption,
              cropPosition: post.image.cropPosition ?? post.image.crop_position ?? 50,
              cropZoom: post.image.cropZoom ?? post.image.crop_zoom ?? 100,
            }
            : undefined,
        };

        // Invalidate any fetchFeed() still in flight (most commonly the
        // initial page-load fetch) so its response can't land after this and
        // silently overwrite the feed back to a version without this post.
        fetchRequestIdRef.current += 1;
        setFeedPosts((currentPosts) => [normalized, ...currentPosts]);
        setSearchTerm("");
        setFeedFilter("all");
        isSubmittingPostRef.current = false;
        setIsSubmittingPost(false);
        setIsCreatePostOpen(false);
        resetPostDraft();

        toast.success("Community post published.", {
          description: normalized.image
            ? "Your workout photo was attached and added to the feed."
            : "Your update is now visible in the community feed.",
        });
      })
      .catch((error) => {
        console.error(error);
        toast.error("Unable to publish community post.", {
          description: "Make sure you are logged in.",
        });
      })
      .finally(() => {
        isSubmittingPostRef.current = false;
        setIsSubmittingPost(false);
      });
  };

  const openComments = async (post: CommunityPost) => {
    setActivePost(post);
    setIsCommentsOpen(true);
    setIsLoadingComments(true);
    setComments([]);
    setNewComment("");
    try {
      const response = await api.get(`/community/posts/${post.id}/comments`);
      const normalized = (response.data ?? []).map((comment: any): CommunityComment => ({
        id: comment.id,
        postId: comment.postId ?? comment.post_id ?? post.id,
        content: comment.content ?? "",
        authorUserId: comment.authorUserId ?? comment.author_user_id ?? 0,
        authorUsername: comment.authorUsername ?? comment.author_username ?? "Unknown",
        authorRoles: comment.authorRoles ?? comment.author_roles ?? [],
        createdAt: comment.createdAt ?? comment.created_at ?? new Date().toISOString(),
      }));
      setComments(normalized);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load comments.");
    } finally {
      setIsLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!activePost) return;
    const content = newComment.trim();
    if (!content) {
      toast.error("Write a comment first.");
      return;
    }

    try {
      const response = await api.post(`/community/posts/${activePost.id}/comments`, { content });
      const raw = response.data;
      const saved: CommunityComment = {
        id: raw.id,
        postId: raw.postId ?? raw.post_id ?? activePost.id,
        content: raw.content ?? "",
        authorUserId: raw.authorUserId ?? raw.author_user_id ?? 0,
        authorUsername: raw.authorUsername ?? raw.author_username ?? "Unknown",
        authorRoles: raw.authorRoles ?? raw.author_roles ?? [],
        createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
      };
      setComments((prev) => [...prev, saved]);
      setNewComment("");
      setFeedPosts((prev) =>
        prev.map((p) => (p.id === activePost.id ? { ...p, comments: (p.comments ?? 0) + 1 } : p))
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to add comment.", { description: "Make sure you are logged in." });
    }
  };

  const toggleLike = async (post: CommunityPost) => {
    try {
      const response = await api.post(`/community/posts/${post.id}/like`);
      const likeCount = response.data?.likeCount ?? response.data?.like_count ?? post.likes;
      const liked = response.data?.liked ?? response.data?.liked_by_me ?? response.data?.likedByMe ?? post.likedByMe ?? false;
      setFeedPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likes: likeCount, likedByMe: liked } : p))
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to like post.", { description: "Make sure you are logged in." });
    }
  };

  const weeklyEngagement = (engagementStats?.weekly ?? []).map((w) => ({ week: w.weekLabel, value: w.likes + w.comments }));
  const topicMax = Math.max(1, ...trendingTopics.map((t) => t.postCount));
  const typeTotal = Math.max(1, (engagementStats?.byType ?? []).reduce((s, t) => s + t.posts, 0));
  const byScore = [...leaderboard].sort((a, b) => b.engagementScore - a.engagementScore);
  const byLikes = [...leaderboard].sort((a, b) => b.totalLikes - a.totalLikes);
  const presentTypes = Array.from(new Set(feedPosts.map((p) => p.type)));

  const tabs: { id: CommunityTab; label: string; icon: typeof Trophy; count?: number }[] = [
    { id: "feed", label: "Community Feed", icon: MessageSquare, count: feedPosts.length },
    { id: "events", label: "Events", icon: Calendar },
    { id: "achievements", label: "Achievements", icon: Trophy, count: achievementPosts.length },
    { id: "leaderboard", label: "Leaderboard", icon: Medal, count: leaderboard.length || undefined },
  ];

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={hub.hero}>
        <div>
          <span className={hub.heroTag}><Sparkles size={12} />Member community hub</span>
          <h1 className={hub.heroTitle}>Community</h1>
          <p className={hub.heroText}>
            Connect with fellow gym members and share your fitness journey through posts, events, streaks, and community recognition.
          </p>
        </div>
        <div className={hub.heroActions}>
          <button type="button" className={hub.heroBtn} onClick={() => setActiveTab("events")}>
            <Calendar size={16} />Browse Events
          </button>
          <button
            type="button"
            className={`${hub.heroBtn} ${hub.heroBtnSolid}`}
            onClick={() => { setActiveTab("feed"); setFeedView("feed"); setIsCreatePostOpen(true); }}
          >
            <Plus size={16} />Create Post
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className={hub.kpis}>
        <div className={`${styles.card} ${styles.kpi}`}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Active Members</span>
            <span className={styles.kpiIcon} data-tone="blue"><Users size={16} /></span>
          </div>
          <div className={styles.kpiValue}>{stats.activeMembers.toLocaleString()}</div>
          <div className={styles.kpiHint}>Members participating in community interactions</div>
        </div>
        <div className={`${styles.card} ${styles.kpi}`}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Posts Today</span>
            <span className={styles.kpiIcon} data-tone="green"><MessageSquare size={16} /></span>
          </div>
          <div className={styles.kpiValue}>{stats.postsToday.toLocaleString()}</div>
          <div className={styles.kpiHint}>Shared wins, questions, and updates since morning</div>
        </div>
        <div className={`${styles.card} ${styles.kpi}`}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Post Types</span>
            <span className={styles.kpiIcon} data-tone="orange"><Target size={16} /></span>
          </div>
          <div className={styles.kpiValue}>{stats.postTypes}<span className={styles.muted} style={{ fontSize: "1rem", fontWeight: 600 }}> / 3</span></div>
          <div className={styles.kpiHint}>
            {presentTypes.length ? presentTypes.map((t) => TYPE_META[t]?.plural ?? t).join(" · ") : "Distinct content categories in the feed"}
          </div>
        </div>
        <div className={`${styles.card} ${styles.kpi}`}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Total Engagement</span>
            <span className={styles.kpiIcon} data-tone="violet"><Heart size={16} /></span>
          </div>
          <div className={styles.kpiValue}>{stats.totalEngagement.toLocaleString()}</div>
          <div className={styles.kpiFoot}>
            {engagementDelta !== null && (
              <span className={styles.delta} data-tone={engagementDelta > 0 ? "good" : engagementDelta < 0 ? "bad" : "flat"}>
                {engagementDelta > 0 ? <ArrowUpRight size={13} /> : engagementDelta < 0 ? <ArrowDownRight size={13} /> : null}
                {Math.abs(engagementDelta)}% this week
              </span>
            )}
            <span>Total likes and comments across all posts</span>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className={`${styles.card} ${hub.tabsBar}`} role="tablist" aria-label="Community sections">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} data-active={activeTab === id} className={hub.tab} onClick={() => setActiveTab(id)}>
            <Icon size={15} />{label}
            {count != null && count > 0 && <span className={hub.tabCount}>{count}</span>}
          </button>
        ))}
      </div>

      {/* ── Feed ── */}
      {activeTab === "feed" && (
        <div className={hub.body} key="feed">
          <div className={hub.feedGrid}>
            <div className={hub.feedMain}>
              {/* Composer */}
              <div className={`${styles.card} ${hub.composer}`}>
                <span className={hub.avatar} style={{ ["--av" as any]: "var(--primary)" }} aria-hidden><Plus size={18} /></span>
                <button
                  type="button"
                  className={hub.composerInput}
                  onClick={() => setIsCreatePostOpen(true)}
                  disabled={feedView === "archived"}
                  title={feedView === "archived" ? "Switch to Feed to create a post" : undefined}
                >
                  Share a win, ask a question, or post a training tip…
                </button>
                <div className={hub.composerChips}>
                  {(["achievement", "question", "tip"] as const).map((t) => {
                    const Icon = TYPE_META[t].icon;
                    return (
                      <button
                        key={t}
                        type="button"
                        className={hub.composerChip}
                        data-ptype={t}
                        disabled={feedView === "archived"}
                        onClick={() => { setPostDraft((d) => ({ ...d, type: t })); setIsCreatePostOpen(true); }}
                      >
                        <Icon size={13} />{TYPE_META[t].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search + filters + feed/archived */}
              <div className={`${styles.card} ${hub.toolbar}`}>
                <div className={hub.search}>
                  <Search size={16} />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search posts, topics, or members..."
                    aria-label="Search posts"
                  />
                </div>
                <div className={hub.filterChips} role="group" aria-label="Post type">
                  {(["all", "achievement", "question", "tip"] as const).map((f) => (
                    <button key={f} type="button" className={hub.filterChip} data-active={feedFilter === f} aria-pressed={feedFilter === f} onClick={() => setFeedFilter(f)}>
                      {f === "all" ? "All Posts" : TYPE_META[f].plural}
                    </button>
                  ))}
                </div>
                <div className={styles.seg} role="tablist" aria-label="Feed view">
                  <button type="button" role="tab" aria-selected={feedView === "feed"} className={styles.segBtn} data-active={feedView === "feed"} onClick={() => setFeedView("feed")}>
                    Feed
                  </button>
                  <button type="button" role="tab" aria-selected={feedView === "archived"} className={styles.segBtn} data-active={feedView === "archived"} onClick={() => setFeedView("archived")}>
                    <Archive size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />Archived
                  </button>
                </div>
              </div>

              {/* Posts */}
              {isLoadingFeed ? (
                [0, 1].map((i) => (
                  <div key={i} className={`${styles.card} ${hub.skeleton}`} aria-hidden>
                    <div className={hub.skelLine} style={{ width: "35%" }} />
                    <div className={hub.skelLine} style={{ width: "90%" }} />
                    <div className={hub.skelLine} style={{ width: "70%" }} />
                  </div>
                ))
              ) : filteredPosts.length === 0 ? (
                <div className={styles.card}>
                  {feedView === "archived" ? (
                    <EmptyState icon={Archive} title="No archived posts" text="Posts you archive are hidden from everyone and kept here." />
                  ) : searchTerm.trim() || feedFilter !== "all" ? (
                    <EmptyState icon={Search} title="No matching posts" text="Try a different search or post type." />
                  ) : (
                    <EmptyState icon={MessageSquare} title="No posts yet" text="Create the first community update." />
                  )}
                </div>
              ) : filteredPosts.map((post) => (
                <article key={post.id} className={`${styles.card} ${hub.post}`} data-archived={post.archived ? "true" : undefined}>
                  <div className={hub.postHead}>
                    <InitialsAvatar name={post.authorUsername} />
                    <div className={hub.postMeta}>
                      <span className={hub.postAuthor}>{post.authorUsername}</span>
                      <span className={hub.postSub}>
                        <span>{safeFormatTime(post.createdAt)}</span>
                        <span className={hub.dot} />
                        <TypePill type={post.type} />
                        {post.topic && <span className={hub.topicChip} title={post.topic}>#{post.topic}</span>}
                        {post.image && (
                          <span className={hub.topicChip}><ImageIcon size={11} style={{ marginRight: 3 }} />{post.image.aspectRatio}</span>
                        )}
                        {post.archived && <span className={styles.status} data-status="warning"><Archive size={11} />Archived</span>}
                      </span>
                    </div>
                    {canDeletePost(post) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className={hub.iconBtn} disabled={isDeletingPostId === post.id} title="Post options" aria-label="Post options">
                            {isDeletingPostId === post.id ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => toggleArchivePost(post, !(post.archived ?? false))}>
                            <Archive className="h-4 w-4" />
                            {(post.archived ?? false) ? "Unarchive post" : "Archive post"}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => deletePost(post)}>
                            <Trash2 className="h-4 w-4" />
                            Delete post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>

                  <p className={hub.postContent}>{post.content}</p>

                  {post.image ? (
                    <div style={{ width: post.image.aspectRatio === "9:16" ? 200 : post.image.aspectRatio === "1:1" ? 280 : 260, maxWidth: "100%" }}>
                      <div className={hub.postImage}>
                        <AspectRatio ratio={getAspectRatioValue(post.image.aspectRatio)}>
                          <img
                            src={post.image.src}
                            alt={post.image.alt}
                            className="absolute inset-0 h-full w-full object-cover"
                            style={getCropPreviewStyle(post.image.cropPosition, post.image.cropZoom)}
                          />
                        </AspectRatio>
                      </div>
                    </div>
                  ) : null}

                  <div className={hub.postActions}>
                    <button type="button" className={`${hub.action} ${hub.actionLike}`} data-liked={post.likedByMe ? "true" : undefined} onClick={() => toggleLike(post)} aria-pressed={!!post.likedByMe}>
                      <Heart size={16} />{post.likes} <span className="sr-only">likes</span>
                    </button>
                    <button type="button" className={hub.action} onClick={() => openComments(post)}>
                      <MessageCircle size={16} />{post.comments} <span className="sr-only">comments</span>
                    </button>
                    <button type="button" className={hub.action} onClick={() => toast.success("Share options opened.")}>
                      <Share2 size={16} />Share
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Sidebar */}
            <aside className={hub.aside}>
              <div className={`${styles.card} ${styles.panel}`}>
                <div className={styles.panelHead}>
                  <div>
                    <h3 className={styles.panelTitle}>Community Pulse</h3>
                    <div className={styles.panelSub}>What the member base is talking about right now.</div>
                  </div>
                </div>
                <div className={styles.block}>
                  <div className={styles.factLabel} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <TrendingUp size={14} />Engagement this week
                  </div>
                  <div className={hub.pulseRow}>
                    <div>
                      <div className={hub.pulseValue} style={{ color: engagementDelta == null ? undefined : engagementDelta >= 0 ? "var(--good-ink)" : "var(--bad-ink)" }}>
                        {engagementDelta !== null ? `${engagementDelta >= 0 ? "+" : ""}${engagementDelta}%` : "—"}
                      </div>
                      <div className={styles.note}>
                        {engagementDelta !== null
                          ? engagementDelta >= 0
                            ? "More interactions than last week."
                            : "Fewer interactions than last week."
                          : "Not enough data yet to compare weeks."}
                      </div>
                    </div>
                    {weeklyEngagement.length > 1 && (
                      <div className={hub.spark} aria-hidden>
                        <ResponsiveContainer>
                          <LineChart data={weeklyEngagement} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
                            <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.block}>
                  <div className={styles.factLabel} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Star size={14} />Most discussed topic
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.0625rem", marginTop: 4 }}>{topTopic ?? "No posts yet"}</div>
                  <div className={styles.note}>
                    {topTopic
                      ? `"${topTopic}" is the most-posted topic in the last 30 days.`
                      : "Topics will appear once members start posting."}
                  </div>
                </div>
              </div>

              <div className={`${styles.card} ${styles.panel}`}>
                <div className={styles.panelHead}>
                  <h3 className={styles.panelTitle}>Trending Topics</h3>
                </div>
                {trendingTopics.length === 0 ? (
                  <div className={styles.note} style={{ textAlign: "center", padding: "0.75rem 0" }}>No trending topics yet. Start posting to see what's popular.</div>
                ) : (
                  <div className={hub.topicRows}>
                    {trendingTopics.map((item, idx) => (
                      <React.Fragment key={item.topic}>
                        <div className={hub.topicRow}>
                          <span className={hub.rank}>{idx + 1}</span>
                          <button type="button" className={hub.topicName} style={{ border: 0, background: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "inherit" }}
                            title={`Search “${item.topic}”`} onClick={() => setSearchTerm(item.topic)}>
                            #{item.topic}
                          </button>
                          <span className={hub.countPill}>{item.postCount} {item.postCount === 1 ? "post" : "posts"}</span>
                          <span />
                          <div className={hub.topicBar}><div className={hub.topicFill} style={{ width: `${(item.postCount / topicMax) * 100}%` }} /></div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {byScore.length > 0 && (
                <div className={`${styles.card} ${styles.panel}`}>
                  <div className={styles.panelHead}>
                    <h3 className={styles.panelTitle}>Top Contributors</h3>
                    <button type="button" className={styles.linkBtn} onClick={() => setActiveTab("leaderboard")}>
                      Leaderboard<ChevronRight size={12} style={{ display: "inline", verticalAlign: -2 }} />
                    </button>
                  </div>
                  <div className={hub.people}>
                    {byScore.slice(0, 3).map((entry, idx) => (
                      <div key={entry.userId} className={hub.person}>
                        <span className={hub.medal} data-rank={idx + 1}>{idx + 1}</span>
                        <InitialsAvatar name={entry.username} small />
                        <span className={hub.personName}>{entry.username}</span>
                        <span className={hub.countPill}>{entry.engagementScore.toLocaleString()} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* ── Events ── */}
      {activeTab === "events" && (
        <div className={hub.body} key="events">
          <div className={`${styles.card} ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h3 className={styles.panelTitle}>Community Events</h3>
                <div className={styles.panelSub}>Events will appear here once the events feature is set up in your gym management system.</div>
              </div>
            </div>
            <EmptyState icon={Calendar} title="No community events yet" text="When events are created, they will appear here for members to browse and join." />
          </div>
        </div>
      )}

      {/* ── Achievements ── */}
      {activeTab === "achievements" && (
        <div className={hub.body} key="achievements">
          <div className={hub.split}>
            <div className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h3 className={styles.panelTitle}>Recent Achievements</h3>
                  <div className={styles.panelSub}>Achievement posts shared by members in the community feed.</div>
                </div>
              </div>
              {achievementPosts.length === 0 ? (
                <EmptyState icon={Trophy} title="No achievement posts yet" text={'Achievements will appear here when members share posts of type "achievement".'} />
              ) : (
                <div className={hub.achList}>
                  {achievementPosts.slice(0, 8).map((post) => (
                    <div key={post.id} className={hub.ach}>
                      <span className={hub.trophy}><Trophy size={20} /></span>
                      <div style={{ minWidth: 0 }}>
                        <div className={hub.postSub}>
                          <span className={hub.postAuthor} style={{ color: "var(--foreground)" }}>{post.authorUsername}</span>
                          <TypePill type="achievement" />
                          {post.topic && <span className={hub.topicChip}>#{post.topic}</span>}
                        </div>
                        <p className={hub.achText}>{post.content}</p>
                      </div>
                      <div className={hub.achSide}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Heart size={12} />{post.likes}</span>
                        <span>{safeFormatTime(post.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={hub.aside} style={{ position: "static" }}>
              <div className={`${styles.card} ${styles.panel}`}>
                <div className={styles.panelHead}>
                  <div>
                    <h3 className={styles.panelTitle}>Achievement Pulse</h3>
                    <div className={styles.panelSub}>Real achievement activity from community posts.</div>
                  </div>
                </div>
                <div className={hub.statPair}>
                  <div className={hub.statBox}>
                    <span className={styles.factLabel} style={{ display: "flex", alignItems: "center", gap: 6 }}><Medal size={14} />Achievement posts</span>
                    <span className={hub.statBoxValue}>{achievementPosts.length}</span>
                    <span className={styles.note}>Total achievement posts shared by members.</span>
                  </div>
                  <div className={hub.statBox}>
                    <span className={styles.factLabel} style={{ display: "flex", alignItems: "center", gap: 6 }}><Flame size={14} />Engagement</span>
                    <span className={hub.statBoxValue}>{achievementPosts.reduce((sum, p) => sum + p.likes + p.comments, 0)}</span>
                    <span className={styles.note}>Total likes and comments on achievement posts.</span>
                  </div>
                </div>
              </div>

              <div className={`${styles.card} ${styles.panel}`}>
                <div className={styles.panelHead}>
                  <h3 className={styles.panelTitle}>Post Type Breakdown</h3>
                </div>
                {engagementStats && engagementStats.byType.length > 0 ? (
                  <div className={styles.barRows}>
                    {engagementStats.byType.map((t) => (
                      <div key={t.type} className={styles.barRow}>
                        <span className={styles.barName} style={{ textTransform: "capitalize" }}>{t.type}</span>
                        <span className={styles.barVal}>{t.posts} {t.posts === 1 ? "post" : "posts"}</span>
                        <div className={styles.barTrack}>
                          <div className={styles.track} data-ptype={t.type}>
                            <div className={styles.fill} style={{ width: `${(t.posts / typeTotal) * 100}%`, ["--fill" as any]: "var(--tone, var(--primary))" }} />
                          </div>
                          <span className={styles.barMeta} style={{ minWidth: "6.5rem" }}>{t.likes} likes · {t.comments} comments</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.note} style={{ textAlign: "center", padding: "0.75rem 0" }}>No posts yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Leaderboard ── */}
      {activeTab === "leaderboard" && (
        <div className={hub.body} key="leaderboard">
          {leaderboard.length === 0 ? (
            <div className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h3 className={styles.panelTitle}>Community Leaderboard</h3>
                  <div className={styles.panelSub}>Top contributors ranked by engagement.</div>
                </div>
              </div>
              <EmptyState icon={Trophy} title="No leaderboard data yet" text="The leaderboard will populate once members start posting and engaging." />
            </div>
          ) : (
            <>
              <div className={`${styles.card} ${hub.podiumCard}`}>
                <div className={styles.panelHead} style={{ padding: "1rem 0.25rem 0" }}>
                  <div>
                    <h3 className={styles.panelTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}><Crown size={16} />Community Champions</h3>
                    <div className={styles.panelSub}>Top 3 by engagement score (likes + comments earned)</div>
                  </div>
                </div>
                <div className={hub.podium}>
                  {[1, 0, 2].map((i) => {
                    const entry = byScore[i];
                    if (!entry) return <div key={i} />;
                    return (
                      <div key={entry.userId} className={hub.podiumSpot} data-rank={i + 1}>
                        <InitialsAvatar name={entry.username} />
                        <span className={hub.podiumName}>{entry.username}</span>
                        <span className={hub.podiumScore}>{entry.engagementScore.toLocaleString()} pts · {entry.totalPosts} {entry.totalPosts === 1 ? "post" : "posts"}</span>
                        <div className={hub.podiumBlock}>{i + 1}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={hub.boards}>
                <Ranked title="Top Posters" sub="Most active community contributors" icon={Flame} tone="orange" rows={leaderboard}
                  metric={(e) => `${e.totalPosts} ${e.totalPosts === 1 ? "post" : "posts"}`} />
                <Ranked title="Most Liked" sub="Members whose posts get the most love" icon={Heart} tone="red" rows={byLikes}
                  metric={(e) => `${e.totalLikes} ${e.totalLikes === 1 ? "like" : "likes"}`} />
                <Ranked title="Engagement Score" sub="Combined likes + comments earned" icon={Star} tone="violet" rows={leaderboard}
                  metric={(e) => `${e.engagementScore.toLocaleString()} pts`} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Create post */}
      <Dialog open={isCreatePostOpen} onOpenChange={handleCreatePostOpenChange}>
        <DialogContent className="overflow-hidden rounded-2xl p-0" style={{ maxWidth: "min(520px, calc(100% - 2rem))" }}>
          <div className="flex max-h-[90vh] flex-col bg-white">
            <DialogHeader className="flex-shrink-0 border-b border-slate-200 px-6 py-3">
              <DialogTitle className="text-base">Create Community Post</DialogTitle>
              <DialogDescription className="text-xs">
                Share an update and optionally add a workout photo (1:1, 4:5, or 9:16).
              </DialogDescription>
            </DialogHeader>

            <div className="grid w-full gap-4 overflow-y-auto px-6 py-4">
              <div className="space-y-2">
                <Label>Post Type</Label>
                <div className={hub.typeSeg} role="radiogroup" aria-label="Post type">
                  {(["achievement", "question", "tip"] as const).map((t) => {
                    const Icon = TYPE_META[t].icon;
                    return (
                      <button key={t} type="button" role="radio" aria-checked={postDraft.type === t} className={hub.typeBtn} data-ptype={t} data-active={postDraft.type === t}
                        onClick={() => setPostDraft((d) => ({ ...d, type: t }))}>
                        <Icon size={14} />{TYPE_META[t].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="community-post-topic">Topic</Label>
                <Input
                  id="community-post-topic"
                  value={postDraft.topic}
                  onChange={(event) => setPostDraft((currentDraft) => ({ ...currentDraft, topic: event.target.value }))}
                  placeholder="Workout recap, sprint finisher, recovery win..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="community-post-content">Post Content</Label>
                <Textarea
                  id="community-post-content"
                  rows={3}
                  value={postDraft.content}
                  onChange={(event) => setPostDraft((currentDraft) => ({ ...currentDraft, content: event.target.value }))}
                  placeholder="Share your workout progress, ask a question, or post a quick coaching takeaway..."
                />
              </div>

              <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Workout Photo</Label>
                  <span className={styles.status} data-status={postDraft.uploadedPhoto ? "good" : "info"}>
                    {postDraft.uploadedPhoto ? "1 photo ready" : "Optional"}
                  </span>
                </div>

                {!postDraft.uploadedPhoto ? (
                  <button type="button" onClick={() => uploadInputRef.current?.click()} className={hub.upload}>
                    <span className={hub.uploadIcon}><ImageIcon size={16} /></span>
                    <span>
                      <span className="block text-sm font-semibold">Upload One Workout Photo</span>
                      <span className="block text-xs text-muted-foreground">Choose from your computer or phone</span>
                    </span>
                  </button>
                ) : (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-gray-50 p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 ${getImageFrameWidthClass(postDraft.aspectRatio)}`} style={{ width: "100px" }}>
                        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                          <AspectRatio ratio={getAspectRatioValue(postDraft.aspectRatio)} className="bg-slate-100">
                            <img
                              src={postDraft.uploadedPhoto.src}
                              alt="Uploaded workout preview"
                              className="absolute inset-0 h-full w-full object-cover"
                              style={getCropPreviewStyle(postDraft.cropPosition, postDraft.cropZoom)}
                            />
                          </AspectRatio>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{createUploadedPhotoLabel(postDraft.uploadedPhoto.fileName)}</p>
                          <p className="text-xs text-muted-foreground">Ready for crop adjustment.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => uploadInputRef.current?.click()}>
                            Change
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleRemoveUploadedPhoto}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label>Crop Ratio</Label>
                        <span className={hub.topicChip}>{postDraft.aspectRatio}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {cropRatioOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setPostDraft((currentDraft) => ({ ...currentDraft, aspectRatio: option.value }))}
                            className={hub.ratioBtn}
                            data-active={postDraft.aspectRatio === option.value}
                          >
                            <p className="text-sm font-semibold">{option.label}</p>
                            <p className="text-xs text-muted-foreground">{option.helper}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Crop Position</span>
                        <span>{postDraft.cropPosition}%</span>
                      </div>
                      <Slider
                        value={[postDraft.cropPosition]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={([value]) => setPostDraft((currentDraft) => ({ ...currentDraft, cropPosition: value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Zoom</span>
                        <span>{postDraft.cropZoom}%</span>
                      </div>
                      <Slider
                        value={[postDraft.cropZoom]}
                        min={100}
                        max={140}
                        step={1}
                        onValueChange={([value]) => setPostDraft((currentDraft) => ({ ...currentDraft, cropZoom: value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 border-t border-slate-200 bg-gray-50 px-6 py-3">
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => handleCreatePostOpenChange(false)} disabled={isSubmittingPost}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePost} disabled={isSubmittingPost}>
                  {isSubmittingPost ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {isSubmittingPost ? "Posting..." : "Post to Feed"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments */}
      <Dialog
        open={isCommentsOpen}
        onOpenChange={(open) => {
          setIsCommentsOpen(open);
          if (!open) {
            setActivePost(null);
            setComments([]);
            setNewComment("");
            setIsLoadingComments(false);
          }
        }}
      >
        <DialogContent style={{ maxWidth: "min(560px, calc(100% - 2rem))" }}>
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
            <DialogDescription>
              {activePost ? `Reply to ${activePost.authorUsername}'s post.` : "View community replies."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {activePost && (
              <div className={styles.block}>
                <div className={hub.postSub} style={{ marginBottom: 4 }}>
                  <span className={hub.postAuthor} style={{ color: "var(--foreground)" }}>{activePost.authorUsername}</span>
                  <TypePill type={activePost.type} />
                </div>
                <p className={hub.achText}>{activePost.content}</p>
              </div>
            )}
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {isLoadingComments ? (
                <p className="text-sm text-muted-foreground">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet. Be the first to reply.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className={hub.comment}>
                    <InitialsAvatar name={comment.authorUsername} small />
                    <div className={hub.bubble}>
                      <div className={hub.bubbleHead}>
                        <span className="text-sm font-semibold">{comment.authorUsername}</span>
                        <span className="text-xs text-muted-foreground">{safeFormatTime(comment.createdAt)}</span>
                      </div>
                      <p className={hub.bubbleText}>{comment.content}</p>
                    </div>
                    {canDeleteComment(comment) ? (
                      <button
                        type="button"
                        className={hub.iconBtn}
                        onClick={() => deleteComment(comment)}
                        disabled={isDeletingCommentId === comment.id}
                        title="Delete comment"
                        aria-label="Delete comment"
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : <span />}
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="community-comment">Add a comment</Label>
              <Textarea
                id="community-comment"
                rows={3}
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder="Write a quick reply..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCommentsOpen(false)}>
                Close
              </Button>
              <Button onClick={submitComment} disabled={!activePost}>
                Post Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
