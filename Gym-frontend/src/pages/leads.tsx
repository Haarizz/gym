import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { leadService, type LeadResponse } from '../utils/supabase/lead-service';
import { staffService } from '../utils/supabase/staff-service';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../utils/currency';
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
  Globe, 
  Share, 
  MapPin, 
  Instagram, 
  Facebook, 
  UserCheck, 
  PhoneCall, 
  Send, 
  Star, 
  Flag, 
  MoreHorizontal, 
  Download, 
  Settings, 
  BarChart3, 
  PieChart, 
  Activity, 
  AlertCircle, 
  Zap, 
  RefreshCw, 
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
  Building
} from 'lucide-react';
import { toast } from "sonner";
import { format } from "date-fns";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'new' | 'contacted' | 'follow-up' | 'converted' | 'lost';
  source: 'website' | 'referral' | 'walk-in' | 'social-media' | 'google-ads' | 'facebook-ads' | 'instagram' | 'other';
  priority: 'high' | 'medium' | 'low';
  assignedStaff?: string;
  nextFollowUp?: Date;
  createdDate: Date;
  lastContactDate?: Date;
  interestLevel: number; // 1-10 scale
  notes: string;
  tags: string[];
  membershipInterest?: string;
  budget?: number;
  preferredContactMethod: 'email' | 'phone' | 'whatsapp' | 'sms';
  leadScore: number; // 1-100 calculated score
  interactions: LeadInteraction[];
  followUps: LeadFollowUp[];
  avatar?: string;
}

interface LeadInteraction {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'whatsapp' | 'sms' | 'note';
  date: Date;
  staffMember: string;
  notes: string;
  outcome?: 'positive' | 'neutral' | 'negative';
  duration?: number; // in minutes for calls/meetings
}

interface LeadFollowUp {
  id: string;
  type: string;
  dueDate: Date;
  scheduledTime?: string;
  assignedStaff: string;
  estimatedDuration?: number;
  subject: string;
  notes?: string;
  status: string;
  priority: string;
}

interface Staff {
  id: string;
  name: string;
}

export function Leads() {
  const { currencyCode } = useCurrency();
  const [activeView, setActiveView] = useState<'table' | 'kanban'>('table');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof Lead>('createdDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  // API state
  const [apiLeads, setApiLeads] = useState<LeadResponse[]>([]);
  const [newLead, setNewLead] = useState({ firstName: '', lastName: '', email: '', phone: '', source: 'website', priority: 'medium', notes: '' });
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showEditLead, setShowEditLead] = useState(false);
  const [editLead, setEditLead] = useState({ firstName: '', lastName: '', email: '', phone: '', source: 'website', priority: 'medium', notes: '', status: 'new', assignedStaff: '', nextFollowUp: '', membershipInterest: '', interestLevel: '5', leadScore: '50' });
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [interactionLeadId, setInteractionLeadId] = useState<string | null>(null);
  const [newInteraction, setNewInteraction] = useState({ type: 'call', staffMember: '', notes: '', outcome: 'positive', duration: '' });
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [statusLeadId, setStatusLeadId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('new');
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAssignStaff, setBulkAssignStaff] = useState('');
  const navigate = useNavigate();

  const loadLeads = useCallback(async () => {
    try {
      const data = await leadService.getLeads({ size: 200, status: statusFilter !== 'all' ? statusFilter : undefined, source: sourceFilter !== 'all' ? sourceFilter : undefined, priority: priorityFilter !== 'all' ? priorityFilter : undefined, search: searchTerm || undefined });
      setApiLeads(data.leads);
    } catch { /* keep mock data */ }
  }, [statusFilter, sourceFilter, priorityFilter, searchTerm]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Total/converted/conversion-rate KPIs come from the real backend aggregate (leadService.getStats())
  // rather than the capped 200-row fetch above, so they stay accurate past 200 leads.
  const [leadStats, setLeadStats] = useState<{ totalLeads: number; convertedLeads: number; conversionRate: number } | null>(null);
  useEffect(() => {
    leadService.getStats().then(setLeadStats).catch(() => setLeadStats(null));
  }, [apiLeads]);

  const [staffMembers, setStaffMembers] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    staffService.getStaff({}, 1, 100)
      .then(res => setStaffMembers(res.items.map(s => ({ id: String(s.id), name: s.name }))))
      .catch(console.error);
  }, []);


  const parseSafeDate = (d: any, fallback: Date = new Date()) => {
    if (!d) return fallback;
    const parsed = new Date(d);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  };

  const parseOptionalDate = (d: any) => {
    if (!d) return undefined;
    const parsed = new Date(d);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const displayLeads: Lead[] = apiLeads.map(l => ({
    id: String(l.id),
    firstName: l.firstName,
    lastName: l.lastName || '',
    email: l.email || '',
    phone: l.phone || '',
    status: (l.status === 'follow_up' ? 'follow-up' : l.status) as Lead['status'],
    source: (l.source as Lead['source']) || 'other',
    priority: (l.priority as Lead['priority']) || 'medium',
    assignedStaff: l.assignedStaff,
    nextFollowUp: parseOptionalDate(l.nextFollowUp),
    createdDate: parseSafeDate(l.createdAt),
    lastContactDate: parseOptionalDate(l.lastContactDate),
    interestLevel: l.interestLevel || 5,
    notes: l.notes || '',
    tags: l.tags || [],
    membershipInterest: l.membershipInterest,
    budget: l.budget,
    preferredContactMethod: (l.preferredContactMethod as Lead['preferredContactMethod']) || 'email',
    leadScore: l.leadScore || 50,
    interactions: (l.interactions || []).map(i => ({
      id: String(i.id),
      type: i.type as LeadInteraction['type'],
      date: parseSafeDate(i.date),
      staffMember: i.staffMember,
      notes: i.notes,
      outcome: i.outcome as LeadInteraction['outcome'],
      duration: i.duration,
    })),
    followUps: (l.followUps || []).map(f => ({
      id: String(f.id),
      type: f.type,
      dueDate: parseSafeDate(f.dueDate),
      scheduledTime: f.scheduledTime,
      assignedStaff: f.assignedStaff,
      estimatedDuration: f.estimatedDuration,
      subject: f.subject,
      notes: f.notes,
      status: f.status,
      priority: f.priority,
    })),
  }));

  // Calculate KPIs
  const kpis = useMemo(() => {
    // pendingFollowUps/hotLeads/avgLeadScore have no backend aggregate endpoint, so they're
    // still computed from the fetched page (capped at 200) — only totalLeads/convertedLeads/
    // conversionRate are available as true DB-wide aggregates via leadService.getStats().
    const pendingFollowUps = displayLeads.filter(lead =>
      lead.nextFollowUp && lead.nextFollowUp <= new Date() &&
      !['converted', 'lost'].includes(lead.status)
    ).length;
    const hotLeads = displayLeads.filter(lead => lead.priority === 'high' && !['converted', 'lost'].includes(lead.status)).length;
    const avgLeadScore = displayLeads.length > 0 ? displayLeads.reduce((sum, lead) => sum + lead.leadScore, 0) / displayLeads.length : 0;

    const totalLeads = leadStats?.totalLeads ?? displayLeads.length;
    const convertedLeads = leadStats?.convertedLeads ?? displayLeads.filter(lead => lead.status === 'converted').length;
    const conversionRate = leadStats?.conversionRate ?? (totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0);

    return {
      totalLeads,
      convertedLeads,
      pendingFollowUps,
      hotLeads,
      conversionRate,
      avgLeadScore
    };
  }, [displayLeads, leadStats]);

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let filtered = displayLeads.filter(lead => {
      const matchesSearch = searchTerm === '' || 
        `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
      const matchesStaff = staffFilter === 'all' || lead.assignedStaff === staffFilter;
      const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesSource && matchesStaff && matchesPriority;
    });

    // Sort leads
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
  }, [displayLeads, searchTerm, statusFilter, sourceFilter, staffFilter, priorityFilter, sortField, sortDirection]);

  // Group leads by status for kanban view
  const leadsByStatus = useMemo(() => {
    const groups = {
      new: filteredLeads.filter(lead => lead.status === 'new'),
      contacted: filteredLeads.filter(lead => lead.status === 'contacted'),
      'follow-up': filteredLeads.filter(lead => lead.status === 'follow-up'),
      converted: filteredLeads.filter(lead => lead.status === 'converted'),
      lost: filteredLeads.filter(lead => lead.status === 'lost')
    };
    return groups;
  }, [filteredLeads]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'follow-up': return 'bg-orange-100 text-orange-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
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

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'website': return <Globe className="h-4 w-4" />;
      case 'referral': return <Share className="h-4 w-4" />;
      case 'walk-in': return <MapPin className="h-4 w-4" />;
      case 'social-media': return <Instagram className="h-4 w-4" />;
      case 'google-ads': return <Chrome className="h-4 w-4" />;
      case 'facebook-ads': return <Facebook className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const handleLeadClick = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetail(true);
  }, []);

  const handleAddInteraction = useCallback(async (leadId: string, interaction: Omit<LeadInteraction, 'id'>) => {
    try {
      await leadService.addInteraction(Number(leadId), {
        type: interaction.type as any,
        date: new Date().toISOString(),
        staffMember: interaction.staffMember,
        notes: interaction.notes,
        outcome: interaction.outcome as any,
        duration: interaction.duration,
      });
      toast.success('Interaction added successfully');
      loadLeads();
    } catch { toast.error('Failed to add interaction'); }
  }, [loadLeads]);

  const handleUpdateLeadStatus = useCallback(async (leadId: string, status: Lead['status']) => {
    try {
      await leadService.updateStatus(Number(leadId), status === 'follow-up' ? 'follow_up' : status);
      toast.success(`Lead status updated to ${status}`);
      loadLeads();
    } catch { toast.error('Failed to update lead status'); }
  }, [loadLeads]);

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads first');
      return;
    }
    if (action === 'delete') {
      if (!window.confirm(`Delete ${selectedLeads.length} leads?`)) return;
      try {
        await Promise.all(selectedLeads.map(id => leadService.delete(Number(id))));
        toast.success(`Deleted ${selectedLeads.length} leads`);
        loadLeads();
      } catch { toast.error('Failed to delete some leads'); }
    } else if (action === 'status') {
      setShowUpdateStatus(true);
      return;
    } else if (action === 'assign') {
      setShowBulkAssign(true);
      return;
    }
    setSelectedLeads([]);
  }, [selectedLeads, loadLeads]);

  const handleDeleteLead = useCallback(async (id: string) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await leadService.delete(Number(id));
      toast.success('Lead deleted');
      loadLeads();
    } catch { toast.error('Failed to delete lead'); }
  }, [loadLeads]);

  const handleOpenEditLead = useCallback((lead: Lead) => {
    setEditingLead(lead);
    setEditLead({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      priority: lead.priority,
      notes: lead.notes,
      status: lead.status === 'follow-up' ? 'follow_up' : lead.status,
      assignedStaff: lead.assignedStaff || '',
      nextFollowUp: lead.nextFollowUp ? lead.nextFollowUp.toISOString().split('T')[0] : '',
      membershipInterest: lead.membershipInterest || '',
      interestLevel: String(lead.interestLevel),
      leadScore: String(lead.leadScore),
    });
    setShowEditLead(true);
  }, []);

  const handleQuickAction = useCallback((lead: Lead, action: string) => {
    switch (action) {
      case 'call':
        window.open(`tel:${lead.phone}`);
        toast.success(`Calling ${lead.firstName} ${lead.lastName}`);
        break;
      case 'email':
        window.open(`mailto:${lead.email}`);
        toast.success(`Email opened for ${lead.firstName} ${lead.lastName}`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/${lead.phone.replace(/\s+/g, '').replace('+', '')}`);
        toast.success(`WhatsApp opened for ${lead.firstName} ${lead.lastName}`);
        break;
      case 'schedule':
        navigate('/follow-ups', { state: { prefillLeadId: Number(lead.id), prefillLeadName: `${lead.firstName} ${lead.lastName}`.trim() } });
        break;
    }
  }, [navigate]);

  const handleExportCSV = useCallback(() => {
    const csv = ['First Name,Last Name,Email,Phone,Status,Source,Priority,Assigned Staff,Created', ...filteredLeads.map(l =>
      `${l.firstName},${l.lastName},${l.email},${l.phone},${l.status},${l.source},${l.priority},${l.assignedStaff || ''},${l.createdDate.toISOString()}`
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Leads exported');
  }, [filteredLeads]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Leads Management</h1>
          <p className="text-muted-foreground">Comprehensive member management and operations.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowAddLead(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Lead
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Leads</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{kpis.totalLeads}</div>
            <p className="text-xs text-muted-foreground">All leads captured</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Converted</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.convertedLeads}</div>
            <p className="text-xs text-muted-foreground">Successful conversions</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Conversion Rate</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{kpis.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Lead-to-member rate</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Follow-ups Due</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.pendingFollowUps}</div>
            <p className="text-xs text-muted-foreground">Needs action today</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Hot Leads</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <Flag className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.hotLeads}</div>
            <p className="text-xs text-muted-foreground">High intent leads</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Avg Score</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpis.avgLeadScore.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Average lead score</p>
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
                  placeholder="Search leads by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="social-media">Social Media</SelectItem>
                  <SelectItem value="google-ads">Google Ads</SelectItem>
                  <SelectItem value="facebook-ads">Facebook Ads</SelectItem>
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
      {selectedLeads.length > 0 && (
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>{selectedLeads.length} leads selected</span>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('assign')}>
                Assign Staff
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('status')}>
                Update Status
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('delete')}>
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedLeads([])}>
                Clear
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      {activeView === 'table' ? (
        /* Table View */
        <div key="leads-table" className="animate-in fade-in-0 zoom-in-95 duration-200">
        <Card className={cardShell}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Leads List ({filteredLeads.length})</span>
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
                      checked={selectedLeads.length === filteredLeads.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLeads(filteredLeads.map(lead => lead.id));
                        } else {
                          setSelectedLeads([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Next Follow-up</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedLeads([...selectedLeads, lead.id]);
                          } else {
                            setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell onClick={() => handleLeadClick(lead)}>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={lead.avatar} />
                          <AvatarFallback>
                            {lead.firstName[0]}{lead.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                          <div className="flex items-center space-x-1">
                            {lead.tags.slice(0, 2).map(tag => (
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
                        <p className="text-sm">{lead.email}</p>
                        <p className="text-sm text-muted-foreground">{lead.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getSourceIcon(lead.source)}
                        <span className="capitalize">{lead.source.replace('-', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(lead.priority)}>
                        {lead.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{lead.leadScore}</span>
                        <Progress value={lead.leadScore} className="w-16 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {lead.assignedStaff?.split(' ').map(n => n[0]).join('') || 'UN'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{lead.assignedStaff || 'Unassigned'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.nextFollowUp ? (
                        <div className={`text-sm ${lead.nextFollowUp <= new Date() ? 'text-red-600 font-medium' : ''}`}>
                          {format(lead.nextFollowUp, 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not scheduled</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => handleQuickAction(lead, 'call')}>
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleQuickAction(lead, 'email')}>
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleQuickAction(lead, 'whatsapp')}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Follow Up" onClick={() => handleQuickAction(lead, 'schedule')}>
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleLeadClick(lead)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEditLead(lead)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteLead(lead.id)}>
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
        <div key="leads-kanban" className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in-0 zoom-in-95 duration-200">
          {Object.entries(leadsByStatus).map(([status, statusLeads]) => (
            <Card key={status} className="min-h-[600px] border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(status)}>
                      {status.replace('-', ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">({statusLeads.length})</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusLeads.map((lead) => (
                  <Card key={lead.id} className="p-3 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleLeadClick(lead)}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={lead.avatar} />
                            <AvatarFallback className="text-xs">
                              {lead.firstName[0]}{lead.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{lead.firstName} {lead.lastName}</p>
                          </div>
                        </div>
                        <Badge className={getPriorityColor(lead.priority)} variant="outline">
                          {lead.priority}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        <p>{lead.email}</p>
                        <p>{lead.phone}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          {getSourceIcon(lead.source)}
                          <span className="text-xs capitalize">{lead.source.replace('-', ' ')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-medium">{lead.leadScore}</span>
                          <Progress value={lead.leadScore} className="w-8 h-1" />
                        </div>
                      </div>

                      {lead.nextFollowUp && (
                        <div className={`text-xs ${lead.nextFollowUp <= new Date() ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                          Next: {format(lead.nextFollowUp, 'MMM dd')}
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAction(lead, 'call');
                          }}>
                            <Phone className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAction(lead, 'email');
                          }}>
                            <Mail className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAction(lead, 'whatsapp');
                          }}>
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Follow Up" onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAction(lead, 'schedule');
                          }}>
                            <CalendarIcon className="h-3 w-3" />
                          </Button>
                        </div>
                        {lead.assignedStaff && (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {lead.assignedStaff.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lead Detail Sheet */}
      <Sheet open={showLeadDetail} onOpenChange={setShowLeadDetail}>
        <SheetContent className="w-full sm:w-[600px] sm:max-w-none overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedLead.avatar} />
                    <AvatarFallback>
                      {selectedLead.firstName[0]}{selectedLead.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedLead.firstName} {selectedLead.lastName}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(selectedLead.status)}>
                        {selectedLead.status}
                      </Badge>
                      <Badge className={getPriorityColor(selectedLead.priority)}>
                        {selectedLead.priority}
                      </Badge>
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Email</Label>
                        <p className="font-medium">{selectedLead.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Phone</Label>
                        <p className="font-medium">{selectedLead.phone}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Preferred Contact</Label>
                        <p className="font-medium capitalize">{selectedLead.preferredContactMethod}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Lead Score</Label>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{selectedLead.leadScore}</span>
                          <Progress value={selectedLead.leadScore} className="w-20 h-2" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lead Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Lead Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Source</Label>
                        <div className="flex items-center space-x-2">
                          {getSourceIcon(selectedLead.source)}
                          <span className="font-medium capitalize">{selectedLead.source.replace('-', ' ')}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Interest Level</Label>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{selectedLead.interestLevel}/10</span>
                          <Progress value={selectedLead.interestLevel * 10} className="w-20 h-2" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Membership Interest</Label>
                        <p className="font-medium">{selectedLead.membershipInterest || 'Not specified'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Budget</Label>
                        <p className="font-medium">{selectedLead.budget ? `${currencyCode} ${selectedLead.budget}` : 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Assigned Staff</Label>
                      <p className="font-medium">{selectedLead.assignedStaff || 'Unassigned'}</p>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Tags</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedLead.tags.map(tag => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Notes</Label>
                      <p className="text-sm bg-muted/50 rounded-md p-3">{selectedLead.notes}</p>
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
                      <Button onClick={() => handleQuickAction(selectedLead, 'call')} className="justify-start">
                        <Phone className="mr-2 h-4 w-4" />
                        Call Lead
                      </Button>
                      <Button onClick={() => handleQuickAction(selectedLead, 'email')} className="justify-start">
                        <Mail className="mr-2 h-4 w-4" />
                        Send Email
                      </Button>
                      <Button onClick={() => handleQuickAction(selectedLead, 'whatsapp')} className="justify-start">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        WhatsApp
                      </Button>
                      <Button onClick={() => handleQuickAction(selectedLead, 'schedule')} className="justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Follow Up
                      </Button>
                      <Button onClick={() => { setStatusLeadId(selectedLead.id); setNewStatus(selectedLead.status === 'follow-up' ? 'follow_up' : selectedLead.status); setShowUpdateStatus(true); }} className="justify-start">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Update Status
                      </Button>
                      <Button variant="outline" onClick={() => { setInteractionLeadId(selectedLead.id); setNewInteraction({ type: 'call', staffMember: '', notes: '', outcome: 'positive', duration: '' }); setShowAddInteraction(true); }} className="justify-start col-span-2">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Interaction
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Interaction History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Interaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedLead.interactions.map((interaction) => (
                        <div key={interaction.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                          <div className="flex-shrink-0">
                            {interaction.type === 'call' && <Phone className="h-4 w-4 text-blue-600" />}
                            {interaction.type === 'email' && <Mail className="h-4 w-4 text-green-600" />}
                            {interaction.type === 'meeting' && <Users className="h-4 w-4 text-purple-600" />}
                            {interaction.type === 'whatsapp' && <MessageSquare className="h-4 w-4 text-green-600" />}
                            {interaction.type === 'note' && <FileText className="h-4 w-4 text-gray-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium capitalize">{interaction.type}</h4>
                              <span className="text-sm text-muted-foreground">
                                {format(interaction.date, 'MMM dd, yyyy HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{interaction.notes}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="text-xs text-muted-foreground">By: {interaction.staffMember}</span>
                              {interaction.outcome && (
                                <Badge variant="outline" className={
                                  interaction.outcome === 'positive' ? 'text-green-700 border-green-200' :
                                  interaction.outcome === 'negative' ? 'text-red-700 border-red-200' :
                                  'text-gray-700 border-gray-200'
                                }>
                                  {interaction.outcome}
                                </Badge>
                              )}
                              {interaction.duration && (
                                <span className="text-xs text-muted-foreground">{interaction.duration} min</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Follow-ups List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex justify-between items-center">
                      Scheduled Follow-ups
                      <Badge variant="outline" className="ml-2">
                        {selectedLead.followUps?.length || 0}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedLead.followUps && selectedLead.followUps.length > 0 ? (
                        selectedLead.followUps.map((fu) => (
                          <div key={fu.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                            <div className="flex-shrink-0">
                              {fu.type === 'call' && <Phone className="h-4 w-4 text-blue-600" />}
                              {fu.type === 'email' && <Mail className="h-4 w-4 text-green-600" />}
                              {fu.type === 'meeting' && <Users className="h-4 w-4 text-purple-600" />}
                              {fu.type === 'whatsapp' && <MessageSquare className="h-4 w-4 text-green-600" />}
                              {(!['call', 'email', 'meeting', 'whatsapp'].includes(fu.type)) && <CalendarIcon className="h-4 w-4 text-gray-600" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{fu.subject}</h4>
                                <span className="text-sm text-muted-foreground">
                                  {format(fu.dueDate, 'MMM dd, yyyy')} {fu.scheduledTime || ''}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{fu.notes || 'No notes provided'}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-xs text-muted-foreground">Assigned: {fu.assignedStaff}</span>
                                <Badge variant="outline" className={
                                  fu.status === 'completed' ? 'text-green-700 border-green-200' :
                                  fu.status === 'pending' ? 'text-yellow-700 border-yellow-200' :
                                  fu.status === 'overdue' ? 'text-red-700 border-red-200' :
                                  'text-gray-700 border-gray-200'
                                }>
                                  {fu.status}
                                </Badge>
                                <Badge variant="outline" className={
                                  fu.priority === 'high' ? 'text-red-700 border-red-200' :
                                  fu.priority === 'medium' ? 'text-yellow-700 border-yellow-200' :
                                  'text-blue-700 border-blue-200'
                                }>
                                  {fu.priority}
                                </Badge>
                                {fu.estimatedDuration && (
                                  <span className="text-xs text-muted-foreground">{fu.estimatedDuration} min</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4 text-sm">No follow-ups scheduled for this lead.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add New Lead Dialog */}
      <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Create a new lead entry in the system</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" placeholder="Enter first name" value={newLead.firstName} onChange={e => setNewLead(p => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" placeholder="Enter last name" value={newLead.lastName} onChange={e => setNewLead(p => ({ ...p, lastName: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email address" value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="Enter phone number" value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="source">Lead Source</Label>
              <Select value={newLead.source} onValueChange={v => setNewLead(p => ({ ...p, source: v }))}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="social-media">Social Media</SelectItem>
                  <SelectItem value="google-ads">Google Ads</SelectItem>
                  <SelectItem value="facebook-ads">Facebook Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={newLead.priority} onValueChange={v => setNewLead(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Enter any additional notes about this lead" value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLead(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                await leadService.create({ firstName: newLead.firstName, lastName: newLead.lastName || undefined, email: newLead.email || undefined, phone: newLead.phone || undefined, source: newLead.source, priority: newLead.priority, notes: newLead.notes || undefined, status: 'new' });
                toast.success('Lead added successfully');
                setNewLead({ firstName: '', lastName: '', email: '', phone: '', source: 'website', priority: 'medium', notes: '' });
                setShowAddLead(false);
                await loadLeads();
              } catch (error) {
                console.error("Add Lead Error:", error);
                toast.error('Failed to add lead');
              }
            }}>
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Lead Dialog */}
      <Dialog open={showEditLead} onOpenChange={setShowEditLead}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>Update lead information</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input value={editLead.firstName} onChange={e => setEditLead(p => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={editLead.lastName} onChange={e => setEditLead(p => ({ ...p, lastName: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editLead.email} onChange={e => setEditLead(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editLead.phone} onChange={e => setEditLead(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editLead.status} onValueChange={v => setEditLead(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={editLead.priority} onValueChange={v => setEditLead(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={editLead.source} onValueChange={v => setEditLead(p => ({ ...p, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="social-media">Social Media</SelectItem>
                  <SelectItem value="google-ads">Google Ads</SelectItem>
                  <SelectItem value="facebook-ads">Facebook Ads</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned Staff</Label>
              <Select value={editLead.assignedStaff} onValueChange={v => setEditLead(p => ({ ...p, assignedStaff: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {staffMembers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Next Follow-up</Label>
              <Input type="date" value={editLead.nextFollowUp} onChange={e => setEditLead(p => ({ ...p, nextFollowUp: e.target.value }))} />
            </div>
            <div>
              <Label>Membership Interest</Label>
              <Input value={editLead.membershipInterest} onChange={e => setEditLead(p => ({ ...p, membershipInterest: e.target.value }))} placeholder="e.g. Premium Annual" />
            </div>
            <div>
              <Label>Interest Level (1-10)</Label>
              <Input type="number" min="1" max="10" value={editLead.interestLevel} onChange={e => setEditLead(p => ({ ...p, interestLevel: e.target.value }))} />
            </div>
            <div>
              <Label>Lead Score (1-100)</Label>
              <Input type="number" min="1" max="100" value={editLead.leadScore} onChange={e => setEditLead(p => ({ ...p, leadScore: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={editLead.notes} onChange={e => setEditLead(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditLead(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!editingLead) return;
              try {
                await leadService.update(Number(editingLead.id), {
                  firstName: editLead.firstName,
                  lastName: editLead.lastName || undefined,
                  email: editLead.email || undefined,
                  phone: editLead.phone || undefined,
                  status: editLead.status,
                  source: editLead.source,
                  priority: editLead.priority,
                  notes: editLead.notes || undefined,
                  assignedStaff: editLead.assignedStaff || undefined,
                  nextFollowUp: editLead.nextFollowUp ? (editLead.nextFollowUp.includes('T') ? editLead.nextFollowUp : `${editLead.nextFollowUp}T00:00:00`) : undefined,
                  membershipInterest: editLead.membershipInterest || undefined,
                  interestLevel: editLead.interestLevel ? Number(editLead.interestLevel) : undefined,
                  leadScore: editLead.leadScore ? Number(editLead.leadScore) : undefined,
                });
                toast.success('Lead updated');
                setShowEditLead(false);
                loadLeads();
              } catch { toast.error('Failed to update lead'); }
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Interaction Dialog */}
      <Dialog open={showAddInteraction} onOpenChange={setShowAddInteraction}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Interaction</DialogTitle>
            <DialogDescription>Record a new interaction with this lead</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={newInteraction.type} onValueChange={v => setNewInteraction(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Staff Member</Label>
              <Select value={newInteraction.staffMember} onValueChange={v => setNewInteraction(p => ({ ...p, staffMember: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {staffMembers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Outcome</Label>
              <Select value={newInteraction.outcome} onValueChange={v => setNewInteraction(p => ({ ...p, outcome: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (min, optional)</Label>
              <Input type="number" value={newInteraction.duration} onChange={e => setNewInteraction(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 15" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={newInteraction.notes} onChange={e => setNewInteraction(p => ({ ...p, notes: e.target.value }))} placeholder="What was discussed?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddInteraction(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!interactionLeadId || !newInteraction.staffMember || !newInteraction.notes) {
                toast.error('Staff member and notes are required');
                return;
              }
              await handleAddInteraction(interactionLeadId, {
                type: newInteraction.type as any,
                date: new Date(),
                staffMember: newInteraction.staffMember,
                notes: newInteraction.notes,
                outcome: newInteraction.outcome as any,
                duration: newInteraction.duration ? Number(newInteraction.duration) : undefined,
              });
              setShowAddInteraction(false);
            }}>Add Interaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showUpdateStatus} onOpenChange={setShowUpdateStatus}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Lead Status</DialogTitle>
            <DialogDescription>Change the status of selected lead(s)</DialogDescription>
          </DialogHeader>
          <div>
            <Label>New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateStatus(false)}>Cancel</Button>
            <Button onClick={async () => {
              const ids = statusLeadId ? [statusLeadId] : selectedLeads;
              try {
                await Promise.all(ids.map(id => leadService.updateStatus(Number(id), newStatus)));
                toast.success(`Status updated for ${ids.length} lead(s)`);
                setShowUpdateStatus(false);
                setStatusLeadId(null);
                setSelectedLeads([]);
                // Marking a lead "converted" only flips its status — it doesn't create a Member.
                // For a single lead, hand off straight into Add Member pre-filled with their info
                // so staff aren't left to re-type everything from scratch.
                if (newStatus === 'converted' && ids.length === 1) {
                  const convertedLead = displayLeads.find(l => l.id === ids[0]);
                  if (convertedLead) {
                    navigate('/add-member', {
                      state: {
                        prefillLead: {
                          leadId: convertedLead.id,
                          firstName: convertedLead.firstName,
                          lastName: convertedLead.lastName,
                          email: convertedLead.email,
                          phone: convertedLead.phone,
                        },
                      },
                    });
                    return;
                  }
                }
                loadLeads();
              } catch { toast.error('Failed to update status'); }
            }}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Staff Dialog */}
      <Dialog open={showBulkAssign} onOpenChange={setShowBulkAssign}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Staff</DialogTitle>
            <DialogDescription>Assign {selectedLeads.length} selected lead(s) to a staff member</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Staff Member</Label>
            <Select value={bulkAssignStaff} onValueChange={setBulkAssignStaff}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {staffMembers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAssign(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!bulkAssignStaff) {
                toast.error('Please select a staff member');
                return;
              }
              try {
                await Promise.all(selectedLeads.map(id => {
                  const lead = displayLeads.find(l => l.id === id);
                  return leadService.update(Number(id), { firstName: lead?.firstName || '', assignedStaff: bulkAssignStaff });
                }));
                toast.success(`Assigned ${selectedLeads.length} lead(s) to ${bulkAssignStaff}`);
                setShowBulkAssign(false);
                setBulkAssignStaff('');
                setSelectedLeads([]);
                loadLeads();
              } catch { toast.error('Failed to assign staff'); }
            }}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

