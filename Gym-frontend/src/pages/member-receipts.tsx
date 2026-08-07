import React, { useState, useEffect } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import {
  Search,
  Download,
  Send,
  Mail,
  MessageSquare,
  Phone,
  Printer,
  FileText,
  ArrowLeft,
  Loader2,
  CreditCard,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Checkbox } from "../components/ui/checkbox";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";
import { receiptsService, Receipt } from "../utils/supabase/receipts-service";
import { downloadReceiptInvoice } from "../utils/receipt-invoice";

interface MemberReceiptsProps {
  onNavigate?: (section: string) => void;
  embedded?: boolean;
}

// Mirrors Billing → Member Receipts exactly (same data source, same table,
// same view/download/send behavior) so the two stay visually and functionally
// identical wherever a receipts list is shown.
export function MemberReceipts({ onNavigate, embedded }: MemberReceiptsProps) {
  const { currencyCode } = useCurrency();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransactionType, setSelectedTransactionType] = useState("all-transactions");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [sendingReceipt, setSendingReceipt] = useState<Receipt | null>(null);
  const [sendChannels, setSendChannels] = useState<string[]>([]);

  useEffect(() => {
    const filters: { search?: string; transactionType?: string; status?: string } = {};
    if (searchTerm) filters.search = searchTerm;
    if (selectedTransactionType !== 'all-transactions') filters.transactionType = selectedTransactionType;
    if (selectedStatus !== 'all') filters.status = selectedStatus;

    setLoadingReceipts(true);
    receiptsService.getReceipts(filters, { limit: 50 })
      .then(r => setReceipts(r.receipts))
      .catch(console.error)
      .finally(() => setLoadingReceipts(false));
  }, [searchTerm, selectedTransactionType, selectedStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":     return "bg-green-100 text-green-800";
      case "Pending":  return "bg-yellow-100 text-yellow-800";
      case "Overdue":  return "bg-red-100 text-red-800";
      case "Partial":  return "bg-orange-100 text-orange-800";
      case "Due Soon": return "bg-orange-100 text-orange-800";
      default:         return "bg-gray-100 text-gray-800";
    }
  };

  const toggleChannel = (list: string[], setList: (v: string[]) => void, ch: string) =>
    setList(list.includes(ch) ? list.filter(c => c !== ch) : [...list, ch]);

  const handleDownloadReceipt = (receipt: Receipt) => {
    downloadReceiptInvoice(receipt, currencyCode);
  };

  const handleSendReceipt = () => {
    if (!sendingReceipt || sendChannels.length === 0) return;
    toast.success(`Receipt sent via ${sendChannels.join(', ')}`, {
      description: `${sendingReceipt.receipt_no} sent to ${sendingReceipt.member_name}`
    });
    setSendingReceipt(null);
    setSendChannels([]);
  };

  const handleExportAllReceipts = () => {
    if (receipts.length === 0) { toast.info('No receipts to export'); return; }
    const header = 'Receipt No,Member,Member ID,Plan,Type,Amount Paid,Remaining Due,Date & Time,Payment Method,Created By,Status\n';
    const rows = receipts.map(r => {
      const paid = Number(r.paid_amount ?? 0);
      const remainingDue = Number(r.balance_after ?? 0);
      return `"${r.receipt_no}","${r.member_name}","${r.member_id}","${r.plan_name ?? ''}","${r.transaction_type}","${paid.toFixed(2)}","${remainingDue.toFixed(2)}","${r.transaction_date ? new Date(r.transaction_date).toLocaleString() : ''}","${r.payment_method ?? ''}","${r.processed_by ?? ''}","${r.status}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${receipts.length} receipt(s)`);
  };

  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      {!embedded && (
        <div className="border-b bg-white">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-[#0047ab] to-[#00c5cb]">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl text-foreground">Member Receipts</h1>
                <p className="text-muted-foreground">View and manage all payment receipts</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => onNavigate && onNavigate("members")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Members
            </Button>
          </div>
        </div>
      )}

      <div className={embedded ? "" : "p-6"}>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Member Receipts</CardTitle>
                <CardDescription>All payment receipts and transaction history</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleExportAllReceipts}>
                  <Download className="mr-2 h-4 w-4" />Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by receipt #, member name, ID or phone..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={selectedTransactionType} onValueChange={setSelectedTransactionType}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-transactions">All Transactions</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Renewal">Renewal</SelectItem>
                  <SelectItem value="Add-on">Add-on</SelectItem>
                  <SelectItem value="Payment">Payment</SelectItem>
                  <SelectItem value="Daily Entry">Daily Entry</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingReceipts ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : receipts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No receipts found.</div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Transaction Date &amp; Time</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Remaining Due</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow key={receipt.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Every payment action — the bill's own initial payment, and each
                          later settlement — is its own immutable row with its own unique
                          receipt number. Two payments made at different times are NEVER
                          merged into one row; only legs paid within the SAME payment
                          event (below) are combined under one receipt. */}
                      <TableCell className="font-medium">{receipt.receipt_no}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {receipt.member_name?.split(' ').map(n => n[0]).join('') ?? '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{receipt.member_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {receipt.member_id}{receipt.plan_name ? ` · ${receipt.plan_name}` : ''}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{receipt.transaction_type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div><CurrencyGlyph /> {Number(receipt.paid_amount ?? 0).toLocaleString()}</div>
                        {receipt.transaction_type !== 'Payment' && Number(receipt.due_amount ?? 0) > 0 && (
                          <div className="text-xs font-normal text-amber-600">
                            of <CurrencyGlyph /> {Number(receipt.amount).toLocaleString()} — <CurrencyGlyph /> {Number(receipt.due_amount).toLocaleString()} due on this bill
                          </div>
                        )}
                        {/* Legs paid within this SAME payment event only (e.g. 20 Cash +
                            30 Card at one checkout) — never legs from separate payments
                            made at different times, which each get their own row instead. */}
                        {receipt.payment_breakdown && receipt.payment_breakdown.length > 1 && (
                          <div className="text-xs font-normal text-muted-foreground mt-0.5">
                            Split: {receipt.payment_breakdown
                              .map(leg => `${Number(leg.amount).toLocaleString()} (${leg.method})`)
                              .join(' + ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {receipt.transaction_date ? new Date(receipt.transaction_date).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                          {receipt.payment_method ?? '-'}
                        </div>
                      </TableCell>
                      <TableCell className={Number(receipt.balance_after ?? 0) > 0 ? 'text-red-600 font-medium' : ''}>
                        <CurrencyGlyph /> {Number(receipt.balance_after ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{receipt.processed_by ?? '-'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(receipt.status)}>{receipt.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline" size="sm"
                            className="h-8 w-8 p-0 border-primary/20 hover:bg-blue-50"
                            title="View Details"
                            onClick={() => setSelectedReceipt(receipt)}
                          >
                            <FileText className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            className="h-8 w-8 p-0 border-primary/20 hover:bg-green-50"
                            title="Download Receipt"
                            onClick={() => handleDownloadReceipt(receipt)}
                          >
                            <Download className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            className="h-8 w-8 p-0 border-primary/20 hover:bg-purple-50"
                            title="Send Receipt"
                            onClick={() => { setSendingReceipt(receipt); setSendChannels([]); }}
                          >
                            <Send className="h-4 w-4 text-purple-600" />
                          </Button>
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
      </div>

      {/* ── Receipt Details Dialog ── */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Receipt Details</DialogTitle>
              <DialogDescription>Complete details of the selected receipt transaction</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-bold text-lg">{selectedReceipt.receipt_no}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedReceipt.transaction_date ? new Date(selectedReceipt.transaction_date).toLocaleDateString() : '-'}
                  </div>
                </div>
                <Badge className={getStatusColor(selectedReceipt.status)}>{selectedReceipt.status}</Badge>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Member:</span>
                  <span className="text-sm">{selectedReceipt.member_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Member ID:</span>
                  <span className="text-sm">{selectedReceipt.member_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Plan:</span>
                  <span className="text-sm">{selectedReceipt.plan_name ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Transaction Type:</span>
                  <span className="text-sm">{selectedReceipt.transaction_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Payment Method:</span>
                  <span className="text-sm">{selectedReceipt.payment_method}</span>
                </div>
                {selectedReceipt.processed_by && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Processed By:</span>
                    <span className="text-sm">{selectedReceipt.processed_by}</span>
                  </div>
                )}
                {selectedReceipt.valid_from && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Valid From:</span>
                    <span className="text-sm">{new Date(selectedReceipt.valid_from).toLocaleDateString()}</span>
                  </div>
                )}
                {selectedReceipt.valid_till && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Valid Till:</span>
                    <span className="text-sm">{new Date(selectedReceipt.valid_till).toLocaleDateString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Total Amount:</span>
                  <span className="font-bold text-lg"><CurrencyGlyph /> {Number(selectedReceipt.amount).toLocaleString()}</span>
                </div>
                {(() => {
                  const paid = Number(selectedReceipt.paid_amount ?? 0);
                  const pending = Number(selectedReceipt.due_amount ?? 0);
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid (this transaction):</span>
                        <span>
                          <CurrencyGlyph /> {paid.toLocaleString()}
                        </span>
                      </div>
                      {pending > 0 && selectedReceipt.transaction_type !== 'Payment' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-amber-600 font-medium">Still due on this bill:</span>
                          <span className="text-amber-600 font-medium">
                            <CurrencyGlyph /> {pending.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining due (member balance):</span>
                  <span className={Number(selectedReceipt.balance_after ?? 0) > 0 ? 'text-red-600 font-medium' : ''}>
                    <CurrencyGlyph /> {Number(selectedReceipt.balance_after ?? 0).toLocaleString()}
                  </span>
                </div>
                {selectedReceipt.payment_breakdown && selectedReceipt.payment_breakdown.length > 1 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-sm text-muted-foreground">Payment Split (same transaction):</span>
                    {selectedReceipt.payment_breakdown.map((leg, idx) => (
                      <div key={idx} className="flex justify-between text-sm pl-2">
                        <span className="text-muted-foreground">{leg.method}{leg.reference ? ` — ${leg.reference}` : ''}</span>
                        <span><CurrencyGlyph /> {Number(leg.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleDownloadReceipt(selectedReceipt)}>
                <Download className="mr-2 h-4 w-4" />Download
              </Button>
              <Button onClick={() => { setSendingReceipt(selectedReceipt); setSendChannels([]); setSelectedReceipt(null); }}>
                <Send className="mr-2 h-4 w-4" />Send Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Send Receipt Dialog ── */}
      <Dialog open={!!sendingReceipt} onOpenChange={() => { setSendingReceipt(null); setSendChannels([]); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" style={{ color: '#2B7A78' }} />Send Receipt
            </DialogTitle>
            <DialogDescription>
              {sendingReceipt?.receipt_no} — {sendingReceipt?.member_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[
              { ch: 'Email',     icon: <Mail className="h-5 w-5 text-blue-600" />,        info: sendingReceipt?.member_id },
              { ch: 'SMS',       icon: <MessageSquare className="h-5 w-5 text-green-600" />, info: sendingReceipt?.member_phone },
              { ch: 'WhatsApp',  icon: <Phone className="h-5 w-5 text-green-700" />,       info: sendingReceipt?.member_phone },
              { ch: 'Print',     icon: <Printer className="h-5 w-5 text-gray-600" />,      info: 'Print a copy' },
            ].map(opt => (
              <div
                key={opt.ch}
                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                  sendChannels.includes(opt.ch) ? 'border-[#2B7A78] bg-[#DFF5F4]/30' : 'border-border hover:border-[#2B7A78]/50'
                }`}
                onClick={() => toggleChannel(sendChannels, setSendChannels, opt.ch)}
              >
                <Checkbox checked={sendChannels.includes(opt.ch)} onCheckedChange={() => toggleChannel(sendChannels, setSendChannels, opt.ch)} />
                {opt.icon}
                <div>
                  <p className="font-medium text-sm">{opt.ch}</p>
                  <p className="text-xs text-muted-foreground">{opt.info}</p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSendingReceipt(null); setSendChannels([]); }}>Cancel</Button>
            <Button
              disabled={sendChannels.length === 0}
              style={{ backgroundColor: '#2B7A78' }}
              className="text-white"
              onClick={handleSendReceipt}
            >
              <Send className="mr-2 h-4 w-4" />Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
