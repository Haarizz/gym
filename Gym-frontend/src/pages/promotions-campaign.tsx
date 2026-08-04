import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
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
  Settings, 
  BarChart3, 
  PieChart, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Circle,
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
import { promotionsService, PromotionApi, PromotionRequest } from "../utils/supabase/promotions-service";
import { authService } from "../utils/supabase/auth-service";

interface Promotion {
  id: number;
  name: string;
  type: string;
  status: string;
  description: string;
  startDate: Date;
  endDate: Date;
  createdDate: Date;
  discountType: string;
  discountValue: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  usageLimitPerMember?: number;
  code?: string; // For voucher codes
  applicablePlans: string[];
  applicableServices: string[];
  targetAudience: string;
  specificMembers?: string[];
  channels: string[];
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
  policyRulesJson?: string;
  policyConfigJson?: string;
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
  const { currencyCode } = useCurrency();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeView, setActiveView] = useState<'grid' | 'table'>('grid');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [showAddPromotion, setShowAddPromotion] = useState(false);
  const [showPromotionDetail, setShowPromotionDetail] = useState(false);
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(false);
  const [isSavingPromotion, setIsSavingPromotion] = useState(false);
  const [editingPromotionId, setEditingPromotionId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedPromotions, setSelectedPromotions] = useState<number[]>([]);
  const [sortField, setSortField] = useState<keyof Promotion>('createdDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showPreview, setShowPreview] = useState(false);
  const [previewPromotion, setPreviewPromotion] = useState<Promotion | null>(null);
  const [showFlyerModal, setShowFlyerModal] = useState(false);
  const [flyerPromotion, setFlyerPromotion] = useState<Promotion | null>(null);
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";
  const cardShellSoft = "border-primary/10 shadow-sm";

  // Promotional Access Days feature
  const PROMO_ACCESS_DAYS = "promotional-access-days";
  const [promotionType, setPromotionType] = useState("");
  const [discountType, setDiscountType] = useState("");
  const [promotionForm, setPromotionForm] = useState({
    name: "",
    type: "",
    description: "",
    startDate: "",
    endDate: "",
    category: "",
    code: "",
    discountType: "",
    discountValue: "",
    minimumPurchase: "",
    maximumDiscount: "",
    usageLimit: "",
    usageLimitPerMember: "",
    targetAudience: "all",
    channels: [] as string[],
    applicablePlans: [] as string[],
    applicableServices: [] as string[],
    autoApply: false,
    stackable: false,
    isPublic: false,
    priority: "2",
    tags: "",
    termsAndConditions: "",
    status: ""
  });
  const [policy, setPolicy] = useState({
    applyRule: "",
    accessDays: 0,
    validityFrom: "",
    validityTo: "",
    expiringInDays: 0,
    includeGuests: false
  });
  const [policyRules, setPolicyRules] = useState<Rule[]>([]);

  // Real members for the Promotional Access Days eligibility preview, loaded from
  // the backend (previously a hardcoded 10-entry sample array).
  const [eligibilityMembers, setEligibilityMembers] = useState<Member[]>([]);
  useEffect(() => {
    promotionsService.getEligibilityMembers()
      .then(data => setEligibilityMembers(data.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email || undefined,
        membershipType: (m.membershipType as Member["membershipType"]) || undefined,
        joinedAt: m.joinedAt || undefined,
        currentPlan: m.currentPlan || null,
        renewalCount: m.renewalCount ?? 0,
        purchaseDate: m.purchaseDate || undefined,
      }))))
      .catch(() => toast.error("Failed to load members for eligibility preview"));
  }, []);

  const normalizePromotion = (api: PromotionApi): Promotion => ({
    id: api.id,
    name: api.name || "",
    type: api.type || "discount",
    status: api.status || "draft",
    description: api.description || "",
    startDate: api.startDate ? new Date(api.startDate) : new Date(),
    endDate: api.endDate ? new Date(api.endDate) : new Date(),
    createdDate: api.createdDate
      ? new Date(api.createdDate)
      : api.createdAt
      ? new Date(api.createdAt)
      : new Date(),
    discountType: api.discountType || "percentage",
    discountValue: Number(api.discountValue ?? 0),
    minimumPurchase: api.minimumPurchase ?? undefined,
    maximumDiscount: api.maximumDiscount ?? undefined,
    usageLimit: api.usageLimit ?? undefined,
    usageCount: Number(api.usageCount ?? 0),
    usageLimitPerMember: api.usageLimitPerMember ?? undefined,
    code: api.code || undefined,
    applicablePlans: api.applicablePlans ?? [],
    applicableServices: api.applicableServices ?? [],
    targetAudience: api.targetAudience || "all",
    specificMembers: api.specificMembers ?? [],
    channels: api.channels ?? [],
    autoApply: Boolean(api.autoApply),
    stackable: Boolean(api.stackable),
    priority: api.priority ?? 2,
    category: api.category || "",
    tags: api.tags ?? [],
    createdBy: api.createdBy || "System",
    totalRevenue: Number(api.totalRevenue ?? 0),
    totalSavings: Number(api.totalSavings ?? 0),
    conversionRate: Number(api.conversionRate ?? 0),
    clickCount: Number(api.clickCount ?? 0),
    redemptionRate: Number(api.redemptionRate ?? 0),
    averageOrderValue: Number(api.averageOrderValue ?? 0),
    image: api.image || undefined,
    termsAndConditions: api.termsAndConditions || undefined,
    isPublic: Boolean(api.isPublic),
    policyRulesJson: api.policyRulesJson || undefined,
    policyConfigJson: api.policyConfigJson || undefined
  });

  const resetPromotionForm = useCallback(() => {
    setPromotionForm({
      name: "",
      type: "",
      description: "",
      startDate: "",
      endDate: "",
      category: "",
      code: "",
      discountType: "",
      discountValue: "",
      minimumPurchase: "",
      maximumDiscount: "",
      usageLimit: "",
      usageLimitPerMember: "",
      targetAudience: "all",
      channels: [],
      applicablePlans: [],
      applicableServices: [],
      autoApply: false,
      stackable: false,
      isPublic: false,
      priority: "2",
      tags: "",
      termsAndConditions: "",
      status: ""
    });
    setPromotionType("");
    setDiscountType("");
    setPolicyRules([]);
    setPolicy({
      applyRule: "",
      accessDays: 0,
      validityFrom: "",
      validityTo: "",
      expiringInDays: 0,
      includeGuests: false
    });
    setEditingPromotionId(null);
  }, []);

  const fetchPromotions = useCallback(async () => {
    setIsLoadingPromotions(true);
    try {
      const data = await promotionsService.getPromotions();
      setPromotions(data.map(normalizePromotion));
    } catch (e) {
      toast.error("Failed to load promotions");
    } finally {
      setIsLoadingPromotions(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const openCreatePromotion = useCallback(() => {
    resetPromotionForm();
    setShowAddPromotion(true);
  }, [resetPromotionForm]);

  const openEditPromotion = useCallback((promotion: Promotion) => {
    const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
    setEditingPromotionId(promotion.id);
    setPromotionForm({
      name: promotion.name || "",
      type: promotion.type || "",
      description: promotion.description || "",
      startDate: toDateInput(promotion.startDate),
      endDate: toDateInput(promotion.endDate),
      category: promotion.category || "",
      code: promotion.code || "",
      discountType: promotion.discountType || "",
      discountValue: promotion.discountValue?.toString() ?? "",
      minimumPurchase: promotion.minimumPurchase?.toString() ?? "",
      maximumDiscount: promotion.maximumDiscount?.toString() ?? "",
      usageLimit: promotion.usageLimit?.toString() ?? "",
      usageLimitPerMember: promotion.usageLimitPerMember?.toString() ?? "",
      targetAudience: promotion.targetAudience || "all",
      channels: promotion.channels || [],
      applicablePlans: promotion.applicablePlans || [],
      applicableServices: promotion.applicableServices || [],
      autoApply: Boolean(promotion.autoApply),
      stackable: Boolean(promotion.stackable),
      isPublic: Boolean(promotion.isPublic),
      priority: promotion.priority?.toString() ?? "2",
      tags: promotion.tags?.join(", ") ?? "",
      termsAndConditions: promotion.termsAndConditions || "",
      status: promotion.status || ""
    });
    setPromotionType(promotion.type || "");
    setDiscountType(promotion.discountType || "");

    if (promotion.policyRulesJson) {
      try {
        setPolicyRules(JSON.parse(promotion.policyRulesJson));
      } catch {
        setPolicyRules([]);
      }
    } else {
      setPolicyRules([]);
    }

    if (promotion.policyConfigJson) {
      try {
        setPolicy(JSON.parse(promotion.policyConfigJson));
      } catch {
        setPolicy({
          applyRule: "",
          accessDays: 0,
          validityFrom: "",
          validityTo: "",
          expiringInDays: 0,
          includeGuests: false
        });
      }
    } else {
      setPolicy({
        applyRule: "",
        accessDays: 0,
        validityFrom: "",
        validityTo: "",
        expiringInDays: 0,
        includeGuests: false
      });
    }

    setShowAddPromotion(true);
  }, []);

  const buildPromotionPayload = (statusOverride?: string): PromotionRequest => {
    const toNumber = (value: string) => {
      if (value === "") return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    const status = statusOverride
      || promotionForm.status
      || (promotionForm.startDate && new Date(promotionForm.startDate) > new Date() ? "scheduled" : "active");

    const selectedType = promotionForm.type || promotionType || "discount";
    const selectedDiscountType = promotionForm.discountType || discountType || "percentage";

    const payload: PromotionRequest = {
      name: promotionForm.name.trim(),
      type: selectedType,
      status,
      description: promotionForm.description || "",
      startDate: promotionForm.startDate || undefined,
      endDate: promotionForm.endDate || undefined,
      discountType: selectedDiscountType,
      discountValue: toNumber(promotionForm.discountValue),
      minimumPurchase: toNumber(promotionForm.minimumPurchase),
      maximumDiscount: toNumber(promotionForm.maximumDiscount),
      usageLimit: toNumber(promotionForm.usageLimit),
      usageLimitPerMember: toNumber(promotionForm.usageLimitPerMember),
      code: promotionForm.code || undefined,
      applicablePlans: promotionForm.applicablePlans,
      applicableServices: promotionForm.applicableServices,
      targetAudience: promotionForm.targetAudience,
      channels: promotionForm.channels,
      autoApply: promotionForm.autoApply,
      stackable: promotionForm.stackable,
      priority: promotionForm.priority ? Number(promotionForm.priority) : undefined,
      category: promotionForm.category || "",
      tags: promotionForm.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean),
      termsAndConditions: promotionForm.termsAndConditions || undefined,
      isPublic: promotionForm.isPublic
    };

    if (selectedType === PROMO_ACCESS_DAYS || selectedDiscountType === PROMO_ACCESS_DAYS) {
      payload.policyRulesJson = JSON.stringify(policyRules || []);
      payload.policyConfigJson = JSON.stringify(policy || {});
    }

    if (!editingPromotionId) {
      const user = authService.getCurrentUser();
      payload.createdBy = user?.name || "System";
    }

    return payload;
  };

  const updateArrayField = (
    field: "channels" | "applicablePlans" | "applicableServices",
    value: string,
    checked: boolean
  ) => {
    setPromotionForm(prev => {
      const current = prev[field] as string[];
      const next = checked
        ? Array.from(new Set([...current, value]))
        : current.filter(v => v !== value);
      return { ...prev, [field]: next };
    });
  };

  const submitPromotion = async (statusOverride?: string) => {
    if (!promotionForm.name.trim()) {
      toast.error("Promotion name is required");
      return;
    }

    const typeValue = promotionForm.type || promotionType;
    if (!typeValue) {
      toast.error("Please select a promotion type");
      return;
    }

    setIsSavingPromotion(true);
    try {
      const payload = buildPromotionPayload(statusOverride);
      if (editingPromotionId) {
        await promotionsService.updatePromotion(editingPromotionId, payload);
        toast.success("Promotion updated successfully");
      } else {
        await promotionsService.createPromotion(payload);
        toast.success("Promotion created successfully");
      }
      setShowAddPromotion(false);
      resetPromotionForm();
      await fetchPromotions();
    } catch (e) {
      toast.error("Failed to save promotion");
    } finally {
      setIsSavingPromotion(false);
    }
  };
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

    // totalRevenue/usageCount are lifetime cumulative counters with no
    // timestamped redemption history to compute a real revenue-growth trend
    // from, so "Growth" instead tracks new promotions created this month vs
    // last month — the one month-over-month signal actually derivable from
    // the data we have (createdDate).
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthCount = promotions.filter(p => p.createdDate >= startOfMonth).length;
    const lastMonthCount = promotions.filter(p => p.createdDate >= startOfLastMonth && p.createdDate < startOfMonth).length;
    const newPromotionsGrowth = lastMonthCount > 0
      ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : (thisMonthCount > 0 ? 100 : 0);

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
      revenueGrowth: newPromotionsGrowth,
      redemptionGrowth: 0
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
      return `${currencyCode} ${promotion.discountValue} OFF`;
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

  const handleQuickAction = useCallback(async (promotion: Promotion, action: string) => {
    try {
      switch (action) {
        case 'share':
          setFlyerPromotion(promotion);
          setShowFlyerModal(true);
          break;
        case 'edit':
          openEditPromotion(promotion);
          break;
        case 'preview':
          setPreviewPromotion(promotion);
          setShowPreview(true);
          break;
        case 'duplicate':
          await promotionsService.duplicatePromotion(promotion.id);
          toast.success(`Created duplicate of ${promotion.name}`);
          await fetchPromotions();
          break;
        case 'pause':
          await promotionsService.updatePromotion(promotion.id, { status: 'paused' });
          toast.success(`Promotion ${promotion.name} paused`);
          await fetchPromotions();
          break;
        case 'activate':
          await promotionsService.updatePromotion(promotion.id, { status: 'active' });
          toast.success(`Promotion ${promotion.name} activated`);
          await fetchPromotions();
          break;
        case 'delete': {
          const confirmed = window.confirm(`Delete promotion \"${promotion.name}\"?`);
          if (!confirmed) return;
          await promotionsService.deletePromotion(promotion.id);
          toast.success(`Deleted ${promotion.name}`);
          setShowPromotionDetail(false);
          setSelectedPromotion(null);
          setSelectedPromotions(prev => prev.filter(id => id !== promotion.id));
          await fetchPromotions();
          break;
        }
        default:
          toast.info(`Action: ${action} for ${promotion.name}`);
      }
    } catch (e) {
      toast.error("Action failed. Please try again.");
    }
  }, [fetchPromotions, openEditPromotion]);

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedPromotions.length === 0) {
      toast.error('Please select promotions first');
      return;
    }

    if (action === 'delete') {
      const confirmed = window.confirm(`Delete ${selectedPromotions.length} promotion(s)?`);
      if (!confirmed) return;
    }

    try {
      await promotionsService.bulkAction(action, selectedPromotions);
      if (action === 'activate') toast.success(`Activated ${selectedPromotions.length} promotions`);
      else if (action === 'pause' || action === 'deactivate') toast.success(`Paused ${selectedPromotions.length} promotions`);
      else if (action === 'duplicate') toast.success(`Duplicated ${selectedPromotions.length} promotions`);
      else if (action === 'delete') toast.success(`Deleted ${selectedPromotions.length} promotions`);
      else toast.info(`Action: ${action} for ${selectedPromotions.length} promotions`);
      setSelectedPromotions([]);
      await fetchPromotions();
    } catch (e) {
      toast.error("Bulk action failed. Please try again.");
    }
  }, [selectedPromotions, fetchPromotions]);

  const isEditing = editingPromotionId !== null;

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
          <Button onClick={openCreatePromotion}>
            <Plus className="mr-2 h-4 w-4" />
            Create Promotion
          </Button>
        </div>
      </div>

      {/* Analytics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <Card className={cardShell}>
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

        <Card className={cardShell}>
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

        <Card className={cardShell}>
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

        <Card className={cardShell}>
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

        <Card className={cardShell}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold text-green-600"><CurrencyGlyph /> {analytics.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Savings</p>
                <p className="text-2xl font-bold text-orange-600"><CurrencyGlyph /> {analytics.totalSavings.toLocaleString()}</p>
              </div>
              <Sparkles className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={cardShell}>
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

        <Card className={cardShell}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Growth</p>
                <p className="text-2xl font-bold text-indigo-600">{analytics.revenueGrowth >= 0 ? '+' : ''}{analytics.revenueGrowth}%</p>
                <p className="text-[11px] text-muted-foreground">new promotions vs last month</p>
              </div>
              <ArrowUp className="h-6 w-6 text-indigo-600" />
            </div>
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
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>{selectedPromotions.length} promotions selected</span>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('activate')}>
                Activate
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('pause')}>
                Pause
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('duplicate')}>
                Duplicate
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('delete')}>
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
      <div key={activeView} className="animate-in fade-in-0 zoom-in-95 duration-200">
        {isLoadingPromotions ? (
          <div className="py-10 text-center text-muted-foreground">Loading promotions...</div>
        ) : activeView === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPromotions.map((promotion) => (
              <Card key={promotion.id} className={`${cardShell} cursor-pointer relative group`}>
                <div className="absolute top-4 left-4">
                  <Checkbox
                    checked={selectedPromotions.includes(promotion.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPromotions(prev => Array.from(new Set([...prev, promotion.id])));
                      } else {
                        setSelectedPromotions(prev => prev.filter(id => id !== promotion.id));
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
                      <Separator />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-red-600"
                        onClick={() => handleQuickAction(promotion, 'delete')}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
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
                        <span className="font-medium text-green-600"><CurrencyGlyph /> {promotion.totalRevenue.toLocaleString()}</span>
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
          <Card className={cardShell}>
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
              <Table className="[&_tr]:border-0">
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredPromotions.length > 0 && selectedPromotions.length === filteredPromotions.length}
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
                    <TableRow key={promotion.id} className="cursor-pointer hover:bg-slate-50/50 transition-colors border-0">
                      <TableCell>
                        <Checkbox
                          checked={selectedPromotions.includes(promotion.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPromotions(prev => Array.from(new Set([...prev, promotion.id])));
                            } else {
                              setSelectedPromotions(prev => prev.filter(id => id !== promotion.id));
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
                          <CurrencyGlyph /> {promotion.totalRevenue.toLocaleString()}
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
      </div>

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
                <Card className={cardShellSoft}>
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
                <Card className={cardShellSoft}>
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
                        <p className="font-medium">{selectedPromotion.minimumPurchase ? `${currencyCode} ${selectedPromotion.minimumPurchase}` : 'None'}</p>
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
                <Card className={cardShellSoft}>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Total Revenue</Label>
                        <p className="font-medium text-2xl text-green-600"><CurrencyGlyph /> {selectedPromotion.totalRevenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Total Savings</Label>
                        <p className="font-medium text-2xl text-orange-600"><CurrencyGlyph /> {selectedPromotion.totalSavings.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Conversion Rate</Label>
                        <p className="font-medium text-xl">{selectedPromotion.conversionRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Avg Order Value</Label>
                        <p className="font-medium text-xl"><CurrencyGlyph /> {selectedPromotion.averageOrderValue}</p>
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
                <Card className={cardShellSoft}>
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
                <Card className={cardShellSoft}>
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
                      <Button
                        variant="destructive"
                        onClick={() => handleQuickAction(selectedPromotion, 'delete')}
                        className="justify-start"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
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
      <Dialog
        open={showAddPromotion}
        onOpenChange={(open) => {
          setShowAddPromotion(open);
          if (!open) resetPromotionForm();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Promotion" : "Create New Promotion"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update details for this promotion" : "Design and configure a new promotional campaign"}
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
                  <Input
                    id="name"
                    placeholder="Enter promotion name"
                    value={promotionForm.name}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Promotion Type</Label>
                  <Select value={promotionForm.type} onValueChange={(val) => {
                    setPromotionType(val);
                    setPromotionForm(prev => ({ ...prev, type: val }));
                    if (val === PROMO_ACCESS_DAYS) {
                      setDiscountType(PROMO_ACCESS_DAYS);
                      setPromotionForm(prev => ({ ...prev, discountType: PROMO_ACCESS_DAYS }));
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
                  <Textarea
                    id="description"
                    placeholder="Describe your promotion"
                    value={promotionForm.description}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={promotionForm.startDate}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={promotionForm.endDate}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={promotionForm.category}
                    onValueChange={(val) => setPromotionForm(prev => ({ ...prev, category: val }))}
                  >
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
                  <Input
                    id="code"
                    placeholder="e.g., NEWYEAR2024"
                    value={promotionForm.code}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, code: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="discount" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discountType">Discount Type</Label>
                  <Select value={promotionForm.discountType} onValueChange={(val) => {
                    setDiscountType(val);
                    setPromotionForm(prev => ({ ...prev, discountType: val }));
                  }}>
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
                    <Input
                      id="discountValue"
                      type="number"
                      placeholder="Enter value"
                      value={promotionForm.discountValue}
                      onChange={(e) => setPromotionForm(prev => ({ ...prev, discountValue: e.target.value }))}
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="minimumPurchase">Minimum Purchase ({currencyCode})</Label>
                  <Input
                    id="minimumPurchase"
                    type="number"
                    placeholder="Optional"
                    value={promotionForm.minimumPurchase}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, minimumPurchase: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="maximumDiscount">Maximum Discount ({currencyCode})</Label>
                  <Input
                    id="maximumDiscount"
                    type="number"
                    placeholder="Optional"
                    value={promotionForm.maximumDiscount}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, maximumDiscount: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="usageLimit">Total Usage Limit</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={promotionForm.usageLimit}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, usageLimit: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="memberLimit">Usage Limit Per Member</Label>
                  <Input
                    id="memberLimit"
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={promotionForm.usageLimitPerMember}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, usageLimitPerMember: e.target.value }))}
                  />
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
                    {!editingPromotionId && (
                      <Alert className="mb-4 border-amber-200 bg-amber-50">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          Save this promotion first — Apply Promotion needs a saved promotion to record which members already received their days.
                        </AlertDescription>
                      </Alert>
                    )}
                    <EligibilityPreview
                      members={eligibilityMembers}
                      rules={policyRules}
                      onApply={async (matches) => {
                        if (!editingPromotionId) {
                          throw new Error("Save this promotion before applying it to members");
                        }
                        const result = await promotionsService.applyAccessDays(editingPromotionId, matches);
                        if (result.skippedCount > 0) {
                          toast.info(`${result.skippedCount} member(s) already had this promotion applied and were skipped`);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="targeting" className="space-y-4">
              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Select
                  value={promotionForm.targetAudience}
                  onValueChange={(val) => setPromotionForm(prev => ({ ...prev, targetAudience: val }))}
                >
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
                    <Checkbox
                      id="website"
                      checked={promotionForm.channels.includes("website")}
                      onCheckedChange={(checked) => updateArrayField("channels", "website", checked === true)}
                    />
                    <Label htmlFor="website">Website</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="app"
                      checked={promotionForm.channels.includes("app")}
                      onCheckedChange={(checked) => updateArrayField("channels", "app", checked === true)}
                    />
                    <Label htmlFor="app">Mobile App</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="email"
                      checked={promotionForm.channels.includes("email")}
                      onCheckedChange={(checked) => updateArrayField("channels", "email", checked === true)}
                    />
                    <Label htmlFor="email">Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sms"
                      checked={promotionForm.channels.includes("sms")}
                      onCheckedChange={(checked) => updateArrayField("channels", "sms", checked === true)}
                    />
                    <Label htmlFor="sms">SMS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="in-person"
                      checked={promotionForm.channels.includes("in-person")}
                      onCheckedChange={(checked) => updateArrayField("channels", "in-person", checked === true)}
                    />
                    <Label htmlFor="in-person">In-Person</Label>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Applicable Plans</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="standard-monthly"
                      checked={promotionForm.applicablePlans.includes("Standard Monthly")}
                      onCheckedChange={(checked) => updateArrayField("applicablePlans", "Standard Monthly", checked === true)}
                    />
                    <Label htmlFor="standard-monthly">Standard Monthly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="standard-annual"
                      checked={promotionForm.applicablePlans.includes("Standard Annual")}
                      onCheckedChange={(checked) => updateArrayField("applicablePlans", "Standard Annual", checked === true)}
                    />
                    <Label htmlFor="standard-annual">Standard Annual</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="premium-monthly"
                      checked={promotionForm.applicablePlans.includes("Premium Monthly")}
                      onCheckedChange={(checked) => updateArrayField("applicablePlans", "Premium Monthly", checked === true)}
                    />
                    <Label htmlFor="premium-monthly">Premium Monthly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="premium-annual"
                      checked={promotionForm.applicablePlans.includes("Premium Annual")}
                      onCheckedChange={(checked) => updateArrayField("applicablePlans", "Premium Annual", checked === true)}
                    />
                    <Label htmlFor="premium-annual">Premium Annual</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select
                    value={promotionForm.priority}
                    onValueChange={(val) => setPromotionForm(prev => ({ ...prev, priority: val }))}
                  >
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
                    <Checkbox
                      id="autoApply"
                      checked={promotionForm.autoApply}
                      onCheckedChange={(checked) => setPromotionForm(prev => ({ ...prev, autoApply: checked === true }))}
                    />
                    <Label htmlFor="autoApply">Auto-apply at checkout</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="stackable"
                      checked={promotionForm.stackable}
                      onCheckedChange={(checked) => setPromotionForm(prev => ({ ...prev, stackable: checked === true }))}
                    />
                    <Label htmlFor="stackable">Can be combined with other promotions</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isPublic"
                      checked={promotionForm.isPublic}
                      onCheckedChange={(checked) => setPromotionForm(prev => ({ ...prev, isPublic: checked === true }))}
                    />
                    <Label htmlFor="isPublic">Publicly visible</Label>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  placeholder="Enter terms and conditions..."
                  value={promotionForm.termsAndConditions}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g., new-year, discount, annual"
                  value={promotionForm.tags}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPromotion(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => submitPromotion("draft")} disabled={isSavingPromotion}>
              Save as Draft
            </Button>
            <Button onClick={() => submitPromotion()} disabled={isSavingPromotion}>
              {isSavingPromotion ? "Saving..." : isEditing ? "Save Changes" : "Create Promotion"}
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



