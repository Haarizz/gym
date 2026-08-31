import React, { useState, useMemo, useEffect } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
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
  Plus,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, subMonths } from "date-fns";
import { authService } from "../utils/supabase/auth-service";
import { staffService, Staff, StaffTarget } from "../utils/supabase/staff-service";

interface MyProfileProps {
  onNavigate?: (section: string) => void;
}

interface EditableProfileFields {
  name: string;
  email: string;
  phone: string;
  address: string;
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

// Trial Data — achievements/transactions are not yet backed by real
// endpoints, so these stay illustrative until those modules are wired up.
// Targets/performance are now driven by the real /api/staff-targets data (see myTargets below).
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

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function targetLabel(t: StaffTarget): string {
  const timeframeLabel = t.timeframe ? t.timeframe.charAt(0).toUpperCase() + t.timeframe.slice(1) : "Revenue";
  const period = t.month ? `${MONTH_NAMES[t.month - 1]} ${t.year}` : `${t.year || ""}`;
  const prefix = t.scope === 'institution' ? 'Institution-wide' : timeframeLabel;
  return `${prefix} Target${period ? ` — ${period}` : ''}`;
}

function targetStatus(t: StaffTarget): 'active' | 'completed' | 'overdue' {
  if ((t.percentage ?? 0) >= 100) return 'completed';
  if (t.end_date && new Date(t.end_date) < new Date()) return 'overdue';
  return 'active';
}

export function MyProfile({ onNavigate }: MyProfileProps) {
  const { currencyCode } = useCurrency();
  const authUser = useMemo(() => authService.getCurrentUser(), []);

  const [activeTab, setActiveTab] = useState("personal");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [staffProfile, setStaffProfile] = useState<Staff | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<EditableProfileFields>({
    name: "", email: "", phone: "", address: ""
  });

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (authUser?.id) {
      const savedPhoto = localStorage.getItem(`gymbios_photo_${authUser.id}`);
      if (savedPhoto) setLocalPhoto(savedPhoto);
    }
  }, [authUser]);

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    sms: false,
    performance: true,
    targets: true,
    payroll: true
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      try {
        const profile = await staffService.getMyProfile();
        if (!cancelled) setStaffProfile(profile);
      } catch (error) {
        console.error("Failed to load staff profile:", error);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const [myTargets, setMyTargets] = useState<StaffTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  useEffect(() => {
    if (!staffProfile?.id) { setMyTargets([]); return; }
    let cancelled = false;
    (async () => {
      setLoadingTargets(true);
      try {
        const targets = await staffService.getTargets(undefined, undefined, undefined, Number(staffProfile.id));
        if (!cancelled) setMyTargets(targets);
      } catch (error) {
        console.error("Failed to load targets:", error);
      } finally {
        if (!cancelled) setLoadingTargets(false);
      }
    })();
    return () => { cancelled = true; };
  }, [staffProfile?.id]);

  const targetsSummary = useMemo(() => {
    const total = myTargets.length;
    const completed = myTargets.filter(t => (t.percentage ?? 0) >= 100).length;
    const active = total - completed;
    const avgPerformance = total > 0
      ? Math.round(myTargets.reduce((sum, t) => sum + (t.percentage ?? 0), 0) / total)
      : 0;
    const revenueAchieved = myTargets.reduce((sum, t) => sum + (Number(t.revenue_achieved) || 0), 0);
    const revenueTarget = myTargets.reduce((sum, t) => sum + (Number(t.revenue_target) || 0), 0);
    const sessionsAchieved = myTargets.reduce((sum, t) => sum + (Number(t.sessions_achieved) || 0), 0);
    const newClientsAchieved = myTargets.reduce((sum, t) => sum + (Number(t.new_clients_achieved) || 0), 0);
    return { total, completed, active, avgPerformance, revenueAchieved, revenueTarget, sessionsAchieved, newClientsAchieved };
  }, [myTargets]);

  // Real identity fields — staff record wins when linked, falls back to the account.
  const displayName = staffProfile?.name || authUser?.name || "User";
  const displayEmail = staffProfile?.email || authUser?.email || "";
  const displayPhone = staffProfile?.phone || "";
  const displayAddress = staffProfile?.address || "";
  const displayRole = staffProfile?.role || (authUser?.role ? authUser.role.replace(/^\w/, c => c.toUpperCase()) : "");
  const displayDepartment = staffProfile?.department || "";
  const displayEmployeeId = staffProfile?.staff_id || "";
  const displayJoinDate = staffProfile?.join_date ? new Date(staffProfile.join_date) : null;
  const displayPhoto = staffProfile?.photo_url || localPhoto || "";
  const displayInitials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // Calculate progress percentages
  const targetsProgress = targetsSummary.total > 0 ? (targetsSummary.completed / targetsSummary.total) * 100 : 0;
  const performanceColor = targetsSummary.avgPerformance >= 90 ? 'text-green-600' :
                          targetsSummary.avgPerformance >= 75 ? 'text-yellow-600' : 'text-red-600';
  // Attendance isn't backed by a real endpoint yet — stays illustrative until that module is wired up.
  const attendanceRate = 98;

  const startEditing = () => {
    setEditedProfile({
      name: displayName,
      email: displayEmail,
      phone: displayPhone,
      address: displayAddress
    });
    setIsEditing(true);
  };

  const saveProfile = async () => {
    if (!staffProfile) return;
    if (!editedProfile.name.trim() || !editedProfile.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await staffService.updateStaff(staffProfile.id, {
        name: editedProfile.name.trim(),
        email: editedProfile.email.trim(),
        phone: editedProfile.phone.trim(),
        address: editedProfile.address.trim()
      });
      setStaffProfile(updated);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword) {
      toast.error("Enter your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters!");
      return;
    }

    setChangingPassword(true);
    const result = await authService.changePassword(currentPassword, newPassword);
    setChangingPassword(false);

    if (result.success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully!");
    } else {
      toast.error(result.error || "Failed to change password.");
    }
  };

  const resizeImageToDataUrl = (file: File, size = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read the selected file."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Failed to load the selected image."));
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas is not supported in this browser.")); return; }
          const scale = Math.max(size / img.width, size / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 400);
      if (staffProfile) {
        const updated = await staffService.updateStaff(staffProfile.id, { photo_url: dataUrl });
        setStaffProfile(updated);
      } else if (authUser?.id) {
        localStorage.setItem(`gymbios_photo_${authUser.id}`, dataUrl);
        setLocalPhoto(dataUrl);
        window.dispatchEvent(new Event('profile_photo_updated'));
      }
      setAvatarDialogOpen(false);
      toast.success("Profile picture updated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile picture.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    window.location.href = "/";
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

  const panelCardShell = "bg-white border-0 shadow-sm";
  const tabContentShell = "space-y-6 animate-in fade-in-0 zoom-in-95 duration-200";

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">
            Manage your personal information, targets, performance, and account settings
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="shadow-sm hover:shadow-md transition-all"
            onClick={() => onNavigate?.('settings')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="shadow-sm hover:shadow-md transition-all"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile & Stats Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card className={panelCardShell}>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="relative inline-block">
                  <Avatar className="w-24 h-24 border-4 border-primary/20">
                    {displayPhoto && <AvatarImage src={displayPhoto} alt={displayName} />}
                    <AvatarFallback className="bg-gradient-primary text-white text-2xl">
                      {displayInitials}
                    </AvatarFallback>
                  </Avatar>
                  <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0 bg-gradient-primary"
                        title="Update profile picture"
                      >
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
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarFileChange}
                        />
                        <div
                          className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center cursor-pointer hover:bg-gradient-light transition-colors"
                          onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                        >
                          {uploadingPhoto ? (
                            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                          ) : (
                            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          )}
                          <p className="text-sm text-gray-600">
                            {uploadingPhoto ? "Uploading..." : "Click to upload a photo"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => setAvatarDialogOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div>
                  {loadingProfile ? (
                    <div className="flex justify-center py-1">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold capitalize">{displayName}</h3>
                      {displayRole && <p className="text-primary font-medium">{displayRole}</p>}
                      {displayDepartment && <p className="text-sm text-gray-600">{displayDepartment}</p>}
                      {!staffProfile && (
                        <Badge className="mt-2 bg-gradient-light text-primary border-primary/20">
                          {(authUser?.role || "User").replace(/^\w/, c => c.toUpperCase())} Account
                        </Badge>
                      )}
                    </>
                  )}
                </div>

                {staffProfile && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Employee ID</div>
                      <div className="font-medium">{displayEmployeeId || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Join Date</div>
                      <div className="font-medium">{displayJoinDate ? format(displayJoinDate, 'MMM yyyy') : '—'}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className={panelCardShell}>
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
                    {targetsSummary.avgPerformance}%
                  </span>
                </div>
                <Progress value={targetsSummary.avgPerformance} className="h-2" />
              </div>

              {/* Targets Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Targets Progress</span>
                  <span className="text-sm font-bold text-primary">
                    {targetsSummary.completed}/{targetsSummary.total}
                  </span>
                </div>
                <Progress value={targetsProgress} className="h-2" />
              </div>

              {/* Attendance Rate */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Attendance Rate</span>
                  <span className="text-sm font-bold text-green-600">
                    {attendanceRate}%
                  </span>
                </div>
                <Progress value={attendanceRate} className="h-2" />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{targetsSummary.sessionsAchieved}</div>
                  <div className="text-xs text-gray-600">Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{targetsSummary.newClientsAchieved}</div>
                  <div className="text-xs text-gray-600">New Clients</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card className={panelCardShell}>
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal">
                <User className="h-4 w-4 mr-2" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="performance">
                <Activity className="h-4 w-4 mr-2" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="targets">
                <Target className="h-4 w-4 mr-2" />
                Targets
              </TabsTrigger>
              <TabsTrigger value="transactions">
                <CreditCard className="h-4 w-4 mr-2" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className={tabContentShell}>
              <Card className={panelCardShell}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-primary">Personal Information</CardTitle>
                    {staffProfile && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingProfile}
                        onClick={() => isEditing ? saveProfile() : startEditing()}
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : isEditing ? (
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
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!loadingProfile && !staffProfile && (
                    <div className="flex items-start space-x-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        No staff record is linked to this account, so name/phone/address 
                        aren't editable here. You can still change your profile picture and password below.
                      </span>
                    </div>
                  )}
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
                        <div className="p-3 bg-gradient-light rounded-lg capitalize">{displayName}</div>
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
                          {displayEmail || '—'}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="form-label">Phone Number</Label>
                      {isEditing ? (
                        <Input
                          value={editedProfile.phone}
                          onChange={(e) => { const v = e.target.value; if (/^[\d+\-\s()]*$/.test(v)) setEditedProfile({...editedProfile, phone: v}); }}
                          className="input-focus"
                        />
                      ) : (
                        <div className="p-3 bg-gradient-light rounded-lg flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-primary" />
                          {displayPhone || '—'}
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
                          {displayAddress || '—'}
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex space-x-3">
                      <Button
                        className="btn-primary"
                        onClick={saveProfile}
                        disabled={savingProfile}
                      >
                        {savingProfile ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        disabled={savingProfile}
                        onClick={() => setIsEditing(false)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle className="text-primary flex items-center space-x-2">
                    <Lock className="h-5 w-5" />
                    <span>Change Password</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="form-label">Current Password</Label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="input-focus"
                    />
                  </div>
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
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {changingPassword ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    Change Password
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className={tabContentShell}>
              {/* Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-0 shadow-sm overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-primary opacity-95"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <div className="text-3xl font-bold mb-1">{targetsSummary.avgPerformance}%</div>
                        <div className="text-white/90 font-medium">Performance Score</div>
                      </div>
                      <TrendingUp className="h-8 w-8 text-white/80" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-primary opacity-95"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <div className="text-3xl font-bold mb-1"><CurrencyGlyph /> {targetsSummary.revenueAchieved.toLocaleString()}</div>
                        <div className="text-white/90 font-medium">Revenue Achieved</div>
                      </div>
                      <CircleDollarSign className="h-8 w-8 text-white/80" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-primary opacity-95"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <div className="text-3xl font-bold mb-1">{targetsSummary.sessionsAchieved}</div>
                        <div className="text-white/90 font-medium">Sessions Completed</div>
                      </div>
                      <Dumbbell className="h-8 w-8 text-white/80" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-primary opacity-95"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <div className="text-3xl font-bold mb-1">{targetsSummary.newClientsAchieved}</div>
                        <div className="text-white/90 font-medium">New Clients Acquired</div>
                      </div>
                      <Users className="h-8 w-8 text-white/80" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Charts */}
              <Card className={panelCardShell}>
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

              {/* Target Achievement Breakdown */}
              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle className="text-primary">Target Achievement Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-gradient-light rounded-lg">
                      <div className="text-2xl font-bold text-primary mb-2">
                        {targetsSummary.revenueTarget > 0 ? Math.round((targetsSummary.revenueAchieved / targetsSummary.revenueTarget) * 100) : 0}%
                      </div>
                      <div className="text-sm font-medium">Revenue Target Achieved</div>
                      <div className="text-xs text-gray-600">
                        <CurrencyGlyph /> {targetsSummary.revenueAchieved.toLocaleString()} of <CurrencyGlyph /> {targetsSummary.revenueTarget.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-center p-4 bg-gradient-light rounded-lg">
                      <div className="text-2xl font-bold text-primary mb-2">
                        {targetsSummary.completed}/{targetsSummary.total}
                      </div>
                      <div className="text-sm font-medium">Targets Completed</div>
                      <div className="text-xs text-gray-600">across all assigned periods</div>
                    </div>

                    <div className="text-center p-4 bg-gradient-light rounded-lg">
                      <div className="text-2xl font-bold text-primary mb-2">{targetsSummary.sessionsAchieved}</div>
                      <div className="text-sm font-medium">Sessions Logged</div>
                      <div className="text-xs text-gray-600">against target sessions</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Targets Tab */}
            <TabsContent value="targets" className={tabContentShell}>
              {/* Current Targets */}
              <Card className={panelCardShell}>
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
                  {loadingTargets ? (
                    <div className="flex items-center justify-center py-10 text-gray-500">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Loading targets...
                    </div>
                  ) : myTargets.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      <Target className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                      No targets assigned yet. Your admin hasn't set any targets for you.
                    </div>
                  ) : (
                    myTargets.map((target) => {
                      const status = targetStatus(target);
                      return (
                        <div key={target.id} className="p-4 bg-gradient-light rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="bg-gradient-primary text-white rounded-full p-2">
                                <Target className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium">{targetLabel(target)}</div>
                                <div className="text-sm text-gray-600">
                                  <CurrencyGlyph /> {Number(target.revenue_achieved || 0).toLocaleString()} of <CurrencyGlyph /> {Number(target.revenue_target || 0).toLocaleString()} revenue
                                  {target.sessions_target ? ` · ${target.sessions_achieved || 0}/${target.sessions_target} sessions` : ''}
                                  {target.new_clients_target ? ` · ${target.new_clients_achieved || 0}/${target.new_clients_target} new clients` : ''}
                                </div>
                              </div>
                            </div>
                            <Badge className={`${
                              status === 'completed' ? 'bg-green-100 text-green-800' :
                              status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {status}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Revenue progress</span>
                              <span className="font-medium">{target.percentage ?? 0}%</span>
                            </div>
                            <Progress value={Math.min(target.percentage ?? 0, 100)} className="h-2" />
                            <div className="text-xs text-gray-600">
                              {target.end_date
                                ? `Deadline: ${format(new Date(target.end_date), 'MMM dd, yyyy')}`
                                : `Period: ${target.month ? `${MONTH_NAMES[target.month - 1]} ${target.year}` : target.year}`}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Targets Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className={panelCardShell}>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">{targetsSummary.active}</div>
                    <div className="text-sm text-gray-600">Active Targets</div>
                  </CardContent>
                </Card>

                <Card className={panelCardShell}>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">{targetsSummary.completed}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </CardContent>
                </Card>

                <Card className={panelCardShell}>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">{Math.round(targetsProgress)}%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className={tabContentShell}>
              {/* Recent Transactions */}
              <Card className={panelCardShell}>
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
                              <CurrencyGlyph /> {transaction.amount.toLocaleString()}
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
                <Card className={panelCardShell}>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">4,785</div>
                    <div className="text-sm text-gray-600">Total Earnings ({currencyCode})</div>
                    <div className="text-xs text-green-600">This month</div>
                  </CardContent>
                </Card>
                
                <Card className={panelCardShell}>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">156</div>
                    <div className="text-sm text-gray-600">Transactions</div>
                    <div className="text-xs text-blue-600">This month</div>
                  </CardContent>
                </Card>
                
                <Card className={panelCardShell}>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">89</div>
                    <div className="text-sm text-gray-600">Purchases</div>
                    <div className="text-xs text-purple-600">This month</div>
                  </CardContent>
                </Card>
                
                <Card className={panelCardShell}>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600 mb-1">2</div>
                    <div className="text-sm text-gray-600">Bonuses</div>
                    <div className="text-xs text-yellow-600">This month</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className={tabContentShell}>
              {/* Notification Preferences */}
              <Card className={panelCardShell}>
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
              <Card className={panelCardShell}>
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
                        <div className="text-sm text-gray-600">{displayEmail || '—'}</div>
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
              <Card className={panelCardShell}>
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

