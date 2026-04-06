import React, { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { Users, MessageSquare, Calendar, Trophy, Plus, Heart, MessageCircle, Share2, Filter, Image as ImageIcon, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const communityPosts = [
  {
    id: 1,
    author: "Sarah Johnson",
    avatar: "/avatars/sarah.jpg",
    timestamp: "2 hours ago",
    content: "Just hit a new PR on deadlifts! 185lbs 💪 Thanks to everyone for the motivation and support!",
    likes: 24,
    comments: 8,
    type: "achievement"
  },
  {
    id: 2,
    author: "Mike Chen",
    avatar: "/avatars/mike.jpg",
    timestamp: "4 hours ago",
    content: "Looking for a workout buddy for early morning sessions (6 AM). Anyone interested in joining me for strength training?",
    likes: 12,
    comments: 15,
    type: "question"
  },
  {
    id: 3,
    author: "Emily Rodriguez",
    avatar: "/avatars/emily.jpg",
    timestamp: "1 day ago",
    content: "Nutrition tip: Try adding Greek yogurt with berries for a post-workout snack. High protein and delicious! 🥣",
    likes: 31,
    comments: 6,
    type: "tip"
  }
];

const upcomingEvents = [
  {
    id: 1,
    title: "HIIT Challenge Week",
    date: "Oct 1-7, 2024",
    participants: 45,
    description: "7-day high-intensity interval training challenge"
  },
  {
    id: 2,
    title: "Nutrition Workshop",
    date: "Oct 12, 2024",
    participants: 23,
    description: "Learn about meal prep and healthy eating habits"
  },
  {
    id: 3,
    title: "Yoga Retreat Weekend",
    date: "Oct 19-20, 2024",
    participants: 18,
    description: "Relaxing weekend yoga retreat at the local park"
  }
];

const achievements = [
  {
    id: 1,
    member: "Sarah Johnson",
    achievement: "Deadlift PR - 185lbs",
    date: "Today",
    badge: "strength"
  },
  {
    id: 2,
    member: "David Thompson",
    achievement: "30-Day Streak",
    date: "Yesterday",
    badge: "consistency"
  },
  {
    id: 3,
    member: "Lisa Wong",
    achievement: "First 5K Run",
    date: "2 days ago",
    badge: "cardio"
  }
];

type CropRatio = "1:1" | "4:5" | "9:16";

const CROP_RATIOS: Array<{ value: CropRatio; label: string; sub: string }> = [
  { value: "1:1", label: "1:1", sub: "Square" },
  { value: "4:5", label: "4:5", sub: "Portrait" },
  { value: "9:16", label: "9:16", sub: "Story" },
];

const POST_TYPES = [
  { value: "achievement", label: "Achievement" },
  { value: "question", label: "Question" },
  { value: "tip", label: "Tip" },
  { value: "update", label: "Update" },
];

const THUMB_W = 90; // px

const getThumbHeight = (r: CropRatio) =>
  r === "1:1" ? THUMB_W : r === "4:5" ? Math.round(THUMB_W * (5 / 4)) : Math.round(THUMB_W * (16 / 9));

const thumbImgStyle = (pos: number, zoom: number): React.CSSProperties => ({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: `50% ${pos}%`,
  transform: `scale(${zoom / 100})`,
  transformOrigin: "center center",
});

const trimFileName = (name: string) =>
  name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim() || "Workout Upload";

export function CreatePostModal({ onPostCreated, trigger }: { onPostCreated?: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [postType, setPostType] = useState("achievement");
  const [content, setContent] = useState("");
  const [photo, setPhoto] = useState<{ src: string; fileName: string } | null>(null);
  const [cropRatio, setCropRatio] = useState<CropRatio>("4:5");
  const [cropPosition, setCropPosition] = useState(50);
  const [cropZoom, setCropZoom] = useState(100);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setPhoto({ src: reader.result, fileName: file.name });
      setCropPosition(50);
      setCropZoom(100);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setTopic("");
    setPostType("achievement");
    setContent("");
    setPhoto(null);
    setCropRatio("4:5");
    setCropPosition(50);
    setCropZoom(100);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    setError(null);
    if (!topic.trim()) { setError("Topic is required."); return; }
    if (!content.trim()) { setError("Post content is required."); return; }

    const token = sessionStorage.getItem("token");
    if (!token) { setError("You must be logged in to post."); return; }

    setIsPosting(true);
    try {
      const body: Record<string, unknown> = {
        topic: topic.trim(),
        content: content.trim(),
        type: postType,
      };
      if (photo) {
        body.image_data_url = photo.src;
        body.image_aspect_ratio = cropRatio;
        body.image_crop_position = cropPosition;
        body.image_crop_zoom = cropZoom;
      }

      const res = await fetch(`${API_BASE}/community/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message || `Failed to post (${res.status})`);
      }

      resetForm();
      setOpen(false);
      onPostCreated?.();
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) resetForm();
    setOpen(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-[480px]">
        <div className="flex max-h-[90vh] flex-col bg-white">
          {/* Header */}
          <DialogHeader className="flex-shrink-0 border-b border-slate-200 px-5 py-3">
            <DialogTitle className="text-base">Create Community Post</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Share an update and optionally add a workout photo (1:1, 4:5, or 9:16).
            </p>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="mx-auto grid w-full max-w-[440px] gap-3 overflow-y-auto px-5 py-4">
            {/* Topic + Type row */}
            <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
              <div className="space-y-1.5">
                <Label htmlFor="cp-topic" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Topic *</Label>
                <Input
                  id="cp-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Workout recap, sprint finisher, recovery win..."
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Post Type</Label>
                <Select value={postType} onValueChange={setPostType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-content" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Post Content *</Label>
              <Textarea
                id="cp-content"
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your workout progress, ask a question, or post a quick coaching takeaway..."
                className="resize-none"
                maxLength={1000}
              />
              <p className="text-right text-xs text-muted-foreground">{content.length}/1000</p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Photo section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workout Photo</Label>
                <Badge
                  variant="outline"
                  className={photo ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "bg-slate-50"}
                >
                  {photo ? "1 photo ready" : "Optional"}
                </Badge>
              </div>

              {!photo ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[56px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center transition-all hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-white p-2 shadow-sm">
                      <ImageIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-900">Upload One Workout Photo</p>
                      <p className="text-xs text-muted-foreground">Choose from your computer or phone</p>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
                  {/* Thumbnail row */}
                  <div className="flex items-start gap-3">
                    <div style={{ flexShrink: 0 }}>
                      <div
                        style={{
                          position: "relative",
                          width: THUMB_W,
                          height: getThumbHeight(cropRatio),
                          overflow: "hidden",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                          backgroundColor: "#f1f5f9",
                        }}
                      >
                        <img
                          src={photo.src}
                          alt="Uploaded workout preview"
                          style={thumbImgStyle(cropPosition, cropZoom)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{trimFileName(photo.fileName)}</p>
                        <p className="text-xs text-muted-foreground">Ready for crop adjustment.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-0 bg-white text-slate-700 shadow-sm hover:bg-primary/5 hover:text-primary"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-0 bg-white text-slate-700 shadow-sm hover:bg-red-50 hover:text-red-600"
                          onClick={removePhoto}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Crop ratio */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Crop Ratio</Label>
                      <Badge variant="outline" className="bg-white text-xs">{cropRatio}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {CROP_RATIOS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCropRatio(opt.value)}
                          className={`rounded-2xl border px-3 py-2.5 text-center shadow-sm transition-all ${
                            cropRatio === opt.value
                              ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20"
                              : "border-slate-200 bg-white text-slate-700 hover:border-primary/50 hover:bg-primary/5"
                          }`}
                        >
                          <p className="text-sm font-semibold">{opt.label}</p>
                          <p className="text-[11px] text-muted-foreground">{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Crop position */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Crop Position</span>
                      <span>{cropPosition}%</span>
                    </div>
                    <Slider
                      value={[cropPosition]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => setCropPosition(v)}
                    />
                  </div>

                  {/* Zoom */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Zoom</span>
                      <span>{cropZoom}%</span>
                    </div>
                    <Slider
                      value={[cropZoom]}
                      min={100}
                      max={140}
                      step={1}
                      onValueChange={([v]) => setCropZoom(v)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                className="border-0 bg-white shadow-sm"
                onClick={() => handleOpenChange(false)}
                disabled={isPosting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPosting || !topic.trim() || !content.trim()}
                className="gap-2"
              >
                {isPosting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Posting...</>
                ) : (
                  <><Plus className="h-4 w-4" /> Post to Feed</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Community() {
  const getPostTypeColor = (type: string) => {
    switch (type) {
      case "achievement": return "bg-green-100 text-green-800";
      case "question": return "bg-blue-100 text-blue-800";
      case "tip": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "strength": return "bg-red-100 text-red-800";
      case "consistency": return "bg-blue-100 text-blue-800";
      case "cardio": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground">Connect with fellow gym members and share your fitness journey.</p>
        </div>
        <CreatePostModal />
      </div>

      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList>
          <TabsTrigger value="feed">Community Feed</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Community Feed</CardTitle>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {communityPosts.map((post) => (
                    <div key={post.id} className="border-b pb-6 last:border-b-0">
                      <div className="flex items-start space-x-3">
                        <Avatar>
                          <AvatarImage src={post.avatar} />
                          <AvatarFallback>{post.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{post.author}</span>
                            <span className="text-sm text-muted-foreground">{post.timestamp}</span>
                            <Badge className={getPostTypeColor(post.type)}>
                              {post.type}
                            </Badge>
                          </div>
                          <p className="text-sm">{post.content}</p>
                          <div className="flex items-center space-x-4">
                            <Button variant="ghost" size="sm" className="text-muted-foreground">
                              <Heart className="mr-1 h-4 w-4" />
                              {post.likes}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-muted-foreground">
                              <MessageCircle className="mr-1 h-4 w-4" />
                              {post.comments}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-muted-foreground">
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
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Members</span>
                    <span className="font-medium">410</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Posts Today</span>
                    <span className="font-medium">23</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Challenges Active</span>
                    <span className="font-medium">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Upcoming Events</span>
                    <span className="font-medium">5</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trending Topics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">#MondayMotivation</span>
                    <Badge variant="secondary">12 posts</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">#DeadliftPR</span>
                    <Badge variant="secondary">8 posts</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">#NutritionTips</span>
                    <Badge variant="secondary">6 posts</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Join community events and challenges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      <Badge variant="outline">{event.participants} joined</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{event.date}</span>
                      <Button size="sm">Join Event</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
              <CardDescription>Celebrate member accomplishments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Trophy className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{achievement.member}</span>
                        <Badge className={getBadgeColor(achievement.badge)}>
                          {achievement.badge}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{achievement.achievement}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{achievement.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Workout Streak</CardTitle>
                <CardDescription>Consecutive days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">1.</span>
                    <span>David Thompson</span>
                  </div>
                  <Badge>30 days</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">2.</span>
                    <span>Sarah Johnson</span>
                  </div>
                  <Badge>28 days</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">3.</span>
                    <span>Mike Chen</span>
                  </div>
                  <Badge>25 days</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Visits</CardTitle>
                <CardDescription>This month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">1.</span>
                    <span>Lisa Wong</span>
                  </div>
                  <Badge>22 visits</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">2.</span>
                    <span>Emily Rodriguez</span>
                  </div>
                  <Badge>20 visits</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">3.</span>
                    <span>Sarah Johnson</span>
                  </div>
                  <Badge>19 visits</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Community Points</CardTitle>
                <CardDescription>Engagement score</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">1.</span>
                    <span>Mike Chen</span>
                  </div>
                  <Badge>1,250 pts</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">2.</span>
                    <span>Sarah Johnson</span>
                  </div>
                  <Badge>1,180 pts</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">3.</span>
                    <span>David Thompson</span>
                  </div>
                  <Badge>1,095 pts</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
