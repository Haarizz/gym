import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Calendar } from "./ui/calendar";
import { CalendarIcon, RefreshCw, TrendingUp, Search, Filter, AlertCircle, CheckCircle, User, Mail, Phone, Hash, Receipt, FileText, Download, Eye } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format, addMonths, parseISO, isPast, differenceInDays } from "date-fns";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

// Mock data for members eligible for renewal/upgrade
const members = [
  {
    id: "GYM001",
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+971-50-123-4567",
    currentPlan: "Basic Monthly",
    expiryDate: "2024-01-15",
    status: "Expiring Soon",
    monthsRemaining: 0.5,
    totalPaid: "AED 1,440",
    joinDate: "2023-01-15"
  },
  {
    id: "GYM002",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+971-50-234-5678",
    currentPlan: "Premium Monthly",
    expiryDate: "2024-02-20",
    status: "Active",
    monthsRemaining: 1.8,
    totalPaid: "AED 2,880",
    joinDate: "2022-06-20"
  },
  {
    id: "GYM003",
    name: "Mike Wilson",
    email: "mike.wilson@email.com",
    phone: "+971-50-345-6789",
    currentPlan: "Basic Annual",
    expiryDate: "2024-12-31",
    status: "Active",
    monthsRemaining: 11.2,
    totalPaid: "AED 2,400",
    joinDate: "2023-12-31"
  },
  {
    id: "GYM004",
    name: "Emily Davis",
    email: "emily.davis@email.com",
    phone: "+971-50-456-7890",
    currentPlan: "Premium Monthly",
    expiryDate: "2023-12-10",
    status: "Expired",
    monthsRemaining: -0.3,
    totalPaid: "AED 1,920",
    joinDate: "2022-11-10"
  },
  {
    id: "GYM005",
    name: "Ahmed Hassan",
    email: "ahmed.hassan@email.com",
    phone: "+971-52-567-8901",
    currentPlan: "VIP Annual",
    expiryDate: "2023-12-25",
    status: "Expired",
    monthsRemaining: -0.5,
    totalPaid: "AED 3,600",
    joinDate: "2022-12-25"
  },
  {
    id: "GYM006",
    name: "Fatima Ali",
    email: "fatima.ali@email.com",
    phone: "+971-55-678-9012",
    currentPlan: "Basic Monthly",
    expiryDate: "2024-01-18",
    status: "Expiring Soon",
    monthsRemaining: 0.7,
    totalPaid: "AED 1,200",
    joinDate: "2023-03-18"
  }
];

// Mock data for renewal/upgrade transactions
const renewalTransactions = [
  {
    id: "TXN001",
    memberId: "GYM001",
    memberName: "John Smith",
    transactionType: "Renewal",
    previousPlan: "Basic Monthly",
    newPlan: "Basic Monthly",
    amount: "AED 120",
    paymentMethod: "Card",
    transactionDate: "2024-01-02 10:30 AM",
    newExpiryDate: "2024-02-15",
    processedBy: "Admin",
    status: "Completed",
    receiptNo: "RCP-2024-001"
  },
  {
    id: "TXN002",
    memberId: "GYM002",
    memberName: "Sarah Johnson",
    transactionType: "Upgrade",
    previousPlan: "Basic Monthly",
    newPlan: "Premium Monthly",
    amount: "AED 240",
    paymentMethod: "Cash",
    transactionDate: "2024-01-03 02:15 PM",
    newExpiryDate: "2024-03-20",
    processedBy: "Manager",
    status: "Completed",
    receiptNo: "RCP-2024-002"
  },
  {
    id: "TXN003",
    memberId: "GYM003",
    memberName: "Mike Wilson",
    transactionType: "Renewal",
    previousPlan: "Premium Annual",
    newPlan: "Premium Annual",
    amount: "AED 2,400",
    paymentMethod: "Bank Transfer",
    transactionDate: "2024-01-04 11:00 AM",
    newExpiryDate: "2025-12-31",
    processedBy: "Admin",
    status: "Completed",
    receiptNo: "RCP-2024-003"
  },
  {
    id: "TXN004",
    memberId: "GYM004",
    memberName: "Emily Davis",
    transactionType: "Upgrade",
    previousPlan: "Basic Monthly",
    newPlan: "VIP Annual",
    amount: "AED 3,600",
    paymentMethod: "Card",
    transactionDate: "2024-01-05 09:45 AM",
    newExpiryDate: "2025-01-10",
    processedBy: "Manager",
    status: "Completed",
    receiptNo: "RCP-2024-004"
  },
  {
    id: "TXN005",
    memberId: "GYM005",
    memberName: "Ahmed Hassan",
    transactionType: "Renewal",
    previousPlan: "VIP Annual",
    newPlan: "VIP Annual",
    amount: "AED 3,600",
    paymentMethod: "Online Payment",
    transactionDate: "2024-01-06 03:30 PM",
    newExpiryDate: "2024-12-25",
    processedBy: "Admin",
    status: "Completed",
    receiptNo: "RCP-2024-005"
  },
  {
    id: "TXN006",
    memberId: "GYM006",
    memberName: "Fatima Ali",
    transactionType: "Upgrade",
    previousPlan: "Basic Monthly",
    newPlan: "Premium Monthly",
    amount: "AED 240",
    paymentMethod: "Card",
    transactionDate: "2024-01-07 01:20 PM",
    newExpiryDate: "2024-02-18",
    processedBy: "Admin",
    status: "Completed",
    receiptNo: "RCP-2024-006"
  },
  {
    id: "TXN007",
    memberId: "GYM007",
    memberName: "David Lee",
    transactionType: "Renewal",
    previousPlan: "Premium Monthly",
    newPlan: "Premium Monthly",
    amount: "AED 240",
    paymentMethod: "Cash",
    transactionDate: "2024-01-08 10:15 AM",
    newExpiryDate: "2024-02-25",
    processedBy: "Manager",
    status: "Completed",
    receiptNo: "RCP-2024-007"
  },
  {
    id: "TXN008",
    memberId: "GYM008",
    memberName: "Lisa Martinez",
    transactionType: "Upgrade",
    previousPlan: "Basic Annual",
    newPlan: "Premium Annual",
    amount: "AED 2,400",
    paymentMethod: "Card",
    transactionDate: "2024-01-09 04:45 PM",
    newExpiryDate: "2025-01-09",
    processedBy: "Admin",
    status: "Completed",
    receiptNo: "RCP-2024-008"
  },
  {
    id: "TXN009",
    memberId: "GYM009",
    memberName: "Omar Al-Rashid",
    transactionType: "Renewal",
    previousPlan: "Basic Monthly",
    newPlan: "Basic Monthly",
    amount: "AED 120",
    paymentMethod: "Online Payment",
    transactionDate: "2024-01-10 11:30 AM",
    newExpiryDate: "2024-02-12",
    processedBy: "Admin",
    status: "Completed",
    receiptNo: "RCP-2024-009"
  },
  {
    id: "TXN010",
    memberId: "GYM010",
    memberName: "Jessica Wong",
    transactionType: "Upgrade",
    previousPlan: "Premium Monthly",
    newPlan: "VIP Annual",
    amount: "AED 3,600",
    paymentMethod: "Bank Transfer",
    transactionDate: "2024-01-11 02:00 PM",
    newExpiryDate: "2025-01-11",
    processedBy: "Manager",
    status: "Completed",
    receiptNo: "RCP-2024-010"
  },
  {
    id: "TXN011",
    memberId: "GYM011",
    memberName: "Tom Anderson",
    transactionType: "Renewal",
    previousPlan: "Premium Annual",
    newPlan: "Premium Annual",
    amount: "AED 2,400",
    paymentMethod: "Card",
    transactionDate: "2024-01-12 09:15 AM",
    newExpiryDate: "2025-01-12",
    processedBy: "Admin",
    status: "Completed",
    receiptNo: "RCP-2024-011"
  },
  {
    id: "TXN012",
    memberId: "GYM012",
    memberName: "Aisha Mohammed",
    transactionType: "Upgrade",
    previousPlan: "Basic Monthly",
    newPlan: "Basic Annual",
    amount: "AED 1,200",
    paymentMethod: "Cash",
    transactionDate: "2024-01-13 03:45 PM",
    newExpiryDate: "2025-01-13",
    processedBy: "Manager",
    status: "Completed",
    receiptNo: "RCP-2024-012"
  },
  {
    id: "TXN013",
    memberId: "GYM013",
    memberName: "Carlos Rodriguez",
    transactionType: "Renewal",
    previousPlan: "VIP Annual",
    newPlan: "VIP Annual",
    amount: "AED 3,600",
    paymentMethod: "Card",
    transactionDate: "2024-01-14 10:30 AM",
    newExpiryDate: "2025-01-14",
    processedBy: "Admin",
    status: "Completed",
    receiptNo: "RCP-2024-013"
  },
  {
    id: "TXN014",
    memberId: "GYM014",
    memberName: "Priya Patel",
    transactionType: "Upgrade",
    previousPlan: "Basic Annual",
    newPlan: "VIP Annual",
    amount: "AED 3,600",
    paymentMethod: "Online Payment",
    transactionDate: "2024-01-15 01:15 PM",
    newExpiryDate: "2025-01-15",
    processedBy: "Manager",
    status: "Completed",
    receiptNo: "RCP-2024-014"
  },
  {
    id: "TXN015",
    memberId: "GYM015",
    memberName: "James Brown",
    transactionType: "Renewal",
    previousPlan: "Premium Monthly",
    newPlan: "Premium Monthly",
    amount: "AED 240",
    paymentMethod: "Bank Transfer",
    transactionDate: "2024-01-16 04:00 PM",
    newExpiryDate: "2024-02-16",
    processedBy: "Admin",
    status: "Completed",
    receiptNo: "RCP-2024-015"
  }
];

const membershipPlans = [
  { id: "basic-monthly", name: "Basic Monthly", price: "AED 120", duration: "1 month", features: ["Gym Access", "Locker"] },
  { id: "premium-monthly", name: "Premium Monthly", price: "AED 240", duration: "1 month", features: ["Gym Access", "Locker", "Group Classes", "Pool"] },
  { id: "basic-annual", name: "Basic Annual", price: "AED 1,200", duration: "12 months", features: ["Gym Access", "Locker", "10% Discount"] },
  { id: "premium-annual", name: "Premium Annual", price: "AED 2,400", duration: "12 months", features: ["Gym Access", "Locker", "Group Classes", "Pool", "15% Discount"] },
  { id: "vip-annual", name: "VIP Annual", price: "AED 3,600", duration: "12 months", features: ["Gym Access", "Locker", "All Classes", "Pool", "Spa", "Personal Trainer", "20% Discount"] }
];

interface RenewUpgradeProps {
  onNavigate?: (section: string) => void;
}

export function RenewUpgrade({ onNavigate }: RenewUpgradeProps) {
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilter, setSearchFilter] = useState("all"); // all, name, id, phone, email
  const [statusFilter, setStatusFilter] = useState("all");
  const [renewalDate, setRenewalDate] = useState<Date>();
  const [selectedPlan, setSelectedPlan] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [notes, setNotes] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800";
      case "Expiring Soon": return "bg-yellow-100 text-yellow-800";
      case "Expired": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active": return <CheckCircle className="h-4 w-4" />;
      case "Expiring Soon": return <AlertCircle className="h-4 w-4" />;
      case "Expired": return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const filteredMembers = members.filter(member => {
    // Search filter
    let matchesSearch = false;
    const searchLower = searchTerm.toLowerCase();

    switch (searchFilter) {
      case "name":
        matchesSearch = member.name.toLowerCase().includes(searchLower);
        break;
      case "id":
        matchesSearch = member.id.toLowerCase().includes(searchLower);
        break;
      case "phone":
        matchesSearch = member.phone.toLowerCase().includes(searchLower);
        break;
      case "email":
        matchesSearch = member.email.toLowerCase().includes(searchLower);
        break;
      default: // "all"
        matchesSearch = 
          member.name.toLowerCase().includes(searchLower) ||
          member.id.toLowerCase().includes(searchLower) ||
          member.phone.toLowerCase().includes(searchLower) ||
          member.email.toLowerCase().includes(searchLower);
    }

    // Status filter
    const matchesStatus = statusFilter === "all" || member.status.toLowerCase().replace(/ /g, "-") === statusFilter;
    
    return (!searchTerm || matchesSearch) && matchesStatus;
  });

  const handleRenewal = (member: any) => {
    setSelectedMember(member);
    setSelectedPlan(member.currentPlan.toLowerCase().replace(/ /g, "-"));
    setRenewalDate(new Date());
    setNotes("");
    setPaymentMethod("card");
  };

  const processRenewal = () => {
    if (!selectedPlan || !renewalDate) {
      toast.error("Missing Information", {
        description: "Please select a plan and renewal date.",
      });
      return;
    }

    const selectedPlanDetails = membershipPlans.find(p => p.id === selectedPlan);
    
    toast.success("Renewal Processed Successfully!", {
      description: `${selectedMember?.name} has been renewed to ${selectedPlanDetails?.name}`,
      duration: 4000,
    });

    console.log("Processing renewal for:", selectedMember?.name);
    console.log("New plan:", selectedPlan);
    console.log("Renewal date:", renewalDate);
    console.log("Payment method:", paymentMethod);
    console.log("Notes:", notes);
    
    setSelectedMember(null);
    setSelectedPlan("");
    setNotes("");
  };

  // Calculate statistics
  const expiringSoon = members.filter(m => m.status === "Expiring Soon").length;
  const expired = members.filter(m => m.status === "Expired").length;
  const upgradeCandidates = members.filter(m => m.currentPlan.includes("Basic")).length;

  return (
    <div className="min-h-screen bg-gymbios-main-bg p-6 space-y-6">
      {/* Breadcrumb with Enhanced Search */}
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => onNavigate?.("community")} 
                className="cursor-pointer hover:text-primary"
              >
                Community
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => onNavigate?.("members")} 
                className="cursor-pointer hover:text-primary"
              >
                Members
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-primary font-medium">
                Renewals & Upgrades
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Advanced Search Section */}
        <Card className="border-primary/10 bg-gradient-light">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-primary" />
                  <Input
                    placeholder="Search members by name, ID, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-white border-primary/20 focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={searchFilter} onValueChange={setSearchFilter}>
                  <SelectTrigger className="w-[140px] bg-white border-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center">
                        <Search className="h-4 w-4 mr-2" />
                        All Fields
                      </div>
                    </SelectItem>
                    <SelectItem value="name">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Name Only
                      </div>
                    </SelectItem>
                    <SelectItem value="id">
                      <div className="flex items-center">
                        <Hash className="h-4 w-4 mr-2" />
                        Member ID
                      </div>
                    </SelectItem>
                    <SelectItem value="phone">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        Phone
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] bg-white border-primary/20">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Tips */}
            {searchTerm && (
              <div className="mt-3 text-sm text-primary">
                Found {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} matching "{searchTerm}"
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Renew / Upgrade Membership
          </h1>
          <p className="text-gray-600 mt-2">
            Extend membership validity or upgrade to higher plans
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-primary/10 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-primary">Expiring Soon</CardTitle>
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{expiringSoon}</div>
            <p className="text-xs text-gray-600 mt-1">Next 30 days</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-primary">Expired</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{expired}</div>
            <p className="text-xs text-gray-600 mt-1">Needs immediate action</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-primary">Upgrade Candidates</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{upgradeCandidates}</div>
            <p className="text-xs text-gray-600 mt-1">Basic plan users</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-primary">Monthly Revenue</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">AED 8,640</div>
            <p className="text-xs text-gray-600 mt-1">From renewals</p>
          </CardContent>
        </Card>
      </div>

      {/* Renewal/Upgrade Transactions History */}
      <Card className="border-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-primary flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Renewal & Upgrade Transaction History
              </CardTitle>
              <CardDescription>Complete record of all membership renewals and upgrades</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-primary/10">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-light">
                  <TableHead className="text-primary">Receipt No</TableHead>
                  <TableHead className="text-primary">Transaction ID</TableHead>
                  <TableHead className="text-primary">Member Details</TableHead>
                  <TableHead className="text-primary">Type</TableHead>
                  <TableHead className="text-primary">Plan Change</TableHead>
                  <TableHead className="text-primary">Amount</TableHead>
                  <TableHead className="text-primary">Payment Method</TableHead>
                  <TableHead className="text-primary">Date & Time</TableHead>
                  <TableHead className="text-primary">New Expiry</TableHead>
                  <TableHead className="text-primary">Processed By</TableHead>
                  <TableHead className="text-primary">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renewalTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        <span className="font-mono font-medium text-primary">{transaction.receiptNo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Hash className="h-4 w-4 text-gray-500" />
                        <span className="font-mono text-sm">{transaction.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="font-medium">{transaction.memberName}</div>
                          <div className="text-xs text-gray-500">{transaction.memberId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={transaction.transactionType === 'Upgrade' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {transaction.transactionType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm text-gray-600">{transaction.previousPlan}</div>
                        <div className="flex items-center text-xs text-green-600">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {transaction.newPlan}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-primary">{transaction.amount}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30">
                        {transaction.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{transaction.transactionDate.split(' ')[0]}</div>
                        <div className="text-xs text-gray-500">{transaction.transactionDate.split(' ').slice(1).join(' ')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{transaction.newExpiryDate}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{transaction.processedBy}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {transaction.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Transaction Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-sm text-blue-700">Total Transactions</div>
                <div className="text-2xl font-bold text-blue-900">{renewalTransactions.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="text-sm text-green-700">Renewals</div>
                <div className="text-2xl font-bold text-green-900">
                  {renewalTransactions.filter(t => t.transactionType === 'Renewal').length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="text-sm text-purple-700">Upgrades</div>
                <div className="text-2xl font-bold text-purple-900">
                  {renewalTransactions.filter(t => t.transactionType === 'Upgrade').length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="text-sm text-amber-700">Total Revenue</div>
                <div className="text-2xl font-bold text-amber-900">
                  AED {renewalTransactions.reduce((sum, t) => sum + parseInt(t.amount.replace(/[^\d]/g, '')), 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="text-primary">Member Management</CardTitle>
          <CardDescription>Manage membership renewals and upgrades</CardDescription>
        </CardHeader>
      </Card>

      {/* Renewal/Upgrade Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
              {selectedMember?.status === "Expired" ? "Renew Expired Membership" : "Renew / Upgrade Membership"}
            </DialogTitle>
            <DialogDescription>
              Process renewal or upgrade for {selectedMember?.name} (ID: {selectedMember?.id})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Member Info */}
            <div className={`p-4 rounded-lg border-2 ${
              selectedMember?.status === "Expired" 
                ? "bg-red-50 border-red-200" 
                : "bg-gradient-light border-primary/20"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-primary">Current Membership Information</h3>
                {selectedMember?.status === "Expired" && (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Expired - Immediate Action Required
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Member ID:</span>
                  <div className="font-medium text-primary">{selectedMember?.id}</div>
                </div>
                <div>
                  <span className="text-gray-600">Current Plan:</span>
                  <div className="font-medium">{selectedMember?.currentPlan}</div>
                </div>
                <div>
                  <span className="text-gray-600">Expiry Date:</span>
                  <div className="font-medium">{selectedMember?.expiryDate}</div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <Badge className={`ml-2 ${getStatusColor(selectedMember?.status)}`}>
                    {selectedMember?.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600">Total Paid:</span>
                  <div className="font-medium text-primary">{selectedMember?.totalPaid}</div>
                </div>
                <div>
                  <span className="text-gray-600">Join Date:</span>
                  <div className="font-medium">{selectedMember?.joinDate}</div>
                </div>
              </div>
            </div>

            {/* New Plan Selection */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="plan" className="text-primary">Select New Membership Plan *</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger className="mt-2 border-primary/20">
                    <SelectValue placeholder="Choose membership plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {membershipPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{plan.name}</span>
                          <span className="ml-4 font-semibold text-primary">{plan.price}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show selected plan details */}
              {selectedPlan && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-primary mb-2">Selected Plan Features</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-sm text-gray-600">Plan:</span>
                      <div className="font-medium">{membershipPlans.find(p => p.id === selectedPlan)?.name}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Price:</span>
                      <div className="font-semibold text-primary">{membershipPlans.find(p => p.id === selectedPlan)?.price}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-sm text-gray-600">Includes:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {membershipPlans.find(p => p.id === selectedPlan)?.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="border-primary/30 text-primary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-primary">Renewal Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start mt-2 border-primary/20">
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {renewalDate ? format(renewalDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={renewalDate}
                        onSelect={setRenewalDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="payment" className="text-primary">Payment Method *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="mt-2 border-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="online">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-primary">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this renewal/upgrade..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2 border-primary/20"
                  rows={3}
                />
              </div>
            </div>

            {/* Plan Comparison Summary */}
            {selectedPlan && renewalDate && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Renewal Summary
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Previous Plan:</span>
                    <div className="font-medium">{selectedMember?.currentPlan}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">New Plan:</span>
                    <div className="font-medium text-green-700">{membershipPlans.find(p => p.id === selectedPlan)?.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Start Date:</span>
                    <div className="font-medium">{format(renewalDate, "PPP")}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">New Expiry:</span>
                    <div className="font-medium text-green-700">
                      {format(addMonths(renewalDate, selectedPlan.includes("annual") ? 12 : 1), "PPP")}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment:</span>
                    <div className="font-medium capitalize">{paymentMethod}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <div className="font-semibold text-green-700 text-lg">
                      {membershipPlans.find(p => p.id === selectedPlan)?.price}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedMember(null)} className="border-primary/30">
                Cancel
              </Button>
              <Button 
                onClick={processRenewal} 
                disabled={!selectedPlan || !renewalDate}
                className="btn-primary"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {selectedMember?.status === "Expired" ? "Renew Membership" : "Process Renewal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}