import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Users, MessageSquare, Calendar, Trophy, Plus, Heart, MessageCircle, Share2, Filter } from 'lucide-react';

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
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Community Post</DialogTitle>
              <DialogDescription>
                Share your thoughts, achievements, or questions with the community.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="postContent">What's on your mind?</Label>
                <Textarea 
                  id="postContent" 
                  placeholder="Share your fitness journey, ask questions, or celebrate achievements..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline">Cancel</Button>
              <Button>Post</Button>
            </div>
          </DialogContent>
        </Dialog>
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

