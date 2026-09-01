import { useState } from 'react';
import { CurrencyGlyph } from '../utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Calendar } from "../components/ui/calendar";
import { CalendarIcon, RefreshCw, TrendingUp, Search, Filter, AlertCircle, CheckCircle, User, Mail, Phone, Hash } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { format, addMonths, parseISO, isPast, differenceInDays } from "date-fns";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/ui/breadcrumb";

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
            <div className="text-3xl font-bold text-green-600"><CurrencyGlyph /> 8,640</div>
            <p className="text-xs text-gray-600 mt-1">From renewals</p>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="text-primary">Member Management</CardTitle>
          <CardDescription>Manage membership renewals and upgrades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-primary/10">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-light">
                  <TableHead className="text-primary">Member ID</TableHead>
                  <TableHead className="text-primary">Member Details</TableHead>
                  <TableHead className="text-primary">Contact</TableHead>
                  <TableHead className="text-primary">Current Plan</TableHead>
                  <TableHead className="text-primary">Expiry Date</TableHead>
                  <TableHead className="text-primary">Status</TableHead>
                  <TableHead className="text-primary">Total Paid</TableHead>
                  <TableHead className="text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No members found matching your search criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Hash className="h-4 w-4 text-primary" />
                          <span className="font-mono font-medium text-primary">{member.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-xs text-gray-500">Joined {member.joinDate}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1 text-sm">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{member.phone}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span>{member.email && !member.email.includes('@family.local') ? member.email : 'Not added'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {member.currentPlan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{member.expiryDate}</div>
                          {member.status === "Expired" && (
                            <div className="text-xs text-red-600 mt-1">
                              {Math.abs(Math.round(member.monthsRemaining * 30))} days overdue
                            </div>
                          )}
                          {member.status === "Expiring Soon" && (
                            <div className="text-xs text-yellow-600 mt-1">
                              {Math.round(member.monthsRemaining * 30)} days left
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(member.status)} flex items-center space-x-1 w-fit`}>
                          {getStatusIcon(member.status)}
                          <span>{member.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-primary">{member.totalPaid}</span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={() => handleRenewal(member)}
                          className={member.status === "Expired" ? "btn-primary" : ""}
                          variant={member.status === "Expired" ? "default" : "outline"}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          {member.status === "Expired" ? "Renew Now" : "Renew/Upgrade"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
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

