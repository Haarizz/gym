import React, { useEffect, useState, useMemo } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import {
  Search,
  Plus,
  User,
  Calendar,
  DollarSign,
  Package,
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle,
  ArrowLeft,
  Download,
  Filter,
  Clock,
  FileText,
  Settings,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { FaCircleCheck, FaStar } from "react-icons/fa6";
import {
  HiOutlineBolt,
  HiOutlineClock,
  HiOutlineCube,
  HiOutlineHeart,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineSquares2X2,
  HiOutlineUserCircle,
  HiOutlineUserGroup,
  HiOutlineSparkles,
  HiMiniCheckCircle,
  HiMiniExclamationTriangle,
} from "react-icons/hi2";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { toast } from "sonner";
import { referralService, ReferralResponse } from "../utils/supabase/referral-service";
import { walletService } from "../utils/supabase/reward-service";
import { membersService, Member as ApiMember } from "../utils/supabase/members-service";
import { addonsService, MemberAddon } from "../utils/supabase/addons-service";
import { addonPlansService, AddonPlan as ApiAddonPlan } from "../utils/supabase/addon-plans-service";
import { accountHeadsService, AccountHead } from "../utils/supabase/account-heads-service";
import {
  EMPTY_SPLIT_DETAILS, EMPTY_SPLIT_PAYMENT, isSplitPaymentDetailsValid, buildSplitPaymentBreakdown,
  CARD_TYPE_OPTIONS, ONLINE_PAYMENT_TYPE_OPTIONS
} from "../components/shared/split-payment-fields";
import type { SplitPaymentValue, SplitPaymentDetails } from "../components/shared/split-payment-fields";

// Maps this page's Payment Method select value to the SplitPaymentValue key
// so Card/UPI/Bank Transfer's method-specific details can be validated/built
// by reusing the same helpers Mixed Payment legs use elsewhere in the app.
// "UPI" is this page's Online Payment equivalent.
const ADDON_METHOD_TO_LEG_KEY: Partial<Record<string, keyof SplitPaymentValue>> = {
  Cash: 'cash', Card: 'card', UPI: 'online', 'Bank Transfer': 'bankTransfer'
};

interface MemberAddonsProps {
  onNavigate?: (section: string) => void;
  embedded?: boolean;
}

interface Member {
  id: string;
  name: string;
  membershipId: string;
  currentPlan: string;
  validTill: Date;
  status: "Active" | "Expired" | "Frozen";
  email: string;
  phone: string;
  // Family billing: true for any minor (or a billed_to_head adult) — their
  // charges are folded into their family head's account instead of their own.
  billedToHead: boolean;
  familyHeadName?: string;
}

function toLocalMember(m: ApiMember): Member {
  return {
    id: m.id,
    name: m.name,
    membershipId: m.member_id || m.id,
    currentPlan: m.membership_plan || m.membership_type || "—",
    validTill: m.membership_end_date ? new Date(m.membership_end_date) : new Date(),
    status: m.membership_status === "active" ? "Active" : m.membership_status === "frozen" ? "Frozen" : "Expired",
    email: m.email,
    phone: m.phone,
    billedToHead: Boolean((m as any).is_minor || (m as any).billed_to_head),
    familyHeadName: (m as any).family_head_name || (m as any).family_head_id || undefined,
  };
}

// Same shape as the AddonPlan the backend catalog returns — kept as a local
// alias since this file only ever deals with it in this shape.
type Addon = ApiAddonPlan;

const getCategoryIcon = (category: string) => {
  const baseClass = "text-white block shrink-0";
  switch (category) {
    case "Training":  return <HiOutlineBolt size={16} className={baseClass} />;
    case "Nutrition": return <HiOutlineSparkles size={16} className={baseClass} />;
    case "Classes":   return <HiOutlineUserGroup size={16} className={baseClass} />;
    case "Spa":       return <HiOutlineHeart size={16} className={baseClass} />;
    default:          return <HiOutlineCube size={16} className={baseClass} />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Training":  return "from-blue-500 to-blue-600";
    case "Nutrition": return "from-green-500 to-emerald-600";
    case "Classes":   return "from-purple-500 to-violet-600";
    case "Spa":       return "from-pink-500 to-rose-600";
    default:          return "from-gray-500 to-gray-600";
  }
};

// Use the MemberAddon type from the API service directly

const EMPTY_PLAN_FORM = {
  name: "",
  description: "",
  price: 0,
  validity: 30,
  category: "Training" as Addon["category"],
};


export function MemberAddons({ onNavigate, embedded }: MemberAddonsProps) {
  const { currencyCode } = useCurrency();
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<ApiMember[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [addonSearchQuery, setAddonSearchQuery] = useState("");
  const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState<MemberAddon[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [methodDetails, setMethodDetails] = useState<SplitPaymentDetails>(EMPTY_SPLIT_DETAILS);
  const [bankAccounts, setBankAccounts] = useState<AccountHead[]>([]);
  useEffect(() => {
    accountHeadsService.getBankAccounts()
      .then(setBankAccounts)
      .catch(err => console.error('Failed to load bank accounts:', err));
  }, []);
  const [notes, setNotes] = useState("");
  const [customValidity, setCustomValidity] = useState<number>(30);
  const [customAmount, setCustomAmount] = useState<number>(0);
  // Only used when the selected member is billed to a family head — how much
  // is being collected right now; any remainder becomes a due on the head's
  // account instead of the member's own. Defaults to the full amount (fully
  // paid), matching this page's existing "always paid" behavior for members
  // who carry their own balance.
  const [minorPaidNow, setMinorPaidNow] = useState<string>("");
  const [transactionSearchQuery, setTransactionSearchQuery] = useState("");
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<string>("all");
  const [lastCreatedAddon, setLastCreatedAddon] = useState<MemberAddon | null>(null);

  // Add-on plan catalog — admin-editable, replacing what used to be a
  // hardcoded array. addonPlans holds every plan (incl. inactive ones, shown
  // in the Manage dialog); the purchase picker only ever offers active ones.
  const [addonPlans, setAddonPlans] = useState<Addon[]>([]);
  const [addonPlansLoading, setAddonPlansLoading] = useState(true);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Addon | null>(null);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN_FORM);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const loadAddonPlans = () => {
    setAddonPlansLoading(true);
    addonPlansService.getAll()
      .then(setAddonPlans)
      .catch(() => toast.error("Failed to load add-on plans"))
      .finally(() => setAddonPlansLoading(false));
  };

  useEffect(() => { loadAddonPlans(); }, []);

  const handleOpenManageModal = () => {
    setEditingPlan(null);
    setIsAddingPlan(false);
    setPlanForm(EMPTY_PLAN_FORM);
    setIsManageModalOpen(true);
  };

  const handleStartAddPlan = () => {
    setEditingPlan(null);
    setPlanForm(EMPTY_PLAN_FORM);
    setIsAddingPlan(true);
  };

  const handleStartEditPlan = (plan: Addon) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      validity: plan.validity,
      category: plan.category,
    });
    setIsAddingPlan(true);
  };

  const handleCancelPlanForm = () => {
    setIsAddingPlan(false);
    setEditingPlan(null);
    setPlanForm(EMPTY_PLAN_FORM);
  };

  const handleSavePlan = async () => {
    if (!planForm.name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    if (planForm.price <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }
    if (planForm.validity <= 0) {
      toast.error("Validity must be greater than 0 days");
      return;
    }
    setIsSavingPlan(true);
    try {
      if (editingPlan) {
        await addonPlansService.update(editingPlan.id, planForm);
        toast.success("Add-on plan updated");
      } else {
        await addonPlansService.create(planForm);
        toast.success("Add-on plan created");
      }
      handleCancelPlanForm();
      loadAddonPlans();
    } catch {
      toast.error(editingPlan ? "Failed to update plan" : "Failed to create plan");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDeletePlan = async (plan: Addon) => {
    if (!window.confirm(`Delete "${plan.name}"? This cannot be undone.`)) return;
    try {
      await addonPlansService.delete(plan.id);
      toast.success("Add-on plan deleted");
      loadAddonPlans();
    } catch {
      toast.error("Failed to delete plan");
    }
  };

  const handleTogglePlanActive = async (plan: Addon) => {
    try {
      await addonPlansService.toggleActive(plan.id);
      loadAddonPlans();
    } catch {
      toast.error("Failed to update plan status");
    }
  };

  // Reward Redemption — the referrer's unredeemed reward from a successful
  // referral (real backend: ReferralRewardRule/Referral), offered as a
  // discount on this add-on purchase.
  const [availableReward, setAvailableReward] = useState<ReferralResponse | null>(null);
  const [rewardApplied, setRewardApplied] = useState(false);

  // Wallet — reward wallet credit balance the member can apply toward this
  // purchase (see reward-service.tsx / WalletController).
  const [memberWalletBalance, setMemberWalletBalance] = useState(0);
  const [walletAmountApplied, setWalletAmountApplied] = useState(0);

  // Load transactions from API on mount
  useEffect(() => {
    const load = async () => {
      try {
        setTransactionsLoading(true);
        const res = await addonsService.getAddons({}, { limit: 500 });
        setTransactions(res.addons);
      } catch {
        toast.error("Failed to load add-on transactions");
      } finally {
        setTransactionsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (isPurchaseModalOpen) {
      document.body.classList.add("overflow-hidden");
      return () => {
        document.body.classList.remove("overflow-hidden");
      };
    }
  }, [isPurchaseModalOpen]);

  const handleMemberSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await membersService.searchMembers(searchQuery);
      if (results.length > 0) {
        const found = toLocalMember(results[0]);
        setSelectedMember(found);
        setSearchSuggestions([]);
        setShowSuggestions(false);
        toast.success(`Member ${found.name} found!`);
      } else {
        toast.error("Member not found. Please check ID or name.");
      }
    } catch {
      toast.error("Search failed. Please try again.");
    }
  };

  // Live search-as-you-type — mirrors the suggestions pattern in members.tsx (Renewals tab)
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length > 1) {
      membersService.searchMembers(value)
        .then(results => {
          setSearchSuggestions(results.slice(0, 6));
          setShowSuggestions(results.length > 0);
        })
        .catch(() => setSearchSuggestions([]));
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectMemberFromSuggestions = (member: ApiMember) => {
    setSelectedMember(toLocalMember(member));
    setSearchQuery(member.name);
    setSearchSuggestions([]);
    setShowSuggestions(false);
  };

  const filteredAddons = useMemo(() => {
    let active = addonPlans.filter((addon) => addon.isActive);
    if (filterCategory !== "all") {
      active = active.filter((addon) => addon.category === filterCategory);
    }
    if (addonSearchQuery.trim()) {
      const q = addonSearchQuery.trim().toLowerCase();
      active = active.filter((addon) =>
        addon.name.toLowerCase().includes(q) || addon.description.toLowerCase().includes(q)
      );
    }
    return active;
  }, [addonPlans, filterCategory, addonSearchQuery]);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (transactionSearchQuery) {
      const q = transactionSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (txn) =>
          txn.member_name?.toLowerCase().includes(q) ||
          txn.member_id?.toLowerCase().includes(q) ||
          txn.addon_name?.toLowerCase().includes(q) ||
          txn.transaction_id?.toLowerCase().includes(q)
      );
    }

    if (transactionStatusFilter !== "all") {
      filtered = filtered.filter((txn) => txn.status === transactionStatusFilter);
    }

    return filtered.sort((a, b) => {
      const da = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
      const db = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
      return db - da;
    });
  }, [transactions, transactionSearchQuery, transactionStatusFilter]);

  const getDaysUntilExpiry = (date: Date) => {
    const today = new Date();
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handlePurchaseClick = (addon: Addon) => {
    if (!selectedMember) {
      toast.error("Please select a member first");
      return;
    }
    setSelectedAddon(addon);
    setCustomValidity(addon.validity);
    setCustomAmount(addon.price);
    setMinorPaidNow(String(addon.price));
    setRewardApplied(false);
    setAvailableReward(null);
    setWalletAmountApplied(0);
    setMemberWalletBalance(0);
    referralService.getUnredeemedReward(selectedMember.membershipId)
      .then(setAvailableReward)
      .catch(() => {}); // no reward to offer — not a purchase-blocking failure
    walletService.getWallet(selectedMember.membershipId)
      .then(w => setMemberWalletBalance(w.balance))
      .catch(() => {}); // no wallet / not fetchable — not a purchase-blocking failure
    setIsPurchaseDialogOpen(true);
  };

  const handleApplyReward = () => {
    setRewardApplied(true);
  };

  const handleApplyWallet = () => {
    if (!memberWalletBalance) return;
    const remainingBeforeWallet = Math.max(0, customAmount - (rewardApplied && availableReward ? availableReward.rewardAmount : 0));
    const amount = Math.min(memberWalletBalance, remainingBeforeWallet);
    setWalletAmountApplied(amount);
  };

  const calculateNewExpiry = () => {
    if (!selectedMember || !customValidity) return null;
    
    const today = new Date();
    const memberExpiry = new Date(selectedMember.validTill);
    const addonExpiry = new Date(today);
    addonExpiry.setDate(addonExpiry.getDate() + customValidity);
    
    return addonExpiry > memberExpiry ? addonExpiry : memberExpiry;
  };

  const handleConfirmPurchase = async () => {
    if (!selectedMember || !selectedAddon || customAmount === undefined || customAmount < 0) return;

    const amountToPay = Math.max(0, customAmount - (rewardApplied && availableReward ? availableReward.rewardAmount : 0) - walletAmountApplied);

    const billedToHead = selectedMember.billedToHead;
    // A billed-to-head member's fee may be left partially or fully unpaid
    // now — the remainder becomes a due on their family head's account
    // instead of theirs. Any other member's add-on is always fully paid,
    // same as before.
    const paidNowAmount = billedToHead
      ? Math.max(0, Math.min(amountToPay, parseFloat(minorPaidNow || "0") || 0))
      : amountToPay;

    const legKey = ADDON_METHOD_TO_LEG_KEY[paymentMethod];
    if (paidNowAmount > 0 && legKey && legKey !== 'cash') {
      const probe: SplitPaymentValue = { ...EMPTY_SPLIT_PAYMENT, [legKey]: paidNowAmount };
      if (!isSplitPaymentDetailsValid(probe, methodDetails)) {
        toast.error(`Please fill in the required ${paymentMethod} details`);
        return;
      }
    }

    const newExpiry = calculateNewExpiry();
    const startDate = new Date();

    try {
      setIsSubmitting(true);
      const paymentBreakdown = paidNowAmount > 0 && legKey && legKey !== 'cash'
        ? buildSplitPaymentBreakdown({ ...EMPTY_SPLIT_PAYMENT, [legKey]: paidNowAmount }, methodDetails, bankAccounts)
        : undefined;
        
      let paymentModeToSend = paymentMethod;
      if (amountToPay === 0) {
        if (walletAmountApplied > 0) paymentModeToSend = "Wallet";
        else if (rewardApplied) paymentModeToSend = "Reward";
      } else if (billedToHead && paidNowAmount <= 0) {
        paymentModeToSend = "Credit";
      }
      const created = await addonsService.createAddon({
        member_db_id: Number(selectedMember.id),
        member_id: selectedMember.membershipId,
        member_name: selectedMember.name,
        addon_name: selectedAddon.name,
        addon_description: selectedAddon.description,
        category: selectedAddon.category,
        amount: customAmount,
        payment_mode: paymentModeToSend,
        start_date: startDate.toISOString(),
        expiry_date: (newExpiry || startDate).toISOString(),
        notes: notes || undefined,
        payment_breakdown: paymentBreakdown,
        paid_amount: billedToHead ? paidNowAmount : undefined,
      });
      if (rewardApplied && availableReward) {
        // Best-effort: the add-on purchase already succeeded, so a failure here
        // (e.g. someone else redeemed it a moment earlier) shouldn't undo it.
        referralService.redeemReward(availableReward.id).catch(() => {});
      }
      if (walletAmountApplied > 0) {
        walletService.debit(
          selectedMember.membershipId, walletAmountApplied, 'BILLING_USE', Number(created.id),
          `Applied to add-on purchase ${created.transaction_id}`
        ).catch(() => {});
      }
      setTransactions(prev => [created, ...prev]);
      setLastCreatedAddon(created);
      setIsPurchaseDialogOpen(false);
      setIsSuccessDialogOpen(true);
      setAvailableReward(null);
      setRewardApplied(false);
      setNotes("");
      setPaymentMethod("Cash");
      setMethodDetails(EMPTY_SPLIT_DETAILS);
      setMinorPaidNow("");
    } catch {
      toast.error("Failed to save add-on purchase. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setIsSuccessDialogOpen(false);
    setIsPurchaseModalOpen(false);
    setSelectedMember(null);
    setSearchQuery("");
    toast.success("Receipt sent via WhatsApp/SMS");
  };

  const handleOpenPurchaseModal = () => {
    setSelectedMember(null);
    setSearchQuery("");
    setFilterCategory("all");
    setIsPurchaseModalOpen(true);
  };

  const totalRevenue = transactions
    .filter((txn) => txn.status !== "Cancelled")
    .reduce((sum, txn) => sum + Number(txn.amount || 0), 0);

  const activeAddons = transactions.filter((txn) => txn.status === "Active").length;

  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      <div className={embedded ? "" : "border-b bg-white"}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">
                    Member Add-ons
                  </h1>
                  <p className="text-muted-foreground">
                    View transactions and purchase additional services
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleOpenManageModal}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Add-on Plans
              </Button>
              <Button onClick={handleOpenPurchaseModal}>
                <Plus className="mr-2 h-4 w-4" />
                Purchase An Add-On
              </Button>
              {!embedded && (
                <Button
                  variant="outline"
                  onClick={() => onNavigate && onNavigate("members")}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Members
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
                <div className="p-2 rounded-lg bg-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{transactions.length}</p>
                <p className="text-xs text-muted-foreground mt-1">All time add-on purchases</p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Add-ons</CardTitle>
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{activeAddons}</p>
                <p className="text-xs text-muted-foreground mt-1">Currently active services</p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                <div className="p-2 rounded-lg bg-purple-100">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold"><CurrencyGlyph /> {totalRevenue}</p>
                <p className="text-xs text-muted-foreground mt-1">From add-on sales</p>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      <div className="p-6">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Recent Add-on Transactions
                <Badge variant="secondary" className="ml-1">
                  {filteredTransactions.length}
                </Badge>
              </CardTitle>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by Transaction ID, Member Name, or Add-on..."
                  value={transactionSearchQuery}
                  onChange={(e) => setTransactionSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={transactionStatusFilter} onValueChange={setTransactionStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Add-on Name</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Amount ({currencyCode})</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Loading transactions...
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((txn, index) => (
                      <TableRow
                        key={txn.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                        <TableCell className="font-medium">{txn.transaction_id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{txn.member_name}</p>
                            <p className="text-xs text-muted-foreground">{txn.member_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>{txn.addon_name}</TableCell>
                        <TableCell>
                          {txn.purchase_date
                            ? new Date(txn.purchase_date).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {txn.expiry_date
                            ? new Date(txn.expiry_date).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="font-medium">{Number(txn.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{txn.payment_mode}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              txn.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : txn.status === "Expired"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {txn.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Add-on Modal */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="w-[96vw] max-w-[1100px] sm:max-w-[1100px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="px-6 pt-6 pb-4 border-b bg-white/95 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary shadow-sm shrink-0">
                <HiOutlineSquares2X2 size={20} className="text-white block shrink-0" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight">Purchase An Add-On</h2>
                <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Search a member and select a service to add</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-6 px-6 py-7">
            {/* Step 1 */}
            <div className="rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 to-blue-400" />
              <div className="px-6 py-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">1</div>
                  <div>
                    <p className="text-sm font-semibold">Search Member</p>
                    <p className="text-[11px] text-muted-foreground">Find by Member ID, name or phone</p>
                  </div>
                </div>
                <div className="flex gap-2 relative">
                  <div className="relative flex-1">
                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 shrink-0" />
                    <Input
                      placeholder="Search by Member ID, Name, or Phone"
                      value={searchQuery}
                      onChange={(e) => handleSearchInputChange(e.target.value)}
                      onFocus={() => { if (searchSuggestions.length > 0) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onKeyDown={(e) => e.key === "Enter" && handleMemberSearch()}
                      className="pl-10"
                    />
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 rounded-xl border-2 border-border bg-white shadow-xl overflow-hidden">
                        {searchSuggestions.map((member) => (
                          <div
                            key={member.id}
                            onMouseDown={() => selectMemberFromSuggestions(member)}
                            className="px-4 py-2.5 hover:bg-slate-50/50 cursor-pointer transition-colors border-b border-border last:border-b-0"
                          >
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {member.member_id || member.id} • {member.phone}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button onClick={handleMemberSearch} className="shrink-0">
                    Search
                  </Button>
                </div>
              </div>

              {selectedMember && (
                <div className="mx-6 mb-4 rounded-xl border border-blue-200 bg-blue-50/40 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm shrink-0">
                        <HiOutlineUserCircle size={20} className="text-white block shrink-0" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{selectedMember.name}</p>
                        <p className="text-[11px] text-muted-foreground">ID: {selectedMember.membershipId}</p>
                      </div>
                    </div>
                    <Badge className={selectedMember.status === "Active" ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-700"}>
                      <span className="flex items-center gap-1.5">
                        {selectedMember.status === "Active" && <HiMiniCheckCircle size={12} className="text-green-500 block shrink-0" />}
                        {selectedMember.status}
                      </span>
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-px bg-blue-100">
                    <div className="bg-blue-50/60 px-4 py-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Current Plan</p>
                      <p className="text-xs font-semibold">{selectedMember.currentPlan}</p>
                    </div>
                    <div className="bg-blue-50/60 px-4 py-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Valid Till</p>
                      <p className={`text-xs font-semibold ${getDaysUntilExpiry(selectedMember.validTill) < 10 ? "text-red-600" : ""}`}>
                        {selectedMember.validTill.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                      {getDaysUntilExpiry(selectedMember.validTill) < 10 && (
                        <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                          <HiMiniExclamationTriangle size={14} className="block shrink-0" /> Expires soon
                        </p>
                      )}
                    </div>
                    <div className="bg-blue-50/60 px-4 py-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Contact</p>
                      <p className="text-xs font-semibold">{selectedMember.phone}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="h-0.5 w-full bg-gradient-to-r from-purple-500 to-violet-400" />
              <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold shrink-0">2</div>
                    <div>
                      <p className="text-sm font-semibold">Select Add-on</p>
                      <p className="text-[11px] text-muted-foreground">Choose a service to purchase for the member</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                      <Input
                        placeholder="Search add-ons..."
                        value={addonSearchQuery}
                        onChange={(e) => setAddonSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs w-[180px]"
                      />
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Training">Personal Training</SelectItem>
                        <SelectItem value="Nutrition">Nutrition</SelectItem>
                        <SelectItem value="Classes">Group Classes</SelectItem>
                        <SelectItem value="Spa">Spa & Recovery</SelectItem>
                        <SelectItem value="Other">Other Services</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredAddons.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No add-ons match "{addonSearchQuery}".
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredAddons.map((addon) => (
                    <div
                      key={addon.id}
                      className="rounded-xl border border-border bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col h-full"
                    >
                      <div className={`h-0.5 w-full bg-gradient-to-r ${getCategoryColor(addon.category)}`} />
                      <div className="p-4 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br ${getCategoryColor(addon.category)} shadow-sm shrink-0`}>
                            <span className="flex items-center justify-center">{getCategoryIcon(addon.category)}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">{addon.category}</Badge>
                        </div>
                        <p className="text-sm font-semibold leading-snug mb-1">{addon.name}</p>
                        <p className="text-[11px] text-muted-foreground mb-3">{addon.description}</p>
                        <div className="mt-auto">
                          <div className="flex items-center justify-between mb-3 pt-2 border-t">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <HiOutlineClock className="h-4 w-4 shrink-0" />
                            {addon.validity} days
                          </div>
                          <span className="text-sm font-bold text-primary"><CurrencyGlyph /> {addon.price}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handlePurchaseClick(addon)}
                          className="w-full h-8 text-xs gap-1.5"
                          disabled={!selectedMember}
                        >
                          <HiOutlinePlus className="h-4 w-4 shrink-0" />
                          Add to Member
                        </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-slate-50/60 flex justify-end shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsPurchaseModalOpen(false);
                setSelectedMember(null);
                setSearchQuery("");
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent className="max-w-lg p-0">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              {selectedAddon && (
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${getCategoryColor(selectedAddon.category)} shadow-sm shrink-0`}>
                  {getCategoryIcon(selectedAddon.category)}
                </div>
              )}
              <div>
                <h2 className="text-sm font-bold">Confirm Purchase</h2>
                <p className="text-[11px] text-muted-foreground leading-none mt-0.5">for {selectedMember?.name}</p>
              </div>
            </div>
          </div>

          {selectedAddon && (
            <div className="space-y-4 px-6 py-5">
              {/* Addon summary */}
              <div className="rounded-xl border bg-muted/30 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Add-on</p>
                  <p className="text-sm font-semibold">{selectedAddon.name}</p>
                </div>
                <Badge variant="secondary" className="text-[11px]">{selectedAddon.category}</Badge>
              </div>

              {/* Validity + Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="validity" className="text-xs font-medium">Validity (Days)</Label>
                  <Input
                    id="validity"
                    type="number"
                    value={customValidity}
                    onChange={(e) => setCustomValidity(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Till: {calculateNewExpiry()?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-xs font-medium">Amount ({currencyCode})</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(Number(e.target.value));
                      setWalletAmountApplied(0); // reset on manual change
                      setRewardApplied(false);
                    }}
                  />
                </div>
              </div>

              {/* Referral reward available for this member */}
              {availableReward && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-emerald-900">
                      Referral reward available: {currencyCode} {availableReward.rewardAmount}
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      {rewardApplied ? "Applied to this purchase." : `From referring ${availableReward.refereeName}.`}
                    </p>
                  </div>
                  {!rewardApplied && customAmount > 0 && (
                    <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-800 hover:bg-emerald-100" onClick={handleApplyReward}>
                      Apply
                    </Button>
                  )}
                </div>
              )}

              {/* Wallet balance available for this member */}
              {memberWalletBalance > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-blue-900">
                      Wallet balance available: {currencyCode} {memberWalletBalance}
                    </p>
                    <p className="text-[11px] text-blue-800">
                      {walletAmountApplied > 0 ? `${currencyCode} ${walletAmountApplied} applied to this purchase.` : "Use it toward this purchase."}
                    </p>
                  </div>
                  {walletAmountApplied === 0 && customAmount - (rewardApplied && availableReward ? availableReward.rewardAmount : 0) > 0 && (
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-800 hover:bg-blue-100" onClick={handleApplyWallet}>
                      Use Wallet
                    </Button>
                  )}
                </div>
              )}

              {/* Outstanding Amount to Pay */}
              {customAmount > 0 && (rewardApplied || walletAmountApplied > 0) && (
                <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border rounded-xl">
                  <span className="text-sm font-medium">Balance to Pay</span>
                  <span className="text-sm font-bold text-primary">
                    {currencyCode} {Math.max(0, customAmount - (rewardApplied && availableReward ? availableReward.rewardAmount : 0) - walletAmountApplied).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Family billing notice + partial payment, only for a member billed to a family head */}
              {selectedMember?.billedToHead && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
                  <div className="h-0.5 w-full bg-gradient-to-r from-amber-400 to-amber-600" />
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-[11px] text-amber-900">
                      <strong>{selectedMember.name}</strong> is billed to their family head — this charge
                      will be added to <strong>{selectedMember.familyHeadName || "their family head"}</strong>'s
                      account, not shown as a due on {selectedMember.name}.
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="minorPaidNow" className="text-xs font-medium">
                        Amount Received Now ({currencyCode}) <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <Input
                        id="minorPaidNow"
                        type="number"
                        min={0}
                        max={customAmount}
                        value={minorPaidNow}
                        onChange={(e) => setMinorPaidNow(e.target.value)}
                        placeholder="0.00"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Leave less than the full amount to bill the remainder as a due to{" "}
                        {selectedMember.familyHeadName || "the family head"}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label htmlFor="payment" className="text-xs font-medium">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => { setPaymentMethod(v); setMethodDetails(EMPTY_SPLIT_DETAILS); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">
                      <div className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Cash</div>
                    </SelectItem>
                    <SelectItem value="Card">
                      <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Card</div>
                    </SelectItem>
                    <SelectItem value="UPI">
                      <div className="flex items-center gap-2"><Smartphone className="h-4 w-4" />UPI / QR</div>
                    </SelectItem>
                    <SelectItem value="Bank Transfer">
                      <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />Bank Transfer</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'Card' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Card Type <span className="text-red-500">*</span></Label>
                  <Select value={methodDetails.cardType || undefined} onValueChange={(v) => setMethodDetails(d => ({ ...d, cardType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select card type" /></SelectTrigger>
                    <SelectContent>
                      {CARD_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {paymentMethod === 'UPI' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Payment Type <span className="text-red-500">*</span></Label>
                    <Select value={methodDetails.onlinePaymentType || undefined} onValueChange={(v) => setMethodDetails(d => ({ ...d, onlinePaymentType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {ONLINE_PAYMENT_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Reference ID <span className="text-red-500">*</span></Label>
                    <Input
                      value={methodDetails.onlineReference}
                      onChange={(e) => setMethodDetails(d => ({ ...d, onlineReference: e.target.value }))}
                      placeholder="Transaction ID"
                    />
                  </div>
                  {methodDetails.onlinePaymentType === 'Other' && (
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs font-medium">Payment Provider Name <span className="text-red-500">*</span></Label>
                      <Input
                        value={methodDetails.onlineProviderName}
                        onChange={(e) => setMethodDetails(d => ({ ...d, onlineProviderName: e.target.value }))}
                        placeholder="Provider name"
                      />
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'Bank Transfer' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Bank Account (Ledger)</Label>
                  <Select value={methodDetails.bankTransferAccountId || undefined} onValueChange={(v) => setMethodDetails(d => ({ ...d, bankTransferAccountId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={bankAccounts.length ? 'Select bank account' : 'No bank accounts in ledger'} />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(account => (
                        <SelectItem key={account.id} value={String(account.id)}>{account.code} — {account.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-medium">Notes <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes here..."
                  rows={2}
                />
              </div>

              {/* Membership update */}
              {selectedMember && calculateNewExpiry() && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 overflow-hidden">
                  <div className="h-0.5 w-full bg-gradient-to-r from-blue-400 to-blue-600" />
                  <div className="px-4 py-3">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-2">Membership Update</p>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Current Expiry</span>
                      <span className="font-medium">{selectedMember.validTill.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground text-xs">New Expiry</span>
                      <span className="font-bold text-blue-700">{calculateNewExpiry()?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="px-6 py-4 border-t bg-slate-50/60 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPurchaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPurchase} disabled={isSubmitting} className="gap-2">
              <span className="inline-flex items-center justify-center w-4 h-4 shrink-0">
                <FaCircleCheck className="w-4 h-4" />
              </span>
              {isSubmitting ? "Saving..." : "Confirm Purchase"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="max-w-sm p-0">
          {/* Success header */}
          <div className="flex flex-col items-center text-center px-8 pt-10 pb-7 border-b">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-md mb-4">
              <FaCircleCheck size={26} className="text-white" />
            </div>
            <h2 className="text-base font-bold">Add-on Purchased!</h2>
            <p className="text-xs text-muted-foreground mt-1">Successfully added for <span className="font-medium text-foreground">{selectedMember?.name}</span></p>
          </div>

          {/* Receipt summary */}
          <div className="px-8 py-6 space-y-2">
            {[
              { label: "Add-on", value: selectedAddon?.name },
              { label: "Amount", value: `${currencyCode} ${customAmount}` },
              ...(selectedMember?.billedToHead
                ? [{ label: "Billed To", value: selectedMember.familyHeadName || "Family Head" }]
                : [{ label: "Payment", value: paymentMethod }]),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-2 border-t mt-2">
              <span className="text-muted-foreground">New Expiry</span>
              <span className="font-semibold text-green-600">
                {calculateNewExpiry()?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Congrats note */}
          <div className="mx-8 mb-7 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-2.5">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mt-0.5">
              <FaStar size={12} className="text-blue-600" />
            </div>
            <p className="text-xs text-blue-900">
              <strong>Congratulations {selectedMember?.name}!</strong> {selectedAddon?.name} has been added. Valid till{" "}
              {calculateNewExpiry()?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}.
            </p>
          </div>

          <div className="px-8 py-6 border-t bg-slate-50/60 flex gap-2">
            <Button variant="outline" className="flex-1 gap-2 text-xs h-9">
              <Download className="h-3.5 w-3.5" />
              Download Receipt
            </Button>
            <Button onClick={handleSuccessClose} className="flex-1 h-9 text-xs">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Add-on Plans Modal */}
      <Dialog open={isManageModalOpen} onOpenChange={(open) => { setIsManageModalOpen(open); if (!open) handleCancelPlanForm(); }}>
        <DialogContent className="w-[96vw] max-w-[900px] sm:max-w-[900px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <div className="pl-6 pr-14 pt-6 pb-5 border-b bg-white/95 backdrop-blur-sm shrink-0">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-3.5">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary shadow-sm shrink-0">
                  <Settings size={21} className="text-white block shrink-0" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight leading-tight">Manage Add-on Plans</h2>
                  <p className="text-xs text-muted-foreground mt-1">Create, edit, or remove services offered in the catalog</p>
                </div>
              </div>
              {!isAddingPlan && (
                <Button size="sm" className="shrink-0" onClick={handleStartAddPlan}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  New Plan
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6 space-y-5">
            {isAddingPlan && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{editingPlan ? "Edit Plan" : "New Plan"}</p>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCancelPlanForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs">Plan Name</Label>
                    <Input
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      placeholder="e.g. Personal Training – 15 Sessions"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={planForm.description}
                      onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                      placeholder="Short description shown to staff when purchasing"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={planForm.category}
                      onValueChange={(v) => setPlanForm({ ...planForm, category: v as Addon["category"] })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Training">Training</SelectItem>
                        <SelectItem value="Nutrition">Nutrition</SelectItem>
                        <SelectItem value="Classes">Classes</SelectItem>
                        <SelectItem value="Spa">Spa</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Validity (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={planForm.validity}
                      onChange={(e) => setPlanForm({ ...planForm, validity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Price ({currencyCode})</Label>
                    <Input
                      type="number"
                      min={0}
                      value={planForm.price}
                      onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={handleCancelPlanForm}>Cancel</Button>
                  <Button size="sm" onClick={handleSavePlan} disabled={isSavingPlan}>
                    {isSavingPlan ? "Saving…" : editingPlan ? "Save Changes" : "Create Plan"}
                  </Button>
                </div>
              </div>
            )}

            {addonPlansLoading ? (
              <div className="text-center py-14 text-sm text-muted-foreground">Loading plans…</div>
            ) : addonPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-14 rounded-xl border border-dashed">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">No add-on plans yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click "New Plan" above to create your first one.</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addonPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{plan.name}</p>
                          <p className="text-xs text-muted-foreground">{plan.description}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{plan.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{plan.validity} days</TableCell>
                        <TableCell className="text-sm font-semibold"><CurrencyGlyph /> {plan.price}</TableCell>
                        <TableCell>
                          <button onClick={() => handleTogglePlanActive(plan)}>
                            <Badge className={plan.isActive ? "bg-green-100 text-green-800 cursor-pointer" : "bg-gray-100 text-gray-600 cursor-pointer"}>
                              {plan.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline" size="sm"
                              className="h-8 w-8 p-0 border-primary/20 hover:bg-blue-50"
                              title="Edit Plan"
                              onClick={() => handleStartEditPlan(plan)}
                            >
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="outline" size="sm"
                              className="h-8 w-8 p-0 border-primary/20 hover:bg-red-50"
                              title="Delete Plan"
                              onClick={() => handleDeletePlan(plan)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-slate-50/60 flex justify-end shrink-0">
            <Button variant="outline" onClick={() => setIsManageModalOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile FAB */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-all duration-300 md:hidden bg-gradient-to-r from-[#0047ab] to-[#00c5cb]"
        onClick={handleOpenPurchaseModal}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

