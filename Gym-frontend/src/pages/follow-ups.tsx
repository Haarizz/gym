import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { followUpService, type FollowUpResponse } from '../utils/supabase/follow-up-service';
import { leadService } from '../utils/supabase/lead-service';
import { staffService } from '../utils/supabase/staff-service';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
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
  CalendarClock,
  ChevronsUpDown
} from 'lucide-react';
import { toast } from "sonner";
import { format, addDays, isAfter, isBefore, isToday, isTomorrow, isYesterday, addWeeks, subDays } from "date-fns";
import { cn } from "../components/ui/utils";
import { Automations } from "./automations";

interface FollowUp {
  id: string;
  leadId: number;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  leadAvatar?: string;
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
}

export function FollowUps() {
  const [activeTab, setActiveTab] = useState('all');
  const [activeView, setActiveView] = useState<'table' | 'kanban'>('table');
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const [showFollowUpDetail, setShowFollowUpDetail] = useState(false);
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

  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  // API state
  const [apiFollowUps, setApiFollowUps] = useState<FollowUpResponse[]>([]);
  const [newFU, setNewFU] = useState({ leadId: '', leadName: '', type: 'call', subject: '', priority: 'medium', dueDate: '', scheduledTime: '', assignedStaff: '', estimatedDuration: '', notes: '' });
  const [completeOutcome, setCompleteOutcome] = useState('successful');
  const [completeNotes, setCompleteNotes] = useState('');
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showBulkReassign, setShowBulkReassign] = useState(false);
  const [bulkReassignStaff, setBulkReassignStaff] = useState('');
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFU, setEditFU] = useState({ leadId: 0, leadName: '', type: 'call', subject: '', priority: 'medium', dueDate: '', scheduledTime: '', assignedStaff: '', estimatedDuration: '', notes: '', status: 'pending' });

  // Leads and Staff dynamic data
  const [leadsList, setLeadsList] = useState<{id: string, name: string}[]>([]);
  const [staffList, setStaffList] = useState<{id: string, name: string}[]>([]);
  
  // Combobox popover states for New Follow-up
  const [openLeadCombobox, setOpenLeadCombobox] = useState(false);
  const [openStaffCombobox, setOpenStaffCombobox] = useState(false);

  // Combobox popover states for Edit Follow-up
  const [openEditLeadCombobox, setOpenEditLeadCombobox] = useState(false);
  const [openEditStaffCombobox, setOpenEditStaffCombobox] = useState(false);

  const loadFollowUps = useCallback(async () => {
    try {
      const data = await followUpService.getFollowUps({ size: 200, status: statusFilter !== 'all' ? statusFilter : undefined, type: typeFilter !== 'all' ? typeFilter : undefined, priority: priorityFilter !== 'all' ? priorityFilter : undefined, assignedStaff: staffFilter !== 'all' ? staffFilter : undefined, search: searchTerm || undefined });
      setApiFollowUps(data.followUps);
    } catch { /* keep mock data */ }
  }, [statusFilter, typeFilter, priorityFilter, staffFilter, searchTerm]);

  useEffect(() => { loadFollowUps(); }, [loadFollowUps]);

  useEffect(() => {
    leadService.getLeads({ size: 1000 }).then(res => {
      setLeadsList(res.leads.map(l => ({ id: String(l.id), name: `${l.firstName} ${l.lastName}`.trim() })));
    }).catch(console.error);
    
    staffService.getStaff({}, 1, 100).then(res => {
      setStaffList(res.items.map(s => ({ id: String(s.id), name: s.name })));
    }).catch(console.error);
  }, []);

  // Arriving from Leads' "Schedule follow-up" quick action — open the Add
  // dialog pre-filled with that lead instead of requiring it to be re-picked.
  const location = useLocation();
  useEffect(() => {
    const state = location.state as { prefillLeadId?: number; prefillLeadName?: string } | null;
    if (state?.prefillLeadId) {
      setNewFU(p => ({ ...p, leadId: String(state.prefillLeadId), leadName: state.prefillLeadName || '' }));
      setShowAddFollowUp(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);


  const displayFollowUps: FollowUp[] = apiFollowUps.map(f => ({
    id: String(f.id),
    leadId: f.leadId,
    leadName: f.leadName,
    leadEmail: f.leadEmail || '',
    leadPhone: f.leadPhone || '',
    type: (f.type === 'in_app' ? 'in-app' : f.type) as FollowUp['type'],
    status: f.status as FollowUp['status'],
    priority: f.priority as FollowUp['priority'],
    assignedStaff: f.assignedStaff || '',
    dueDate: new Date(f.dueDate),
    scheduledTime: f.scheduledTime,
    completedDate: f.completedDate ? new Date(f.completedDate) : undefined,
    createdDate: new Date(f.createdAt),
    subject: f.subject,
    notes: f.notes || '',
    tags: f.tags || [],
    membershipStatus: (f.membershipStatus as FollowUp['membershipStatus']) || 'active',
    membershipPlan: f.membershipPlan,
    followUpReason: f.followUpReason || '',
    estimatedDuration: f.estimatedDuration,
    outcome: f.outcome as FollowUp['outcome'],
    communicationHistory: (f.communicationHistory || []).map(r => ({
      id: String(r.id),
      type: (r.type === 'in_app' ? 'in-app' : r.type) as CommunicationRecord['type'],
      date: new Date(r.date),
      staffMember: r.staffMember,
      duration: r.duration,
      outcome: r.outcome as CommunicationRecord['outcome'],
      notes: r.notes,
      nextAction: r.nextAction,
    })),
  }));

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalFollowUps = displayFollowUps.length;
    const pendingFollowUps = displayFollowUps.filter(f => f.status === 'pending').length;
    const overdueFollowUps = displayFollowUps.filter(f => f.status === 'overdue').length;
    const completedToday = displayFollowUps.filter(f =>
      f.status === 'completed' && f.completedDate && isToday(f.completedDate)
    ).length;
    const dueToday = displayFollowUps.filter(f =>
      ['pending', 'overdue'].includes(f.status) && isToday(f.dueDate)
    ).length;
    const completedThisWeek = displayFollowUps.filter(f =>
      f.status === 'completed' && f.completedDate &&
      f.completedDate >= subDays(new Date(), 7)
    ).length;
    const highPriorityPending = displayFollowUps.filter(f =>
      f.priority === 'high' && ['pending', 'overdue'].includes(f.status)
    ).length;
    const successRate = displayFollowUps.filter(f => f.status === 'completed').length / Math.max(totalFollowUps, 1) * 100;

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
  }, [displayFollowUps]);

  // Filter and sort follow-ups
  const filteredFollowUps = useMemo(() => {
    let filtered = displayFollowUps.filter(followUp => {
      const matchesSearch = searchTerm === '' || 
        followUp.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (followUp.leadEmail && followUp.leadEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (followUp.leadPhone && followUp.leadPhone.includes(searchTerm)) ||
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
  }, [displayFollowUps, searchTerm, statusFilter, typeFilter, staffFilter, priorityFilter, dateFilter, sortField, sortDirection]);

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
        if (followUp.leadPhone) window.open(`tel:${followUp.leadPhone}`);
        toast.success(`Calling ${followUp.leadName}`);
        break;
      case 'email':
        if (followUp.leadEmail) window.open(`mailto:${followUp.leadEmail}?subject=${encodeURIComponent(followUp.subject)}`);
        toast.success(`Email opened for ${followUp.leadName}`);
        break;
      case 'whatsapp':
        if (followUp.leadPhone) window.open(`https://wa.me/${followUp.leadPhone.replace(/\s+/g, '').replace('+', '')}`);
        toast.success(`WhatsApp opened for ${followUp.leadName}`);
        break;
      case 'complete':
        handleCompleteFollowUp(followUp);
        break;
      case 'reschedule':
        setReschedulingId(followUp.id);
        setRescheduleDate('');
        setShowRescheduleDialog(true);
        break;
      case 'delete':
        if (window.confirm(`Delete follow-up for ${followUp.leadName}?`)) {
          followUpService.delete(Number(followUp.id)).then(() => { toast.success('Follow-up deleted'); loadFollowUps(); }).catch(() => toast.error('Failed to delete'));
        }
        break;
    }
  }, [handleCompleteFollowUp, loadFollowUps]);

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedFollowUps.length === 0) {
      toast.error('Please select follow-ups first');
      return;
    }
    if (action === 'delete') {
      try {
        await Promise.all(selectedFollowUps.map(id => followUpService.delete(Number(id))));
        toast.success(`Deleted ${selectedFollowUps.length} follow-ups`);
        loadFollowUps();
      } catch { toast.error('Failed to delete some follow-ups'); }
    } else if (action === 'complete') {
      try {
        await Promise.all(selectedFollowUps.map(id => followUpService.complete(Number(id), 'successful')));
        toast.success(`Marked ${selectedFollowUps.length} follow-ups as completed`);
        loadFollowUps();
      } catch { toast.error('Failed to complete some follow-ups'); }
    } else if (action === 'reschedule') {
      setReschedulingId(null);
      setRescheduleDate('');
      setShowRescheduleDialog(true);
      return;
    } else if (action === 'assign') {
      setShowBulkReassign(true);
      return;
    }
    setSelectedFollowUps([]);
  }, [selectedFollowUps, loadFollowUps]);

  const handleDeleteFollowUp = useCallback(async (id: string) => {
    if (!window.confirm('Delete this follow-up?')) return;
    try {
      await followUpService.delete(Number(id));
      toast.success('Follow-up deleted');
      loadFollowUps();
    } catch { toast.error('Failed to delete follow-up'); }
  }, [loadFollowUps]);

  const handleOpenEdit = useCallback((followUp: FollowUp) => {
    setEditingFollowUp(followUp);
    setEditFU({
      leadId: followUp.leadId,
      leadName: followUp.leadName,
      type: followUp.type === 'in-app' ? 'in_app' : followUp.type,
      subject: followUp.subject,
      priority: followUp.priority,
      dueDate: followUp.dueDate.toISOString().split('T')[0],
      scheduledTime: followUp.scheduledTime || '',
      assignedStaff: followUp.assignedStaff || '',
      estimatedDuration: followUp.estimatedDuration ? String(followUp.estimatedDuration) : '',
      notes: followUp.notes || '',
      status: followUp.status,
    });
    setShowEditDialog(true);
  }, []);

  const handleExportCSV = useCallback(() => {
    const csv = ['Lead,Subject,Type,Status,Priority,Assigned Staff,Due Date', ...filteredFollowUps.map(f =>
      `${f.leadName},${f.subject},${f.type},${f.status},${f.priority},${f.assignedStaff || ''},${f.dueDate.toISOString()}`
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'follow-ups.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Follow-ups exported');
  }, [filteredFollowUps]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Follow-ups Management</h1>
          <p className="text-muted-foreground">Comprehensive member management and operations.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowAddFollowUp(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Follow-up
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{kpis.totalFollowUps}</div>
            <p className="text-xs text-muted-foreground">All follow-ups</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Pending</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpis.pendingFollowUps}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Overdue</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.overdueFollowUps}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Due Today</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <CalendarCheck className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.dueToday}</div>
            <p className="text-xs text-muted-foreground">Needs action today</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Completed Today</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.completedToday}</div>
            <p className="text-xs text-muted-foreground">Finished follow-ups</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">This Week</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <CalendarDays className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{kpis.completedThisWeek}</div>
            <p className="text-xs text-muted-foreground">Completed this week</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">High Priority</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <Flag className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.highPriorityPending}</div>
            <p className="text-xs text-muted-foreground">Urgent follow-ups</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Success Rate</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className={cardShell}>
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
                  {staffList.map(staff => (
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
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>{selectedFollowUps.length} follow-ups selected</span>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('complete')}>
                Mark Complete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('reschedule')}>
                Reschedule
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('assign')}>
                Reassign
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('delete')}>
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
        <div key="followups-table" className="animate-in fade-in-0 zoom-in-95 duration-200">
        <Card className={cardShell}>
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
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
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
                  <TableRow key={followUp.id} className="cursor-pointer hover:bg-slate-50/50 transition-colors">
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
                          <AvatarImage src={followUp.leadAvatar} />
                          <AvatarFallback>
                            {followUp.leadName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{followUp.leadName}</p>
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
                        <p className="text-sm">{followUp.leadEmail}</p>
                        <p className="text-sm text-muted-foreground">{followUp.leadPhone}</p>
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
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(followUp)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteFollowUp(followUp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
      ) : (
        /* Kanban View */
        <div key="followups-kanban" className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in-0 zoom-in-95 duration-200">
          {Object.entries(followUpsByStatus).map(([status, statusFollowUps]) => (
            <Card key={status} className="min-h-[600px] border-0 shadow-md hover:shadow-lg transition-shadow">
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
                  <Card key={followUp.id} className="p-3 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleFollowUpClick(followUp)}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={followUp.leadAvatar} />
                            <AvatarFallback className="text-xs">
                              {followUp.leadName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{followUp.leadName}</p>
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
                    <AvatarImage src={selectedFollowUp.leadAvatar} />
                    <AvatarFallback>
                      {selectedFollowUp.leadName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedFollowUp.leadName}</h3>
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
                        <p className="font-medium">{selectedFollowUp.leadEmail}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Phone</Label>
                        <p className="font-medium">{selectedFollowUp.leadPhone}</p>
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
            <div className="flex flex-col space-y-2 mt-1">
              <Label htmlFor="leadName">Lead Name</Label>
              <Popover open={openLeadCombobox} onOpenChange={setOpenLeadCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openLeadCombobox}
                    className="w-full justify-between"
                  >
                    {newFU.leadId
                      ? leadsList.find((lead) => lead.id === newFU.leadId)?.name || newFU.leadName
                      : "Select lead..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search lead..." />
                    <CommandEmpty>No lead found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {leadsList.map((lead) => (
                          <CommandItem
                            key={lead.id}
                            value={lead.name}
                            onSelect={() => {
                              setNewFU(p => ({ ...p, leadId: lead.id, leadName: lead.name }));
                              setOpenLeadCombobox(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", newFU.leadId === lead.id ? "opacity-100" : "opacity-0")} />
                            {lead.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="followUpType">Follow-up Type</Label>
              <Select value={newFU.type} onValueChange={v => setNewFU(p => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="in_app">In-App Message</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="visit">Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="Enter follow-up subject" value={newFU.subject} onChange={e => setNewFU(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={newFU.priority} onValueChange={v => setNewFU(p => ({ ...p, priority: v }))}>
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
              <Input id="dueDate" type="date" value={newFU.dueDate} onChange={e => setNewFU(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="scheduledTime">Scheduled Time</Label>
              <Input id="scheduledTime" type="time" value={newFU.scheduledTime} onChange={e => setNewFU(p => ({ ...p, scheduledTime: e.target.value }))} />
            </div>
            <div className="flex flex-col space-y-2 mt-1">
              <Label htmlFor="assignedStaff">Assigned Staff</Label>
              <Popover open={openStaffCombobox} onOpenChange={setOpenStaffCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openStaffCombobox}
                    className="w-full justify-between"
                  >
                    {newFU.assignedStaff
                      ? staffList.find((staff) => staff.name === newFU.assignedStaff)?.name || newFU.assignedStaff
                      : "Select staff member..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search staff..." />
                    <CommandEmpty>No staff found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {staffList.map((staff) => (
                          <CommandItem
                            key={staff.id}
                            value={staff.name}
                            onSelect={() => {
                              setNewFU(p => ({ ...p, assignedStaff: staff.name }));
                              setOpenStaffCombobox(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", newFU.assignedStaff === staff.name ? "opacity-100" : "opacity-0")} />
                            {staff.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="duration">Estimated Duration (minutes)</Label>
              <Input id="duration" type="number" placeholder="15" value={newFU.estimatedDuration} onChange={e => setNewFU(p => ({ ...p, estimatedDuration: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Enter any additional notes about this follow-up" value={newFU.notes} onChange={e => setNewFU(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFollowUp(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!newFU.leadId || !newFU.leadName || !newFU.subject || !newFU.dueDate) {
                toast.error('Please select a lead from the list, and fill in subject and due date');
                return;
              }
              try {
                await followUpService.create({
                  leadId: Number(newFU.leadId),
                  type: newFU.type,
                  subject: newFU.subject,
                  priority: newFU.priority,
                  dueDate: newFU.dueDate.includes('T') ? newFU.dueDate : `${newFU.dueDate}T00:00:00`,
                  scheduledTime: newFU.scheduledTime || undefined,
                  assignedStaff: newFU.assignedStaff || undefined,
                  estimatedDuration: newFU.estimatedDuration ? Number(newFU.estimatedDuration) : undefined,
                  notes: newFU.notes || undefined,
                });
                toast.success('Follow-up scheduled successfully');
                setNewFU({ leadId: '', leadName: '', type: 'call', subject: '', priority: 'medium', dueDate: '', scheduledTime: '', assignedStaff: '', estimatedDuration: '', notes: '' });
                setShowAddFollowUp(false);
                loadFollowUps();
              } catch (err: any) {
                console.error("Schedule follow-up error:", err);
                toast.error(err.message || 'Failed to schedule follow-up');
              }
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
                <Label>Lead</Label>
                <p className="font-medium">{completingFollowUp.leadName}</p>
              </div>
              <div>
                <Label>Subject</Label>
                <p className="font-medium">{completingFollowUp.subject}</p>
              </div>
              <div>
                <Label htmlFor="outcome">Outcome</Label>
                <Select value={completeOutcome} onValueChange={setCompleteOutcome}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="successful">Successful</SelectItem>
                    <SelectItem value="no_response">No Response</SelectItem>
                    <SelectItem value="callback_requested">Callback Requested</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="completionNotes">Notes</Label>
                <Textarea id="completionNotes" placeholder="Add notes about the outcome..." value={completeNotes} onChange={e => setCompleteNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!completingFollowUp) return;
              try {
                await followUpService.complete(Number(completingFollowUp.id), completeOutcome, completeNotes || undefined);
                toast.success('Follow-up marked as completed');
                setShowCompleteDialog(false);
                setCompletingFollowUp(null);
                setCompleteOutcome('successful');
                setCompleteNotes('');
                loadFollowUps();
              } catch {
                toast.error('Failed to complete follow-up');
              }
            }}>
              Complete Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Follow-up Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reschedule Follow-up{!reschedulingId && selectedFollowUps.length > 0 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              {reschedulingId ? 'Select a new due date for this follow-up' : `Select a new due date for ${selectedFollowUps.length} selected follow-up(s)`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Due Date</Label>
              <Input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!rescheduleDate) { toast.error('Please select a date'); return; }
              const ids = reschedulingId ? [reschedulingId] : selectedFollowUps;
              if (ids.length === 0) { toast.error('Please select a date'); return; }
              try {
                await Promise.all(ids.map(id => followUpService.reschedule(Number(id), rescheduleDate)));
                toast.success(`Rescheduled ${ids.length} follow-up(s)`);
                setShowRescheduleDialog(false);
                setReschedulingId(null);
                setSelectedFollowUps([]);
                loadFollowUps();
              } catch { toast.error('Failed to reschedule'); }
            }}>Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reassign Staff Dialog */}
      <Dialog open={showBulkReassign} onOpenChange={setShowBulkReassign}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reassign Staff</DialogTitle>
            <DialogDescription>Reassign {selectedFollowUps.length} selected follow-up(s) to a staff member</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Staff Member</Label>
            <Select value={bulkReassignStaff} onValueChange={setBulkReassignStaff}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {staffList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkReassign(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!bulkReassignStaff) { toast.error('Please select a staff member'); return; }
              try {
                await Promise.all(selectedFollowUps.map(id => {
                  const fu = displayFollowUps.find(f => f.id === id);
                  if (!fu) return Promise.resolve();
                  return followUpService.update(Number(id), {
                    leadId: fu.leadId,
                    type: fu.type,
                    dueDate: fu.dueDate.toISOString(),
                    subject: fu.subject,
                    assignedStaff: bulkReassignStaff,
                  });
                }));
                toast.success(`Reassigned ${selectedFollowUps.length} follow-up(s) to ${bulkReassignStaff}`);
                setShowBulkReassign(false);
                setBulkReassignStaff('');
                setSelectedFollowUps([]);
                loadFollowUps();
              } catch { toast.error('Failed to reassign staff'); }
            }}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Follow-up Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Follow-up</DialogTitle>
            <DialogDescription>Update follow-up details</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2 mt-1">
              <Label>Lead Name</Label>
              <Popover open={openEditLeadCombobox} onOpenChange={setOpenEditLeadCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openEditLeadCombobox}
                    className="w-full justify-between"
                  >
                    {editFU.leadName || "Select lead..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search lead..." />
                    <CommandEmpty>No lead found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {leadsList.map((lead) => (
                          <CommandItem
                            key={lead.id}
                            value={lead.name}
                            onSelect={() => {
                              setEditFU(p => ({ ...p, leadId: lead.id, leadName: lead.name }));
                              setOpenEditLeadCombobox(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", editFU.leadName === lead.name ? "opacity-100" : "opacity-0")} />
                            {lead.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={editFU.type} onValueChange={v => setEditFU(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="in_app">In-App</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="visit">Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={editFU.subject} onChange={e => setEditFU(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editFU.status} onValueChange={v => setEditFU(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={editFU.priority} onValueChange={v => setEditFU(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={editFU.dueDate} onChange={e => setEditFU(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div>
              <Label>Scheduled Time</Label>
              <Input type="time" value={editFU.scheduledTime} onChange={e => setEditFU(p => ({ ...p, scheduledTime: e.target.value }))} />
            </div>
            <div className="flex flex-col space-y-2 mt-1">
              <Label>Assigned Staff</Label>
              <Popover open={openEditStaffCombobox} onOpenChange={setOpenEditStaffCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openEditStaffCombobox}
                    className="w-full justify-between"
                  >
                    {editFU.assignedStaff || "Select staff..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search staff..." />
                    <CommandEmpty>No staff found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {staffList.map((staff) => (
                          <CommandItem
                            key={staff.id}
                            value={staff.name}
                            onSelect={() => {
                              setEditFU(p => ({ ...p, assignedStaff: staff.name }));
                              setOpenEditStaffCombobox(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", editFU.assignedStaff === staff.name ? "opacity-100" : "opacity-0")} />
                            {staff.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Estimated Duration (min)</Label>
              <Input type="number" value={editFU.estimatedDuration} onChange={e => setEditFU(p => ({ ...p, estimatedDuration: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={editFU.notes} onChange={e => setEditFU(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!editingFollowUp) return;
              try {
                await followUpService.update(Number(editingFollowUp.id), {
                  leadId: editFU.leadId || editingFollowUp.leadId,
                  type: editFU.type,
                  subject: editFU.subject,
                  priority: editFU.priority,
                  dueDate: editFU.dueDate.includes('T') ? editFU.dueDate : `${editFU.dueDate}T00:00:00`,
                  scheduledTime: editFU.scheduledTime || undefined,
                  assignedStaff: editFU.assignedStaff || undefined,
                  estimatedDuration: editFU.estimatedDuration ? Number(editFU.estimatedDuration) : undefined,
                  notes: editFU.notes || undefined,
                  status: editFU.status,
                });
                toast.success('Follow-up updated');
                setShowEditDialog(false);
                loadFollowUps();
              } catch { toast.error('Failed to update follow-up'); }
            }}>Save Changes</Button>
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

