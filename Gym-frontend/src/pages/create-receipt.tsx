import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { useLocation } from 'react-router-dom';
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
  Eye,
  Loader2,
  Printer
} from 'lucide-react';
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Checkbox } from "../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { format } from "date-fns";
import { membersService } from '../utils/supabase/members-service';
import type { Member } from '../utils/supabase/members-service';
import { billingService } from '../utils/supabase/billing-service';
import type { Receipt as ReceiptDTO } from '../utils/supabase/receipts-service';

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
    return true;
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

  const handlePrintReceipt = () => {
    const totalPaid   = calculateTotalPayment();
    const vatAmount   = totalPaid * 5 / 105;
    const preVat      = totalPaid - vatAmount;
    const billedItems = pendingBills.filter(b => parseFloat(paymentAmounts[b.id] || "0") > 0);
    const dateStr     = new Date(paymentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const txnDateStr  = new Date(paymentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    const rows = billedItems.map(b => `
      <tr>
        <td><strong>${b.plan_name ?? b.transaction_type}</strong><br/><small>Transaction Type: ${b.transaction_type}</small></td>
        <td>${b.transaction_type}</td>
        <td style="text-align:right"><strong>${currencyCode} ${parseFloat(paymentAmounts[b.id]).toFixed(2)}</strong></td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Tax Invoice - ${generatedReceiptNo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:#fff;padding:40px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
  .brand h1{font-size:28px;font-weight:800;color:#2B7A78}
  .brand p{color:#666;font-size:13px;margin-top:2px}
  .brand .address{margin-top:12px;font-size:12px;color:#444;line-height:1.6}
  .verify-box{border:2px solid #2B7A78;border-radius:8px;padding:10px 14px;text-align:center;min-width:140px}
  .verify-box .bolt{font-size:22px;color:#f4a30a}
  .verify-box .label{font-size:10px;font-weight:700;color:#2B7A78;letter-spacing:1px;text-transform:uppercase;margin-top:4px}
  .verify-box .rcpt{font-size:11px;color:#444;margin-top:2px}
  hr.thick{border:none;border-top:3px solid #2B7A78;margin:16px 0}
  hr.thin{border:none;border-top:1px solid #e5e7eb;margin:20px 0}
  .title{text-align:center;font-size:22px;font-weight:700;margin:20px 0;color:#1a1a1a}
  .meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}
  .meta-item .label{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888}
  .meta-item .value{font-size:15px;font-weight:700;color:#2B7A78;margin-top:4px}
  .meta-item .value.black{color:#1a1a1a}
  .meta-item .status{display:inline-block;color:#16a34a;font-weight:600}
  .bill-to{border-left:4px solid #2B7A78;padding-left:14px;margin:24px 0}
  .bill-to .section-label{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#2B7A78;margin-bottom:8px}
  .bill-to .name{font-size:17px;font-weight:700;margin-bottom:6px}
  .bill-to .detail{font-size:13px;color:#444;margin:2px 0}
  table{width:100%;border-collapse:collapse;margin:16px 0}
  thead tr{border-bottom:1px solid #e5e7eb}
  thead th{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;padding:8px 4px;text-align:left}
  thead th:last-child{text-align:right}
  tbody td{padding:12px 4px;font-size:13px;border-bottom:1px solid #f3f4f6;vertical-align:top}
  tbody td:last-child{text-align:right}
  tbody td small{color:#888;font-size:11px}
  .totals{margin-top:8px}
  .totals .row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}
  .totals .row.bold{font-weight:700}
  .totals .row.total-final{font-size:18px;font-weight:800;color:#2B7A78;padding-top:12px;border-top:2px solid #2B7A78;margin-top:6px}
  .totals .row.total-paid{padding-top:8px;font-size:13px;color:#444}
  .validity{font-size:12px;font-weight:600;color:#2B7A78;margin:16px 0}
  .payment-box{border-left:4px solid #f4a30a;padding-left:12px;margin:16px 0}
  .payment-box .row{font-size:13px;margin:4px 0}
  .payment-box .row span{font-weight:700;color:#2B7A78;margin-left:4px}
  .thank-you{text-align:center;margin:32px 0 16px}
  .thank-you h3{font-size:18px;font-weight:700;color:#2B7A78}
  .thank-you p{font-size:12px;color:#666;margin-top:6px;line-height:1.6}
  .footer{border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;font-size:12px;color:#888;line-height:1.8}
  .footer strong{color:#1a1a1a}
  @media print{body{padding:20px}}
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>GymBios</h1>
      <p>Wellness Services Operating System</p>
      <div class="address">
        Dubai, United Arab Emirates<br/>
        Phone: +971 4 XXX XXXX | Email: billing@gymbios.ae<br/>
        TRN: 100XXXXXXXX003
      </div>
    </div>
    <div class="verify-box">
      <div class="bolt">&#9889;</div>
      <div class="label">Receipt Verification</div>
      <div class="rcpt">${generatedReceiptNo}</div>
    </div>
  </div>

  <hr class="thick"/>

  <div class="title">Tax Invoice &nbsp; &#1601;&#1575;&#1578;&#1608;&#1585;&#1577; &#1590;&#1585;&#1610;&#1576;&#1610;&#1577;</div>

  <div class="meta-grid">
    <div class="meta-item">
      <div class="label">Receipt Number</div>
      <div class="value">${generatedReceiptNo}</div>
    </div>
    <div class="meta-item">
      <div class="label">Date Issued</div>
      <div class="value black">${dateStr}</div>
    </div>
    <div class="meta-item">
      <div class="label">Status</div>
      <div class="value"><span class="status">Paid</span></div>
    </div>
  </div>

  <hr class="thin"/>

  <div class="bill-to">
    <div class="section-label">Bill To</div>
    <div class="name">${selectedMember?.name ?? ""}</div>
    <div class="detail"><strong>Member ID:</strong> ${selectedMember?.member_id ?? ""}</div>
    <div class="detail"><strong>Email:</strong> ${selectedMember?.email ?? ""}</div>
    <div class="detail"><strong>Phone:</strong> ${selectedMember?.phone ?? ""}</div>
  </div>

  <hr class="thin"/>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Type</th>
        <th style="text-align:right">Amount (Incl. VAT)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <hr class="thin"/>

  <div class="totals">
    <div class="row"><span>Subscription Total (Incl. VAT):</span><span>${currencyCode} ${totalPaid.toFixed(2)}</span></div>
    <div class="row bold" style="color:#c00">Discount: <span>- ${currencyCode} 0.00</span></div>
    <div class="row bold"><span>Gross Total:</span><span>${currencyCode} ${totalPaid.toFixed(2)}</span></div>
    <div class="row"><span>VAT (5%):</span><span>${currencyCode} ${vatAmount.toFixed(2)}</span></div>
    <div class="row total-final"><span>Invoice Amount:</span><span>${currencyCode} ${totalPaid.toFixed(2)}</span></div>
    <div class="row total-paid"><span>TOTAL PAID:</span><span>${currencyCode} ${totalPaid.toFixed(2)}</span></div>
  </div>

  <hr class="thin"/>

  <div class="payment-box">
    <div class="row">Payment Method: <span>${paymentMode}</span></div>
    <div class="row">Transaction Date: <span>${txnDateStr}</span></div>
    ${transactionReference ? `<div class="row">Transaction Ref: <span>${transactionReference}</span></div>` : ""}
  </div>

  <div class="thank-you">
    <h3>Thank you for your business!</h3>
    <p>This is an official receipt issued by GymBios. Please retain this receipt for your records.<br/>
    For any queries regarding this transaction, please contact our billing department.</p>
  </div>

  <hr class="thin"/>

  <div class="footer">
    <strong>GymBios - Wellness Services Operating System</strong><br/>
    Dubai, United Arab Emirates | Phone: +971 4 XXX XXXX<br/>
    Email: support@gymbios.ae | Website: www.gymbios.ae<br/>
    TRN: 100XXXXXXXX003
  </div>

  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=800,height=900");
    if (win) { win.document.write(html); win.document.close(); }
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
                                <td className="py-3 px-2 text-sm">{bill.transaction_type}</td>
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
                    <RadioGroup value={paymentMode} onValueChange={setPaymentMode}>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: "Cash",          icon: <Wallet className="h-5 w-5" />,        label: "Cash" },
                          { value: "Card",          icon: <CreditCard className="h-5 w-5" />,    label: "Card" },
                          { value: "Bank Transfer", icon: <Building2 className="h-5 w-5" />,     label: "Bank Transfer" },
                          { value: "Online",        icon: <DollarSign className="h-5 w-5" />,    label: "Online" },
                        ].map(opt => (
                          <div
                            key={opt.value}
                            className={`flex items-center space-x-2 border rounded-xl p-4 cursor-pointer transition-all ${
                              paymentMode === opt.value ? "border-[#2B7A78] bg-[#DFF5F4]/30" : "border-border hover:border-[#2B7A78]/50"
                            }`}
                            onClick={() => setPaymentMode(opt.value)}
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
