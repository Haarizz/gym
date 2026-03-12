import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { 
  Play, 
  Pause, 
  Users, 
  Clock, 
  Calendar, 
  Video,
  Plus,
  Edit,
  Trash2,
  Settings,
  Monitor,
  Smartphone,
  Tv,
  Upload,
  Download,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  BarChart3,
  Building2
} from 'lucide-react';

const trainingStreams = [
  {
    id: 1,
    title: "Morning HIIT Blast",
    instructor: "Sarah Johnson",
    instructorAvatar: "/avatars/sarah.jpg",
    category: "HIIT",
    duration: 45,
    difficulty: "Intermediate",
    participants: 23,
    maxParticipants: 30,
    status: "Live",
    streamUrl: "https://stream.gym.com/hiit-blast",
    scheduledTime: "2024-09-25T07:00:00",
    views: 156,
    likes: 45,
    description: "High-intensity interval training to kickstart your day"
  },
  {
    id: 2,
    title: "Yoga Flow & Flexibility",
    instructor: "Emily Rodriguez",
    instructorAvatar: "/avatars/emily.jpg",
    category: "Yoga",
    duration: 60,
    difficulty: "Beginner",
    participants: 18,
    maxParticipants: 25,
    status: "Scheduled",
    streamUrl: "https://stream.gym.com/yoga-flow",
    scheduledTime: "2024-09-25T09:00:00",
    views: 89,
    likes: 32,
    description: "Gentle yoga flow focusing on flexibility and mindfulness"
  },
  {
    id: 3,
    title: "Strength Training Fundamentals",
    instructor: "Mike Chen",
    instructorAvatar: "/avatars/mike.jpg",
    category: "Strength",
    duration: 50,
    difficulty: "Beginner",
    participants: 15,
    maxParticipants: 20,
    status: "Ended",
    streamUrl: "https://stream.gym.com/strength-basics",
    scheduledTime: "2024-09-24T18:00:00",
    views: 234,
    likes: 67,
    description: "Learn the basics of weight training and proper form"
  },
  {
    id: 4,
    title: "Advanced Cardio Challenge",
    instructor: "David Thompson",
    instructorAvatar: "/avatars/david.jpg",
    category: "Cardio",
    duration: 40,
    difficulty: "Advanced",
    participants: 0,
    maxParticipants: 15,
    status: "Scheduled",
    streamUrl: "https://stream.gym.com/cardio-challenge",
    scheduledTime: "2024-09-25T19:00:00",
    views: 12,
    likes: 3,
    description: "Intense cardio workout for experienced athletes"
  }
];

const streamCategories = [
  { name: "HIIT", count: 12, color: "bg-red-100 text-red-800" },
  { name: "Yoga", count: 8, color: "bg-purple-100 text-purple-800" },
  { name: "Strength", count: 15, color: "bg-blue-100 text-blue-800" },
  { name: "Cardio", count: 10, color: "bg-green-100 text-green-800" },
  { name: "Pilates", count: 6, color: "bg-pink-100 text-pink-800" },
  { name: "Dance", count: 4, color: "bg-yellow-100 text-yellow-800" }
];

const streamAnalytics = [
  { date: '2024-09-18', viewers: 45 },
  { date: '2024-09-19', viewers: 52 },
  { date: '2024-09-20', viewers: 38 },
  { date: '2024-09-21', viewers: 61 },
  { date: '2024-09-22', viewers: 44 },
  { date: '2024-09-23', viewers: 67 },
  { date: '2024-09-24', viewers: 54 }
];

interface TrainingStreamsProps {
  onNavigate?: (section: string) => void;
}

export function TrainingStreams({ onNavigate }: TrainingStreamsProps = {}) {
  const [selectedStream, setSelectedStream] = useState<any>(null);
  const [streamFilter, setStreamFilter] = useState("all");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Live": return "bg-red-100 text-red-800";
      case "Scheduled": return "bg-blue-100 text-blue-800";
      case "Ended": return "bg-gray-100 text-gray-800";
      case "Cancelled": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-green-100 text-green-800";
      case "Intermediate": return "bg-yellow-100 text-yellow-800";
      case "Advanced": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredStreams = streamFilter === "all" 
    ? trainingStreams 
    : trainingStreams.filter(stream => stream.status.toLowerCase() === streamFilter);

  const liveStreams = trainingStreams.filter(s => s.status === "Live").length;
  const scheduledStreams = trainingStreams.filter(s => s.status === "Scheduled").length;
  const totalViewers = trainingStreams.reduce((sum, s) => sum + s.participants, 0);
  const averageViews = Math.round(trainingStreams.reduce((sum, s) => sum + s.views, 0) / trainingStreams.length);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training Streams</h1>
          <p className="text-muted-foreground">Manage live and on-demand fitness streaming content.</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => onNavigate && onNavigate("facilities")}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Manage Facilities
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Upload Recording
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Stream
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Training Stream</DialogTitle>
                <DialogDescription>
                  Set up a new live stream or scheduled training session.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="streamTitle">Stream Title</Label>
                  <Input id="streamTitle" placeholder="Morning HIIT Blast" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instructor">Select Instructor</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sarah">Sarah Johnson</SelectItem>
                        <SelectItem value="emily">Emily Rodriguez</SelectItem>
                        <SelectItem value="mike">Mike Chen</SelectItem>
                        <SelectItem value="david">David Thompson</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hiit">HIIT</SelectItem>
                        <SelectItem value="yoga">Yoga</SelectItem>
                        <SelectItem value="strength">Strength</SelectItem>
                        <SelectItem value="cardio">Cardio</SelectItem>
                        <SelectItem value="pilates">Pilates</SelectItem>
                        <SelectItem value="dance">Dance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Input id="duration" placeholder="45" type="number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxParticipants">Max Participants</Label>
                    <Input id="maxParticipants" placeholder="30" type="number" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduleDate">Schedule Date</Label>
                    <Input id="scheduleDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduleTime">Schedule Time</Label>
                    <Input id="scheduleTime" type="time" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe the training session..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="streamType">Stream Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Live Stream</SelectItem>
                      <SelectItem value="recording">Pre-recorded</SelectItem>
                      <SelectItem value="hybrid">Hybrid (Live + Recording)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline">Cancel</Button>
                <Button>Create Stream</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Streams</CardTitle>
            <Video className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{liveStreams}</div>
            <p className="text-xs text-muted-foreground">
              Currently broadcasting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Streams</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{scheduledStreams}</div>
            <p className="text-xs text-muted-foreground">
              Upcoming sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Viewers</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalViewers}</div>
            <p className="text-xs text-muted-foreground">
              Currently watching
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageViews}</div>
            <p className="text-xs text-muted-foreground">
              Per stream
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="streams" className="space-y-6">
        <TabsList>
          <TabsTrigger value="streams">All Streams</TabsTrigger>
          <TabsTrigger value="live">Live Streams</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="library">Stream Library</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="streams" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Training Streams</CardTitle>
                  <CardDescription>Manage all your fitness streaming content</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Select value={streamFilter} onValueChange={setStreamFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Streams</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {filteredStreams.map((stream) => (
                  <Card key={stream.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                              <Play className="h-8 w-8 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold truncate">{stream.title}</h3>
                              <Badge className={getStatusColor(stream.status)}>
                                {stream.status}
                              </Badge>
                              <Badge className={getDifficultyColor(stream.difficulty)}>
                                {stream.difficulty}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                              <div className="flex items-center">
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarImage src={stream.instructorAvatar} />
                                  <AvatarFallback>{stream.instructor.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                {stream.instructor}
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {stream.duration} min
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {stream.participants}/{stream.maxParticipants}
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(stream.scheduledTime).toLocaleString()}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{stream.description}</p>
                            <div className="flex items-center space-x-4 mt-3 text-sm">
                              <div className="flex items-center">
                                <Eye className="h-4 w-4 mr-1" />
                                {stream.views} views
                              </div>
                              <div className="flex items-center">
                                <Heart className="h-4 w-4 mr-1" />
                                {stream.likes} likes
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          {stream.status === "Live" && (
                            <Button size="sm">
                              <Monitor className="mr-2 h-4 w-4" />
                              View Stream
                            </Button>
                          )}
                          {stream.status === "Scheduled" && (
                            <Button size="sm" variant="outline">
                              <Play className="mr-2 h-4 w-4" />
                              Start Stream
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setSelectedStream(stream)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Streams Control Center</CardTitle>
              <CardDescription>Monitor and control active live streams</CardDescription>
            </CardHeader>
            <CardContent>
              {liveStreams > 0 ? (
                <div className="space-y-4">
                  {trainingStreams.filter(s => s.status === "Live").map((stream) => (
                    <div key={stream.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <div>
                          <div className="font-medium">{stream.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {stream.instructor} • {stream.participants} viewers
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Monitor className="mr-2 h-4 w-4" />
                          Monitor
                        </Button>
                        <Button size="sm" variant="outline">
                          <Pause className="mr-2 h-4 w-4" />
                          End Stream
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Live Streams</h3>
                  <p>No training streams are currently broadcasting.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Streams</CardTitle>
              <CardDescription>Upcoming training sessions and streams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainingStreams.filter(s => s.status === "Scheduled").map((stream) => (
                  <div key={stream.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={stream.instructorAvatar} />
                        <AvatarFallback>{stream.instructor.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{stream.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {stream.instructor} • {new Date(stream.scheduledTime).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm">
                        <Play className="mr-2 h-4 w-4" />
                        Start Now
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stream Library</CardTitle>
              <CardDescription>Browse recorded sessions and on-demand content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {streamCategories.map((category) => (
                  <Card key={category.name}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <Badge className={category.color}>
                          {category.count} videos
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" variant="outline">
                        Browse {category.name}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Recent Recordings</h3>
                <div className="space-y-3">
                  {trainingStreams.filter(s => s.status === "Ended").map((stream) => (
                    <div key={stream.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <Play className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">{stream.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {stream.instructor} • {stream.views} views
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Play className="mr-2 h-4 w-4" />
                          Watch
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stream Analytics</CardTitle>
              <CardDescription>Performance metrics and viewership data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Streams</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{trainingStreams.length}</div>
                    <p className="text-sm text-muted-foreground">All time</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Views</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {trainingStreams.reduce((sum, s) => sum + s.views, 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">All streams</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Engagement Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">73%</div>
                    <p className="text-sm text-muted-foreground">Average completion</p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Detailed Analytics</h3>
                <p>Advanced streaming analytics and insights coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stream Details Dialog */}
      {selectedStream && (
        <Dialog open={!!selectedStream} onOpenChange={() => setSelectedStream(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Stream - {selectedStream.title}</DialogTitle>
              <DialogDescription>
                Modify the stream details and settings
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editTitle">Stream Title</Label>
                <Input id="editTitle" defaultValue={selectedStream.title} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Badge className="bg-blue-100 text-blue-800">
                    {selectedStream.category}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedStream.status)}>
                    {selectedStream.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Textarea 
                  id="editDescription" 
                  defaultValue={selectedStream.description}
                  className="min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input defaultValue={selectedStream.duration} type="number" />
                </div>
                <div className="space-y-2">
                  <Label>Max Participants</Label>
                  <Input defaultValue={selectedStream.maxParticipants} type="number" />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline">Cancel</Button>
              <Button>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

