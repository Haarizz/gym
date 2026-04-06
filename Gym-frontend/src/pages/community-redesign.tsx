import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { AspectRatio } from "../components/ui/aspect-ratio";
import { Slider } from "../components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { cn } from "../components/ui/utils";
import api from "../api/axiosConfig";
import {
  Calendar,
  ChevronRight,
  Filter,
  Flame,
  Heart,
  Image as ImageIcon,
  MapPin,
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

const upcomingEvents: CommunityEvent[] = [
  { id: 1, title: "HIIT Challenge Week", date: "Oct 1-7, 2024", participants: 45, description: "A seven-day high-intensity challenge with daily scoreboards and recovery guidance.", location: "Studio A", host: "Coach Riya" },
  { id: 2, title: "Nutrition Workshop", date: "Oct 12, 2024", participants: 23, description: "Meal prep systems, portion guidance, and practical grocery planning for busy members.", location: "Community Lounge", host: "Coach Daniel" },
  { id: 3, title: "Yoga Retreat Weekend", date: "Oct 19-20, 2024", participants: 18, description: "A slower weekend flow focused on mobility, breathwork, and stress recovery.", location: "Lakeside Park", host: "Coach Maya" },
];

const achievements: MemberAchievement[] = [
  { id: 1, member: "Sarah Johnson", achievement: "Deadlift PR - 185 lbs", date: "Today", badge: "strength", summary: "Improved by 10 lbs over the previous best." },
  { id: 2, member: "David Thompson", achievement: "30-Day Streak", date: "Yesterday", badge: "consistency", summary: "Logged a full month of uninterrupted workouts." },
  { id: 3, member: "Lisa Wong", achievement: "First 5K Run", date: "2 days ago", badge: "cardio", summary: "Completed her first 5K after six weeks of training." },
];

const leaderboardCards = [
  { title: "Workout Streak", description: "Consecutive training days", rows: [{ rank: "1", name: "David Thompson", value: "30 days" }, { rank: "2", name: "Sarah Johnson", value: "28 days" }, { rank: "3", name: "Mike Chen", value: "25 days" }] },
  { title: "Monthly Visits", description: "Most visits this month", rows: [{ rank: "1", name: "Lisa Wong", value: "22 visits" }, { rank: "2", name: "Emily Rodriguez", value: "20 visits" }, { rank: "3", name: "Sarah Johnson", value: "19 visits" }] },
  { title: "Community Points", description: "Engagement score leaders", rows: [{ rank: "1", name: "Mike Chen", value: "1,250 pts" }, { rank: "2", name: "Sarah Johnson", value: "1,180 pts" }, { rank: "3", name: "David Thompson", value: "1,095 pts" }] },
];

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

export function Community() {
  const [feedPosts, setFeedPosts] = useState<CommunityPost[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedFilter, setFeedFilter] = useState<"all" | CommunityPost["type"]>("all");
  const [feedView, setFeedView] = useState<"feed" | "archived">("feed");
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [postDraft, setPostDraft] = useState<CommunityPostDraft>(createEmptyPostDraft);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";
  const softButton = "border-0 bg-white text-slate-700 shadow-sm hover:bg-red-50 hover:text-red-600";

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activePost, setActivePost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isDeletingPostId, setIsDeletingPostId] = useState<number | null>(null);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<number | null>(null);

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
    return normalized === "ADMIN" || normalized === "ROLE_ADMIN";
  });
  const canDeletePost = (post: CommunityPost) =>
    isAdmin || (Number.isFinite(currentUserId) && Number(post.authorUserId) === Number(currentUserId));

  const canDeleteComment = (comment: CommunityComment) =>
    isAdmin || (Number.isFinite(currentUserId) && Number(comment.authorUserId) === Number(currentUserId));

  const filteredPosts = feedPosts;

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
      console.error(error);
      toast.error("Unable to load community feed.", {
        description: "Check the backend is running on :8080 and you are logged in.",
      });
    } finally {
      setIsLoadingFeed(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeed(searchTerm, feedFilter, feedView);
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, feedFilter, feedView]);

  const stats = useMemo(() => ({
    activeMembers: 410,
    postsToday: feedPosts.length,
    openChallenges: 3,
    eventRsvps: upcomingEvents.reduce((sum, event) => sum + event.participants, 0),
  }), [feedPosts.length]);

  const resetPostDraft = () => {
    setPostDraft(createEmptyPostDraft());

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  };

  const handleCreatePostOpenChange = (open: boolean) => {
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

        setFeedPosts((currentPosts) => [normalized, ...currentPosts]);
        setSearchTerm("");
        setFeedFilter("all");
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

  const getPostTypeColor = (type: CommunityPost["type"]) => {
    switch (type) {
      case "achievement":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "question":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "tip":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getBadgeColor = (badge: MemberAchievement["badge"]) => {
    switch (badge) {
      case "strength":
        return "bg-red-100 text-red-800 border-red-200";
      case "consistency":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "cardio":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <style>{`
        @keyframes communityFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .community-panel {
          animation: communityFadeIn 0.22s ease-out;
        }
      `}</style>
      <Card className="community-panel overflow-hidden border-primary/10 shadow-md">
        <CardContent className="p-0">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_40%),linear-gradient(135deg,_rgba(255,255,255,1)_0%,_rgba(248,250,252,1)_45%,_rgba(254,242,242,0.75)_100%)] p-6">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit border-primary/20 bg-white/80 text-primary">
                Member community hub
              </Badge>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Community</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Connect with fellow gym members and share your fitness journey through posts, events, streaks, and community recognition.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  className={softButton}
                  onClick={() =>
                    toast.success("Events view highlighted.", {
                      description: "Community events and challenge cards are ready below."
                    })
                  }
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Browse Events
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="community-panel grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active Members</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.activeMembers}</div>
            <p className="text-xs text-muted-foreground">Members participating in community interactions</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Posts Today</CardTitle>
            <div className="rounded-lg bg-emerald-50 p-2">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{stats.postsToday}</div>
            <p className="text-xs text-muted-foreground">Shared wins, questions, and updates since morning</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Open Challenges</CardTitle>
            <div className="rounded-lg bg-orange-50 p-2">
              <Target className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{stats.openChallenges}</div>
            <p className="text-xs text-muted-foreground">Current accountability and challenge tracks</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Event RSVPs</CardTitle>
            <div className="rounded-lg bg-purple-50 p-2">
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.eventRsvps}</div>
            <p className="text-xs text-muted-foreground">Sign-ups across upcoming workshops and challenges</p>
          </CardContent>
        </Card>
      </div>

      <Card className={`${cardShell} community-panel`}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
                placeholder="Search posts, topics, or members..."
              />
            </div>
            <Button variant={feedFilter === "all" ? "default" : "outline"} size="sm" className={feedFilter === "all" ? "" : softButton} onClick={() => setFeedFilter("all")}>
              All Posts
            </Button>
            <Button variant={feedFilter === "achievement" ? "default" : "outline"} size="sm" className={feedFilter === "achievement" ? "" : softButton} onClick={() => setFeedFilter("achievement")}>
              Achievements
            </Button>
            <Button variant={feedFilter === "question" ? "default" : "outline"} size="sm" className={feedFilter === "question" ? "" : softButton} onClick={() => setFeedFilter("question")}>
              Questions
            </Button>
            <Button variant={feedFilter === "tip" ? "default" : "outline"} size="sm" className={feedFilter === "tip" ? "" : softButton} onClick={() => setFeedFilter("tip")}>
              Tips
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="feed" className="community-panel space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[560px] lg:grid-cols-4">
          <TabsTrigger value="feed">Community Feed</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
            <Card className={cardShell}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Community Feed</CardTitle>
                    <CardDescription>Motivation, questions, coaching moments, and photo updates from active members.</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                      <Button
                        type="button"
                        size="sm"
                        variant={feedView === "feed" ? "default" : "ghost"}
                        className="h-9 rounded-2xl px-3"
                        onClick={() => setFeedView("feed")}
                      >
                        Feed
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={feedView === "archived" ? "default" : "ghost"}
                        className="h-9 rounded-2xl px-3"
                        onClick={() => setFeedView("archived")}
                      >
                        Archived
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className={softButton}
                      onClick={() =>
                        toast.success("Feed filters are ready above.", {
                          description: "Use search and post-type filters to refine the community feed."
                        })
                      }
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      Refine Feed
                    </Button>
                    <Button
                      size="sm"
                      className="h-10 rounded-2xl px-3 shadow-sm"
                      onClick={() => setIsCreatePostOpen(true)}
                      disabled={feedView === "archived"}
                      title={feedView === "archived" ? "Switch to Feed to create a post" : undefined}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Post
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingFeed ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 text-sm text-muted-foreground">
                    Loading community posts...
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 text-sm text-muted-foreground">
                    No posts yet. Create the first community update.
                  </div>
                ) : filteredPosts.map((post) => (
                  <div key={post.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-11 w-11 shadow-sm">
                        <AvatarImage src={post.avatar ?? ""} />
                        <AvatarFallback>
                          {post.authorUsername
                            .split(" ")
                            .map((name) => name[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">{post.authorUsername}</span>
                          <span className="text-sm text-muted-foreground">{safeFormatTime(post.createdAt)}</span>
                          <Badge className={getPostTypeColor(post.type)}>{post.type}</Badge>
                          <Badge variant="outline">{post.topic}</Badge>
                          {post.image ? (
                            <Badge variant="outline" className="bg-white">
                              <ImageIcon className="mr-1 h-3 w-3" />
                              {post.image.aspectRatio}
                            </Badge>
                          ) : null}
                          {canDeletePost(post) ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="ml-auto h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100"
                                  disabled={isDeletingPostId === post.id}
                                  title="Post options"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={() => toggleArchivePost(post, !(post.archived ?? false))}
                                >
                                  <Archive className="h-4 w-4" />
                                  {(post.archived ?? false) ? "Unarchive post" : "Archive post"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => deletePost(post)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete post
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                        <p className="text-sm leading-6 text-slate-700">{post.content}</p>
                        {post.image ? (
                          <div style={{ width: post.image.aspectRatio === "9:16" ? 80 : 120 }}>
                            <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                              <AspectRatio ratio={getAspectRatioValue(post.image.aspectRatio)} className="bg-slate-100">
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
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "bg-white text-muted-foreground shadow-sm hover:bg-red-50 hover:text-red-600",
                              post.likedByMe ? "text-red-600" : null,
                            )}
                            onClick={() => toggleLike(post)}
                          >
                            <Heart className={cn("mr-1 h-4 w-4", post.likedByMe ? "fill-red-500 text-red-500" : null)} />
                            {post.likes}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-white text-muted-foreground shadow-sm hover:bg-red-50 hover:text-red-600"
                            onClick={() => openComments(post)}
                          >
                            <MessageCircle className="mr-1 h-4 w-4" />
                            {post.comments}
                          </Button>
                          <Button variant="ghost" size="sm" className="bg-white text-muted-foreground shadow-sm hover:bg-red-50 hover:text-red-600" onClick={() => toast.success("Share options opened.")}>
                            <Share2 className="mr-1 h-4 w-4" />
                            Share
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className={cardShell}>
                <CardHeader>
                  <CardTitle>Community Pulse</CardTitle>
                  <CardDescription>What the member base is talking about right now.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      Engagement this week
                    </div>
                    <p className="mt-2 text-2xl font-bold">+18%</p>
                    <p className="text-xs text-muted-foreground">More comments and post shares than last week.</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Star className="h-4 w-4 text-amber-500" />
                      Most discussed topic
                    </div>
                    <p className="mt-2 text-lg font-semibold">Workout accountability</p>
                    <p className="text-xs text-muted-foreground">Members are actively looking for training partners and weekly check-ins.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={cardShell}>
                <CardHeader>
                  <CardTitle>Trending Topics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { topic: "Workout accountability", count: "12 posts" },
                    { topic: "Deadlift progress", count: "8 posts" },
                    { topic: "Nutrition swaps", count: "6 posts" },
                    { topic: "Morning partner search", count: "5 posts" },
                  ].map((item) => (
                    <div key={item.topic} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-sm font-medium">{item.topic}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className={cardShell}>
                <CardHeader>
                  <CardTitle>Suggested Circles</CardTitle>
                  <CardDescription>Small groups members can join based on interests.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { name: "Strength Club", members: "84 members" },
                    { name: "Morning Crew", members: "57 members" },
                    { name: "Meal Prep Circle", members: "39 members" },
                  ].map((group) => (
                    <div key={group.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3">
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.members}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
            <div className="grid gap-4">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className={cardShell}>
                  <CardContent className="p-0">
                    <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                      <div className="flex flex-col justify-between border-r border-slate-200 bg-slate-50 p-5 text-slate-900">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Community Event</p>
                          <p className="mt-3 text-2xl font-bold">{event.date}</p>
                        </div>
                        <Badge variant="outline" className="w-fit bg-white text-slate-700">
                          {event.participants} joined
                        </Badge>
                      </div>
                      <div className="p-5 space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold">{event.title}</h3>
                          <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg bg-slate-50 p-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              Location
                            </div>
                            <p className="mt-1 font-medium text-slate-800">{event.location}</p>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              Host
                            </div>
                            <p className="mt-1 font-medium text-slate-800">{event.host}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button size="sm" onClick={() => toast.success(`Joined ${event.title}.`, { description: "The event card is interactive with mock data." })}>
                            Join Event
                          </Button>
                          <Button variant="outline" size="sm" className={softButton}>
                            Save Spot
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Event Snapshot</CardTitle>
                <CardDescription>Quick view of community programming activity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-muted-foreground">Upcoming events</p>
                  <p className="mt-2 text-2xl font-bold">{upcomingEvents.length}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-muted-foreground">Total RSVPs</p>
                  <p className="mt-2 text-2xl font-bold">{stats.eventRsvps}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-muted-foreground">Highest demand</p>
                  <p className="mt-2 text-lg font-semibold">HIIT Challenge Week</p>
                  <p className="text-xs text-muted-foreground">Currently leading sign-ups and member mentions.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>Celebrate member milestones and visible progress stories.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                      <Trophy className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{achievement.member}</span>
                        <Badge className={getBadgeColor(achievement.badge)}>{achievement.badge}</Badge>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-800">{achievement.achievement}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{achievement.summary}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{achievement.date}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className={cardShell}>
                <CardHeader>
                  <CardTitle>Achievement Pulse</CardTitle>
                  <CardDescription>What members are unlocking most often this week.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Medal className="h-4 w-4 text-red-500" />
                      Strength milestones
                    </div>
                    <p className="mt-2 text-2xl font-bold">14</p>
                    <p className="text-xs text-muted-foreground">Most common member achievement category right now.</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Flame className="h-4 w-4 text-orange-500" />
                      Streaks completed
                    </div>
                    <p className="mt-2 text-2xl font-bold">9</p>
                    <p className="text-xs text-muted-foreground">Members hitting consistency goals across the last seven days.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={cardShell}>
                <CardHeader>
                  <CardTitle>Recognition Themes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {["Personal records", "Consistency streaks", "Cardio milestones", "Nutrition habits"].map((theme) => (
                    <div key={theme} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-sm font-medium">{theme}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {leaderboardCards.map((board, index) => (
              <Card key={board.title} className={cardShell}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {index === 0 ? <Flame className="h-5 w-5 text-orange-500" /> : index === 1 ? <TrendingUp className="h-5 w-5 text-blue-600" /> : <Star className="h-5 w-5 text-purple-600" />}
                    <span>{board.title}</span>
                  </CardTitle>
                  <CardDescription>{board.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {board.rows.map((row) => (
                    <div key={`${board.title}-${row.rank}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${row.rank === "1" ? "bg-amber-100 text-amber-800" : row.rank === "2" ? "bg-slate-200 text-slate-700" : "bg-orange-100 text-orange-800"}`}>
                          {row.rank}
                        </div>
                        <span className="font-medium">{row.name}</span>
                      </div>
                      <Badge variant="outline">{row.value}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreatePostOpen} onOpenChange={handleCreatePostOpenChange}>
        <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-[480px]">
          <div className="flex max-h-[90vh] flex-col bg-white">
            <DialogHeader className="flex-shrink-0 border-b border-slate-200 px-5 py-3">
              <DialogTitle className="text-base">Create Community Post</DialogTitle>
              <DialogDescription className="text-xs">
                Share an update and optionally add a workout photo (1:1, 4:5, or 9:16).
              </DialogDescription>
            </DialogHeader>

            <div className="mx-auto grid w-full max-w-[440px] gap-3 overflow-y-auto px-5 py-3">
              <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
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
                  <Label>Post Type</Label>
                  <Select
                    value={postDraft.type}
                    onValueChange={(value) =>
                      setPostDraft((currentDraft) => ({
                        ...currentDraft,
                        type: value as CommunityPost["type"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select post type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="achievement">Achievement</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="tip">Tip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="community-post-content">Post Content</Label>
                <Textarea
                  id="community-post-content"
                  rows={2}
                  value={postDraft.content}
                  onChange={(event) => setPostDraft((currentDraft) => ({ ...currentDraft, content: event.target.value }))}
                  placeholder="Share your workout progress, ask a question, or post a quick coaching takeaway..."
                />
              </div>

              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Label>Workout Photo</Label>
                  </div>
                  <Badge variant="outline" className={postDraft.uploadedPhoto ? "border-red-200 bg-red-50 text-red-600" : "bg-slate-50"}>
                    {postDraft.uploadedPhoto ? "1 photo ready" : "Optional"}
                  </Badge>
                </div>

                {!postDraft.uploadedPhoto ? (
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex min-h-[56px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center transition-all hover:border-red-200 hover:bg-red-50/40"
                  >
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-white p-2 shadow-sm">
                        <ImageIcon className="h-4 w-4 text-red-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900">Upload One Workout Photo</p>
                        <p className="text-xs text-muted-foreground">Choose from your computer or phone</p>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
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
                          <p className="text-sm font-medium text-slate-900">{createUploadedPhotoLabel(postDraft.uploadedPhoto.fileName)}</p>
                          <p className="text-xs text-muted-foreground">Ready for crop adjustment.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" className={softButton} onClick={() => uploadInputRef.current?.click()}>
                            Change
                          </Button>
                          <Button variant="outline" size="sm" className={softButton} onClick={handleRemoveUploadedPhoto}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label>Crop Ratio</Label>
                        <Badge variant="outline" className="bg-white">
                          {postDraft.aspectRatio}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {cropRatioOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setPostDraft((currentDraft) => ({ ...currentDraft, aspectRatio: option.value }))}
                            className={`rounded-2xl border px-3 py-3 text-center shadow-sm transition-all ${postDraft.aspectRatio === option.value ? "border-red-300 bg-red-50 text-red-600 ring-2 ring-red-100" : "border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50/40"}`}
                          >
                            <p className="text-sm font-semibold">{option.label}</p>
                            <p className="text-[11px] text-muted-foreground">{option.helper}</p>
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

            <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" className={softButton} onClick={() => handleCreatePostOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePost}>
                  <Plus className="mr-2 h-4 w-4" />
                  Post to Feed
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
            <DialogDescription>
              {activePost ? `Reply to ${activePost.authorUsername}'s post.` : "View community replies."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="max-h-[320px] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
              {isLoadingComments ? (
                <p className="text-sm text-muted-foreground">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet. Be the first to reply.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-xl bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{comment.authorUsername}</span>
                        <span className="text-xs text-muted-foreground">{safeFormatTime(comment.createdAt)}</span>
                      </div>
                      {canDeleteComment(comment) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => deleteComment(comment)}
                          disabled={isDeletingCommentId === comment.id}
                          title="Delete comment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{comment.content}</p>
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
              <Button variant="outline" className={softButton} onClick={() => setIsCommentsOpen(false)}>
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
