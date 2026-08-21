import React, { useState, useEffect } from 'react';
import { plansService, Plan } from '../utils/supabase/plans-service';
import { promotionsService, PromotionApi } from '../utils/supabase/promotions-service';
import { facilitiesService, FacilityApi } from '../utils/supabase/facilities-service';
import { planGroupsService, PlanGroupApi } from '../utils/supabase/plan-groups-service';
import { addonPlansService, AddonPlan } from '../utils/supabase/addon-plans-service';
import { useBranch } from '../utils/branch-context';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { 
  Plus, 
  Edit, 
  Copy,
  Trash2,
  Search,
  Filter,
  CreditCard,
  Clock,
  Users,
  DollarSign,
  Settings,
  Save,
  X,
  Key,
  Activity,
  Eye,
  ChevronUp,
  ChevronDown,
  Info,
  Megaphone,
  Percent,
  Building2,
  Snowflake
} from 'lucide-react';
import { Checkbox } from "../components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
import exampleImage from 'figma:asset/362a2ed9c216cf9c38308e71b24d35a09379ac76.png';
import { toast } from "sonner";

export function ManagePlans() {
  const { activeBranchId } = useBranch();
  const { currencyCode } = useCurrency();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<Plan | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDuration, setFilterDuration] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [priceSort, setPriceSort] = useState<"none" | "asc" | "desc">("none");

  // Promotions & Campaigns loaded from Member Connect (real data, not mock)
  const [availablePromotions, setAvailablePromotions] = useState<{
    id: number;
    name: string;
    discount: string;
    validPeriod: string;
    status: string;
    discountType: string | null;
    discountValue: number | null;
    maximumDiscount: number | null;
  }[]>([]);
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(true);

  // Facilities loaded from Facilities Management (real data, not mock)
  const [availableFacilities, setAvailableFacilities] = useState<FacilityApi[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);

  // Plan Groups: admin-managed list (not hardcoded) — replaces the old fixed
  // Membership/Class Package/Personal Training dropdown.
  const [availablePlanGroups, setAvailablePlanGroups] = useState<PlanGroupApi[]>([]);
  const [isLoadingPlanGroups, setIsLoadingPlanGroups] = useState(true);
  const [showAddPlanGroupDialog, setShowAddPlanGroupDialog] = useState(false);
  const [newPlanGroupName, setNewPlanGroupName] = useState("");
  const [isSavingPlanGroup, setIsSavingPlanGroup] = useState(false);

  // Training Streams: admin-managed, priced catalog (not hardcoded) — backed by
  // the same AddonPlan catalog used to sell add-ons to members, filtered to the
  // Training/Classes categories, so anything added here is also purchasable as
  // a member add-on.
  const [availableTrainingStreams, setAvailableTrainingStreams] = useState<AddonPlan[]>([]);
  const [isLoadingTrainingStreams, setIsLoadingTrainingStreams] = useState(true);
  const [showAddTrainingStreamDialog, setShowAddTrainingStreamDialog] = useState(false);
  const [newTrainingStreamName, setNewTrainingStreamName] = useState("");
  const [newTrainingStreamPrice, setNewTrainingStreamPrice] = useState("");
  const [newTrainingStreamValidity, setNewTrainingStreamValidity] = useState("30");
  const [isSavingTrainingStream, setIsSavingTrainingStream] = useState(false);

  // Form state for creating/editing plans
  const [formData, setFormData] = useState({
    name: "",
    type: "Membership",
    durationType: "Monthly",
    durationValue: "",
    price: "",
    discount: "",
    maxSessions: "",
    assignableTrainers: "",
    description: "",
    planType: "Individual",
    status: "Active",
    trainingStreams: [] as number[],
    membershipCapacity: "Unlimited", // Changed default to Unlimited
    maxCapacity: "0",
    attendanceLimit: "Unlimited", // Changed default to Unlimited
    attendanceValue: "3",
    attendancePeriod: "Payment",
    selectedPromotions: [], // No promotions selected by default
    selectedCampaigns: [], // No campaigns selected by default
    selectedFacilities: [], // No facilities selected by default
    // Freeze Policy Configuration
    maxFreezeDays: "30",
    maxFreezeOccurrences: "2",
    chargePerExtraDay: "5",
    freeDaysAllowed: "10",
    autoUnfreeze: true,
    // Family Plan Settings (only used when planType === "Family")
    familyBillingMode: "individual",
    pricePerMember: "",
    maxFamilyMembers: "",
    maxAdultMembers: "",
    maxChildMembers: "",
    allowAdditionalMembers: true,
    additionalMemberPrice: "",
    autoCalculateTotal: true
  });

  // Training streams access state
  const [isTrainingAccessOpen, setIsTrainingAccessOpen] = useState(true);
  // Facilities access state
  const [isFacilitiesAccessOpen, setIsFacilitiesAccessOpen] = useState(true);
  // Promotions and campaigns state
  const [isPromotionsCampaignsOpen, setIsPromotionsCampaignsOpen] = useState(false);
  // Freeze Policy Configuration state
  const [isFreezePolicyOpen, setIsFreezePolicyOpen] = useState(false);
  // Family Plan Settings state
  const [isFamilyPlanSettingsOpen, setIsFamilyPlanSettingsOpen] = useState(false);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await plansService.getPlans();
        setPlans(data);
      } catch (err) {
        setError('Failed to load plans. Please try again.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPlans();
  }, [activeBranchId]);

  useEffect(() => {
    const loadPromotions = async () => {
      try {
        setIsLoadingPromotions(true);
        const data = await promotionsService.getPromotions();
        setAvailablePromotions(data.map((promo: PromotionApi) => {
          const discountLabel = promo.discountType === "percentage"
            ? `${promo.discountValue ?? 0}%`
            : promo.discountType === "free"
              ? "Free"
              : promo.discountValue != null
                ? `${currencyCode} ${promo.discountValue}`
                : "—";
          const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : "";
          const validPeriod = promo.startDate && promo.endDate
            ? `${formatDate(promo.startDate)} - ${formatDate(promo.endDate)}`
            : "No expiry";
          const status = promo.status
            ? promo.status.charAt(0).toUpperCase() + promo.status.slice(1)
            : "Draft";
          return {
            id: promo.id,
            name: promo.name,
            discount: discountLabel,
            validPeriod,
            status,
            discountType: promo.discountType ?? null,
            discountValue: promo.discountValue ?? null,
            maximumDiscount: promo.maximumDiscount ?? null,
          };
        }));
      } catch (err) {
        console.error('Failed to load promotions:', err);
      } finally {
        setIsLoadingPromotions(false);
      }
    };
    loadPromotions();
  }, [currencyCode, activeBranchId]);

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        setIsLoadingFacilities(true);
        const data = await facilitiesService.getFacilities({ status: 'Active' });
        setAvailableFacilities(data);
      } catch (err) {
        console.error('Failed to load facilities:', err);
      } finally {
        setIsLoadingFacilities(false);
      }
    };
    loadFacilities();
  }, [activeBranchId]);

  const loadPlanGroups = async () => {
    try {
      setIsLoadingPlanGroups(true);
      const data = await planGroupsService.getPlanGroups();
      setAvailablePlanGroups(data);
      return data;
    } catch (err) {
      console.error('Failed to load plan groups:', err);
      return [];
    } finally {
      setIsLoadingPlanGroups(false);
    }
  };

  useEffect(() => {
    loadPlanGroups();
  }, [activeBranchId]);

  const handleAddPlanGroup = async () => {
    const name = newPlanGroupName.trim();
    if (!name) {
      toast.error("Plan group name is required");
      return;
    }
    setIsSavingPlanGroup(true);
    try {
      const created = await planGroupsService.createPlanGroup(name);
      setAvailablePlanGroups(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, type: created.name }));
      setNewPlanGroupName("");
      setShowAddPlanGroupDialog(false);
      toast.success(`Plan group "${created.name}" added`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add plan group");
    } finally {
      setIsSavingPlanGroup(false);
    }
  };

  const loadTrainingStreams = async () => {
    try {
      setIsLoadingTrainingStreams(true);
      const data = await addonPlansService.getAll(true);
      setAvailableTrainingStreams(
        data
          .filter(a => a.category === 'Training' || a.category === 'Classes')
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (err) {
      console.error('Failed to load training streams:', err);
    } finally {
      setIsLoadingTrainingStreams(false);
    }
  };

  useEffect(() => {
    loadTrainingStreams();
  }, [activeBranchId]);

  const handleAddTrainingStream = async () => {
    const name = newTrainingStreamName.trim();
    const price = parseFloat(newTrainingStreamPrice);
    const validity = parseInt(newTrainingStreamValidity, 10);
    if (!name) {
      toast.error("Training stream name is required");
      return;
    }
    if (!newTrainingStreamPrice || isNaN(price) || price < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!newTrainingStreamValidity || isNaN(validity) || validity <= 0) {
      toast.error("Enter a valid validity in days");
      return;
    }
    setIsSavingTrainingStream(true);
    try {
      const created = await addonPlansService.create({
        name,
        price,
        validity,
        category: 'Training',
        isActive: true,
      });
      setAvailableTrainingStreams(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, trainingStreams: [...prev.trainingStreams, created.id] }));
      setNewTrainingStreamName("");
      setNewTrainingStreamPrice("");
      setNewTrainingStreamValidity("30");
      setShowAddTrainingStreamDialog(false);
      toast.success(`Training stream "${created.name}" added`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add training stream");
    } finally {
      setIsSavingTrainingStream(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Membership",
      durationType: "Monthly", 
      durationValue: "",
      price: "",
      discount: "",
      maxSessions: "",
      assignableTrainers: "",
      description: "",
      planType: "Individual",
      status: "Active",
      trainingStreams: [],
      membershipCapacity: "Unlimited", // Changed default to Unlimited
      maxCapacity: "0",
      attendanceLimit: "Unlimited", // Changed default to Unlimited
      attendanceValue: "3",
      attendancePeriod: "Payment",
      selectedPromotions: [], // No promotions selected by default
      selectedCampaigns: [], // No campaigns selected by default
      selectedFacilities: [], // No facilities selected by default
      // Freeze Policy Configuration
      maxFreezeDays: "30",
      maxFreezeOccurrences: "2",
      chargePerExtraDay: "5",
      freeDaysAllowed: "10",
      autoUnfreeze: true,
      // Family Plan Settings (only used when planType === "Family")
      familyBillingMode: "individual",
      pricePerMember: "",
      maxFamilyMembers: "",
      maxAdultMembers: "",
      maxChildMembers: "",
      allowAdditionalMembers: true,
      additionalMemberPrice: "",
      autoCalculateTotal: true
    });
  };

  const handleCreatePlan = async () => {
    try {
      const created = await plansService.createPlan({
        name: formData.name,
        type: formData.type,
        planType: formData.planType,
        durationType: formData.durationType,
        durationValue: formData.durationValue,
        price: parseFloat(formData.price as string) || 0,
        discount: parseFloat(formData.discount as string) || 0,
        status: formData.status,
        description: formData.description,
        maxSessions: formData.maxSessions ? parseInt(formData.maxSessions as string) : null,
        assignableTrainers: formData.assignableTrainers ? (formData.assignableTrainers as string).split(",").map(t => t.trim()) : [],
        membershipCapacity: formData.membershipCapacity,
        maxCapacity: formData.maxCapacity ? parseInt(formData.maxCapacity as string) : null,
        attendanceLimit: formData.attendanceLimit,
        attendanceValue: formData.attendanceValue ? parseInt(formData.attendanceValue as string) : null,
        attendancePeriod: formData.attendancePeriod,
        maxFreezeDays: formData.maxFreezeDays ? parseInt(formData.maxFreezeDays as string) : null,
        maxFreezeOccurrences: formData.maxFreezeOccurrences ? parseInt(formData.maxFreezeOccurrences as string) : null,
        chargePerExtraDay: formData.chargePerExtraDay ? parseFloat(formData.chargePerExtraDay as string) : null,
        freeDaysAllowed: formData.freeDaysAllowed ? parseInt(formData.freeDaysAllowed as string) : null,
        autoUnfreeze: formData.autoUnfreeze,
        trainingStreams: formData.trainingStreams,
        selectedFacilities: formData.selectedFacilities,
        selectedPromotions: formData.selectedPromotions,
        selectedCampaigns: formData.selectedCampaigns,
        familyBillingMode: formData.familyBillingMode,
        pricePerMember: formData.pricePerMember ? parseFloat(formData.pricePerMember as string) : null,
        maxFamilyMembers: formData.maxFamilyMembers ? parseInt(formData.maxFamilyMembers as string) : null,
        maxAdultMembers: formData.maxAdultMembers ? parseInt(formData.maxAdultMembers as string) : null,
        maxChildMembers: formData.maxChildMembers ? parseInt(formData.maxChildMembers as string) : null,
        allowAdditionalMembers: formData.allowAdditionalMembers,
        additionalMemberPrice: formData.additionalMemberPrice ? parseFloat(formData.additionalMemberPrice as string) : null,
        autoCalculateTotal: formData.autoCalculateTotal,
      });
      setPlans([...plans, created]);
      setShowCreateDialog(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create plan:', err);
      setError('Failed to create plan. Please try again.');
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      type: plan.type,
      durationType: plan.durationType,
      durationValue: plan.durationValue || plan.duration.split(" ")[0],
      price: plan.price.toString(),
      discount: plan.discount.toString(),
      maxSessions: plan.maxSessions?.toString() || "",
      assignableTrainers: (plan.assignableTrainers || []).join(", "),
      description: plan.description,
      planType: plan.planType,
      status: plan.status,
      trainingStreams: plan.trainingStreams || [],
      membershipCapacity: plan.membershipCapacity || "Unlimited",
      maxCapacity: plan.maxCapacity?.toString() || "0",
      attendanceLimit: plan.attendanceLimit || "Unlimited",
      attendanceValue: plan.attendanceValue?.toString() || "3",
      attendancePeriod: plan.attendancePeriod || "Payment",
      selectedPromotions: plan.selectedPromotions || [],
      selectedCampaigns: plan.selectedCampaigns || [],
      selectedFacilities: plan.selectedFacilities || [],
      maxFreezeDays: plan.maxFreezeDays?.toString() || "30",
      maxFreezeOccurrences: plan.maxFreezeOccurrences?.toString() || "2",
      chargePerExtraDay: plan.chargePerExtraDay?.toString() || "5",
      freeDaysAllowed: plan.freeDaysAllowed?.toString() || "10",
      autoUnfreeze: plan.autoUnfreeze !== undefined ? plan.autoUnfreeze : true,
      familyBillingMode: plan.familyBillingMode || "individual",
      pricePerMember: plan.pricePerMember?.toString() || "",
      maxFamilyMembers: plan.maxFamilyMembers?.toString() || "",
      maxAdultMembers: plan.maxAdultMembers?.toString() || "",
      maxChildMembers: plan.maxChildMembers?.toString() || "",
      allowAdditionalMembers: plan.allowAdditionalMembers !== undefined && plan.allowAdditionalMembers !== null ? plan.allowAdditionalMembers : true,
      additionalMemberPrice: plan.additionalMemberPrice?.toString() || "",
      autoCalculateTotal: plan.autoCalculateTotal !== undefined && plan.autoCalculateTotal !== null ? plan.autoCalculateTotal : true
    });
    setShowCreateDialog(true);
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    try {
      const updated = await plansService.updatePlan(editingPlan.id, {
        name: formData.name,
        type: formData.type,
        planType: formData.planType,
        durationType: formData.durationType,
        durationValue: formData.durationValue,
        price: parseFloat(formData.price as string) || 0,
        discount: parseFloat(formData.discount as string) || 0,
        status: formData.status,
        description: formData.description,
        maxSessions: formData.maxSessions ? parseInt(formData.maxSessions as string) : null,
        assignableTrainers: formData.assignableTrainers ? (formData.assignableTrainers as string).split(",").map(t => t.trim()) : [],
        membershipCapacity: formData.membershipCapacity,
        maxCapacity: formData.maxCapacity ? parseInt(formData.maxCapacity as string) : null,
        attendanceLimit: formData.attendanceLimit,
        attendanceValue: formData.attendanceValue ? parseInt(formData.attendanceValue as string) : null,
        attendancePeriod: formData.attendancePeriod,
        maxFreezeDays: formData.maxFreezeDays ? parseInt(formData.maxFreezeDays as string) : null,
        maxFreezeOccurrences: formData.maxFreezeOccurrences ? parseInt(formData.maxFreezeOccurrences as string) : null,
        chargePerExtraDay: formData.chargePerExtraDay ? parseFloat(formData.chargePerExtraDay as string) : null,
        freeDaysAllowed: formData.freeDaysAllowed ? parseInt(formData.freeDaysAllowed as string) : null,
        autoUnfreeze: formData.autoUnfreeze,
        trainingStreams: formData.trainingStreams,
        selectedFacilities: formData.selectedFacilities,
        selectedPromotions: formData.selectedPromotions,
        selectedCampaigns: formData.selectedCampaigns,
        familyBillingMode: formData.familyBillingMode,
        pricePerMember: formData.pricePerMember ? parseFloat(formData.pricePerMember as string) : null,
        maxFamilyMembers: formData.maxFamilyMembers ? parseInt(formData.maxFamilyMembers as string) : null,
        maxAdultMembers: formData.maxAdultMembers ? parseInt(formData.maxAdultMembers as string) : null,
        maxChildMembers: formData.maxChildMembers ? parseInt(formData.maxChildMembers as string) : null,
        allowAdditionalMembers: formData.allowAdditionalMembers,
        additionalMemberPrice: formData.additionalMemberPrice ? parseFloat(formData.additionalMemberPrice as string) : null,
        autoCalculateTotal: formData.autoCalculateTotal,
      });
      setPlans(plans.map(p => p.id === editingPlan.id ? updated : p));
      setShowCreateDialog(false);
      setEditingPlan(null);
      resetForm();
    } catch (err) {
      console.error('Failed to update plan:', err);
      setError('Failed to update plan. Please try again.');
    }
  };

  const handleDuplicatePlan = async (plan: Plan) => {
    try {
      const duplicated = await plansService.duplicatePlan(plan.id);
      setPlans([...plans, duplicated]);
    } catch (err) {
      console.error('Failed to duplicate plan:', err);
      setError('Failed to duplicate plan. Please try again.');
    }
  };

  const handleViewPlan = (plan: Plan) => {
    setViewingPlan(plan);
  };

  const handleDeletePlan = async (planId: number) => {
    try {
      await plansService.deletePlan(planId);
      setPlans(plans.filter(p => p.id !== planId));
    } catch (err) {
      console.error('Failed to delete plan:', err);
      setError('Failed to delete plan. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    return status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Individual": return "bg-blue-100 text-blue-800";
      case "Couple": return "bg-pink-100 text-pink-800";
      case "Family": return "bg-purple-100 text-purple-800";
      case "Corporate": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Helper functions to get names from IDs
  const getTrainingStreamNames = (streamIds: number[]) => {
    return streamIds.map(id => availableTrainingStreams.find(stream => stream.id === id)?.name).filter(Boolean);
  };

  const getPromotionNames = (promotionIds: number[]) => {
    return promotionIds.map(id => availablePromotions.find(promo => promo.id === id)?.name).filter(Boolean);
  };

  const getFacilityNames = (facilityIds: string[]) => {
    return facilityIds.map(id => availableFacilities.find(facility => facility.id === id)?.name).filter(Boolean);
  };

  // Effective price after the best currently-active promotion attached to the
  // plan. Discounts live on Promotions & Campaigns now (not a manual plan
  // field), so this is the only place a plan's price reflects them.
  const getPlanEffectivePrice = (plan: Plan) => {
    const price = Number(plan.price) || 0;
    const activePromotions = plan.selectedPromotions
      .map(id => availablePromotions.find(promo => promo.id === id))
      .filter((promo): promo is NonNullable<typeof promo> => !!promo && promo.status === "Active");

    let bestDiscountAmount = 0;
    let bestPromotion: typeof activePromotions[number] | null = null;

    for (const promo of activePromotions) {
      let amount = 0;
      if (promo.discountType === "percentage") {
        amount = price * (Number(promo.discountValue) || 0) / 100;
        if (promo.maximumDiscount != null) amount = Math.min(amount, Number(promo.maximumDiscount));
      } else if (promo.discountType === "free") {
        amount = price;
      } else if (promo.discountValue != null) {
        amount = Number(promo.discountValue);
      }
      amount = Math.max(0, Math.min(amount, price));
      if (amount > bestDiscountAmount) {
        bestDiscountAmount = amount;
        bestPromotion = promo;
      }
    }

    return {
      originalPrice: price,
      effectivePrice: price - bestDiscountAmount,
      discountAmount: bestDiscountAmount,
      appliedPromotion: bestPromotion,
    };
  };

  // Filter plans based on search and filters
  const filteredPlans = plans.filter(plan => {
    const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDuration = filterDuration === "all" || plan.durationType.toLowerCase() === filterDuration.toLowerCase();
    const matchesType = filterType === "all"
      || plan.planType.toLowerCase() === filterType.toLowerCase()
      || (filterType === "family" && plan.planType.toLowerCase() === "couple");
    const matchesStatus = filterStatus === "all" || plan.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesDuration && matchesType && matchesStatus;
  });
  if (priceSort !== "none") {
    filteredPlans.sort((a, b) => priceSort === "asc" ? a.price - b.price : b.price - a.price);
  }

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingPlan(null);
    resetForm();
  };

  // Training streams handlers
  const handleTrainingStreamToggle = (streamId: number) => {
    setFormData(prev => ({
      ...prev,
      trainingStreams: prev.trainingStreams.includes(streamId)
        ? prev.trainingStreams.filter(id => id !== streamId)
        : [...prev.trainingStreams, streamId]
    }));
  };

  const handleSelectAllTrainingStreams = () => {
    setFormData(prev => ({
      ...prev,
      trainingStreams: availableTrainingStreams.map(stream => stream.id)
    }));
  };

  const handleDeselectAllTrainingStreams = () => {
    setFormData(prev => ({
      ...prev,
      trainingStreams: []
    }));
  };

  // Promotions handlers
  const handlePromotionToggle = (promotionId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedPromotions: prev.selectedPromotions.includes(promotionId)
        ? prev.selectedPromotions.filter(id => id !== promotionId)
        : [...prev.selectedPromotions, promotionId]
    }));
  };

  const handleSelectAllPromotions = () => {
    setFormData(prev => ({
      ...prev,
      selectedPromotions: availablePromotions.filter(p => p.status === "Active").map(p => p.id)
    }));
  };

  const handleDeselectAllPromotions = () => {
    setFormData(prev => ({
      ...prev,
      selectedPromotions: []
    }));
  };

  // Facilities handlers
  const handleFacilityToggle = (facilityId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedFacilities: prev.selectedFacilities.includes(facilityId)
        ? prev.selectedFacilities.filter(id => id !== facilityId)
        : [...prev.selectedFacilities, facilityId]
    }));
  };

  const handleSelectAllFacilities = () => {
    setFormData(prev => ({
      ...prev,
      selectedFacilities: availableFacilities.map(f => f.id)
    }));
  };

  const handleDeselectAllFacilities = () => {
    setFormData(prev => ({
      ...prev,
      selectedFacilities: []
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Plans</h1>
          <p className="text-muted-foreground">Create and manage membership plans, class packages, and training programs.</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card
          className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          style={filterType === 'all' && filterStatus === 'all' && priceSort === 'none' ? { boxShadow: '0 0 0 2px #2563eb' } : undefined}
          onClick={() => { setFilterType('all'); setFilterStatus('all'); setPriceSort('none'); }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Plans</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
            <p className="text-xs text-muted-foreground">All membership plans</p>
          </CardContent>
        </Card>

        <Card
          className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          style={filterStatus === 'active' ? { boxShadow: '0 0 0 2px #16a34a' } : undefined}
          onClick={() => {
            setFilterStatus(filterStatus === 'active' ? 'all' : 'active');
            setFilterType('all');
            setPriceSort('none');
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Plans</CardTitle>
            <div className="p-2 rounded-lg bg-green-100">
              <Settings className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {plans.filter(p => p.status === "Active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </CardContent>
        </Card>

        <Card
          className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          style={priceSort !== 'none' ? { boxShadow: '0 0 0 2px #2563eb' } : undefined}
          title="Click to sort plans by price"
          onClick={() => {
            setPriceSort(priceSort === 'desc' ? 'asc' : priceSort === 'asc' ? 'none' : 'desc');
            setFilterStatus('all');
            setFilterType('all');
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Price</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100">
              {priceSort === 'asc' ? <ChevronUp className="h-4 w-4 text-blue-600" /> : priceSort === 'desc' ? <ChevronDown className="h-4 w-4 text-blue-600" /> : <DollarSign className="h-4 w-4 text-blue-600" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              <CurrencyGlyph /> {(plans.reduce((sum, p) => sum + p.price, 0) / plans.length).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all plans{priceSort !== 'none' ? ` — sorted ${priceSort === 'asc' ? 'low to high' : 'high to low'}` : ''}</p>
          </CardContent>
        </Card>

        <Card
          className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          style={filterType === 'family' ? { boxShadow: '0 0 0 2px #9333ea' } : undefined}
          onClick={() => {
            setFilterType(filterType === 'family' ? 'all' : 'family');
            setFilterStatus('all');
            setPriceSort('none');
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Family Plans</CardTitle>
            <div className="p-2 rounded-lg bg-purple-100">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {plans.filter(p => p.planType === "Family" || p.planType === "Couple").length}
            </div>
            <p className="text-xs text-muted-foreground">Multi-member plans</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Overview / List */}
      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Plan Overview</CardTitle>
          <CardDescription>View and manage all membership plans</CardDescription>
          
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterDuration} onValueChange={setFilterDuration}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Duration</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="sessions">Sessions</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="couple">Couple</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="walk-in">Walk-In</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead>Plan Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Assigned Trainers</TableHead>
                <TableHead>Training Streams</TableHead>
                <TableHead>Facilities</TableHead>
                <TableHead>Promotions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Search className="h-8 w-8 mb-2 opacity-20" />
                      <p>No results found. Try a different search term.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlans.map((plan) => (
                <TableRow key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="max-w-[200px]">
                      <div className="font-medium truncate" title={plan.name}>{plan.name}</div>
                      <div className="text-sm text-muted-foreground truncate" title={plan.type}>{plan.type}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      {plan.duration}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(plan.planType)}>
                      {plan.planType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const { effectivePrice, discountAmount, appliedPromotion } = getPlanEffectivePrice(plan);
                      return discountAmount > 0 ? (
                        <div>
                          <div className="font-medium"><CurrencyGlyph /> {effectivePrice.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground line-through"><CurrencyGlyph /> {plan.price}</div>
                          <div className="text-xs text-green-600">{appliedPromotion?.name}</div>
                        </div>
                      ) : (
                        <div className="font-medium"><CurrencyGlyph /> {plan.price}</div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {plan.assignableTrainers && plan.assignableTrainers.length > 0 ? (
                        plan.assignableTrainers.slice(0, 2).map((trainer, index) => (
                          <Badge key={index} variant="outline" className="text-xs mr-1">
                            {trainer}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No trainers assigned</span>
                      )}
                      {plan.assignableTrainers && plan.assignableTrainers.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{plan.assignableTrainers.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {plan.trainingStreams && plan.trainingStreams.length > 0 ? (
                        <>
                          <div className="flex flex-wrap gap-1">
                            {getTrainingStreamNames(plan.trainingStreams).slice(0, 2).map((streamName, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {streamName}
                              </Badge>
                            ))}
                          </div>
                          {plan.trainingStreams.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{plan.trainingStreams.length - 2} more streams
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">No streams selected</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {plan.selectedFacilities && plan.selectedFacilities.length > 0 ? (
                        <>
                          <div className="flex flex-wrap gap-1">
                            {getFacilityNames(plan.selectedFacilities).slice(0, 2).map((facilityName, index) => (
                              <Badge key={index} variant="outline" className="text-xs" style={{ color: '#2B7A78', borderColor: '#2B7A78' }}>
                                {facilityName}
                              </Badge>
                            ))}
                          </div>
                          {plan.selectedFacilities.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{plan.selectedFacilities.length - 2} more
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">No facilities</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {plan.selectedPromotions && plan.selectedPromotions.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {getPromotionNames(plan.selectedPromotions).slice(0, 1).map((promoName, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700">
                              <Percent className="h-3 w-3 mr-1" />
                              {promoName}
                            </Badge>
                          ))}
                          {plan.selectedPromotions.length > 1 && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              +{plan.selectedPromotions.length - 1} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No promotions</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(plan.status)}>
                      {plan.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-primary/20 hover:bg-blue-50"
                        onClick={() => handleViewPlan(plan)}
                        title="View Plan"
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-primary/20 hover:bg-amber-50"
                        onClick={() => handleEditPlan(plan)}
                        title="Edit Plan"
                      >
                        <Edit className="h-4 w-4 text-amber-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-primary/20 hover:bg-purple-50"
                        onClick={() => handleDuplicatePlan(plan)}
                        title="Duplicate Plan"
                      >
                        <Copy className="h-4 w-4 text-purple-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-primary/20 hover:bg-red-50"
                        onClick={() => handleDeletePlan(plan.id)}
                        title="Delete Plan"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan View Dialog */}
      <Dialog open={!!viewingPlan} onOpenChange={(open) => !open && setViewingPlan(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plan Details</DialogTitle>
            <DialogDescription>Overview of the selected plan configuration.</DialogDescription>
          </DialogHeader>

          {viewingPlan && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{viewingPlan.name}</h3>
                  <p className="text-sm text-muted-foreground">{viewingPlan.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(viewingPlan.status)}>{viewingPlan.status}</Badge>
                  <Badge className={getTypeColor(viewingPlan.planType)}>{viewingPlan.planType}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-white">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-semibold">{viewingPlan.duration}</p>
                </div>
                <div className="p-3 rounded-lg border bg-white">
                  <p className="text-xs text-muted-foreground">Price</p>
                  {(() => {
                    const { effectivePrice, discountAmount, appliedPromotion } = getPlanEffectivePrice(viewingPlan);
                    return discountAmount > 0 ? (
                      <div>
                        <p className="font-semibold text-primary"><CurrencyGlyph /> {effectivePrice.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground line-through"><CurrencyGlyph /> {viewingPlan.price}</p>
                        <p className="text-xs text-green-600">{appliedPromotion?.name} applied</p>
                      </div>
                    ) : (
                      <p className="font-semibold text-primary"><CurrencyGlyph /> {viewingPlan.price}</p>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-white">
                  <p className="text-xs text-muted-foreground">Assignable Trainers</p>
                  {viewingPlan.assignableTrainers.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {viewingPlan.assignableTrainers.map((trainer) => (
                        <Badge key={trainer} variant="outline" className="text-xs">
                          {trainer}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No trainers assigned</p>
                  )}
                </div>
                <div className="p-3 rounded-lg border bg-white">
                  <p className="text-xs text-muted-foreground">Max Sessions</p>
                  <p className="font-semibold">{viewingPlan.maxSessions ?? "Unlimited"}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-white">
                <p className="text-xs text-muted-foreground">Training Streams</p>
                {viewingPlan.trainingStreams.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getTrainingStreamNames(viewingPlan.trainingStreams).map((stream) => (
                      <Badge key={stream} variant="outline" className="text-xs">
                        {stream}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">No streams selected</p>
                )}
              </div>

              <div className="p-3 rounded-lg border bg-white">
                <p className="text-xs text-muted-foreground">Facilities</p>
                {viewingPlan.selectedFacilities.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getFacilityNames(viewingPlan.selectedFacilities).map((facility) => (
                      <Badge key={facility} variant="outline" className="text-xs">
                        {facility}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">No facilities</p>
                )}
              </div>

              <div className="p-3 rounded-lg border bg-white">
                <p className="text-xs text-muted-foreground">Promotions</p>
                {viewingPlan.selectedPromotions.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getPromotionNames(viewingPlan.selectedPromotions).map((promo) => (
                      <Badge key={promo} variant="outline" className="text-xs bg-green-50 text-green-700">
                        {promo}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">No promotions</p>
                )}
              </div>

              <div className="p-3 rounded-lg border bg-white">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm mt-1 text-foreground">{viewingPlan.description || "No description provided."}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Plan Creation / Editing Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Plan" : "Create New Plan"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan ? "Update the plan details below." : "Fill in the details to create a new membership plan."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Plan Name */}
            <div className="space-y-2">
              <Label htmlFor="planName">Plan Name *</Label>
              <Input
                id="planName"
                maxLength={60}
                placeholder="e.g., Premium Monthly"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                Plan name must be under 60 characters ({formData.name.length}/60)
              </p>
            </div>

            {/* Plan Type and Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planType">Plan Group *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => {
                    if (value === "__add_new__") {
                      setNewPlanGroupName("");
                      setShowAddPlanGroupDialog(true);
                      return;
                    }
                    setFormData({...formData, type: value});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingPlanGroups ? "Loading plan groups..." : "Select plan group"} />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.type && !availablePlanGroups.some(g => g.name === formData.type) && (
                      <SelectItem value={formData.type}>{formData.type}</SelectItem>
                    )}
                    {availablePlanGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value="__add_new__">
                      <Plus className="h-4 w-4" />
                      Add New Plan Group
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="membershipType">Membership Type *</Label>
                <Select value={formData.planType} onValueChange={(value) => setFormData({...formData, planType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Couple">Couple</SelectItem>
                    <SelectItem value="Family">Family</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                    <SelectItem value="Walk-In">Walk-In / Daily Visitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durationType">Duration Type *</Label>
                <Select value={formData.durationType} onValueChange={(value) => setFormData({...formData, durationType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Annual">Annual</SelectItem>
                    <SelectItem value="Sessions">Sessions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationValue">Duration Value *</Label>
                <Input
                  id="durationValue"
                  type="number"
                  placeholder="e.g., 1, 6, 12"
                  value={formData.durationValue}
                  onChange={(e) => setFormData({...formData, durationValue: e.target.value})}
                />
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Price ({currencyCode}) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="49.99"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>

            {/* Max Sessions (optional) */}
            <div className="space-y-2">
              <Label htmlFor="maxSessions">Max Number of Sessions (optional)</Label>
              <Input
                id="maxSessions"
                type="number"
                placeholder="e.g., 8 for personal training packages"
                value={formData.maxSessions}
                onChange={(e) => setFormData({...formData, maxSessions: e.target.value})}
              />
            </div>

            {/* Assignable Trainers (optional) */}
            <div className="space-y-2">
              <Label htmlFor="trainers">Assignable Trainers (optional)</Label>
              <Input
                id="trainers"
                placeholder="John Smith, Sarah Wilson (comma-separated)"
                value={formData.assignableTrainers}
                onChange={(e) => setFormData({...formData, assignableTrainers: e.target.value})}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description / Notes</Label>
              <Textarea
                id="description"
                placeholder="Describe what this plan includes..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="min-h-[80px]"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Access To Training */}
            <Collapsible 
              open={isTrainingAccessOpen} 
              onOpenChange={setIsTrainingAccessOpen}
              className="border rounded-lg p-4 space-y-4"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <Key className="h-5 w-5 text-blue-600" />
                  <Label className="text-base cursor-pointer">Access To Training</Label>
                </div>
                {isTrainingAccessOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Set program and class access for the membership.
                </p>

                {/* Attendance Limits */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="attendanceLimit">HOW MANY TIMES CAN A MEMBER ATTEND?</Label>
                    <Select 
                      value={formData.attendanceLimit} 
                      onValueChange={(value) => setFormData({...formData, attendanceLimit: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Unlimited">Unlimited</SelectItem>
                        <SelectItem value="Sessions">Sessions</SelectItem>
                        <SelectItem value="Hours">Hours</SelectItem>
                        <SelectItem value="Days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="attendanceValue">&nbsp;</Label>
                    <Input
                      id="attendanceValue"
                      type="number"
                      value={formData.attendanceValue}
                      onChange={(e) => setFormData({...formData, attendanceValue: e.target.value})}
                      className="text-center"
                      disabled={formData.attendanceLimit === "Unlimited"}
                      placeholder={formData.attendanceLimit === "Unlimited" ? "∞" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="attendancePeriod">per</Label>
                    <Select 
                      value={formData.attendancePeriod} 
                      onValueChange={(value) => setFormData({...formData, attendancePeriod: value})}
                      disabled={formData.attendanceLimit === "Unlimited"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Payment">Payment</SelectItem>
                        <SelectItem value="Week">Week</SelectItem>
                        <SelectItem value="Month">Month</SelectItem>
                        <SelectItem value="Year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Membership Capacity */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="membershipCapacity">MEMBERSHIP CAPACITY</Label>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Select 
                      value={formData.membershipCapacity} 
                      onValueChange={(value) => setFormData({...formData, membershipCapacity: value})}
                    >
                      <SelectTrigger className="border-cyan-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Limited">Limited</SelectItem>
                        <SelectItem value="Unlimited">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxCapacity">&nbsp;</Label>
                    <Input
                      id="maxCapacity"
                      type="number"
                      value={formData.maxCapacity}
                      onChange={(e) => setFormData({...formData, maxCapacity: e.target.value})}
                      className="text-center"
                      disabled={formData.membershipCapacity === "Unlimited"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Members max capacity</Label>
                    <div className="flex items-center pt-2 text-sm text-muted-foreground">
                      {formData.membershipCapacity === "Unlimited" ? "No limit" : `Maximum ${formData.maxCapacity} members`}
                    </div>
                  </div>
                </div>

                {/* Training Streams Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Select Training Streams</Label>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddTrainingStreamDialog(true)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add New
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllTrainingStreams}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAllTrainingStreams}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Priced items — a training stream added here also becomes available to sell as a member add-on.
                  </p>

                  {/* Training streams grid */}
                  {isLoadingTrainingStreams ? (
                    <div className="text-sm text-muted-foreground border rounded-md p-3">Loading training streams...</div>
                  ) : availableTrainingStreams.length === 0 ? (
                    <div className="text-sm text-muted-foreground border rounded-md p-4 text-center">
                      No training streams yet.{" "}
                      <button
                        type="button"
                        className="text-primary underline"
                        onClick={() => setShowAddTrainingStreamDialog(true)}
                      >
                        Add your first one
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-md p-3">
                      {availableTrainingStreams.map((stream) => (
                        <div key={stream.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`stream-${stream.id}`}
                            checked={formData.trainingStreams.includes(stream.id)}
                            onCheckedChange={() => handleTrainingStreamToggle(stream.id)}
                          />
                          <Label
                            htmlFor={`stream-${stream.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {stream.name}
                          </Label>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            <CurrencyGlyph /> {stream.price}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    {formData.trainingStreams.length} of {availableTrainingStreams.length} training streams selected
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Access to Facilities */}
            <Collapsible 
              open={isFacilitiesAccessOpen} 
              onOpenChange={setIsFacilitiesAccessOpen}
              className="border rounded-lg p-4 space-y-4"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  <Label className="text-base cursor-pointer">Access to Facilities</Label>
                </div>
                {isFacilitiesAccessOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select which facilities members with this plan can access (only active facilities are shown).
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Select Facilities</Label>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllFacilities}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAllFacilities}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  {/* Facilities grid */}
                  {isLoadingFacilities ? (
                    <div className="border rounded-md p-6 text-center text-sm text-muted-foreground">Loading facilities...</div>
                  ) : availableFacilities.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-md p-3">
                        {availableFacilities.map((facility) => (
                          <div key={facility.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`facility-${facility.id}`}
                              checked={formData.selectedFacilities.includes(facility.id)}
                              onCheckedChange={() => handleFacilityToggle(facility.id)}
                            />
                            <Label
                              htmlFor={`facility-${facility.id}`}
                              className="text-sm cursor-pointer flex-1 flex items-center gap-2"
                            >
                              <Building2 className="h-4 w-4 text-primary" />
                              <span>{facility.name}</span>
                            </Label>
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-50 text-green-700 border-green-200"
                            >
                              {facility.status}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {formData.selectedFacilities.length} of {availableFacilities.length} facilities selected
                      </div>
                    </>
                  ) : (
                    <div className="border rounded-md p-6 text-center">
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm font-medium mb-1">No Active Facilities</p>
                      <p className="text-sm text-muted-foreground">
                        No facilities are currently active. Add facilities in Training Streams → Facilities.
                      </p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Promotions */}
            <Collapsible
              open={isPromotionsCampaignsOpen}
              onOpenChange={setIsPromotionsCampaignsOpen}
              className="border rounded-lg p-4 space-y-4"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <Megaphone className="h-5 w-5 text-orange-600" />
                  <Label className="text-base cursor-pointer">Promotions</Label>
                </div>
                {isPromotionsCampaignsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Attach promotional offers from Member Connect to this membership plan.
                </p>

                {/* Promotions Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center space-x-2">
                      <Percent className="h-4 w-4 text-green-600" />
                      <span>Available Promotions</span>
                    </Label>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllPromotions}
                      >
                        Select Active
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAllPromotions}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                    {isLoadingPromotions ? (
                      <p className="text-sm text-muted-foreground p-2">Loading promotions...</p>
                    ) : availablePromotions.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">No promotions found. Create one in Member Connect &gt; Promotions &amp; Campaigns.</p>
                    ) : availablePromotions.map((promotion) => (
                      <div key={promotion.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                        <Checkbox
                          id={`promotion-${promotion.id}`}
                          checked={formData.selectedPromotions.includes(promotion.id)}
                          onCheckedChange={() => handlePromotionToggle(promotion.id)}
                          disabled={promotion.status !== "Active"}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`promotion-${promotion.id}`}
                            className={`text-sm cursor-pointer ${promotion.status !== "Active" ? "text-muted-foreground" : ""}`}
                          >
                            {promotion.name}
                          </Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {promotion.discount}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${promotion.status === "Active" ? "text-green-600" : "text-red-600"}`}
                            >
                              {promotion.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{promotion.validPeriod}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {formData.selectedPromotions.length} of {availablePromotions.filter(p => p.status === "Active").length} active promotions selected
                  </div>
                </div>

                {/* Summary */}
                {formData.selectedPromotions.length > 0 && (
                  <div className="bg-muted/30 rounded-md p-3">
                    <Label className="text-sm font-medium">Selected Marketing Elements:</Label>
                    <div className="mt-2 space-y-1">
                      <div className="text-sm">
                        <span className="font-medium text-green-600">Promotions:</span> {formData.selectedPromotions.length} selected
                      </div>
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Freeze Policy Configuration */}
            <Collapsible 
              open={isFreezePolicyOpen} 
              onOpenChange={setIsFreezePolicyOpen}
              className="border rounded-lg p-4 space-y-4"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <Snowflake className="h-5 w-5 text-[#2B7A78]" />
                  <Label className="text-base cursor-pointer">Freeze Policy Configuration</Label>
                </div>
                {isFreezePolicyOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure membership freeze policies for this plan. These settings control how members can temporarily pause their memberships.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Maximum Freeze Days Allowed */}
                  <div className="space-y-2">
                    <Label htmlFor="maxFreezeDays">
                      Maximum Freeze Days Allowed
                      <span className="text-xs text-muted-foreground ml-2">(Total during plan period)</span>
                    </Label>
                    <Input
                      id="maxFreezeDays"
                      type="number"
                      min="0"
                      placeholder="e.g., 30"
                      value={formData.maxFreezeDays}
                      onChange={(e) => setFormData({...formData, maxFreezeDays: e.target.value})}
                    />
                  </div>

                  {/* Free Days Allowed */}
                  <div className="space-y-2">
                    <Label htmlFor="freeDaysAllowed">
                      Free Freeze Days Allowed
                      <span className="text-xs text-muted-foreground ml-2">(No charge)</span>
                    </Label>
                    <Input
                      id="freeDaysAllowed"
                      type="number"
                      min="0"
                      placeholder="e.g., 10"
                      value={formData.freeDaysAllowed}
                      onChange={(e) => setFormData({...formData, freeDaysAllowed: e.target.value})}
                    />
                  </div>

                  {/* Maximum Freeze Occurrences */}
                  <div className="space-y-2">
                    <Label htmlFor="maxFreezeOccurrences">
                      Maximum Freeze Occurrences
                      <span className="text-xs text-muted-foreground ml-2">(Number of times)</span>
                    </Label>
                    <Input
                      id="maxFreezeOccurrences"
                      type="number"
                      min="0"
                      placeholder="e.g., 2"
                      value={formData.maxFreezeOccurrences}
                      onChange={(e) => setFormData({...formData, maxFreezeOccurrences: e.target.value})}
                    />
                  </div>

                  {/* Charge per Extra Day */}
                  <div className="space-y-2">
                    <Label htmlFor="chargePerExtraDay">
                      Charge for Extra Days
                      <span className="text-xs text-muted-foreground ml-2">({currencyCode} per day)</span>
                    </Label>
                    <Input
                      id="chargePerExtraDay"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g., 5.00"
                      value={formData.chargePerExtraDay}
                      onChange={(e) => setFormData({...formData, chargePerExtraDay: e.target.value})}
                    />
                  </div>
                </div>

                {/* Auto Unfreeze Setting */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-[#F9FAFB]">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoUnfreeze" className="text-base">Auto Unfreeze on End Date</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically reactivate membership when freeze period ends
                    </p>
                  </div>
                  <Switch
                    id="autoUnfreeze"
                    checked={formData.autoUnfreeze}
                    onCheckedChange={(checked) => setFormData({...formData, autoUnfreeze: checked})}
                  />
                </div>

                {/* Summary Card */}
                <div className="bg-[#DFF5F4] border border-[#2B7A78] rounded-md p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Info className="h-5 w-5 text-[#2B7A78] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">Freeze Policy Summary</p>
                      <p className="text-xs text-gray-600 mt-1">This policy will apply to all members under this plan</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Max Total Days:</span>
                      <span className="ml-2 font-medium text-[#1E293B]">{formData.maxFreezeDays || "0"} days</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Free Days:</span>
                      <span className="ml-2 font-medium text-green-700">{formData.freeDaysAllowed || "0"} days</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Max Occurrences:</span>
                      <span className="ml-2 font-medium text-[#1E293B]">{formData.maxFreezeOccurrences || "0"} times</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Extra Day Charge:</span>
                      <span className="ml-2 font-medium text-[#E63946]"><CurrencyGlyph /> {formData.chargePerExtraDay || "0"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Auto Unfreeze:</span>
                      <span className={`ml-2 font-medium ${formData.autoUnfreeze ? "text-green-700" : "text-gray-500"}`}>
                        {formData.autoUnfreeze ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Family/Couple Plan Settings — only for planType === "Family" or "Couple" */}
            {(formData.planType === "Family" || formData.planType === "Couple") && (
              <Collapsible
                open={isFamilyPlanSettingsOpen}
                onOpenChange={setIsFamilyPlanSettingsOpen}
                className="border rounded-lg p-4 space-y-4"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-[#2B7A78]" />
                    <Label className="text-base cursor-pointer">
                      {formData.planType === "Couple" ? "Couple Plan Settings" : "Family Plan Settings"}
                    </Label>
                  </div>
                  {isFamilyPlanSettingsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {formData.planType === "Couple"
                      ? "Configure how this Couple plan bills its two members."
                      : "Configure how this Family plan bills its members and how many members a family can have."}
                  </p>

                  {/* Billing Mode */}
                  <div className="space-y-2">
                    <Label htmlFor="familyBillingMode">Billing Mode</Label>
                    <Select
                      value={formData.familyBillingMode}
                      onValueChange={(value) => setFormData({...formData, familyBillingMode: value})}
                    >
                      <SelectTrigger id="familyBillingMode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.planType === "Couple" ? (
                          <>
                            <SelectItem value="individual">Individual — each partner bills separately</SelectItem>
                            <SelectItem value="family_head">Couple Head — both partners bill together on ONE invoice</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="individual">Individual — adults bill separately, minors bill to head</SelectItem>
                            <SelectItem value="family_head">Family Head — everyone bills together on ONE invoice</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className={formData.planType === "Couple" ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
                    <div className="space-y-2">
                      <Label htmlFor="pricePerMember">
                        Price Per Member
                        <span className="text-xs text-muted-foreground ml-2">({currencyCode})</span>
                      </Label>
                      <Input
                        id="pricePerMember"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g., 100.00"
                        value={formData.pricePerMember}
                        onChange={(e) => setFormData({...formData, pricePerMember: e.target.value})}
                      />
                    </div>
                    {formData.planType === "Family" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="maxFamilyMembers">
                            Maximum Family Members
                            <span className="text-xs text-muted-foreground ml-2">(blank = unlimited)</span>
                          </Label>
                          <Input
                            id="maxFamilyMembers"
                            type="number"
                            min="0"
                            placeholder="e.g., 5"
                            value={formData.maxFamilyMembers}
                            onChange={(e) => setFormData({...formData, maxFamilyMembers: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxAdultMembers">
                            Maximum Adult Members
                            <span className="text-xs text-muted-foreground ml-2">(blank = unlimited)</span>
                          </Label>
                          <Input
                            id="maxAdultMembers"
                            type="number"
                            min="0"
                            placeholder="e.g., 2"
                            value={formData.maxAdultMembers}
                            onChange={(e) => setFormData({...formData, maxAdultMembers: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxChildMembers">
                            Maximum Child Members
                            <span className="text-xs text-muted-foreground ml-2">(blank = unlimited)</span>
                          </Label>
                          <Input
                            id="maxChildMembers"
                            type="number"
                            min="0"
                            placeholder="e.g., 3"
                            value={formData.maxChildMembers}
                            onChange={(e) => setFormData({...formData, maxChildMembers: e.target.value})}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Allow Additional Members — a Couple is always exactly 2 members, so
                      this only applies to Family plans */}
                  {formData.planType === "Family" && (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-[#F9FAFB]">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowAdditionalMembers" className="text-base">Allow Additional Members</Label>
                        <p className="text-sm text-muted-foreground">
                          Let a family exceed Maximum Family Members, billed at the additional member price
                        </p>
                      </div>
                      <Switch
                        id="allowAdditionalMembers"
                        checked={formData.allowAdditionalMembers}
                        onCheckedChange={(checked) => setFormData({...formData, allowAdditionalMembers: checked})}
                      />
                    </div>
                  )}

                  {formData.planType === "Family" && formData.allowAdditionalMembers && (
                    <div className="space-y-2">
                      <Label htmlFor="additionalMemberPrice">
                        Additional Member Price
                        <span className="text-xs text-muted-foreground ml-2">({currencyCode}, falls back to Price Per Member if blank)</span>
                      </Label>
                      <Input
                        id="additionalMemberPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g., 75.00"
                        value={formData.additionalMemberPrice}
                        onChange={(e) => setFormData({...formData, additionalMemberPrice: e.target.value})}
                      />
                    </div>
                  )}

                  {/* Auto Calculate Total */}
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-[#F9FAFB]">
                    <div className="space-y-0.5">
                      <Label htmlFor="autoCalculateTotal" className="text-base">Auto Calculate Total Amount</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically compute the family invoice as Price Per Member × current member count
                      </p>
                    </div>
                    <Switch
                      id="autoCalculateTotal"
                      checked={formData.autoCalculateTotal}
                      onCheckedChange={(checked) => setFormData({...formData, autoCalculateTotal: checked})}
                    />
                  </div>

                  {formData.familyBillingMode === "family_head" && (
                    <div className="bg-[#DFF5F4] border border-[#2B7A78] rounded-md p-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-[#2B7A78] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-[#1E293B]">
                            {formData.planType === "Couple" ? "Couple Head Billing Preview" : "Family Head Billing Preview"}
                          </p>
                          {formData.planType === "Couple" ? (
                            <p className="text-xs text-gray-600 mt-1">
                              Example: {formData.pricePerMember || "0"} × 2 members = {currencyCode} {((parseFloat(formData.pricePerMember as string) || 0) * 2).toFixed(2)} on ONE invoice billed only to the couple head.
                            </p>
                          ) : (
                            <p className="text-xs text-gray-600 mt-1">
                              Example: {formData.pricePerMember || "0"} × 5 members = {currencyCode} {((parseFloat(formData.pricePerMember as string) || 0) * 5).toFixed(2)} on ONE invoice billed only to the family head.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCloseDialog}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            {editingPlan ? (
              <Button onClick={handleUpdatePlan}>
                <Save className="mr-2 h-4 w-4" />
                Update Plan
              </Button>
            ) : (
              <Button onClick={handleCreatePlan}>
                <Save className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Plan Group Dialog */}
      <Dialog open={showAddPlanGroupDialog} onOpenChange={setShowAddPlanGroupDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Plan Group</DialogTitle>
            <DialogDescription>Create a plan group to classify plans (e.g., Membership, Class Package, Personal Training).</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="newPlanGroupName">Plan Group Name *</Label>
            <Input
              id="newPlanGroupName"
              placeholder="e.g., Corporate Wellness"
              value={newPlanGroupName}
              onChange={(e) => setNewPlanGroupName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddPlanGroup(); }}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddPlanGroupDialog(false)}>Cancel</Button>
            <Button onClick={handleAddPlanGroup} disabled={isSavingPlanGroup}>
              {isSavingPlanGroup ? "Adding..." : "Add Plan Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Training Stream Dialog */}
      <Dialog open={showAddTrainingStreamDialog} onOpenChange={setShowAddTrainingStreamDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Training Stream</DialogTitle>
            <DialogDescription>
              Create a training stream with a price (e.g., Personal Training, Yoga Classes). It's saved to the
              add-on catalog so it can also be sold directly to members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="newTrainingStreamName">Name *</Label>
              <Input
                id="newTrainingStreamName"
                placeholder="e.g., Strength Training"
                value={newTrainingStreamName}
                onChange={(e) => setNewTrainingStreamName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="newTrainingStreamPrice">Amount *</Label>
                <Input
                  id="newTrainingStreamPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newTrainingStreamPrice}
                  onChange={(e) => setNewTrainingStreamPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newTrainingStreamValidity">Validity (days) *</Label>
                <Input
                  id="newTrainingStreamValidity"
                  type="number"
                  min="1"
                  value={newTrainingStreamValidity}
                  onChange={(e) => setNewTrainingStreamValidity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddTrainingStream(); }}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddTrainingStreamDialog(false)}>Cancel</Button>
            <Button onClick={handleAddTrainingStream} disabled={isSavingTrainingStream}>
              {isSavingTrainingStream ? "Adding..." : "Add Training Stream"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

