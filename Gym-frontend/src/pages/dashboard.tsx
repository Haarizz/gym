import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import { 
  dashboardService, 
  type KPIData, 
  type RevenueDataPoint, 
  type MembershipDistribution, 
  type ClassAttendance, 
  type Member, 
  type Notification, 
  type StaffMember 
} from "../utils/supabase/dashboard-service";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';
import { 
  Search,
  UserPlus,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Calendar,
  DollarSign,
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Bell,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Award,
  Target,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Phone,
  Mail,
  MapPin,
  Star,
  Zap,
  Crown,
  Gift,
  Calendar as CalendarIcon,
  Heart,
  Dumbbell,
  Coffee,
  Brain,
  Settings,
  ChevronRight,
  AlertCircle,
  Info,
  XCircle,
  ExternalLink,
  Building,
  UserX,
  Timer,
  Gauge
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isYesterday } from 'date-fns';

// Types
interface QuickAction {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  onClick: () => void;
}

// Interface for navigation with params
interface NavigationHandler {
  (section: string, params?: Record<string, any>): void;
}

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  membershipType: string;
  joinDate: Date;
  avatar?: string;
  status: 'active' | 'expired' | 'suspended';
}

interface Notification {
  id: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: 'available' | 'busy' | 'offline';
  clockedIn: boolean;
  avatar?: string;
}

interface DashboardProps {
  onNavigate?: (section: string, params?: Record<string, any>) => void;
}

export function Dashboard({ onNavigate }: DashboardProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [showMemberResults, setShowMemberResults] = useState(false);
  const dashboardCardShell = "border-0 shadow-md hover:shadow-lg transition-shadow";
  const dashboardSurfaceShell = "bg-card rounded-xl shadow-md";
  const dashboardHeaderActionButton =
    "border-0 bg-white text-slate-700 shadow-sm hover:bg-red-50 hover:text-red-600";
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data states
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [membershipDistribution, setMembershipDistribution] = useState<MembershipDistribution[]>([]);
  const [classAttendanceData, setClassAttendanceData] = useState<ClassAttendance[]>([]);
  const [recentMembers, setRecentMembers] = useState<Member[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const attendanceByType = [
    { type: 'Morning (6-10 AM)', members: 85, percentage: 34 },
    { type: 'Afternoon (12-4 PM)', members: 65, percentage: 26 },
    { type: 'Evening (6-10 PM)', members: 100, percentage: 40 }
  ];

  // Load initial dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [
        kpiResponse,
        revenueResponse,
        membershipResponse,
        classAttendanceResponse,
        recentMembersResponse,
        notificationsResponse,
        staffResponse
      ] = await Promise.all([
        dashboardService.getKPIs(dateFilter),
        dashboardService.getRevenueData(dateFilter),
        dashboardService.getMembershipDistribution(),
        dashboardService.getClassAttendance(),
        dashboardService.getRecentMembers(),
        dashboardService.getNotifications(),
        dashboardService.getStaffMembers()
      ]);

      if (kpiResponse.success) {
        setKpiData(kpiResponse.data);
      } else {
        console.error('KPI data error:', kpiResponse.error);
      }
      
      if (revenueResponse.success) {
        setRevenueData(revenueResponse.data);
      } else {
        console.error('Revenue data error:', revenueResponse.error);
      }
      
      if (membershipResponse.success) {
        setMembershipDistribution(membershipResponse.data);
      } else {
        console.error('Membership distribution error:', membershipResponse.error);
      }
      
      if (classAttendanceResponse.success) {
        setClassAttendanceData(classAttendanceResponse.data);
      } else {
        console.error('Class attendance error:', classAttendanceResponse.error);
      }
      
      if (recentMembersResponse.success) {
        setRecentMembers(recentMembersResponse.data);
      } else {
        console.error('Recent members error:', recentMembersResponse.error);
      }
      
      if (notificationsResponse.success) {
        setNotifications(notificationsResponse.data);
      } else {
        console.error('Notifications error:', notificationsResponse.error);
      }
      
      if (staffResponse.success) {
        setStaffMembers(staffResponse.data);
      } else {
        console.error('Staff data error:', staffResponse.error);
      }

      // Show success message only if some data was loaded successfully
      const hasAnyData = kpiResponse.success || revenueResponse.success || 
                        membershipResponse.success || classAttendanceResponse.success ||
                        recentMembersResponse.success || notificationsResponse.success ||
                        staffResponse.success;

      if (!hasAnyData) {
        toast.error('Failed to load dashboard data. Please check your connection and try again.');
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter]);

  // Health check function
  const checkServerHealth = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      const healthResponse = await dashboardService.healthCheck();
      if (healthResponse.success || healthResponse.status === 'ok') {
        console.log('Server connection successful');
        setConnectionStatus('connected');
        return true;
      } else {
        console.error('Server health check failed:', healthResponse);
        setConnectionStatus('disconnected');
        return false;
      }
    } catch (error) {
      console.error('Server health check error:', error);
      setConnectionStatus('disconnected');
      toast.error('Unable to connect to server. Please check your connection.');
      return false;
    }
  }, []);

  // Load data on component mount and when date filter changes
  useEffect(() => {
    const initializeDashboard = async () => {
      const isServerHealthy = await checkServerHealth();
      if (isServerHealthy) {
        loadDashboardData();
      } else {
        setIsLoading(false);
        toast.error('Server is not responding. Please try refreshing the page.');
      }
    };

    initializeDashboard();
  }, [loadDashboardData, checkServerHealth]);

  // Refresh dashboard data
  const refreshData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const isServerHealthy = await checkServerHealth();
      
      if (isServerHealthy) {
        await loadDashboardData();
        toast.success('Dashboard data refreshed successfully');
      } else {
        toast.error('Unable to connect to server. Please check your connection.');
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh dashboard data');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadDashboardData, checkServerHealth]);

  // Handle member selection from search
  const handleMemberSelect = useCallback((member: Member) => {
    if (onNavigate) {
      onNavigate('member-history-analytics', { memberId: member.id });
      toast.success(`Opening analytics for ${member.name}`, {
        description: 'View complete member history and analytics',
        duration: 2000,
      });
    }
    // Close search results
    setShowMemberResults(false);
    setSearchTerm('');
  }, [onNavigate]);

  // Handle Enter key press in search
  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      // Navigate to first search result
      handleMemberSelect(searchResults[0]);
    }
  }, [searchResults, handleMemberSelect]);

  // Quick Actions with GymBios gradient theme
  const quickActions: QuickAction[] = [
    {
      id: 'add-member',
      title: 'Add Member',
      icon: UserPlus,
      description: 'Register new member',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300',
      onClick: () => {
        if (onNavigate) {
          onNavigate('add-member');
          toast.success('Navigating to Add Member form', {
            description: 'Register a new gym member',
            duration: 2000,
          });
        }
      }
    },
    {
      id: 'member-receipt',
      title: 'Member Receipt',
      icon: Receipt,
      description: 'Generate receipt',
      color: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300',
      onClick: () => {
        if (onNavigate) {
          onNavigate('members', { tab: 'receipts' });
          toast.success('Opening Member Receipts', {
            description: 'View and generate member receipts',
            duration: 2000,
          });
        }
      }
    },
    {
      id: 'renew-upgrade',
      title: 'Renew / Upgrade',
      icon: RotateCcw,
      description: 'Member renewals',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300',
      onClick: () => {
        if (onNavigate) {
          onNavigate('members', { tab: 'renewals' });
          toast.success('Opening Renewals & Upgrades', {
            description: 'Manage membership renewals and upgrades',
            duration: 2000,
          });
        }
      }
    },
    {
      id: 'pos',
      title: 'POS',
      icon: ShoppingCart,
      description: 'Point of Sale',
      color: 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all duration-300',
      onClick: () => {
        if (onNavigate) {
          onNavigate('point-of-sale');
          toast.success('Opening Point of Sale', {
            description: 'Process sales and transactions',
            duration: 2000,
          });
        }
      }
    },
    {
      id: 'schedule-class',
      title: 'Schedule Class',
      icon: Calendar,
      description: 'Create class schedule',
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300',
      onClick: () => {
        if (onNavigate) {
          onNavigate('trainings-classes');
          toast.success('Opening Class Scheduler', {
            description: 'Create and manage class schedules',
            duration: 2000,
          });
        }
      }
    }
  ];

  // Search members function
  const searchMembers = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setShowMemberResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await dashboardService.searchMembers(term);
      
      if (response.success) {
        setSearchResults(response.data || []);
        setShowMemberResults(true);
      } else {
        setSearchResults([]);
        setShowMemberResults(false);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setShowMemberResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchMembers(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchMembers]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowMemberResults(false);
      }
    };

    if (showMemberResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMemberResults]);

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.dataKey.includes('revenue') || entry.dataKey.includes('amount') 
                ? `AED ${entry.value.toLocaleString()}` 
                : entry.value.toLocaleString()
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get notification icon and color
  const getNotificationStyle = (type?: string | null) => {
    if (!type) {
      return { icon: Bell, color: 'text-gray-500 bg-gray-50 dark:bg-gray-950/20' };
    }
    
    switch (type) {
      case 'alert':
        return { icon: AlertTriangle, color: 'text-red-500 bg-red-50 dark:bg-red-950/20' };
      case 'warning':
        return { icon: AlertCircle, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' };
      case 'info':
        return { icon: Info, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' };
      case 'success':
        return { icon: CheckCircle, color: 'text-green-500 bg-green-50 dark:bg-green-950/20' };
      default:
        return { icon: Bell, color: 'text-gray-500 bg-gray-50 dark:bg-gray-950/20' };
    }
  };

  // Get membership type badge color
  const getMembershipBadgeColor = (type?: string | null) => {
    if (!type) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-950/20 dark:text-gray-400';
    }
    
    switch (type.toLowerCase()) {
      case 'basic':
        return 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400';
      case 'premium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400';
      case 'vip':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-400';
      case 'corporate':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950/20 dark:text-gray-400';
    }
  };

  // Safe date parsing and formatting helpers
  const safeParseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    
    try {
      const date = new Date(dateValue);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch (error) {
      console.warn('Invalid date value:', dateValue, error);
      return null;
    }
  };

  const formatSafeDate = (dateValue: any): string => {
    const date = safeParseDate(dateValue);
    if (!date) return 'N/A';
    
    try {
      if (isToday(date)) return 'Today';
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'MMM dd');
    } catch (error) {
      console.warn('Date formatting error:', dateValue, error);
      return 'N/A';
    }
  };

  const formatJoinDate = (dateValue: any): string => {
    const date = safeParseDate(dateValue);
    if (!date) return 'recently';
    
    try {
      if (isToday(date)) return 'today';
      if (isYesterday(date)) return 'yesterday';
      return format(date, 'MMM dd');
    } catch (error) {
      console.warn('Join date formatting error:', dateValue, error);
      return 'recently';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Section with Global Search */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your business overview.</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Connection Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                connectionStatus === 'connected' ? "bg-green-500" :
                connectionStatus === 'connecting' ? "bg-yellow-500 animate-pulse" : "bg-red-500"
              )} />
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">This Day</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className={dashboardHeaderActionButton}
              onClick={refreshData}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline" className={dashboardHeaderActionButton}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" className={dashboardHeaderActionButton}>
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {/* Global Member Search */}
        <div className="relative max-w-2xl search-container">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by member name, ID, contact number, QR, or facial recognition ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            onKeyPress={handleSearchKeyPress}
            className="pl-10 h-12 text-base"
            disabled={isSearching}
          />
          
          {/* Search Loading Indicator */}
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {/* Search Results Dropdown */}
          {showMemberResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              <div className="p-2 bg-gradient-light border-b border-primary/10 text-xs text-gray-600 flex items-center justify-between">
                <span>Found {searchResults.length} member{searchResults.length > 1 ? 's' : ''}</span>
                <span className="text-primary flex items-center">
                  <Eye className="h-3 w-3 mr-1" />
                  Click to view analytics · Press Enter for first result
                </span>
              </div>
              {searchResults.map((member) => (
                <div 
                  key={member.id} 
                  className="p-3 hover:bg-gradient-light border-b border-gray-100 last:border-b-0 cursor-pointer flex items-center space-x-3 transition-all duration-200 group"
                  onClick={() => handleMemberSelect(member)}
                >
                  <Avatar className="h-10 w-10 border-2 border-primary/20 group-hover:border-primary/40">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-gradient-light text-primary">
                      {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate group-hover:text-primary transition-colors">{member.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={getMembershipBadgeColor(member.membershipType)}>
                      {member.membershipType}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{member.phone}</p>
                  </div>
                  <Eye className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                </div>
              ))}
            </div>
          )}

          {/* No Results Message */}
          {showMemberResults && searchResults.length === 0 && searchTerm.trim() && !isSearching && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground">
              No members found matching "{searchTerm}"
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Tabs */}
      <div className={cn(dashboardSurfaceShell, "p-6")}>
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              onClick={action.onClick}
              className={cn(
                "h-auto p-4 flex flex-col items-center space-y-2 text-white",
                action.color
              )}
            >
              <action.icon className="h-6 w-6" />
              <div className="text-center">
                <p className="font-medium text-sm">{action.title}</p>
                <p className="text-xs opacity-90">{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={dashboardCardShell}>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : kpiData ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Revenue {dateFilter === 'today' ? 'Today' : 
                                   dateFilter === 'week' ? 'This Week' :
                                   dateFilter === 'month' ? 'This Month' : 'Last Month'}
                  </p>
                  <p className="text-3xl font-bold">AED {kpiData.revenue.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    {kpiData.revenueChange >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      kpiData.revenueChange >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {kpiData.revenueChange >= 0 ? '+' : ''}{kpiData.revenueChange}%
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">vs previous period</span>
                  </div>
                </div>
                <div className="bg-green-100 dark:bg-green-950/20 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">Failed to load data</div>
            )}
          </CardContent>
        </Card>

        <Card className={dashboardCardShell}>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : kpiData ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Members</p>
                  <p className="text-3xl font-bold">{kpiData.activeMembers}</p>
                  <div className="flex items-center mt-2">
                    {kpiData.membersChange >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      kpiData.membersChange >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {kpiData.membersChange >= 0 ? '+' : ''}{kpiData.membersChange}%
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">valid memberships</span>
                  </div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-950/20 p-3 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">Failed to load data</div>
            )}
          </CardContent>
        </Card>

        <Card className={dashboardCardShell}>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : kpiData ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {dateFilter === 'today' ? "Today's Attendance" : 
                     dateFilter === 'week' ? "Week Attendance" :
                     dateFilter === 'month' ? "Month Attendance" : "Last Month Attendance"}
                  </p>
                  <p className="text-3xl font-bold">{kpiData.todayAttendance}</p>
                  <div className="flex items-center mt-2">
                    {kpiData.attendanceChange >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      kpiData.attendanceChange >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {kpiData.attendanceChange >= 0 ? '+' : ''}{kpiData.attendanceChange}%
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">members checked in</span>
                  </div>
                </div>
                <div className="bg-purple-100 dark:bg-purple-950/20 p-3 rounded-full">
                  <UserCheck className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">Failed to load data</div>
            )}
          </CardContent>
        </Card>

        <Card className={dashboardCardShell}>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : kpiData ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Staff (Live)</p>
                  <p className="text-3xl font-bold">{kpiData.availableStaff}</p>
                  <div className="flex items-center mt-2">
                    <Clock className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-sm text-muted-foreground">
                      {staffMembers.filter(s => s.clockedIn).length} clocked in
                    </span>
                  </div>
                </div>
                <div className="bg-indigo-100 dark:bg-indigo-950/20 p-3 rounded-full">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">Failed to load data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle Section - Data Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Revenue Overview */}
        <Card className={dashboardCardShell}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Revenue Overview</span>
              <Badge variant="outline">{dateFilter}</Badge>
            </CardTitle>
            <CardDescription>
              {dateFilter === 'today' ? 'Hourly revenue tracking for today' :
               dateFilter === 'week' ? 'Daily revenue for this week' :
               dateFilter === 'month' ? 'Weekly revenue for this month' : 'Previous month performance'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-[300px]" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={dateFilter === 'today' ? 'time' : dateFilter === 'week' ? 'day' : 'week'} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.1}
                    strokeWidth={3}
                    name="Revenue (AED)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="target" 
                    stroke="#10b981" 
                    fill="transparent"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    name="Target (AED)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Right Side - Membership Distribution */}
        <Card className={dashboardCardShell}>
          <CardHeader>
            <CardTitle>Membership Distribution</CardTitle>
            <CardDescription>Breakdown by membership tier and revenue contribution</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="w-full h-[200px]" />
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={membershipDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(membershipDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-3">
                  {(membershipDistribution || []).map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{item.value} members</p>
                        <p className="text-xs text-muted-foreground">AED {item.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Class Attendance Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Attendance Rates */}
        <Card className={dashboardCardShell}>
          <CardHeader>
            <CardTitle>Class Attendance Rates</CardTitle>
            <CardDescription>Attendance percentage by class type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(classAttendanceData || []).map((item) => (
                  <div key={item.class} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.class}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.attended}/{item.capacity} ({item.percentage}%)
                      </span>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance by Time */}
        <Card className={dashboardCardShell}>
          <CardHeader>
            <CardTitle>Attendance by Time Slot</CardTitle>
            <CardDescription>Member distribution throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-[250px]" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={attendanceByType || []} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="members" fill="#8b5cf6" name="Members" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Activity & Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members */}
        <Card className={dashboardCardShell}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Members</span>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </CardTitle>
            <CardDescription>Newly joined members with profile information</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(recentMembers || []).map((member) => {
                  // Add safety check for member object
                  if (!member || !member.id || !member.name) {
                    return null;
                  }
                  
                  // Ensure membershipType exists for badge rendering
                  const membershipType = member.membershipType || member.membership_type || 'Basic';
                  
                  return (
                <div key={member.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted cursor-pointer">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>
                      {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{member.name}</p>
                      <Badge className={getMembershipBadgeColor(membershipType)}>
                        {membershipType}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-muted-foreground">{member.phone}</span>
                      <span className="text-xs text-muted-foreground">
                        Joined {formatJoinDate(member.joinDate || member.join_date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="ghost">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications Panel */}
        <Card className={dashboardCardShell}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Notifications</span>
              <div className="flex items-center space-x-2">
                <Badge variant="destructive" className="text-xs">
                  {(notifications || []).filter(n => n && !n.isRead).length} new
                </Badge>
                <Button variant="ghost" size="sm">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
            <CardDescription>System alerts, reminders, and important updates</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3 p-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(notifications || []).slice(0, 5).map((notification) => {
                  // Add safety check for notification object
                  if (!notification || !notification.id || !notification.title) {
                    return null;
                  }
                  
                  // Ensure we have a valid notification type
                  const notificationType = notification.type || 'info';
                  
                  const style = getNotificationStyle(notificationType);
                  const IconComponent = style.icon;
                  
                  return (
                    <div 
                      key={notification.id} 
                      className={cn(
                        "flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
                        !notification.isRead ? "bg-muted/50" : "hover:bg-muted/50"
                      )}
                    >
                      <div className={cn("p-2 rounded-full", style.color)}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{notification.title}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatSafeDate(notification.timestamp || notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        {notification.actionUrl && (
                          <Button variant="link" size="sm" className="p-0 h-auto mt-2">
                            <span className="text-xs">Take Action</span>
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            <Separator className="my-4" />
            
            <Button variant="outline" className="w-full">
              <Bell className="h-4 w-4 mr-2" />
              View All Notifications
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Staff Status Panel */}
      <Card className={dashboardCardShell}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Staff Status (Live)</span>
            <div className="flex items-center space-x-2">
              {isLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <Badge variant="outline">
                  {(staffMembers || []).filter(s => s && s.clockedIn).length} of {(staffMembers || []).length} available
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={refreshData} disabled={isRefreshing}>
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>Real-time staff availability and status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 rounded-lg bg-card p-3 shadow-sm">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {(staffMembers || []).map((staff) => {
                // Add safety check for staff object
                if (!staff || !staff.id || !staff.name) {
                  return null;
                }
                
                return (
                <div key={staff.id} className="flex items-center space-x-3 rounded-lg bg-card p-3 shadow-sm">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={staff.avatar} />
                      <AvatarFallback>
                        {staff.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                      staff.status === 'available' ? "bg-green-500" :
                      staff.status === 'busy' ? "bg-yellow-500" : "bg-gray-400"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{staff.name}</p>
                    <p className="text-xs text-muted-foreground">{staff.role}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        staff.clockedIn ? "bg-green-500" : "bg-red-500"
                      )} />
                      <span className="text-xs text-muted-foreground">
                        {staff.clockedIn ? 'Clocked In' : 'Clocked Out'}
                      </span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

