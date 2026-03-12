import React, { useState, useCallback, useMemo } from 'react';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Textarea } from "../components/ui/textarea";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Checkbox } from "../components/ui/checkbox";
import { Switch } from "../components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Slider } from "../components/ui/slider";
import { 
  Search, 
  Filter, 
  Plus, 
  Send, 
  Save, 
  CheckCircle, 
  Star, 
  Heart, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Clock, 
  Users, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Calendar as CalendarIcon, 
  Target, 
  Zap, 
  Award, 
  Smile, 
  Meh, 
  Frown, 
  User, 
  UserCheck, 
  FileText, 
  Edit, 
  Eye, 
  Download, 
  Upload, 
  RefreshCw, 
  MoreHorizontal, 
  X, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Timer, 
  Flame, 
  Dumbbell, 
  PlayCircle, 
  PauseCircle, 
  Settings, 
  Bookmark, 
  Share, 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckSquare, 
  Calendar as CalendarAlt, 
  Sparkles, 
  Medal, 
  Trophy, 
  Hash, 
  AtSign, 
  MapPin, 
  Phone, 
  Mail, 
  Clipboard, 
  Archive, 
  Folder, 
  Tag, 
  Link, 
  ExternalLink, 
  Copy, 
  Trash2, 
  RotateCcw, 
  History, 
  Flag, 
  Volume2, 
  Headphones, 
  Mic, 
  Camera, 
  Image, 
  Video, 
  Music, 
  Wifi, 
  Battery, 
  Signal, 
  Bluetooth, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Laptop, 
  Watch, 
  Globe, 
  Navigation, 
  Compass, 
  Map, 
  Home, 
  Building, 
  Store, 
  Coffee, 
  Car, 
  Bike, 
  Bus, 
  Train, 
  Plane, 
  Ship, 
  Truck, 
  Fuel, 
  Battery as BatteryIcon, 
  Wrench, 
  Hammer, 
  Screwdriver, 
  Brush, 
  Scissors, 
  Ruler, 
  Calculator, 
  BookOpen, 
  Book, 
  FileText as FileIcon, 
  File, 
  Folder as FolderIcon, 
  Package, 
  Box, 
  ShoppingBag, 
  ShoppingCart, 
  CreditCard, 
  Wallet, 
  Banknote, 
  DollarSign, 
  Coins, 
  Receipt, 
  Percent, 
  TrendingUpDown,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from "sonner";
import { format, addDays, isAfter, isBefore, isToday, isTomorrow, isYesterday, addWeeks, subDays, addHours, addMinutes, startOfDay, endOfDay } from "date-fns";
import { cn } from "../components/ui/utils";

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  membershipId: string;
  membershipPlan: string;
  membershipStatus: 'active' | 'expired' | 'frozen';
  avatar?: string;
  joinDate: Date;
  lastCheckIn?: Date;
  totalWorkouts: number;
  currentStreak: number;
  preferredTrainer?: string;
}

interface WorkoutSession {
  id: string;
  memberId: string;
  memberName: string;
  workoutType: 'personal-training' | 'group-class' | 'open-gym' | 'functional' | 'cardio' | 'strength';
  className?: string;
  trainerId?: string;
  trainerName?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  caloriesBurned?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  equipment?: string[];
  location: string;
  status: 'completed' | 'in-progress' | 'cancelled';
}

interface FeedbackResponse {
  id: string;
  sessionId: string;
  memberId: string;
  memberName: string;
  workoutType: string;
  className?: string;
  trainerId?: string;
  trainerName?: string;
  submittedAt: Date;
  
  // Rating questions (1-5 scale)
  overallSatisfaction: number;
  workoutIntensity: number;
  trainerRating?: number;
  equipmentQuality: number;
  facilityRating: number;
  
  // Multiple choice questions
  recommendWorkout: 'yes' | 'no' | 'maybe';
  difficultyLevel: 'too-easy' | 'just-right' | 'too-hard';
  paceRating: 'too-slow' | 'just-right' | 'too-fast';
  
  // Categorical feedback
  bestAspects: string[]; // ["music", "energy", "instruction", "variety", "challenge"]
  areasForImprovement: string[]; // ["timing", "equipment", "space", "temperature", "noise"]
  
  // Open-ended feedback
  comments: string;
  suggestions: string;
  
  // Additional metrics
  energyAfterWorkout: 'low' | 'medium' | 'high';
  likelyToReturn: number; // 1-10 scale
  wouldRecommendTrainer?: 'yes' | 'no' | 'neutral';
  
  // Staff notes
  trainerNotes?: string;
  followUpRequired: boolean;
  flaggedForReview: boolean;
}

interface CheckInForm {
  sessionId: string;
  overallSatisfaction: number;
  workoutIntensity: number;
  trainerRating: number;
  equipmentQuality: number;
  facilityRating: number;
  recommendWorkout: string;
  difficultyLevel: string;
  paceRating: string;
  bestAspects: string[];
  areasForImprovement: string[];
  comments: string;
  suggestions: string;
  energyAfterWorkout: string;
  likelyToReturn: number;
  wouldRecommendTrainer: string;
}

export function PostWorkoutCheckin() {
  const [activeTab, setActiveTab] = useState('check-in');
  const [activeView, setActiveView] = useState<'form' | 'analytics' | 'feedback'>('form');
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [showMemberLookup, setShowMemberLookup] = useState(false);
  const [showFeedbackDetail, setShowFeedbackDetail] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrainer, setFilterTrainer] = useState('all');
  const [filterWorkoutType, setFilterWorkoutType] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('today');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [checkInForm, setCheckInForm] = useState<CheckInForm>({
    sessionId: '',
    overallSatisfaction: 5,
    workoutIntensity: 3,
    trainerRating: 5,
    equipmentQuality: 5,
    facilityRating: 5,
    recommendWorkout: 'yes',
    difficultyLevel: 'just-right',
    paceRating: 'just-right',
    bestAspects: [],
    areasForImprovement: [],
    comments: '',
    suggestions: '',
    energyAfterWorkout: 'high',
    likelyToReturn: 10,
    wouldRecommendTrainer: 'yes'
  });

  // Sample data - in real app this would come from your backend
  const members: Member[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+971 50 123 4567',
      membershipId: 'MEM001',
      membershipPlan: 'Premium Annual',
      membershipStatus: 'active',
      joinDate: new Date('2023-06-15'),
      lastCheckIn: new Date(),
      totalWorkouts: 156,
      currentStreak: 7,
      preferredTrainer: 'Sarah Johnson'
    },
    {
      id: '2',
      name: 'Lisa Chen',
      email: 'lisa.chen@email.com',
      phone: '+971 55 987 6543',
      membershipId: 'MEM002',
      membershipPlan: 'Standard Monthly',
      membershipStatus: 'active',
      joinDate: new Date('2024-01-10'),
      lastCheckIn: subDays(new Date(), 1),
      totalWorkouts: 89,
      currentStreak: 3,
      preferredTrainer: 'Mike Johnson'
    },
    {
      id: '3',
      name: 'Ahmed Hassan',
      email: 'ahmed.hassan@email.com',
      phone: '+971 52 456 7890',
      membershipId: 'MEM003',
      membershipPlan: 'Premium Monthly',
      membershipStatus: 'active',
      joinDate: new Date('2023-11-05'),
      lastCheckIn: new Date(),
      totalWorkouts: 203,
      currentStreak: 12,
      preferredTrainer: 'Emma Wilson'
    }
  ];

  const recentSessions: WorkoutSession[] = [
    {
      id: '1',
      memberId: '1',
      memberName: 'John Smith',
      workoutType: 'personal-training',
      trainerId: 'trainer1',
      trainerName: 'Sarah Johnson',
      startTime: addHours(new Date(), -2),
      endTime: addHours(new Date(), -1),
      duration: 60,
      caloriesBurned: 450,
      avgHeartRate: 145,
      maxHeartRate: 175,
      equipment: ['dumbbells', 'resistance-bands', 'bench'],
      location: 'Training Zone A',
      status: 'completed'
    },
    {
      id: '2',
      memberId: '2',
      memberName: 'Lisa Chen',
      workoutType: 'group-class',
      className: 'HIIT Bootcamp',
      trainerId: 'trainer2',
      trainerName: 'Mike Johnson',
      startTime: addHours(new Date(), -3),
      endTime: addHours(new Date(), -2),
      duration: 45,
      caloriesBurned: 380,
      avgHeartRate: 155,
      maxHeartRate: 185,
      location: 'Studio 1',
      status: 'completed'
    },
    {
      id: '3',
      memberId: '3',
      memberName: 'Ahmed Hassan',
      workoutType: 'strength',
      startTime: addHours(new Date(), -1),
      endTime: addMinutes(new Date(), -15),
      duration: 75,
      caloriesBurned: 320,
      avgHeartRate: 125,
      maxHeartRate: 160,
      equipment: ['barbell', 'squat-rack', 'bench'],
      location: 'Weight Training Area',
      status: 'completed'
    },
    {
      id: '4',
      memberId: '1',
      memberName: 'John Smith',
      workoutType: 'cardio',
      startTime: new Date(),
      endTime: addMinutes(new Date(), 30),
      duration: 30,
      location: 'Cardio Zone',
      status: 'in-progress'
    }
  ];

  const feedbackResponses: FeedbackResponse[] = [
    {
      id: '1',
      sessionId: '1',
      memberId: '1',
      memberName: 'John Smith',
      workoutType: 'personal-training',
      trainerId: 'trainer1',
      trainerName: 'Sarah Johnson',
      submittedAt: addMinutes(new Date(), -45),
      overallSatisfaction: 5,
      workoutIntensity: 4,
      trainerRating: 5,
      equipmentQuality: 5,
      facilityRating: 4,
      recommendWorkout: 'yes',
      difficultyLevel: 'just-right',
      paceRating: 'just-right',
      bestAspects: ['instruction', 'energy', 'challenge'],
      areasForImprovement: ['temperature'],
      comments: 'Excellent session! Sarah really pushed me to my limits in a good way.',
      suggestions: 'Maybe add some more variety to the warm-up routine.',
      energyAfterWorkout: 'high',
      likelyToReturn: 10,
      wouldRecommendTrainer: 'yes',
      trainerNotes: 'John showed great improvement in his form today. Increase weight next session.',
      followUpRequired: false,
      flaggedForReview: false
    },
    {
      id: '2',
      sessionId: '2',
      memberId: '2',
      memberName: 'Lisa Chen',
      workoutType: 'group-class',
      className: 'HIIT Bootcamp',
      trainerId: 'trainer2',
      trainerName: 'Mike Johnson',
      submittedAt: addMinutes(new Date(), -75),
      overallSatisfaction: 4,
      workoutIntensity: 5,
      trainerRating: 4,
      equipmentQuality: 4,
      facilityRating: 5,
      recommendWorkout: 'yes',
      difficultyLevel: 'too-hard',
      paceRating: 'too-fast',
      bestAspects: ['music', 'energy', 'challenge'],
      areasForImprovement: ['timing', 'space'],
      comments: 'Great workout but felt a bit rushed. Could use more recovery time between sets.',
      suggestions: 'Maybe extend the class to 50 minutes to allow for better recovery.',
      energyAfterWorkout: 'medium',
      likelyToReturn: 8,
      wouldRecommendTrainer: 'yes',
      trainerNotes: 'Lisa struggled with the pace today. Consider modifications for next class.',
      followUpRequired: true,
      flaggedForReview: false
    },
    {
      id: '3',
      sessionId: '3',
      memberId: '3',
      memberName: 'Ahmed Hassan',
      workoutType: 'strength',
      submittedAt: addMinutes(new Date(), -30),
      overallSatisfaction: 3,
      workoutIntensity: 2,
      trainerRating: 0,
      equipmentQuality: 2,
      facilityRating: 3,
      recommendWorkout: 'maybe',
      difficultyLevel: 'too-easy',
      paceRating: 'too-slow',
      bestAspects: ['variety'],
      areasForImprovement: ['equipment', 'space', 'timing'],
      comments: 'Equipment was not working properly. Several machines were out of order.',
      suggestions: 'Please fix the cable machine and add more weight plates.',
      energyAfterWorkout: 'low',
      likelyToReturn: 6,
      wouldRecommendTrainer: 'neutral',
      followUpRequired: true,
      flaggedForReview: true
    }
  ];

  // Calculate analytics
  const analytics = useMemo(() => {
    const today = new Date();
    const todayFeedback = feedbackResponses.filter(f => isToday(f.submittedAt));
    const weekFeedback = feedbackResponses.filter(f => f.submittedAt >= subDays(today, 7));
    
    const avgSatisfaction = feedbackResponses.length > 0 ? 
      feedbackResponses.reduce((sum, f) => sum + f.overallSatisfaction, 0) / feedbackResponses.length : 0;
    
    const recommendationRate = feedbackResponses.length > 0 ? 
      (feedbackResponses.filter(f => f.recommendWorkout === 'yes').length / feedbackResponses.length) * 100 : 0;
    
    const flaggedCount = feedbackResponses.filter(f => f.flaggedForReview).length;
    const followUpCount = feedbackResponses.filter(f => f.followUpRequired).length;
    
    const completedSessions = recentSessions.filter(s => s.status === 'completed').length;
    const responseRate = completedSessions > 0 ? (feedbackResponses.length / completedSessions) * 100 : 0;

    return {
      todayFeedback: todayFeedback.length,
      totalFeedback: feedbackResponses.length,
      avgSatisfaction,
      recommendationRate,
      responseRate,
      flaggedCount,
      followUpCount,
      completedSessions
    };
  }, [feedbackResponses, recentSessions]);

  // Get star rating component
  const StarRating = ({ rating, onRatingChange, size = 'md', readonly = false }: {
    rating: number;
    onRatingChange?: (rating: number) => void;
    size?: 'sm' | 'md' | 'lg';
    readonly?: boolean;
  }) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8'
    };

    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onRatingChange && onRatingChange(star)}
            className={cn(
              sizeClasses[size],
              "transition-colors",
              !readonly && "hover:scale-110 cursor-pointer",
              readonly && "cursor-default"
            )}
          >
            <Star
              className={cn(
                "w-full h-full",
                star <= rating 
                  ? "fill-yellow-400 text-yellow-400" 
                  : "fill-gray-200 text-gray-200"
              )}
            />
          </button>
        ))}
      </div>
    );
  };

  // Get satisfaction emoji
  const getSatisfactionEmoji = (rating: number) => {
    if (rating >= 4.5) return { emoji: '😊', color: 'text-green-600', bg: 'bg-green-100' };
    if (rating >= 3.5) return { emoji: '😐', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { emoji: '😔', color: 'text-red-600', bg: 'bg-red-100' };
  };

  // Handle form submission
  const handleSubmitFeedback = useCallback(async () => {
    if (!selectedSession) {
      toast.error('Please select a workout session');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    toast.success('Feedback submitted successfully! Thank you for your input.');
    
    // Reset form
    setCheckInForm({
      sessionId: '',
      overallSatisfaction: 5,
      workoutIntensity: 3,
      trainerRating: 5,
      equipmentQuality: 5,
      facilityRating: 5,
      recommendWorkout: 'yes',
      difficultyLevel: 'just-right',
      paceRating: 'just-right',
      bestAspects: [],
      areasForImprovement: [],
      comments: '',
      suggestions: '',
      energyAfterWorkout: 'high',
      likelyToReturn: 10,
      wouldRecommendTrainer: 'yes'
    });
    setSelectedSession(null);
  }, [selectedSession, checkInForm]);

  // Handle aspect selection
  const handleAspectToggle = useCallback((aspect: string, type: 'best' | 'improvement') => {
    setCheckInForm(prev => {
      const field = type === 'best' ? 'bestAspects' : 'areasForImprovement';
      const current = prev[field];
      
      if (current.includes(aspect)) {
        return {
          ...prev,
          [field]: current.filter(a => a !== aspect)
        };
      } else {
        return {
          ...prev,
          [field]: [...current, aspect]
        };
      }
    });
  }, []);

  // Filter feedback responses
  const filteredFeedback = useMemo(() => {
    let filtered = feedbackResponses.filter(feedback => {
      const matchesSearch = searchTerm === '' || 
        feedback.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.trainerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.className?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTrainer = filterTrainer === 'all' || feedback.trainerName === filterTrainer;
      const matchesWorkoutType = filterWorkoutType === 'all' || feedback.workoutType === filterWorkoutType;
      
      let matchesDateRange = true;
      const today = new Date();
      if (filterDateRange === 'today') {
        matchesDateRange = isToday(feedback.submittedAt);
      } else if (filterDateRange === 'week') {
        matchesDateRange = feedback.submittedAt >= subDays(today, 7);
      } else if (filterDateRange === 'month') {
        matchesDateRange = feedback.submittedAt >= subDays(today, 30);
      }
      
      return matchesSearch && matchesTrainer && matchesWorkoutType && matchesDateRange;
    });

    return filtered.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }, [feedbackResponses, searchTerm, filterTrainer, filterWorkoutType, filterDateRange]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Post-Workout Check-in</h1>
          <p className="text-muted-foreground mt-2">
            Capture member feedback and track satisfaction after workout sessions
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setShowMemberLookup(true)}>
            <Search className="mr-2 h-4 w-4" />
            Member Lookup
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Check-in
          </Button>
        </div>
      </div>

      {/* Analytics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Feedback</p>
                <p className="text-2xl font-bold">{analytics.todayFeedback}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Responses</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.totalFeedback}</p>
              </div>
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Satisfaction</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-green-600">{analytics.avgSatisfaction.toFixed(1)}</p>
                  <StarRating rating={analytics.avgSatisfaction} size="sm" readonly />
                </div>
              </div>
              <Star className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recommendation Rate</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.recommendationRate.toFixed(1)}%</p>
              </div>
              <ThumbsUp className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold text-indigo-600">{analytics.responseRate.toFixed(1)}%</p>
              </div>
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sessions Today</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.completedSessions}</p>
              </div>
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Follow-ups</p>
                <p className="text-2xl font-bold text-yellow-600">{analytics.followUpCount}</p>
              </div>
              <Bell className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Flagged</p>
                <p className="text-2xl font-bold text-red-600">{analytics.flaggedCount}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="check-in">Check-in Form</TabsTrigger>
          <TabsTrigger value="feedback">Recent Feedback</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="check-in" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Session Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Select Workout Session</CardTitle>
                <CardDescription>Choose a recent workout session to provide feedback</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentSessions.filter(s => s.status === 'completed').map((session) => (
                  <Card 
                    key={session.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedSession?.id === session.id ? "ring-2 ring-primary" : ""
                    )}
                    onClick={() => setSelectedSession(session)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Member Info */}
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {session.memberName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{session.memberName}</p>
                            <p className="text-sm text-muted-foreground">
                              {members.find(m => m.id === session.memberId)?.membershipId}
                            </p>
                          </div>
                        </div>

                        {/* Workout Details */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Workout Type</span>
                            <Badge variant="outline" className="capitalize">
                              {session.workoutType.replace('-', ' ')}
                            </Badge>
                          </div>
                          
                          {session.className && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Class</span>
                              <span className="text-sm font-medium">{session.className}</span>
                            </div>
                          )}
                          
                          {session.trainerName && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Trainer</span>
                              <span className="text-sm font-medium">{session.trainerName}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Duration</span>
                            <span className="text-sm font-medium">{session.duration} mins</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Time</span>
                            <span className="text-sm font-medium">
                              {format(session.startTime, 'HH:mm')}
                            </span>
                          </div>
                        </div>

                        {/* Workout Stats */}
                        {session.caloriesBurned && (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Calories</p>
                              <p className="font-medium text-orange-600">{session.caloriesBurned}</p>
                            </div>
                            {session.avgHeartRate && (
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground">Avg HR</p>
                                <p className="font-medium text-red-600">{session.avgHeartRate} bpm</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {/* Feedback Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Workout Feedback</CardTitle>
                <CardDescription>
                  {selectedSession 
                    ? `Providing feedback for ${selectedSession.memberName}'s ${selectedSession.workoutType.replace('-', ' ')} session`
                    : 'Please select a workout session to provide feedback'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedSession ? (
                  <>
                    {/* Rating Questions */}
                    <div className="space-y-6">
                      <div>
                        <Label className="text-base font-medium">Overall Satisfaction</Label>
                        <p className="text-sm text-muted-foreground mb-3">How satisfied was the member with their workout?</p>
                        <StarRating 
                          rating={checkInForm.overallSatisfaction} 
                          onRatingChange={(rating) => setCheckInForm(prev => ({ ...prev, overallSatisfaction: rating }))}
                          size="lg"
                        />
                      </div>

                      <div>
                        <Label className="text-base font-medium">Workout Intensity</Label>
                        <p className="text-sm text-muted-foreground mb-3">How intense was the workout? (1 = Too Easy, 5 = Very Challenging)</p>
                        <div className="space-y-2">
                          <Slider
                            value={[checkInForm.workoutIntensity]}
                            onValueChange={(value) => setCheckInForm(prev => ({ ...prev, workoutIntensity: value[0] }))}
                            max={5}
                            min={1}
                            step={1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Too Easy</span>
                            <span>Perfect</span>
                            <span>Very Hard</span>
                          </div>
                        </div>
                      </div>

                      {selectedSession.trainerName && (
                        <div>
                          <Label className="text-base font-medium">Trainer Rating</Label>
                          <p className="text-sm text-muted-foreground mb-3">Rate {selectedSession.trainerName}'s performance</p>
                          <StarRating 
                            rating={checkInForm.trainerRating} 
                            onRatingChange={(rating) => setCheckInForm(prev => ({ ...prev, trainerRating: rating }))}
                            size="lg"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-base font-medium">Equipment Quality</Label>
                          <p className="text-sm text-muted-foreground mb-3">Rate the equipment condition</p>
                          <StarRating 
                            rating={checkInForm.equipmentQuality} 
                            onRatingChange={(rating) => setCheckInForm(prev => ({ ...prev, equipmentQuality: rating }))}
                          />
                        </div>

                        <div>
                          <Label className="text-base font-medium">Facility Rating</Label>
                          <p className="text-sm text-muted-foreground mb-3">Rate the cleanliness and environment</p>
                          <StarRating 
                            rating={checkInForm.facilityRating} 
                            onRatingChange={(rating) => setCheckInForm(prev => ({ ...prev, facilityRating: rating }))}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Multiple Choice Questions */}
                    <div className="space-y-6">
                      <div>
                        <Label className="text-base font-medium">Would you recommend this workout?</Label>
                        <RadioGroup 
                          value={checkInForm.recommendWorkout} 
                          onValueChange={(value) => setCheckInForm(prev => ({ ...prev, recommendWorkout: value }))}
                          className="mt-3"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="recommend-yes" />
                            <Label htmlFor="recommend-yes">Yes, definitely</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="maybe" id="recommend-maybe" />
                            <Label htmlFor="recommend-maybe">Maybe, with improvements</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="recommend-no" />
                            <Label htmlFor="recommend-no">No, not recommended</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-base font-medium">Difficulty Level</Label>
                          <RadioGroup 
                            value={checkInForm.difficultyLevel} 
                            onValueChange={(value) => setCheckInForm(prev => ({ ...prev, difficultyLevel: value }))}
                            className="mt-3"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="too-easy" id="diff-easy" />
                              <Label htmlFor="diff-easy">Too Easy</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="just-right" id="diff-right" />
                              <Label htmlFor="diff-right">Just Right</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="too-hard" id="diff-hard" />
                              <Label htmlFor="diff-hard">Too Hard</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div>
                          <Label className="text-base font-medium">Pace Rating</Label>
                          <RadioGroup 
                            value={checkInForm.paceRating} 
                            onValueChange={(value) => setCheckInForm(prev => ({ ...prev, paceRating: value }))}
                            className="mt-3"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="too-slow" id="pace-slow" />
                              <Label htmlFor="pace-slow">Too Slow</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="just-right" id="pace-right" />
                              <Label htmlFor="pace-right">Just Right</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="too-fast" id="pace-fast" />
                              <Label htmlFor="pace-fast">Too Fast</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Categorical Feedback */}
                    <div className="space-y-6">
                      <div>
                        <Label className="text-base font-medium">What were the best aspects? (Select all that apply)</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                          {['music', 'energy', 'instruction', 'variety', 'challenge', 'community'].map((aspect) => (
                            <div key={aspect} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`best-${aspect}`}
                                checked={checkInForm.bestAspects.includes(aspect)}
                                onCheckedChange={() => handleAspectToggle(aspect, 'best')}
                              />
                              <Label htmlFor={`best-${aspect}`} className="capitalize">{aspect}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-base font-medium">Areas for improvement (Select all that apply)</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                          {['timing', 'equipment', 'space', 'temperature', 'noise', 'cleanliness'].map((aspect) => (
                            <div key={aspect} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`improve-${aspect}`}
                                checked={checkInForm.areasForImprovement.includes(aspect)}
                                onCheckedChange={() => handleAspectToggle(aspect, 'improvement')}
                              />
                              <Label htmlFor={`improve-${aspect}`} className="capitalize">{aspect}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Open-ended Questions */}
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="comments" className="text-base font-medium">Additional Comments</Label>
                        <p className="text-sm text-muted-foreground mb-3">Share any specific feedback about the workout</p>
                        <Textarea
                          id="comments"
                          placeholder="Tell us about your experience..."
                          value={checkInForm.comments}
                          onChange={(e) => setCheckInForm(prev => ({ ...prev, comments: e.target.value }))}
                          rows={4}
                        />
                      </div>

                      <div>
                        <Label htmlFor="suggestions" className="text-base font-medium">Suggestions for Improvement</Label>
                        <p className="text-sm text-muted-foreground mb-3">How can we make this workout better?</p>
                        <Textarea
                          id="suggestions"
                          placeholder="Your suggestions..."
                          value={checkInForm.suggestions}
                          onChange={(e) => setCheckInForm(prev => ({ ...prev, suggestions: e.target.value }))}
                          rows={3}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Additional Metrics */}
                    <div className="space-y-6">
                      <div>
                        <Label className="text-base font-medium">Energy Level After Workout</Label>
                        <RadioGroup 
                          value={checkInForm.energyAfterWorkout} 
                          onValueChange={(value) => setCheckInForm(prev => ({ ...prev, energyAfterWorkout: value }))}
                          className="mt-3"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="low" id="energy-low" />
                            <Label htmlFor="energy-low">Low - Feeling tired</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="medium" id="energy-medium" />
                            <Label htmlFor="energy-medium">Medium - Feeling good</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="high" id="energy-high" />
                            <Label htmlFor="energy-high">High - Feeling energized</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div>
                        <Label className="text-base font-medium">Likelihood to Return (1-10)</Label>
                        <p className="text-sm text-muted-foreground mb-3">How likely is the member to book this type of workout again?</p>
                        <div className="space-y-2">
                          <Slider
                            value={[checkInForm.likelyToReturn]}
                            onValueChange={(value) => setCheckInForm(prev => ({ ...prev, likelyToReturn: value[0] }))}
                            max={10}
                            min={1}
                            step={1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Very Unlikely</span>
                            <span className="font-medium text-lg">{checkInForm.likelyToReturn}</span>
                            <span>Very Likely</span>
                          </div>
                        </div>
                      </div>

                      {selectedSession.trainerName && (
                        <div>
                          <Label className="text-base font-medium">Would recommend this trainer?</Label>
                          <RadioGroup 
                            value={checkInForm.wouldRecommendTrainer} 
                            onValueChange={(value) => setCheckInForm(prev => ({ ...prev, wouldRecommendTrainer: value }))}
                            className="mt-3"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="trainer-yes" />
                              <Label htmlFor="trainer-yes">Yes, definitely</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="neutral" id="trainer-neutral" />
                              <Label htmlFor="trainer-neutral">Neutral</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="trainer-no" />
                              <Label htmlFor="trainer-no">No, wouldn't recommend</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Session Selected</h3>
                    <p className="text-muted-foreground">
                      Please select a completed workout session from the left panel to provide feedback
                    </p>
                  </div>
                )}
              </CardContent>
              
              {selectedSession && (
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => setSelectedSession(null)}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitFeedback} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Submit Feedback
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[250px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search feedback..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterTrainer} onValueChange={setFilterTrainer}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trainers</SelectItem>
                      <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                      <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
                      <SelectItem value="Emma Wilson">Emma Wilson</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterWorkoutType} onValueChange={setFilterWorkoutType}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Workout Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="personal-training">Personal Training</SelectItem>
                      <SelectItem value="group-class">Group Class</SelectItem>
                      <SelectItem value="strength">Strength Training</SelectItem>
                      <SelectItem value="cardio">Cardio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredFeedback.map((feedback) => {
              const satisfactionData = getSatisfactionEmoji(feedback.overallSatisfaction);
              
              return (
                <Card key={feedback.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedFeedback(feedback);
                        setShowFeedbackDetail(true);
                      }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xl", satisfactionData.bg)}>
                          {satisfactionData.emoji}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{feedback.memberName}</CardTitle>
                          <CardDescription>
                            {format(feedback.submittedAt, 'MMM dd, HH:mm')}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        {feedback.flaggedForReview && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Flagged
                          </Badge>
                        )}
                        {feedback.followUpRequired && (
                          <Badge variant="outline" className="text-xs">
                            <Bell className="h-3 w-3 mr-1" />
                            Follow-up
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Workout Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Workout</span>
                        <Badge variant="outline" className="capitalize">
                          {feedback.workoutType.replace('-', ' ')}
                        </Badge>
                      </div>
                      
                      {feedback.className && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Class</span>
                          <span className="font-medium">{feedback.className}</span>
                        </div>
                      )}
                      
                      {feedback.trainerName && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Trainer</span>
                          <span className="font-medium">{feedback.trainerName}</span>
                        </div>
                      )}
                    </div>

                    {/* Ratings */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Overall</span>
                        <StarRating rating={feedback.overallSatisfaction} size="sm" readonly />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Intensity</span>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div key={level} className={cn(
                              "w-3 h-3 rounded-full",
                              level <= feedback.workoutIntensity ? "bg-orange-400" : "bg-gray-200"
                            )} />
                          ))}
                        </div>
                      </div>
                      
                      {feedback.trainerRating > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Trainer</span>
                          <StarRating rating={feedback.trainerRating} size="sm" readonly />
                        </div>
                      )}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Recommend</p>
                        <p className={cn(
                          "font-medium text-sm",
                          feedback.recommendWorkout === 'yes' ? "text-green-600" :
                          feedback.recommendWorkout === 'no' ? "text-red-600" : "text-yellow-600"
                        )}>
                          {feedback.recommendWorkout === 'yes' ? 'Yes' : 
                           feedback.recommendWorkout === 'no' ? 'No' : 'Maybe'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Return</p>
                        <p className="font-medium text-sm text-blue-600">{feedback.likelyToReturn}/10</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Energy</p>
                        <p className={cn(
                          "font-medium text-sm capitalize",
                          feedback.energyAfterWorkout === 'high' ? "text-green-600" :
                          feedback.energyAfterWorkout === 'low' ? "text-red-600" : "text-yellow-600"
                        )}>
                          {feedback.energyAfterWorkout}
                        </p>
                      </div>
                    </div>

                    {/* Comments Preview */}
                    {feedback.comments && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          "{feedback.comments}"
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredFeedback.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Feedback Found</h3>
                <p className="text-muted-foreground">
                  No feedback responses match your current filters. Try adjusting your search criteria.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{feedbackResponses.length}</div>
                <p className="text-xs text-muted-foreground">+12% from last week</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.avgSatisfaction.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">+0.3 from last week</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Response Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.responseRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">+5.2% from last week</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Flagged Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.flaggedCount}</div>
                <p className="text-xs text-muted-foreground">-2 from last week</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Satisfaction Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['personal-training', 'group-class', 'strength', 'cardio'].map(type => {
                    const typeFeedback = feedbackResponses.filter(f => f.workoutType === type);
                    const avgSatisfaction = typeFeedback.length > 0 ? 
                      typeFeedback.reduce((sum, f) => sum + f.overallSatisfaction, 0) / typeFeedback.length : 0;
                    
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium capitalize">{type.replace('-', ' ')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <StarRating rating={avgSatisfaction} size="sm" readonly />
                          <span className="text-sm text-muted-foreground">
                            ({typeFeedback.length})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common Feedback Themes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Most Appreciated Aspects</h4>
                    <div className="space-y-2">
                      {['instruction', 'energy', 'challenge', 'music', 'variety'].map(aspect => {
                        const count = feedbackResponses.filter(f => f.bestAspects.includes(aspect)).length;
                        const percentage = feedbackResponses.length > 0 ? (count / feedbackResponses.length) * 100 : 0;
                        
                        return (
                          <div key={aspect} className="flex items-center justify-between">
                            <span className="capitalize">{aspect}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Areas for Improvement</h4>
                    <div className="space-y-2">
                      {['equipment', 'temperature', 'timing', 'space', 'noise'].map(aspect => {
                        const count = feedbackResponses.filter(f => f.areasForImprovement.includes(aspect)).length;
                        const percentage = feedbackResponses.length > 0 ? (count / feedbackResponses.length) * 100 : 0;
                        
                        return (
                          <div key={aspect} className="flex items-center justify-between">
                            <span className="capitalize">{aspect}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-red-500 h-2 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active & Recent Sessions</CardTitle>
              <CardDescription>Monitor ongoing and recently completed workout sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Workout Type</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessions.map((session) => {
                    const hasFeedback = feedbackResponses.some(f => f.sessionId === session.id);
                    
                    return (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {session.memberName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{session.memberName}</p>
                              <p className="text-sm text-muted-foreground">
                                {members.find(m => m.id === session.memberId)?.membershipId}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline" className="capitalize">
                              {session.workoutType.replace('-', ' ')}
                            </Badge>
                            {session.className && (
                              <p className="text-sm text-muted-foreground mt-1">{session.className}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{session.trainerName || 'Self-guided'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{format(session.startTime, 'HH:mm')}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{session.duration} mins</span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={cn(
                              session.status === 'completed' ? 'bg-green-100 text-green-800' :
                              session.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            )}
                          >
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {session.status === 'completed' ? (
                            hasFeedback ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {session.status === 'completed' && !hasFeedback && (
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedSession(session);
                                  setActiveTab('check-in');
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Feedback
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feedback Detail Sheet */}
      <Sheet open={showFeedbackDetail} onOpenChange={setShowFeedbackDetail}>
        <SheetContent className="w-full sm:w-[600px] sm:max-w-none overflow-y-auto">
          {selectedFeedback && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getSatisfactionEmoji(selectedFeedback.overallSatisfaction).emoji}
                    <h3 className="text-xl font-bold">{selectedFeedback.memberName}</h3>
                  </div>
                  <Badge className={cn(
                    selectedFeedback.overallSatisfaction >= 4 ? 'bg-green-100 text-green-800' :
                    selectedFeedback.overallSatisfaction >= 3 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  )}>
                    {selectedFeedback.overallSatisfaction}/5 Stars
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  Feedback submitted on {format(selectedFeedback.submittedAt, 'PPP')} at {format(selectedFeedback.submittedAt, 'HH:mm')}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Workout Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Workout Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Workout Type</Label>
                        <p className="font-medium capitalize">{selectedFeedback.workoutType.replace('-', ' ')}</p>
                      </div>
                      {selectedFeedback.className && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Class Name</Label>
                          <p className="font-medium">{selectedFeedback.className}</p>
                        </div>
                      )}
                      {selectedFeedback.trainerName && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Trainer</Label>
                          <p className="font-medium">{selectedFeedback.trainerName}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Ratings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ratings & Scores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Overall Satisfaction</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <StarRating rating={selectedFeedback.overallSatisfaction} size="sm" readonly />
                          <span className="font-medium">{selectedFeedback.overallSatisfaction}/5</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">Workout Intensity</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div key={level} className={cn(
                                "w-4 h-4 rounded-full",
                                level <= selectedFeedback.workoutIntensity ? "bg-orange-400" : "bg-gray-200"
                              )} />
                            ))}
                          </div>
                          <span className="font-medium">{selectedFeedback.workoutIntensity}/5</span>
                        </div>
                      </div>
                      
                      {selectedFeedback.trainerRating > 0 && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Trainer Rating</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <StarRating rating={selectedFeedback.trainerRating} size="sm" readonly />
                            <span className="font-medium">{selectedFeedback.trainerRating}/5</span>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">Equipment Quality</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <StarRating rating={selectedFeedback.equipmentQuality} size="sm" readonly />
                          <span className="font-medium">{selectedFeedback.equipmentQuality}/5</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">Facility Rating</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <StarRating rating={selectedFeedback.facilityRating} size="sm" readonly />
                          <span className="font-medium">{selectedFeedback.facilityRating}/5</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">Likelihood to Return</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Progress value={selectedFeedback.likelyToReturn * 10} className="flex-1" />
                          <span className="font-medium">{selectedFeedback.likelyToReturn}/10</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Multiple Choice Responses */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Experience Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Recommend Workout</Label>
                        <Badge className={cn(
                          "mt-1",
                          selectedFeedback.recommendWorkout === 'yes' ? 'bg-green-100 text-green-800' :
                          selectedFeedback.recommendWorkout === 'no' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        )}>
                          {selectedFeedback.recommendWorkout === 'yes' ? 'Yes' : 
                           selectedFeedback.recommendWorkout === 'no' ? 'No' : 'Maybe'}
                        </Badge>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">Difficulty Level</Label>
                        <Badge className={cn(
                          "mt-1 capitalize",
                          selectedFeedback.difficultyLevel === 'just-right' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        )}>
                          {selectedFeedback.difficultyLevel.replace('-', ' ')}
                        </Badge>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">Pace Rating</Label>
                        <Badge className={cn(
                          "mt-1 capitalize",
                          selectedFeedback.paceRating === 'just-right' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        )}>
                          {selectedFeedback.paceRating.replace('-', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Energy After Workout</Label>
                      <Badge className={cn(
                        "mt-1 capitalize",
                        selectedFeedback.energyAfterWorkout === 'high' ? 'bg-green-100 text-green-800' :
                        selectedFeedback.energyAfterWorkout === 'low' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      )}>
                        {selectedFeedback.energyAfterWorkout}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Feedback Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Feedback Categories</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Best Aspects</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedFeedback.bestAspects.map(aspect => (
                          <Badge key={aspect} className="bg-green-100 text-green-800 capitalize">
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            {aspect}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Areas for Improvement</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedFeedback.areasForImprovement.map(aspect => (
                          <Badge key={aspect} variant="outline" className="text-red-600 capitalize">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {aspect}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Comments & Suggestions */}
                {(selectedFeedback.comments || selectedFeedback.suggestions) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Comments & Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedFeedback.comments && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Comments</Label>
                          <p className="mt-1 p-3 bg-muted/50 rounded-lg text-sm">
                            "{selectedFeedback.comments}"
                          </p>
                        </div>
                      )}
                      
                      {selectedFeedback.suggestions && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Suggestions</Label>
                          <p className="mt-1 p-3 bg-blue-50 rounded-lg text-sm">
                            "{selectedFeedback.suggestions}"
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Staff Notes & Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Staff Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedFeedback.trainerNotes && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Trainer Notes</Label>
                        <p className="mt-1 p-3 bg-purple-50 rounded-lg text-sm">
                          {selectedFeedback.trainerNotes}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm text-muted-foreground">Follow-up Required</Label>
                        <Badge className={selectedFeedback.followUpRequired ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}>
                          {selectedFeedback.followUpRequired ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm text-muted-foreground">Flagged for Review</Label>
                        <Badge className={selectedFeedback.flaggedForReview ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                          {selectedFeedback.flaggedForReview ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm">
                        <Edit className="mr-2 h-4 w-4" />
                        Add Notes
                      </Button>
                      <Button size="sm" variant="outline">
                        <Bell className="mr-2 h-4 w-4" />
                        Schedule Follow-up
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share className="mr-2 h-4 w-4" />
                        Share with Trainer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Member Lookup Dialog */}
      <Dialog open={showMemberLookup} onOpenChange={setShowMemberLookup}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Member Lookup</DialogTitle>
            <DialogDescription>
              Search for a member to view their workout history and initiate feedback
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, membership ID, email, or phone..."
                className="pl-10"
              />
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {members.map((member) => (
                <Card key={member.id} className="cursor-pointer hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{member.name}</h4>
                          <Badge className={cn(
                            member.membershipStatus === 'active' ? 'bg-green-100 text-green-800' :
                            member.membershipStatus === 'expired' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          )}>
                            {member.membershipStatus}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-muted-foreground">
                          <span>ID: {member.membershipId}</span>
                          <span>Plan: {member.membershipPlan}</span>
                          <span>Workouts: {member.totalWorkouts}</span>
                          <span>Streak: {member.currentStreak} days</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMemberLookup(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

