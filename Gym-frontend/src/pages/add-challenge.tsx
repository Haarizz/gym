import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { 
  Search,
  Filter,
  Trophy,
  Users,
  Calendar,
  Clock,
  Target,
  Award,
  TrendingUp,
  Flame,
  CheckCircle2,
  Plus,
  Share2,
  Heart,
  User,
  Star,
  Medal,
  Zap,
  Activity,
  Dumbbell,
  Footprints,
  Scale,
  Droplet,
  Utensils,
  Camera,
  Upload,
  Download,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  Gift,
  Crown,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  Lock,
  Globe,
  Image as ImageIcon,
  CircleDot,
  CheckCircle,
  XCircle,
  AlertCircle,
  ThumbsUp,
  MessageCircle,
  Send
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Challenge categories
const challengeCategories = [
  { id: 'steps', name: 'Steps', icon: Footprints, color: 'bg-blue-500' },
  { id: 'weight-loss', name: 'Weight Loss', icon: Scale, color: 'bg-purple-500' },
  { id: 'strength', name: 'Strength', icon: Dumbbell, color: 'bg-red-500' },
  { id: 'yoga', name: 'Yoga', icon: Activity, color: 'bg-green-500' },
  { id: 'cardio', name: 'Cardio', icon: Zap, color: 'bg-orange-500' },
  { id: 'nutrition', name: 'Nutrition', icon: Utensils, color: 'bg-yellow-500' }
];

// Mock challenges data
const exploreChallenges = [
  {
    id: 1,
    name: "21-Day Fat Loss Sprint",
    category: "weight-loss",
    tags: ["Weight Loss", "21 Days", "Beginner"],
    startDate: "2026-02-01",
    endDate: "2026-02-21",
    duration: 21,
    participants: 156,
    maxParticipants: 200,
    type: "Individual",
    difficulty: "Beginner",
    price: 0,
    includedInMembership: true,
    goal: "Lose weight through consistent workouts and nutrition tracking",
    rules: ["Attend 4 classes per week", "Log daily meals", "Track weight weekly", "Complete 10,000 steps daily"],
    trackingMethods: ["Check-ins", "Class Attendance", "Weight Logs", "Steps"],
    rewards: {
      badges: ["Bronze Achiever", "Silver Champion", "Gold Winner"],
      points: 100,
      extras: "Free nutrition consultation"
    },
    createdBy: "GymBios Team",
    status: "Upcoming",
    leaderboard: []
  },
  {
    id: 2,
    name: "30-Day Push-up Challenge",
    category: "strength",
    tags: ["Strength", "30 Days", "Intermediate"],
    startDate: "2026-01-22",
    endDate: "2026-02-20",
    duration: 30,
    participants: 234,
    maxParticipants: 250,
    type: "Individual",
    difficulty: "Intermediate",
    price: 0,
    includedInMembership: true,
    goal: "Build upper body strength with progressive push-up training",
    rules: ["Complete daily push-up target", "Upload form video weekly", "Rest days allowed (2 per week)", "Track progress daily"],
    trackingMethods: ["Manual Log", "Video Upload", "Trainer Validation"],
    rewards: {
      badges: ["Push-up Rookie", "Push-up Pro", "Push-up Master"],
      points: 150,
      extras: "10% off supplements"
    },
    createdBy: "Marcus Johnson",
    status: "Active",
    leaderboard: [
      { rank: 1, name: "Ahmed Al-Rashid", points: 450, streak: 15 },
      { rank: 2, name: "Sarah Mitchell", points: 425, streak: 14 },
      { rank: 3, name: "Fatima Hassan", points: 400, streak: 13 }
    ]
  },
  {
    id: 3,
    name: "10K Steps Daily - January",
    category: "steps",
    tags: ["Steps", "31 Days", "All Levels"],
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    duration: 31,
    participants: 89,
    maxParticipants: 150,
    type: "Individual",
    difficulty: "All Levels",
    price: 50,
    includedInMembership: false,
    goal: "Build a consistent walking habit by hitting 10,000 steps daily",
    rules: ["Log 10,000 steps daily", "Sync fitness tracker or manual log", "Share progress weekly", "No rest days"],
    trackingMethods: ["Wearable Sync", "Manual Steps Log"],
    rewards: {
      badges: ["Step Master"],
      points: 200,
      extras: "AED 100 gym store credit"
    },
    createdBy: "Wellness Team",
    status: "Active",
    leaderboard: []
  },
  {
    id: 4,
    name: "Yoga Streak Challenge",
    category: "yoga",
    tags: ["Yoga", "14 Days", "Beginner"],
    startDate: "2026-02-05",
    endDate: "2026-02-18",
    duration: 14,
    participants: 67,
    maxParticipants: 100,
    type: "Team",
    difficulty: "Beginner",
    price: 0,
    includedInMembership: true,
    goal: "Develop a consistent yoga practice with daily sessions",
    rules: ["Attend 1 yoga class daily", "Practice 20+ minutes", "Join team sessions", "Share mindfulness moment"],
    trackingMethods: ["Class Attendance", "Manual Practice Log"],
    rewards: {
      badges: ["Zen Beginner", "Yoga Devotee"],
      points: 120,
      extras: "Free yoga mat"
    },
    createdBy: "Sarah Mitchell",
    status: "Upcoming",
    leaderboard: []
  },
  {
    id: 5,
    name: "HIIT & Burn - 7 Day Blast",
    category: "cardio",
    tags: ["Cardio", "7 Days", "Advanced"],
    startDate: "2026-01-25",
    endDate: "2026-01-31",
    duration: 7,
    participants: 45,
    maxParticipants: 50,
    type: "Individual",
    difficulty: "Advanced",
    price: 75,
    includedInMembership: false,
    goal: "Intense 7-day HIIT program for maximum calorie burn",
    rules: ["Complete daily HIIT workout", "Track calories burned", "Nutrition compliance", "Attend all 7 classes"],
    trackingMethods: ["Class Attendance", "Workout Logs", "Nutrition Logs"],
    rewards: {
      badges: ["HIIT Hero", "Calorie Crusher"],
      points: 250,
      extras: "1 free PT session"
    },
    createdBy: "Marcus Johnson",
    status: "Active",
    leaderboard: []
  }
];

// Mock user's challenges
const myChallenges = [
  {
    id: 2,
    name: "30-Day Push-up Challenge",
    category: "strength",
    type: "Individual",
    daysRemaining: 15,
    totalDays: 30,
    progress: 50,
    currentRank: 12,
    totalParticipants: 234,
    streak: 8,
    todayTarget: "50 push-ups",
    todayCompleted: 35,
    status: "Active"
  },
  {
    id: 3,
    name: "10K Steps Daily - January",
    category: "steps",
    type: "Individual",
    daysRemaining: 10,
    totalDays: 31,
    progress: 68,
    currentRank: 5,
    totalParticipants: 89,
    streak: 15,
    todayTarget: "10,000 steps",
    todayCompleted: 7200,
    status: "Active"
  }
];

interface AddChallengeProps {
  onNavigate?: (section: string) => void;
}

export function AddChallenge({ onNavigate }: AddChallengeProps = {}) {
  const [mainTab, setMainTab] = useState<'explore' | 'my-challenges' | 'create' | 'leaderboard'>('explore');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showProgressSheet, setShowProgressSheet] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [joinAsTeam, setJoinAsTeam] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [myProgressTab, setMyProgressTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const [leaderboardMode, setLeaderboardMode] = useState<'overall' | 'friends' | 'branch'>('overall');
  
  // Progress tracking state
  const [manualProgress, setManualProgress] = useState({
    steps: '',
    workouts: '',
    minutes: '',
    weight: '',
    water: ''
  });

  // Create challenge form
  const [newChallenge, setNewChallenge] = useState({
    name: '',
    category: '',
    description: '',
    duration: '21',
    startDate: '',
    type: 'Individual',
    capacity: '',
    trackingMethods: [] as string[],
    rewards: {
      badges: '',
      points: '',
      extras: ''
    },
    visibility: 'public'
  });

  const getCategoryInfo = (categoryId: string) => {
    return challengeCategories.find(c => c.id === categoryId) || challengeCategories[0];
  };

  const getDifficultyBadge = (difficulty: string) => {
    const colors: Record<string, string> = {
      'Beginner': 'bg-green-100 text-green-800',
      'Intermediate': 'bg-yellow-100 text-yellow-800',
      'Advanced': 'bg-red-100 text-red-800',
      'All Levels': 'bg-blue-100 text-blue-800'
    };
    return colors[difficulty] || colors['All Levels'];
  };

  const filteredChallenges = exploreChallenges.filter(challenge => {
    const matchesSearch = challenge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.goal.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || challenge.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || challenge.difficulty === selectedDifficulty;
    const matchesType = selectedType === 'all' || challenge.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesDifficulty && matchesType;
  });

  const handleJoinChallenge = (challenge: any) => {
    setSelectedChallenge(challenge);
    setShowJoinSheet(true);
  };

  const handleConfirmJoin = () => {
    if (!agreedToRules) {
      toast.error('Please agree to the challenge rules');
      return;
    }

    setShowJoinSheet(false);
    setShowSuccessDialog(true);
    setAgreedToRules(false);

    toast.success('Challenge Joined!', {
      description: `You've joined ${selectedChallenge.name}`,
      duration: 5000,
    });
  };

  const handleTrackProgress = (challenge: any) => {
    setSelectedChallenge(challenge);
    setShowProgressSheet(true);
  };

  const handleSubmitProgress = () => {
    toast.success('Progress Updated!', {
      description: 'Your daily progress has been recorded',
      duration: 3000,
    });
    setShowProgressSheet(false);
    setManualProgress({
      steps: '',
      workouts: '',
      minutes: '',
      weight: '',
      water: ''
    });
  };

  const handleCreateChallenge = () => {
    toast.success('Challenge Created!', {
      description: 'Your challenge has been published',
      duration: 3000,
    });
    setShowCreateWizard(false);
    setCreateStep(1);
    setNewChallenge({
      name: '',
      category: '',
      description: '',
      duration: '21',
      startDate: '',
      type: 'Individual',
      capacity: '',
      trackingMethods: [],
      rewards: {
        badges: '',
        points: '',
        extras: ''
      },
      visibility: 'public'
    });
  };

  const handleInviteFriends = () => {
    toast.info('Invite Friends', {
      description: 'Share challenge link via WhatsApp...',
      duration: 2000,
    });
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1E293B]">Fitness Challenges</h1>
            <p className="text-gray-600 mt-1">Join a challenge & stay consistent</p>
          </div>
          <Button
            style={{ backgroundColor: '#327F74' }}
            onClick={() => setShowCreateWizard(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Challenge
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Challenges</p>
                  <p className="text-2xl font-bold text-[#327F74]">3</p>
                </div>
                <Trophy className="h-8 w-8 text-[#327F74] opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">New This Week</p>
                  <p className="text-2xl font-bold text-[#327F74]">5</p>
                </div>
                <Zap className="h-8 w-8 text-[#327F74] opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Streak</p>
                  <p className="text-2xl font-bold text-orange-600 flex items-center gap-1">
                    15 <Flame className="h-6 w-6" />
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-[#327F74] opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Points Earned</p>
                  <p className="text-2xl font-bold text-[#327F74]">1,250</p>
                </div>
                <Award className="h-8 w-8 text-[#327F74] opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={(val) => setMainTab(val as any)} className="w-full">
          <TabsList className="grid w-full md:w-[600px] grid-cols-4">
            <TabsTrigger value="explore">Explore</TabsTrigger>
            <TabsTrigger value="my-challenges">My Challenges</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>

          {/* Explore Tab */}
          <TabsContent value="explore" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Explore Challenges</CardTitle>
                <CardDescription>Browse and join fitness challenges</CardDescription>

                {/* Search and Filters */}
                <div className="space-y-4 pt-4">
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search challenge name / goal..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Sheet open={showFilters} onOpenChange={setShowFilters}>
                      <Button variant="outline" onClick={() => setShowFilters(true)}>
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                      </Button>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Filter Challenges</SheetTitle>
                          <SheetDescription>Refine your search</SheetDescription>
                        </SheetHeader>
                        <div className="space-y-6 mt-6">
                          <div>
                            <Label>Category</Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {challengeCategories.map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Difficulty</Label>
                            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value="Beginner">Beginner</SelectItem>
                                <SelectItem value="Intermediate">Intermediate</SelectItem>
                                <SelectItem value="Advanced">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Select value={selectedType} onValueChange={setSelectedType}>
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="Individual">Individual</SelectItem>
                                <SelectItem value="Team">Team</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            className="w-full" 
                            style={{ backgroundColor: '#327F74' }}
                            onClick={() => setShowFilters(false)}
                          >
                            Apply Filters
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>

                  {/* Quick Filter Chips */}
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant={selectedCategory === 'all' ? 'default' : 'outline'} 
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory('all')}
                    >
                      All
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer">Free</Badge>
                    <Badge variant="outline" className="cursor-pointer">Member-only</Badge>
                    <Badge variant="outline" className="cursor-pointer">Starts Soon</Badge>
                    <Badge variant="outline" className="cursor-pointer">Beginner-Friendly</Badge>
                    <Badge variant="outline" className="cursor-pointer">Team</Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Category Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                    style={selectedCategory === 'all' ? { backgroundColor: '#327F74' } : {}}
                  >
                    All
                  </Button>
                  {challengeCategories.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <Button
                        key={cat.id}
                        variant={selectedCategory === cat.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(cat.id)}
                        style={selectedCategory === cat.id ? { backgroundColor: '#327F74' } : {}}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {cat.name}
                      </Button>
                    );
                  })}
                </div>

                {/* Challenge Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredChallenges.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No challenges found</p>
                    </div>
                  ) : (
                    filteredChallenges.map(challenge => {
                      const catInfo = getCategoryInfo(challenge.category);
                      const Icon = catInfo.icon;
                      const progressPercentage = (challenge.participants / challenge.maxParticipants) * 100;
                      
                      return (
                        <Card 
                          key={challenge.id} 
                          className="hover:shadow-lg transition-all cursor-pointer"
                          onClick={() => setSelectedChallenge(challenge)}
                        >
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              {/* Header */}
                              <div className="flex items-start justify-between">
                                <div className={`p-3 rounded-lg ${catInfo.color}`}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <Badge className={getDifficultyBadge(challenge.difficulty)}>
                                  {challenge.difficulty}
                                </Badge>
                              </div>

                              {/* Title */}
                              <div>
                                <h3 className="font-semibold text-lg mb-2">{challenge.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                  {challenge.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Dates */}
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{new Date(challenge.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{challenge.duration} days</span>
                                </div>
                              </div>

                              {/* Participants */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">
                                    <Users className="h-4 w-4 inline mr-1" />
                                    {challenge.participants} / {challenge.maxParticipants} joined
                                  </span>
                                </div>
                                <Progress value={progressPercentage} className="h-2" />
                              </div>

                              {/* Rewards Preview */}
                              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <Award className="h-5 w-5 text-yellow-600" />
                                <div className="text-sm">
                                  <p className="font-medium text-yellow-900">
                                    🏅 {challenge.rewards.badges[0]} + {challenge.rewards.points} points
                                  </p>
                                </div>
                              </div>

                              {/* CTA */}
                              <div className="flex gap-2">
                                <Button
                                  className="flex-1"
                                  style={{ backgroundColor: '#327F74' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleJoinChallenge(challenge);
                                  }}
                                >
                                  {challenge.price > 0 ? `Join - AED ${challenge.price}` : 'Join Free'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInviteFriends();
                                  }}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Challenges Tab */}
          <TabsContent value="my-challenges" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>My Challenges</CardTitle>
                <CardDescription>Track your active and completed challenges</CardDescription>
                <Tabs value={myProgressTab} onValueChange={(val) => setMyProgressTab(val as any)} className="mt-4">
                  <TabsList className="grid w-full md:w-[400px] grid-cols-3">
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myChallenges.length === 0 ? (
                    <div className="text-center py-12">
                      <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No active challenges</p>
                      <Button className="mt-4" onClick={() => setMainTab('explore')}>
                        Explore Challenges
                      </Button>
                    </div>
                  ) : (
                    myChallenges.map(challenge => {
                      const catInfo = getCategoryInfo(challenge.category);
                      const Icon = catInfo.icon;
                      
                      return (
                        <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-6">
                              {/* Left: Progress Circle */}
                              <div className="flex flex-col items-center justify-center">
                                <div className="relative w-32 h-32">
                                  <svg className="w-32 h-32 transform -rotate-90">
                                    <circle
                                      cx="64"
                                      cy="64"
                                      r="56"
                                      stroke="#E5E7EB"
                                      strokeWidth="8"
                                      fill="none"
                                    />
                                    <circle
                                      cx="64"
                                      cy="64"
                                      r="56"
                                      stroke="#327F74"
                                      strokeWidth="8"
                                      fill="none"
                                      strokeDasharray={`${2 * Math.PI * 56}`}
                                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - challenge.progress / 100)}`}
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <p className="text-3xl font-bold text-[#327F74]">{challenge.progress}%</p>
                                    <p className="text-xs text-gray-600">Complete</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 mt-3 text-orange-600">
                                  <Flame className="h-5 w-5" />
                                  <span className="font-bold">{challenge.streak}</span>
                                  <span className="text-sm">day streak</span>
                                </div>
                              </div>

                              {/* Right: Details */}
                              <div className="flex-1 space-y-4">
                                <div>
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg ${catInfo.color}`}>
                                        <Icon className="h-5 w-5 text-white" />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-lg">{challenge.name}</h3>
                                        <p className="text-sm text-gray-600">{challenge.type} Challenge</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-600">Days Left</p>
                                    <p className="text-lg font-bold text-[#327F74]">{challenge.daysRemaining}</p>
                                  </div>
                                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-600">Your Rank</p>
                                    <p className="text-lg font-bold text-[#327F74]">#{challenge.currentRank}</p>
                                  </div>
                                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-600">Participants</p>
                                    <p className="text-lg font-bold text-[#327F74]">{challenge.totalParticipants}</p>
                                  </div>
                                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-600">Progress</p>
                                    <p className="text-lg font-bold text-[#327F74]">{challenge.progress}%</p>
                                  </div>
                                </div>

                                {/* Today's Target */}
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-blue-900">Today's Target</p>
                                    <Badge className="bg-blue-100 text-blue-800">{challenge.todayTarget}</Badge>
                                  </div>
                                  <Progress 
                                    value={(challenge.todayCompleted / parseInt(challenge.todayTarget.split(' ')[0])) * 100} 
                                    className="h-2 mb-2"
                                  />
                                  <p className="text-sm text-blue-800">
                                    Completed: {challenge.todayCompleted} / {challenge.todayTarget}
                                  </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                  <Button
                                    style={{ backgroundColor: '#327F74' }}
                                    onClick={() => handleTrackProgress(challenge)}
                                  >
                                    <Target className="h-4 w-4 mr-2" />
                                    Update Progress
                                  </Button>
                                  <Button variant="outline">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                  <Button variant="outline">
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Invite
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>See how you rank against others</CardDescription>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant={leaderboardMode === 'overall' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLeaderboardMode('overall')}
                    style={leaderboardMode === 'overall' ? { backgroundColor: '#327F74' } : {}}
                  >
                    Overall
                  </Button>
                  <Button
                    variant={leaderboardMode === 'friends' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLeaderboardMode('friends')}
                    style={leaderboardMode === 'friends' ? { backgroundColor: '#327F74' } : {}}
                  >
                    Friends
                  </Button>
                  <Button
                    variant={leaderboardMode === 'branch' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLeaderboardMode('branch')}
                    style={leaderboardMode === 'branch' ? { backgroundColor: '#327F74' } : {}}
                  >
                    My Branch
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Top 3 Podium */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center pt-8">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border-4 border-gray-300">
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-lg">SM</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-300 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        2
                      </div>
                    </div>
                    <p className="font-semibold mt-3">Sarah M.</p>
                    <p className="text-sm text-gray-600">425 pts</p>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center">
                    <Crown className="h-8 w-8 text-yellow-500 mb-2" />
                    <div className="relative">
                      <Avatar className="h-24 w-24 border-4 border-yellow-500">
                        <AvatarFallback className="bg-yellow-100 text-yellow-700 text-xl">AR</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        1
                      </div>
                    </div>
                    <p className="font-semibold mt-3">Ahmed R.</p>
                    <p className="text-sm text-gray-600">450 pts</p>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center pt-12">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-4 border-orange-300">
                        <AvatarFallback className="bg-orange-100 text-orange-700">FH</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-orange-300 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        3
                      </div>
                    </div>
                    <p className="font-semibold mt-3">Fatima H.</p>
                    <p className="text-sm text-gray-600">400 pts</p>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Rest of Leaderboard */}
                <div className="space-y-2">
                  {[
                    { rank: 4, name: "Mike Chen", points: 385, streak: 12, change: 'up' },
                    { rank: 5, name: "Lisa Park", points: 370, streak: 11, change: 'up' },
                    { rank: 6, name: "You", points: 350, streak: 10, change: 'down', isCurrentUser: true },
                    { rank: 7, name: "John Doe", points: 340, streak: 9, change: 'same' },
                    { rank: 8, name: "Jane Smith", points: 325, streak: 8, change: 'up' }
                  ].map((entry) => (
                    <div 
                      key={entry.rank} 
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        entry.isCurrentUser ? 'bg-[#327F74] bg-opacity-10 border-2 border-[#327F74]' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 text-center font-bold text-gray-600">
                          #{entry.rank}
                        </div>
                        <Avatar>
                          <AvatarFallback>{entry.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {entry.name}
                            {entry.isCurrentUser && <Badge className="text-xs">You</Badge>}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Flame className="h-3 w-3 text-orange-500" />
                            {entry.streak} day streak
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-[#327F74]">{entry.points}</p>
                          <p className="text-xs text-gray-600">points</p>
                        </div>
                        <div>
                          {entry.change === 'up' && <ArrowUp className="h-5 w-5 text-green-600" />}
                          {entry.change === 'down' && <ArrowDown className="h-5 w-5 text-red-600" />}
                          {entry.change === 'same' && <Minus className="h-5 w-5 text-gray-400" />}
                        </div>
                        <Button variant="ghost" size="sm">
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Rewards & Badges</CardTitle>
                <CardDescription>Your achievements and earned rewards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Points Summary */}
                  <Card className="bg-gradient-to-br from-[#327F74] to-[#2a6a61] text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm opacity-90">Total Points</p>
                          <p className="text-4xl font-bold">1,250</p>
                        </div>
                        <Award className="h-16 w-16 opacity-20" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Available to Redeem</span>
                          <span className="font-semibold">850 pts</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Used</span>
                          <span className="font-semibold">400 pts</span>
                        </div>
                      </div>
                      <Button className="w-full mt-4 bg-white text-[#327F74] hover:bg-gray-100">
                        Redeem Points
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Recent Rewards */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Rewards</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Gift className="h-8 w-8 text-yellow-600" />
                          <div>
                            <p className="font-semibold text-sm">Free PT Session</p>
                            <p className="text-xs text-gray-600">Expires: Feb 28</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">Use</Button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Gift className="h-8 w-8 text-green-600" />
                          <div>
                            <p className="font-semibold text-sm">AED 100 Store Credit</p>
                            <p className="text-xs text-gray-600">Expires: Mar 15</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">Use</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Badges */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Earned Badges</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[
                      { name: "Push-up Pro", icon: "💪", earned: true, rarity: "gold" },
                      { name: "Step Master", icon: "👟", earned: true, rarity: "silver" },
                      { name: "Streak King", icon: "🔥", earned: true, rarity: "gold" },
                      { name: "Yoga Devotee", icon: "🧘", earned: false, rarity: "silver" },
                      { name: "HIIT Hero", icon: "⚡", earned: false, rarity: "bronze" },
                      { name: "Weight Warrior", icon: "⚖️", earned: true, rarity: "bronze" }
                    ].map((badge, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border-2 text-center transition-all ${
                          badge.earned 
                            ? badge.rarity === 'gold' ? 'bg-yellow-50 border-yellow-400' :
                              badge.rarity === 'silver' ? 'bg-gray-50 border-gray-400' :
                              'bg-orange-50 border-orange-400'
                            : 'bg-gray-50 border-gray-200 opacity-40'
                        }`}
                      >
                        <div className="text-4xl mb-2">{badge.icon}</div>
                        <p className="text-xs font-semibold">{badge.name}</p>
                        {badge.earned && (
                          <CheckCircle className="h-4 w-4 text-green-600 mx-auto mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Challenge Details Dialog */}
      {selectedChallenge && !showJoinSheet && (
        <Dialog open={!!selectedChallenge} onOpenChange={() => setSelectedChallenge(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {(() => {
                  const catInfo = getCategoryInfo(selectedChallenge.category);
                  const Icon = catInfo.icon;
                  return (
                    <>
                      <div className={`p-2 rounded-lg ${catInfo.color}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      {selectedChallenge.name}
                    </>
                  );
                })()}
              </DialogTitle>
              <DialogDescription>{selectedChallenge.goal}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-gray-600">Duration</p>
                  <p className="font-semibold">{selectedChallenge.duration} days</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-gray-600">Type</p>
                  <p className="font-semibold">{selectedChallenge.type}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-gray-600">Difficulty</p>
                  <p className="font-semibold">{selectedChallenge.difficulty}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-gray-600">Participants</p>
                  <p className="font-semibold">{selectedChallenge.participants} joined</p>
                </div>
              </div>

              {/* Rules */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Challenge Rules
                </h4>
                <ul className="space-y-2">
                  {selectedChallenge.rules.map((rule: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tracking Methods */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  How to Track Progress
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedChallenge.trackingMethods.map((method: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-sm">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Rewards */}
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-yellow-900">
                  <Award className="h-5 w-5" />
                  Rewards & Achievements
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Medal className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm">Badges: {selectedChallenge.rewards.badges.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm">{selectedChallenge.rewards.points} points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm">{selectedChallenge.rewards.extras}</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  style={{ backgroundColor: '#327F74' }}
                  onClick={() => {
                    setShowJoinSheet(true);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Join Challenge
                </Button>
                <Button variant="outline" onClick={handleInviteFriends}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Invite Friends
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Join Challenge Sheet */}
      {selectedChallenge && (
        <Sheet open={showJoinSheet} onOpenChange={setShowJoinSheet}>
          <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Join Challenge</SheetTitle>
              <SheetDescription>Confirm your participation</SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Challenge Summary */}
              <Card className="bg-[#327F74] bg-opacity-5 border-[#327F74]">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{selectedChallenge.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Start Date</p>
                      <p className="font-semibold">{new Date(selectedChallenge.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Duration</p>
                      <p className="font-semibold">{selectedChallenge.duration} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Participation Type */}
              {selectedChallenge.type === 'Team' && (
                <div>
                  <Label className="mb-3 block">Participation Type</Label>
                  <div className="space-y-3">
                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        !joinAsTeam ? 'border-[#327F74] bg-[#327F74] bg-opacity-5' : 'hover:border-gray-400'
                      }`}
                      onClick={() => setJoinAsTeam(false)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-[#327F74]" />
                          <div>
                            <p className="font-semibold">Join as Individual</p>
                            <p className="text-sm text-gray-600">Compete on your own</p>
                          </div>
                        </div>
                        {!joinAsTeam && <CheckCircle2 className="h-5 w-5 text-[#327F74]" />}
                      </div>
                    </div>

                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        joinAsTeam ? 'border-[#327F74] bg-[#327F74] bg-opacity-5' : 'hover:border-gray-400'
                      }`}
                      onClick={() => setJoinAsTeam(true)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-[#327F74]" />
                          <div>
                            <p className="font-semibold">Join as Team</p>
                            <p className="text-sm text-gray-600">Create or join a team</p>
                          </div>
                        </div>
                        {joinAsTeam && <CheckCircle2 className="h-5 w-5 text-[#327F74]" />}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy */}
              <div>
                <Label className="mb-3 block">Leaderboard Visibility</Label>
                <div className="space-y-3">
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      publicProfile ? 'border-[#327F74] bg-[#327F74] bg-opacity-5' : 'hover:border-gray-400'
                    }`}
                    onClick={() => setPublicProfile(true)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-[#327F74]" />
                        <div>
                          <p className="font-semibold">Public</p>
                          <p className="text-sm text-gray-600">Show on leaderboard</p>
                        </div>
                      </div>
                      {publicProfile && <CheckCircle2 className="h-5 w-5 text-[#327F74]" />}
                    </div>
                  </div>

                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      !publicProfile ? 'border-[#327F74] bg-[#327F74] bg-opacity-5' : 'hover:border-gray-400'
                    }`}
                    onClick={() => setPublicProfile(false)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-[#327F74]" />
                        <div>
                          <p className="font-semibold">Private</p>
                          <p className="text-sm text-gray-600">Hide name from leaderboard</p>
                        </div>
                      </div>
                      {!publicProfile && <CheckCircle2 className="h-5 w-5 text-[#327F74]" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Agreement */}
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Checkbox
                  id="rules"
                  checked={agreedToRules}
                  onCheckedChange={(checked) => setAgreedToRules(checked as boolean)}
                />
                <Label htmlFor="rules" className="text-sm cursor-pointer">
                  I agree to follow the challenge rules and commit to completing the daily targets
                </Label>
              </div>

              {/* Confirm Button */}
              <Button
                className="w-full h-12 text-lg"
                style={{ backgroundColor: '#327F74' }}
                onClick={handleConfirmJoin}
                disabled={!agreedToRules}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {selectedChallenge.price > 0 ? `Join & Pay AED ${selectedChallenge.price}` : 'Join Challenge'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <div className="text-center space-y-6 py-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Trophy className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Challenge Joined!</h2>
              <p className="text-gray-600">You're all set. Let's crush this challenge! 💪</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">Duration</p>
                <p className="text-lg font-bold text-[#327F74]">{selectedChallenge?.duration} days</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">Potential Points</p>
                <p className="text-lg font-bold text-[#327F74]">{selectedChallenge?.rewards.points}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full"
                style={{ backgroundColor: '#327F74' }}
                onClick={() => {
                  setShowSuccessDialog(false);
                  setMainTab('my-challenges');
                  setSelectedChallenge(null);
                }}
              >
                Track Progress
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleInviteFriends}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Friends
                </Button>
                <Button variant="outline" onClick={() => setMainTab('leaderboard')}>
                  <Trophy className="h-4 w-4 mr-2" />
                  Leaderboard
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Tracking Sheet */}
      <Sheet open={showProgressSheet} onOpenChange={setShowProgressSheet}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Update Progress</SheetTitle>
            <SheetDescription>Log your daily progress</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Today's Target */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">Today's Target</p>
                  <Badge className="bg-blue-600">{selectedChallenge?.todayTarget}</Badge>
                </div>
                <Progress value={65} className="h-3" />
                <p className="text-sm text-blue-800 mt-2">65% complete</p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div>
              <Label className="mb-3 block">Quick Log</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <span className="text-sm">Mark Done</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Camera className="h-6 w-6 text-blue-600" />
                  <span className="text-sm">Upload Photo</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Footprints className="h-6 w-6 text-purple-600" />
                  <span className="text-sm">+500 Steps</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Dumbbell className="h-6 w-6 text-red-600" />
                  <span className="text-sm">+1 Workout</span>
                </Button>
              </div>
            </div>

            {/* Manual Entry */}
            <div>
              <Label className="mb-3 block">Manual Entry</Label>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="steps" className="text-sm">Steps Today</Label>
                  <Input
                    id="steps"
                    type="number"
                    placeholder="0"
                    value={manualProgress.steps}
                    onChange={(e) => setManualProgress({...manualProgress, steps: e.target.value})}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="workouts" className="text-sm">Workouts Completed</Label>
                  <Input
                    id="workouts"
                    type="number"
                    placeholder="0"
                    value={manualProgress.workouts}
                    onChange={(e) => setManualProgress({...manualProgress, workouts: e.target.value})}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="minutes" className="text-sm">Exercise Minutes</Label>
                  <Input
                    id="minutes"
                    type="number"
                    placeholder="0"
                    value={manualProgress.minutes}
                    onChange={(e) => setManualProgress({...manualProgress, minutes: e.target.value})}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              className="w-full h-12"
              style={{ backgroundColor: '#327F74' }}
              onClick={handleSubmitProgress}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Save Progress
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Challenge Wizard */}
      <Dialog open={showCreateWizard} onOpenChange={setShowCreateWizard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Challenge</DialogTitle>
            <DialogDescription>Step {createStep} of 4</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {createStep === 1 && (
              <>
                <div>
                  <Label htmlFor="name">Challenge Name *</Label>
                  <Input
                    id="name"
                    value={newChallenge.name}
                    onChange={(e) => setNewChallenge({...newChallenge, name: e.target.value})}
                    placeholder="e.g., 30-Day Fitness Journey"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={newChallenge.category} onValueChange={(val) => setNewChallenge({...newChallenge, category: val})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {challengeCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={newChallenge.description}
                    onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})}
                    placeholder="Describe the challenge goal..."
                    className="mt-2"
                    rows={4}
                  />
                </div>
              </>
            )}

            {createStep === 2 && (
              <>
                <div>
                  <Label htmlFor="duration">Duration (days) *</Label>
                  <Select value={newChallenge.duration} onValueChange={(val) => setNewChallenge({...newChallenge, duration: val})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="21">21 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newChallenge.startDate}
                    onChange={(e) => setNewChallenge({...newChallenge, startDate: e.target.value})}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Challenge Type *</Label>
                  <Select value={newChallenge.type} onValueChange={(val) => setNewChallenge({...newChallenge, type: val})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Individual">Individual</SelectItem>
                      <SelectItem value="Team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="capacity">Max Participants (optional)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={newChallenge.capacity}
                    onChange={(e) => setNewChallenge({...newChallenge, capacity: e.target.value})}
                    placeholder="Unlimited"
                    className="mt-2"
                  />
                </div>
              </>
            )}

            {createStep === 3 && (
              <>
                <div>
                  <Label className="mb-3 block">Tracking Methods *</Label>
                  <div className="space-y-2">
                    {['Check-ins', 'Class Attendance', 'Workout Logs', 'Steps', 'Weight Logs', 'Nutrition Logs'].map(method => (
                      <div key={method} className="flex items-center gap-2">
                        <Checkbox
                          id={method}
                          checked={newChallenge.trackingMethods.includes(method)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewChallenge({...newChallenge, trackingMethods: [...newChallenge.trackingMethods, method]});
                            } else {
                              setNewChallenge({...newChallenge, trackingMethods: newChallenge.trackingMethods.filter(m => m !== method)});
                            }
                          }}
                        />
                        <Label htmlFor={method} className="cursor-pointer">{method}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {createStep === 4 && (
              <>
                <div>
                  <Label htmlFor="badges">Badges (comma-separated)</Label>
                  <Input
                    id="badges"
                    value={newChallenge.rewards.badges}
                    onChange={(e) => setNewChallenge({...newChallenge, rewards: {...newChallenge.rewards, badges: e.target.value}})}
                    placeholder="e.g., Bronze, Silver, Gold"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="points">Points Reward</Label>
                  <Input
                    id="points"
                    type="number"
                    value={newChallenge.rewards.points}
                    onChange={(e) => setNewChallenge({...newChallenge, rewards: {...newChallenge.rewards, points: e.target.value}})}
                    placeholder="100"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="extras">Extra Rewards</Label>
                  <Input
                    id="extras"
                    value={newChallenge.rewards.extras}
                    onChange={(e) => setNewChallenge({...newChallenge, rewards: {...newChallenge.rewards, extras: e.target.value}})}
                    placeholder="e.g., Free PT session, Store credit"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={newChallenge.visibility} onValueChange={(val) => setNewChallenge({...newChallenge, visibility: val})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="members">Members Only</SelectItem>
                      <SelectItem value="private">Private (Invite only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCreateStep(Math.max(1, createStep - 1))}
                disabled={createStep === 1}
              >
                Previous
              </Button>
              {createStep < 4 ? (
                <Button
                  style={{ backgroundColor: '#327F74' }}
                  onClick={() => setCreateStep(createStep + 1)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  style={{ backgroundColor: '#327F74' }}
                  onClick={handleCreateChallenge}
                >
                  Create Challenge
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
