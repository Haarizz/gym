import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Send, 
  MessageSquare, 
  Mail, 
  Phone, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  User, 
  Target, 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  MoreHorizontal, 
  Settings, 
  FileText, 
  Image, 
  Paperclip, 
  Smile, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Upload, 
  Download, 
  RefreshCw, 
  Star, 
  Tag, 
  Group, 
  UserPlus, 
  MessageCircle, 
  AtSign, 
  Hash, 
  Smartphone, 
  Globe, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Activity, 
  Zap, 
  Bell, 
  Heart, 
  ThumbsUp, 
  ExternalLink, 
  Share, 
  Archive, 
  Bookmark, 
  History, 
  Timer, 
  Calendar as CalendarAlt, 
  CalendarDays, 
  CalendarCheck, 
  CalendarX, 
  Megaphone, 
  Volume2, 
  Headphones, 
  Mic, 
  Video, 
  Camera, 
  Type, 
  AlignLeft, 
  Bold, 
  Italic, 
  Link, 
  List, 
  Quote, 
  Code, 
  Palette, 
  Layers, 
  Monitor, 
  Tablet, 
  MapPin, 
  Flag, 
  CreditCard, 
  ShoppingBag, 
  Crown, 
  Sparkles,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  X,
  Megaphone as MegaphoneIcon,
  Gift,
  Ticket,
  Percent
} from 'lucide-react';
import { toast } from "sonner";
import { format, addDays, isAfter, isBefore, isToday, isTomorrow, isYesterday, addWeeks, subDays, addHours } from "date-fns";
import { cn } from "../components/ui/utils";

interface Recipient {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'member' | 'prospect' | 'staff';
  membershipStatus?: 'active' | 'expired' | 'frozen' | 'cancelled';
  membershipPlan?: string;
  membershipExpiry?: Date;
  lastVisit?: Date;
  location?: string;
  tags: string[];
  avatar?: string;
  joinDate?: Date;
  isVip?: boolean;
}

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  content: string;
  type: 'sms' | 'whatsapp' | 'email' | 'in-app';
  variables: string[];
  createdBy: string;
  createdDate: Date;
  usageCount: number;
}

interface MessageHistory {
  id: string;
  subject: string;
  content: string;
  type: 'sms' | 'whatsapp' | 'email' | 'in-app';
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'scheduled';
  recipientCount: number;
  recipients: string[];
  sentDate: Date;
  scheduledDate?: Date;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  sentBy: string;
  cost: number;
  attachments?: string[];
  campaignId?: string;
}

interface MessageGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  members: string[];
  criteria: {
    membershipStatus?: string[];
    membershipPlans?: string[];
    locations?: string[];
    tags?: string[];
    joinDateRange?: { start: Date; end: Date };
    lastVisitRange?: { start: Date; end: Date };
    isVip?: boolean;
  };
  createdBy: string;
  createdDate: Date;
  isSystem: boolean;
}

interface MessageComposer {
  type: 'sms' | 'whatsapp' | 'email' | 'in-app';
  subject: string;
  content: string;
  recipients: string[];
  scheduledDate?: Date;
  attachments: File[];
  template?: string;
  personalization: boolean;
}

interface Promotion {
  id: string;
  name: string;
  type: 'discount' | 'voucher' | 'combo' | 'bogo' | 'seasonal' | 'loyalty';
  status: 'active' | 'scheduled' | 'expired' | 'paused' | 'draft';
  description: string;
  startDate: Date;
  endDate: Date;
  discountType: 'percentage' | 'fixed' | 'free';
  discountValue: number;
  code?: string;
  image?: string;
  category: string;
  tags: string[];
}

export function Messaging() {
  const [activeTab, setActiveTab] = useState('compose');
  const [activeRecipientTab, setActiveRecipientTab] = useState('members');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);

  // Message composer state
  const [composer, setComposer] = useState<MessageComposer>({
    type: 'email',
    subject: '',
    content: '',
    recipients: [],
    attachments: [],
    personalization: true
  });

  // Sample data - in real app this would come from your backend
  const recipients: Recipient[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+971 50 123 4567',
      type: 'member',
      membershipStatus: 'active',
      membershipPlan: 'Premium Annual',
      membershipExpiry: addDays(new Date(), 45),
      lastVisit: subDays(new Date(), 2),
      location: 'Downtown Branch',
      tags: ['vip', 'personal-training'],
      joinDate: new Date('2023-06-15'),
      isVip: true
    },
    {
      id: '2',
      name: 'Lisa Chen',
      email: 'lisa.chen@email.com',
      phone: '+971 55 987 6543',
      type: 'member',
      membershipStatus: 'active',
      membershipPlan: 'Standard Monthly',
      membershipExpiry: addDays(new Date(), 15),
      lastVisit: new Date(),
      location: 'Marina Branch',
      tags: ['group-classes', 'yoga'],
      joinDate: new Date('2024-01-10')
    },
    {
      id: '3',
      name: 'Ahmed Hassan',
      email: 'ahmed.hassan@email.com',
      phone: '+971 52 456 7890',
      type: 'prospect',
      location: 'JLT Branch',
      tags: ['inquiry', 'premium-interest'],
      joinDate: new Date('2024-03-20')
    },
    {
      id: '4',
      name: 'Sarah Williams',
      email: 'sarah.w@email.com',
      phone: '+971 56 789 0123',
      type: 'member',
      membershipStatus: 'expired',
      membershipPlan: 'Standard Annual',
      membershipExpiry: subDays(new Date(), 10),
      lastVisit: subDays(new Date(), 20),
      location: 'Downtown Branch',
      tags: ['renewal-needed', 'fitness-enthusiast'],
      joinDate: new Date('2022-11-05')
    },
    {
      id: '5',
      name: 'Maria Rodriguez',
      email: 'maria.r@email.com',
      phone: '+971 54 345 6789',
      type: 'staff',
      location: 'All Branches',
      tags: ['trainer', 'nutritionist'],
      joinDate: new Date('2023-03-01')
    }
  ];

  const messageTemplates: MessageTemplate[] = [
    {
      id: '1',
      name: 'Welcome New Member',
      category: 'Onboarding',
      subject: 'Welcome to {GymName}!',
      content: 'Hi {FirstName}, welcome to our fitness family! Your membership starts today. Here\'s everything you need to know...',
      type: 'email',
      variables: ['FirstName', 'GymName', 'MembershipPlan'],
      createdBy: 'System',
      createdDate: new Date('2024-01-01'),
      usageCount: 145
    },
    {
      id: '2',
      name: 'Payment Reminder',
      category: 'Billing',
      subject: 'Payment Due Reminder',
      content: 'Hi {FirstName}, your membership payment of {Amount} AED is due on {DueDate}. Please make the payment to continue enjoying our services.',
      type: 'sms',
      variables: ['FirstName', 'Amount', 'DueDate'],
      createdBy: 'Admin',
      createdDate: new Date('2024-01-15'),
      usageCount: 89
    },
    {
      id: '3',
      name: 'Class Reminder',
      category: 'Engagement',
      subject: 'Your {ClassName} class starts in 30 minutes!',
      content: 'Don\'t forget! Your {ClassName} class with {TrainerName} starts at {ClassTime}. See you there!',
      type: 'whatsapp',
      variables: ['ClassName', 'TrainerName', 'ClassTime'],
      createdBy: 'System',
      createdDate: new Date('2024-02-01'),
      usageCount: 234
    },
    {
      id: '4',
      name: 'Membership Expiry Warning',
      category: 'Retention',
      subject: 'Your membership expires in 7 days',
      content: 'Hi {FirstName}, your {MembershipPlan} membership expires on {ExpiryDate}. Renew now to continue your fitness journey!',
      type: 'email',
      variables: ['FirstName', 'MembershipPlan', 'ExpiryDate'],
      createdBy: 'System',
      createdDate: new Date('2024-01-20'),
      usageCount: 67
    },
    {
      id: 'promotions',
      name: 'Promotions',
      category: 'Marketing',
      subject: 'Special Offer Just for You!',
      content: 'Check out our exclusive promotional campaigns',
      type: 'whatsapp',
      variables: [],
      createdBy: 'System',
      createdDate: new Date('2024-01-01'),
      usageCount: 0
    }
  ];

  const messageGroups: MessageGroup[] = [
    {
      id: '1',
      name: 'VIP Members',
      description: 'All VIP and premium members',
      memberCount: 45,
      members: ['1'],
      criteria: { isVip: true },
      createdBy: 'System',
      createdDate: new Date('2024-01-01'),
      isSystem: true
    },
    {
      id: '2',
      name: 'Expiring Soon',
      description: 'Members with membership expiring in next 30 days',
      memberCount: 23,
      members: ['2'],
      criteria: { membershipStatus: ['active'] },
      createdBy: 'System',
      createdDate: new Date('2024-01-01'),
      isSystem: true
    },
    {
      id: '3',
      name: 'New Prospects',
      description: 'Prospects from last 30 days',
      memberCount: 12,
      members: ['3'],
      criteria: {},
      createdBy: 'Sarah Johnson',
      createdDate: new Date('2024-03-01'),
      isSystem: false
    },
    {
      id: '4',
      name: 'Inactive Members',
      description: 'Members who haven\'t visited in 14+ days',
      memberCount: 18,
      members: ['4'],
      criteria: {},
      createdBy: 'System',
      createdDate: new Date('2024-01-01'),
      isSystem: true
    }
  ];

  // Load active promotions on component mount
  useEffect(() => {
    // Sample active promotions - in production, this would come from promotions-campaign.tsx or backend
    const samplePromotions: Promotion[] = [
      {
        id: '1',
        name: 'New Year Fitness Challenge',
        type: 'seasonal',
        status: 'active',
        description: 'Start your fitness journey with 30% off all annual memberships',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        discountType: 'percentage',
        discountValue: 30,
        code: 'NEWYEAR2024',
        category: 'Membership',
        tags: ['new-year', 'discount', 'annual']
      },
      {
        id: '2',
        name: 'Summer Body Special',
        type: 'seasonal',
        status: 'active',
        description: 'Get beach-ready! 3 months of personal training + nutrition plan for only AED 1,999',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-08-31'),
        discountType: 'fixed',
        discountValue: 500,
        code: 'SUMMER2024',
        category: 'Training',
        tags: ['summer', 'personal-training', 'nutrition']
      },
      {
        id: '3',
        name: 'Refer a Friend - Both Get AED 100',
        type: 'loyalty',
        status: 'active',
        description: 'Bring a friend and both of you get AED 100 credit towards your next payment!',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        discountType: 'fixed',
        discountValue: 100,
        code: 'REFERRAL24',
        category: 'Referral',
        tags: ['referral', 'loyalty']
      },
      {
        id: '4',
        name: 'Black Friday Mega Sale',
        type: 'seasonal',
        status: 'active',
        description: 'Biggest sale of the year! Up to 50% off on all memberships and packages',
        startDate: new Date('2024-11-20'),
        endDate: new Date('2024-11-30'),
        discountType: 'percentage',
        discountValue: 50,
        code: 'BLACKFRIDAY50',
        category: 'Membership',
        tags: ['black-friday', 'sale', 'limited-time']
      },
      {
        id: '5',
        name: 'Student Special - 25% Off',
        type: 'discount',
        status: 'active',
        description: 'Students get 25% off on all monthly memberships with valid student ID',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        discountType: 'percentage',
        discountValue: 25,
        code: 'STUDENT25',
        category: 'Membership',
        tags: ['student', 'discount', 'ongoing']
      }
    ];
    
    setActivePromotions(samplePromotions);
  }, []);

  const messageHistory: MessageHistory[] = [
    {
      id: '1',
      subject: 'Welcome to GymBios!',
      content: 'Welcome to our fitness family...',
      type: 'email',
      status: 'delivered',
      recipientCount: 15,
      recipients: ['1', '2'],
      sentDate: subDays(new Date(), 1),
      deliveryRate: 100,
      openRate: 67,
      clickRate: 23,
      sentBy: 'Sarah Johnson',
      cost: 4.5
    },
    {
      id: '2',
      subject: 'Payment reminder',
      content: 'Your payment is due...',
      type: 'sms',
      status: 'delivered',
      recipientCount: 8,
      recipients: ['2', '4'],
      sentDate: subDays(new Date(), 2),
      deliveryRate: 100,
      openRate: 85,
      clickRate: 12,
      sentBy: 'Ahmed Hassan',
      cost: 2.4
    },
    {
      id: '3',
      subject: 'New Year Promotion',
      content: 'Special offer for you...',
      type: 'whatsapp',
      status: 'sent',
      recipientCount: 32,
      recipients: ['1', '2', '3'],
      sentDate: subDays(new Date(), 3),
      deliveryRate: 94,
      openRate: 78,
      clickRate: 34,
      sentBy: 'Maria Rodriguez',
      cost: 9.6
    }
  ];

  // Calculate analytics
  const analytics = useMemo(() => {
    const today = new Date();
    const todayMessages = messageHistory.filter(msg => isToday(msg.sentDate)).length;
    const scheduled = messageHistory.filter(msg => msg.status === 'scheduled').length;
    const totalSent = messageHistory.reduce((sum, msg) => sum + msg.recipientCount, 0);
    const avgOpenRate = messageHistory.length > 0 ? 
      messageHistory.reduce((sum, msg) => sum + msg.openRate, 0) / messageHistory.length : 0;
    const avgClickRate = messageHistory.length > 0 ? 
      messageHistory.reduce((sum, msg) => sum + msg.clickRate, 0) / messageHistory.length : 0;
    const totalCost = messageHistory.reduce((sum, msg) => sum + msg.cost, 0);

    return {
      sentToday: todayMessages,
      scheduledMessages: scheduled,
      totalRecipients: totalSent,
      openRate: avgOpenRate,
      clickRate: avgClickRate,
      totalCost
    };
  }, [messageHistory]);

  // Filter recipients
  const filteredRecipients = useMemo(() => {
    let filtered = recipients.filter(recipient => {
      const matchesSearch = searchTerm === '' || 
        recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipient.phone.includes(searchTerm);
      
      let matchesFilter = true;
      if (recipientFilter === 'active') {
        matchesFilter = recipient.membershipStatus === 'active';
      } else if (recipientFilter === 'expired') {
        matchesFilter = recipient.membershipStatus === 'expired';
      } else if (recipientFilter === 'vip') {
        matchesFilter = recipient.isVip === true;
      } else if (recipientFilter === 'prospects') {
        matchesFilter = recipient.type === 'prospect';
      }
      
      return matchesSearch && matchesFilter;
    });

    // Filter by active tab
    if (activeRecipientTab === 'members') {
      filtered = filtered.filter(r => r.type === 'member');
    } else if (activeRecipientTab === 'prospects') {
      filtered = filtered.filter(r => r.type === 'prospect');
    }

    return filtered;
  }, [recipients, searchTerm, recipientFilter, activeRecipientTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-purple-100 text-purple-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'read': return <Eye className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'scheduled': return <Clock className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'in-app': return <Bell className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getMembershipStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'frozen': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRecipientToggle = useCallback((recipientId: string) => {
    setSelectedRecipients(prev => {
      if (prev.includes(recipientId)) {
        return prev.filter(id => id !== recipientId);
      } else {
        return [...prev, recipientId];
      }
    });
  }, []);

  const handleGroupSelection = useCallback((group: MessageGroup) => {
    setSelectedRecipients(group.members);
    toast.success(`Selected ${group.memberCount} recipients from ${group.name}`);
  }, []);

  const handleTemplateSelect = useCallback((template: MessageTemplate) => {
    setSelectedTemplate(template);
    
    // Don't auto-fill content for promotions template
    if (template.id === 'promotions') {
      setComposer(prev => ({
        ...prev,
        type: template.type,
        subject: '',
        content: ''
      }));
      toast.success(`Promotions template selected - choose a promotion below`);
    } else {
      setComposer(prev => ({
        ...prev,
        type: template.type,
        subject: template.subject,
        content: template.content
      }));
      toast.success(`Template "${template.name}" applied`);
    }
  }, []);

  const handleSendPromotion = useCallback((promo: Promotion) => {
    if (selectedRecipients.length === 0) {
      toast.error('Please select recipients first');
      return;
    }

    // Build WhatsApp message with promotion details
    const message = `🏋️ *${promo.name}*\n\n${promo.description}\n\n${promo.code ? `✨ Use Code: *${promo.code}*\n` : ''}📅 Valid Until: ${format(promo.endDate, 'MMMM dd, yyyy')}\n\n_Visit us today to claim this exclusive offer!_`;
    
    setComposer(prev => ({
      ...prev,
      type: 'whatsapp',
      subject: promo.name,
      content: message
    }));
    
    toast.success(`Promotion "${promo.name}" ready to send to ${selectedRecipients.length} recipients`);
  }, [selectedRecipients]);

  const handleSendMessage = useCallback(async () => {
    if (!composer.content || selectedRecipients.length === 0) {
      toast.error('Please select recipients and enter message content');
      return;
    }

    setIsSending(true);
    
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSending(false);
    toast.success(`Message sent to ${selectedRecipients.length} recipients`);
    
    // Reset composer
    setComposer({
      type: 'email',
      subject: '',
      content: '',
      recipients: [],
      attachments: [],
      personalization: true
    });
    setSelectedRecipients([]);
  }, [composer, selectedRecipients]);

  const handleScheduleMessage = useCallback((scheduledDate: Date) => {
    if (!composer.content || selectedRecipients.length === 0) {
      toast.error('Please select recipients and enter message content');
      return;
    }

    toast.success(`Message scheduled for ${format(scheduledDate, 'PPP')} at ${format(scheduledDate, 'HH:mm')}`);
    setShowScheduleDialog(false);
    
    // Reset composer
    setComposer({
      type: 'email',
      subject: '',
      content: '',
      recipients: [],
      attachments: [],
      personalization: true
    });
    setSelectedRecipients([]);
  }, [composer, selectedRecipients]);

  const personalizeContent = useCallback((content: string, recipient: Recipient) => {
    return content
      .replace(/{FirstName}/g, recipient.name.split(' ')[0])
      .replace(/{LastName}/g, recipient.name.split(' ')[1] || '')
      .replace(/{FullName}/g, recipient.name)
      .replace(/{Email}/g, recipient.email)
      .replace(/{MembershipPlan}/g, recipient.membershipPlan || 'N/A')
      .replace(/{GymName}/g, 'GymBios Fitness')
      .replace(/{Location}/g, recipient.location || 'Main Branch');
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Messaging Center</h1>
          <p className="text-muted-foreground mt-2">
            Send targeted messages and communications to members, prospects, and staff
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setShowNewTemplate(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Templates
          </Button>
          <Button variant="outline" onClick={() => setShowNewGroup(true)}>
            <Users className="mr-2 h-4 w-4" />
            Groups
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </Button>
        </div>
      </div>

      {/* Analytics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sent Today</p>
                <p className="text-2xl font-bold">{analytics.sentToday}</p>
              </div>
              <Send className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-yellow-600">{analytics.scheduledMessages}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recipients</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.totalRecipients}</p>
              </div>
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold text-green-600">{analytics.openRate.toFixed(1)}%</p>
              </div>
              <Eye className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold text-indigo-600">{analytics.clickRate.toFixed(1)}%</p>
              </div>
              <ExternalLink className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cost</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.totalCost.toFixed(2)} AED</p>
              </div>
              <CreditCard className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recipients Panel */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recipients ({selectedRecipients.length})</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedRecipients(filteredRecipients.map(r => r.id))}
                  >
                    Select All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search recipients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter recipients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Recipients</SelectItem>
                      <SelectItem value="active">Active Members</SelectItem>
                      <SelectItem value="expired">Expired Members</SelectItem>
                      <SelectItem value="vip">VIP Members</SelectItem>
                      <SelectItem value="prospects">Prospects</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Recipient Tabs */}
                <Tabs value={activeRecipientTab} onValueChange={setActiveRecipientTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="members" className="text-xs">Members</TabsTrigger>
                    <TabsTrigger value="prospects" className="text-xs">Prospects</TabsTrigger>
                    <TabsTrigger value="groups" className="text-xs">Groups</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="members" className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredRecipients.filter(r => r.type === 'member').map((recipient) => (
                      <div key={recipient.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                           onClick={() => handleRecipientToggle(recipient.id)}>
                        <Checkbox 
                          checked={selectedRecipients.includes(recipient.id)}
                          onChange={() => handleRecipientToggle(recipient.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={recipient.avatar} />
                          <AvatarFallback className="text-xs">
                            {recipient.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{recipient.name}</p>
                          <div className="flex items-center space-x-1">
                            {recipient.membershipStatus && (
                              <Badge variant="outline" className={cn("text-xs", getMembershipStatusColor(recipient.membershipStatus))}>
                                {recipient.membershipStatus}
                              </Badge>
                            )}
                            {recipient.isVip && (
                              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                                <Crown className="h-3 w-3 mr-1" />
                                VIP
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="prospects" className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredRecipients.filter(r => r.type === 'prospect').map((recipient) => (
                      <div key={recipient.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                           onClick={() => handleRecipientToggle(recipient.id)}>
                        <Checkbox 
                          checked={selectedRecipients.includes(recipient.id)}
                          onChange={() => handleRecipientToggle(recipient.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={recipient.avatar} />
                          <AvatarFallback className="text-xs">
                            {recipient.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{recipient.name}</p>
                          <p className="text-xs text-muted-foreground">{recipient.location}</p>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="groups" className="space-y-2 max-h-96 overflow-y-auto">
                    {messageGroups.map((group) => (
                      <div key={group.id} className="p-3 rounded-lg border hover:bg-muted cursor-pointer"
                           onClick={() => handleGroupSelection(group)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Group className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm">{group.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {group.memberCount}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Message Composer */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Compose Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Message Type and Template */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="messageType">Message Type</Label>
                    <Select value={composer.type} onValueChange={(value: any) => setComposer(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4" />
                            <span>Email</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sms">
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="h-4 w-4" />
                            <span>SMS</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center space-x-2">
                            <MessageCircle className="h-4 w-4" />
                            <span>WhatsApp</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="in-app">
                          <div className="flex items-center space-x-2">
                            <Bell className="h-4 w-4" />
                            <span>In-App</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="template">Template</Label>
                    <Select onValueChange={(templateId) => {
                      const template = messageTemplates.find(t => t.id === templateId);
                      if (template) handleTemplateSelect(template);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose template" />
                      </SelectTrigger>
                      <SelectContent>
                        {messageTemplates.filter(t => t.type === composer.type).map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Subject (for email) */}
                {composer.type === 'email' && (
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter email subject"
                      value={composer.subject}
                      onChange={(e) => setComposer(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                )}

                {/* Message Content */}
                <div>
                  <Label htmlFor="content">Message Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Type your message here..."
                    value={composer.content}
                    onChange={(e) => setComposer(prev => ({ ...prev, content: e.target.value }))}
                    rows={8}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>Characters: {composer.content.length}</span>
                      {composer.type === 'sms' && (
                        <span className={composer.content.length > 160 ? 'text-red-600' : ''}>
                          (SMS limit: 160)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Smile className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Promotions Section - Only shown when Promotions template is selected */}
                {selectedTemplate?.id === 'promotions' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MegaphoneIcon className="h-5 w-5 text-[#2B7A78]" />
                        <h3 className="text-lg text-slate-800">Select Promotion to Share</h3>
                      </div>
                      {selectedRecipients.length > 0 && (
                        <Badge className="bg-[#2B7A78] text-white">
                          {selectedRecipients.length} Recipients Selected
                        </Badge>
                      )}
                    </div>
                    
                    {selectedRecipients.length === 0 && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          Please select recipients from the left panel before choosing a promotion.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {activePromotions.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No active promotions available. Create promotions in the Promotions & Campaigns section.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {activePromotions.map((promo) => (
                          <Card
                            key={promo.id}
                            className="relative bg-white border border-slate-200 hover:shadow-md transition-all duration-200"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-base">{promo.name}</CardTitle>
                                <Badge 
                                  variant="outline" 
                                  className="bg-green-50 text-green-700 border-green-200"
                                >
                                  Active
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {promo.category}
                                </Badge>
                                {promo.discountType === 'percentage' && (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <Percent className="h-3 w-3" />
                                    {promo.discountValue}% OFF
                                  </Badge>
                                )}
                                {promo.discountType === 'fixed' && (
                                  <Badge variant="outline" className="text-xs">
                                    AED {promo.discountValue} OFF
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="pb-3">
                              <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                                {promo.description}
                              </p>
                              
                              {promo.code && (
                                <div className="bg-[#F9FAFB] border border-dashed border-[#2B7A78] py-1.5 px-3 rounded-md mb-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs text-[#2B7A78] tracking-wider">
                                      {promo.code}
                                    </span>
                                    <Ticket className="h-3.5 w-3.5 text-[#2B7A78]" />
                                  </div>
                                </div>
                              )}
                              
                              <p className="text-xs text-[#E63946] mb-3">
                                Valid Until: {format(promo.endDate, 'MMM dd, yyyy')}
                              </p>
                              
                              <Button
                                onClick={() => handleSendPromotion(promo)}
                                className="w-full bg-[#2B7A78] hover:bg-[#236A68] text-white"
                                size="sm"
                                disabled={selectedRecipients.length === 0}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send to {selectedRecipients.length || 0} Members
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        Selecting a promotion will automatically format the message with promotion details, code, and expiry date.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Personalization */}
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={composer.personalization}
                    onCheckedChange={(checked) => setComposer(prev => ({ ...prev, personalization: checked }))}
                  />
                  <Label>Enable personalization (use {'{FirstName}'}, {'{MembershipPlan}'}, etc.)</Label>
                </div>

                {/* Preview */}
                {selectedRecipients.length > 0 && composer.content && (
                  <div>
                    <Label>Preview (for {recipients.find(r => r.id === selectedRecipients[0])?.name})</Label>
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      {composer.type === 'email' && composer.subject && (
                        <div className="font-medium mb-2">
                          Subject: {composer.personalization ? 
                            personalizeContent(composer.subject, recipients.find(r => r.id === selectedRecipients[0])!) :
                            composer.subject
                          }
                        </div>
                      )}
                      <div>
                        {composer.personalization ? 
                          personalizeContent(composer.content, recipients.find(r => r.id === selectedRecipients[0])!) :
                          composer.content
                        }
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={() => setShowPreview(true)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Button variant="outline" onClick={() => setShowScheduleDialog(true)}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Schedule
                    </Button>
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={isSending || !composer.content || selectedRecipients.length === 0}
                  >
                    {isSending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send to {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Message History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messageHistory.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{message.subject}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{message.content}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(message.type)}
                          <span className="capitalize">{message.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(message.status)}>
                          {getStatusIcon(message.status)}
                          <span className="ml-1 capitalize">{message.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{message.recipientCount}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{format(message.sentDate, 'MMM dd, yyyy HH:mm')}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm">
                            <Eye className="h-3 w-3" />
                            <span>{message.openRate}%</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <ExternalLink className="h-3 w-3" />
                            <span>{message.clickRate}%</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{message.cost.toFixed(2)} AED</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Message Templates</h2>
            <Button onClick={() => setShowNewTemplate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {messageTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(template.type)}
                    <span className="text-sm text-muted-foreground capitalize">{template.type}</span>
                    <Badge variant="outline" className="text-xs">
                      Used {template.usageCount} times
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Subject</Label>
                      <p className="font-medium">{template.subject}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Content</Label>
                      <p className="text-sm text-muted-foreground line-clamp-3">{template.content}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Variables</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.variables.map(variable => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {'{' + variable + '}'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => handleTemplateSelect(template)}>
                    Use Template
                  </Button>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{messageHistory.length}</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Open Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.openRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">+5.2% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Click Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.clickRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">+2.1% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalCost.toFixed(2)} AED</div>
                <p className="text-xs text-muted-foreground">-8.5% from last month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Message Performance by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['email', 'sms', 'whatsapp', 'in-app'].map(type => {
                    const typeMessages = messageHistory.filter(m => m.type === type);
                    const avgOpen = typeMessages.length > 0 ? 
                      typeMessages.reduce((sum, m) => sum + m.openRate, 0) / typeMessages.length : 0;
                    
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(type)}
                          <span className="capitalize font-medium">{type}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{avgOpen.toFixed(1)}%</div>
                          <div className="text-sm text-muted-foreground">{typeMessages.length} sent</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messageHistory.slice(0, 5).map(message => (
                    <div key={message.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {getTypeIcon(message.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{message.subject}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{message.recipientCount} recipients</span>
                          <span>•</span>
                          <span>{format(message.sentDate, 'MMM dd')}</span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(message.status)} variant="outline">
                        {message.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Message</DialogTitle>
            <DialogDescription>
              Choose when to send this message
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="scheduleDate">Date</Label>
              <Input id="scheduleDate" type="date" />
            </div>
            <div>
              <Label htmlFor="scheduleTime">Time</Label>
              <Input id="scheduleTime" type="time" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleScheduleMessage(addHours(new Date(), 1))}>
              Schedule Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Template Dialog */}
      <Dialog open={showNewTemplate} onOpenChange={setShowNewTemplate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Message Template</DialogTitle>
            <DialogDescription>
              Create a reusable message template
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input id="templateName" placeholder="Enter template name" />
            </div>
            <div>
              <Label htmlFor="templateCategory">Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                  <SelectItem value="retention">Retention</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="templateType">Message Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="in-app">In-App</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="templateSubject">Subject</Label>
              <Input id="templateSubject" placeholder="Enter subject" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="templateContent">Content</Label>
              <Textarea id="templateContent" placeholder="Enter template content..." rows={6} />
            </div>
            <div className="md:col-span-2">
              <Label>Available Variables</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['{FirstName}', '{LastName}', '{Email}', '{MembershipPlan}', '{GymName}', '{Location}'].map(variable => (
                  <Badge key={variable} variant="outline" className="cursor-pointer hover:bg-muted">
                    {variable}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTemplate(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success('Template created successfully');
              setShowNewTemplate(false);
            }}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Group Dialog */}
      <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Message Group</DialogTitle>
            <DialogDescription>
              Create a custom group of recipients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input id="groupName" placeholder="Enter group name" />
              </div>
              <div>
                <Label htmlFor="groupDescription">Description</Label>
                <Input id="groupDescription" placeholder="Enter description" />
              </div>
            </div>
            
            <div>
              <Label>Group Criteria</Label>
              <div className="space-y-3 mt-2">
                <div>
                  <Label className="text-sm text-muted-foreground">Membership Status</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['active', 'expired', 'frozen', 'cancelled'].map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox id={`status-${status}`} />
                        <Label htmlFor={`status-${status}`} className="capitalize">{status}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm text-muted-foreground">Membership Plans</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['Standard Monthly', 'Standard Annual', 'Premium Monthly', 'Premium Annual'].map(plan => (
                      <div key={plan} className="flex items-center space-x-2">
                        <Checkbox id={`plan-${plan}`} />
                        <Label htmlFor={`plan-${plan}`}>{plan}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="vip-only" />
                  <Label htmlFor="vip-only">VIP Members Only</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroup(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success('Group created successfully');
              setShowNewGroup(false);
            }}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

