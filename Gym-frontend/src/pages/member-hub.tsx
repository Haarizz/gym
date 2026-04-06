import React, { useState, useEffect, useCallback, useRef } from "react";
import { CreatePostModal } from "./community";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  Dumbbell,
  Users,
  Trophy,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Camera,
  Search,
  MapPin,
  Star,
  Zap,
  Target,
  Activity,
  CreditCard,
  BookOpen,
  Video,
  UserPlus,
  Award,
  TrendingUp,
  Clock3,
  Users2,
  ChevronRight,
  Flame,
  CheckCircle,
  Timer,
  BarChart3,
  Settings,
  User,
  LogOut,
  Bell,
  ChevronDown,
  Play,
  ShoppingBag,
  Bookmark,
  Download,
  Calendar as CalendarIcon,
  PlayCircle,
  PlusCircle
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface MemberHubProps {
  onNavigate?: (section: string) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

interface CommunityPost {
  id: number;
  topic: string;
  content: string;
  type: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  authorUsername: string;
  authorUserId: number;
  createdAt: string;
  image?: { dataUrl: string; aspectRatio?: string | null } | null;
}

const normalizePost = (raw: any): CommunityPost => ({
  id: Number(raw.id),
  topic: raw.topic ?? "",
  content: raw.content ?? "",
  type: raw.type ?? "update",
  likeCount: raw.like_count ?? raw.likeCount ?? 0,
  commentCount: raw.comment_count ?? raw.commentCount ?? 0,
  likedByMe: raw.liked_by_me ?? raw.likedByMe ?? false,
  authorUsername: raw.author_username ?? raw.authorUsername ?? "Unknown",
  authorUserId: Number(raw.author_user_id ?? raw.authorUserId ?? 0),
  createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
  image: raw.image
    ? { dataUrl: raw.image.data_url ?? raw.image.dataUrl ?? "", aspectRatio: raw.image.aspect_ratio ?? raw.image.aspectRatio ?? null }
    : null,
});

const formatRelativeTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Just now";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

/** Converts stored aspectRatio ("9:16", "4:5", "0.5625" …) to a CSS aspect-ratio string. */
const toCssAspectRatio = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (value.includes(":")) {
    const [w, h] = value.split(":").map(Number);
    if (w > 0 && h > 0) return `${w}/${h}`;
  }
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) return String(num);
  return undefined;
};

const getTypeStyle = (type: string) => {
  switch (type) {
    case "achievement": return "bg-emerald-100 text-emerald-700";
    case "question": return "bg-blue-100 text-blue-700";
    case "tip": return "bg-purple-100 text-purple-700";
    default: return "bg-gray-100 text-gray-600";
  }
};

export function MemberHub({ onNavigate }: MemberHubProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFABOpen, setIsFABOpen] = useState(false);

  // Community feed state
  const [feedPosts, setFeedPosts] = useState<CommunityPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<number | null>(null);
  const feedLoadedRef = useRef(false);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const token = sessionStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/community/posts?page=1&limit=10`, { headers });
      if (!res.ok) throw new Error(`Failed to load feed (${res.status})`);
      const data = await res.json();
      const posts: CommunityPost[] = (data?.posts ?? []).map(normalizePost);
      setFeedPosts(posts);
    } catch (e: any) {
      setFeedError(e?.message || "Could not load community feed.");
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!feedLoadedRef.current) {
      feedLoadedRef.current = true;
      loadFeed();
    }
  }, [loadFeed]);

  const handleLike = async (post: CommunityPost) => {
    const token = sessionStorage.getItem("token");
    if (!token || likingId != null) return;
    setLikingId(post.id);
    // Optimistic update
    setFeedPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likedByMe ? p.likeCount - 1 : p.likeCount + 1 }
          : p
      )
    );
    try {
      const res = await fetch(`${API_BASE}/community/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const raw = await res.json();
        setFeedPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, likedByMe: raw.liked ?? raw.like ?? !post.likedByMe, likeCount: raw.like_count ?? raw.likeCount ?? p.likeCount }
              : p
          )
        );
      }
    } catch {
      // revert on failure
      setFeedPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likedByMe: post.likedByMe, likeCount: post.likeCount }
            : p
        )
      );
    } finally {
      setLikingId(null);
    }
  };

  // Mock data
  const memberData = {
    name: "Sarah Johnson",
    membershipType: "Premium",
    joinDate: "Jan 2024",
    nextBilling: "Dec 15, 2024",
    credits: 8,
    status: "Active",
    streak: 12,
    profileImage: null,
    nextClass: "Yoga – Today 5PM",
    activeChallenges: 2,
    validUntil: "Nov 30"
  };

  const quickActionCards = [
    { id: "book-session", icon: Calendar, label: "Book a Session / Training Stream", color: "bg-blue-500" },
    { id: "join-class", icon: Users2, label: "Join Scheduled Class", color: "bg-green-500" },
    { id: "add-challenge", icon: Trophy, label: "Add a Challenge", color: "bg-orange-500" },
    { id: "create-post", icon: Plus, label: "Create a Post", color: "bg-purple-500" },
    { id: "my-stats", icon: BarChart3, label: "My Stats", color: "bg-indigo-500" },
    { id: "membership", icon: CreditCard, label: "Membership & Renewal", color: "bg-teal-500" }
  ];

  const upcomingBookings = [
    {
      id: 1,
      type: "class",
      title: "HIIT Training",
      date: "Today",
      time: "6:00 PM",
      instructor: "Mike Chen"
    },
    {
      id: 2,
      type: "training",
      title: "Personal Training",
      date: "Tomorrow",
      time: "10:00 AM",
      instructor: "Lisa Park"
    },
    {
      id: 3,
      type: "slot",
      title: "Gym Floor Access",
      date: "Dec 20",
      time: "7:00 AM - 9:00 AM",
      instructor: null
    }
  ];

  const activeChallenges = [
    {
      id: 1,
      title: "30-Day Push-up Challenge",
      progress: 75,
      daysLeft: 8,
      participants: 234,
      type: "strength"
    },
    {
      id: 2,
      title: "5K Running Goal",
      progress: 60,
      daysLeft: 15,
      participants: 89,
      type: "cardio"
    }
  ];

  const trendingChallenges = [
    {
      id: 1,
      title: "December Fitness Sprint",
      participants: 156,
      isNew: true
    },
    {
      id: 2,
      title: "Plank Master Challenge",
      participants: 89,
      isNew: false
    },
    {
      id: 3,
      title: "Mindful Movement",
      participants: 67,
      isNew: false
    }
  ];

  const attendanceData = [
    { name: 'Mon', attended: 1, missed: 0 },
    { name: 'Tue', attended: 0, missed: 1 },
    { name: 'Wed', attended: 1, missed: 0 },
    { name: 'Thu', attended: 1, missed: 0 },
    { name: 'Fri', attended: 0, missed: 1 },
    { name: 'Sat', attended: 1, missed: 0 },
    { name: 'Sun', attended: 1, missed: 0 }
  ];

  const recentNotifications = [
    {
      id: 1,
      type: "reminder",
      title: "Class starts in 30 minutes",
      message: "HIIT Training with Mike Chen",
      time: "30m ago"
    },
    {
      id: 2,
      type: "trainer",
      title: "New message from trainer",
      message: "Great progress on your form!",
      time: "2h ago"
    },
    {
      id: 3,
      type: "achievement",
      title: "Streak milestone reached!",
      message: "You've maintained a 12-day streak",
      time: "1d ago"
    }
  ];

  const badges = [
    { name: "Early Bird", icon: "🌅", earned: true },
    { name: "Streak Master", icon: "🔥", earned: true },
    { name: "Class Regular", icon: "🏆", earned: false },
    { name: "Challenge Winner", icon: "⭐", earned: true }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground rounded-lg p-2">
                <Dumbbell className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-medium text-base">GymBios</h2>
              </div>
            </div>

            {/* Global Search */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search classes, trainers, challenges…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 bg-[#F5F5F5] border-0 rounded-full h-10"
                />
              </div>
            </div>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={memberData.profileImage} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {memberData.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="font-medium leading-none">{memberData.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {memberData.membershipType} Member
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Membership</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero / Welcome Section */}
        <div className="bg-gradient-to-r from-[#4CAF50] to-[#81C784] text-white rounded-xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-4">
                Welcome back to the future of wellness service industry, {memberData.name} 👋
              </h1>
              
              {/* Sub-stat Chips */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">{memberData.nextClass}</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center space-x-2">
                  <Trophy className="h-5 w-5" />
                  <span className="font-medium">{memberData.activeChallenges} Ongoing</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">Valid until {memberData.validUntil}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-6xl font-bold opacity-20">
                {memberData.streak}
              </div>
              <p className="text-sm opacity-80">Day Streak</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActionCards.map((action) => {
            // Book a Session should navigate directly instead of opening a dialog
            if (action.id === 'book-session') {
              return (
                <div 
                  key={action.id}
                  className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200"
                  onClick={() => onNavigate?.('book-session')}
                >
                  <Card className="bg-white border-0 shadow-sm h-full">
                    <CardContent className="flex flex-col items-center justify-center p-6 h-40">
                      <div className={`p-4 rounded-xl ${action.color} mb-4`}>
                        <action.icon className="h-12 w-12 text-white" />
                      </div>
                      <p className="text-center font-medium text-sm leading-tight">{action.label}</p>
                    </CardContent>
                  </Card>
                </div>
              );
            }

            // Join Class should also navigate directly
            if (action.id === 'join-class') {
              return (
                <div 
                  key={action.id}
                  className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200"
                  onClick={() => onNavigate?.('join-class')}
                >
                  <Card className="bg-white border-0 shadow-sm h-full">
                    <CardContent className="flex flex-col items-center justify-center p-6 h-40">
                      <div className={`p-4 rounded-xl ${action.color} mb-4`}>
                        <action.icon className="h-12 w-12 text-white" />
                      </div>
                      <p className="text-center font-medium text-sm leading-tight">{action.label}</p>
                    </CardContent>
                  </Card>
                </div>
              );
            }

            // Add Challenge should also navigate directly
            if (action.id === 'add-challenge') {
              return (
                <div 
                  key={action.id}
                  className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200"
                  onClick={() => onNavigate?.('add-challenge')}
                >
                  <Card className="bg-white border-0 shadow-sm h-full">
                    <CardContent className="flex flex-col items-center justify-center p-6 h-40">
                      <div className={`p-4 rounded-xl ${action.color} mb-4`}>
                        <action.icon className="h-12 w-12 text-white" />
                      </div>
                      <p className="text-center font-medium text-sm leading-tight">{action.label}</p>
                    </CardContent>
                  </Card>
                </div>
              );
            }

            // Membership should also navigate directly
            if (action.id === 'membership') {
              return (
                <div 
                  key={action.id}
                  className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200"
                  onClick={() => onNavigate?.('membership-renewal')}
                >
                  <Card className="bg-white border-0 shadow-sm h-full">
                    <CardContent className="flex flex-col items-center justify-center p-6 h-40">
                      <div className={`p-4 rounded-xl ${action.color} mb-4`}>
                        <action.icon className="h-12 w-12 text-white" />
                      </div>
                      <p className="text-center font-medium text-sm leading-tight">{action.label}</p>
                    </CardContent>
                  </Card>
                </div>
              );
            }

            // My Stats should also navigate directly
            if (action.id === 'my-stats') {
              return (
                <div 
                  key={action.id}
                  className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200"
                  onClick={() => onNavigate?.('my-stats')}
                >
                  <Card className="bg-white border-0 shadow-sm h-full">
                    <CardContent className="flex flex-col items-center justify-center p-6 h-40">
                      <div className={`p-4 rounded-xl ${action.color} mb-4`}>
                        <action.icon className="h-12 w-12 text-white" />
                      </div>
                      <p className="text-center font-medium text-sm leading-tight">{action.label}</p>
                    </CardContent>
                  </Card>
                </div>
              );
            }

            // create-post uses the real CreatePostModal
            if (action.id === "create-post") {
              return (
                <CreatePostModal
                  key={action.id}
                  onPostCreated={loadFeed}
                  trigger={
                    <div className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200">
                      <Card className="bg-white border-0 shadow-sm h-full">
                        <CardContent className="flex flex-col items-center justify-center p-6 h-40">
                          <div className={`p-4 rounded-xl ${action.color} mb-4`}>
                            <action.icon className="h-12 w-12 text-white" />
                          </div>
                          <p className="text-center font-medium text-sm leading-tight">{action.label}</p>
                        </CardContent>
                      </Card>
                    </div>
                  }
                />
              );
            }

            // Other unimplemented actions — placeholder dialog
            return (
              <Dialog key={action.id}>
                <DialogTrigger asChild>
                  <div className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200">
                    <Card className="bg-white border-0 shadow-sm h-full">
                      <CardContent className="flex flex-col items-center justify-center p-6 h-40">
                        <div className={`p-4 rounded-xl ${action.color} mb-4`}>
                          <action.icon className="h-12 w-12 text-white" />
                        </div>
                        <p className="text-center font-medium text-sm leading-tight">{action.label}</p>
                      </CardContent>
                    </Card>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{action.label}</DialogTitle>
                    <DialogDescription>
                      {action.id === "add-challenge" && "Create or join fitness challenges"}
                      {action.id === "my-stats" && "View your fitness analytics"}
                      {action.id === "membership" && "Manage your membership details"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-muted-foreground">Feature coming soon...</p>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>

        {/* Community Feed Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Community Feed (Left Column - 2/3 width) */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-0 shadow-sm flex flex-col" style={{ height: 700 }}>
              <CardHeader className="flex flex-row items-center justify-between flex-shrink-0 border-b pb-3">
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Community Feed
                </CardTitle>
                <CreatePostModal
                  onPostCreated={loadFeed}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Post
                    </Button>
                  }
                />
              </CardHeader>
              <CardContent className="flex-1 min-h-0 p-0">
                <ScrollArea className="h-full px-6 py-2">
                  {feedLoading ? (
                    <div className="flex flex-col gap-4 py-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-3 animate-pulse">
                          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-1/3" />
                            <div className="h-3 bg-gray-200 rounded w-full" />
                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : feedError ? (
                    <div className="py-8 text-center space-y-3">
                      <p className="text-sm text-red-500">{feedError}</p>
                      <Button variant="outline" size="sm" onClick={loadFeed}>Retry</Button>
                    </div>
                  ) : feedPosts.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <Users className="h-10 w-10 mx-auto text-gray-300" />
                      <p className="text-sm text-muted-foreground">No posts yet. Be the first to share!</p>
                      <CreatePostModal
                        onPostCreated={loadFeed}
                        trigger={
                          <Button size="sm" variant="outline">Create the first post</Button>
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {feedPosts.map((post, idx) => (
                        <div key={post.id}>
                          <div className="py-4 space-y-3">
                            {/* Author row */}
                            <div className="flex items-start gap-3">
                              <Avatar className="h-9 w-9 shrink-0">
                                <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700">
                                  {post.authorUsername.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-2">
                                  <span className="font-semibold text-sm">{post.authorUsername}</span>
                                  <span className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getTypeStyle(post.type)}`}>
                                    {post.type}
                                  </span>
                                </div>
                                {post.topic && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{post.topic}</p>
                                )}
                              </div>
                            </div>

                            {/* Content */}
                            <p className="text-sm leading-relaxed text-gray-800 pl-12">{post.content}</p>

                            {/* Image */}
                            {post.image?.dataUrl && (
                              <div className="pl-12">
                                <img
                                  src={post.image.dataUrl}
                                  alt="Post photo"
                                  style={{
                                    display: "block",
                                    aspectRatio: toCssAspectRatio(post.image.aspectRatio) ?? "auto",
                                    maxHeight: 380,
                                    maxWidth: "100%",
                                    width: toCssAspectRatio(post.image.aspectRatio) ? "auto" : "100%",
                                    objectFit: "cover",
                                    borderRadius: 12,
                                    border: "1px solid #e5e7eb",
                                  }}
                                />
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-1 pl-11">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 gap-1.5 text-xs font-medium rounded-lg ${post.likedByMe ? "text-red-500 hover:text-red-600" : "text-muted-foreground"}`}
                                onClick={() => handleLike(post)}
                                disabled={likingId === post.id}
                              >
                                <Heart className={`h-4 w-4 ${post.likedByMe ? "fill-red-500" : ""}`} />
                                {post.likeCount > 0 && post.likeCount}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-medium text-muted-foreground rounded-lg">
                                <MessageCircle className="h-4 w-4" />
                                {post.commentCount > 0 && post.commentCount}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-medium text-muted-foreground rounded-lg">
                                <Share2 className="h-4 w-4" />
                                Share
                              </Button>
                            </div>
                          </div>
                          {idx < feedPosts.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Trending Challenges (Right Column - 1/3 width) */}
          <div>
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Trending Challenges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingChallenges.map((challenge) => (
                  <div key={challenge.id} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{challenge.title}</h4>
                      {challenge.isNew && <Badge className="text-xs">New</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {challenge.participants} participants
                    </p>
                    <Button size="sm" className="w-full h-7">
                      Join
                    </Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full mt-4">
                  View All Challenges
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Middle Dashboard Section (2-column cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Bookings */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Upcoming Bookings
              </CardTitle>
              <Button variant="outline" size="sm">View All</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      booking.type === 'class' ? 'bg-blue-100 text-blue-600' :
                      booking.type === 'training' ? 'bg-purple-100 text-purple-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {booking.type === 'class' ? <Users className="h-4 w-4" /> :
                       booking.type === 'training' ? <Target className="h-4 w-4" /> :
                       <Dumbbell className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{booking.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.date} at {booking.time}
                      </p>
                      {booking.instructor && (
                        <p className="text-xs text-muted-foreground">with {booking.instructor}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      Cancel
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      Reschedule
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* My Challenges */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                My Challenges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeChallenges.map((challenge) => (
                <div key={challenge.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{challenge.title}</p>
                    <Badge variant="secondary" className="text-xs">{challenge.daysLeft} days left</Badge>
                  </div>
                  <Progress value={challenge.progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{challenge.progress}% complete</span>
                    <span>{challenge.participants} participants</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentNotifications.map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                    <div className={`p-2 rounded-lg ${
                      notification.type === 'reminder' ? 'bg-blue-100 text-blue-600' :
                      notification.type === 'trainer' ? 'bg-green-100 text-green-600' :
                      'bg-yellow-100 text-yellow-600'
                    }`}>
                      {notification.type === 'reminder' ? <Clock className="h-4 w-4" /> :
                       notification.type === 'trainer' ? <MessageCircle className="h-4 w-4" /> :
                       <Award className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Class Attendance Overview */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Class Attendance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Bar dataKey="attended" fill="#4CAF50" name="Attended" />
                    <Bar dataKey="missed" fill="#E0E0E0" name="Missed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Analytics & Engagement */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Badges / Reward Points */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Badges & Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {badges.map((badge, index) => (
                  <div key={index} className={`p-3 rounded-lg border text-center ${
                    badge.earned 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}>
                    <div className="text-2xl mb-1">{badge.icon}</div>
                    <p className="text-xs font-medium">{badge.name}</p>
                    {badge.earned && (
                      <CheckCircle className="h-3 w-3 text-green-600 mx-auto mt-1" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shop/Add-ons (Optional) */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Shop & Add-ons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <Play className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Protein Shake</p>
                      <p className="text-xs text-muted-foreground">AED 25</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7">
                    Add
                  </Button>
                </div>
                <div className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                      <Bookmark className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Gym Towel</p>
                      <p className="text-xs text-muted-foreground">AED 15</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7">
                    Add
                  </Button>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4" size="sm">
                View All Products
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats Summary */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Workouts</span>
                  <span className="font-bold">18</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hours Trained</span>
                  <span className="font-bold">24h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Calories Burned</span>
                  <span className="font-bold">3,240</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Streak</span>
                  <span className="font-bold flex items-center">
                    {memberData.streak} <Flame className="h-4 w-4 text-orange-500 ml-1" />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className={`transition-all duration-200 ${isFABOpen ? 'mb-4 space-y-2' : ''}`}>
          {isFABOpen && (
            <div className="flex flex-col space-y-2">
              <Button
                size="sm"
                className="bg-white text-gray-700 shadow-lg hover:bg-gray-50 rounded-full h-12 px-4"
                onClick={() => setIsFABOpen(false)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Book Session
              </Button>
              <Button
                size="sm"
                className="bg-white text-gray-700 shadow-lg hover:bg-gray-50 rounded-full h-12 px-4"
                onClick={() => setIsFABOpen(false)}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Add Challenge
              </Button>
              <CreatePostModal
                onPostCreated={() => { setIsFABOpen(false); loadFeed(); }}
                trigger={
                  <Button
                    size="sm"
                    className="bg-white text-gray-700 shadow-lg hover:bg-gray-50 rounded-full h-12 px-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                }
              />
            </div>
          )}
        </div>
        <Button
          size="lg"
          className="bg-[#4CAF50] hover:bg-[#45a049] text-white rounded-full h-16 w-16 shadow-lg"
          onClick={() => setIsFABOpen(!isFABOpen)}
        >
          <Plus className={`h-6 w-6 transition-transform ${isFABOpen ? 'rotate-45' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
