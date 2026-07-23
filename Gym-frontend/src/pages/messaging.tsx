import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { CurrencyGlyph } from '../utils/currency';
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
  FiSearch as Search,
  FiFilter as Filter,
  FiPlus as Plus,
  FiSend as Send,
  FiMessageSquare as MessageSquare,
  FiMail as Mail,
  FiPhone as Phone,
  FiCalendar as CalendarIcon,
  FiClock as Clock,
  FiUsers as Users,
  FiUser as User,
  FiTarget as Target,
  FiEye as Eye,
  FiEdit as Edit,
  FiCopy as Copy,
  FiTrash2 as Trash2,
  FiMoreHorizontal as MoreHorizontal,
  FiSettings as Settings,
  FiFileText as FileText,
  FiImage as Image,
  FiPaperclip as Paperclip,
  FiSmile as Smile,
  FiCheckCircle as CheckCircle,
  FiXCircle as XCircle,
  FiAlertCircle as AlertCircle,
  FiLoader as Loader2,
  FiUpload as Upload,
  FiDownload as Download,
  FiRefreshCw as RefreshCw,
  FiStar as Star,
  FiTag as Tag,
  FiUsers as Group,
  FiUserPlus as UserPlus,
  FiMessageCircle as MessageCircle,
  FiAtSign as AtSign,
  FiHash as Hash,
  FiSmartphone as Smartphone,
  FiGlobe as Globe,
  FiTrendingUp as TrendingUp,
  FiBarChart2 as BarChart3,
  FiPieChart as PieChart,
  FiActivity as Activity,
  FiZap as Zap,
  FiBell as Bell,
  FiHeart as Heart,
  FiThumbsUp as ThumbsUp,
  FiExternalLink as ExternalLink,
  FiShare as Share,
  FiArchive as Archive,
  FiBookmark as Bookmark,
  FiRotateCcw as History,
  FiClock as Timer,
  FiCalendar as CalendarAlt,
  FiCalendar as CalendarDays,
  FiCalendar as CalendarCheck,
  FiCalendar as CalendarX,
  FiVolume2 as Volume2,
  FiHeadphones as Headphones,
  FiMic as Mic,
  FiVideo as Video,
  FiCamera as Camera,
  FiType as Type,
  FiAlignLeft as AlignLeft,
  FiBold as Bold,
  FiItalic as Italic,
  FiLink as Link,
  FiList as List,
  FiQuote as Quote,
  FiCode as Code,
  FiLayers as Layers,
  FiMonitor as Monitor,
  FiTablet as Tablet,
  FiMapPin as MapPin,
  FiFlag as Flag,
  FiCreditCard as CreditCard,
  FiShoppingBag as ShoppingBag,
  FiChevronDown as ChevronDown,
  FiChevronRight as ChevronRight,
  FiArrowRight as ArrowRight,
  FiX as X
} from 'react-icons/fi';
import {
  FaCrown as Crown,
  FaStar as Sparkles,
  FaBullhorn as Megaphone,
  FaBullhorn as MegaphoneIcon,
  FaGift as Gift,
  FaTicket as Ticket,
  FaPercent as Percent,
  FaPalette as Palette
} from 'react-icons/fa6';
import { toast } from "sonner";
import { format, addDays, isAfter, isBefore, isToday, isTomorrow, isYesterday, addWeeks, subDays, addHours } from "date-fns";
import { cn } from "../components/ui/utils";
import { messagingService } from "../utils/supabase/messaging-service";
import { promotionsService } from "../utils/supabase/promotions-service";

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
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'scheduled' | 'partial' | 'sending';
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

const getRecipientKey = (recipient: Recipient) => `${recipient.type}:${recipient.id}`;

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
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);
  const [historyToDelete, setHistoryToDelete] = useState<MessageHistory | null>(null);
  const [historyPreview, setHistoryPreview] = useState<MessageHistory | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [messageGroups, setMessageGroups] = useState<MessageGroup[]>([]);
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
  const [analytics, setAnalytics] = useState({
    sentToday: 0,
    scheduledMessages: 0,
    totalRecipients: 0,
    openRate: 0,
    clickRate: 0,
    totalCost: 0
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: '',
    type: 'email' as MessageTemplate['type'],
    subject: '',
    content: ''
  });

  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    statuses: [] as string[],
    plans: [] as string[],
    vipOnly: false,
    memberIds: [] as string[]
  });
  const [groupMemberSearch, setGroupMemberSearch] = useState('');

  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const availableVariables = [
    '{FirstName}',
    '{LastName}',
    '{FullName}',
    '{Email}',
    '{Phone}',
    '{MembershipPlan}',
    '{MembershipStatus}',
    '{GymName}',
    '{Location}',
    '{ExpiryDate}',
    '{JoinDate}',
    '{Amount}',
    '{DueDate}',
    '{ClassName}',
    '{TrainerName}',
    '{ClassTime}'
  ];

  const emoticons = [':)', ':-)', ':D', ';)', ':P', '<3', ':(', ':-/'];

  // Message composer state
  const [composer, setComposer] = useState<MessageComposer>({
    type: 'email',
    subject: '',
    content: '',
    recipients: [],
    attachments: [],
    personalization: true
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [recipientData, templateData, groupData, historyData, analyticsData] = await Promise.all([
          messagingService.getRecipients("all"),
          messagingService.getTemplates(),
          messagingService.getGroups(),
          messagingService.getHistory(),
          messagingService.getAnalytics()
        ]);

        const mappedRecipients: Recipient[] = recipientData.map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email || '',
          phone: r.phone || '',
          type: r.type,
          membershipStatus: r.membership_status || r.membershipStatus,
          membershipPlan: r.membership_plan || r.membershipPlan,
          membershipExpiry: r.membership_expiry ? new Date(r.membership_expiry) : undefined,
          joinDate: r.join_date ? new Date(r.join_date) : undefined,
          location: r.location || undefined,
          tags: r.tags || [],
          isVip: r.is_vip || false,
          avatar: r.photo_url || r.photoUrl || r.avatar || undefined
        }));

        const mappedTemplates: MessageTemplate[] = templateData.map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category || '',
          subject: t.subject,
          content: t.content,
          type: t.type,
          variables: t.variables || [],
          createdBy: t.created_by || t.createdBy || 'System',
          createdDate: t.created_date ? new Date(t.created_date) : new Date(),
          usageCount: t.usage_count ?? t.usageCount ?? 0
        }));


        const mappedGroups: MessageGroup[] = groupData.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description || '',
          memberCount: g.member_count ?? g.memberCount ?? (g.members ? g.members.length : 0),
          members: g.members || [],
          criteria: g.criteria || {},
          createdBy: g.created_by || g.createdBy || 'System',
          createdDate: g.created_date ? new Date(g.created_date) : new Date(),
          isSystem: g.system ?? g.is_system ?? g.isSystem ?? false
        }));

        const mappedHistory: MessageHistory[] = historyData.map((h: any) => {
          const sentDate = h.sent_date ? new Date(h.sent_date) : (h.scheduled_date ? new Date(h.scheduled_date) : new Date());
          return ({
          id: h.id,
          subject: h.subject,
          content: h.content,
          type: h.type,
          status: h.status,
          recipientCount: h.recipient_count ?? h.recipientCount ?? 0,
          recipients: h.recipients || [],
          sentDate,
          scheduledDate: h.scheduled_date ? new Date(h.scheduled_date) : undefined,
          deliveryRate: h.delivery_rate ?? h.deliveryRate ?? 0,
          openRate: h.open_rate ?? h.openRate ?? 0,
          clickRate: h.click_rate ?? h.clickRate ?? 0,
          sentBy: h.sent_by || h.sentBy || 'System',
          cost: h.cost ?? 0
        });
        });

        setRecipients(mappedRecipients);
        setMessageTemplates(mappedTemplates);
        setMessageGroups(mappedGroups);
        setMessageHistory(mappedHistory);
        setAnalytics({
          sentToday: analyticsData.sent_today ?? analyticsData.sentToday ?? 0,
          scheduledMessages: analyticsData.scheduled_messages ?? analyticsData.scheduledMessages ?? 0,
          totalRecipients: analyticsData.total_recipients ?? analyticsData.totalRecipients ?? 0,
          openRate: analyticsData.open_rate ?? analyticsData.openRate ?? 0,
          clickRate: analyticsData.click_rate ?? analyticsData.clickRate ?? 0,
          totalCost: analyticsData.total_cost ?? analyticsData.totalCost ?? 0
        });
      } catch (error) {
        console.error("Failed to load messaging data", error);
      }
    };

    const loadPromotions = async () => {
      try {
        const promoData = await promotionsService.getPromotions("active");
        const mappedPromos: Promotion[] = promoData.map((p: any) => ({
          id: String(p.id),
          name: p.name,
          type: p.type,
          status: p.status,
          description: p.description || '',
          startDate: p.start_date ? new Date(p.start_date) : (p.startDate ? new Date(p.startDate) : new Date()),
          endDate: p.end_date ? new Date(p.end_date) : (p.endDate ? new Date(p.endDate) : new Date()),
          discountType: p.discount_type ?? p.discountType ?? 'percentage',
          discountValue: Number(p.discount_value ?? p.discountValue ?? 0),
          code: p.code || undefined,
          category: p.category || 'General',
          tags: p.tags || []
        }));
        setActivePromotions(mappedPromos);
      } catch (error) {
        console.error("Failed to load promotions", error);
      }
    };

    loadData();
    loadPromotions();
  }, []);

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
      filtered = filtered.filter(r => r.type === 'member' || r.type === 'staff');
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
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'sending': return 'bg-blue-50 text-blue-700';
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
      case 'partial': return <AlertCircle className="h-4 w-4" />;
      case 'sending': return <Loader2 className="h-4 w-4 animate-spin" />;
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

  const handleRecipientToggle = useCallback((recipientKey: string) => {
    setSelectedRecipients(prev => {
      if (prev.includes(recipientKey)) {
        return prev.filter(id => id !== recipientKey);
      } else {
        return [...prev, recipientKey];
      }
    });
  }, []);

  const handleGroupSelection = useCallback((group: MessageGroup) => {
    setSelectedRecipients(group.members.map(memberId => `member:${memberId}`));
    toast.success(`Selected ${group.memberCount} recipients from ${group.name}`);
  }, []);

  const handleTemplateSelect = useCallback((template: MessageTemplate) => {
    setSelectedTemplate(template);
    setActiveTab('compose');
    
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

  const handleEditTemplate = useCallback((template: MessageTemplate) => {
    if (template.id === 'promotions') return;
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      category: template.category || '',
      type: template.type,
      subject: template.subject,
      content: template.content
    });
    setShowNewTemplate(true);
  }, []);

  const handleCopyTemplate = useCallback(async (template: MessageTemplate) => {
    if (template.id === 'promotions') return;
    try {
      const created = await messagingService.createTemplate({
        name: `${template.name} Copy`,
        category: template.category,
        subject: template.subject,
        content: template.content,
        type: template.type,
        variables: template.variables
      });
      const mapped: MessageTemplate = {
        id: created.id,
        name: created.name,
        category: created.category || '',
        subject: created.subject,
        content: created.content,
        type: created.type,
        variables: created.variables || [],
        createdBy: created.created_by || 'System',
        createdDate: created.created_date ? new Date(created.created_date) : new Date(),
        usageCount: created.usage_count ?? 0
      };
      setMessageTemplates(prev => {
        const withoutPromo = prev.filter(t => t.id !== 'promotions');
        const promo = prev.find(t => t.id === 'promotions');
        return promo ? [...withoutPromo, mapped, promo] : [...prev, mapped];
      });
      toast.success('Template copied');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to copy template');
    }
  }, []);

  const handleRequestDeleteTemplate = useCallback((template: MessageTemplate) => {
    if (template.id === 'promotions') return;
    setTemplateToDelete(template);
  }, []);

  const confirmDeleteTemplate = useCallback(async () => {
    if (!templateToDelete) return;
    try {
      await messagingService.deleteTemplate(templateToDelete.id);
      setMessageTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      toast.success('Template deleted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete template');
    } finally {
      setTemplateToDelete(null);
    }
  }, [templateToDelete]);

  const handleViewHistory = useCallback((item: MessageHistory) => {
    setHistoryPreview(item);
  }, []);

  const handleRequestDeleteHistory = useCallback((item: MessageHistory) => {
    setHistoryToDelete(item);
  }, []);

  const confirmDeleteHistory = useCallback(async () => {
    if (!historyToDelete) return;
    try {
      await messagingService.deleteHistory(historyToDelete.id);
      setMessageHistory(prev => prev.filter(h => h.id !== historyToDelete.id));
      toast.success('History item deleted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete history item');
    } finally {
      setHistoryToDelete(null);
    }
  }, [historyToDelete]);

  const handleSendPromotion = useCallback((promo: Promotion) => {
    if (selectedRecipients.length === 0) {
      toast.error('Please select recipients first');
      return;
    }

    // Build WhatsApp message with promotion details
    const message = `*${promo.name}*\n\n${promo.description}\n\n${promo.code ? `Use Code: *${promo.code}*\n` : ''}Valid Until: ${format(promo.endDate, 'MMMM dd, yyyy')}\n\nVisit us today to claim this exclusive offer!`;
    
    setComposer(prev => ({
      ...prev,
      type: 'whatsapp',
      subject: promo.name,
      content: message
    }));
    
    toast.success(`Promotion "${promo.name}" ready to send to ${selectedRecipients.length} recipients`);
  }, [selectedRecipients]);

  const normalizePhone = useCallback((phone: string) => {
    return phone.replace(/[^\d]/g, '');
  }, []);

  const openClientMessage = useCallback((type: MessageComposer['type'], recipient: Recipient, content: string) => {
    if (!recipient.phone) return;
    if (type === 'whatsapp') {
      const phone = normalizePhone(recipient.phone);
      if (!phone) return;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(content)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (type === 'sms') {
      const url = `sms:${recipient.phone}?body=${encodeURIComponent(content)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [normalizePhone]);

  const handleSendMessage = useCallback(async () => {
    if (!composer.content || selectedRecipients.length === 0) {
      toast.error('Please select recipients and enter message content');
      return;
    }

    setIsSending(true);

    try {
      const selectedDetails = recipients.filter(r => selectedRecipients.includes(getRecipientKey(r)));
      if (composer.type === 'whatsapp' || composer.type === 'sms') {
        const validRecipients = selectedDetails.filter(r => r.phone && r.phone.trim() !== '');
        if (validRecipients.length === 0) {
          toast.error('Selected recipients have no phone numbers');
          setIsSending(false);
          return;
        }
        openClientMessageBulk(composer.type, validRecipients, composer.content);
      }
      await messagingService.sendMessage({
        type: composer.type,
        subject: composer.subject,
        content: composer.content,
        recipients: selectedDetails.map(r => ({ id: r.id, type: r.type })),
        personalization: composer.personalization
      });

      const [historyData, analyticsData] = await Promise.all([
        messagingService.getHistory(),
        messagingService.getAnalytics()
      ]);

      setMessageHistory(historyData.map((h: any) => {
        const sentDate = h.sent_date ? new Date(h.sent_date) : (h.scheduled_date ? new Date(h.scheduled_date) : new Date());
        return ({
          id: h.id,
          subject: h.subject,
          content: h.content,
          type: h.type,
          status: h.status,
          recipientCount: h.recipient_count ?? h.recipientCount ?? 0,
          recipients: h.recipients || [],
          sentDate,
          scheduledDate: h.scheduled_date ? new Date(h.scheduled_date) : undefined,
          deliveryRate: h.delivery_rate ?? h.deliveryRate ?? 0,
          openRate: h.open_rate ?? h.openRate ?? 0,
          clickRate: h.click_rate ?? h.clickRate ?? 0,
          sentBy: h.sent_by || h.sentBy || 'System',
          cost: h.cost ?? 0
        });
      }));

      setAnalytics({
        sentToday: analyticsData.sent_today ?? analyticsData.sentToday ?? 0,
        scheduledMessages: analyticsData.scheduled_messages ?? analyticsData.scheduledMessages ?? 0,
        totalRecipients: analyticsData.total_recipients ?? analyticsData.totalRecipients ?? 0,
        openRate: analyticsData.open_rate ?? analyticsData.openRate ?? 0,
        clickRate: analyticsData.click_rate ?? analyticsData.clickRate ?? 0,
        totalCost: analyticsData.total_cost ?? analyticsData.totalCost ?? 0
      });

      toast.success(`Message sent to ${selectedRecipients.length} recipients`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
    
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

    const scheduleSend = async () => {
      try {
        const selectedDetails = recipients.filter(r => selectedRecipients.includes(getRecipientKey(r)));
        await messagingService.sendMessage({
          type: composer.type,
          subject: composer.subject,
          content: composer.content,
          recipients: selectedDetails.map(r => ({ id: r.id, type: r.type })),
          personalization: composer.personalization,
          scheduled_at: format(scheduledDate, "yyyy-MM-dd'T'HH:mm:ss")
        });

        const [historyData, analyticsData] = await Promise.all([
          messagingService.getHistory(),
          messagingService.getAnalytics()
        ]);

        setMessageHistory(historyData.map((h: any) => {
          const sentDate = h.sent_date ? new Date(h.sent_date) : (h.scheduled_date ? new Date(h.scheduled_date) : new Date());
          return ({
            id: h.id,
            subject: h.subject,
            content: h.content,
            type: h.type,
            status: h.status,
            recipientCount: h.recipient_count ?? h.recipientCount ?? 0,
            recipients: h.recipients || [],
            sentDate,
            scheduledDate: h.scheduled_date ? new Date(h.scheduled_date) : undefined,
            deliveryRate: h.delivery_rate ?? h.deliveryRate ?? 0,
            openRate: h.open_rate ?? h.openRate ?? 0,
            clickRate: h.click_rate ?? h.clickRate ?? 0,
            sentBy: h.sent_by || h.sentBy || 'System',
            cost: h.cost ?? 0
          });
        }));

        setAnalytics({
          sentToday: analyticsData.sent_today ?? analyticsData.sentToday ?? 0,
          scheduledMessages: analyticsData.scheduled_messages ?? analyticsData.scheduledMessages ?? 0,
          totalRecipients: analyticsData.total_recipients ?? analyticsData.totalRecipients ?? 0,
          openRate: analyticsData.open_rate ?? analyticsData.openRate ?? 0,
          clickRate: analyticsData.click_rate ?? analyticsData.clickRate ?? 0,
          totalCost: analyticsData.total_cost ?? analyticsData.totalCost ?? 0
        });

        toast.success(`Message scheduled for ${format(scheduledDate, 'PPP')} at ${format(scheduledDate, 'HH:mm')}`);
      } catch (error: any) {
        toast.error(error?.message || 'Failed to schedule message');
      } finally {
        setShowScheduleDialog(false);
      }
    };

    scheduleSend();
    
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
    const fullName = recipient.name?.trim() || '';
    const firstName = fullName ? fullName.split(' ')[0] : '';
    const lastName = fullName ? fullName.replace(/^\S+\s*/, '') : '';
    const expiry = recipient.membershipExpiry ? format(recipient.membershipExpiry, 'MMM dd, yyyy') : 'N/A';
    const joined = recipient.joinDate ? format(recipient.joinDate, 'MMM dd, yyyy') : 'N/A';
    return content
      .replace(/{FirstName}/g, firstName)
      .replace(/{LastName}/g, lastName)
      .replace(/{FullName}/g, fullName)
      .replace(/{Email}/g, recipient.email || '')
      .replace(/{Phone}/g, recipient.phone || '')
      .replace(/{MembershipPlan}/g, recipient.membershipPlan || 'N/A')
      .replace(/{MembershipStatus}/g, recipient.membershipStatus || 'N/A')
      .replace(/{GymName}/g, 'GymBios Fitness')
      .replace(/{Location}/g, recipient.location || 'Main Branch')
      .replace(/{ExpiryDate}/g, expiry)
      .replace(/{JoinDate}/g, joined)
      .replace(/{Amount}/g, '')
      .replace(/{DueDate}/g, '')
      .replace(/{ClassName}/g, '')
      .replace(/{TrainerName}/g, '')
      .replace(/{ClassTime}/g, '');
  }, []);

  const openClientMessageBulk = useCallback((type: MessageComposer['type'], recipientsList: Recipient[], baseContent: string) => {
    if (recipientsList.length === 0) return;
    if (recipientsList.length > 1) {
      toast.success('Opening WhatsApp/SMS chats in new tabs. If tabs are blocked, allow pop-ups for this site.');
    }
    recipientsList.forEach((recipient, index) => {
      const content = composer.personalization ? personalizeContent(baseContent, recipient) : baseContent;
      const delay = index * 700;
      window.setTimeout(() => {
        openClientMessage(type, recipient, content);
      }, delay);
    });
  }, [composer.personalization, openClientMessage, personalizeContent]);

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
          <Button onClick={() => {
            setActiveTab('compose');
            setSelectedRecipients([]);
            setSelectedTemplate(null);
            setShowPreview(false);
            setComposer({
              type: 'email',
              subject: '',
              content: '',
              recipients: [],
              attachments: [],
              personalization: true
            });
          }}>
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </Button>
        </div>
      </div>

      {/* Analytics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Sent Today</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg">
              <Send className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{analytics.sentToday}</div>
            <p className="text-xs text-muted-foreground">Messages sent today</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Scheduled</CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{analytics.scheduledMessages}</div>
            <p className="text-xs text-muted-foreground">Queued for later</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Recipients</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{analytics.totalRecipients}</div>
            <p className="text-xs text-muted-foreground">Total reach</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Open Rate</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <Eye className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.openRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Average opens</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Click Rate</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <ExternalLink className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analytics.clickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Average clicks</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Cost</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <CreditCard className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600"><CurrencyGlyph /> {analytics.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total spend</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex">
          <TabsTrigger value="compose" className="flex-1">Compose</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
          <TabsTrigger value="templates" className="flex-1">Templates</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recipients Panel */}
            <Card className={`lg:col-span-1 ${cardShell}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recipients ({selectedRecipients.length})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="border-0"
                    onClick={() => setSelectedRecipients(filteredRecipients.map(r => getRecipientKey(r)))}
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
                    {filteredRecipients.filter(r => r.type === 'member' || r.type === 'staff').map((recipient) => (
                      <div key={recipient.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                           onClick={() => handleRecipientToggle(getRecipientKey(recipient))}>
                        <Checkbox 
                          checked={selectedRecipients.includes(getRecipientKey(recipient))}
                          onCheckedChange={() => handleRecipientToggle(getRecipientKey(recipient))}
                          onClick={(event) => event.stopPropagation()}
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
                           onClick={() => handleRecipientToggle(getRecipientKey(recipient))}>
                        <Checkbox 
                          checked={selectedRecipients.includes(getRecipientKey(recipient))}
                          onCheckedChange={() => handleRecipientToggle(getRecipientKey(recipient))}
                          onClick={(event) => event.stopPropagation()}
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
                      <div key={group.id} className="p-3 rounded-lg bg-slate-50/60 hover:bg-slate-100/70 transition-colors cursor-pointer"
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
            <Card className={`lg:col-span-2 ${cardShell}`}>
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" type="button">
                            <Smile className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64">
                          <div className="text-sm font-medium mb-2">Emoticons</div>
                          <div className="flex flex-wrap gap-2">
                            {emoticons.map(symbol => (
                              <Button
                                key={symbol}
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => setComposer(prev => ({
                                  ...prev,
                                  content: `${prev.content}${prev.content.endsWith(' ') || prev.content === '' ? '' : ' '}${symbol}`
                                }))}
                              >
                                {symbol}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            setComposer(prev => ({
                              ...prev,
                              attachments: [...prev.attachments, ...files]
                            }));
                          }
                          e.currentTarget.value = '';
                        }}
                      />
                    </div>
                  </div>
                  {composer.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <Label>Attachments</Label>
                      <div className="flex flex-col gap-2">
                        {composer.attachments.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                            <span className="truncate">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => setComposer(prev => ({
                                ...prev,
                                attachments: prev.attachments.filter((_, i) => i !== index)
                              }))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                                    <CurrencyGlyph /> {promo.discountValue} OFF
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
                <div>
                  <Label>Available Variables</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {availableVariables.map(variable => (
                      <Badge
                        key={variable}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => setComposer(prev => ({
                          ...prev,
                          content: `${prev.content}${prev.content.endsWith(' ') || prev.content === '' ? '' : ' '}${variable}`
                        }))}
                      >
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {selectedRecipients.length > 0 && composer.content && (
                  <div>
                    <Label>Preview (for {recipients.find(r => getRecipientKey(r) === selectedRecipients[0])?.name})</Label>
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      {composer.type === 'email' && composer.subject && (
                        <div className="font-medium mb-2">
                          Subject: {composer.personalization ? 
                            personalizeContent(composer.subject, recipients.find(r => getRecipientKey(r) === selectedRecipients[0])!) :
                            composer.subject
                          }
                        </div>
                      )}
                      <div>
                        {composer.personalization ? 
                          personalizeContent(composer.content, recipients.find(r => getRecipientKey(r) === selectedRecipients[0])!) :
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

        <TabsContent value="history" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Message History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
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
                    <TableRow key={message.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium">{message.subject}</p>
                          <p className="text-sm text-muted-foreground">{message.content}</p>
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
                        <span className="font-medium"><CurrencyGlyph /> {message.cost.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewHistory(message)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRequestDeleteHistory(message)}>
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
        </TabsContent>

        <TabsContent value="templates" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Message Templates</h2>
            <Button onClick={() => setShowNewTemplate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {messageTemplates.map((template) => (
              <Card key={template.id} className={cardShell}>
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
                    <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleCopyTemplate(template)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleRequestDeleteTemplate(template)}>
                      <Trash2 className="h-4 w-4" />
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{messageHistory.length}</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>
            
            <Card className={cardShell}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Open Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.openRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">+5.2% from last month</p>
              </CardContent>
            </Card>
            
            <Card className={cardShell}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Click Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.clickRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">+2.1% from last month</p>
              </CardContent>
            </Card>
            
            <Card className={cardShell}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><CurrencyGlyph /> {analytics.totalCost.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">-8.5% from last month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={cardShell}>
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

            <Card className={cardShell}>
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
                          <span>-</span>
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

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
            <DialogDescription>Preview the message with personalization applied</DialogDescription>
          </DialogHeader>
                  {selectedRecipients.length === 0 || !composer.content ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select at least one recipient and enter message content to preview.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Previewing for: <span className="font-medium text-foreground">
                      {recipients.find(r => getRecipientKey(r) === selectedRecipients[0])?.name || 'Recipient'}
                    </span>
                  </div>
                  {composer.type === 'email' && composer.subject && (
                    <div className="rounded border p-3">
                      <div className="text-xs text-muted-foreground">Subject</div>
                      <div className="font-medium">
                        {composer.personalization
                          ? personalizeContent(composer.subject, recipients.find(r => getRecipientKey(r) === selectedRecipients[0])!)
                          : composer.subject}
                      </div>
                    </div>
                  )}
                  <div className="rounded border p-4 text-sm whitespace-pre-wrap">
                    {composer.personalization
                      ? personalizeContent(composer.content, recipients.find(r => getRecipientKey(r) === selectedRecipients[0])!)
                      : composer.content}
                  </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Delete Confirm */}
      <Dialog open={!!templateToDelete} onOpenChange={(open) => {
        if (!open) setTemplateToDelete(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateToDelete(null)}>Cancel</Button>
            <Button onClick={confirmDeleteTemplate}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Preview Dialog */}
      <Dialog open={!!historyPreview} onOpenChange={(open) => {
        if (!open) setHistoryPreview(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>History Details</DialogTitle>
            <DialogDescription>Message details from history</DialogDescription>
          </DialogHeader>
          {historyPreview && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Type: <span className="text-foreground font-medium">{historyPreview.type}</span>
              </div>
              <div className="rounded border p-3">
                <div className="text-xs text-muted-foreground">Subject</div>
                <div className="font-medium">{historyPreview.subject}</div>
              </div>
              <div className="rounded border p-4 text-sm whitespace-pre-wrap">
                {historyPreview.content}
              </div>
              <div className="text-xs text-muted-foreground">
                Recipients: {historyPreview.recipientCount}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Delete Confirm */}
      <Dialog open={!!historyToDelete} onOpenChange={(open) => {
        if (!open) setHistoryToDelete(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete History Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this history item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryToDelete(null)}>Cancel</Button>
            <Button onClick={confirmDeleteHistory}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <Dialog open={showNewTemplate} onOpenChange={(open) => {
        setShowNewTemplate(open);
        if (!open) {
          setEditingTemplate(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Message Template' : 'Create Message Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update the selected message template' : 'Create a reusable message template'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                placeholder="Enter template name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="templateCategory">Category</Label>
              <Select
                value={templateForm.category}
                onValueChange={(value) => setTemplateForm(prev => ({ ...prev, category: value }))}
              >
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
              <Select
                value={templateForm.type}
                onValueChange={(value: any) => setTemplateForm(prev => ({ ...prev, type: value }))}
              >
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
              <Input
                id="templateSubject"
                placeholder="Enter subject"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="templateContent">Content</Label>
              <Textarea
                id="templateContent"
                placeholder="Enter template content..."
                rows={6}
                value={templateForm.content}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Available Variables</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {availableVariables.map(variable => (
                  <Badge
                    key={variable}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => setTemplateForm(prev => ({
                      ...prev,
                      content: `${prev.content}${prev.content.endsWith(' ') || prev.content === '' ? '' : ' '}${variable}`
                    }))}
                  >
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
              const saveTemplate = async () => {
                try {
                  if (editingTemplate) {
                    const updated = await messagingService.updateTemplate(editingTemplate.id, {
                      name: templateForm.name,
                      category: templateForm.category,
                      subject: templateForm.subject,
                      content: templateForm.content,
                      type: templateForm.type,
                      variables: []
                    });
                    setMessageTemplates(prev => prev.map(t => t.id === editingTemplate.id ? {
                      ...t,
                      name: updated.name,
                      category: updated.category || '',
                      subject: updated.subject,
                      content: updated.content,
                      type: updated.type,
                      variables: updated.variables || []
                    } : t));
                    toast.success('Template updated successfully');
                  } else {
                    const created = await messagingService.createTemplate({
                      name: templateForm.name,
                      category: templateForm.category,
                      subject: templateForm.subject,
                      content: templateForm.content,
                      type: templateForm.type,
                      variables: []
                    });
                    const mapped: MessageTemplate = {
                      id: created.id,
                      name: created.name,
                      category: created.category || '',
                      subject: created.subject,
                      content: created.content,
                      type: created.type,
                      variables: created.variables || [],
                      createdBy: created.created_by || 'System',
                      createdDate: created.created_date ? new Date(created.created_date) : new Date(),
                      usageCount: created.usage_count ?? 0
                    };
                    setMessageTemplates(prev => {
                      const withoutPromo = prev.filter(t => t.id !== 'promotions');
                      const promo = prev.find(t => t.id === 'promotions');
                      return promo ? [...withoutPromo, mapped, promo] : [...prev, mapped];
                    });
                    toast.success('Template created successfully');
                  }
                  setShowNewTemplate(false);
                  setEditingTemplate(null);
                  setTemplateForm({ name: '', category: '', type: 'email', subject: '', content: '' });
                } catch (error: any) {
                  toast.error(error?.message || 'Failed to create template');
                }
              };
              saveTemplate();
            }}>
              {editingTemplate ? 'Save Template' : 'Create Template'}
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
                <Input
                  id="groupName"
                  placeholder="Enter group name"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="groupDescription">Description</Label>
                <Input
                  id="groupDescription"
                  placeholder="Enter description"
                  value={groupForm.description}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                />
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
                        <Checkbox
                          id={`status-${status}`}
                          checked={groupForm.statuses.includes(status)}
                          onCheckedChange={(checked) => {
                            setGroupForm(prev => ({
                              ...prev,
                              statuses: checked
                                ? [...prev.statuses, status]
                                : prev.statuses.filter(s => s !== status)
                            }));
                          }}
                        />
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
                        <Checkbox
                          id={`plan-${plan}`}
                          checked={groupForm.plans.includes(plan)}
                          onCheckedChange={(checked) => {
                            setGroupForm(prev => ({
                              ...prev,
                              plans: checked
                                ? [...prev.plans, plan]
                                : prev.plans.filter(p => p !== plan)
                            }));
                          }}
                        />
                        <Label htmlFor={`plan-${plan}`}>{plan}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vip-only"
                    checked={groupForm.vipOnly}
                    onCheckedChange={(checked) => setGroupForm(prev => ({ ...prev, vipOnly: Boolean(checked) }))}
                  />
                  <Label htmlFor="vip-only">VIP Members Only</Label>
                </div>
              </div>
            </div>
            <div>
              <Label>Select Members (optional)</Label>
              <div className="mt-2 space-y-3">
                <Input
                  placeholder="Search members..."
                  value={groupMemberSearch}
                  onChange={(e) => setGroupMemberSearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto space-y-2 rounded border p-2">
                  {recipients
                    .filter(r => r.type === 'member')
                    .filter(r => {
                      if (!groupMemberSearch) return true;
                      const term = groupMemberSearch.toLowerCase();
                      return r.name.toLowerCase().includes(term)
                        || r.email.toLowerCase().includes(term)
                        || (r.phone || '').includes(term);
                    })
                    .map(member => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={groupForm.memberIds.includes(member.id)}
                          onCheckedChange={(checked) => {
                            setGroupForm(prev => ({
                              ...prev,
                              memberIds: checked
                                ? [...prev.memberIds, member.id]
                                : prev.memberIds.filter(id => id !== member.id)
                            }));
                          }}
                        />
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="text-[10px]">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{member.name}</span>
                        </div>
                      </div>
                    ))}
                  {recipients.filter(r => r.type === 'member').length === 0 && (
                    <div className="text-sm text-muted-foreground">No members available.</div>
                  )}
                </div>
                {groupForm.memberIds.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Selected {groupForm.memberIds.length} member{groupForm.memberIds.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroup(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              const createGroup = async () => {
                try {
                  const criteria: any = {};
                  if (groupForm.statuses.length > 0) criteria.membershipStatus = groupForm.statuses;
                  if (groupForm.plans.length > 0) criteria.membershipPlans = groupForm.plans;
                  if (groupForm.vipOnly) criteria.isVip = true;

                  const useManualMembers = groupForm.memberIds.length > 0;
                  const created = await messagingService.createGroup({
                    name: groupForm.name,
                    description: groupForm.description,
                    criteria: useManualMembers ? undefined : criteria,
                    members: useManualMembers ? groupForm.memberIds : []
                  });

                  setMessageGroups(prev => ([
                    ...prev,
                    {
                      id: created.id,
                      name: created.name,
                      description: created.description || '',
                      memberCount: created.member_count ?? (created.members ? created.members.length : 0),
                      members: created.members || [],
                      criteria: created.criteria || {},
                      createdBy: created.created_by || 'System',
                      createdDate: created.created_date ? new Date(created.created_date) : new Date(),
                      isSystem: created.system ?? false
                    }
                  ]));

                  toast.success('Group created successfully');
                  setShowNewGroup(false);
                  setGroupForm({ name: '', description: '', statuses: [], plans: [], vipOnly: false, memberIds: [] });
                  setGroupMemberSearch('');
                } catch (error: any) {
                  toast.error(error?.message || 'Failed to create group');
                }
              };
              createGroup();
            }}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

