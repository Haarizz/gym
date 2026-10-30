import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
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
  ChevronUp,
  ChevronDown,
  Info,
  Tag,
  Megaphone,
  Percent,
  Building2,
  Snowflake,
  Columns3,
  List,
  Eye,
  Power,
  ArrowUpDown,
  GripVertical
} from 'lucide-react';
import { Checkbox } from "./ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import exampleImage from 'figma:asset/362a2ed9c216cf9c38308e71b24d35a09379ac76.png';

// Sample training streams data
const trainingStreams = [
  { id: 1, name: "Strength Training", category: "Fitness" },
  { id: 2, name: "Cardio & HIIT", category: "Fitness" },
  { id: 3, name: "Yoga & Mindfulness", category: "Wellness" },
  { id: 4, name: "Pilates", category: "Wellness" },
  { id: 5, name: "Group Classes", category: "Classes" },
  { id: 6, name: "Personal Training", category: "Training" },
  { id: 7, name: "Aqua Fitness", category: "Classes" },
  { id: 8, name: "CrossFit", category: "Fitness" },
  { id: 9, name: "Martial Arts", category: "Training" },
  { id: 10, name: "Senior Fitness", category: "Specialized" }
];

// Sample facilities data - only active facilities
const availableFacilities = [
  { id: "FAC-001", name: "Basketball Court", icon: "🏀", status: "Active" },
  { id: "FAC-002", name: "Swimming Pool", icon: "🏊", status: "Active" },
  { id: "FAC-003", name: "Padel Court", icon: "🎾", status: "Active" },
  { id: "FAC-004", name: "Football Ground", icon: "⚽", status: "Active" }
];

// Sample promotions and campaigns data from promotions-campaign component
const availablePromotions = [
  {
    id: 1,
    name: "New Year Special",
    type: "Percentage",
    discount: "25%",
    validPeriod: "1/1/2024 - 31/1/2024",
    status: "Active",
    category: "Seasonal"
  },
  {
    id: 2,
    name: "Student Discount", 
    type: "Fixed Amount",
    discount: "$20",
    validPeriod: "1/9/2024 - 31/12/2024",
    status: "Active",
    category: "Demographic"
  },
  {
    id: 3,
    name: "Summer Body Challenge",
    type: "Percentage", 
    discount: "15%",
    validPeriod: "1/6/2024 - 31/8/2024",
    status: "Expired",
    category: "Challenge"
  },
  {
    id: 4,
    name: "Referral Bonus",
    type: "Fixed Amount",
    discount: "$50",
    validPeriod: "1/1/2024 - 31/12/2024",
    status: "Active",
    category: "Referral"
  },
  {
    id: 5,
    name: "Early Bird Special",
    type: "Percentage",
    discount: "10%",
    validPeriod: "1/12/2024 - 31/12/2024",
    status: "Active",
    category: "Time-based"
  }
];

const availableCampaigns = [
  {
    id: 1,
    name: "January Fitness Challenge",
    type: "Engagement",
    duration: "30 days",
    status: "Active",
    category: "Challenge"
  },
  {
    id: 2,
    name: "Member Appreciation Week",
    type: "Retention",
    duration: "7 days",
    status: "Active",
    category: "Loyalty"
  },
  {
    id: 3,
    name: "Bring a Friend Month",
    type: "Acquisition",
    duration: "30 days",
    status: "Active",  
    category: "Referral"
  },
  {
    id: 4,
    name: "Holiday Wellness Program",
    type: "Wellness",
    duration: "60 days",
    status: "Inactive",
    category: "Seasonal"
  }
];

// Sample plans data
const samplePlans = [
  {
    id: 1,
    name: "Basic Monthly",
    type: "Membership",
    duration: "1 month",
    durationType: "Monthly",
    price: 49.99,
    discount: 0,
    status: "Active",
    maxSessions: null,
    assignableTrainers: [],
    description: "Access to gym equipment and basic facilities",
    planType: "Individual",
    trainingStreams: [1, 2, 3, 5], // Strength Training, Cardio & HIIT, Yoga & Mindfulness, Group Classes
    selectedPromotions: [2], // Student Discount
    selectedCampaigns: [2], // Member Appreciation Week
    selectedFacilities: ["FAC-001", "FAC-002"] // Basketball Court, Swimming Pool
  },
  {
    id: 2,
    name: "Premium Annual",
    type: "Membership", 
    duration: "12 months",
    durationType: "Annual",
    price: 499.99,
    discount: 15,
    status: "Active",
    maxSessions: null,
    assignableTrainers: [],
    description: "Full gym access with group classes included",
    planType: "Individual",
    trainingStreams: [1, 2, 3, 4, 5, 6, 7, 8], // Most training streams
    selectedPromotions: [1, 5], // New Year Special, Early Bird Special
    selectedCampaigns: [1, 2, 3], // January Fitness Challenge, Member Appreciation Week, Bring a Friend Month
    selectedFacilities: ["FAC-001", "FAC-002", "FAC-003", "FAC-004"] // All facilities
  },
  {
    id: 3,
    name: "Personal Training Package",
    type: "Personal Training",
    duration: "8 sessions",
    durationType: "Sessions",
    price: 800.00,
    discount: 0,
    status: "Active",
    maxSessions: 8,
    assignableTrainers: ["John Smith", "Sarah Wilson"],
    description: "One-on-one personal training sessions",
    planType: "Individual",
    trainingStreams: [6, 9], // Personal Training, Martial Arts
    selectedPromotions: [4], // Referral Bonus
    selectedCampaigns: [],
    selectedFacilities: [] // No facilities included
  },
  {
    id: 4,
    name: "Family Plan",
    type: "Membership",
    duration: "6 months",
    durationType: "Monthly",
    price: 129.99,
    discount: 20,
    status: "Active",
    maxSessions: null,
    assignableTrainers: [],
    description: "Gym access for up to 4 family members",
    planType: "Family",
    trainingStreams: [1, 2, 3, 5, 10], // Strength Training, Cardio & HIIT, Yoga & Mindfulness, Group Classes, Senior Fitness
    selectedPromotions: [],
    selectedCampaigns: [3], // Bring a Friend Month
    selectedFacilities: ["FAC-002", "FAC-004"] // Swimming Pool, Football Ground
  },
  {
    id: 5,
    name: "Corporate Wellness",
    type: "Membership",
    duration: "12 months",
    durationType: "Annual",
    price: 2999.99,
    discount: 25,
    status: "Inactive",
    maxSessions: null,
    assignableTrainers: [],
    description: "Corporate membership for employee wellness programs",
    planType: "Corporate",
    trainingStreams: [1, 2, 3, 4, 5], // Basic wellness streams
    selectedPromotions: [],
    selectedCampaigns: [],
    selectedFacilities: ["FAC-001", "FAC-003"] // Basketball Court, Padel Court
  }
];

type Plan = typeof samplePlans[0] & {
  trainingStreams: number[];
  selectedPromotions: number[];
  selectedCampaigns: number[];
  selectedFacilities: string[];
  maxFreezeDays?: number;
  maxFreezeOccurrences?: number;
  chargePerExtraDay?: number;
  freeDaysAllowed?: number;
  autoUnfreeze?: boolean;
};

export function ManagePlans() {
  const [plans, setPlans] = useState<Plan[]>(samplePlans);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDuration, setFilterDuration] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("list");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [sortKey, setSortKey] = useState<"name" | "price" | "subscribers" | "created">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [draggedPlanId, setDraggedPlanId] = useState<number | null>(null);
  const [expandedCardSections, setExpandedCardSections] = useState<Record<number, string[]>>({});

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
    trainingStreams: trainingStreams.map(stream => stream.id), // All selected by default
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
    autoUnfreeze: true
  });

  // Training streams access state
  const [isTrainingAccessOpen, setIsTrainingAccessOpen] = useState(true);
  // Facilities access state
  const [isFacilitiesAccessOpen, setIsFacilitiesAccessOpen] = useState(true);
  // Promotions and campaigns state
  const [isPromotionsCampaignsOpen, setIsPromotionsCampaignsOpen] = useState(false);
  // Freeze Policy Configuration state
  const [isFreezePolicyOpen, setIsFreezePolicyOpen] = useState(false);

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
      trainingStreams: trainingStreams.map(stream => stream.id), // All selected by default
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
      autoUnfreeze: true
    });
  };

  const handleCreatePlan = () => {
    const newPlan: Plan = {
      id: Date.now(),
      name: formData.name,
      type: formData.type as "Membership" | "Class Package" | "Personal Training",
      duration: formData.durationType === "Sessions" ? `${formData.durationValue} sessions` : `${formData.durationValue} ${formData.durationType.toLowerCase()}`,
      durationType: formData.durationType,
      price: parseFloat(formData.price),
      discount: parseFloat(formData.discount) || 0,
      status: formData.status as "Active" | "Inactive",
      maxSessions: formData.maxSessions ? parseInt(formData.maxSessions) : null,
      assignableTrainers: formData.assignableTrainers ? formData.assignableTrainers.split(",").map(t => t.trim()) : [],
      description: formData.description,
      planType: formData.planType as "Individual" | "Family" | "Corporate",
      trainingStreams: formData.trainingStreams,
      selectedPromotions: formData.selectedPromotions,
      selectedCampaigns: formData.selectedCampaigns,
      selectedFacilities: formData.selectedFacilities,
      maxFreezeDays: formData.maxFreezeDays ? Number(formData.maxFreezeDays) : undefined,
      maxFreezeOccurrences: formData.maxFreezeOccurrences ? Number(formData.maxFreezeOccurrences) : undefined,
      chargePerExtraDay: formData.chargePerExtraDay ? Number(formData.chargePerExtraDay) : undefined,
      freeDaysAllowed: formData.freeDaysAllowed ? Number(formData.freeDaysAllowed) : undefined,
      autoUnfreeze: formData.autoUnfreeze
    };

    setPlans([...plans, newPlan]);
    setShowCreateDialog(false);
    resetForm();
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      type: plan.type,
      durationType: plan.durationType,
      durationValue: plan.duration.split(" ")[0],
      price: plan.price.toString(),
      discount: plan.discount.toString(),
      maxSessions: plan.maxSessions?.toString() || "",
      assignableTrainers: plan.assignableTrainers.join(", "),
      description: plan.description,
      planType: plan.planType,
      status: plan.status,
      trainingStreams: plan.trainingStreams || [], // Load existing training streams
      membershipCapacity: "Unlimited", // Default to Unlimited for editing too
      maxCapacity: "0",
      attendanceLimit: "Unlimited", // Default to Unlimited for editing too
      attendanceValue: "3",
      attendancePeriod: "Payment",
      selectedPromotions: plan.selectedPromotions || [], // Load existing promotions
      selectedCampaigns: plan.selectedCampaigns || [], // Load existing campaigns
      selectedFacilities: plan.selectedFacilities || [], // Load existing facilities
      // Freeze Policy Configuration - with defaults for existing plans
      maxFreezeDays: (plan as any).maxFreezeDays?.toString() || "30",
      maxFreezeOccurrences: (plan as any).maxFreezeOccurrences?.toString() || "2",
      chargePerExtraDay: (plan as any).chargePerExtraDay?.toString() || "5",
      freeDaysAllowed: (plan as any).freeDaysAllowed?.toString() || "10",
      autoUnfreeze: (plan as any).autoUnfreeze !== undefined ? (plan as any).autoUnfreeze : true
    });
    setShowCreateDialog(true);
  };

  const handleUpdatePlan = () => {
    if (!editingPlan) return;
    
    const updatedPlan: Plan = {
      ...editingPlan,
      name: formData.name,
      type: formData.type as "Membership" | "Class Package" | "Personal Training",
      duration: formData.durationType === "Sessions" ? `${formData.durationValue} sessions` : `${formData.durationValue} ${formData.durationType.toLowerCase()}`,
      durationType: formData.durationType,
      price: parseFloat(formData.price),
      discount: parseFloat(formData.discount) || 0,
      status: formData.status as "Active" | "Inactive",
      maxSessions: formData.maxSessions ? parseInt(formData.maxSessions) : null,
      assignableTrainers: formData.assignableTrainers ? formData.assignableTrainers.split(",").map(t => t.trim()) : [],
      description: formData.description,
      planType: formData.planType as "Individual" | "Family" | "Corporate",
      trainingStreams: formData.trainingStreams,
      selectedPromotions: formData.selectedPromotions,
      selectedCampaigns: formData.selectedCampaigns,
      selectedFacilities: formData.selectedFacilities,
      maxFreezeDays: formData.maxFreezeDays ? Number(formData.maxFreezeDays) : undefined,
      maxFreezeOccurrences: formData.maxFreezeOccurrences ? Number(formData.maxFreezeOccurrences) : undefined,
      chargePerExtraDay: formData.chargePerExtraDay ? Number(formData.chargePerExtraDay) : undefined,
      freeDaysAllowed: formData.freeDaysAllowed ? Number(formData.freeDaysAllowed) : undefined,
      autoUnfreeze: formData.autoUnfreeze
    };

    setPlans(plans.map(p => p.id === editingPlan.id ? updatedPlan : p));
    setShowCreateDialog(false);
    setEditingPlan(null);
    resetForm();
  };

  const handleDuplicatePlan = (plan: Plan) => {
    const duplicatedPlan: Plan = {
      ...plan,
      id: Date.now(),
      name: `${plan.name} (Copy)`,
      status: "Inactive",
      trainingStreams: plan.trainingStreams || [],
      selectedPromotions: plan.selectedPromotions || [],
      selectedCampaigns: plan.selectedCampaigns || [],
      selectedFacilities: plan.selectedFacilities || []
    };
    setPlans([...plans, duplicatedPlan]);
  };

  const handleDeletePlan = (planId: number) => {
    setPlans(plans.filter(p => p.id !== planId));
  };

  const handleToggleStatus = (planId: number, status?: "Active" | "Inactive") => {
    setPlans(currentPlans =>
      currentPlans.map(plan =>
        plan.id === planId
          ? { ...plan, status: status || (plan.status === "Active" ? "Inactive" : "Active") }
          : plan
      )
    );
    setSelectedPlan(current =>
      current?.id === planId
        ? { ...current, status: status || (current.status === "Active" ? "Inactive" : "Active") }
        : current
    );
  };

  const getPlanCode = (plan: Plan) => `PLN-${String(plan.id).slice(-4).padStart(4, "0")}`;
  const getSubscriberCount = (plan: Plan) => (Number(String(plan.id).slice(-3)) * 17 + 24) % 480;
  const getCreatedDate = (plan: Plan) => {
    const day = ((Number(String(plan.id).slice(-2)) * 3) % 27) + 1;
    return new Date(2024, (Number(String(plan.id).slice(-2)) + 2) % 12, day);
  };

  const handleSort = (key: "name" | "price" | "subscribers" | "created") => {
    if (sortKey === key) {
      setSortDirection(direction => direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const isCardSectionExpanded = (planId: number, section: string) =>
    expandedCardSections[planId]?.includes(section) ?? false;

  const toggleCardSection = (planId: number, section: string) => {
    setExpandedCardSections(current => {
      const sections = current[planId] || [];
      return {
        ...current,
        [planId]: sections.includes(section)
          ? sections.filter(item => item !== section)
          : [...sections, section],
      };
    });
  };

  const getStatusColor = (status: string) => {
    return status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Individual": return "bg-blue-100 text-blue-800";
      case "Family": return "bg-purple-100 text-purple-800";
      case "Corporate": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Helper functions to get names from IDs
  const getTrainingStreamNames = (streamIds: number[]) => {
    return streamIds.map(id => trainingStreams.find(stream => stream.id === id)?.name).filter(Boolean);
  };

  const getPromotionNames = (promotionIds: number[]) => {
    return promotionIds.map(id => availablePromotions.find(promo => promo.id === id)?.name).filter(Boolean);
  };

  const getCampaignNames = (campaignIds: number[]) => {
    return campaignIds.map(id => availableCampaigns.find(campaign => campaign.id === id)?.name).filter(Boolean);
  };

  const getFacilityNames = (facilityIds: string[]) => {
    return facilityIds.map(id => availableFacilities.find(facility => facility.id === id)?.name).filter(Boolean);
  };

  // Filter plans based on search and filters
  const filteredPlans = plans.filter(plan => {
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      plan.name.toLowerCase().includes(normalizedSearch) ||
      getPlanCode(plan).toLowerCase().includes(normalizedSearch) ||
      plan.type.toLowerCase().includes(normalizedSearch);
    const matchesDuration = filterDuration === "all" || plan.durationType.toLowerCase() === filterDuration.toLowerCase();
    const matchesType = filterType === "all" || plan.planType.toLowerCase() === filterType.toLowerCase();
    const matchesStatus = filterStatus === "all" || plan.status.toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesDuration && matchesType && matchesStatus;
  }).sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;
    if (sortKey === "price") return (a.price - b.price) * direction;
    if (sortKey === "subscribers") return (getSubscriberCount(a) - getSubscriberCount(b)) * direction;
    if (sortKey === "created") return (getCreatedDate(a).getTime() - getCreatedDate(b).getTime()) * direction;
    return a.name.localeCompare(b.name) * direction;
  });

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
      trainingStreams: trainingStreams.map(stream => stream.id)
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

  // Campaigns handlers
  const handleCampaignToggle = (campaignId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedCampaigns: prev.selectedCampaigns.includes(campaignId)
        ? prev.selectedCampaigns.filter(id => id !== campaignId)
        : [...prev.selectedCampaigns, campaignId]
    }));
  };

  const handleSelectAllCampaigns = () => {
    setFormData(prev => ({
      ...prev,
      selectedCampaigns: availableCampaigns.filter(c => c.status === "Active").map(c => c.id)
    }));
  };

  const handleDeselectAllCampaigns = () => {
    setFormData(prev => ({
      ...prev,
      selectedCampaigns: []
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1>Manage Plans</h1>
          <p className="text-muted-foreground">Create and manage membership plans, class packages, and training programs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#327F74]/20 bg-[#F0F8F6] p-1" aria-label="Plan view">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setViewMode("kanban")}
              className={viewMode === "kanban" ? "bg-[#327F74] text-white hover:bg-[#1F5A52] hover:text-white" : "text-[#1F5A52]"}
            >
              <Columns3 className="mr-2 h-4 w-4" />
              Kanban View
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-[#327F74] text-white hover:bg-[#1F5A52] hover:text-white" : "text-[#1F5A52]"}
            >
              <List className="mr-2 h-4 w-4" />
              List View
            </Button>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-[#327F74] hover:bg-[#1F5A52]">
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
            <p className="text-xs text-muted-foreground">All membership plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Settings className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {plans.filter(p => p.status === "Active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              AED {(plans.reduce((sum, p) => sum + p.price, 0) / plans.length).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Family Plans</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {plans.filter(p => p.planType === "Family").length}
            </div>
            <p className="text-xs text-muted-foreground">Multi-member plans</p>
          </CardContent>
        </Card>
      </div>

      {/* Shared plan workspace */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-white">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Plan Overview</CardTitle>
              <CardDescription>
                {filteredPlans.length} of {plans.length} plans · {viewMode === "kanban" ? "Organized by status" : "Structured plan directory"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit border-[#327F74]/30 text-[#1F5A52]">
              {viewMode === "kanban" ? "Kanban View" : "List View"}
            </Badge>
          </div>

          {/* Shared filters remain mounted while switching views */}
          <div className="mt-4 flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search plan name, code, or type..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Select value={filterDuration} onValueChange={setFilterDuration}>
                <SelectTrigger className="w-full sm:w-[145px]"><SelectValue placeholder="Duration" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Durations</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="sessions">Sessions</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[145px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[135px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className={viewMode === "kanban" ? "bg-[#F7FAF9] p-4 sm:p-6" : "p-0"}>
          {filteredPlans.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <Search className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-medium">No plans match these filters</p>
              <p className="text-sm text-muted-foreground">Try changing the search term or filter selection.</p>
            </div>
          ) : viewMode === "kanban" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {(["Active", "Inactive"] as const).map((status) => {
                const statusPlans = filteredPlans.filter(plan => plan.status === status);
                return (
                  <section
                    key={status}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedPlanId !== null) handleToggleStatus(draggedPlanId, status);
                      setDraggedPlanId(null);
                    }}
                    className="min-h-[280px] rounded-xl border border-[#327F74]/15 bg-white/75 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                        <h3 className="font-semibold text-foreground">{status}</h3>
                        <Badge variant="secondary">{statusPlans.length}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">Drop plans here</span>
                    </div>
                    <div className="space-y-3">
                      {statusPlans.length === 0 ? (
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-[#327F74]/20 text-sm text-muted-foreground">
                          No {status.toLowerCase()} plans
                        </div>
                      ) : statusPlans.map((plan) => (
                        <article
                          key={plan.id}
                          draggable
                          onDragStart={() => setDraggedPlanId(plan.id)}
                          onDragEnd={() => setDraggedPlanId(null)}
                          onClick={() => setSelectedPlan(plan)}
                          className="group cursor-pointer rounded-xl border border-border bg-white p-4 font-['Plus_Jakarta_Sans'] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#327F74]/35 hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <GripVertical className="mt-1 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-foreground">{plan.name}</p>
                                  <p className="text-xs text-muted-foreground">{getPlanCode(plan)} · {plan.type}</p>
                                </div>
                                <Badge className={getStatusColor(plan.status)}>{plan.status}</Badge>
                              </div>
                              {/* 1. Plan Summary */}
                              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y py-3 text-sm">
                                <div><p className="text-xs text-muted-foreground">Price / Billing</p><p className="font-semibold text-[#1F5A52]">AED {plan.price.toLocaleString()} · {plan.durationType}</p></div>
                                <div><p className="text-xs text-muted-foreground">Subscribers</p><p className="font-medium">{getSubscriberCount(plan)}</p></div>
                              </div>

                              {/* 2. Description / Notes */}
                              <section className="border-b py-3">
                                <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#1F5A52]"><Info className="h-3.5 w-3.5" />Description / Notes</div>
                                <p className={`whitespace-pre-line text-xs leading-5 text-muted-foreground ${!isCardSectionExpanded(plan.id, "description") ? "line-clamp-2" : ""}`}>
                                  {plan.description || "No description added"}
                                </p>
                                {plan.description && plan.description.length > 90 && (
                                  <button
                                    type="button"
                                    onClick={(event) => { event.stopPropagation(); toggleCardSection(plan.id, "description"); }}
                                    className="mt-1 text-xs font-semibold text-[#327F74] hover:underline"
                                  >
                                    {isCardSectionExpanded(plan.id, "description") ? "Show Less" : "View More"}
                                  </button>
                                )}
                              </section>

                              {/* 3. Training Streams */}
                              <section className="border-b py-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1F5A52]"><Key className="h-3.5 w-3.5" />Training Streams <span className="font-normal text-muted-foreground">({plan.trainingStreams.length})</span></div>
                                  {plan.trainingStreams.length > 3 && (
                                    <button type="button" onClick={(event) => { event.stopPropagation(); toggleCardSection(plan.id, "streams"); }} className="text-xs font-semibold text-[#327F74] hover:underline">
                                      {isCardSectionExpanded(plan.id, "streams") ? "Show Less" : "View All"}
                                    </button>
                                  )}
                                </div>
                                {plan.trainingStreams.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {getTrainingStreamNames(plan.trainingStreams).slice(0, isCardSectionExpanded(plan.id, "streams") ? undefined : 3).map((streamName, index) => (
                                      <button key={index} type="button" onClick={(event) => { event.stopPropagation(); setSelectedPlan(plan); }} className="rounded-md border border-[#327F74]/20 bg-[#F0F8F6] px-2 py-1 text-[11px] font-medium text-[#1F5A52] hover:border-[#327F74]/50">{streamName}</button>
                                    ))}
                                  </div>
                                ) : <p className="text-xs text-muted-foreground">No training streams configured</p>}
                              </section>

                              {/* 4. Facility Access */}
                              <section className="border-b py-3">
                                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#1F5A52]"><Building2 className="h-3.5 w-3.5" />Facility Access</div>
                                {plan.selectedFacilities.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {plan.selectedFacilities.slice(0, 2).map((facilityId) => {
                                      const facility = availableFacilities.find(item => item.id === facilityId);
                                      return facility ? (
                                        <button key={facility.id} type="button" onClick={(event) => { event.stopPropagation(); setSelectedPlan(plan); }} className="rounded-md border bg-white px-2 py-1 text-[11px] font-medium hover:border-[#327F74]/40"><span className="mr-1">{facility.icon}</span>{facility.name}</button>
                                      ) : null;
                                    })}
                                    {plan.selectedFacilities.length > 2 && <Badge variant="secondary" className="text-[10px]">+{plan.selectedFacilities.length - 2} more</Badge>}
                                  </div>
                                ) : <p className="text-xs text-muted-foreground">No facilities configured</p>}
                              </section>

                              {/* 5. Campaigns & Promotions */}
                              <section className="border-b py-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1F5A52]"><Megaphone className="h-3.5 w-3.5" />Campaigns & Promotions</div>
                                  {plan.selectedPromotions.length + plan.selectedCampaigns.length > 2 && (
                                    <button type="button" onClick={(event) => { event.stopPropagation(); toggleCardSection(plan.id, "marketing"); }} className="text-xs font-semibold text-[#327F74] hover:underline">
                                      {isCardSectionExpanded(plan.id, "marketing") ? "Show Less" : "View All"}
                                    </button>
                                  )}
                                </div>
                                {plan.selectedPromotions.length + plan.selectedCampaigns.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {[...plan.selectedPromotions.map(id => ({ kind: "Promotion", item: availablePromotions.find(promotion => promotion.id === id) })), ...plan.selectedCampaigns.map(id => ({ kind: "Campaign", item: availableCampaigns.find(campaign => campaign.id === id) }))]
                                      .filter(entry => entry.item)
                                      .slice(0, isCardSectionExpanded(plan.id, "marketing") ? undefined : 2)
                                      .map((entry, index) => (
                                        <button key={`${entry.kind}-${index}`} type="button" onClick={(event) => { event.stopPropagation(); setSelectedPlan(plan); }} className="flex w-full items-start justify-between gap-2 rounded-md border bg-white px-2.5 py-2 text-left hover:border-[#327F74]/40">
                                          <span className="min-w-0"><span className="block truncate text-[11px] font-semibold">{entry.item?.name}</span><span className="block text-[10px] text-muted-foreground">{entry.kind}{"validPeriod" in (entry.item || {}) ? ` · ${(entry.item as typeof availablePromotions[number]).validPeriod}` : ""}</span></span>
                                          <Badge className={entry.item?.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{entry.item?.status}</Badge>
                                        </button>
                                      ))}
                                  </div>
                                ) : <p className="text-xs text-muted-foreground">No campaigns assigned</p>}
                              </section>

                              {/* 6. Freezing Policy */}
                              <section className="py-3">
                                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#1F5A52]"><Snowflake className="h-3.5 w-3.5" />Freezing Policy</div>
                                {plan.maxFreezeDays !== undefined || plan.maxFreezeOccurrences !== undefined || plan.freeDaysAllowed !== undefined ? (
                                  plan.maxFreezeDays === 0 ? (
                                    <Badge className="bg-red-100 text-red-700">Freezing Not Allowed</Badge>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#F0F8F6] p-2.5 text-[11px]">
                                      <div><span className="text-muted-foreground">Allowed</span><p className="font-semibold text-emerald-700">Yes</p></div>
                                      {plan.maxFreezeDays !== undefined && <div><span className="text-muted-foreground">Maximum Days</span><p className="font-semibold">{plan.maxFreezeDays} days</p></div>}
                                      {plan.maxFreezeOccurrences !== undefined && <div><span className="text-muted-foreground">Max Requests</span><p className="font-semibold">{plan.maxFreezeOccurrences}</p></div>}
                                      {plan.freeDaysAllowed !== undefined && <div><span className="text-muted-foreground">Free Days</span><p className="font-semibold">{plan.freeDaysAllowed} days</p></div>}
                                      {plan.chargePerExtraDay !== undefined && <div><span className="text-muted-foreground">Extra Day Charge</span><p className="font-semibold">AED {plan.chargePerExtraDay}</p></div>}
                                      {plan.autoUnfreeze !== undefined && <div><span className="text-muted-foreground">Auto Unfreeze</span><p className="font-semibold">{plan.autoUnfreeze ? "Enabled" : "Disabled"}</p></div>}
                                    </div>
                                  )
                                ) : <p className="text-xs text-muted-foreground">No freezing policy configured</p>}
                              </section>

                              <div className="flex flex-wrap items-center gap-1.5 border-t pt-3">
                                <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); setSelectedPlan(plan); }}><Eye className="mr-1 h-3.5 w-3.5" />View</Button>
                                <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); handleEditPlan(plan); }}><Edit className="mr-1 h-3.5 w-3.5" />Edit</Button>
                                <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); handleDuplicatePlan(plan); }}><Copy className="mr-1 h-3.5 w-3.5" />Duplicate</Button>
                                <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); handleToggleStatus(plan.id); }}><Power className="mr-1 h-3.5 w-3.5" />{plan.status === "Active" ? "Deactivate" : "Activate"}</Button>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7FAF9]">
                    <TableHead><button className="flex items-center gap-1" onClick={() => handleSort("name")}>Plan Name <ArrowUpDown className="h-3.5 w-3.5" /></button></TableHead>
                    <TableHead>Plan Code</TableHead>
                    <TableHead><button className="flex items-center gap-1" onClick={() => handleSort("price")}>Price <ArrowUpDown className="h-3.5 w-3.5" /></button></TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead><button className="flex items-center gap-1" onClick={() => handleSort("subscribers")}>Subscribers <ArrowUpDown className="h-3.5 w-3.5" /></button></TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><button className="flex items-center gap-1" onClick={() => handleSort("created")}>Created Date <ArrowUpDown className="h-3.5 w-3.5" /></button></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.map((plan) => (
                    <TableRow key={plan.id} onClick={() => setSelectedPlan(plan)} className="cursor-pointer hover:bg-[#F0F8F6]/70">
                      <TableCell><div className="font-medium">{plan.name}</div><div className="text-xs text-muted-foreground">{plan.type} · {plan.planType}</div></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{getPlanCode(plan)}</TableCell>
                      <TableCell><div className="font-semibold text-[#1F5A52]">AED {plan.price.toLocaleString()}</div>{plan.discount > 0 && <div className="text-xs text-emerald-600">{plan.discount}% discount</div>}</TableCell>
                      <TableCell>{plan.durationType}</TableCell>
                      <TableCell>{getSubscriberCount(plan)}</TableCell>
                      <TableCell><div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" />{plan.duration}</div></TableCell>
                      <TableCell><Badge className={getStatusColor(plan.status)}>{plan.status}</Badge></TableCell>
                      <TableCell>{getCreatedDate(plan).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button title="View plan" variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); setSelectedPlan(plan); }}><Eye className="h-4 w-4" /></Button>
                          <Button title="Edit plan" variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); handleEditPlan(plan); }}><Edit className="h-4 w-4" /></Button>
                          <Button title="Duplicate plan" variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); handleDuplicatePlan(plan); }}><Copy className="h-4 w-4" /></Button>
                          <Button title={plan.status === "Active" ? "Deactivate plan" : "Activate plan"} variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); handleToggleStatus(plan.id); }}><Power className="h-4 w-4" /></Button>
                          <Button title="Delete plan" variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={(event) => { event.stopPropagation(); handleDeletePlan(plan.id); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing plan data shown in a lightweight detail view */}
      <Dialog open={Boolean(selectedPlan)} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="sm:max-w-[620px]">
          {selectedPlan && (
            <>
              <DialogHeader>
                <div className="mb-2 flex items-center gap-2"><Badge className={getStatusColor(selectedPlan.status)}>{selectedPlan.status}</Badge><span className="font-mono text-xs text-muted-foreground">{getPlanCode(selectedPlan)}</span></div>
                <DialogTitle>{selectedPlan.name}</DialogTitle>
                <DialogDescription>{selectedPlan.description}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-3 sm:grid-cols-3">
                <div className="rounded-lg bg-[#F0F8F6] p-3"><p className="text-xs text-muted-foreground">Price</p><p className="font-semibold text-[#1F5A52]">AED {selectedPlan.price.toLocaleString()}</p></div>
                <div className="rounded-lg bg-[#F0F8F6] p-3"><p className="text-xs text-muted-foreground">Subscribers</p><p className="font-semibold">{getSubscriberCount(selectedPlan)}</p></div>
                <div className="rounded-lg bg-[#F0F8F6] p-3"><p className="text-xs text-muted-foreground">Validity</p><p className="font-semibold">{selectedPlan.duration}</p></div>
                <div><p className="text-xs text-muted-foreground">Billing Cycle</p><p className="font-medium">{selectedPlan.durationType}</p></div>
                <div><p className="text-xs text-muted-foreground">Plan Type</p><p className="font-medium">{selectedPlan.planType}</p></div>
                <div><p className="text-xs text-muted-foreground">Created</p><p className="font-medium">{getCreatedDate(selectedPlan).toLocaleDateString("en-GB")}</p></div>
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => handleDuplicatePlan(selectedPlan)}><Copy className="mr-2 h-4 w-4" />Duplicate</Button>
                <Button variant="outline" onClick={() => handleToggleStatus(selectedPlan.id)}><Power className="mr-2 h-4 w-4" />{selectedPlan.status === "Active" ? "Deactivate" : "Activate"}</Button>
                <Button className="bg-[#327F74] hover:bg-[#1F5A52]" onClick={() => { const plan = selectedPlan; setSelectedPlan(null); handleEditPlan(plan); }}><Edit className="mr-2 h-4 w-4" />Edit Plan</Button>
              </div>
            </>
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
                placeholder="e.g., Premium Monthly"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            {/* Plan Type and Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planType">Plan Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Membership">Membership</SelectItem>
                    <SelectItem value="Class Package">Class Package</SelectItem>
                    <SelectItem value="Personal Training">Personal Training</SelectItem>
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
                    <SelectItem value="Family">Family</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
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

            {/* Price and Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (AED) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="49.99"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Discount (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  placeholder="15"
                  value={formData.discount}
                  onChange={(e) => setFormData({...formData, discount: e.target.value})}
                />
              </div>
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

                  {/* Training streams grid */}
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-md p-3">
                    {trainingStreams.map((stream) => (
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
                        <Badge variant="outline" className="text-xs">
                          {stream.category}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {formData.trainingStreams.length} of {trainingStreams.length} training streams selected
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
                  {availableFacilities.length > 0 ? (
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
                              <span className="text-lg">{facility.icon}</span>
                              <span>{facility.name}</span>
                            </Label>
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-green-50 text-green-700 border-green-200"
                            >
                              Active
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

            {/* Promotions & Campaigns */}
            <Collapsible 
              open={isPromotionsCampaignsOpen} 
              onOpenChange={setIsPromotionsCampaignsOpen}
              className="border rounded-lg p-4 space-y-4"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <Megaphone className="h-5 w-5 text-orange-600" />
                  <Label className="text-base cursor-pointer">Promotions & Campaigns</Label>
                </div>
                {isPromotionsCampaignsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Attach promotional offers and marketing campaigns to this membership plan.
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
                    {availablePromotions.map((promotion) => (
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

                {/* Campaigns Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-purple-600" />
                      <span>Available Campaigns</span>
                    </Label>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllCampaigns}
                      >
                        Select Active
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAllCampaigns}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                    {availableCampaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                        <Checkbox
                          id={`campaign-${campaign.id}`}
                          checked={formData.selectedCampaigns.includes(campaign.id)}
                          onCheckedChange={() => handleCampaignToggle(campaign.id)}
                          disabled={campaign.status !== "Active"}
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={`campaign-${campaign.id}`}
                            className={`text-sm cursor-pointer ${campaign.status !== "Active" ? "text-muted-foreground" : ""}`}
                          >
                            {campaign.name}
                          </Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {campaign.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {campaign.duration}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${campaign.status === "Active" ? "text-green-600" : "text-red-600"}`}
                            >
                              {campaign.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {formData.selectedCampaigns.length} of {availableCampaigns.filter(c => c.status === "Active").length} active campaigns selected
                  </div>
                </div>

                {/* Summary */}
                {(formData.selectedPromotions.length > 0 || formData.selectedCampaigns.length > 0) && (
                  <div className="bg-muted/30 rounded-md p-3">
                    <Label className="text-sm font-medium">Selected Marketing Elements:</Label>
                    <div className="mt-2 space-y-1">
                      {formData.selectedPromotions.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium text-green-600">Promotions:</span> {formData.selectedPromotions.length} selected
                        </div>
                      )}
                      {formData.selectedCampaigns.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium text-purple-600">Campaigns:</span> {formData.selectedCampaigns.length} selected
                        </div>
                      )}
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
                      <span className="text-xs text-muted-foreground ml-2">(AED per day)</span>
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
                      <span className="ml-2 font-medium text-[#E63946]">AED {formData.chargePerExtraDay || "0"}</span>
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
    </div>
  );
}
