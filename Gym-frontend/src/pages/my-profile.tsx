import React, { useState, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import { Switch } from "../components/ui/switch";
import { 
  User, 
  Settings, 
  Bell, 
  LogOut, 
  Camera, 
  Edit3, 
  Save, 
  X, 
  Target, 
  TrendingUp, 
  Award, 
  Calendar, 
  CreditCard, 
  Download, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Smartphone, 
  Link, 
  Clock, 
  BarChart3, 
  Activity, 
  Zap, 
  CheckCircle, 
  Star, 
  Trophy, 
  Flame, 
  Heart, 
  CircleDollarSign, 
  Calendar as CalendarIcon,
  FileText,
  Info,
  Users,
  Dumbbell,
  Timer,
  BookOpen,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, subMonths } from "date-fns";

interface MyProfileProps {
  onNavigate?: (section: string) => void;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  role: string;
  department: string;
  joinDate: Date;
  membershipLevel: string;
  employeeId: string;
}

interface UserStats {
  currentTargets: number;
  completedTargets: number;
  totalTargets: number;
  performanceScore: number;
  attendanceRate: number;
  classesCompleted: number;
  hoursWorked: number;
  clientsSatisfaction: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedDate: Date;
  category: 'performance' | 'attendance' | 'targets' | 'special';
}

interface Transaction {
  id: string;
  type: 'salary' | 'bonus' | 'purchase' | 'attendance';
  description: string;
  amount?: number;
  date: Date;
  status: 'completed' | 'pending' | 'failed';
}

interface Target {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unit: string;
  deadline: Date;
  status: 'active' | 'completed' | 'overdue';
  category: string;
}

// Trial Data
const userProfile: UserProfile = {
  id: "U001",
  name: "Ahmed Al-Mahmoud",
  email: "ahmed.mahmoud@gymbios.com",
  phone: "+971 50 123 4567",
  address: "Downtown Dubai, UAE",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  role: "Senior Personal Trainer",
  department: "Training Department",
  joinDate: new Date(2023, 2, 15),
  membershipLevel: "Premium Staff",
  employeeId: "EMP001"
};

const userStats: UserStats = {
  currentTargets: 8,
  completedTargets: 24,
  totalTargets: 32,
  performanceScore: 94,
  attendanceRate: 98,
  classesCompleted: 156,
  hoursWorked: 340,
  clientsSatisfaction: 96
};

const achievements: Achievement[] = [
  {
    id: "A001",
    title: "Top Performer",
    description: "Achieved 95%+ performance score for 3 consecutive months",
    icon: "trophy",
    earnedDate: new Date(2024, 9, 15),
    category: 'performance'
  },
  {
    id: "A002",
    title: "Perfect Attendance",
    description: "100% attendance for the entire quarter",
    icon: "calendar",
    earnedDate: new Date(2024, 8, 30),
    category: 'attendance'
  },
  {
    id: "A003",
    title: "Target Achiever",
    description: "Completed all assigned targets ahead of schedule",
    icon: "target",
    earnedDate: new Date(2024, 7, 20),
    category: 'targets'
  },
  {
    id: "A004",
    title: "Client Favorite",
    description: "Received 50+ five-star reviews from clients",
    icon: "heart",
    earnedDate: new Date(2024, 6, 10),
    category: 'special'
  }
];

const recentTransactions: Transaction[] = [
  {
    id: "T001",
    type: 'salary',
    description: "October 2024 Salary",
    amount: 4285,
    date: new Date(2024, 9, 30),
    status: 'completed'
  },
  {
    id: "T002",
    type: 'bonus',
    description: "Performance Bonus Q3",
    amount: 500,
    date: new Date(2024, 8, 31),
    status: 'completed'
  },
  {
    id: "T003",
    type: 'attendance',
    description: "Morning Shift - October 30",
    date: new Date(2024, 9, 30),
    status: 'completed'
  },
  {
    id: "T004",
    type: 'purchase',
    description: "Staff Meal - Cafeteria",
    amount: 25,
    date: new Date(2024, 9, 29),
    status: 'completed'
  }
];

const currentTargets: Target[] = [
  {
    id: "TG001",
    title: "Monthly Client Sessions",
    description: "Complete 80 personal training sessions",
    progress: 72,
    target: 80,
    unit: "sessions",
    deadline: new Date(2024, 10, 30),
    status: 'active',
    category: 'Performance'
  },
  {
    id: "TG002",
    title: "Client Satisfaction",
    description: "Maintain 95%+ satisfaction rating",
    progress: 96,
    target: 95,
    unit: "%",
    deadline: new Date(2024, 10, 30),
    status: 'completed',
    category: 'Quality'
  },
  {
    id: "TG003",
    title: "New Client Acquisition",
    description: "Onboard 5 new premium clients",
    progress: 3,
    target: 5,
    unit: "clients",
    deadline: new Date(2024, 10, 30),
    status: 'active',
    category: 'Growth'
  }
];

export function MyProfile({ onNavigate }: MyProfileProps) {
  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(userProfile);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    sms: false,
    performance: true,
    targets: true,
    payroll: true
  });

  // Calculate progress percentages
  const targetsProgress = (userStats.completedTargets / userStats.totalTargets) * 100;
  const performanceColor = userStats.performanceScore >= 90 ? 'text-green-600' : 
                          userStats.performanceScore >= 75 ? 'text-yellow-600' : 'text-red-600';

  const saveProfile = () => {
    // Simulate API call
    setTimeout(() => {
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    }, 1000);
  };

  const changePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters!");
      return;
    }

    // Simulate API call
    setTimeout(() => {
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully!");
    }, 1000);
  };

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'trophy': return <Trophy className="h-5 w-5" />;
      case 'calendar': return <CalendarIcon className="h-5 w-5" />;
      case 'target': return <Target className="h-5 w-5" />;
      case 'heart': return <Heart className="h-5 w-5" />;
      default: return <Award className="h-5 w-5" />;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'salary': return <CircleDollarSign className="h-5 w-5 text-green-600" />;
      case 'bonus': return <Star className="h-5 w-5 text-yellow-600" />;
      case 'attendance': return <Clock className="h-5 w-5 text-blue-600" />;
      case 'purchase': return <CreditCard className="h-5 w-5 text-purple-600" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal information, targets, performance, and account settings
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile & Stats Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card className="border-primary/10">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="relative inline-block">
                  <Avatar className="w-24 h-24 border-4 border-primary/20">
                    <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
                    <AvatarFallback className="bg-gradient-primary text-white text-2xl">
                      {userProfile.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0 bg-gradient-primary">
                        <Camera className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Profile Picture</DialogTitle>
                        <DialogDescription>
                          Upload a new profile picture. Recommended size: 400x400px
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center">
                          <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                        <div className="flex space-x-3">
                          <Button className="btn-primary flex-1">Upload Photo</Button>
                          <Button variant="outline" className="flex-1">Cancel</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold">{userProfile.name}</h3>
                  <p className="text-primary font-medium">{userProfile.role}</p>
                  <p className="text-sm text-gray-600">{userProfile.department}</p>
                  <Badge className="mt-2 bg-gradient-light text-primary border-primary/20">
                    {userProfile.membershipLevel}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Employee ID</div>
                    <div className="font-medium">{userProfile.employeeId}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Join Date</div>
                    <div className="font-medium">{format(userProfile.joinDate, 'MMM yyyy')}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-primary flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Quick Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Performance Score */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Performance Score</span>
                  <span className={`text-sm font-bold ${performanceColor}`}>
                    {userStats.performanceScore}%
                  </span>
                </div>
                <Progress value={userStats.performanceScore} className="h-2" />
              </div>

              {/* Targets Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Targets Progress</span>
                  <span className="text-sm font-bold text-primary">
                    {userStats.completedTargets}/{userStats.totalTargets}
                  </span>
                </div>
                <Progress value={targetsProgress} className="h-2" />
              </div>

              {/* Attendance Rate */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Attendance Rate</span>
                  <span className="text-sm font-bold text-green-600">
                    {userStats.attendanceRate}%
                  </span>
                </div>
                <Progress value={userStats.attendanceRate} className="h-2" />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{userStats.classesCompleted}</div>
                  <div className="text-xs text-gray-600">Classes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{userStats.hoursWorked}</div>
                  <div className="text-xs text-gray-600">Hours</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-primary flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Recent Achievements</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {achievements.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-gradient-light rounded-lg">
                  <div className="bg-gradient-primary text-white rounded-full p-2">
                    {getAchievementIcon(achievement.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{achievement.title}</div>
                    <div className="text-xs text-gray-600 truncate">{achievement.description}</div>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => onNavigate?.('achievements')}
              >
                View All Achievements
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Detailed Sections */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border border-primary/10 grid grid-cols-5">
              <TabsTrigger value="personal" className="data-[state=active]:bg-gradient-light data-[state=active]:text-primary">
                <User className="h-4 w-4 mr-2" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="performance" className="data-[state=active]:bg-gradient-light data-[state=active]:text-primary">
                <Activity className="h-4 w-4 mr-2" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="targets" className="data-[state=active]:bg-gradient-light data-[state=active]:text-primary">
                <Target className="h-4 w-4 mr-2" />
                Targets
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-gradient-light data-[state=active]:text-primary">
                <CreditCard className="h-4 w-4 mr-2" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-gradient-light data-[state=active]:text-primary">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-6">
              <Card className="border-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-primary">Personal Information</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => isEditing ? saveProfile() : setIsEditing(true)}
                    >
                      {isEditing ? (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      ) : (
                        <>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="form-label">Full Name</Label>
                      {isEditing ? (
                        <Input 
                          value={editedProfile.name}
                          onChange={(e) => setEditedProfile({...editedProfile, name: e.target.value})}
                          className="input-focus"
                        />
                      ) : (
                        <div className="p-3 bg-gradient-light rounded-lg">{userProfile.name}</div>
                      )}
                    </div>
                    
                    <div>
                      <Label className="form-label">Email Address</Label>
                      {isEditing ? (
                        <Input 
                          type="email"
                          value={editedProfile.email}
                          onChange={(e) => setEditedProfile({...editedProfile, email: e.target.value})}
                          className="input-focus"
                        />
                      ) : (
                        <div className="p-3 bg-gradient-light rounded-lg flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-primary" />
                          {userProfile.email}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label className="form-label">Phone Number</Label>
                      {isEditing ? (
                        <Input 
                          value={editedProfile.phone}
                          onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
                          className="input-focus"
                        />
                      ) : (
                        <div className="p-3 bg-gradient-light rounded-lg flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-primary" />
                          {userProfile.phone}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label className="form-label">Address</Label>
                      {isEditing ? (
                        <Input 
                          value={editedProfile.address}
                          onChange={(e) => setEditedProfile({...editedProfile, address: e.target.value})}
                          className="input-focus"
                        />
                      ) : (
                        <div className="p-3 bg-gradient-light rounded-lg flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-primary" />
                          {userProfile.address}
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex space-x-3">
                      <Button 
                        className="btn-primary"
                        onClick={saveProfile}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditedProfile(userProfile);
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center space-x-2">
                    <Lock className="h-5 w-5" />
                    <span>Change Password</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="form-label">New Password</Label>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="input-focus pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="form-label">Confirm Password</Label>
                      <Input 
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="input-focus"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    className="btn-primary"
                    onClick={changePassword}
                    disabled={!newPassword || !confirmPassword}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              {/* Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-primary/10 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-primary opacity-95"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <div className="text-3xl font-bold mb-1">{userStats.performanceScore}%</div>
                        <div className="text-white/90 font-medium">Performance Score</div>
                      </div>
                      <TrendingUp className="h-8 w-8 text-white/80" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/10 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-primary opacity-95"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <div className="text-3xl font-bold mb-1">{userStats.classesCompleted}</div>
                        <div className="text-white/90 font-medium">Classes Completed</div>
                      </div>
                      <Dumbbell className="h-8 w-8 text-white/80" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/10 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-primary opacity-95"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <div className="text-3xl font-bold mb-1">{userStats.hoursWorked}</div>
                        <div className="text-white/90 font-medium">Hours Worked</div>
                      </div>
                      <Timer className="h-8 w-8 text-white/80" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/10 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-primary opacity-95"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <div className="text-3xl font-bold mb-1">{userStats.clientsSatisfaction}%</div>
                        <div className="text-white/90 font-medium">Client Satisfaction</div>
                      </div>
                      <Heart className="h-8 w-8 text-white/80" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Charts */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="text-primary">Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gradient-light rounded-lg">
                    <div className="text-center">
                      <PieChart className="h-16 w-16 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-primary mb-2">Performance Analytics</h3>
                      <p className="text-gray-600">Detailed performance charts and trends coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* KPIs */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="text-primary">Key Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-gradient-light rounded-lg">
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        <ArrowUpRight className="h-6 w-6 inline mr-1" />
                        +12%
                      </div>
                      <div className="text-sm font-medium">Performance Growth</div>
                      <div className="text-xs text-gray-600">vs last month</div>
                    </div>
                    
                    <div className="text-center p-4 bg-gradient-light rounded-lg">
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        <ArrowUpRight className="h-6 w-6 inline mr-1" />
                        +8%
                      </div>
                      <div className="text-sm font-medium">Client Retention</div>
                      <div className="text-xs text-gray-600">vs last quarter</div>
                    </div>
                    
                    <div className="text-center p-4 bg-gradient-light rounded-lg">
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        <ArrowUpRight className="h-6 w-6 inline mr-1" />
                        +15%
                      </div>
                      <div className="text-sm font-medium">Session Quality</div>
                      <div className="text-xs text-gray-600">avg rating improvement</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Targets Tab */}
            <TabsContent value="targets" className="space-y-6">
              {/* Current Targets */}
              <Card className="border-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-primary">Current Targets</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onNavigate?.('my-targets')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentTargets.map((target) => (
                    <div key={target.id} className="p-4 bg-gradient-light rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="bg-gradient-primary text-white rounded-full p-2">
                            <Target className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{target.title}</div>
                            <div className="text-sm text-gray-600">{target.description}</div>
                          </div>
                        </div>
                        <Badge className={`${
                          target.status === 'completed' ? 'bg-green-100 text-green-800' :
                          target.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {target.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress: {target.progress} / {target.target} {target.unit}</span>
                          <span className="font-medium">
                            {Math.round((target.progress / target.target) * 100)}%
                          </span>
                        </div>
                        <Progress value={(target.progress / target.target) * 100} className="h-2" />
                        <div className="text-xs text-gray-600">
                          Deadline: {format(target.deadline, 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Targets Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-primary/10">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">{userStats.currentTargets}</div>
                    <div className="text-sm text-gray-600">Active Targets</div>
                  </CardContent>
                </Card>
                
                <Card className="border-primary/10">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">{userStats.completedTargets}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </CardContent>
                </Card>
                
                <Card className="border-primary/10">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">{Math.round(targetsProgress)}%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-6">
              {/* Recent Transactions */}
              <Card className="border-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-primary">Recent Transactions</CardTitle>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-gradient-light rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <div className="font-medium">{transaction.description}</div>
                            <div className="text-sm text-gray-600">
                              {format(transaction.date, 'MMM dd, yyyy • HH:mm')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {transaction.amount && (
                            <div className={`font-semibold ${
                              transaction.type === 'purchase' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {transaction.type === 'purchase' ? '-' : '+'}
                              {transaction.amount.toLocaleString()} AED
                            </div>
                          )}
                          <Badge className={`text-xs ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-primary/10">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">4,785</div>
                    <div className="text-sm text-gray-600">Total Earnings (AED)</div>
                    <div className="text-xs text-green-600">This month</div>
                  </CardContent>
                </Card>
                
                <Card className="border-primary/10">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">156</div>
                    <div className="text-sm text-gray-600">Transactions</div>
                    <div className="text-xs text-blue-600">This month</div>
                  </CardContent>
                </Card>
                
                <Card className="border-primary/10">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">89</div>
                    <div className="text-sm text-gray-600">Purchases</div>
                    <div className="text-xs text-purple-600">This month</div>
                  </CardContent>
                </Card>
                
                <Card className="border-primary/10">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600 mb-1">2</div>
                    <div className="text-sm text-gray-600">Bonuses</div>
                    <div className="text-xs text-yellow-600">This month</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              {/* Notification Preferences */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>Notification Preferences</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Email Notifications</div>
                        <div className="text-sm text-gray-600">Receive notifications via email</div>
                      </div>
                      <Switch 
                        checked={notificationSettings.email}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, email: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Push Notifications</div>
                        <div className="text-sm text-gray-600">Receive push notifications on your device</div>
                      </div>
                      <Switch 
                        checked={notificationSettings.push}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, push: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">SMS Notifications</div>
                        <div className="text-sm text-gray-600">Receive notifications via SMS</div>
                      </div>
                      <Switch 
                        checked={notificationSettings.sms}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, sms: checked }))
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium text-primary">Notification Categories</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Performance Updates</div>
                        <div className="text-sm text-gray-600">Updates about your performance metrics</div>
                      </div>
                      <Switch 
                        checked={notificationSettings.performance}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, performance: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Target Reminders</div>
                        <div className="text-sm text-gray-600">Reminders about upcoming target deadlines</div>
                      </div>
                      <Switch 
                        checked={notificationSettings.targets}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, targets: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Payroll Notifications</div>
                        <div className="text-sm text-gray-600">Updates about salary and payment processing</div>
                      </div>
                      <Switch 
                        checked={notificationSettings.payroll}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, payroll: checked }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Linked Accounts */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center space-x-2">
                    <Link className="h-5 w-5" />
                    <span>Linked Accounts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-light rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Email Account</div>
                        <div className="text-sm text-gray-600">{userProfile.email}</div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-light rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Mobile Device</div>
                        <div className="text-sm text-gray-600">iPhone 15 Pro</div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-light rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Bank Account</div>
                        <div className="text-sm text-gray-600">ADCB ****1234</div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Privacy Settings */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Privacy Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Profile Visibility</div>
                      <div className="text-sm text-gray-600">Allow others to view your profile</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Performance Visibility</div>
                      <div className="text-sm text-gray-600">Show performance metrics to managers</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Activity Status</div>
                      <div className="text-sm text-gray-600">Show when you're online or active</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

