import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Eye,
  Send,
  MessageSquare,
  Mail,
  Calendar,
  ArrowLeft,
  Printer,
  FileText,
  User,
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";
import { receiptsService, Receipt as ApiReceipt } from "../utils/supabase/receipts-service";

interface MemberReceiptsProps {
  onNavigate?: (section: string) => void;
}

// Use the API Receipt type directly
type Receipt = ApiReceipt;

export function MemberReceipts({ onNavigate }: MemberReceiptsProps) {
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await receiptsService.getReceipts({}, { limit: 500 });
        setAllReceipts(res.receipts);
      } catch {
        toast.error("Failed to load receipts");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredReceipts = useMemo(() => {
    let filtered = [...allReceipts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.member_name?.toLowerCase().includes(q) ||
          r.member_id?.toLowerCase().includes(q) ||
          r.member_phone?.includes(searchQuery) ||
          r.receipt_no?.toLowerCase().includes(q)
      );
    }

    if (transactionTypeFilter !== "All") {
      filtered = filtered.filter((r) => r.transaction_type === transactionTypeFilter);
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    const today = new Date();
    if (dateFilter === "today") {
      filtered = filtered.filter(
        (r) => r.transaction_date && new Date(r.transaction_date).toDateString() === today.toDateString()
      );
    } else if (dateFilter === "week") {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((r) => r.transaction_date && new Date(r.transaction_date) >= weekAgo);
    } else if (dateFilter === "month") {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((r) => r.transaction_date && new Date(r.transaction_date) >= monthAgo);
    }

    return filtered.sort((a, b) => {
      const da = a.transaction_date ? new Date(a.transaction_date).getTime() : 0;
      const db = b.transaction_date ? new Date(b.transaction_date).getTime() : 0;
      return db - da;
    });
  }, [allReceipts, searchQuery, transactionTypeFilter, statusFilter, dateFilter]);

  const totalCollected = useMemo(() => {
    return filteredReceipts
      .filter((r) => r.status === "Paid")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [filteredReceipts]);

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsReceiptModalOpen(true);
  };

  const handleDownloadReceipt = (receipt: Receipt) => {
    toast.success(`Downloading receipt ${receipt.receipt_no}...`);
  };

  const handleSendWhatsApp = (receipt: Receipt) => {
    toast.success(`Receipt sent via WhatsApp to ${receipt.member_phone}`);
  };

  const handleSendSMS = (receipt: Receipt) => {
    toast.success(`Receipt sent via SMS to ${receipt.member_phone}`);
  };

  const handlePrintReceipt = (receipt: Receipt) => {
    toast.success(`Printing receipt ${receipt.receipt_no}...`);
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "Membership":
        return "bg-blue-100 text-blue-800";
      case "Renewal":
        return "bg-green-100 text-green-800";
      case "Add-on":
        return "bg-purple-100 text-purple-800";
      case "Daily Entry":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "Cash":
        return <DollarSign className="h-4 w-4" />;
      case "Card":
        return <CreditCard className="h-4 w-4" />;
      case "Online":
        return <CreditCard className="h-4 w-4" />;
      case "Wallet":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b bg-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-[#0047ab] to-[#00c5cb]">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl text-foreground">Member Receipts</h1>
                  <p className="text-muted-foreground">
                    View and manage all payment receipts
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => onNavigate && onNavigate("members")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Members
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Receipts</p>
                    <p className="text-2xl mt-1">{filteredReceipts.length}</p>
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
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-2xl mt-1">
                      {filteredReceipts.filter((r) => r.status === "Paid").length}
                    </p>
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
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl mt-1">
                      {filteredReceipts.filter((r) => r.status === "Pending").length}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-100">
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Collected</p>
                    <p className="text-2xl mt-1">AED {totalCollected}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-100">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters Section */}
          <div className="mb-4">
            <div className="bg-gradient-to-r from-[#0047ab] to-[#00c5cb] text-white p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-6 w-6" />
                <div>
                  <p className="text-sm opacity-90">Total Collected (Current Filter)</p>
                  <p className="text-2xl">AED {totalCollected.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Transactions</p>
                <p className="text-xl">{filteredReceipts.filter(r => r.status === "Paid").length} Paid</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by Name / ID / Mobile / Doc. No."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <SelectValue placeholder="Date Range" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={transactionTypeFilter}
              onValueChange={setTransactionTypeFilter}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Transaction Type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="Membership">New Membership</SelectItem>
                <SelectItem value="Renewal">Renewal / Upgrade</SelectItem>
                <SelectItem value="Add-on">Add-on Purchase</SelectItem>
                <SelectItem value="Daily Entry">Single-Day Entry</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Paid">✅ Paid</SelectItem>
                <SelectItem value="Pending">⏳ Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#0047ab]" />
            All Receipts
            <Badge variant="secondary">{filteredReceipts.length}</Badge>
          </h2>
          <div className="text-sm text-muted-foreground">
            Showing {filteredReceipts.length} of {allReceipts.length} receipts
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Receipt No.</TableHead>
                    <TableHead className="font-semibold">Member Name / ID</TableHead>
                    <TableHead className="font-semibold">Transaction Type</TableHead>
                    <TableHead className="font-semibold">Amount (AED)</TableHead>
                    <TableHead className="font-semibold">Payment Method</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Loading receipts...
                      </TableCell>
                    </TableRow>
                  ) : filteredReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No receipts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReceipts.map((receipt) => (
                      <TableRow key={receipt.id} className="hover:bg-muted/50">
                        <TableCell>
                          {receipt.transaction_date
                            ? new Date(receipt.transaction_date).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {receipt.receipt_no}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{receipt.member_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {receipt.member_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTransactionTypeColor(receipt.transaction_type)}>
                            {receipt.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {Number(receipt.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(receipt.payment_method)}
                            <span>{receipt.payment_method}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {receipt.status === "Paid" ? (
                            <Badge className="bg-green-100 text-green-800">
                              ✅ Paid
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-800">
                              ⏳ Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="hover:bg-[#0047ab]/10"
                              >
                                Actions ▼
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                onClick={() => handleViewReceipt(receipt)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2 text-blue-600" />
                                <span>View Receipt</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadReceipt(receipt)}
                                className="cursor-pointer"
                              >
                                <Download className="h-4 w-4 mr-2 text-green-600" />
                                <span>Download PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handlePrintReceipt(receipt)}
                                className="cursor-pointer"
                              >
                                <Printer className="h-4 w-4 mr-2 text-purple-600" />
                                <span>Print Receipt</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleSendWhatsApp(receipt)}
                                className="cursor-pointer"
                              >
                                <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                                <span>Send via WhatsApp</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSendSMS(receipt)}
                                className="cursor-pointer"
                              >
                                <Send className="h-4 w-4 mr-2 text-blue-600" />
                                <span>Send via SMS</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSendSMS(receipt)}
                                className="cursor-pointer"
                              >
                                <Mail className="h-4 w-4 mr-2 text-orange-600" />
                                <span>Send via Email</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Receipt Detail Modal */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Receipt #{selectedReceipt?.receipt_no}
            </DialogTitle>
            <DialogDescription>
              Member: {selectedReceipt?.member_name} | ID: {selectedReceipt?.member_id}
            </DialogDescription>
          </DialogHeader>

          {selectedReceipt && (
            <div className="space-y-6 py-4">
              {/* Transaction Summary */}
              <div>
                <h3 className="text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#0047ab]" />
                  Transaction Summary
                </h3>
                <Card className="bg-[#0047ab]/5 border-none">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Transaction Type
                        </Label>
                        <p className="mt-1">
                          <Badge className={getTransactionTypeColor(selectedReceipt.transaction_type)}>
                            {selectedReceipt.transaction_type}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Date</Label>
                        <p className="mt-1 font-medium">
                          {selectedReceipt.transaction_date
                            ? new Date(selectedReceipt.transaction_date).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Amount</Label>
                        <p className="mt-1 text-xl text-[#0047ab]">
                          AED {Number(selectedReceipt.amount).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Payment Method
                        </Label>
                        <p className="mt-1 font-medium flex items-center gap-2">
                          {getPaymentMethodIcon(selectedReceipt.payment_method)}
                          {selectedReceipt.payment_method}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Member & Plan Details */}
              <div>
                <h3 className="text-lg mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-[#0047ab]" />
                  Member & Plan Details
                </h3>
                <Card className="border-none bg-muted/50">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member Name:</span>
                      <span className="font-medium">{selectedReceipt.member_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member ID:</span>
                      <span className="font-medium">{selectedReceipt.member_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{selectedReceipt.member_phone}</span>
                    </div>
                    {selectedReceipt.plan_name && (
                      <>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Plan Name:</span>
                          <span className="font-medium">{selectedReceipt.plan_name}</span>
                        </div>
                        {selectedReceipt.valid_from && selectedReceipt.valid_till && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Validity:</span>
                            <span className="font-medium">
                              {new Date(selectedReceipt.valid_from).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              –{" "}
                              {new Date(selectedReceipt.valid_till).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Processing Details */}
              <div>
                <h3 className="text-lg mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#0047ab]" />
                  Processing Details
                </h3>
                <Card className="border-none bg-muted/50">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processed By:</span>
                      <span className="font-medium">{selectedReceipt.processed_by || "—"}</span>
                    </div>
                    {selectedReceipt.remarks && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Remarks:</span>
                        <span className="font-medium">{selectedReceipt.remarks}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span>
                        {selectedReceipt.status === "Paid" ? (
                          <Badge className="bg-green-100 text-green-800">
                            ✅ Paid
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800">
                            ⏳ Pending
                          </Badge>
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => selectedReceipt && handlePrintReceipt(selectedReceipt)}
              className="flex-1 gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedReceipt && handleDownloadReceipt(selectedReceipt)}
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              onClick={() => selectedReceipt && handleSendWhatsApp(selectedReceipt)}
              className="flex-1 gap-2 bg-[#25D366] text-white hover:bg-[#1eb855]"
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              onClick={() => selectedReceipt && handleSendSMS(selectedReceipt)}
              className="flex-1 gap-2 bg-gradient-to-r from-[#0047ab] to-[#00c5cb] text-white hover:opacity-90"
            >
              <Send className="h-4 w-4" />
              SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

