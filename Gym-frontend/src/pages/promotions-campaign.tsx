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
import PolicyRuleBuilder from "../components/shared/PolicyRuleBuilder";
import EligibilityPreview from "../components/shared/EligibilityPreview";
import { Rule, Member } from "../utils/policyRuleEngine";
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Share, 
  Copy, 
  MoreHorizontal, 
  Download, 
  Upload, 
  Settings, 
  BarChart3, 
  PieChart, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  DollarSign, 
  Percent, 
  Tag, 
  Ticket, 
  Gift, 
  Megaphone, 
  Calendar as CalendarIcon, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ExternalLink, 
  Link, 
  Mail, 
  MessageSquare, 
  Bell, 
  Smartphone, 
  FileText, 
  MoreVertical, 
  Trash2, 
  Archive, 
  Star, 
  Target, 
  Zap, 
  Sparkles, 
  ShoppingCart, 
  CreditCard, 
  Calendar as CalendarAlt, 
  CalendarDays, 
  CalendarCheck, 
  CalendarX, 
  Timer,
  Building,
  Package,
  Globe,
  Heart,
  Layers,
  List,
  Grid,
  SortAsc,
  SortDesc,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Flame,
  Crown,
  PartyPopper,
  Coffee,
  Dumbbell
} from 'lucide-react';
import { toast } from "sonner";
import { format, addDays, isAfter, isBefore, isToday, isTomorrow, isYesterday, addWeeks, subDays, addMonths } from "date-fns";
import { cn } from "../components/ui/utils";

interface Promotion {
  id: string;
  name: string;
  type: 'discount' | 'voucher' | 'combo' | 'bogo' | 'seasonal' | 'loyalty';
  status: 'active' | 'scheduled' | 'expired' | 'paused' | 'draft';
  description: string;
  startDate: Date;
  endDate: Date;
  createdDate: Date;
  discountType: 'percentage' | 'fixed' | 'free';
  discountValue: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  usageLimitPerMember?: number;
  code?: string; // For voucher codes
  applicablePlans: string[];
  applicableServices: string[];
  targetAudience: 'all' | 'new-members' | 'existing-members' | 'vip' | 'specific';
  specificMembers?: string[];
  channels: ('website' | 'app' | 'email' | 'sms' | 'in-person')[];
  autoApply: boolean;
  stackable: boolean;
  priority: number;
  category: string;
  tags: string[];
  createdBy: string;
  totalRevenue: number;
  totalSavings: number;
  conversionRate: number;
  clickCount: number;
  redemptionRate: number;
  averageOrderValue: number;
  image?: string;
  termsAndConditions?: string;
  isPublic: boolean;
}

interface PromotionAnalytics {
  period: 'today' | 'week' | 'month' | 'quarter' | 'year';
  totalPromotions: number;
  activePromotions: number;
  expiredPromotions: number;
  totalRedemptions: number;
  totalRevenue: number;
  totalSavings: number;
  conversionRate: number;
  topPerformingPromotion: string;
  revenueGrowth: number;
  redemptionGrowth: number;
}

export function PromotionsCampaign() {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeView, setActiveView] = useState<'grid' | 'table'>('grid');
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [showAddPromotion, setShowAddPromotion] = useState(false);
  const [showPromotionDetail, setShowPromotionDetail] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedPromotions, setSelectedPromotions] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof Promotion>('createdDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showPreview, setShowPreview] = useState(false);
  const [previewPromotion, setPreviewPromotion] = useState<Promotion | null>(null);
  const [showFlyerModal, setShowFlyerModal] = useState(false);
  const [flyerPromotion, setFlyerPromotion] = useState<Promotion | null>(null);

  // Promotional Access Days feature
  const PROMO_ACCESS_DAYS = "promotional-access-days";
  const [promotionType, setPromotionType] = useState("");
  const [discountType, setDiscountType] = useState("");
  const [policy, setPolicy] = useState({
    applyRule: "",
    accessDays: 0,
    validityFrom: "",
    validityTo: "",
    expiringInDays: 0,
    includeGuests: false
  });
  const [policyRules, setPolicyRules] = useState<Rule[]>([]);

  // Sample members data for preview (in production, this would come from your backend)
  const sampleMembers: Member[] = useMemo(() => [
    {
      id: "m1",
      name: "Ahmed Hassan",
      email: "ahmed.hassan@example.com",
      membershipType: "individual",
      joinedAt: "2023-06-15",
      currentPlan: {
        name: "Premium Annual",
        durationMonths: 12,
        startDate: "2024-01-01",
        endDate: "2024-12-31"
      },
      renewalCount: 2,
      purchaseDate: "2024-01-01"
    },
    {
      id: "m2",
      name: "Fatima Al-Mansoori",
      email: "fatima.mansoori@example.com",
      membershipType: "family",
      joinedAt: "2024-01-10",
      currentPlan: {
        name: "Family Monthly",
        durationMonths: 3,
        startDate: "2024-01-10",
        endDate: "2024-04-10"
      },
      renewalCount: 0,
      purchaseDate: "2024-01-10"
    },
    {
      id: "m3",
      name: "Mohammed Al-Zaabi",
      email: "mohammed.zaabi@example.com",
      membershipType: "corporate",
      joinedAt: "2023-03-20",
      currentPlan: {
        name: "Corporate Annual",
        durationMonths: 12,
        startDate: "2023-03-20",
        endDate: "2024-03-20"
      },
      renewalCount: 1,
      purchaseDate: "2023-03-20"
    },
    {
      id: "m4",
      name: "Sara Ahmed",
      email: "sara.ahmed@example.com",
      membershipType: "individual",
      joinedAt: "2024-02-01",
      currentPlan: {
        name: "Standard Monthly",
        durationMonths: 6,
        startDate: "2024-02-01",
        endDate: "2024-08-01"
      },
      renewalCount: 0,
      purchaseDate: "2024-02-01"
    },
    {
      id: "m5",
      name: "Khalid Ibrahim",
      email: "khalid.ibrahim@example.com",
      membershipType: "individual",
      joinedAt: "2023-09-15",
      currentPlan: {
        name: "Premium Monthly",
        durationMonths: 3,
        startDate: "2024-01-15",
        endDate: "2024-04-15"
      },
      renewalCount: 3,
      purchaseDate: "2024-01-15"
    },
    {
      id: "m6",
      name: "Layla Hassan",
      email: "layla.hassan@example.com",
      membershipType: "family",
      joinedAt: "2023-11-20",
      currentPlan: {
        name: "Family Annual",
        durationMonths: 12,
        startDate: "2023-11-20",
        endDate: "2024-11-20"
      },
      renewalCount: 1,
      purchaseDate: "2023-11-20"
    },
    {
      id: "m7",
      name: "Omar Abdullah",
      email: "omar.abdullah@example.com",
      membershipType: "individual",
      joinedAt: "2024-01-25",
      currentPlan: {
        name: "Standard Monthly",
        durationMonths: 1,
        startDate: "2024-01-25",
        endDate: "2024-02-25"
      },
      renewalCount: 0,
      purchaseDate: "2024-01-25"
    },
    {
      id: "m8",
      name: "Noura Al-Kaabi",
      email: "noura.kaabi@example.com",
      membershipType: "corporate",
      joinedAt: "2023-05-10",
      currentPlan: {
        name: "Corporate Annual",
        durationMonths: 12,
        startDate: "2023-05-10",
        endDate: "2024-05-10"
      },
      renewalCount: 2,
      purchaseDate: "2023-05-10"
    },
    {
      id: "m9",
      name: "Rashid Al-Shamsi",
      email: "rashid.shamsi@example.com",
      membershipType: "individual",
      joinedAt: "2023-12-01",
      currentPlan: {
        name: "Premium Monthly",
        durationMonths: 6,
        startDate: "2023-12-01",
        endDate: "2024-06-01"
      },
      renewalCount: 1,
      purchaseDate: "2023-12-01"
    },
    {
      id: "m10",
      name: "Maryam Ali",
      email: "maryam.ali@example.com",
      membershipType: "family",
      joinedAt: "2024-01-05",
      currentPlan: {
        name: "Family Monthly",
        durationMonths: 3,
        startDate: "2024-01-05",
        endDate: "2024-04-05"
      },
      renewalCount: 0,
      purchaseDate: "2024-01-05"
    }
  ], []);

  // Sample data - in real app this would come from your backend
  const promotions: Promotion[] = [
    {
      id: '1',
      name: 'New Year Fitness Challenge',
      type: 'seasonal',
      status: 'active',
      description: 'Start your fitness journey with 30% off all annual memberships',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      createdDate: new Date('2023-12-15'),
      discountType: 'percentage',
      discountValue: 30,
      minimumPurchase: 1000,
      maximumDiscount: 500,
      usageLimit: 100,
      usageCount: 45,
      usageLimitPerMember: 1,
      code: 'NEWYEAR2024',
      applicablePlans: ['Premium Annual', 'Standard Annual'],
      applicableServices: [],
      targetAudience: 'new-members',
      channels: ['website', 'app', 'email', 'sms'],
      autoApply: false,
      stackable: false,
      priority: 1,
      category: 'Membership',
      tags: ['new-year', 'discount', 'annual'],
      createdBy: 'Sarah Johnson',
      totalRevenue: 67500,
      totalSavings: 22500,
      conversionRate: 15.2,
      clickCount: 1250,
      redemptionRate: 45,
      averageOrderValue: 1500,
      termsAndConditions: 'Valid for new memberships only. Cannot be combined with other offers.',
      isPublic: true
    },
    {
      id: '2',
      name: 'Valentine\'s Couples Package',
      type: 'combo',
      status: 'scheduled',
      description: 'Perfect for couples! Get 2 memberships for the price of 1.5',
      startDate: new Date('2024-02-10'),
      endDate: new Date('2024-02-20'),
      createdDate: new Date('2024-01-20'),
      discountType: 'fixed',
      discountValue: 750,
      minimumPurchase: 2000,
      usageLimit: 50,
      usageCount: 0,
      usageLimitPerMember: 1,
      code: 'VALENTINE2024',
      applicablePlans: ['Standard Monthly', 'Premium Monthly'],
      applicableServices: ['Personal Training'],
      targetAudience: 'all',
      channels: ['website', 'app', 'email'],
      autoApply: false,
      stackable: false,
      priority: 2,
      category: 'Special Events',
      tags: ['valentine', 'couples', 'combo'],
      createdBy: 'Ahmed Hassan',
      totalRevenue: 0,
      totalSavings: 0,
      conversionRate: 0,
      clickCount: 245,
      redemptionRate: 0,
      averageOrderValue: 0,
      termsAndConditions: 'Both members must sign up together. Valid for couples only.',
      isPublic: true
    },
    {
      id: '3',
      name: 'Loyalty Rewards Plus',
      type: 'loyalty',
      status: 'active',
      description: 'Exclusive 15% discount for our VIP members',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      createdDate: new Date('2023-12-01'),
      discountType: 'percentage',
      discountValue: 15,
      usageLimit: 1000,
      usageCount: 128,
      usageLimitPerMember: 12,
      applicablePlans: ['Premium Monthly', 'Premium Annual'],
      applicableServices: ['Personal Training', 'Group Classes', 'Nutrition Counseling'],
      targetAudience: 'vip',
      channels: ['app', 'in-person'],
      autoApply: true,
      stackable: true,
      priority: 3,
      category: 'Loyalty',
      tags: ['vip', 'loyalty', 'recurring'],
      createdBy: 'Maria Rodriguez',
      totalRevenue: 38400,
      totalSavings: 6720,
      conversionRate: 85.6,
      clickCount: 150,
      redemptionRate: 128,
      averageOrderValue: 300,
      termsAndConditions: 'Available to VIP members only. Automatically applied at checkout.',
      isPublic: false
    },
    {
      id: '4',
      name: 'Student Discount',
      type: 'discount',
      status: 'active',
      description: 'Special pricing for students with valid ID',
      startDate: new Date('2023-09-01'),
      endDate: new Date('2024-06-30'),
      createdDate: new Date('2023-08-15'),
      discountType: 'percentage',
      discountValue: 20,
      usageLimit: 200,
      usageCount: 67,
      usageLimitPerMember: 1,
      code: 'STUDENT2024',
      applicablePlans: ['Standard Monthly', 'Standard Annual'],
      applicableServices: [],
      targetAudience: 'specific',
      channels: ['website', 'in-person'],
      autoApply: false,
      stackable: false,
      priority: 4,
      category: 'Demographics',
      tags: ['student', 'education', 'verification'],
      createdBy: 'David Wilson',
      totalRevenue: 26800,
      totalSavings: 6700,
      conversionRate: 33.5,
      clickCount: 890,
      redemptionRate: 67,
      averageOrderValue: 400,
      termsAndConditions: 'Valid student ID required. One-time use per academic year.',
      isPublic: true
    },
    {
      id: '5',
      name: 'Summer BOGO Classes',
      type: 'bogo',
      status: 'expired',
      description: 'Buy one group class, get one free during summer months',
      startDate: new Date('2023-06-01'),
      endDate: new Date('2023-08-31'),
      createdDate: new Date('2023-05-15'),
      discountType: 'free',
      discountValue: 100,
      usageLimit: 300,
      usageCount: 298,
      usageLimitPerMember: 10,
      code: 'SUMMERBOGO',
      applicablePlans: [],
      applicableServices: ['Group Classes'],
      targetAudience: 'all',
      channels: ['website', 'app', 'email'],
      autoApply: false,
      stackable: false,
      priority: 2,
      category: 'Services',
      tags: ['summer', 'bogo', 'classes'],
      createdBy: 'Sarah Johnson',
      totalRevenue: 44700,
      totalSavings: 29800,
      conversionRate: 99.3,
      clickCount: 2100,
      redemptionRate: 298,
      averageOrderValue: 150,
      termsAndConditions: 'Valid for group classes only. Limited to 10 uses per member.',
      isPublic: true
    }
  ];

  // Calculate analytics
  const analytics = useMemo((): PromotionAnalytics => {
    const totalPromotions = promotions.length;
    const activePromotions = promotions.filter(p => p.status === 'active').length;
    const expiredPromotions = promotions.filter(p => p.status === 'expired').length;
    const totalRedemptions = promotions.reduce((sum, p) => sum + p.usageCount, 0);
    const totalRevenue = promotions.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalSavings = promotions.reduce((sum, p) => sum + p.totalSavings, 0);
    const avgConversionRate = promotions.length > 0 ? 
      promotions.reduce((sum, p) => sum + p.conversionRate, 0) / promotions.length : 0;
    const topPromotion = promotions.reduce((top, p) => 
      p.totalRevenue > (top?.totalRevenue || 0) ? p : top, promotions[0]);

    return {
      period: 'month',
      totalPromotions,
      activePromotions,
      expiredPromotions,
      totalRedemptions,
      totalRevenue,
      totalSavings,
      conversionRate: avgConversionRate,
      topPerformingPromotion: topPromotion?.name || 'None',
      revenueGrowth: 12.5,
      redemptionGrowth: 8.3
    };
  }, [promotions]);

  // Filter and sort promotions
  const filteredPromotions = useMemo(() => {
    let filtered = promotions.filter(promotion => {
      const matchesSearch = searchTerm === '' || 
        promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promotion.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promotion.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promotion.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || promotion.status === statusFilter;
      const matchesType = typeFilter === 'all' || promotion.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || promotion.category === categoryFilter;
      
      let matchesDate = true;
      if (dateFilter === 'active') {
        matchesDate = promotion.status === 'active';
      } else if (dateFilter === 'upcoming') {
        matchesDate = promotion.status === 'scheduled';
      } else if (dateFilter === 'expiring-soon') {
        const nextWeek = addWeeks(new Date(), 1);
        matchesDate = promotion.status === 'active' && isBefore(promotion.endDate, nextWeek);
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesCategory && matchesDate;
    });

    // Sort promotions
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
  }, [promotions, searchTerm, statusFilter, typeFilter, categoryFilter, dateFilter, sortField, sortDirection]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'discount': return 'bg-blue-100 text-blue-800';
      case 'voucher': return 'bg-green-100 text-green-800';
      case 'combo': return 'bg-purple-100 text-purple-800';
      case 'bogo': return 'bg-orange-100 text-orange-800';
      case 'seasonal': return 'bg-pink-100 text-pink-800';
      case 'loyalty': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'discount': return <Percent className="h-4 w-4" />;
      case 'voucher': return <Ticket className="h-4 w-4" />;
      case 'combo': return <Gift className="h-4 w-4" />;
      case 'bogo': return <ShoppingCart className="h-4 w-4" />;
      case 'seasonal': return <Sparkles className="h-4 w-4" />;
      case 'loyalty': return <Crown className="h-4 w-4" />;
      default: return <Tag className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'scheduled': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'expired': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'paused': return <Timer className="h-4 w-4 text-yellow-600" />;
      case 'draft': return <FileText className="h-4 w-4 text-gray-600" />;
      default: return <Circle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDiscount = (promotion: Promotion) => {
    if (promotion.discountType === 'percentage') {
      return `${promotion.discountValue}% OFF`;
    } else if (promotion.discountType === 'fixed') {
      return `${promotion.discountValue} AED OFF`;
    } else {
      return 'FREE';
    }
  };

  const getUsageProgress = (promotion: Promotion) => {
    if (!promotion.usageLimit) return 0;
    return (promotion.usageCount / promotion.usageLimit) * 100;
  };

  const handlePromotionClick = useCallback((promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setShowPromotionDetail(true);
  }, []);

  const handleQuickAction = useCallback((promotion: Promotion, action: string) => {
    switch (action) {
      case 'share':
        setFlyerPromotion(promotion);
        setShowFlyerModal(true);
        break;
      case 'edit':
        toast.info('Edit promotion feature coming soon!');
        break;
      case 'preview':
        setPreviewPromotion(promotion);
        setShowPreview(true);
        break;
      case 'duplicate':
        toast.success(`Created duplicate of ${promotion.name}`);
        break;
      case 'pause':
        toast.success(`Promotion ${promotion.name} paused`);
        break;
      case 'activate':
        toast.success(`Promotion ${promotion.name} activated`);
        break;
      default:
        toast.info(`Action: ${action} for ${promotion.name}`);
    }
  }, []);

  const handleBulkAction = useCallback((action: string) => {
    if (selectedPromotions.length === 0) {
      toast.error('Please select promotions first');
      return;
    }
    
    switch (action) {
      case 'activate':
        toast.success(`Activated ${selectedPromotions.length} promotions`);
        break;
      case 'pause':
        toast.success(`Paused ${selectedPromotions.length} promotions`);
        break;
      case 'duplicate':
        toast.success(`Duplicated ${selectedPromotions.length} promotions`);
        break;
      case 'delete':
        toast.success(`Deleted ${selectedPromotions.length} promotions`);
        break;
      default:
        toast.info(`Action: ${action} for ${selectedPromotions.length} promotions`);
    }
    setSelectedPromotions([]);
    setShowBulkActions(false);
  }, [selectedPromotions]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Promotions & Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Create, manage, and track promotional campaigns to boost member engagement and revenue
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
          <Button onClick={() => setShowAddPromotion(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Promotion
          </Button>
        </div>
      </div>

      {/* Analytics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{analytics.totalPromotions}</p>
              </div>
              <Megaphone className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{analytics.activePromotions}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-red-600">{analytics.expiredPromotions}</p>
              </div>
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Redemptions</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.totalRedemptions}</p>
              </div>
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold text-green-600">{analytics.totalRevenue.toLocaleString()} AED</p>
              </div>
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Savings</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.totalSavings.toLocaleString()} AED</p>
              </div>
              <Sparkles className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.conversionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Growth</p>
                <p className="text-2xl font-bold text-indigo-600">+{analytics.revenueGrowth}%</p>
              </div>
              <ArrowUp className="h-6 w-6 text-indigo-600" />
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
                  placeholder="Search promotions by name, code, or tags..."
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
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="discount">Discount</SelectItem>
                  <SelectItem value="voucher">Voucher</SelectItem>
                  <SelectItem value="combo">Combo</SelectItem>
                  <SelectItem value="bogo">BOGO</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="loyalty">Loyalty</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Membership">Membership</SelectItem>
                  <SelectItem value="Services">Services</SelectItem>
                  <SelectItem value="Special Events">Special Events</SelectItem>
                  <SelectItem value="Loyalty">Loyalty</SelectItem>
                  <SelectItem value="Demographics">Demographics</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Date Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="active">Currently Active</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
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

      {/* Bulk Actions */}
      {selectedPromotions.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{selectedPromotions.length} promotions selected</span>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')}>
                Activate
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('pause')}>
                Pause
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('duplicate')}>
                Duplicate
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')}>
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedPromotions([])}>
                Clear
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      {activeView === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPromotions.map((promotion) => (
            <Card key={promotion.id} className="hover:shadow-lg transition-shadow cursor-pointer relative group">
              <div className="absolute top-4 left-4">
                <Checkbox
                  checked={selectedPromotions.includes(promotion.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedPromotions([...selectedPromotions, promotion.id]);
                    } else {
                      setSelectedPromotions(selectedPromotions.filter(id => id !== promotion.id));
                    }
                  }}
                  className="bg-white border-2"
                />
              </div>
              
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40" align="end">
                    <div className="space-y-1">
                      <Button variant="ghost" size="sm" className="w-full justify-start" 
                             onClick={() => handleQuickAction(promotion, 'preview')}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start"
                             onClick={() => handleQuickAction(promotion, 'edit')}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start"
                             onClick={() => handleQuickAction(promotion, 'share')}>
                        <Share className="mr-2 h-4 w-4" />
                        Share
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start"
                             onClick={() => handleQuickAction(promotion, 'duplicate')}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </Button>
                      <Separator />
                      {promotion.status === 'active' ? (
                        <Button variant="ghost" size="sm" className="w-full justify-start"
                               onClick={() => handleQuickAction(promotion, 'pause')}>
                          <Timer className="mr-2 h-4 w-4" />
                          Pause
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="w-full justify-start"
                               onClick={() => handleQuickAction(promotion, 'activate')}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Activate
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <CardContent className="p-6" onClick={() => handlePromotionClick(promotion)}>
                <div className="space-y-4">
                  {/* Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={getTypeColor(promotion.type)}>
                        {getTypeIcon(promotion.type)}
                        <span className="ml-1 capitalize">{promotion.type}</span>
                      </Badge>
                      <Badge className={getStatusColor(promotion.status)}>
                        {getStatusIcon(promotion.status)}
                        <span className="ml-1 capitalize">{promotion.status}</span>
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg leading-tight">{promotion.name}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">{promotion.description}</p>
                  </div>

                  {/* Discount Badge */}
                  <div className="flex items-center justify-center py-3">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-4 py-2 font-bold text-lg">
                      {formatDiscount(promotion)}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3">
                    {promotion.code && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm font-mono">{promotion.code}</span>
                        <Button size="sm" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAction(promotion, 'share');
                        }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valid until:</span>
                      <span className="font-medium">{format(promotion.endDate, 'MMM dd, yyyy')}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Used:</span>
                      <span className="font-medium">
                        {promotion.usageCount}{promotion.usageLimit ? `/${promotion.usageLimit}` : ''}
                      </span>
                    </div>

                    {promotion.usageLimit && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Usage Progress</span>
                          <span>{getUsageProgress(promotion).toFixed(0)}%</span>
                        </div>
                        <Progress value={getUsageProgress(promotion)} className="h-2" />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Revenue:</span>
                      <span className="font-medium text-green-600">{promotion.totalRevenue.toLocaleString()} AED</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {promotion.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {promotion.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{promotion.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Promotions List ({filteredPromotions.length})</span>
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
                      checked={selectedPromotions.length === filteredPromotions.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPromotions(filteredPromotions.map(p => p.id));
                        } else {
                          setSelectedPromotions([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Promotion</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPromotions.map((promotion) => (
                  <TableRow key={promotion.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedPromotions.includes(promotion.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPromotions([...selectedPromotions, promotion.id]);
                          } else {
                            setSelectedPromotions(selectedPromotions.filter(id => id !== promotion.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell onClick={() => handlePromotionClick(promotion)}>
                      <div>
                        <p className="font-medium">{promotion.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{promotion.description}</p>
                        {promotion.code && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {promotion.code}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(promotion.type)}>
                        {getTypeIcon(promotion.type)}
                        <span className="ml-1 capitalize">{promotion.type}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(promotion.status)}>
                        {getStatusIcon(promotion.status)}
                        <span className="ml-1 capitalize">{promotion.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-purple-600">
                        {formatDiscount(promotion)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {promotion.usageCount}{promotion.usageLimit ? `/${promotion.usageLimit}` : ''}
                        </span>
                        {promotion.usageLimit && (
                          <Progress value={getUsageProgress(promotion)} className="w-16 h-1 mt-1" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-sm",
                        isAfter(promotion.endDate, new Date()) ? "text-green-600" : "text-red-600"
                      )}>
                        {format(promotion.endDate, 'MMM dd, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-green-600">
                        {promotion.totalRevenue.toLocaleString()} AED
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => handleQuickAction(promotion, 'preview')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleQuickAction(promotion, 'edit')}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleQuickAction(promotion, 'share')}>
                          <Share className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handlePromotionClick(promotion)}>
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
      )}

      {/* Promotion Detail Sheet */}
      <Sheet open={showPromotionDetail} onOpenChange={setShowPromotionDetail}>
        <SheetContent className="w-full sm:w-[600px] sm:max-w-none overflow-y-auto">
          {selectedPromotion && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(selectedPromotion.type)}
                    <h3 className="text-xl font-bold">{selectedPromotion.name}</h3>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getStatusColor(selectedPromotion.status)}>
                      {getStatusIcon(selectedPromotion.status)}
                      <span className="ml-1 capitalize">{selectedPromotion.status}</span>
                    </Badge>
                    <Badge className={getTypeColor(selectedPromotion.type)}>
                      <span className="capitalize">{selectedPromotion.type}</span>
                    </Badge>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Promotion Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Promotion Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Description</Label>
                      <p className="font-medium">{selectedPromotion.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Discount</Label>
                        <p className="font-medium text-purple-600 text-lg">{formatDiscount(selectedPromotion)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Category</Label>
                        <p className="font-medium">{selectedPromotion.category}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Start Date</Label>
                        <p className="font-medium">{format(selectedPromotion.startDate, 'PPP')}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">End Date</Label>
                        <p className="font-medium">{format(selectedPromotion.endDate, 'PPP')}</p>
                      </div>
                    </div>

                    {selectedPromotion.code && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Promotion Code</Label>
                        <div className="flex items-center space-x-2 p-2 bg-muted rounded-md">
                          <span className="font-mono font-medium">{selectedPromotion.code}</span>
                          <Button size="sm" variant="ghost" onClick={() => handleQuickAction(selectedPromotion, 'share')}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm text-muted-foreground">Tags</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedPromotion.tags.map(tag => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>

                    {selectedPromotion.termsAndConditions && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Terms & Conditions</Label>
                        <p className="text-sm bg-muted/50 rounded-md p-3">{selectedPromotion.termsAndConditions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Usage & Limits */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Usage & Limits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Usage Count</Label>
                        <p className="font-medium text-2xl text-blue-600">{selectedPromotion.usageCount}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Usage Limit</Label>
                        <p className="font-medium text-2xl">{selectedPromotion.usageLimit || 'Unlimited'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Per Member Limit</Label>
                        <p className="font-medium">{selectedPromotion.usageLimitPerMember || 'Unlimited'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Minimum Purchase</Label>
                        <p className="font-medium">{selectedPromotion.minimumPurchase ? `${selectedPromotion.minimumPurchase} AED` : 'None'}</p>
                      </div>
                    </div>

                    {selectedPromotion.usageLimit && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Usage Progress</span>
                          <span>{getUsageProgress(selectedPromotion).toFixed(1)}%</span>
                        </div>
                        <Progress value={getUsageProgress(selectedPromotion)} className="h-3" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Performance Analytics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Total Revenue</Label>
                        <p className="font-medium text-2xl text-green-600">{selectedPromotion.totalRevenue.toLocaleString()} AED</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Total Savings</Label>
                        <p className="font-medium text-2xl text-orange-600">{selectedPromotion.totalSavings.toLocaleString()} AED</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Conversion Rate</Label>
                        <p className="font-medium text-xl">{selectedPromotion.conversionRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Avg Order Value</Label>
                        <p className="font-medium text-xl">{selectedPromotion.averageOrderValue} AED</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Click Count</Label>
                        <p className="font-medium">{selectedPromotion.clickCount.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Redemption Rate</Label>
                        <p className="font-medium">{selectedPromotion.redemptionRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Targeting & Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Targeting & Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Target Audience</Label>
                      <Badge variant="outline" className="capitalize">
                        {selectedPromotion.targetAudience.replace('-', ' ')}
                      </Badge>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Distribution Channels</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedPromotion.channels.map(channel => (
                          <Badge key={channel} variant="outline" className="capitalize">
                            {channel.replace('-', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Applicable Plans</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedPromotion.applicablePlans.map(plan => (
                          <Badge key={plan} variant="outline">{plan}</Badge>
                        ))}
                      </div>
                    </div>

                    {selectedPromotion.applicableServices.length > 0 && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Applicable Services</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedPromotion.applicableServices.map(service => (
                            <Badge key={service} variant="outline">{service}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Auto Apply</Label>
                        <p className="font-medium">{selectedPromotion.autoApply ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Stackable</Label>
                        <p className="font-medium">{selectedPromotion.stackable ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Priority</Label>
                        <p className="font-medium">{selectedPromotion.priority}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Public</Label>
                        <p className="font-medium">{selectedPromotion.isPublic ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Created By</Label>
                      <p className="font-medium">{selectedPromotion.createdBy}</p>
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
                      <Button onClick={() => handleQuickAction(selectedPromotion, 'edit')} className="justify-start">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Promotion
                      </Button>
                      <Button onClick={() => handleQuickAction(selectedPromotion, 'share')} className="justify-start">
                        <Share className="mr-2 h-4 w-4" />
                        Share Code
                      </Button>
                      <Button onClick={() => handleQuickAction(selectedPromotion, 'preview')} className="justify-start">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                      <Button onClick={() => handleQuickAction(selectedPromotion, 'duplicate')} className="justify-start">
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add New Promotion Dialog */}
      <Dialog open={showAddPromotion} onOpenChange={setShowAddPromotion}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Promotion</DialogTitle>
            <DialogDescription>
              Design and configure a new promotional campaign
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="discount">Discount</TabsTrigger>
              <TabsTrigger value="targeting">Targeting</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Promotion Name</Label>
                  <Input id="name" placeholder="Enter promotion name" />
                </div>
                <div>
                  <Label htmlFor="type">Promotion Type</Label>
                  <Select value={promotionType} onValueChange={(val) => {
                    setPromotionType(val);
                    if (val === PROMO_ACCESS_DAYS) {
                      setDiscountType(PROMO_ACCESS_DAYS);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">Discount</SelectItem>
                      <SelectItem value="voucher">Voucher</SelectItem>
                      <SelectItem value="combo">Combo</SelectItem>
                      <SelectItem value="bogo">BOGO</SelectItem>
                      <SelectItem value="seasonal">Seasonal</SelectItem>
                      <SelectItem value="loyalty">Loyalty</SelectItem>
                      <SelectItem value={PROMO_ACCESS_DAYS}>Promotional Access Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Describe your promotion" />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" type="date" />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membership">Membership</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="special-events">Special Events</SelectItem>
                      <SelectItem value="loyalty">Loyalty</SelectItem>
                      <SelectItem value="demographics">Demographics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="code">Promotion Code (Optional)</Label>
                  <Input id="code" placeholder="e.g., NEWYEAR2024" />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="discount" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discountType">Discount Type</Label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="free">Free/BOGO</SelectItem>
                      <SelectItem value={PROMO_ACCESS_DAYS}>Promotional Access Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Hide Discount Value when Promotional Access Days is selected */}
                {promotionType !== PROMO_ACCESS_DAYS && discountType !== PROMO_ACCESS_DAYS && (
                  <div>
                    <Label htmlFor="discountValue">Discount Value</Label>
                    <Input id="discountValue" type="number" placeholder="Enter value" />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="minimumPurchase">Minimum Purchase (AED)</Label>
                  <Input id="minimumPurchase" type="number" placeholder="Optional" />
                </div>
                <div>
                  <Label htmlFor="maximumDiscount">Maximum Discount (AED)</Label>
                  <Input id="maximumDiscount" type="number" placeholder="Optional" />
                </div>
                <div>
                  <Label htmlFor="usageLimit">Total Usage Limit</Label>
                  <Input id="usageLimit" type="number" placeholder="Leave empty for unlimited" />
                </div>
                <div>
                  <Label htmlFor="memberLimit">Usage Limit Per Member</Label>
                  <Input id="memberLimit" type="number" placeholder="Leave empty for unlimited" />
                </div>
              </div>

              {/* Promotional Access Days - Advanced Policy Rule Builder */}
              {(promotionType === PROMO_ACCESS_DAYS || discountType === PROMO_ACCESS_DAYS) && (
                <div className="space-y-6 mt-6">
                  <Separator />
                  
                  {/* Policy Rule Builder */}
                  <div>
                    <h3 className="text-lg font-semibold text-[#1E293B] mb-2 flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-[#2B7A78]" />
                      Configure Access Days Rules
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create flexible rules to determine which members are eligible and how many days they receive
                    </p>
                    <PolicyRuleBuilder
                      rules={policyRules}
                      onChange={(newRules) => setPolicyRules(newRules)}
                    />
                  </div>

                  <Separator />

                  {/* Eligibility Preview */}
                  <div>
                    <EligibilityPreview
                      members={sampleMembers}
                      rules={policyRules}
                      onApply={async (matches) => {
                        // In production, this would call your backend API
                        console.log("Applying promotion to members:", matches);
                        toast.success("Promotion applied successfully!", {
                          description: `${matches.length} members will receive promotional access days`,
                        });
                      }}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="targeting" className="space-y-4">
              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="new-members">New Members</SelectItem>
                    <SelectItem value="existing-members">Existing Members</SelectItem>
                    <SelectItem value="vip">VIP Members</SelectItem>
                    <SelectItem value="specific">Specific Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Distribution Channels</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="website" />
                    <Label htmlFor="website">Website</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="app" />
                    <Label htmlFor="app">Mobile App</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="email" />
                    <Label htmlFor="email">Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="sms" />
                    <Label htmlFor="sms">SMS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="in-person" />
                    <Label htmlFor="in-person">In-Person</Label>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Applicable Plans</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="standard-monthly" />
                    <Label htmlFor="standard-monthly">Standard Monthly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="standard-annual" />
                    <Label htmlFor="standard-annual">Standard Annual</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="premium-monthly" />
                    <Label htmlFor="premium-monthly">Premium Monthly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="premium-annual" />
                    <Label htmlFor="premium-annual">Premium Annual</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">High (1)</SelectItem>
                      <SelectItem value="2">Medium (2)</SelectItem>
                      <SelectItem value="3">Low (3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="autoApply" />
                    <Label htmlFor="autoApply">Auto-apply at checkout</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="stackable" />
                    <Label htmlFor="stackable">Can be combined with other promotions</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="isPublic" />
                    <Label htmlFor="isPublic">Publicly visible</Label>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea id="terms" placeholder="Enter terms and conditions..." />
              </div>
              
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" placeholder="e.g., new-year, discount, annual" />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPromotion(false)}>
              Cancel
            </Button>
            <Button variant="outline">
              Save as Draft
            </Button>
            <Button onClick={() => {
              toast.success('Promotion created successfully');
              setShowAddPromotion(false);
            }}>
              Create Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Promotion Preview</DialogTitle>
            <DialogDescription>
              How this promotion will appear to members
            </DialogDescription>
          </DialogHeader>
          {previewPromotion && (
            <div className="space-y-4">
              <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                <CardContent className="p-6 text-center">
                  <div className="space-y-4">
                    <Badge className={getTypeColor(previewPromotion.type)} variant="secondary">
                      {getTypeIcon(previewPromotion.type)}
                      <span className="ml-1 capitalize">{previewPromotion.type}</span>
                    </Badge>
                    <h3 className="font-bold text-xl">{previewPromotion.name}</h3>
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-6 py-3 font-bold text-2xl inline-block">
                      {formatDiscount(previewPromotion)}
                    </div>
                    <p className="text-muted-foreground">{previewPromotion.description}</p>
                    {previewPromotion.code && (
                      <div className="bg-white border-2 border-dashed border-purple-300 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground mb-1">Use code:</p>
                        <p className="font-mono font-bold text-lg">{previewPromotion.code}</p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Valid until {format(previewPromotion.endDate, 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flyer Share Modal */}
      <Dialog open={showFlyerModal} onOpenChange={setShowFlyerModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Share Promotion</DialogTitle>
            <DialogDescription>
              Share this promotion via WhatsApp or copy the promo code
            </DialogDescription>
          </DialogHeader>
          {flyerPromotion && (
            <div className="w-full rounded-2xl bg-white overflow-hidden">
              {/* Gym Header */}
              <div className="bg-[#2B7A78] text-white text-center py-4">
                <h2 className="text-xl">GymBios Fitness Center</h2>
                <p className="text-sm opacity-90">Downtown Dubai, UAE</p>
              </div>

              {/* Promo Section */}
              <div className="p-6 text-center">
                <h3 className="text-2xl text-[#1E293B] mb-3">{flyerPromotion.name}</h3>
                <p className="text-gray-600 mb-4">{flyerPromotion.description}</p>

                {flyerPromotion.code && (
                  <div className="bg-[#F9FAFB] border border-dashed border-[#2B7A78] py-2 px-4 rounded-lg inline-block mb-4">
                    <span className="font-mono text-lg text-[#2B7A78] tracking-wider">
                      {flyerPromotion.code}
                    </span>
                  </div>
                )}

                <p className="text-[#E63946] mb-6">
                  Valid Until: {format(flyerPromotion.endDate, 'MMMM dd, yyyy')}
                </p>

                <button
                  onClick={() => {
                    const message = `🏋️ Check out our exclusive offer at GymBios Fitness Center!\n\n${flyerPromotion.name}\n\n${flyerPromotion.description}\n\n${flyerPromotion.code ? `Use Code: ${flyerPromotion.code}\n` : ''}Valid Until: ${format(flyerPromotion.endDate, 'MMMM dd, yyyy')}\n\nJoin us at Downtown Dubai, UAE`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                    toast.success('Opening WhatsApp...');
                  }}
                  className="w-full bg-[#2B7A78] hover:bg-[#236A68] text-white py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-5 w-5" />
                  Share via WhatsApp
                </button>

                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => {
                    if (flyerPromotion.code) {
                      navigator.clipboard.writeText(flyerPromotion.code);
                      toast.success('Promo code copied to clipboard!');
                    }
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Promo Code
                </Button>
              </div>

              {/* Footer */}
              <div className="bg-[#F9FAFB] py-3 text-center text-xs text-gray-500 border-t">
                <p>Powered by GymBios Business OS</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

