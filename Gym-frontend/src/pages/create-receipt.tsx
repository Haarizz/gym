import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  DollarSign,
  FileText,
  Download,
  Send,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Receipt,
  Hash,
  Wallet,
  Building2,
  Eye
} from 'lucide-react';
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Checkbox } from "../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { format } from "date-fns";

// Mock member data
const mockMembers = [
  {
    id: "MB-1024",
    name: "Ahmed Al-Mansoori",
    mobile: "+971 50 123 4567",
    email: "ahmed.m@email.com",
    membershipStatus: "Active",
    outstandingDues: [
      {
        docNo: "INV-1245",
        date: "2025-10-02",
        transactionType: "Membership Renewal",
        actualAmount: 500.00,
        paidAmount: 200.00,
        dueAmount: 300.00,
        dueDate: "2025-10-25"
      },
      {
        docNo: "INV-1260",
        date: "2025-10-05",
        transactionType: "Personal Training (5 Sessions)",
        actualAmount: 200.00,
        paidAmount: 0.00,
        dueAmount: 200.00,
        dueDate: "2025-10-30"
      }
    ]
  },
  {
    id: "MB-1025",
    name: "Fatima Hassan",
    mobile: "+971 55 234 5678",
    email: "fatima.h@email.com",
    membershipStatus: "Active",
    outstandingDues: [
      {
        docNo: "INV-1280",
        date: "2025-10-10",
        transactionType: "Quarterly Membership",
        actualAmount: 1200.00,
        paidAmount: 600.00,
        dueAmount: 600.00,
        dueDate: "2025-11-10"
      }
    ]
  },
  {
    id: "MB-1026",
    name: "Mohammed Ali",
    mobile: "+971 52 345 6789",
    email: "mohammed.ali@email.com",
    membershipStatus: "Active",
    outstandingDues: [
      {
        docNo: "INV-1290",
        date: "2025-10-12",
        transactionType: "Add-on: Nutrition Plan",
        actualAmount: 350.00,
        paidAmount: 0.00,
        dueAmount: 350.00,
        dueDate: "2025-10-20"
      },
      {
        docNo: "INV-1295",
        date: "2025-10-15",
        transactionType: "Locker Rental",
        actualAmount: 100.00,
        paidAmount: 0.00,
        dueAmount: 100.00,
        dueDate: "2025-10-25"
      }
    ]
  },
  {
    id: "MB-1027",
    name: "Sarah Johnson",
    mobile: "+971 50 456 7890",
    email: "sarah.j@email.com",
    membershipStatus: "Expired",
    outstandingDues: [
      {
        docNo: "INV-1200",
        date: "2025-09-20",
        transactionType: "Monthly Membership",
        actualAmount: 450.00,
        paidAmount: 0.00,
        dueAmount: 450.00,
        dueDate: "2025-09-30"
      }
    ]
  },
  {
    id: "MB-1028",
    name: "John Mathew",
    mobile: "+971 55 567 8901",
    email: "john.mathew@email.com",
    membershipStatus: "Active",
    outstandingDues: []
  }
];

interface CreateReceiptProps {
  onNavigate?: (section: string) => void;
  layout?: "page" | "modal";
}

export function CreateReceipt({ onNavigate, layout = "page" }: CreateReceiptProps) {
  const isModal = layout === "modal";
  const panelCardClass = "border-primary/10 shadow-md hover:shadow-lg transition-shadow bg-white";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [receiptGenerated, setReceiptGenerated] = useState(false);
  const [generatedReceiptNo, setGeneratedReceiptNo] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [autoApplyAmount, setAutoApplyAmount] = useState("");
  const [showDigitalSendDialog, setShowDigitalSendDialog] = useState(false);
  const [selectedDigitalChannel, setSelectedDigitalChannel] = useState<string[]>([]);

  // Filter members based on search term
  const filteredMembers = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return mockMembers.filter(member => 
      member.name.toLowerCase().includes(term) ||
      member.mobile.includes(term) ||
      member.id.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const handleSelectMember = (member: any) => {
    setSelectedMember(member);
    setSearchTerm("");
    setShowSuggestions(false);
    setPaymentAmounts({});
    setReceiptGenerated(false);
    setGeneratedReceiptNo("");
  };

  const handlePaymentAmountChange = (docNo: string, value: string) => {
    // Only allow numeric values and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setPaymentAmounts(prev => ({
        ...prev,
        [docNo]: value
      }));
    }
  };

  const calculateTotalPayment = () => {
    return Object.values(paymentAmounts).reduce((sum, amount) => {
      return sum + (parseFloat(amount) || 0);
    }, 0);
  };

  const calculateTotalDue = () => {
    if (!selectedMember) return 0;
    return selectedMember.outstandingDues.reduce((sum: number, due: any) => sum + due.dueAmount, 0);
  };

  const calculateBalanceRemaining = () => {
    return calculateTotalDue() - calculateTotalPayment();
  };

  const handleAutoApplyPayment = () => {
    // Use the autoApplyAmount if entered, otherwise use total payment
    const amountToApply = autoApplyAmount ? parseFloat(autoApplyAmount) : calculateTotalPayment();
    
    if (!amountToApply || amountToApply === 0) {
      toast.error("Please enter an amount to auto-apply");
      return;
    }

    let remaining = amountToApply;
    const newPayments: Record<string, string> = {};

    // Sort dues by date (oldest first) - FIFO method
    const sortedDues = [...selectedMember.outstandingDues].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const due of sortedDues) {
      if (remaining <= 0) break;
      
      const amountToAllocate = Math.min(remaining, due.dueAmount);
      newPayments[due.docNo] = amountToAllocate.toFixed(2);
      remaining -= amountToAllocate;
    }

    setPaymentAmounts(newPayments);
    toast.success(`AED ${amountToApply.toFixed(2)} auto-applied using FIFO method`, {
      description: "Amount distributed to oldest bills first"
    });
  };

  const validatePayments = () => {
    const totalPayment = calculateTotalPayment();
    
    if (totalPayment === 0) {
      toast.error("Please enter a payment amount");
      return false;
    }

    // Check for overpayment on individual bills
    for (const due of selectedMember.outstandingDues) {
      const paymentAmount = parseFloat(paymentAmounts[due.docNo] || "0");
      if (paymentAmount > due.dueAmount) {
        toast.error(`Payment for ${due.docNo} exceeds due amount`);
        return false;
      }
    }

    return true;
  };

  const handleGenerateReceipt = () => {
    if (!validatePayments()) return;

    const receiptNo = `RCP-2025-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    setGeneratedReceiptNo(receiptNo);
    setReceiptGenerated(true);
    setShowReceiptModal(true);

    toast.success("Receipt Generated Successfully!", {
      description: `Receipt ${receiptNo} has been created for AED ${calculateTotalPayment().toFixed(2)}`
    });
  };

  const handleDownloadPDF = () => {
    toast.success("Downloading Receipt", {
      description: `Receipt ${generatedReceiptNo} is being downloaded as PDF...`
    });
  };

  const handleSendSMS = () => {
    toast.success("Sending via SMS", {
      description: `Receipt sent to ${selectedMember?.mobile}`
    });
  };

  const handleSendEmail = () => {
    toast.success("Sending via Email", {
      description: `Receipt sent to ${selectedMember?.email}`
    });
  };

  const handleSendWhatsApp = () => {
    toast.success("Sending via WhatsApp", {
      description: `Receipt sent to ${selectedMember?.mobile}`
    });
  };

  const handleSendViaDigital = () => {
    if (selectedDigitalChannel.length === 0) {
      toast.error("Please select at least one channel");
      return;
    }

    const channels = selectedDigitalChannel.join(", ");
    toast.success("Receipt Sent Successfully!", {
      description: `Receipt ${generatedReceiptNo} sent via ${channels}`
    });
    setShowDigitalSendDialog(false);
    setSelectedDigitalChannel([]);
  };

  const toggleDigitalChannel = (channel: string) => {
    setSelectedDigitalChannel(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const resetForm = () => {
    setSelectedMember(null);
    setPaymentAmounts({});
    setPaymentMode("Cash");
    setTransactionReference("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setReceiptGenerated(false);
    setGeneratedReceiptNo("");
  };

  return (
    <div className={isModal ? "bg-background" : "min-h-screen bg-background"}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Create Receipt</h1>
            <p className="text-muted-foreground">
              Manage member receipts, dues, and payment collections.
            </p>
          </div>
          {!isModal && onNavigate && (
            <Button
              variant="outline"
              onClick={() => onNavigate("billing")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Billing
            </Button>
          )}
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Search & Member Info */}
          <div className="space-y-6">
            {/* Search Section */}
            <Card className={panelCardClass}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Find Member
                </CardTitle>
                <CardDescription>
                  Search by Name, Mobile Number, Member ID, or Email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by Name, Mobile Number, Member ID, or Email"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="pl-10"
                  />
                  
                  {/* Auto-suggestion Dropdown */}
                  {showSuggestions && searchTerm && filteredMembers.length > 0 && (
                    <Card className="absolute z-10 w-full mt-2 max-h-80 overflow-y-auto border-slate-200/80 shadow-md">
                      <CardContent className="p-2">
                        {filteredMembers.map((member) => (
                          <div
                            key={member.id}
                            onClick={() => handleSelectMember(member)}
                            className="p-3 rounded-lg hover:bg-[#DFF5F4] cursor-pointer transition-colors mb-1"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-gradient-to-r from-[#2B7A78] to-[#00c5cb] text-white">
                                  {member.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium">{member.name}</p>
                                <div className="flex gap-3 text-sm text-muted-foreground">
                                  <span>{member.id}</span>
                                  <span>{member.mobile}</span>
                                </div>
                              </div>
                              <Badge 
                                variant={member.membershipStatus === "Active" ? "default" : "destructive"}
                                className={member.membershipStatus === "Active" ? "bg-green-100 text-green-800" : ""}
                              >
                                {member.membershipStatus}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Member Card */}
            {selectedMember && (
              <Card className={`${panelCardClass} ring-1 ring-[#2B7A78]/20`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" style={{ color: '#2B7A78' }} />
                    Selected Member
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-gradient-to-r from-[#2B7A78] to-[#00c5cb] text-white text-xl">
                          {selectedMember.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-lg">{selectedMember.name}</h3>
                        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Hash className="h-4 w-4" />
                            <span>{selectedMember.id}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{selectedMember.mobile}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{selectedMember.email}</span>
                          </div>
                          <div>
                            <Badge 
                              variant={selectedMember.membershipStatus === "Active" ? "default" : "destructive"}
                              className={selectedMember.membershipStatus === "Active" ? "bg-green-100 text-green-800" : ""}
                            >
                              {selectedMember.membershipStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.info("Opening member profile...")}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Profile
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetForm}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Outstanding Dues */}
            {selectedMember && selectedMember.outstandingDues.length > 0 && (
              <Card className={panelCardClass}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" style={{ color: '#2B7A78' }} />
                      Pending Bills / Dues
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="autoApplyAmount" className="text-sm whitespace-nowrap">
                          Amount:
                        </Label>
                        <Input
                          id="autoApplyAmount"
                          type="text"
                          placeholder="Enter amount"
                          value={autoApplyAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setAutoApplyAmount(value);
                            }
                          }}
                          className="w-32"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAutoApplyPayment}
                        className="gap-2"
                        style={{ borderColor: '#2B7A78', color: '#2B7A78' }}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Auto-Apply Payment
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Enter amount and auto-apply using FIFO method, or manually enter payment amounts for each bill
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50/50">
                        <tr className="hover:bg-transparent">
                          <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">Doc. No</th>
                          <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">Date</th>
                          <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">Transaction Type</th>
                          <th className="text-right py-3 px-2 text-sm font-semibold text-foreground">Actual</th>
                          <th className="text-right py-3 px-2 text-sm font-semibold text-foreground">Paid</th>
                          <th className="text-right py-3 px-2 text-sm font-semibold text-foreground">Due</th>
                          <th className="text-center py-3 px-2 text-sm font-semibold text-foreground">Due Date</th>
                          <th className="text-right py-3 px-2 text-sm font-semibold text-foreground">Pay Now</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedMember.outstandingDues.map((due: any) => {
                          const isOverdue = new Date(due.dueDate) < new Date();
                          const hasPayment = paymentAmounts[due.docNo] && parseFloat(paymentAmounts[due.docNo]) > 0;
                          return (
                            <tr 
                              key={due.docNo} 
                              className={`border-b border-gray-100 hover:bg-slate-50/50 transition-colors ${
                                hasPayment ? 'bg-[#DFF5F4]/20' : ''
                              }`}
                            >
                              <td className="py-3 px-2">
                                <span className="font-medium text-sm">{due.docNo}</span>
                              </td>
                              <td className="py-3 px-2 text-sm text-muted-foreground">
                                {new Date(due.date).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="py-3 px-2 text-sm">{due.transactionType}</td>
                              <td className="py-3 px-2 text-right text-sm">
                                AED {due.actualAmount.toFixed(2)}
                              </td>
                              <td className="py-3 px-2 text-right text-sm text-green-600">
                                AED {due.paidAmount.toFixed(2)}
                              </td>
                              <td className="py-3 px-2 text-right text-sm">
                                AED {due.dueAmount.toFixed(2)}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Badge 
                                  variant={isOverdue ? "destructive" : "secondary"}
                                  className="text-xs"
                                >
                                  {new Date(due.dueDate).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short'
                                  })}
                                </Badge>
                              </td>
                              <td className="py-3 px-2">
                                <Input
                                  type="text"
                                  placeholder="0.00"
                                  value={paymentAmounts[due.docNo] || ""}
                                  onChange={(e) => handlePaymentAmountChange(due.docNo, e.target.value)}
                                  className="text-right w-28"
                                  style={{ borderColor: paymentAmounts[due.docNo] ? '#2B7A78' : '' }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50/50">
                          <td colSpan={7} className="py-3 px-2 text-right">
                            <span className="text-sm">Total to Pay Now:</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="text-lg" style={{ color: '#2B7A78' }}>
                              AED {calculateTotalPayment().toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {calculateTotalPayment() > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-700 mt-0.5" />
                        <p className="text-sm text-blue-800">
                          <strong>Partial Settlement Allowed:</strong> You can enter partial amounts for multiple bills
                        </p>
                      </div>
                      {autoApplyAmount && parseFloat(autoApplyAmount) > 0 && (
                        <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-700 mt-0.5" />
                          <p className="text-sm text-green-800">
                            <strong>FIFO Method Applied:</strong> Amount distributed to oldest bills first (First In, First Out)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* No Outstanding Dues */}
            {selectedMember && selectedMember.outstandingDues.length === 0 && (
              <Card className={panelCardClass}>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                    <p className="text-lg mb-1">No Outstanding Dues</p>
                    <p className="text-sm text-muted-foreground">
                      This member has no pending payments
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Payment & Summary */}
          <div className="space-y-6">
            {/* Payment Section */}
            {selectedMember && selectedMember.outstandingDues.length > 0 && (
              <Card className={panelCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" style={{ color: '#2B7A78' }} />
                    Settle Payment
                  </CardTitle>
                  <CardDescription>
                    Choose payment method and enter transaction details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Payment Mode */}
                  <div>
                    <Label className="text-base mb-3 block">Payment Mode *</Label>
                    <RadioGroup value={paymentMode} onValueChange={setPaymentMode}>
                      <div className="grid grid-cols-2 gap-3">
                        <div 
                          className={`flex items-center space-x-2 border rounded-xl p-4 cursor-pointer transition-all ${
                            paymentMode === "Cash" 
                              ? "border-[#2B7A78] bg-[#DFF5F4]/30" 
                              : "border-border hover:border-[#2B7A78]/50"
                          }`}
                          onClick={() => setPaymentMode("Cash")}
                        >
                          <RadioGroupItem value="Cash" id="cash" />
                          <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Wallet className="h-5 w-5" />
                            Cash
                          </Label>
                        </div>

                        <div 
                          className={`flex items-center space-x-2 border rounded-xl p-4 cursor-pointer transition-all ${
                            paymentMode === "Card" 
                              ? "border-[#2B7A78] bg-[#DFF5F4]/30" 
                              : "border-border hover:border-[#2B7A78]/50"
                          }`}
                          onClick={() => setPaymentMode("Card")}
                        >
                          <RadioGroupItem value="Card" id="card" />
                          <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                            <CreditCard className="h-5 w-5" />
                            Card
                          </Label>
                        </div>

                        <div 
                          className={`flex items-center space-x-2 border rounded-xl p-4 cursor-pointer transition-all ${
                            paymentMode === "Bank Transfer" 
                              ? "border-[#2B7A78] bg-[#DFF5F4]/30" 
                              : "border-border hover:border-[#2B7A78]/50"
                          }`}
                          onClick={() => setPaymentMode("Bank Transfer")}
                        >
                          <RadioGroupItem value="Bank Transfer" id="bank" />
                          <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Building2 className="h-5 w-5" />
                            Bank Transfer
                          </Label>
                        </div>

                        <div 
                          className={`flex items-center space-x-2 border rounded-xl p-4 cursor-pointer transition-all ${
                            paymentMode === "Online" 
                              ? "border-[#2B7A78] bg-[#DFF5F4]/30" 
                              : "border-border hover:border-[#2B7A78]/50"
                          }`}
                          onClick={() => setPaymentMode("Online")}
                        >
                          <RadioGroupItem value="Online" id="online" />
                          <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer flex-1">
                            <DollarSign className="h-5 w-5" />
                            Online
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Transaction Reference */}
                  {(paymentMode === "Card" || paymentMode === "Bank Transfer" || paymentMode === "Online") && (
                    <div>
                      <Label htmlFor="transactionRef">
                        Transaction Reference {paymentMode !== "Cash" && "(Optional)"}
                      </Label>
                      <Input
                        id="transactionRef"
                        placeholder="Enter transaction reference or ID"
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                  )}

                  {/* Payment Date */}
                  <div>
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <div className="relative mt-2">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="paymentDate"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Receipt Summary */}
            {selectedMember && selectedMember.outstandingDues.length > 0 && (
              <Card className={`${panelCardClass} ring-1 ring-[#2B7A78]/20`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" style={{ color: '#2B7A78' }} />
                    Finalize Receipt
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary Details */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded-lg">
                      <span className="text-muted-foreground">Total Outstanding:</span>
                      <span className="text-lg">
                        AED {calculateTotalDue().toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-[#DFF5F4] rounded-lg">
                      <span>Receipt Total:</span>
                      <span className="text-xl" style={{ color: '#2B7A78' }}>
                        AED {calculateTotalPayment().toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded-lg">
                      <span className="text-muted-foreground">Balance Remaining:</span>
                      <span className={`text-lg ${calculateBalanceRemaining() > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        AED {calculateBalanceRemaining().toFixed(2)}
                      </span>
                    </div>

                    {calculateBalanceRemaining() < 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-red-800">
                            <strong>Warning:</strong> Payment exceeds total due amount
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {!receiptGenerated ? (
                      <>
                        <Button
                          onClick={handleGenerateReceipt}
                          disabled={calculateTotalPayment() === 0}
                          className="w-full text-white gap-2"
                          style={{ backgroundColor: '#2B7A78' }}
                          size="lg"
                        >
                          <CheckCircle className="h-5 w-5" />
                          Generate Receipt
                        </Button>

                        <Button
                          variant="outline"
                          onClick={resetForm}
                          className="w-full gap-2"
                          style={{ borderColor: '#E63946', color: '#E63946' }}
                          size="lg"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <p className="font-semibold text-green-800 mb-1">
                            Receipt Generated Successfully!
                          </p>
                          <p className="text-sm text-green-700">
                            Receipt #{generatedReceiptNo}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            onClick={handleDownloadPDF}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download PDF
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => setShowDigitalSendDialog(true)}
                            className="gap-2"
                            style={{ borderColor: '#2B7A78', color: '#2B7A78' }}
                          >
                            <Send className="h-4 w-4" />
                            Send via Digital
                          </Button>

                          <Button
                            variant="outline"
                            onClick={handleSendEmail}
                            className="gap-2"
                          >
                            <Mail className="h-4 w-4" />
                            Email
                          </Button>

                          <Button
                            variant="outline"
                            onClick={handleSendSMS}
                            className="gap-2"
                          >
                            <MessageSquare className="h-4 w-4" />
                            SMS
                          </Button>
                        </div>

                        <Button
                          onClick={resetForm}
                          className="w-full gap-2"
                          style={{ backgroundColor: '#2B7A78' }}
                          variant="default"
                        >
                          Create New Receipt
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructions Card */}
            {!selectedMember && (
              <Card className={panelCardClass}>
                <CardContent className="pt-6">
                  <div className="text-center py-8 space-y-4">
                    <div className="p-4 rounded-full bg-[#DFF5F4] w-20 h-20 mx-auto flex items-center justify-center">
                      <Receipt className="h-10 w-10" style={{ color: '#2B7A78' }} />
                    </div>
                    <div>
                      <h3 className="text-lg mb-2">Get Started</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Search and select a member to view their outstanding dues and create a receipt
                      </p>
                    </div>
                    <div className="text-left space-y-2 bg-[#F9FAFB] p-4 rounded-lg">
                      <p className="text-sm"><strong>Features:</strong></p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {[
                          "Multi-bill settlement in single receipt",
                          "Partial payment support",
                          "Auto-apply to oldest dues",
                          "Instant receipt generation",
                          "Send via SMS, Email, or WhatsApp"
                        ].map((feature) => (
                          <div key={feature} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Receipt Generated Successfully
            </DialogTitle>
            <DialogDescription>
              Receipt #{generatedReceiptNo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card style={{ backgroundColor: '#F9FAFB' }}>
              <CardContent className="pt-6">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member Name:</span>
                    <span className="font-medium">{selectedMember?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member ID:</span>
                    <span className="font-medium">{selectedMember?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Date:</span>
                    <span className="font-medium">
                      {new Date(paymentDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Mode:</span>
                    <span className="font-medium">{paymentMode}</span>
                  </div>
                  {transactionReference && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction Ref:</span>
                      <span className="font-medium">{transactionReference}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3">Payment Details</h4>
              <div className="space-y-2">
                {Object.entries(paymentAmounts).map(([docNo, amount]) => {
                  if (!amount || parseFloat(amount) === 0) return null;
                  const due = selectedMember?.outstandingDues.find((d: any) => d.docNo === docNo);
                  return (
                    <div key={docNo} className="flex justify-between text-sm p-2 bg-[#DFF5F4]/30 rounded">
                      <div>
                        <span className="font-medium">{docNo}</span>
                        <span className="text-muted-foreground ml-2">- {due?.transactionType}</span>
                      </div>
                      <span className="font-medium">AED {parseFloat(amount).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Card style={{ backgroundColor: '#DFF5F4', border: 'none' }}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Total Amount Paid:</span>
                  <span className="text-2xl" style={{ color: '#2B7A78' }}>
                    AED {calculateTotalPayment().toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReceiptModal(false)}
            >
              Close
            </Button>
            <Button
              onClick={handleDownloadPDF}
              style={{ backgroundColor: '#2B7A78' }}
              className="text-white gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send via Digital Dialog */}
      <Dialog open={showDigitalSendDialog} onOpenChange={setShowDigitalSendDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Send className="h-6 w-6" style={{ color: '#2B7A78' }} />
              Send Receipt via Digital Channels
            </DialogTitle>
            <DialogDescription>
              Select one or more channels to send the receipt
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card style={{ backgroundColor: '#F9FAFB', border: 'none' }}>
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receipt No:</span>
                    <span className="font-medium">{generatedReceiptNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member:</span>
                    <span className="font-medium">{selectedMember?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium" style={{ color: '#2B7A78' }}>
                      AED {calculateTotalPayment().toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div>
              <Label className="text-base mb-3 block">Select Channels *</Label>
              <div className="space-y-3">
                <div 
                  className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                    selectedDigitalChannel.includes("SMS")
                      ? "border-[#2B7A78] bg-[#DFF5F4]/30"
                      : "border-border hover:border-[#2B7A78]/50"
                  }`}
                  onClick={() => toggleDigitalChannel("SMS")}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={selectedDigitalChannel.includes("SMS")} 
                      onCheckedChange={() => toggleDigitalChannel("SMS")}
                    />
                    <MessageSquare className="h-5 w-5" style={{ color: '#2B7A78' }} />
                    <div>
                      <p className="font-medium">SMS</p>
                      <p className="text-sm text-muted-foreground">{selectedMember?.mobile}</p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                    selectedDigitalChannel.includes("WhatsApp")
                      ? "border-[#2B7A78] bg-[#DFF5F4]/30"
                      : "border-border hover:border-[#2B7A78]/50"
                  }`}
                  onClick={() => toggleDigitalChannel("WhatsApp")}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={selectedDigitalChannel.includes("WhatsApp")} 
                      onCheckedChange={() => toggleDigitalChannel("WhatsApp")}
                    />
                    <Send className="h-5 w-5" style={{ color: '#2B7A78' }} />
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <p className="text-sm text-muted-foreground">{selectedMember?.mobile}</p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                    selectedDigitalChannel.includes("Email")
                      ? "border-[#2B7A78] bg-[#DFF5F4]/30"
                      : "border-border hover:border-[#2B7A78]/50"
                  }`}
                  onClick={() => toggleDigitalChannel("Email")}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={selectedDigitalChannel.includes("Email")} 
                      onCheckedChange={() => toggleDigitalChannel("Email")}
                    />
                    <Mail className="h-5 w-5" style={{ color: '#2B7A78' }} />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{selectedMember?.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectedDigitalChannel.length > 0 && (
              <Card style={{ backgroundColor: '#DFF5F4', border: 'none' }}>
                <CardContent className="pt-4">
                  <p className="text-sm">
                    <strong>Selected:</strong> {selectedDigitalChannel.join(", ")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDigitalSendDialog(false);
                setSelectedDigitalChannel([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendViaDigital}
              disabled={selectedDigitalChannel.length === 0}
              style={{ backgroundColor: '#2B7A78' }}
              className="text-white gap-2"
            >
              <Send className="h-4 w-4" />
              Send Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


