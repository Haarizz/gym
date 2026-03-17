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
  Play, 
  Pause, 
  Edit, 
  Copy, 
  Trash2, 
  MoreHorizontal, 
  Settings, 
  Zap, 
  Clock, 
  Users, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  Mail, 
  MessageSquare, 
  Bell, 
  MessageCircle, 
  Target, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Eye, 
  FileText, 
  Star, 
  Heart, 
  Gift, 
  CreditCard, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Cake, 
  ClockIcon, 
  RefreshCw, 
  ArrowRight, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  X, 
  Download, 
  Upload, 
  History, 
  Layers, 
  List, 
  Grid, 
  SortAsc, 
  SortDesc, 
  Calendar as CalendarAlt, 
  CalendarDays, 
  CalendarCheck, 
  Timer, 
  Workflow, 
  GitBranch, 
  ArrowDown, 
  ArrowUp, 
  RotateCcw, 
  Repeat, 
  Hash, 
  AtSign, 
  Smartphone, 
  Headphones, 
  Volume2, 
  Send, 
  Share, 
  Link, 
  ExternalLink, 
  PlayCircle, 
  PauseCircle, 
  StopCircle, 
  SkipForward, 
  Rewind, 
  FastForward, 
  Calendar as CalendarSimple,
  Sparkles,
  Crown,
  MapPin,
  Building,
  Home,
  Coffee,
  Dumbbell,
  Medal,
  Award,
  PartyPopper,
  ShoppingBag,
  Package,
  Receipt,
  Wallet,
  DollarSign,
  Percent,
  Flame,
  Mountain,
  TrendingDown,
  Flag,
  Bookmark,
  Archive,
  Folder,
  FileX,
  AlertCircle,
  Info,
  HelpCircle,
  Check,
  Loader2
} from 'lucide-react';
import { toast } from "sonner";
import { format, addDays, isAfter, isBefore, isToday, isTomorrow, isYesterday, addWeeks, subDays, addHours, addMinutes } from "date-fns";
import { cn } from "../components/ui/utils";

interface AutomationTrigger {
  id: string;
  name: string;
  description: string;
  category: 'membership' | 'engagement' | 'billing' | 'birthday' | 'classes' | 'wellness';
  icon: React.ComponentType<any>;
  parameters?: {
    name: string;
    type: 'number' | 'select' | 'date' | 'boolean';
    options?: string[];
    defaultValue?: any;
  }[];
}

interface AutomationAction {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'sms' | 'whatsapp' | 'in-app' | 'push' | 'task';
  icon: React.ComponentType<any>;
  requiresTemplate: boolean;
  supportsMergeFields: boolean;
}

interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'draft' | 'error';
  trigger: {
    type: string;
    parameters: Record<string, any>;
  };
  action: {
    type: string;
    template?: string;
    subject?: string;
    content: string;
    delay?: number; // in minutes
    delayUnit?: 'minutes' | 'hours' | 'days';
  };
  conditions?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  }[];
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  createdDate: Date;
  lastRun?: Date;
  nextRun?: Date;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  membersEngaged: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  createdBy: string;
  isSystem: boolean;
}

interface AutomationTemplate {
  id: string;
  name: string;
  category: string;
  trigger: string;
  action: string;
  subject: string;
  content: string;
  description: string;
  usageCount: number;
}

export function Automations() {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeView, setActiveView] = useState<'grid' | 'table'>('grid');
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null);
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [showWorkflowDetail, setShowWorkflowDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof AutomationWorkflow>('createdDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  // Workflow builder state
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowBuilder, setWorkflowBuilder] = useState({
    name: '',
    description: '',
    trigger: { type: '', parameters: {} },
    action: { type: '', content: '', subject: '', delay: 0, delayUnit: 'hours' as 'minutes' | 'hours' | 'days' },
    conditions: [],
    frequency: 'once' as 'once' | 'daily' | 'weekly' | 'monthly'
  });

  // Available triggers
  const automationTriggers: AutomationTrigger[] = [
    {
      id: 'membership_expiry',
      name: 'Membership Expiry',
      description: 'Trigger when membership is about to expire',
      category: 'membership',
      icon: AlertTriangle,
      parameters: [
        { name: 'days_before', type: 'number', defaultValue: 7 },
        { name: 'send_multiple', type: 'boolean', defaultValue: true }
      ]
    },
    {
      id: 'new_signup',
      name: 'New Member Signup',
      description: 'Trigger when a new member joins',
      category: 'membership',
      icon: UserPlus,
      parameters: [
        { name: 'delay_hours', type: 'number', defaultValue: 1 }
      ]
    },
    {
      id: 'missed_workout',
      name: 'Missed Workout',
      description: 'Trigger when member misses scheduled workouts',
      category: 'engagement',
      icon: UserX,
      parameters: [
        { name: 'consecutive_days', type: 'number', defaultValue: 3 },
        { name: 'workout_type', type: 'select', options: ['Any', 'Personal Training', 'Group Classes'] }
      ]
    },
    {
      id: 'birthday',
      name: 'Member Birthday',
      description: 'Trigger on member\'s birthday',
      category: 'birthday',
      icon: Cake,
      parameters: [
        { name: 'days_before', type: 'number', defaultValue: 0 },
        { name: 'include_offer', type: 'boolean', defaultValue: true }
      ]
    },
    {
      id: 'payment_failed',
      name: 'Payment Failed',
      description: 'Trigger when payment fails',
      category: 'billing',
      icon: CreditCard,
      parameters: [
        { name: 'retry_attempts', type: 'number', defaultValue: 3 }
      ]
    },
    {
      id: 'low_attendance',
      name: 'Low Attendance',
      description: 'Trigger when member attendance drops',
      category: 'engagement',
      icon: TrendingDown,
      parameters: [
        { name: 'threshold_days', type: 'number', defaultValue: 14 },
        { name: 'previous_frequency', type: 'select', options: ['Daily', 'Weekly', 'Bi-weekly'] }
      ]
    },
    {
      id: 'class_reminder',
      name: 'Class Reminder',
      description: 'Remind members about upcoming classes',
      category: 'classes',
      icon: Clock,
      parameters: [
        { name: 'hours_before', type: 'number', defaultValue: 2 },
        { name: 'class_types', type: 'select', options: ['All', 'Yoga', 'HIIT', 'Pilates', 'Zumba'] }
      ]
    },
    {
      id: 'goal_achieved',
      name: 'Goal Achievement',
      description: 'Celebrate when member achieves fitness goals',
      category: 'wellness',
      icon: Medal,
      parameters: [
        { name: 'goal_types', type: 'select', options: ['Weight Loss', 'Strength', 'Endurance', 'All'] }
      ]
    }
  ];

  // Available actions
  const automationActions: AutomationAction[] = [
    {
      id: 'send_email',
      name: 'Send Email',
      description: 'Send personalized email to member',
      type: 'email',
      icon: Mail,
      requiresTemplate: true,
      supportsMergeFields: true
    },
    {
      id: 'send_sms',
      name: 'Send SMS',
      description: 'Send text message to member',
      type: 'sms',
      icon: MessageSquare,
      requiresTemplate: true,
      supportsMergeFields: true
    },
    {
      id: 'send_whatsapp',
      name: 'Send WhatsApp',
      description: 'Send WhatsApp message to member',
      type: 'whatsapp',
      icon: MessageCircle,
      requiresTemplate: true,
      supportsMergeFields: true
    },
    {
      id: 'send_push',
      name: 'Push Notification',
      description: 'Send push notification to mobile app',
      type: 'push',
      icon: Smartphone,
      requiresTemplate: false,
      supportsMergeFields: true
    },
    {
      id: 'send_in_app',
      name: 'In-App Notification',
      description: 'Show notification in member portal',
      type: 'in-app',
      icon: Bell,
      requiresTemplate: false,
      supportsMergeFields: true
    },
    {
      id: 'create_task',
      name: 'Create Task',
      description: 'Create task for staff member',
      type: 'task',
      icon: CheckCircle,
      requiresTemplate: false,
      supportsMergeFields: true
    }
  ];

  // Sample workflows
  const workflows: AutomationWorkflow[] = [
    {
      id: '1',
      name: 'Welcome New Members',
      description: 'Send welcome email sequence to new members',
      status: 'active',
      trigger: { type: 'new_signup', parameters: { delay_hours: 1 } },
      action: { 
        type: 'send_email', 
        subject: 'Welcome to GymBios!',
        content: 'Welcome {FirstName} to our fitness family! We\'re excited to help you achieve your fitness goals.',
        delay: 1,
        delayUnit: 'hours'
      },
      frequency: 'once',
      createdDate: new Date('2024-01-15'),
      lastRun: new Date('2024-03-20'),
      nextRun: undefined,
      totalRuns: 145,
      successfulRuns: 142,
      failedRuns: 3,
      membersEngaged: 145,
      openRate: 85.2,
      clickRate: 23.4,
      conversionRate: 12.1,
      createdBy: 'System',
      isSystem: true
    },
    {
      id: '2',
      name: 'Membership Renewal Reminder',
      description: 'Remind members about upcoming membership expiry',
      status: 'active',
      trigger: { type: 'membership_expiry', parameters: { days_before: 7 } },
      action: { 
        type: 'send_email', 
        subject: 'Your membership expires soon',
        content: 'Hi {FirstName}, your {MembershipPlan} membership expires on {ExpiryDate}. Renew now to continue your fitness journey!',
        delay: 0,
        delayUnit: 'hours'
      },
      frequency: 'once',
      createdDate: new Date('2024-01-20'),
      lastRun: new Date('2024-03-19'),
      nextRun: addDays(new Date(), 2),
      totalRuns: 89,
      successfulRuns: 87,
      failedRuns: 2,
      membersEngaged: 89,
      openRate: 92.1,
      clickRate: 45.6,
      conversionRate: 67.4,
      createdBy: 'Sarah Johnson',
      isSystem: false
    },
    {
      id: '3',
      name: 'Missed Workout Check-in',
      description: 'Reach out to members who haven\'t visited in a week',
      status: 'active',
      trigger: { type: 'missed_workout', parameters: { consecutive_days: 7 } },
      action: { 
        type: 'send_sms', 
        content: 'Hi {FirstName}! We miss you at the gym. Your next workout is just a click away. See you soon! 💪',
        delay: 24,
        delayUnit: 'hours'
      },
      frequency: 'once',
      createdDate: new Date('2024-02-01'),
      lastRun: new Date('2024-03-18'),
      nextRun: new Date(),
      totalRuns: 56,
      successfulRuns: 54,
      failedRuns: 2,
      membersEngaged: 56,
      openRate: 95.5,
      clickRate: 28.6,
      conversionRate: 35.7,
      createdBy: 'Ahmed Hassan',
      isSystem: false
    },
    {
      id: '4',
      name: 'Birthday Celebration',
      description: 'Send birthday wishes and special offers',
      status: 'active',
      trigger: { type: 'birthday', parameters: { days_before: 0, include_offer: true } },
      action: { 
        type: 'send_whatsapp', 
        content: '🎉 Happy Birthday {FirstName}! Celebrate with us - enjoy 20% off personal training sessions this month!',
        delay: 0,
        delayUnit: 'hours'
      },
      frequency: 'once',
      createdDate: new Date('2024-01-10'),
      lastRun: new Date('2024-03-15'),
      nextRun: addDays(new Date(), 5),
      totalRuns: 23,
      successfulRuns: 23,
      failedRuns: 0,
      membersEngaged: 23,
      openRate: 100,
      clickRate: 78.3,
      conversionRate: 52.2,
      createdBy: 'Maria Rodriguez',
      isSystem: false
    },
    {
      id: '5',
      name: 'Class Reminder',
      description: 'Remind members about their booked classes',
      status: 'paused',
      trigger: { type: 'class_reminder', parameters: { hours_before: 2 } },
      action: { 
        type: 'send_push', 
        content: 'Your {ClassName} class starts in 2 hours! Don\'t forget your water bottle 💧',
        delay: 0,
        delayUnit: 'hours'
      },
      frequency: 'daily',
      createdDate: new Date('2024-02-15'),
      lastRun: new Date('2024-03-10'),
      nextRun: undefined,
      totalRuns: 234,
      successfulRuns: 231,
      failedRuns: 3,
      membersEngaged: 234,
      openRate: 88.9,
      clickRate: 12.3,
      conversionRate: 89.7,
      createdBy: 'David Wilson',
      isSystem: false
    }
  ];

  // Sample templates
  const automationTemplates: AutomationTemplate[] = [
    {
      id: '1',
      name: 'Welcome Email',
      category: 'Onboarding',
      trigger: 'new_signup',
      action: 'send_email',
      subject: 'Welcome to {GymName}!',
      content: 'Hi {FirstName}, welcome to our fitness family! We\'re excited to help you achieve your fitness goals.',
      description: 'Standard welcome email for new members',
      usageCount: 145
    },
    {
      id: '2',
      name: 'Renewal Reminder',
      category: 'Retention',
      trigger: 'membership_expiry',
      action: 'send_email',
      subject: 'Your membership expires soon',
      content: 'Hi {FirstName}, your {MembershipPlan} membership expires on {ExpiryDate}. Renew now!',
      description: 'Membership renewal reminder email',
      usageCount: 89
    },
    {
      id: '3',
      name: 'Comeback Message',
      category: 'Re-engagement',
      trigger: 'missed_workout',
      action: 'send_sms',
      subject: '',
      content: 'Hi {FirstName}! We miss you at the gym. Your fitness journey awaits! 💪',
      description: 'SMS to re-engage inactive members',
      usageCount: 67
    }
  ];

  // Calculate analytics
  const analytics = useMemo(() => {
    const activeWorkflows = workflows.filter(w => w.status === 'active').length;
    const totalMembersEngaged = workflows.reduce((sum, w) => sum + w.membersEngaged, 0);
    const totalRuns = workflows.reduce((sum, w) => sum + w.totalRuns, 0);
    const successfulRuns = workflows.reduce((sum, w) => sum + w.successfulRuns, 0);
    const avgOpenRate = workflows.length > 0 ? 
      workflows.reduce((sum, w) => sum + w.openRate, 0) / workflows.length : 0;
    const avgConversionRate = workflows.length > 0 ? 
      workflows.reduce((sum, w) => sum + w.conversionRate, 0) / workflows.length : 0;
    const pendingTasks = workflows.filter(w => w.nextRun && w.nextRun <= addHours(new Date(), 24)).length;
    const errorCount = workflows.filter(w => w.status === 'error').length;

    return {
      activeWorkflows,
      totalMembersEngaged,
      totalRuns,
      successRate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0,
      avgOpenRate,
      avgConversionRate,
      pendingTasks,
      errorCount
    };
  }, [workflows]);

  // Filter workflows
  const filteredWorkflows = useMemo(() => {
    let filtered = workflows.filter(workflow => {
      const matchesSearch = searchTerm === '' || 
        workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
      const matchesTrigger = triggerFilter === 'all' || workflow.trigger.type === triggerFilter;
      const matchesAction = actionFilter === 'all' || workflow.action.type === actionFilter;
      
      return matchesSearch && matchesStatus && matchesTrigger && matchesAction;
    });

    // Sort workflows
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
  }, [workflows, searchTerm, statusFilter, triggerFilter, actionFilter, sortField, sortDirection]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayCircle className="h-4 w-4 text-green-600" />;
      case 'paused': return <PauseCircle className="h-4 w-4 text-yellow-600" />;
      case 'draft': return <FileText className="h-4 w-4 text-gray-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTriggerIcon = (triggerType: string) => {
    const trigger = automationTriggers.find(t => t.id === triggerType);
    if (trigger) {
      const IconComponent = trigger.icon;
      return <IconComponent className="h-4 w-4" />;
    }
    return <Zap className="h-4 w-4" />;
  };

  const getActionIcon = (actionType: string) => {
    const action = automationActions.find(a => a.id === actionType);
    if (action) {
      const IconComponent = action.icon;
      return <IconComponent className="h-4 w-4" />;
    }
    return <Send className="h-4 w-4" />;
  };

  const handleWorkflowClick = useCallback((workflow: AutomationWorkflow) => {
    setSelectedWorkflow(workflow);
    setShowWorkflowDetail(true);
  }, []);

  const handleQuickAction = useCallback((workflow: AutomationWorkflow, action: string) => {
    switch (action) {
      case 'play':
        toast.success(`Automation "${workflow.name}" activated`);
        break;
      case 'pause':
        toast.success(`Automation "${workflow.name}" paused`);
        break;
      case 'edit':
        setSelectedWorkflow(workflow);
        setShowCreateWorkflow(true);
        break;
      case 'duplicate':
        toast.success(`Created duplicate of "${workflow.name}"`);
        break;
      case 'delete':
        toast.success(`Deleted automation "${workflow.name}"`);
        break;
      default:
        toast.info(`Action: ${action} for "${workflow.name}"`);
    }
  }, []);

  const handleCreateWorkflow = useCallback(() => {
    setWorkflowBuilder({
      name: '',
      description: '',
      trigger: { type: '', parameters: {} },
      action: { type: '', content: '', subject: '', delay: 0, delayUnit: 'hours' },
      conditions: [],
      frequency: 'once'
    });
    setCurrentStep(1);
    setShowCreateWorkflow(true);
  }, []);

  const handleStepNext = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handleStepPrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSaveWorkflow = useCallback(() => {
    if (!workflowBuilder.name || !workflowBuilder.trigger.type || !workflowBuilder.action.type) {
      toast.error('Please complete all required fields');
      return;
    }

    toast.success('Automation workflow created successfully');
    setShowCreateWorkflow(false);
    setCurrentStep(1);
  }, [workflowBuilder]);

  const renderWorkflowBuilderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 1: Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="workflow-name">Workflow Name</Label>
                  <Input
                    id="workflow-name"
                    placeholder="Enter workflow name"
                    value={workflowBuilder.name}
                    onChange={(e) => setWorkflowBuilder(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="workflow-description">Description</Label>
                  <Textarea
                    id="workflow-description"
                    placeholder="Describe what this automation does"
                    value={workflowBuilder.description}
                    onChange={(e) => setWorkflowBuilder(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="workflow-frequency">Frequency</Label>
                  <Select value={workflowBuilder.frequency} onValueChange={(value: any) => setWorkflowBuilder(prev => ({ ...prev, frequency: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Once per member</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 2: Select Trigger</h3>
              <p className="text-muted-foreground mb-4">Choose what event will start this automation</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {automationTriggers.map((trigger) => {
                  const IconComponent = trigger.icon;
                  return (
                    <Card 
                      key={trigger.id} 
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        workflowBuilder.trigger.type === trigger.id ? "ring-2 ring-primary" : ""
                      )}
                      onClick={() => setWorkflowBuilder(prev => ({
                        ...prev,
                        trigger: { ...prev.trigger, type: trigger.id }
                      }))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <IconComponent className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{trigger.name}</h4>
                            <p className="text-sm text-muted-foreground">{trigger.description}</p>
                            <Badge variant="outline" className="mt-2 capitalize">
                              {trigger.category}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 3: Define Action</h3>
              <p className="text-muted-foreground mb-4">Choose what happens when the trigger fires</p>
              
              <div className="space-y-6">
                {/* Action Type Selection */}
                <div>
                  <Label>Action Type</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {automationActions.map((action) => {
                      const IconComponent = action.icon;
                      return (
                        <Card 
                          key={action.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            workflowBuilder.action.type === action.id ? "ring-2 ring-primary" : ""
                          )}
                          onClick={() => setWorkflowBuilder(prev => ({
                            ...prev,
                            action: { ...prev.action, type: action.id }
                          }))}
                        >
                          <CardContent className="p-3 text-center">
                            <IconComponent className="h-6 w-6 mx-auto mb-2 text-primary" />
                            <p className="text-sm font-medium">{action.name}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Action Configuration */}
                {workflowBuilder.action.type && (
                  <div className="space-y-4">
                    {(workflowBuilder.action.type === 'send_email') && (
                      <div>
                        <Label htmlFor="action-subject">Email Subject</Label>
                        <Input
                          id="action-subject"
                          placeholder="Enter email subject"
                          value={workflowBuilder.action.subject}
                          onChange={(e) => setWorkflowBuilder(prev => ({
                            ...prev,
                            action: { ...prev.action, subject: e.target.value }
                          }))}
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="action-content">
                        {workflowBuilder.action.type === 'send_email' ? 'Email Content' : 
                         workflowBuilder.action.type === 'send_sms' ? 'SMS Message' :
                         workflowBuilder.action.type === 'send_whatsapp' ? 'WhatsApp Message' :
                         workflowBuilder.action.type === 'send_push' ? 'Push Notification' :
                         workflowBuilder.action.type === 'send_in_app' ? 'In-App Message' :
                         'Task Description'}
                      </Label>
                      <Textarea
                        id="action-content"
                        placeholder="Enter message content..."
                        rows={4}
                        value={workflowBuilder.action.content}
                        onChange={(e) => setWorkflowBuilder(prev => ({
                          ...prev,
                          action: { ...prev.action, content: e.target.value }
                        }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use merge fields like {'{FirstName}'}, {'{MembershipPlan}'}, {'{ExpiryDate}'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="action-delay">Delay</Label>
                        <Input
                          id="action-delay"
                          type="number"
                          min="0"
                          value={workflowBuilder.action.delay}
                          onChange={(e) => setWorkflowBuilder(prev => ({
                            ...prev,
                            action: { ...prev.action, delay: parseInt(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="action-delay-unit">Delay Unit</Label>
                        <Select 
                          value={workflowBuilder.action.delayUnit} 
                          onValueChange={(value: any) => setWorkflowBuilder(prev => ({
                            ...prev,
                            action: { ...prev.action, delayUnit: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 4: Review & Save</h3>
              <p className="text-muted-foreground mb-4">Review your automation workflow before saving</p>
              
              <Card className={cardShell}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Workflow Name</Label>
                      <p className="font-medium">{workflowBuilder.name}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Description</Label>
                      <p className="text-sm">{workflowBuilder.description}</p>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Trigger</Label>
                      <div className="flex items-center space-x-2">
                        {getTriggerIcon(workflowBuilder.trigger.type)}
                        <span>{automationTriggers.find(t => t.id === workflowBuilder.trigger.type)?.name}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Action</Label>
                      <div className="flex items-center space-x-2">
                        {getActionIcon(workflowBuilder.action.type)}
                        <span>{automationActions.find(a => a.id === workflowBuilder.action.type)?.name}</span>
                      </div>
                    </div>

                    {workflowBuilder.action.subject && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Subject</Label>
                        <p className="text-sm">{workflowBuilder.action.subject}</p>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm text-muted-foreground">Content</Label>
                      <p className="text-sm bg-muted/50 rounded-md p-3">{workflowBuilder.action.content}</p>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Timing</Label>
                      <p className="text-sm">
                        {workflowBuilder.action.delay > 0 
                          ? `Send after ${workflowBuilder.action.delay} ${workflowBuilder.action.delayUnit}`
                          : 'Send immediately'
                        }
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Frequency</Label>
                      <p className="text-sm capitalize">{workflowBuilder.frequency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Automations</h1>
          <p className="text-muted-foreground mt-2">
            Set up automated workflows for member communication and engagement
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Templates
          </Button>
          <Button onClick={handleCreateWorkflow}>
            <Plus className="mr-2 h-4 w-4" />
            Create Automation
          </Button>
        </div>
      </div>

      {/* Analytics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <PlayCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.activeWorkflows}</div>
            <p className="text-xs text-muted-foreground">Running workflows</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Members Engaged</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analytics.totalMembersEngaged}</div>
            <p className="text-xs text-muted-foreground">Total engaged</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Runs</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{analytics.totalRuns}</div>
            <p className="text-xs text-muted-foreground">All executions</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Success Rate</CardTitle>
            <div className="bg-emerald-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{analytics.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Successful runs</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Open Rate</CardTitle>
            <div className="bg-indigo-50 p-2 rounded-lg">
              <Eye className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{analytics.avgOpenRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Average open</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Conversion</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <Target className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{analytics.avgConversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Average conversion</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Pending</CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{analytics.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">Next 24 hours</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Errors</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.errorCount}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
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
                  placeholder="Search automations..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>

              <Select value={triggerFilter} onValueChange={setTriggerFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Triggers</SelectItem>
                  {automationTriggers.map(trigger => (
                    <SelectItem key={trigger.id} value={trigger.id}>
                      {trigger.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {automationActions.map(action => (
                    <SelectItem key={action.id} value={action.id}>
                      {action.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-2 border rounded-lg p-1">
              <Button
                variant={activeView === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('grid')}
              >
                <Grid className="h-4 w-4 mr-1" />
                Grid
              </Button>
              <Button
                variant={activeView === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('table')}
              >
                <List className="h-4 w-4 mr-1" />
                Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="workflows" className="flex-1">Workflows</TabsTrigger>
          <TabsTrigger value="templates" className="flex-1">Templates</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Recent Workflow Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflows.slice(0, 5).map(workflow => (
                    <div key={workflow.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {getStatusIcon(workflow.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{workflow.name}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{workflow.membersEngaged} members</span>
                          <span>•</span>
                          <span>{workflow.lastRun ? format(workflow.lastRun, 'MMM dd') : 'Never run'}</span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(workflow.status)} variant="outline">
                        {workflow.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Upcoming Scheduled Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflows.filter(w => w.nextRun).slice(0, 5).map(workflow => (
                    <div key={workflow.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {getTriggerIcon(workflow.trigger.type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{workflow.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {workflow.nextRun ? format(workflow.nextRun, 'MMM dd, HH:mm') : 'Not scheduled'}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Summary */}
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Top Performing Automations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflows
                  .filter(w => w.status === 'active')
                  .sort((a, b) => b.conversionRate - a.conversionRate)
                  .slice(0, 5)
                  .map(workflow => (
                    <div key={workflow.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/60">
                      <div className="flex items-center space-x-3">
                        <div className="flex space-x-1">
                          {getTriggerIcon(workflow.trigger.type)}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          {getActionIcon(workflow.action.type)}
                        </div>
                        <div>
                          <p className="font-medium">{workflow.name}</p>
                          <p className="text-sm text-muted-foreground">{workflow.membersEngaged} members engaged</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">{workflow.conversionRate.toFixed(1)}% conversion</p>
                        <p className="text-xs text-muted-foreground">{workflow.openRate.toFixed(1)}% open rate</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div key={activeView} className="animate-in fade-in-0 zoom-in-95 duration-200">
            {activeView === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWorkflows.map((workflow) => (
                  <Card key={workflow.id} className={`${cardShell} cursor-pointer group`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge className={getStatusColor(workflow.status)}>
                        {getStatusIcon(workflow.status)}
                        <span className="ml-1 capitalize">{workflow.status}</span>
                      </Badge>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40" align="end">
                            <div className="space-y-1">
                              <Button variant="ghost" size="sm" className="w-full justify-start" 
                                     onClick={() => handleWorkflowClick(workflow)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                              <Button variant="ghost" size="sm" className="w-full justify-start"
                                     onClick={() => handleQuickAction(workflow, 'edit')}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              {workflow.status === 'active' ? (
                                <Button variant="ghost" size="sm" className="w-full justify-start"
                                       onClick={() => handleQuickAction(workflow, 'pause')}>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Pause
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" className="w-full justify-start"
                                       onClick={() => handleQuickAction(workflow, 'play')}>
                                  <Play className="mr-2 h-4 w-4" />
                                  Activate
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="w-full justify-start"
                                     onClick={() => handleQuickAction(workflow, 'duplicate')}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </Button>
                              <Separator />
                              <Button variant="ghost" size="sm" className="w-full justify-start text-red-600"
                                     onClick={() => handleQuickAction(workflow, 'delete')}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <CardDescription>{workflow.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4" onClick={() => handleWorkflowClick(workflow)}>
                    {/* Workflow Flow */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        {getTriggerIcon(workflow.trigger.type)}
                        <span className="text-sm font-medium">
                          {automationTriggers.find(t => t.id === workflow.trigger.type)?.name || workflow.trigger.type}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center space-x-2">
                        {getActionIcon(workflow.action.type)}
                        <span className="text-sm font-medium">
                          {automationActions.find(a => a.id === workflow.action.type)?.name || workflow.action.type}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Runs</p>
                        <p className="font-medium">{workflow.totalRuns}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <p className="font-medium text-green-600">
                          {workflow.totalRuns > 0 ? ((workflow.successfulRuns / workflow.totalRuns) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Members Engaged</p>
                        <p className="font-medium">{workflow.membersEngaged}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conversion Rate</p>
                        <p className="font-medium text-blue-600">{workflow.conversionRate.toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Last Run */}
                    <div className="text-sm">
                      <p className="text-muted-foreground">Last Run</p>
                      <p className="font-medium">
                        {workflow.lastRun ? format(workflow.lastRun, 'MMM dd, yyyy HH:mm') : 'Never'}
                      </p>
                    </div>

                    {/* Next Run */}
                    {workflow.nextRun && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Next Run</p>
                        <p className={cn(
                          "font-medium",
                          workflow.nextRun <= new Date() ? "text-red-600" : "text-green-600"
                        )}>
                          {format(workflow.nextRun, 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                ))}
              </div>
            ) : (
              /* Table View */
              <Card className={cardShell}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Automation Workflows ({filteredWorkflows.length})</span>
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
                      <TableRow>
                        <TableHead>Workflow</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Runs</TableHead>
                        <TableHead>Success Rate</TableHead>
                        <TableHead>Last Run</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWorkflows.map((workflow) => (
                        <TableRow key={workflow.id} className="cursor-pointer transition-colors hover:bg-slate-50/50">
                          <TableCell onClick={() => handleWorkflowClick(workflow)}>
                            <div>
                              <p className="font-medium">{workflow.name}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">{workflow.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(workflow.status)}>
                              {getStatusIcon(workflow.status)}
                              <span className="ml-1 capitalize">{workflow.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getTriggerIcon(workflow.trigger.type)}
                              <span className="text-sm">
                                {automationTriggers.find(t => t.id === workflow.trigger.type)?.name || workflow.trigger.type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getActionIcon(workflow.action.type)}
                              <span className="text-sm">
                                {automationActions.find(a => a.id === workflow.action.type)?.name || workflow.action.type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{workflow.totalRuns}</span>
                              <p className="text-xs text-muted-foreground">{workflow.membersEngaged} engaged</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">
                              {workflow.totalRuns > 0 ? ((workflow.successfulRuns / workflow.totalRuns) * 100).toFixed(1) : 0}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {workflow.lastRun ? format(workflow.lastRun, 'MMM dd, HH:mm') : 'Never'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              {workflow.status === 'active' ? (
                                <Button size="sm" variant="ghost" onClick={() => handleQuickAction(workflow, 'pause')}>
                                  <Pause className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" onClick={() => handleQuickAction(workflow, 'play')}>
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => handleQuickAction(workflow, 'edit')}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleWorkflowClick(workflow)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleQuickAction(workflow, 'duplicate')}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Automation Templates</h2>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {automationTemplates.map((template) => (
              <Card key={template.id} className={cardShell}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        {getTriggerIcon(template.trigger)}
                        <span className="text-sm">
                          {automationTriggers.find(t => t.id === template.trigger)?.name}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center space-x-2">
                        {getActionIcon(template.action)}
                        <span className="text-sm">
                          {automationActions.find(a => a.id === template.action)?.name}
                        </span>
                      </div>
                    </div>
                    
                    {template.subject && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Subject</Label>
                        <p className="text-sm font-medium">{template.subject}</p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Content Preview</Label>
                      <p className="text-sm text-muted-foreground line-clamp-2">{template.content}</p>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Used {template.usageCount} times</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm">
                    Use Template
                  </Button>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className={cardShell}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workflows.length}</div>
                <p className="text-xs text-muted-foreground">+15% from last month</p>
              </CardContent>
            </Card>
            
            <Card className={cardShell}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">+8.2% from last month</p>
              </CardContent>
            </Card>
            
            <Card className={cardShell}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Members Engaged</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalMembersEngaged}</div>
                <p className="text-xs text-muted-foreground">+23% from last month</p>
              </CardContent>
            </Card>
            
            <Card className={cardShell}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Conversion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.avgConversionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">+12.1% from last month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Workflow Performance by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {automationTriggers.slice(0, 5).map(trigger => {
                    const triggerWorkflows = workflows.filter(w => w.trigger.type === trigger.id);
                    const avgConversion = triggerWorkflows.length > 0 ? 
                      triggerWorkflows.reduce((sum, w) => sum + w.conversionRate, 0) / triggerWorkflows.length : 0;
                    
                    return (
                      <div key={trigger.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <trigger.icon className="h-4 w-4" />
                          <span className="font-medium">{trigger.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{avgConversion.toFixed(1)}%</div>
                          <div className="text-sm text-muted-foreground">{triggerWorkflows.length} workflows</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Recent Workflow Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflows.filter(w => w.lastRun).slice(0, 5).map(workflow => (
                    <div key={workflow.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {getStatusIcon(workflow.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{workflow.name}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{workflow.membersEngaged} members</span>
                          <span>•</span>
                          <span>{workflow.lastRun ? format(workflow.lastRun, 'MMM dd, HH:mm') : 'Never'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">{workflow.conversionRate.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">conversion</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Workflow Detail Sheet */}
      <Sheet open={showWorkflowDetail} onOpenChange={setShowWorkflowDetail}>
        <SheetContent className="w-full sm:w-[600px] sm:max-w-none overflow-y-auto">
          {selectedWorkflow && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedWorkflow.status)}
                    <h3 className="text-xl font-bold">{selectedWorkflow.name}</h3>
                  </div>
                  <Badge className={getStatusColor(selectedWorkflow.status)}>
                    <span className="capitalize">{selectedWorkflow.status}</span>
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {selectedWorkflow.description}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Workflow Flow */}
                <Card className={cardShell}>
                  <CardHeader>
                    <CardTitle className="text-lg">Workflow Flow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <div className="flex justify-center mb-2">
                          {getTriggerIcon(selectedWorkflow.trigger.type)}
                        </div>
                        <p className="text-sm font-medium">
                          {automationTriggers.find(t => t.id === selectedWorkflow.trigger.type)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">Trigger</p>
                      </div>
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                      <div className="text-center">
                        <div className="flex justify-center mb-2">
                          <Clock className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium">
                          {selectedWorkflow.action.delay > 0 
                            ? `${selectedWorkflow.action.delay} ${selectedWorkflow.action.delayUnit}`
                            : 'Immediate'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">Delay</p>
                      </div>
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                      <div className="text-center">
                        <div className="flex justify-center mb-2">
                          {getActionIcon(selectedWorkflow.action.type)}
                        </div>
                        <p className="text-sm font-medium">
                          {automationActions.find(a => a.id === selectedWorkflow.action.type)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">Action</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Message Content */}
                <Card className={cardShell}>
                  <CardHeader>
                    <CardTitle className="text-lg">Message Content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedWorkflow.action.subject && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Subject</Label>
                        <p className="font-medium">{selectedWorkflow.action.subject}</p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Content</Label>
                      <p className="text-sm bg-muted/50 rounded-md p-3">{selectedWorkflow.action.content}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card className={cardShell}>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Total Runs</Label>
                        <p className="text-2xl font-bold">{selectedWorkflow.totalRuns}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Success Rate</Label>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedWorkflow.totalRuns > 0 ? ((selectedWorkflow.successfulRuns / selectedWorkflow.totalRuns) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Members Engaged</Label>
                        <p className="text-2xl font-bold text-blue-600">{selectedWorkflow.membersEngaged}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Conversion Rate</Label>
                        <p className="text-2xl font-bold text-purple-600">{selectedWorkflow.conversionRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Open Rate</Label>
                        <p className="text-xl font-medium">{selectedWorkflow.openRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Click Rate</Label>
                        <p className="text-xl font-medium">{selectedWorkflow.clickRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Schedule Information */}
                <Card className={cardShell}>
                  <CardHeader>
                    <CardTitle className="text-lg">Schedule Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Frequency</Label>
                        <p className="font-medium capitalize">{selectedWorkflow.frequency}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Created By</Label>
                        <p className="font-medium">{selectedWorkflow.createdBy}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Created Date</Label>
                        <p className="font-medium">{format(selectedWorkflow.createdDate, 'PPP')}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Last Run</Label>
                        <p className="font-medium">
                          {selectedWorkflow.lastRun ? format(selectedWorkflow.lastRun, 'PPP HH:mm') : 'Never'}
                        </p>
                      </div>
                    </div>
                    
                    {selectedWorkflow.nextRun && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Next Run</Label>
                        <p className={cn(
                          "font-medium",
                          selectedWorkflow.nextRun <= new Date() ? "text-red-600" : "text-green-600"
                        )}>
                          {format(selectedWorkflow.nextRun, 'PPP HH:mm')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className={cardShell}>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => handleQuickAction(selectedWorkflow, 'edit')} className="justify-start">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Workflow
                      </Button>
                      <Button onClick={() => handleQuickAction(selectedWorkflow, 'duplicate')} className="justify-start">
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </Button>
                      {selectedWorkflow.status === 'active' ? (
                        <Button onClick={() => handleQuickAction(selectedWorkflow, 'pause')} className="justify-start">
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </Button>
                      ) : (
                        <Button onClick={() => handleQuickAction(selectedWorkflow, 'play')} className="justify-start">
                          <Play className="mr-2 h-4 w-4" />
                          Activate
                        </Button>
                      )}
                      <Button variant="outline" className="justify-start">
                        <History className="mr-2 h-4 w-4" />
                        View History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Workflow Dialog */}
      <Dialog open={showCreateWorkflow} onOpenChange={setShowCreateWorkflow}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Automation Workflow</DialogTitle>
            <DialogDescription>
              Set up an automated workflow to engage with your members
            </DialogDescription>
          </DialogHeader>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  currentStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={cn(
                    "w-20 h-0.5 mx-2",
                    currentStep > step ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {renderWorkflowBuilderStep()}
          
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleStepPrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowCreateWorkflow(false)}>
                Cancel
              </Button>
              
              {currentStep === 4 ? (
                <Button onClick={handleSaveWorkflow}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Workflow
                </Button>
              ) : (
                <Button 
                  onClick={handleStepNext}
                  disabled={
                    (currentStep === 1 && !workflowBuilder.name) ||
                    (currentStep === 2 && !workflowBuilder.trigger.type) ||
                    (currentStep === 3 && (!workflowBuilder.action.type || !workflowBuilder.action.content))
                  }
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

