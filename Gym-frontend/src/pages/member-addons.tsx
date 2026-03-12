import React, { useState, useMemo } from "react";
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
  ShoppingCart,
  Clock,
  FileText,
} from "lucide-react";
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
import { 
  getNextRewardForMember, 
  getTotalUnredeemedAmount,
  applyRewardToTransaction,
  type ReferralReward
} from "../utils/referral-rewards";

interface MemberAddonsProps {
  onNavigate?: (section: string) => void;
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
}

interface Addon {
  id: string;
  name: string;
  description: string;
  price: number;
  validity: number;
  category: "Training" | "Nutrition" | "Spa" | "Classes" | "Other";
  icon: string;
}

interface AddonTransaction {
  id: string;
  memberId: string;
  memberName: string;
  addonName: string;
  startDate: Date;
  expiryDate: Date;
  amount: number;
  paymentMode: "Cash" | "Card" | "UPI" | "Bank Transfer";
  status: "Active" | "Expired" | "Cancelled";
  purchaseDate: Date;
}

const mockMembers: Member[] = [
  {
    id: "MB-1024",
    name: "John Mathew",
    membershipId: "MB-1024",
    currentPlan: "2-Month Membership",
    validTill: new Date("2025-10-25"),
    status: "Active",
    email: "john.mathew@example.com",
    phone: "+971 50 123 4567",
  },
  {
    id: "MB-1025",
    name: "Sarah Johnson",
    membershipId: "MB-1025",
    currentPlan: "3-Month Membership",
    validTill: new Date("2025-11-15"),
    status: "Active",
    email: "sarah.j@example.com",
    phone: "+971 50 234 5678",
  },
  {
    id: "MB-1026",
    name: "Ahmed Al-Mansoori",
    membershipId: "MB-1026",
    currentPlan: "Premium Annual",
    validTill: new Date("2026-03-20"),
    status: "Active",
    email: "ahmed.m@example.com",
    phone: "+971 55 345 6789",
  },
];

const availableAddons: Addon[] = [
  {
    id: "PT-15",
    name: "Personal Training – 15 Sessions",
    description: "One-on-one sessions with certified trainer",
    price: 450,
    validity: 30,
    category: "Training",
    icon: "🏋️‍♂️",
  },
  {
    id: "NP-30",
    name: "Nutrition Plan – 30 Days",
    description: "Customized meal plan and nutrition guidance",
    price: 200,
    validity: 30,
    category: "Nutrition",
    icon: "🥗",
  },
  {
    id: "PT-30",
    name: "Personal Training – 30 Sessions",
    description: "Extended personal training package",
    price: 850,
    validity: 60,
    category: "Training",
    icon: "🏋️‍♂️",
  },
  {
    id: "GC-20",
    name: "Group Classes – 20 Sessions",
    description: "Access to premium group fitness classes",
    price: 300,
    validity: 30,
    category: "Classes",
    icon: "👥",
  },
  {
    id: "SPA-10",
    name: "Spa & Recovery – 10 Sessions",
    description: "Massage therapy and recovery sessions",
    price: 500,
    validity: 45,
    category: "Spa",
    icon: "💆‍♂️",
  },
  {
    id: "PT-8",
    name: "Personal Training – 8 Sessions",
    description: "Starter personal training package",
    price: 280,
    validity: 20,
    category: "Training",
    icon: "🏋️‍♀️",
  },
  {
    id: "YOGA-20",
    name: "Yoga Classes – 20 Sessions",
    description: "Mind and body wellness through yoga",
    price: 320,
    validity: 30,
    category: "Classes",
    icon: "🧘‍♀️",
  },
  {
    id: "SWIM-10",
    name: "Swimming Lessons – 10 Sessions",
    description: "Professional swimming coaching",
    price: 400,
    validity: 30,
    category: "Classes",
    icon: "🏊‍♂️",
  },
];

const mockTransactions: AddonTransaction[] = [
  {
    id: "TXN-001",
    memberId: "MB-1024",
    memberName: "John Mathew",
    addonName: "Personal Training – 15 Sessions",
    startDate: new Date("2025-10-10"),
    expiryDate: new Date("2025-11-15"),
    amount: 450,
    paymentMode: "Cash",
    status: "Active",
    purchaseDate: new Date("2025-10-10"),
  },
  {
    id: "TXN-002",
    memberId: "MB-1025",
    memberName: "Sarah Johnson",
    addonName: "Nutrition Plan – 30 Days",
    startDate: new Date("2025-10-08"),
    expiryDate: new Date("2025-11-07"),
    amount: 200,
    paymentMode: "Card",
    status: "Active",
    purchaseDate: new Date("2025-10-08"),
  },
  {
    id: "TXN-003",
    memberId: "MB-1026",
    memberName: "Ahmed Al-Mansoori",
    addonName: "Group Classes – 20 Sessions",
    startDate: new Date("2025-10-05"),
    expiryDate: new Date("2025-11-04"),
    amount: 300,
    paymentMode: "UPI",
    status: "Active",
    purchaseDate: new Date("2025-10-05"),
  },
  {
    id: "TXN-004",
    memberId: "MB-1024",
    memberName: "John Mathew",
    addonName: "Nutrition Plan – 30 Days",
    startDate: new Date("2025-09-01"),
    expiryDate: new Date("2025-09-30"),
    amount: 200,
    paymentMode: "Cash",
    status: "Expired",
    purchaseDate: new Date("2025-09-01"),
  },
  {
    id: "TXN-005",
    memberId: "MB-1025",
    memberName: "Sarah Johnson",
    addonName: "Spa & Recovery – 10 Sessions",
    startDate: new Date("2025-10-12"),
    expiryDate: new Date("2025-11-26"),
    amount: 500,
    paymentMode: "Card",
    status: "Active",
    purchaseDate: new Date("2025-10-12"),
  },
];

export function MemberAddons({ onNavigate }: MemberAddonsProps) {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState<AddonTransaction[]>(mockTransactions);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [notes, setNotes] = useState("");
  const [customValidity, setCustomValidity] = useState<number>(30);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [transactionSearchQuery, setTransactionSearchQuery] = useState("");
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<string>("all");
  
  // Reward Redemption States
  const [availableReward, setAvailableReward] = useState<ReferralReward | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardApplied, setRewardApplied] = useState(false);
  const [finalAmountAfterReward, setFinalAmountAfterReward] = useState<number>(0);

  const handleMemberSearch = () => {
    const found = mockMembers.find(
      (m) =>
        m.membershipId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone.includes(searchQuery)
    );
    
    if (found) {
      setSelectedMember(found);
      toast.success(`Member ${found.name} found!`);
    } else {
      toast.error("Member not found. Please check ID or name.");
    }
  };

  const filteredAddons = useMemo(() => {
    if (filterCategory === "all") return availableAddons;
    return availableAddons.filter((addon) => addon.category === filterCategory);
  }, [filterCategory]);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    if (transactionSearchQuery) {
      filtered = filtered.filter(
        (txn) =>
          txn.memberName.toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
          txn.memberId.toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
          txn.addonName.toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
          txn.id.toLowerCase().includes(transactionSearchQuery.toLowerCase())
      );
    }
    
    if (transactionStatusFilter !== "all") {
      filtered = filtered.filter((txn) => txn.status === transactionStatusFilter);
    }
    
    return filtered.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());
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
    setIsPurchaseDialogOpen(true);
  };

  const calculateNewExpiry = () => {
    if (!selectedMember || !customValidity) return null;
    
    const today = new Date();
    const memberExpiry = new Date(selectedMember.validTill);
    const addonExpiry = new Date(today);
    addonExpiry.setDate(addonExpiry.getDate() + customValidity);
    
    return addonExpiry > memberExpiry ? addonExpiry : memberExpiry;
  };

  const handleConfirmPurchase = () => {
    if (!selectedMember || !selectedAddon || !customAmount) return;

    const newExpiry = calculateNewExpiry();
    const startDate = new Date();

    const newTransaction: AddonTransaction = {
      id: `TXN-${String(transactions.length + 1).padStart(3, "0")}`,
      memberId: selectedMember.membershipId,
      memberName: selectedMember.name,
      addonName: selectedAddon.name,
      startDate,
      expiryDate: newExpiry || new Date(),
      amount: customAmount,
      paymentMode: paymentMethod as any,
      status: "Active",
      purchaseDate: new Date(),
    };

    setTransactions([newTransaction, ...transactions]);

    if (newExpiry && newExpiry > selectedMember.validTill) {
      selectedMember.validTill = newExpiry;
    }

    setIsPurchaseDialogOpen(false);
    setIsSuccessDialogOpen(true);
    setNotes("");
    setPaymentMethod("Cash");
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
    .reduce((sum, txn) => sum + txn.amount, 0);

  const activeAddons = transactions.filter((txn) => txn.status === "Active").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-[#0047ab] to-[#00c5cb]">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl text-foreground">
                    Member Add-ons
                  </h1>
                  <p className="text-muted-foreground">
                    View transactions and purchase additional services
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleOpenPurchaseModal}
                className="gap-2 bg-gradient-to-r from-[#0047ab] to-[#00c5cb] text-white hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Purchase An Add-On
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigate && onNavigate("members")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Members
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-2xl mt-1">{transactions.length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-100">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Add-ons</p>
                    <p className="text-2xl mt-1">{activeAddons}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl mt-1">AED {totalRevenue}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-100">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by Transaction ID, Member Name, Member ID, or Add-on..."
                value={transactionSearchQuery}
                onChange={(e) => setTransactionSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={transactionStatusFilter} onValueChange={setTransactionStatusFilter}>
                <SelectTrigger className="w-full">
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
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl flex items-center gap-2 text-foreground">
            <Clock className="h-5 w-5 text-[#0047ab]" />
            Recent Add-on Transactions
            <Badge variant="secondary" className="ml-2">
              {filteredTransactions.length}
            </Badge>
          </h2>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Transaction ID</TableHead>
                    <TableHead className="font-semibold">Member</TableHead>
                    <TableHead className="font-semibold">Add-on Name</TableHead>
                    <TableHead className="font-semibold">Purchase Date</TableHead>
                    <TableHead className="font-semibold">Start Date</TableHead>
                    <TableHead className="font-semibold">Expiry Date</TableHead>
                    <TableHead className="font-semibold">Amount (AED)</TableHead>
                    <TableHead className="font-semibold">Payment Mode</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((txn) => (
                      <TableRow 
                        key={txn.id}
                        className={txn.status === "Active" ? "bg-green-50/50" : ""}
                      >
                        <TableCell className="font-medium">{txn.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{txn.memberName}</p>
                            <p className="text-sm text-muted-foreground">{txn.memberId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">{txn.addonName}</TableCell>
                        <TableCell>
                          {txn.purchaseDate.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          {txn.startDate.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          {txn.expiryDate.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="font-medium">{txn.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{txn.paymentMode}</Badge>
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Purchase An Add-On</DialogTitle>
            <DialogDescription>
              Search for a member and select an add-on to purchase
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <h3 className="text-lg mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-[#0047ab]" />
                Step 1: Search Member
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by Member ID, Name, or Phone"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleMemberSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    onClick={handleMemberSearch}
                    className="bg-gradient-to-r from-[#0047ab] to-[#00c5cb] text-white hover:opacity-90"
                  >
                    Search
                  </Button>
                </div>
              </div>
            </div>

            {selectedMember && (
              <Card className="shadow-lg border-2 border-[#0047ab]">
                <CardHeader className="bg-[#0047ab]/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-gradient-to-r from-[#0047ab] to-[#00c5cb]">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{selectedMember.name}</CardTitle>
                        <CardDescription className="text-base">
                          Member ID: {selectedMember.membershipId}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      className={
                        selectedMember.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {selectedMember.status} {selectedMember.status === "Active" && "🟢"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                      <p className="text-foreground font-medium">{selectedMember.currentPlan}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Valid Till</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#0047ab]" />
                        <p
                          className={
                            getDaysUntilExpiry(selectedMember.validTill) < 10
                              ? "text-red-600 font-medium"
                              : "text-foreground font-medium"
                          }
                        >
                          {selectedMember.validTill.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {getDaysUntilExpiry(selectedMember.validTill) < 10 && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ Expires in {getDaysUntilExpiry(selectedMember.validTill)} days
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Contact</p>
                      <p className="text-sm text-foreground font-medium">{selectedMember.phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#0047ab]" />
                  Step 2: Select Add-on
                </h3>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Category" />
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAddons.map((addon) => (
                  <Card
                    key={addon.id}
                    className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-[#0047ab]"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-4xl">{addon.icon}</div>
                        <Badge variant="secondary">{addon.category}</Badge>
                      </div>
                      <CardTitle className="text-base">{addon.name}</CardTitle>
                      <CardDescription className="text-sm mt-2">
                        {addon.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{addon.validity} Days</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xl text-[#0047ab]">
                            AED {addon.price}
                          </span>
                        </div>
                        <Button
                          onClick={() => handlePurchaseClick(addon)}
                          className="w-full bg-gradient-to-r from-[#0047ab] to-[#00c5cb] text-white hover:opacity-90 transition-all"
                          disabled={!selectedMember}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Member
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Purchase Add-on for {selectedMember?.name}
            </DialogTitle>
            <DialogDescription>
              Complete the purchase details and payment information
            </DialogDescription>
          </DialogHeader>

          {selectedAddon && (
            <div className="space-y-6 py-4">
              <Card className="bg-[#0047ab]/5 border-none">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Add-on Name</Label>
                      <p className="mt-1">{selectedAddon.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Category</Label>
                      <Badge variant="secondary" className="mt-1">
                        {selectedAddon.category}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="validity">Validity (Days)</Label>
                  <Input
                    id="validity"
                    type="number"
                    value={customValidity}
                    onChange={(e) => setCustomValidity(Number(e.target.value))}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Valid till:{" "}
                    {calculateNewExpiry()?.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div>
                  <Label htmlFor="amount">Amount (AED)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(Number(e.target.value))}
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="payment">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="Card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Card
                      </div>
                    </SelectItem>
                    <SelectItem value="UPI">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        UPI / QR
                      </div>
                    </SelectItem>
                    <SelectItem value="Bank Transfer">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Bank Transfer
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes here..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              {selectedMember && calculateNewExpiry() && (
                <Card className="bg-gradient-to-r from-[#0047ab] to-[#00c5cb] text-white">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm opacity-90">Membership Update</p>
                      <div className="flex items-center justify-between">
                        <span>Current Expiry:</span>
                        <span>
                          {selectedMember.validTill.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-lg">
                        <span>New Expiry:</span>
                        <span className="font-bold">
                          {calculateNewExpiry()?.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPurchaseDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPurchase}
              className="gap-2 bg-[#E63946] text-white hover:bg-[#d32f3c]"
            >
              <CheckCircle className="h-4 w-4" />
              Confirm Purchase & Send Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto rounded-full p-3 w-fit mb-4 bg-green-500">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-center text-2xl">
              Add-on Successfully Purchased!
            </DialogTitle>
            <DialogDescription className="text-center">
              ✅ Add-on successfully purchased for {selectedMember?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card className="bg-[#0047ab]/5 border-none">
              <CardContent className="pt-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Add-on:</span>
                  <span className="font-medium">{selectedAddon?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">AED {customAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="font-medium">{paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Expiry:</span>
                  <span className="font-semibold text-green-600">
                    {calculateNewExpiry()?.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                🎉 <strong>Congratulations {selectedMember?.name}!</strong> You've
                successfully added {selectedAddon?.name}. Your membership is now valid
                till{" "}
                {calculateNewExpiry()?.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
                . Receipt attached.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Download Receipt
            </Button>
            <Button 
              onClick={handleSuccessClose} 
              className="flex-1 bg-gradient-to-r from-[#0047ab] to-[#00c5cb] text-white hover:opacity-90"
            >
              Done
            </Button>
          </DialogFooter>
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

