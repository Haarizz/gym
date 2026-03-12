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
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Phone, 
  Mail, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Target, 
  CheckCircle, 
  Clock, 
  XCircle, 
  User, 
  Bell, 
  AlertTriangle, 
  RefreshCw, 
  MoreHorizontal, 
  Download, 
  Upload, 
  Settings, 
  BarChart3, 
  PieChart, 
  Activity, 
  AlertCircle, 
  Zap, 
  ArrowRight, 
  ArrowLeft, 
  ChevronDown, 
  SortAsc, 
  SortDesc, 
  Layers, 
  List, 
  Grid, 
  ExternalLink, 
  Copy, 
  Trash2, 
  Archive, 
  Tags, 
  FileText, 
  Paperclip, 
  UserPlus2, 
  ShieldCheck,
  DollarSign,
  TrendingDown,
  Smartphone,
  Chrome,
  MousePointer,
  Building,
  Send,
  Star,
  Flag,
  History,
  Calendar as CalendarIconOutline,
  Timer,
  PlayCircle,
  PauseCircle,
  StopCircle,
  SkipForward,
  Check,
  X,
  Pencil,
  PhoneCall,
  MessageCircle,
  AtSign,
  Slack,
  Headphones,
  UserCheck2,
  Calendar as CalendarAlt,
  CalendarDays,
  CalendarCheck,
  CalendarX,
  CalendarClock
} from 'lucide-react';
import { toast } from "sonner";
import { format, addDays, isAfter, isBefore, isToday, isTomorrow, isYesterday, addWeeks, subDays } from "date-fns";
import { cn } from "../components/ui/utils";
import { Automations } from "./automations";

interface FollowUp {
  id: string;
  memberName: string;
  memberEmail: string;
  memberPhone: string;
  memberAvatar?: string;
  type: 'call' | 'email' | 'sms' | 'whatsapp' | 'in-app' | 'meeting' | 'visit';
  status: 'pending' | 'completed' | 'overdue' | 'cancelled' | 'rescheduled';
  priority: 'high' | 'medium' | 'low';
  assignedStaff: string;
  assignedStaffAvatar?: string;
  dueDate: Date;
  scheduledTime?: string;
  completedDate?: Date;
  createdDate: Date;
  subject: string;
  notes: string;
  tags: string[];
  membershipStatus: 'active' | 'pending' | 'expired' | 'frozen' | 'cancelled';
  membershipPlan?: string;
  lastVisit?: Date;
  nextBillingDate?: Date;
  communicationHistory: CommunicationRecord[];
  outcome?: 'successful' | 'no-response' | 'callback-requested' | 'not-interested' | 'converted' | 'rescheduled';
  followUpReason: string;
  estimatedDuration?: number; // in minutes
}

interface CommunicationRecord {
  id: string;
  type: 'call' | 'email' | 'sms' | 'whatsapp' | 'in-app' | 'meeting' | 'visit';
  date: Date;
  staffMember: string;
  duration?: number;
  outcome: 'successful' | 'no-response' | 'callback-requested' | 'not-interested' | 'converted' | 'rescheduled';
  notes: string;
  nextAction?: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  activeFollowUps: number;
  completedToday: number;
  successRate: number;
}

export function FollowUps() {
  const [activeTab, setActiveTab] = useState('all');
  const [activeView, setActiveView] = useState<'table' | 'kanban'>('table');
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const [showFollowUpDetail, setShowFollowUpDetail] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedFollowUps, setSelectedFollowUps] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof FollowUp>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completingFollowUp, setCompletingFollowUp] = useState<FollowUp | null>(null);

  // Sample data - in real app this would come from your backend
  const staffMembers: Staff[] = [
    { id: '1', name: 'Sarah Johnson', role: 'Sales Manager', activeFollowUps: 12, completedToday: 8, successRate: 85 },
    { id: '2', name: 'Ahmed Hassan', role: 'Membership Consultant', activeFollowUps: 15, completedToday: 6, successRate: 78 },
    { id: '3', name: 'Maria Rodriguez', role: 'Lead Specialist', activeFollowUps: 18, completedToday: 10, successRate: 92 },
    { id: '4', name: 'David Wilson', role: 'Customer Success', activeFollowUps: 9, completedToday: 5, successRate: 75 }
  ];

  const followUps: FollowUp[] = [
    {
      id: '1',
      memberName: 'John Smith',
      memberEmail: 'john.smith@email.com',
      memberPhone: '+971 50 123 4567',
      type: 'call',
      status: 'overdue',
      priority: 'high',
      assignedStaff: 'Sarah Johnson',
      dueDate: subDays(new Date(), 1),
      scheduledTime: '14:00',
      createdDate: subDays(new Date(), 3),
      subject: 'Follow up on membership renewal',
      notes: 'Member is interested in upgrading to premium plan. Schedule call to discuss pricing.',
      tags: ['renewal', 'upgrade', 'premium'],
      membershipStatus: 'active',
      membershipPlan: 'Standard Monthly',
      lastVisit: subDays(new Date(), 2),
      nextBillingDate: addDays(new Date(), 15),
      followUpReason: 'Membership expiring soon',
      estimatedDuration: 15,
      communicationHistory: [
        {
          id: '1',
          type: 'email',
          date: subDays(new Date(), 5),
          staffMember: 'Sarah Johnson',
          outcome: 'successful',
          notes: 'Sent initial renewal reminder email',
          nextAction: 'Follow up with phone call'
        }
      ]
    },
    {
      id: '2',
      memberName: 'Lisa Chen',
      memberEmail: 'lisa.chen@email.com',
      memberPhone: '+971 55 987 6543',
      type: 'email',
      status: 'pending',
      priority: 'medium',
      assignedStaff: 'Ahmed Hassan',
      dueDate: new Date(),
      scheduledTime: '10:30',
      createdDate: subDays(new Date(), 1),
      subject: 'Check in after first week',
      notes: 'New member - check how first week is going and if they need any help.',
      tags: ['new-member', 'check-in', 'onboarding'],
      membershipStatus: 'active',
      membershipPlan: 'Premium Annual',
      lastVisit: new Date(),
      nextBillingDate: addDays(new Date(), 350),
      followUpReason: 'New member onboarding',
      estimatedDuration: 10,
      communicationHistory: []
    },
    {
      id: '3',
      memberName: 'Michael Johnson',
      memberEmail: 'michael.j@email.com',
      memberPhone: '+971 52 456 7890',
      type: 'meeting',
      status: 'pending',
      priority: 'high',
      assignedStaff: 'Maria Rodriguez',
      dueDate: addDays(new Date(), 1),
      scheduledTime: '16:00',
      createdDate: new Date(),
      subject: 'Personal training consultation',
      notes: 'Member interested in personal training. Schedule consultation to discuss goals and packages.',
      tags: ['personal-training', 'consultation', 'upsell'],
      membershipStatus: 'active',
      membershipPlan: 'Standard Monthly',
      lastVisit: new Date(),
      nextBillingDate: addDays(new Date(), 28),
      followUpReason: 'Personal training interest',
      estimatedDuration: 30,
      communicationHistory: [
        {
          id: '2',
          type: 'in-app',
          date: new Date(),
          staffMember: 'Maria Rodriguez',
          outcome: 'successful',
          notes: 'Member expressed interest during gym visit',
          nextAction: 'Schedule consultation meeting'
        }
      ]
    },
    {
      id: '4',
      memberName: 'Sarah Williams',
      memberEmail: 'sarah.w@email.com',
      memberPhone: '+971 56 789 0123',
      type: 'whatsapp',
      status: 'completed',
      priority: 'low',
      assignedStaff: 'David Wilson',
      dueDate: subDays(new Date(), 2),
      scheduledTime: '09:15',
      completedDate: subDays(new Date(), 2),
      createdDate: subDays(new Date(), 4),
      subject: 'Class schedule reminder',
      notes: 'Send weekly class schedule and remind about upcoming yoga class.',
      tags: ['class-schedule', 'reminder', 'yoga'],
      membershipStatus: 'active',
      membershipPlan: 'Standard Monthly',
      lastVisit: subDays(new Date(), 1),
      nextBillingDate: addDays(new Date(), 20),
      followUpReason: 'Regular engagement',
      outcome: 'successful',
      estimatedDuration: 5,
      communicationHistory: [
        {
          id: '3',
          type: 'whatsapp',
          date: subDays(new Date(), 2),
          staffMember: 'David Wilson',
          duration: 5,
          outcome: 'successful',
          notes: 'Sent class schedule, member confirmed attendance'
        }
      ]
    },
    {
      id: '5',
      memberName: 'Ahmed Al-Rashid',
      memberEmail: 'ahmed.r@email.com',
      memberPhone: '+971 54 345 6789',
      type: 'call',
      status: 'pending',
      priority: 'medium',
      assignedStaff: 'Sarah Johnson',
      dueDate: addDays(new Date(), 2),
      scheduledTime: '11:00',
      createdDate: subDays(new Date(), 1),
      subject: 'Billing inquiry follow-up',
      notes: 'Member had questions about billing. Follow up to ensure everything is resolved.',
      tags: ['billing', 'support', 'inquiry'],
      membershipStatus: 'active',
      membershipPlan: 'Premium Monthly',
      lastVisit: subDays(new Date(), 3),
      nextBillingDate: addDays(new Date(), 25),
      followUpReason: 'Billing support',
      estimatedDuration: 10,
      communicationHistory: [
        {
          id: '4',
          type: 'email',
          date: subDays(new Date(), 2),
          staffMember: 'Sarah Johnson',
          outcome: 'successful',
          notes: 'Responded to billing inquiry via email',
          nextAction: 'Follow up to confirm resolution'
        }
      ]
    }
  ];

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalFollowUps = followUps.length;
    const pendingFollowUps = followUps.filter(f => f.status === 'pending').length;
    const overdueFollowUps = followUps.filter(f => f.status === 'overdue').length;
    const completedToday = followUps.filter(f => 
      f.status === 'completed' && f.completedDate && isToday(f.completedDate)
    ).length;
    const dueToday = followUps.filter(f => 
      ['pending', 'overdue'].includes(f.status) && isToday(f.dueDate)
    ).length;
    const completedThisWeek = followUps.filter(f => 
      f.status === 'completed' && f.completedDate && 
      f.completedDate >= subDays(new Date(), 7)
    ).length;
    const highPriorityPending = followUps.filter(f => 
      f.priority === 'high' && ['pending', 'overdue'].includes(f.status)
    ).length;
    const successRate = followUps.filter(f => f.status === 'completed').length / totalFollowUps * 100;

    return {
      totalFollowUps,
      pendingFollowUps,
      overdueFollowUps,
      completedToday,
      dueToday,
      completedThisWeek,
      highPriorityPending,
      successRate
    };
  }, [followUps]);

  // Filter and sort follow-ups
  const filteredFollowUps = useMemo(() => {
    let filtered = followUps.filter(followUp => {
      const matchesSearch = searchTerm === '' || 
        followUp.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        followUp.memberEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        followUp.memberPhone.includes(searchTerm) ||
        followUp.subject.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || followUp.status === statusFilter;
      const matchesType = typeFilter === 'all' || followUp.type === typeFilter;
      const matchesStaff = staffFilter === 'all' || followUp.assignedStaff === staffFilter;
      const matchesPriority = priorityFilter === 'all' || followUp.priority === priorityFilter;
      
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = isToday(followUp.dueDate);
      } else if (dateFilter === 'tomorrow') {
        matchesDate = isTomorrow(followUp.dueDate);
      } else if (dateFilter === 'this-week') {
        matchesDate = followUp.dueDate <= addWeeks(new Date(), 1) && followUp.dueDate >= new Date();
      } else if (dateFilter === 'overdue') {
        matchesDate = followUp.status === 'overdue' || (followUp.dueDate < new Date() && followUp.status === 'pending');
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesStaff && matchesPriority && matchesDate;
    });

    // Sort follow-ups
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === undefined || bValue === undefined) return 0;
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [followUps, searchTerm, statusFilter, typeFilter, staffFilter, priorityFilter, dateFilter, sortField, sortDirection]);

  // Group follow-ups by status for kanban view
  const followUpsByStatus = useMemo(() => {
    const groups = {
      pending: filteredFollowUps.filter(f => f.status === 'pending'),
      overdue: filteredFollowUps.filter(f => f.status === 'overdue'),
      completed: filteredFollowUps.filter(f => f.status === 'completed'),
      cancelled: filteredFollowUps.filter(f => f.status === 'cancelled'),
      rescheduled: filteredFollowUps.filter(f => f.status === 'rescheduled')
    };
    return groups;
  }, [filteredFollowUps]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'in-app': return <AtSign className="h-4 w-4" />;
      case 'meeting': return <Users className="h-4 w-4" />;
      case 'visit': return <Building className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'rescheduled': return <CalendarClock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDueDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd, yyyy');
  };

  const getDueDateColor = (followUp: FollowUp) => {
    if (followUp.status === 'completed') return 'text-green-600';
    if (followUp.status === 'overdue') return 'text-red-600 font-medium';
    if (isToday(followUp.dueDate)) return 'text-orange-600 font-medium';
    if (isBefore(followUp.dueDate, new Date())) return 'text-red-600 font-medium';
    return 'text-gray-600';
  };

  const handleFollowUpClick = useCallback((followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setShowFollowUpDetail(true);
  }, []);

  const handleCompleteFollowUp = useCallback((followUp: FollowUp) => {
    setCompletingFollowUp(followUp);
    setShowCompleteDialog(true);
  }, []);

  const handleQuickAction = useCallback((followUp: FollowUp, action: string) => {
    switch (action) {
      case 'call':
        window.open(`tel:${followUp.memberPhone}`);
        toast.success(`Calling ${followUp.memberName}`);
        break;
      case 'email':
        window.open(`mailto:${followUp.memberEmail}?subject=${encodeURIComponent(followUp.subject)}`);
        toast.success(`Email opened for ${followUp.memberName}`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/${followUp.memberPhone.replace(/\s+/g, '').replace('+', '')}`);
        toast.success(`WhatsApp opened for ${followUp.memberName}`);
        break;
      case 'complete':
        handleCompleteFollowUp(followUp);
        break;
      case 'reschedule':
        toast.info('Reschedule feature coming soon!');
        break;
    }
  }, []);

  const handleBulkAction = useCallback((action: string) => {
    if (selectedFollowUps.length === 0) {
      toast.error('Please select follow-ups first');
      return;
    }
    
    switch (action) {
      case 'complete':
        toast.success(`Marked ${selectedFollowUps.length} follow-ups as completed`);
        break;
      case 'reschedule':
        toast.success(`Rescheduled ${selectedFollowUps.length} follow-ups`);
        break;
      case 'assign':
        toast.success(`Reassigned ${selectedFollowUps.length} follow-ups`);
        break;
      case 'delete':
        toast.success(`Deleted ${selectedFollowUps.length} follow-ups`);
        break;
      default:
        toast.info(`Action: ${action} for ${selectedFollowUps.length} follow-ups`);
    }
    setSelectedFollowUps([]);
    setShowBulkActions(false);
  }, [selectedFollowUps]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Follow-ups Management</h1>
          <p className="text-muted-foreground mt-2">
            Schedule, track, and manage follow-up communications with members and prospects
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setShowBulkActions(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setShowAutomation(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Automation
          </Button>
          <Button onClick={() => setShowAddFollowUp(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Follow-up
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{kpis.totalFollowUps}</p>
              </div>
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{kpis.pendingFollowUps}</p>
              </div>
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{kpis.overdueFollowUps}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold text-orange-600">{kpis.dueToday}</p>
              </div>
              <CalendarCheck className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">{kpis.completedToday}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold text-purple-600">{kpis.completedThisWeek}</p>
              </div>
              <CalendarDays className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-red-600">{kpis.highPriorityPending}</p>
              </div>
              <Flag className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{kpis.successRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by member name, email, or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="in-app">In-App</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="visit">Visit</SelectItem>
                </SelectContent>
              </Select>

              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Assigned Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffMembers.map(staff => (
                    <SelectItem key={staff.id} value={staff.name}>{staff.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-2 border rounded-lg p-1">
              <Button
                variant={activeView === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('table')}
              >
                <List className="h-4 w-4 mr-1" />
                Table
              </Button>
              <Button
                variant={activeView === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('kanban')}
              >
                <Layers className="h-4 w-4 mr-1" />
                Kanban
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedFollowUps.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{selectedFollowUps.length} follow-ups selected</span>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('complete')}>
                Mark Complete
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('reschedule')}>
                Reschedule
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('assign')}>
                Reassign
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')}>
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedFollowUps([])}>
                Clear
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      {activeView === 'table' ? (
        /* Table View */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Follow-ups List ({filteredFollowUps.length})</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                >
                  {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedFollowUps.length === filteredFollowUps.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFollowUps(filteredFollowUps.map(f => f.id));
                        } else {
                          setSelectedFollowUps([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFollowUps.map((followUp) => (
                  <TableRow key={followUp.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedFollowUps.includes(followUp.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedFollowUps([...selectedFollowUps, followUp.id]);
                          } else {
                            setSelectedFollowUps(selectedFollowUps.filter(id => id !== followUp.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell onClick={() => handleFollowUpClick(followUp)}>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={followUp.memberAvatar} />
                          <AvatarFallback>
                            {followUp.memberName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{followUp.memberName}</p>
                          <div className="flex items-center space-x-1">
                            {followUp.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{followUp.memberEmail}</p>
                        <p className="text-sm text-muted-foreground">{followUp.memberPhone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="font-medium truncate">{followUp.subject}</p>
                        <p className="text-sm text-muted-foreground truncate">{followUp.followUpReason}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(followUp.type)}
                        <span className="capitalize">{followUp.type.replace('-', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(followUp.status)}>
                        {getStatusIcon(followUp.status)}
                        <span className="ml-1 capitalize">{followUp.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(followUp.priority)}>
                        {followUp.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={getDueDateColor(followUp)}>
                        <p className="font-medium">{formatDueDate(followUp.dueDate)}</p>
                        {followUp.scheduledTime && (
                          <p className="text-sm">{followUp.scheduledTime}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={followUp.assignedStaffAvatar} />
                          <AvatarFallback className="text-xs">
                            {followUp.assignedStaff.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{followUp.assignedStaff}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        {followUp.type === 'call' && (
                          <Button size="sm" variant="ghost" onClick={() => handleQuickAction(followUp, 'call')}>
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                        {followUp.type === 'email' && (
                          <Button size="sm" variant="ghost" onClick={() => handleQuickAction(followUp, 'email')}>
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        {followUp.type === 'whatsapp' && (
                          <Button size="sm" variant="ghost" onClick={() => handleQuickAction(followUp, 'whatsapp')}>
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {['pending', 'overdue'].includes(followUp.status) && (
                          <Button size="sm" variant="ghost" onClick={() => handleQuickAction(followUp, 'complete')}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleFollowUpClick(followUp)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {Object.entries(followUpsByStatus).map(([status, statusFollowUps]) => (
            <Card key={status} className="min-h-[600px]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(status)}>
                      {getStatusIcon(status)}
                      <span className="ml-1 capitalize">{status.replace('-', ' ')}</span>
                    </Badge>
                    <span className="text-sm text-muted-foreground">({statusFollowUps.length})</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusFollowUps.map((followUp) => (
                  <Card key={followUp.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleFollowUpClick(followUp)}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={followUp.memberAvatar} />
                            <AvatarFallback className="text-xs">
                              {followUp.memberName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{followUp.memberName}</p>
                            <p className="text-xs text-muted-foreground truncate">{followUp.subject}</p>
                          </div>
                        </div>
                        <Badge className={getPriorityColor(followUp.priority)} variant="outline">
                          {followUp.priority}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          {getTypeIcon(followUp.type)}
                          <span className="text-xs capitalize">{followUp.type.replace('-', ' ')}</span>
                        </div>
                        <div className={cn("text-xs", getDueDateColor(followUp))}>
                          {formatDueDate(followUp.dueDate)}
                          {followUp.scheduledTime && (
                            <span className="block">{followUp.scheduledTime}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex space-x-1">
                          {followUp.type === 'call' && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAction(followUp, 'call');
                            }}>
                              <Phone className="h-3 w-3" />
                            </Button>
                          )}
                          {followUp.type === 'email' && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAction(followUp, 'email');
                            }}>
                              <Mail className="h-3 w-3" />
                            </Button>
                          )}
                          {followUp.type === 'whatsapp' && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAction(followUp, 'whatsapp');
                            }}>
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                          )}
                          {['pending', 'overdue'].includes(followUp.status) && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAction(followUp, 'complete');
                            }}>
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={followUp.assignedStaffAvatar} />
                          <AvatarFallback className="text-xs">
                            {followUp.assignedStaff.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Follow-up Detail Sheet */}
      <Sheet open={showFollowUpDetail} onOpenChange={setShowFollowUpDetail}>
        <SheetContent className="w-full sm:w-[600px] sm:max-w-none overflow-y-auto">
          {selectedFollowUp && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedFollowUp.memberAvatar} />
                    <AvatarFallback>
                      {selectedFollowUp.memberName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedFollowUp.memberName}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(selectedFollowUp.status)}>
                        {getStatusIcon(selectedFollowUp.status)}
                        <span className="ml-1 capitalize">{selectedFollowUp.status}</span>
                      </Badge>
                      <Badge className={getPriorityColor(selectedFollowUp.priority)}>
                        {selectedFollowUp.priority}
                      </Badge>
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Follow-up Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Follow-up Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Type</Label>
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(selectedFollowUp.type)}
                          <span className="font-medium capitalize">{selectedFollowUp.type.replace('-', ' ')}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Due Date</Label>
                        <div className={getDueDateColor(selectedFollowUp)}>
                          <p className="font-medium">{formatDueDate(selectedFollowUp.dueDate)}</p>
                          {selectedFollowUp.scheduledTime && (
                            <p className="text-sm">{selectedFollowUp.scheduledTime}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Assigned To</Label>
                        <p className="font-medium">{selectedFollowUp.assignedStaff}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Estimated Duration</Label>
                        <p className="font-medium">{selectedFollowUp.estimatedDuration || 15} minutes</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Subject</Label>
                      <p className="font-medium">{selectedFollowUp.subject}</p>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Reason</Label>
                      <p className="font-medium">{selectedFollowUp.followUpReason}</p>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Tags</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedFollowUp.tags.map(tag => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Notes</Label>
                      <p className="text-sm bg-muted/50 rounded-md p-3">{selectedFollowUp.notes}</p>
                    </div>

                    {selectedFollowUp.outcome && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Outcome</Label>
                        <Badge variant="outline" className="capitalize">
                          {selectedFollowUp.outcome.replace('-', ' ')}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Member Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Member Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Email</Label>
                        <p className="font-medium">{selectedFollowUp.memberEmail}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Phone</Label>
                        <p className="font-medium">{selectedFollowUp.memberPhone}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Membership Status</Label>
                        <Badge variant="outline" className="capitalize">
                          {selectedFollowUp.membershipStatus}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Plan</Label>
                        <p className="font-medium">{selectedFollowUp.membershipPlan || 'Not specified'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Last Visit</Label>
                        <p className="font-medium">
                          {selectedFollowUp.lastVisit ? format(selectedFollowUp.lastVisit, 'MMM dd, yyyy') : 'No visits'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Next Billing</Label>
                        <p className="font-medium">
                          {selectedFollowUp.nextBillingDate ? format(selectedFollowUp.nextBillingDate, 'MMM dd, yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => handleQuickAction(selectedFollowUp, 'call')} className="justify-start">
                        <Phone className="mr-2 h-4 w-4" />
                        Call Member
                      </Button>
                      <Button onClick={() => handleQuickAction(selectedFollowUp, 'email')} className="justify-start">
                        <Mail className="mr-2 h-4 w-4" />
                        Send Email
                      </Button>
                      <Button onClick={() => handleQuickAction(selectedFollowUp, 'whatsapp')} className="justify-start">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </Button>
                      {['pending', 'overdue'].includes(selectedFollowUp.status) && (
                        <Button onClick={() => handleQuickAction(selectedFollowUp, 'complete')} className="justify-start">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Communication History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Communication History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedFollowUp.communicationHistory.length > 0 ? (
                        selectedFollowUp.communicationHistory.map((record) => (
                          <div key={record.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                            <div className="flex-shrink-0">
                              {getTypeIcon(record.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium capitalize">{record.type}</h4>
                                <span className="text-sm text-muted-foreground">
                                  {format(record.date, 'MMM dd, yyyy HH:mm')}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{record.notes}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-xs text-muted-foreground">By: {record.staffMember}</span>
                                <Badge variant="outline" className={
                                  record.outcome === 'successful' ? 'text-green-700 border-green-200' :
                                  record.outcome === 'not-interested' ? 'text-red-700 border-red-200' :
                                  'text-gray-700 border-gray-200'
                                }>
                                  {record.outcome.replace('-', ' ')}
                                </Badge>
                                {record.duration && (
                                  <span className="text-xs text-muted-foreground">{record.duration} min</span>
                                )}
                              </div>
                              {record.nextAction && (
                                <p className="text-xs text-blue-600 mt-1">Next: {record.nextAction}</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No communication history yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add New Follow-up Dialog */}
      <Dialog open={showAddFollowUp} onOpenChange={setShowAddFollowUp}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Follow-up</DialogTitle>
            <DialogDescription>
              Schedule a new follow-up communication with a member
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="memberName">Member Name</Label>
              <Input id="memberName" placeholder="Select or enter member name" />
            </div>
            <div>
              <Label htmlFor="followUpType">Follow-up Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="in-app">In-App Message</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="visit">Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="Enter follow-up subject" />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" />
            </div>
            <div>
              <Label htmlFor="scheduledTime">Scheduled Time</Label>
              <Input id="scheduledTime" type="time" />
            </div>
            <div>
              <Label htmlFor="assignedStaff">Assigned Staff</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map(staff => (
                    <SelectItem key={staff.id} value={staff.name}>{staff.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="duration">Estimated Duration (minutes)</Label>
              <Input id="duration" type="number" placeholder="15" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Enter any additional notes about this follow-up" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFollowUp(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success('Follow-up scheduled successfully');
              setShowAddFollowUp(false);
            }}>
              Schedule Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Follow-up Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Follow-up</DialogTitle>
            <DialogDescription>
              Mark this follow-up as completed and add outcome details
            </DialogDescription>
          </DialogHeader>
          {completingFollowUp && (
            <div className="space-y-4">
              <div>
                <Label>Member</Label>
                <p className="font-medium">{completingFollowUp.memberName}</p>
              </div>
              <div>
                <Label>Subject</Label>
                <p className="font-medium">{completingFollowUp.subject}</p>
              </div>
              <div>
                <Label htmlFor="outcome">Outcome</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="successful">Successful</SelectItem>
                    <SelectItem value="no-response">No Response</SelectItem>
                    <SelectItem value="callback-requested">Callback Requested</SelectItem>
                    <SelectItem value="not-interested">Not Interested</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="completionNotes">Notes</Label>
                <Textarea id="completionNotes" placeholder="Add notes about the outcome..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success('Follow-up marked as completed');
              setShowCompleteDialog(false);
              setCompletingFollowUp(null);
            }}>
              Complete Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Automation Dialog */}
      <Dialog open={showAutomation} onOpenChange={setShowAutomation}>
        <DialogContent className="max-w-7xl h-[90vh] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Follow-up Automation Management</DialogTitle>
            <DialogDescription>
              Create and manage automated follow-up workflows and communication sequences
            </DialogDescription>
          </DialogHeader>
          <div className="h-full overflow-hidden">
            <Automations />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

