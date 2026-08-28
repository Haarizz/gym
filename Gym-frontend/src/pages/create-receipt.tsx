import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
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
  Eye,
  Loader2,
  Printer,
  FileCheck,
  Split
} from 'lucide-react';
import { toast } from "sonner";
import { getCompanyDetails } from "../utils/company-details";
import { getVatRate, splitVatInclusive } from "../utils/tax";
import { buildFullReceiptHtml, type ReceiptPrintData } from "../utils/receipt-invoice";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Checkbox } from "../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { format } from "date-fns";
import { membersService } from '../utils/supabase/members-service';
import type { Member } from '../utils/supabase/members-service';
import { billingService } from '../utils/supabase/billing-service';
import type { Receipt as ReceiptDTO } from '../utils/supabase/receipts-service';
import {
  SplitPaymentFields, isSplitPaymentValid, isSplitPaymentDetailsValid, buildSplitPaymentBreakdown,
  EMPTY_SPLIT_PAYMENT, EMPTY_SPLIT_DETAILS, CARD_TYPE_OPTIONS, ONLINE_PAYMENT_TYPE_OPTIONS
} from '../components/shared/split-payment-fields';
import type { SplitPaymentValue, SplitPaymentDetails } from '../components/shared/split-payment-fields';
import { accountHeadsService, AccountHead } from '../utils/supabase/account-heads-service';
import { staffService, Staff } from '../utils/supabase/staff-service';

// Maps the Payment Mode radio value to the SplitPaymentValue key so a single
// (non-Mixed) method's details can be validated/built by reusing the same
// helpers Mixed Payment legs use — the top-level method is just a Mixed
// payment with a single active leg.
const PAYMENT_MODE_TO_LEG_KEY: Partial<Record<string, keyof SplitPaymentValue>> = {
  Cash: 'cash', Card: 'card', Cheque: 'cheque', 'Bank Transfer': 'bankTransfer', Online: 'online'
};

interface CreateReceiptProps {
  onNavigate?: (section: string) => void;
  layout?: "page" | "modal";
}

export function CreateReceipt({ onNavigate, layout = "page" }: CreateReceiptProps) {
  const { currencyCode } = useCurrency();
  const isModal = layout === "modal";
  const panelCardClass = "border-primary/10 shadow-md hover:shadow-lg transition-shadow bg-white";
  const location = useLocation();
  const preSelectHandled = useRef(false);

  // Member search state
  const [searchTerm, setSearchTerm]           = useState("");
  const [memberSuggestions, setMemberSuggestions] = useState<Member[]>([]);
  const [searchLoading, setSearchLoading]     = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Selected member & pending bills
  const [selectedMember, setSelectedMember]   = useState<Member | null>(null);
  const [pendingBills, setPendingBills]        = useState<ReceiptDTO[]>([]);
  const [billsLoading, setBillsLoading]        = useState(false);

  // Payment state
  const [paymentAmounts, setPaymentAmounts]   = useState<Record<string, string>>({});
  const [paymentMode, setPaymentMode]         = useState("Cash");
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentDate, setPaymentDate]         = useState(format(new Date(), "yyyy-MM-dd"));
  const [autoApplyAmount, setAutoApplyAmount] = useState("");
  const [splitPayment, setSplitPayment]       = useState<SplitPaymentValue>(EMPTY_SPLIT_PAYMENT);
  const [splitDetails, setSplitDetails]       = useState<SplitPaymentDetails>(EMPTY_SPLIT_DETAILS);
  // Method-specific details for the top-level (non-Mixed) Payment Mode — Card
  // Type, Cheque Number, Bank Transfer reference/account, Online Payment type.
  const [methodDetails, setMethodDetails]     = useState<SplitPaymentDetails>(EMPTY_SPLIT_DETAILS);
  const [bankAccounts, setBankAccounts]       = useState<AccountHead[]>([]);
  // Which staff member actually collected this payment — credited toward their
  // revenue target regardless of which account is logged in.
  const [staffOptions, setStaffOptions]       = useState<Staff[]>([]);
  const [processedByStaffId, setProcessedByStaffId] = useState("");
  useEffect(() => {
    staffService.getStaff({}, 1, 500).then(res => setStaffOptions(res.items)).catch(() => {});
  }, []);
  useEffect(() => {
    accountHeadsService.getBankAccounts()
      .then(setBankAccounts)
      .catch(err => console.error('Failed to load bank accounts:', err));
  }, []);

  // Receipt result state
  const [submitting, setSubmitting]           = useState(false);
  const [receiptGenerated, setReceiptGenerated] = useState(false);
  const [generatedReceiptNo, setGeneratedReceiptNo] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Digital send state
  const [showDigitalSendDialog, setShowDigitalSendDialog] = useState(false);
  const [selectedDigitalChannel, setSelectedDigitalChannel] = useState<string[]>([]);

  // ── Member search with debounce ──────────────────────────────────────────
  const debouncedSearch = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (q: string) => {
        clearTimeout(timer);
        if (!q.trim()) { setMemberSuggestions([]); return; }
        setSearchLoading(true);
        timer = setTimeout(async () => {
          try {
            const results = await membersService.searchMembers(q);
            setMemberSuggestions(results);
          } catch {
            setMemberSuggestions([]);
          } finally {
            setSearchLoading(false);
          }
        }, 300);
      };
    })(),
    []
  );

  useEffect(() => { debouncedSearch(searchTerm); }, [searchTerm]);

  // ── Fetch pending bills when member selected ─────────────────────────────
  const handleSelectMember = async (member: Member) => {
    setSelectedMember(member);
    setSearchTerm("");
    setShowSuggestions(false);
    setPaymentAmounts({});
    setReceiptGenerated(false);
    setGeneratedReceiptNo("");
    setPendingBills([]);

    setBillsLoading(true);
    try {
      const bills = await billingService.getMemberPendingBills(Number(member.id));
      setPendingBills(bills);
    } catch (err) {
      toast.error("Failed to load pending bills");
    } finally {
      setBillsLoading(false);
    }
  };

  // ── Auto-select member when navigated from billing dues tab ──────────────
  useEffect(() => {
    if (preSelectHandled.current) return;
    const state = location.state as { preSelectMemberId?: string | number; preSelectMemberName?: string } | null;
    if (!state?.preSelectMemberId) return;
    preSelectHandled.current = true;

    (async () => {
      try {
        const member = await membersService.getMemberById(String(state.preSelectMemberId));
        if (member) await handleSelectMember(member);
      } catch {
        toast.error("Could not pre-load member from billing page");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Payment amount helpers ────────────────────────────────────────────────
  const handlePaymentAmountChange = (billId: string, value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setPaymentAmounts(prev => ({ ...prev, [billId]: value }));
    }
  };

  const calculateTotalPayment = () =>
    Object.values(paymentAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const calculateTotalDue = () =>
    pendingBills.reduce((s, b) => s + Number(b.due_amount ?? 0), 0);

  const calculateBalanceRemaining = () =>
    calculateTotalDue() - calculateTotalPayment();

  // ── FIFO auto-apply ───────────────────────────────────────────────────────
  const handleAutoApplyPayment = () => {
    const amountToApply = autoApplyAmount ? parseFloat(autoApplyAmount) : calculateTotalPayment();
    if (!amountToApply || amountToApply === 0) {
      toast.error("Please enter an amount to auto-apply");
      return;
    }

    let remaining = amountToApply;
    const newPayments: Record<string, string> = {};

    const sorted = [...pendingBills].sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    for (const bill of sorted) {
      if (remaining <= 0) break;
      const due = Number(bill.due_amount ?? 0);
      const alloc = Math.min(remaining, due);
      newPayments[bill.id] = alloc.toFixed(2);
      remaining -= alloc;
    }

    setPaymentAmounts(newPayments);
    toast.success(`${currencyCode} ${amountToApply.toFixed(2)} auto-applied using FIFO method`, {
      description: "Amount distributed to oldest bills first"
    });
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validatePayments = () => {
    const total = calculateTotalPayment();
    if (total === 0) { toast.error("Please enter a payment amount"); return false; }
    for (const bill of pendingBills) {
      const pay = parseFloat(paymentAmounts[bill.id] || "0");
      if (pay > Number(bill.due_amount ?? 0)) {
        toast.error(`Payment for ${bill.receipt_no} exceeds due amount`);
        return false;
      }
    }
    if (paymentMode === "Mixed") {
      if (!isSplitPaymentValid(splitPayment, total)) {
        toast.error("Split payment amounts must add up to the total payment");
        return false;
      }
      if (!isSplitPaymentDetailsValid(splitPayment, splitDetails)) {
        toast.error("Please fill in the required details for each payment method used in the split");
        return false;
      }
    } else {
      const legKey = PAYMENT_MODE_TO_LEG_KEY[paymentMode];
      if (legKey && legKey !== 'cash') {
        const probe: SplitPaymentValue = { ...EMPTY_SPLIT_PAYMENT, [legKey]: total };
        if (!isSplitPaymentDetailsValid(probe, methodDetails)) {
          toast.error(`Please fill in the required ${paymentMode} details`);
          return false;
        }
      }
    }
    return true;
  };

  // Builds the payment_breakdown leg(s) for whatever's currently selected —
  // several legs for Mixed, a single leg carrying the method's rich detail
  // (card type, cheque number, ...) for any other non-Cash method, none for
  // plain Cash (nothing extra to record beyond the amount itself).
  const buildBreakdownForSubmit = () => {
    const total = calculateTotalPayment();
    if (paymentMode === "Mixed") {
      return buildSplitPaymentBreakdown(splitPayment, splitDetails, bankAccounts);
    }
    const legKey = PAYMENT_MODE_TO_LEG_KEY[paymentMode];
    if (!legKey || legKey === 'cash') return undefined;
    const probe: SplitPaymentValue = { ...EMPTY_SPLIT_PAYMENT, [legKey]: total };
    return buildSplitPaymentBreakdown(probe, methodDetails, bankAccounts);
  };

  // ── Generate receipt (real API) ───────────────────────────────────────────
  const handleGenerateReceipt = async () => {
    if (!selectedMember || !validatePayments()) return;

    const billPayments = pendingBills
      .filter(b => parseFloat(paymentAmounts[b.id] || "0") > 0)
      .map(b => ({ receipt_id: Number(b.id), pay_amount: parseFloat(paymentAmounts[b.id]) }));

    if (billPayments.length === 0) { toast.error("No payment amounts entered"); return; }

    setSubmitting(true);
    try {
      const result = await billingService.settlePayment({
        member_db_id:    Number(selectedMember.id),
        payment_method:  paymentMode,
        payment_date:    paymentDate,
        transaction_ref: transactionReference || undefined,
        bill_payments:   billPayments,
        payment_breakdown: buildBreakdownForSubmit(),
        processed_by_staff_id: processedByStaffId ? Number(processedByStaffId) : undefined,
      });

      setGeneratedReceiptNo(result.receipt_no ?? "");
      setReceiptGenerated(true);
      setShowReceiptModal(true);
      toast.success("Receipt Generated Successfully!", {
        description: `Receipt ${result.receipt_no} created for ${currencyCode} ${calculateTotalPayment().toFixed(2)}`
      });
    } catch (err: any) {
      toast.error("Failed to generate receipt", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF  = () => handlePrintReceipt();

  // Guards against a stray double-click (or the separate Print/Download PDF
  // buttons both firing) opening two print windows/dialogs at once.
  const printInFlightRef = useRef(false);

  const handlePrintReceipt = async () => {
    if (printInFlightRef.current) return;
    printInFlightRef.current = true;

    // window.open must happen synchronously within the click handler or popup
    // blockers reject it, so open first and fill it in once company details load.
    const win = window.open("", "_blank", "width=800,height=900");
    const [company, vatRatePercent] = await Promise.all([getCompanyDetails(), getVatRate()]);

    const totalPaid   = calculateTotalPayment();
    const { net: subtotalExclVat, vat: vatAmount } = splitVatInclusive(totalPaid, vatRatePercent);
    const billedItems = pendingBills.filter(b => parseFloat(paymentAmounts[b.id] || "0") > 0);
    const dateStr     = new Date(paymentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    const printData: ReceiptPrintData = {
      receiptNo: generatedReceiptNo,
      dateStr,
      status: "Paid",
      billTo: {
        name: selectedMember?.name ?? "",
        memberId: selectedMember?.member_id,
        email: selectedMember?.email,
        phone: selectedMember?.phone,
      },
      items: billedItems.map(b => ({
        description: b.plan_name ?? b.transaction_type,
        subtitle: `Transaction Type: ${b.transaction_type}${b.invoice_no ? ` · Invoice: ${b.invoice_no}` : ''}`,
        type: b.transaction_type,
        amount: parseFloat(paymentAmounts[b.id]),
      })),
      currencyCode,
      subtotalExclVat,
      vatRatePercent,
      vatAmount,
      invoiceAmount: totalPaid,
      totalPaid,
      paymentMethod: paymentMode,
      transactionDate: dateStr,
      transactionRef: transactionReference || undefined,
    };

    const html = buildFullReceiptHtml(printData, company);

    if (win) { win.document.write(html); win.document.close(); }
    printInFlightRef.current = false;
  };
  const handleSendSMS      = () => toast.success("Sending via SMS",     { description: `Sent to ${selectedMember?.phone}` });
  const handleSendEmail    = () => toast.success("Sending via Email",   { description: `Sent to ${selectedMember?.email}` });
  const handleSendWhatsApp = () => toast.success("Sending via WhatsApp",{ description: `Sent to ${selectedMember?.phone}` });

  const handleSendViaDigital = () => {
    if (selectedDigitalChannel.length === 0) { toast.error("Please select at least one channel"); return; }
    toast.success("Receipt Sent Successfully!", { description: `Sent via ${selectedDigitalChannel.join(", ")}` });
    setShowDigitalSendDialog(false);
    setSelectedDigitalChannel([]);
  };

  const toggleDigitalChannel = (ch: string) =>
    setSelectedDigitalChannel(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);

  const resetForm = () => {
    setSelectedMember(null);
    setPendingBills([]);
    setPaymentAmounts({});
    setPaymentMode("Cash");
    setTransactionReference("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setReceiptGenerated(false);
    setGeneratedReceiptNo("");
    setAutoApplyAmount("");
    setSplitPayment(EMPTY_SPLIT_PAYMENT);
    setSplitDetails(EMPTY_SPLIT_DETAILS);
    setMethodDetails(EMPTY_SPLIT_DETAILS);
  };

  // Switching Payment Mode clears the previous method's detail fields so a
  // stale Card Type/Cheque Number doesn't linger into a different method.
  const handlePaymentModeChange = (mode: string) => {
    setPaymentMode(mode);
    setMethodDetails(EMPTY_SPLIT_DETAILS);
  };

  const membershipStatusLabel = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown";

  return (
    <div className={isModal ? "bg-background" : "min-h-screen bg-background"}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Create Receipt</h1>
            <p className="text-muted-foreground">Manage member receipts, dues, and payment collections.</p>
          </div>
          {!isModal && onNavigate && (
            <Button variant="outline" onClick={() => onNavigate("billing")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />Back to Billing
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left Column ── */}
          <div className="space-y-6">
            {/* Member Search */}
            <Card className={panelCardClass}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" style={{ color: '#2B7A78' }} />Find Member
                </CardTitle>
                <CardDescription>Search by Name, Mobile Number, Member ID, or Email</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by Name, Mobile Number, Member ID, or Email"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    className="pl-10"
                  />

                  {showSuggestions && searchTerm && (
                    <Card className="absolute z-10 w-full mt-2 max-h-80 overflow-y-auto border-slate-200/80 shadow-md">
                      <CardContent className="p-2">
                        {searchLoading ? (
                          <div className="flex justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        ) : memberSuggestions.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center p-4">No members found</p>
                        ) : memberSuggestions.map(member => (
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
                                  <span>{member.member_id}</span>
                                  <span>{member.phone}</span>
                                </div>
                              </div>
                              <Badge
                                variant={member.membership_status === "active" ? "default" : "destructive"}
                                className={member.membership_status === "active" ? "bg-green-100 text-green-800" : ""}
                              >
                                {membershipStatusLabel(member.membership_status)}
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
                    <User className="h-5 w-5" style={{ color: '#2B7A78' }} />Selected Member
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-gradient-to-r from-[#2B7A78] to-[#00c5cb] text-white text-xl">
                          {selectedMember.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-lg">{selectedMember.name}</h3>
                        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Hash className="h-4 w-4" />
                            <span>{selectedMember.member_id}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{selectedMember.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{selectedMember.email}</span>
                          </div>
                          <div>
                            <Badge
                              variant={selectedMember.membership_status === "active" ? "default" : "destructive"}
                              className={selectedMember.membership_status === "active" ? "bg-green-100 text-green-800" : ""}
                            >
                              {membershipStatusLabel(selectedMember.membership_status)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="sm" onClick={() => toast.info("Opening member profile...")} className="gap-2">
                        <Eye className="h-4 w-4" />View Profile
                      </Button>
                      <Button variant="ghost" size="sm" onClick={resetForm} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pending Bills / Outstanding Dues */}
            {selectedMember && (
              billsLoading ? (
                <Card className={panelCardClass}>
                  <CardContent className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </CardContent>
                </Card>
              ) : pendingBills.length > 0 ? (
                <Card className={panelCardClass}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" style={{ color: '#2B7A78' }} />
                        Pending Bills / Dues
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="autoApplyAmount" className="text-sm whitespace-nowrap">Amount:</Label>
                          <Input
                            id="autoApplyAmount"
                            type="text"
                            placeholder="Enter amount"
                            value={autoApplyAmount}
                            onChange={(e) => {
                              if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value))
                                setAutoApplyAmount(e.target.value);
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
                          <CheckCircle className="h-4 w-4" />Auto-Apply Payment
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
                          <tr>
                            <th className="text-left py-3 px-2 text-sm font-semibold">Doc. No</th>
                            <th className="text-left py-3 px-2 text-sm font-semibold">Date</th>
                            <th className="text-left py-3 px-2 text-sm font-semibold">Transaction Type</th>
                            <th className="text-right py-3 px-2 text-sm font-semibold">Actual</th>
                            <th className="text-right py-3 px-2 text-sm font-semibold">Paid</th>
                            <th className="text-right py-3 px-2 text-sm font-semibold">Due</th>
                            <th className="text-center py-3 px-2 text-sm font-semibold">Due Date</th>
                            <th className="text-right py-3 px-2 text-sm font-semibold">Pay Now</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingBills.map(bill => {
                            const isOverdue = bill.due_date ? new Date(bill.due_date) < new Date() : false;
                            const hasPayment = paymentAmounts[bill.id] && parseFloat(paymentAmounts[bill.id]) > 0;
                            return (
                              <tr
                                key={bill.id}
                                className={`border-b border-gray-100 hover:bg-slate-50/50 transition-colors ${hasPayment ? 'bg-[#DFF5F4]/20' : ''}`}
                              >
                                <td className="py-3 px-2 font-medium text-sm">{bill.receipt_no}</td>
                                <td className="py-3 px-2 text-sm text-muted-foreground">
                                  {bill.transaction_date ? new Date(bill.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                </td>
                                <td className="py-3 px-2 text-sm">
                                  {bill.transaction_type}
                                  {bill.minor_charges && bill.minor_charges.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                      {bill.minor_charges.map((mc, i) => (
                                        <div key={i} className="text-xs text-amber-700 italic">
                                          Due of {mc.name} (<CurrencyGlyph /> {Number(mc.amount).toFixed(2)}) — billed to {selectedMember?.name}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-2 text-right text-sm"><CurrencyGlyph /> {Number(bill.amount).toFixed(2)}</td>
                                <td className="py-3 px-2 text-right text-sm text-green-600">
                                  <CurrencyGlyph /> {Number(bill.paid_amount ?? 0).toFixed(2)}
                                </td>
                                <td className="py-3 px-2 text-right text-sm">
                                  <CurrencyGlyph /> {Number(bill.due_amount ?? 0).toFixed(2)}
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-xs">
                                    {bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-2">
                                  <Input
                                    type="text"
                                    placeholder="0.00"
                                    value={paymentAmounts[bill.id] || ""}
                                    onChange={(e) => handlePaymentAmountChange(bill.id, e.target.value)}
                                    className="text-right w-28"
                                    style={{ borderColor: paymentAmounts[bill.id] ? '#2B7A78' : '' }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50/50">
                            <td colSpan={7} className="py-3 px-2 text-right text-sm">Total to Pay Now:</td>
                            <td className="py-3 px-2 text-right">
                              <span className="text-lg" style={{ color: '#2B7A78' }}>
                                <CurrencyGlyph /> {calculateTotalPayment().toFixed(2)}
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
                              <strong>FIFO Method Applied:</strong> Amount distributed to oldest bills first
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className={panelCardClass}>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                      <p className="text-lg mb-1">No Outstanding Dues</p>
                      <p className="text-sm text-muted-foreground">This member has no pending payments</p>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-6">
            {/* Settle Payment */}
            {selectedMember && pendingBills.length > 0 && (
              <Card className={panelCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" style={{ color: '#2B7A78' }} />Settle Payment
                  </CardTitle>
                  <CardDescription>Choose payment method and enter transaction details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Payment Mode */}
                  <div>
                    <Label className="text-base mb-3 block">Payment Mode *</Label>
                    <RadioGroup value={paymentMode} onValueChange={handlePaymentModeChange}>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: "Cash",          icon: <Wallet className="h-5 w-5" />,        label: "Cash" },
                          { value: "Card",          icon: <CreditCard className="h-5 w-5" />,    label: "Card" },
                          { value: "Cheque",        icon: <FileCheck className="h-5 w-5" />,     label: "Cheque" },
                          { value: "Mixed",         icon: <Split className="h-5 w-5" />,         label: "Mixed" },
                          { value: "Bank Transfer", icon: <Building2 className="h-5 w-5" />,     label: "Bank Transfer" },
                          { value: "Online",        icon: <DollarSign className="h-5 w-5" />,    label: "Online" },
                        ].map(opt => (
                          <div
                            key={opt.value}
                            className={`flex items-center space-x-2 border rounded-xl p-4 cursor-pointer transition-all ${
                              paymentMode === opt.value ? "border-[#2B7A78] bg-[#DFF5F4]/30" : "border-border hover:border-[#2B7A78]/50"
                            }`}
                            onClick={() => handlePaymentModeChange(opt.value)}
                          >
                            <RadioGroupItem value={opt.value} id={opt.value} />
                            <Label htmlFor={opt.value} className="flex items-center gap-2 cursor-pointer flex-1">
                              {opt.icon}{opt.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Mixed Payment Split */}
                  {paymentMode === "Mixed" && (
                    <SplitPaymentFields
                      total={calculateTotalPayment()}
                      value={splitPayment}
                      onChange={setSplitPayment}
                      details={splitDetails}
                      onDetailsChange={setSplitDetails}
                      bankAccounts={bankAccounts}
                      currencyCode={currencyCode}
                    />
                  )}

                  {/* Card details */}
                  {paymentMode === "Card" && (
                    <div className="space-y-3 p-3 border rounded-lg bg-[#F9FAFB]">
                      <div>
                        <Label className="text-xs">Card Type <span className="text-red-500">*</span></Label>
                        <Select value={methodDetails.cardType} onValueChange={(v) => setMethodDetails(prev => ({ ...prev, cardType: v }))}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select card type" /></SelectTrigger>
                          <SelectContent>
                            {CARD_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Reference (optional)</Label>
                        <Input
                          value={methodDetails.cardReference}
                          onChange={(e) => setMethodDetails(prev => ({ ...prev, cardReference: e.target.value }))}
                          className="mt-1"
                          placeholder="Transaction number"
                        />
                      </div>
                    </div>
                  )}

                  {/* Cheque details */}
                  {paymentMode === "Cheque" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-lg bg-[#F9FAFB]">
                      <div>
                        <Label className="text-xs">Cheque Number <span className="text-red-500">*</span></Label>
                        <Input
                          value={methodDetails.chequeNumber}
                          onChange={(e) => setMethodDetails(prev => ({ ...prev, chequeNumber: e.target.value }))}
                          className="mt-1"
                          placeholder="Cheque number"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Bank Name (optional)</Label>
                        <Input
                          value={methodDetails.chequeBankName}
                          onChange={(e) => setMethodDetails(prev => ({ ...prev, chequeBankName: e.target.value }))}
                          className="mt-1"
                          placeholder="e.g. SBI"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Cheque Date (optional)</Label>
                        <Input
                          type="date"
                          value={methodDetails.chequeDate}
                          onChange={(e) => setMethodDetails(prev => ({ ...prev, chequeDate: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Bank Transfer details */}
                  {paymentMode === "Bank Transfer" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border rounded-lg bg-[#F9FAFB]">
                      <div>
                        <Label className="text-xs">Reference <span className="text-red-500">*</span></Label>
                        <Input
                          value={methodDetails.bankTransferReference}
                          onChange={(e) => setMethodDetails(prev => ({ ...prev, bankTransferReference: e.target.value }))}
                          className="mt-1"
                          placeholder="Transaction ID"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Bank Account (Ledger)</Label>
                        <Select
                          value={methodDetails.bankTransferAccountId}
                          onValueChange={(v) => setMethodDetails(prev => ({ ...prev, bankTransferAccountId: v }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={bankAccounts.length ? 'Select bank account' : 'No bank accounts in ledger'} />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map(account => (
                              <SelectItem key={account.id} value={String(account.id)}>{account.code} — {account.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Online Payment details */}
                  {paymentMode === "Online" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border rounded-lg bg-[#F9FAFB]">
                      <div>
                        <Label className="text-xs">Payment Type <span className="text-red-500">*</span></Label>
                        <Select
                          value={methodDetails.onlinePaymentType}
                          onValueChange={(v) => setMethodDetails(prev => ({ ...prev, onlinePaymentType: v }))}
                        >
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select payment type" /></SelectTrigger>
                          <SelectContent>
                            {ONLINE_PAYMENT_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Transaction / Reference ID <span className="text-red-500">*</span></Label>
                        <Input
                          value={methodDetails.onlineReference}
                          onChange={(e) => setMethodDetails(prev => ({ ...prev, onlineReference: e.target.value }))}
                          className="mt-1"
                          placeholder="Transaction ID"
                        />
                      </div>
                      {methodDetails.onlinePaymentType === 'Other' && (
                        <div className="md:col-span-2">
                          <Label className="text-xs">Payment Provider Name <span className="text-red-500">*</span></Label>
                          <Input
                            value={methodDetails.onlineProviderName}
                            onChange={(e) => setMethodDetails(prev => ({ ...prev, onlineProviderName: e.target.value }))}
                            className="mt-1"
                            placeholder="Provider name"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transaction Reference */}
                  {(paymentMode !== "Cash") && (
                    <div>
                      <Label htmlFor="transactionRef">Transaction Reference (Optional)</Label>
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

                  {/* Processed By (Staff) — credits this payment toward that staff member's revenue target */}
                  <div>
                    <Label htmlFor="processedByStaff">Processed By (Staff) <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                    <Select value={processedByStaffId || undefined} onValueChange={setProcessedByStaffId}>
                      <SelectTrigger id="processedByStaff" className="mt-2"><SelectValue placeholder="Select staff member" /></SelectTrigger>
                      <SelectContent>
                        {staffOptions.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Finalize Receipt */}
            {selectedMember && pendingBills.length > 0 && (
              <Card className={`${panelCardClass} ring-1 ring-[#2B7A78]/20`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" style={{ color: '#2B7A78' }} />Finalize Receipt
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded-lg">
                      <span className="text-muted-foreground">Total Outstanding:</span>
                      <span className="text-lg"><CurrencyGlyph /> {calculateTotalDue().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#DFF5F4] rounded-lg">
                      <span>Receipt Total:</span>
                      <span className="text-xl" style={{ color: '#2B7A78' }}><CurrencyGlyph /> {calculateTotalPayment().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded-lg">
                      <span className="text-muted-foreground">Balance Remaining:</span>
                      <span className={`text-lg ${calculateBalanceRemaining() > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        <CurrencyGlyph /> {calculateBalanceRemaining().toFixed(2)}
                      </span>
                    </div>
                    {calculateBalanceRemaining() < 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <p className="text-sm text-red-800"><strong>Warning:</strong> Payment exceeds total due amount</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    {!receiptGenerated ? (
                      <>
                        <Button
                          onClick={handleGenerateReceipt}
                          disabled={calculateTotalPayment() === 0 || submitting}
                          className="w-full text-white gap-2"
                          style={{ backgroundColor: '#2B7A78' }}
                          size="lg"
                        >
                          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                          {submitting ? "Generating..." : "Generate Receipt"}
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
                          <p className="font-semibold text-green-800 mb-1">Receipt Generated Successfully!</p>
                          <p className="text-sm text-green-700">Receipt #{generatedReceiptNo}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                            <Download className="h-4 w-4" />Download PDF
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handlePrintReceipt}
                            className="gap-2"
                            style={{ borderColor: '#2B7A78', color: '#2B7A78' }}
                          >
                            <Printer className="h-4 w-4" />Print Receipt
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowDigitalSendDialog(true)}
                            className="gap-2"
                          >
                            <Send className="h-4 w-4" />Send via Digital
                          </Button>
                          <Button variant="outline" onClick={handleSendEmail} className="gap-2">
                            <Mail className="h-4 w-4" />Email
                          </Button>
                          <Button variant="outline" onClick={handleSendSMS} className="gap-2">
                            <MessageSquare className="h-4 w-4" />SMS
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

            {/* Instructions */}
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
                        ].map(f => (
                          <div key={f} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5" />
                            <span>{f}</span>
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
              <CheckCircle className="h-6 w-6 text-green-600" />Receipt Generated Successfully
            </DialogTitle>
            <DialogDescription>Receipt #{generatedReceiptNo}</DialogDescription>
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
                    <span className="font-medium">{selectedMember?.member_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Date:</span>
                    <span className="font-medium">
                      {new Date(paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                {pendingBills.map(bill => {
                  const amount = paymentAmounts[bill.id];
                  if (!amount || parseFloat(amount) === 0) return null;
                  return (
                    <div key={bill.id} className="flex justify-between text-sm p-2 bg-[#DFF5F4]/30 rounded">
                      <div>
                        <span className="font-medium">{bill.receipt_no}</span>
                        <span className="text-muted-foreground ml-2">- {bill.transaction_type}</span>
                        {bill.minor_charges && bill.minor_charges.length > 0 && (
                          <div className="text-xs text-amber-700 italic">
                            Due of {bill.minor_charges.map(mc => mc.name).join(', ')} — paid by {selectedMember?.name}
                          </div>
                        )}
                      </div>
                      <span className="font-medium"><CurrencyGlyph /> {parseFloat(amount).toFixed(2)}</span>
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
                    <CurrencyGlyph /> {calculateTotalPayment().toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowReceiptModal(false)}>Close</Button>
            <Button variant="outline" onClick={handlePrintReceipt} className="gap-2" style={{ borderColor: '#2B7A78', color: '#2B7A78' }}>
              <Printer className="h-4 w-4" />Print
            </Button>
            <Button onClick={handleDownloadPDF} style={{ backgroundColor: '#2B7A78' }} className="text-white gap-2">
              <Download className="h-4 w-4" />Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send via Digital Dialog */}
      <Dialog open={showDigitalSendDialog} onOpenChange={setShowDigitalSendDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Send className="h-6 w-6" style={{ color: '#2B7A78' }} />Send Receipt via Digital Channels
            </DialogTitle>
            <DialogDescription>Select one or more channels to send the receipt</DialogDescription>
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
                      <CurrencyGlyph /> {calculateTotalPayment().toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div>
              <Label className="text-base mb-3 block">Select Channels *</Label>
              <div className="space-y-3">
                {[
                  { ch: "SMS",       icon: <MessageSquare className="h-5 w-5" style={{ color: '#2B7A78' }} />, contact: selectedMember?.phone },
                  { ch: "WhatsApp",  icon: <Send className="h-5 w-5" style={{ color: '#2B7A78' }} />,         contact: selectedMember?.phone },
                  { ch: "Email",     icon: <Mail className="h-5 w-5" style={{ color: '#2B7A78' }} />,         contact: selectedMember?.email },
                ].map(opt => (
                  <div
                    key={opt.ch}
                    className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedDigitalChannel.includes(opt.ch)
                        ? "border-[#2B7A78] bg-[#DFF5F4]/30" : "border-border hover:border-[#2B7A78]/50"
                    }`}
                    onClick={() => toggleDigitalChannel(opt.ch)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selectedDigitalChannel.includes(opt.ch)} onCheckedChange={() => toggleDigitalChannel(opt.ch)} />
                      {opt.icon}
                      <div>
                        <p className="font-medium">{opt.ch}</p>
                        <p className="text-sm text-muted-foreground">{opt.contact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedDigitalChannel.length > 0 && (
              <Card style={{ backgroundColor: '#DFF5F4', border: 'none' }}>
                <CardContent className="pt-4">
                  <p className="text-sm"><strong>Selected:</strong> {selectedDigitalChannel.join(", ")}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowDigitalSendDialog(false); setSelectedDigitalChannel([]); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSendViaDigital}
              disabled={selectedDigitalChannel.length === 0}
              style={{ backgroundColor: '#2B7A78' }}
              className="text-white gap-2"
            >
              <Send className="h-4 w-4" />Send Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
