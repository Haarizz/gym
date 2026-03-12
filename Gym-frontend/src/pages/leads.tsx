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
  Upload, 
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

interface Staff {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  leadsAssigned: number;
  leadsConverted: number;
}

export function Leads() {
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
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [sortField, setSortField] = useState<keyof Lead>('createdDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sample data - in real app this would come from your backend
  const staffMembers: Staff[] = [
    { id: '1', name: 'Sarah Johnson', role: 'Sales Manager', leadsAssigned: 45, leadsConverted: 28 },
    { id: '2', name: 'Ahmed Hassan', role: 'Membership Consultant', leadsAssigned: 38, leadsConverted: 22 },
    { id: '3', name: 'Maria Rodriguez', role: 'Lead Specialist', leadsAssigned: 42, leadsConverted: 31 },
    { id: '4', name: 'David Wilson', role: 'Sales Associate', leadsAssigned: 35, leadsConverted: 18 }
  ];

  const leads: Lead[] = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@email.com',
      phone: '+971 50 123 4567',
      status: 'new',
      source: 'website',
      priority: 'high',
      assignedStaff: 'Sarah Johnson',
      nextFollowUp: new Date('2024-03-22'),
      createdDate: new Date('2024-03-20'),
      interestLevel: 8,
      notes: 'Interested in premium membership. Looking for personal training options.',
      tags: ['premium', 'personal-training'],
      membershipInterest: 'Premium Annual',
      budget: 2000,
      preferredContactMethod: 'phone',
      leadScore: 85,
      interactions: [
        {
          id: '1',
          type: 'email',
          date: new Date('2024-03-20'),
          staffMember: 'Sarah Johnson',
          notes: 'Initial inquiry about membership options',
          outcome: 'positive'
        }
      ]
    },
    {
      id: '2',
      firstName: 'Lisa',
      lastName: 'Chen',
      email: 'lisa.chen@email.com',
      phone: '+971 55 987 6543',
      status: 'contacted',
      source: 'referral',
      priority: 'medium',
      assignedStaff: 'Ahmed Hassan',
      nextFollowUp: new Date('2024-03-23'),
      createdDate: new Date('2024-03-18'),
      lastContactDate: new Date('2024-03-21'),
      interestLevel: 6,
      notes: 'Referred by existing member. Interested in group classes.',
      tags: ['group-classes', 'referral'],
      membershipInterest: 'Standard Monthly',
      budget: 500,
      preferredContactMethod: 'email',
      leadScore: 72,
      interactions: [
        {
          id: '2',
          type: 'call',
          date: new Date('2024-03-21'),
          staffMember: 'Ahmed Hassan',
          notes: 'Discussed membership options and class schedules',
          outcome: 'positive',
          duration: 15
        }
      ]
    },
    {
      id: '3',
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'michael.j@email.com',
      phone: '+971 52 456 7890',
      status: 'follow-up',
      source: 'walk-in',
      priority: 'high',
      assignedStaff: 'Maria Rodriguez',
      nextFollowUp: new Date('2024-03-21'),
      createdDate: new Date('2024-03-15'),
      lastContactDate: new Date('2024-03-19'),
      interestLevel: 9,
      notes: 'Very motivated. Recent gym tour. Needs to check schedule.',
      tags: ['tour-completed', 'motivated'],
      membershipInterest: 'Premium Monthly',
      budget: 800,
      preferredContactMethod: 'whatsapp',
      leadScore: 92,
      interactions: [
        {
          id: '3',
          type: 'meeting',
          date: new Date('2024-03-19'),
          staffMember: 'Maria Rodriguez',
          notes: 'Facility tour and membership consultation',
          outcome: 'positive',
          duration: 45
        }
      ]
    },
    {
      id: '4',
      firstName: 'Sarah',
      lastName: 'Williams',
      email: 'sarah.w@email.com',
      phone: '+971 56 789 0123',
      status: 'converted',
      source: 'social-media',
      priority: 'medium',
      assignedStaff: 'David Wilson',
      createdDate: new Date('2024-03-10'),
      lastContactDate: new Date('2024-03-20'),
      interestLevel: 7,
      notes: 'Signed up for Standard membership. Very happy with the facility.',
      tags: ['converted', 'social-media'],
      membershipInterest: 'Standard Annual',
      budget: 1200,
      preferredContactMethod: 'email',
      leadScore: 88,
      interactions: [
        {
          id: '4',
          type: 'call',
          date: new Date('2024-03-20'),
          staffMember: 'David Wilson',
          notes: 'Completed membership signup process',
          outcome: 'positive',
          duration: 20
        }
      ]
    },
    {
      id: '5',
      firstName: 'Ahmed',
      lastName: 'Al-Rashid',
      email: 'ahmed.r@email.com',
      phone: '+971 54 345 6789',
      status: 'lost',
      source: 'google-ads',
      priority: 'low',
      assignedStaff: 'Sarah Johnson',
      createdDate: new Date('2024-03-05'),
      lastContactDate: new Date('2024-03-12'),
      interestLevel: 3,
      notes: 'Price-sensitive. Found cheaper alternative.',
      tags: ['price-sensitive', 'lost'],
      membershipInterest: 'Basic Monthly',
      budget: 200,
      preferredContactMethod: 'phone',
      leadScore: 25,
      interactions: [
        {
          id: '5',
          type: 'call',
          date: new Date('2024-03-12'),
          staffMember: 'Sarah Johnson',
          notes: 'Follow-up call - decided not to proceed',
          outcome: 'negative',
          duration: 8
        }
      ]
    }
  ];

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(lead => lead.status === 'converted').length;
    const pendingFollowUps = leads.filter(lead => 
      lead.nextFollowUp && lead.nextFollowUp <= new Date() && 
      !['converted', 'lost'].includes(lead.status)
    ).length;
    const hotLeads = leads.filter(lead => lead.priority === 'high' && !['converted', 'lost'].includes(lead.status)).length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const avgLeadScore = leads.length > 0 ? leads.reduce((sum, lead) => sum + lead.leadScore, 0) / leads.length : 0;

    return {
      totalLeads,
      convertedLeads,
      pendingFollowUps,
      hotLeads,
      conversionRate,
      avgLeadScore
    };
  }, [leads]);

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let filtered = leads.filter(lead => {
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
  }, [leads, searchTerm, statusFilter, sourceFilter, staffFilter, priorityFilter, sortField, sortDirection]);

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

  const handleAddInteraction = useCallback((leadId: string, interaction: Omit<LeadInteraction, 'id'>) => {
    // In real app, this would update the backend
    toast.success('Interaction added successfully');
  }, []);

  const handleUpdateLeadStatus = useCallback((leadId: string, newStatus: Lead['status']) => {
    // In real app, this would update the backend
    toast.success(`Lead status updated to ${newStatus}`);
  }, []);

  const handleBulkAction = useCallback((action: string) => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads first');
      return;
    }
    
    switch (action) {
      case 'assign':
        toast.success(`Assigned ${selectedLeads.length} leads`);
        break;
      case 'status':
        toast.success(`Updated status for ${selectedLeads.length} leads`);
        break;
      case 'delete':
        toast.success(`Deleted ${selectedLeads.length} leads`);
        break;
      default:
        toast.info(`Action: ${action} for ${selectedLeads.length} leads`);
    }
    setSelectedLeads([]);
    setShowBulkActions(false);
  }, [selectedLeads]);

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
        toast.info('Follow-up scheduling feature coming soon!');
        break;
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Leads Management</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage potential member leads through the conversion funnel
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setShowBulkActions(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setShowAddLead(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Lead
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{kpis.totalLeads}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Converted</p>
                <p className="text-2xl font-bold text-green-600">{kpis.convertedLeads}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-purple-600">{kpis.conversionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Follow-ups Due</p>
                <p className="text-2xl font-bold text-orange-600">{kpis.pendingFollowUps}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hot Leads</p>
                <p className="text-2xl font-bold text-red-600">{kpis.hotLeads}</p>
              </div>
              <Flag className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold text-indigo-600">{kpis.avgLeadScore.toFixed(0)}</p>
              </div>
              <Target className="h-8 w-8 text-indigo-600" />
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
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{selectedLeads.length} leads selected</span>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('assign')}>
                Assign Staff
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('status')}>
                Update Status
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')}>
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
        <Card>
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
              <TableHeader>
                <TableRow>
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
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
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
                        <Button size="sm" variant="ghost" onClick={() => handleLeadClick(lead)}>
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
          {Object.entries(leadsByStatus).map(([status, statusLeads]) => (
            <Card key={status} className="min-h-[600px]">
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
                  <Card key={lead.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer"
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
                        <p className="font-medium">{selectedLead.budget ? `${selectedLead.budget} AED` : 'Not specified'}</p>
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
                        Schedule Follow-up
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
            <DialogDescription>
              Create a new lead entry in the system
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" placeholder="Enter first name" />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" placeholder="Enter last name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email address" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="Enter phone number" />
            </div>
            <div>
              <Label htmlFor="source">Lead Source</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
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
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Enter any additional notes about this lead" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLead(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success('Lead added successfully');
              setShowAddLead(false);
            }}>
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

