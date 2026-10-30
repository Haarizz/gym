import React, { useState, useMemo } from "react";
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
  Receipt,
  Wallet,
  Gift,
  BadgeDollarSign,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner@2.0.3";

interface MemberReceiptsProps {
  onNavigate?: (section: string) => void;
  embedded?: boolean;
}

interface Receipt {
  id: string;
  receiptNo: string;
  invoiceNo: string;
  date: Date;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberPhone: string;
  transactionType: "Membership" | "Renewal" | "Add-on" | "Daily Entry" | "Upgrade";
  amount: number;
  discount: number;
  vatApplicable: boolean;
  paymentMethod: "Cash" | "Card" | "Online" | "Wallet" | "Bank Transfer";
  status: "Paid" | "Pending";
  planName?: string;
  validFrom?: Date;
  validTill?: Date;
  processedBy: string;
  remarks?: string;
}

interface CustomerCredit {
  id: string;
  creditNo: string;
  date: Date;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberPhone: string;
  creditType: "Prepaid Credit" | "Refund as Credit" | "Promotional Credit" | "Loyalty Credit";
  amount: number;
  usedAmount: number;
  balance: number;
  linkedInvoice?: string;
  status: "Active" | "Fully Used" | "Expired" | "Pending";
  processedBy: string;
  expiryDate?: Date;
  remarks?: string;
}

const escapeHtml = (value: string | number | undefined) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const downloadableDocument = (title: string, content: string) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap");
    *{box-sizing:border-box}body{margin:0;padding:32px;background:#eef5f3;color:#182522;font-family:Inter,Arial,sans-serif}
    .doc{max-width:820px;margin:auto;overflow:hidden;background:#fff;border:1px solid #d9e8e4;border-radius:16px;box-shadow:0 20px 60px rgba(31,90,82,.12)}
    header{display:flex;justify-content:space-between;gap:30px;padding:30px;color:#fff;background:linear-gradient(135deg,#327F74,#1F5A52)}
    h1,h2{margin:0;font-family:"Plus Jakarta Sans",sans-serif}.brand{font-size:28px}.right{text-align:right}.eyebrow,.label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
    .muted{margin-top:7px;color:rgba(255,255,255,.72);font-size:11px;line-height:1.6}.reference{display:inline-block;margin-top:13px;padding:8px 12px;border:1px solid rgba(255,255,255,.35);border-radius:8px;font-size:12px}
    .meta{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #e5ecea}.meta>div{padding:18px 22px;border-right:1px solid #e5ecea}.meta>div:last-child{border:0}
    .label{margin-bottom:5px;color:#6b7d78}.value{font-weight:700}.accent{color:#327F74}.content{padding:26px 32px 32px}
    .customer{margin-bottom:22px;padding:18px;background:#f0f9f7;border-left:4px solid #327F74;border-radius:8px}.customer h2{margin-bottom:7px;font-size:16px}.customer p{margin:3px 0;color:#5d6d69;font-size:12px}
    table{width:100%;margin-bottom:22px;border-collapse:collapse}th{padding:12px 14px;color:#fff;background:#327F74;font-size:10px;letter-spacing:.07em;text-align:left;text-transform:uppercase}td{padding:14px;border-bottom:1px solid #e5ecea;font-size:13px}th:last-child,td:last-child{text-align:right}
    .summary{width:min(390px,100%);margin-left:auto;padding:18px;background:#f7faf9;border-radius:10px}.row{display:flex;justify-content:space-between;gap:20px;margin:9px 0;font-size:13px}.total{margin-top:13px;padding-top:13px;color:#327F74;border-top:2px solid #327F74;font-size:16px;font-weight:800}
    .note{margin-top:22px;padding:15px 18px;color:#684b05;background:#fffbeb;border-left:4px solid #F5C742;border-radius:8px;font-size:12px;line-height:1.6}
    footer{margin-top:26px;padding-top:18px;color:#84918e;border-top:1px solid #e5ecea;font-size:10px;line-height:1.7;text-align:center}
    @media print{body{padding:0;background:#fff}.doc{max-width:none;border:0;border-radius:0;box-shadow:none}@page{size:A4;margin:12mm}}
    @media(max-width:620px){body{padding:0}.doc{border-radius:0}header{flex-direction:column}.right{text-align:left}.meta{grid-template-columns:1fr}.meta>div{border-right:0;border-bottom:1px solid #e5ecea}.content{padding:22px 18px}}
  </style>
</head>
<body>${content}</body>
</html>`;

const receiptVoucherHtml = (receipt: Receipt) => {
  const date = receipt.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const gross = receipt.amount - receipt.discount;
  const vat = receipt.vatApplicable ? gross * 0.05 : 0;
  const total = gross + vat;
  return downloadableDocument(`${receipt.receiptNo} Receipt Voucher`, `<main class="doc">
    <header><div><h1 class="brand">GymBios</h1><div class="muted">Wellness Services Operating System<br>Dubai, United Arab Emirates<br>TRN: 100XXXXXXXX0003</div></div><div class="right"><div class="eyebrow">Document Type</div><h2>Receipt Voucher</h2><div class="reference">Against Invoice · <strong>${escapeHtml(receipt.invoiceNo)}</strong></div></div></header>
    <section class="meta"><div><div class="label">Receipt Voucher No.</div><div class="value accent">${escapeHtml(receipt.receiptNo)}</div></div><div><div class="label">Date Issued</div><div class="value">${date}</div></div><div><div class="label">Status</div><div class="value">${escapeHtml(receipt.status)}</div></div></section>
    <section class="content"><div class="customer"><div class="label accent">Received From</div><h2>${escapeHtml(receipt.memberName)}</h2><p>Member ID: ${escapeHtml(receipt.memberId)}</p><p>${escapeHtml(receipt.memberEmail)} · ${escapeHtml(receipt.memberPhone)}</p></div>
    <table><thead><tr><th>Description</th><th>Type</th><th>Amount (AED)</th></tr></thead><tbody><tr><td><strong>${escapeHtml(receipt.planName || receipt.transactionType)}</strong><br><small>Invoice Ref: ${escapeHtml(receipt.invoiceNo)}</small></td><td>${escapeHtml(receipt.transactionType)}</td><td>AED ${receipt.amount.toFixed(2)}</td></tr></tbody></table>
    <div class="summary">${receipt.discount > 0 ? `<div class="row"><span>Discount</span><span>- AED ${receipt.discount.toFixed(2)}</span></div>` : ""}<div class="row"><span>Gross Total</span><strong>AED ${gross.toFixed(2)}</strong></div>${receipt.vatApplicable ? `<div class="row"><span>VAT (5%)</span><span>AED ${vat.toFixed(2)}</span></div>` : ""}<div class="row total"><span>Total Received</span><span>AED ${total.toFixed(2)}</span></div></div>
    <div class="note"><strong>Payment Method:</strong> ${escapeHtml(receipt.paymentMethod)} · <strong>Processed By:</strong> ${escapeHtml(receipt.processedBy)}${receipt.remarks ? `<br><strong>Remarks:</strong> ${escapeHtml(receipt.remarks)}` : ""}</div>
    <footer>Official computer-generated GymBios receipt voucher — valid without a physical signature.<br>support@gymbios.ae · +971 4 XXX XXXX</footer></section></main>`);
};

const creditReceiptHtml = (credit: CustomerCredit) => {
  const date = credit.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const expiry = credit.expiryDate?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return downloadableDocument(`${credit.creditNo} Customer Credit Receipt`, `<main class="doc">
    <header><div><h1 class="brand">GymBios</h1><div class="muted">Wellness Services Operating System<br>Dubai, United Arab Emirates<br>TRN: 100XXXXXXXX0003</div></div><div class="right"><div class="eyebrow">Document Type</div><h2>Customer Credit Receipt</h2><div class="reference"><strong>${escapeHtml(credit.creditType)}</strong></div></div></header>
    <section class="meta"><div><div class="label">Credit Note No.</div><div class="value accent">${escapeHtml(credit.creditNo)}</div></div><div><div class="label">Date Issued</div><div class="value">${date}</div></div><div><div class="label">Status</div><div class="value">${escapeHtml(credit.status)}</div></div></section>
    <section class="content"><div class="customer"><div class="label accent">Credit Issued To</div><h2>${escapeHtml(credit.memberName)}</h2><p>Member ID: ${escapeHtml(credit.memberId)}</p><p>${escapeHtml(credit.memberEmail)} · ${escapeHtml(credit.memberPhone)}</p></div>
    <table><thead><tr><th>Credit Description</th><th>Reference</th><th>Amount (AED)</th></tr></thead><tbody><tr><td><strong>${escapeHtml(credit.creditType)}</strong>${credit.remarks ? `<br><small>${escapeHtml(credit.remarks)}</small>` : ""}</td><td>${escapeHtml(credit.linkedInvoice || "Not linked")}</td><td>AED ${credit.amount.toFixed(2)}</td></tr></tbody></table>
    <div class="summary"><div class="row"><span>Total Credit Issued</span><strong>AED ${credit.amount.toFixed(2)}</strong></div><div class="row"><span>Amount Utilized</span><span>- AED ${credit.usedAmount.toFixed(2)}</span></div><div class="row total"><span>Available Balance</span><span>AED ${credit.balance.toFixed(2)}</span></div></div>
    <div class="note"><strong>Processed By:</strong> ${escapeHtml(credit.processedBy)}${expiry ? ` · <strong>Credit Expiry:</strong> ${expiry}` : ""}</div>
    <footer>Official GymBios customer credit record. Credits are non-transferable and subject to expiry.<br>support@gymbios.ae · +971 4 XXX XXXX</footer></section></main>`);
};

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockReceipts: Receipt[] = [
  {
    id: "1",
    receiptNo: "RCPT-10240",
    invoiceNo: "INV-2025-1001",
    date: new Date("2025-10-17"),
    memberId: "MB-1024",
    memberName: "John Mathew",
    memberEmail: "john.mathew@email.com",
    memberPhone: "+971 50 123 4567",
    transactionType: "Renewal",
    amount: 450,
    discount: 0,
    vatApplicable: true,
    paymentMethod: "Card",
    status: "Paid",
    planName: "Premium Gym Access (3 Months)",
    validFrom: new Date("2025-10-17"),
    validTill: new Date("2026-01-17"),
    processedBy: "Sarah Admin",
    remarks: "Renewed via counter",
  },
  {
    id: "2",
    receiptNo: "RCPT-10239",
    invoiceNo: "INV-2025-1002",
    date: new Date("2025-10-16"),
    memberId: "MB-1025",
    memberName: "Sarah Johnson",
    memberEmail: "sarah.j@email.com",
    memberPhone: "+971 50 234 5678",
    transactionType: "Add-on",
    amount: 200,
    discount: 20,
    vatApplicable: false,
    paymentMethod: "Cash",
    status: "Paid",
    planName: "Nutrition Plan – 30 Days",
    validFrom: new Date("2025-10-16"),
    validTill: new Date("2025-11-15"),
    processedBy: "Ahmed Staff",
    remarks: "Add-on purchase",
  },
  {
    id: "3",
    receiptNo: "RCPT-10238",
    invoiceNo: "INV-2025-1003",
    date: new Date("2025-10-15"),
    memberId: "MB-1026",
    memberName: "Ahmed Al-Mansoori",
    memberEmail: "ahmed.m@email.com",
    memberPhone: "+971 55 345 6789",
    transactionType: "Membership",
    amount: 1500,
    discount: 0,
    vatApplicable: true,
    paymentMethod: "Online",
    status: "Paid",
    planName: "Premium Annual Membership",
    validFrom: new Date("2025-10-15"),
    validTill: new Date("2026-10-15"),
    processedBy: "Sarah Admin",
    remarks: "New member registration",
  },
  {
    id: "4",
    receiptNo: "RCPT-10237",
    invoiceNo: "INV-2025-1004",
    date: new Date("2025-10-15"),
    memberId: "MB-1027",
    memberName: "Fatima Hassan",
    memberEmail: "fatima.h@email.com",
    memberPhone: "+971 50 456 7890",
    transactionType: "Daily Entry",
    amount: 50,
    discount: 0,
    vatApplicable: false,
    paymentMethod: "Cash",
    status: "Paid",
    planName: "Single Day Access",
    validFrom: new Date("2025-10-15"),
    validTill: new Date("2025-10-15"),
    processedBy: "Reception Desk",
    remarks: "Walk-in customer",
  },
  {
    id: "5",
    receiptNo: "RCPT-10236",
    invoiceNo: "INV-2025-1005",
    date: new Date("2025-10-14"),
    memberId: "MB-1028",
    memberName: "Mohammed Ali",
    memberEmail: "mohammed.ali@email.com",
    memberPhone: "+971 52 567 8901",
    transactionType: "Renewal",
    amount: 800,
    discount: 50,
    vatApplicable: true,
    paymentMethod: "Card",
    status: "Paid",
    planName: "Premium Gym Access (6 Months)",
    validFrom: new Date("2025-10-14"),
    validTill: new Date("2026-04-14"),
    processedBy: "Ahmed Staff",
    remarks: "Early renewal with discount",
  },
  {
    id: "6",
    receiptNo: "RCPT-10235",
    invoiceNo: "INV-2025-1006",
    date: new Date("2025-10-14"),
    memberId: "MB-1029",
    memberName: "Layla Ibrahim",
    memberEmail: "layla.i@email.com",
    memberPhone: "+971 50 678 9012",
    transactionType: "Add-on",
    amount: 450,
    discount: 0,
    vatApplicable: false,
    paymentMethod: "Wallet",
    status: "Paid",
    planName: "Personal Training – 15 Sessions",
    validFrom: new Date("2025-10-14"),
    validTill: new Date("2025-11-13"),
    processedBy: "Sarah Admin",
    remarks: "Add-on package",
  },
  {
    id: "7",
    receiptNo: "RCPT-10234",
    invoiceNo: "INV-2025-1007",
    date: new Date("2025-10-13"),
    memberId: "MB-1030",
    memberName: "Omar Khalid",
    memberEmail: "omar.k@email.com",
    memberPhone: "+971 55 789 0123",
    transactionType: "Membership",
    amount: 300,
    discount: 0,
    vatApplicable: true,
    paymentMethod: "Cash",
    status: "Pending",
    planName: "Basic Gym Access (2 Months)",
    validFrom: new Date("2025-10-13"),
    validTill: new Date("2025-12-13"),
    processedBy: "Reception Desk",
    remarks: "Payment pending confirmation",
  },
  {
    id: "8",
    receiptNo: "RCPT-10233",
    invoiceNo: "INV-2025-1008",
    date: new Date("2025-10-12"),
    memberId: "MB-1031",
    memberName: "Aisha Rahman",
    memberEmail: "aisha.r@email.com",
    memberPhone: "+971 50 890 1234",
    transactionType: "Add-on",
    amount: 300,
    discount: 30,
    vatApplicable: false,
    paymentMethod: "Card",
    status: "Paid",
    planName: "Group Classes – 20 Sessions",
    validFrom: new Date("2025-10-12"),
    validTill: new Date("2025-11-11"),
    processedBy: "Ahmed Staff",
  },
];

const mockCredits: CustomerCredit[] = [
  {
    id: "c1",
    creditNo: "CRD-2025-001",
    date: new Date("2025-10-18"),
    memberId: "MB-1024",
    memberName: "John Mathew",
    memberEmail: "john.mathew@email.com",
    memberPhone: "+971 50 123 4567",
    creditType: "Prepaid Credit",
    amount: 500,
    usedAmount: 200,
    balance: 300,
    status: "Active",
    processedBy: "Sarah Admin",
    expiryDate: new Date("2026-10-18"),
    remarks: "Prepaid wallet top-up",
  },
  {
    id: "c2",
    creditNo: "CRD-2025-002",
    date: new Date("2025-10-15"),
    memberId: "MB-1025",
    memberName: "Sarah Johnson",
    memberEmail: "sarah.j@email.com",
    memberPhone: "+971 50 234 5678",
    creditType: "Refund as Credit",
    amount: 180,
    usedAmount: 180,
    balance: 0,
    linkedInvoice: "INV-2025-0990",
    status: "Fully Used",
    processedBy: "Ahmed Staff",
    expiryDate: new Date("2026-01-15"),
    remarks: "Refund for cancelled personal training sessions",
  },
  {
    id: "c3",
    creditNo: "CRD-2025-003",
    date: new Date("2025-10-12"),
    memberId: "MB-1026",
    memberName: "Ahmed Al-Mansoori",
    memberEmail: "ahmed.m@email.com",
    memberPhone: "+971 55 345 6789",
    creditType: "Promotional Credit",
    amount: 100,
    usedAmount: 0,
    balance: 100,
    status: "Active",
    processedBy: "System",
    expiryDate: new Date("2025-12-31"),
    remarks: "Anniversary promotional bonus",
  },
  {
    id: "c4",
    creditNo: "CRD-2025-004",
    date: new Date("2025-10-10"),
    memberId: "MB-1028",
    memberName: "Mohammed Ali",
    memberEmail: "mohammed.ali@email.com",
    memberPhone: "+971 52 567 8901",
    creditType: "Loyalty Credit",
    amount: 250,
    usedAmount: 50,
    balance: 200,
    status: "Active",
    processedBy: "System",
    expiryDate: new Date("2026-04-10"),
    remarks: "Loyalty reward – 1-year membership",
  },
  {
    id: "c5",
    creditNo: "CRD-2025-005",
    date: new Date("2025-09-20"),
    memberId: "MB-1029",
    memberName: "Layla Ibrahim",
    memberEmail: "layla.i@email.com",
    memberPhone: "+971 50 678 9012",
    creditType: "Refund as Credit",
    amount: 450,
    usedAmount: 450,
    balance: 0,
    linkedInvoice: "INV-2025-0910",
    status: "Fully Used",
    processedBy: "Sarah Admin",
    expiryDate: new Date("2025-12-20"),
    remarks: "Credit note for plan change",
  },
  {
    id: "c6",
    creditNo: "CRD-2025-006",
    date: new Date("2025-09-05"),
    memberId: "MB-1031",
    memberName: "Aisha Rahman",
    memberEmail: "aisha.r@email.com",
    memberPhone: "+971 50 890 1234",
    creditType: "Prepaid Credit",
    amount: 1000,
    usedAmount: 300,
    balance: 700,
    status: "Active",
    processedBy: "Reception Desk",
    expiryDate: new Date("2026-09-05"),
    remarks: "Annual prepaid credit balance",
  },
];

// ─── Receipt Voucher Document (inline React render) ────────────────────────

function ReceiptVoucherDoc({ receipt }: { receipt: Receipt }) {
  const grossTotal = receipt.amount - receipt.discount;
  const vat = receipt.vatApplicable ? grossTotal * 0.05 : 0;
  const totalAmount = grossTotal + vat;
  const showValidity =
    ["Membership", "Renewal", "Add-on", "Upgrade"].includes(receipt.transactionType) &&
    receipt.validFrom &&
    receipt.validTill;

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="bg-white rounded-lg overflow-hidden text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div
        className="p-6 flex items-start justify-between"
        style={{ background: "linear-gradient(135deg, #327F74 0%, #1F5A52 100%)" }}
      >
        <div className="text-white">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            GymBios
          </h1>
          <p className="text-xs opacity-80 mt-0.5">Wellness Services Operating System</p>
          <p className="text-xs opacity-70 mt-2 leading-relaxed">
            Dubai, United Arab Emirates<br />
            Phone: +971 4 XXX XXXX | billing@gymbios.ae<br />
            TRN: 100XXXXXXXX0003
          </p>
        </div>
        <div className="text-right text-white">
          <div className="text-xs uppercase tracking-widest opacity-70 mb-1">Document Type</div>
          <div className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Receipt Voucher
          </div>
          <div className="text-xs opacity-70 mt-0.5">وصل استلام</div>
          <div className="mt-3 border border-white/40 rounded px-3 py-1.5 text-xs">
            <div className="opacity-70">Against Invoice</div>
            <div className="font-bold">{receipt.invoiceNo}</div>
          </div>
        </div>
      </div>

      {/* Voucher meta row */}
      <div className="grid grid-cols-3 gap-0 border-b" style={{ borderColor: "#e5e7eb" }}>
        {[
          { label: "Receipt Voucher No.", value: receipt.receiptNo, accent: true },
          { label: "Date Issued", value: fmtDate(receipt.date), accent: false },
          { label: "Payment Status", value: receipt.status, accent: false },
        ].map((item) => (
          <div key={item.label} className="p-4 border-r last:border-r-0" style={{ borderColor: "#e5e7eb" }}>
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{item.label}</div>
            {item.label === "Payment Status" ? (
              <span
                className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: receipt.status === "Paid" ? "#dcfce7" : "#fef9c3",
                  color: receipt.status === "Paid" ? "#166534" : "#854d0e",
                }}
              >
                {receipt.status}
              </span>
            ) : (
              <div
                className="font-bold text-base"
                style={{ color: item.accent ? "#327F74" : "#1a1a1a" }}
              >
                {item.value}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {/* Received From */}
        <div
          className="p-4 rounded-lg border-l-4"
          style={{ background: "#f0f9f7", borderColor: "#327F74" }}
        >
          <div className="text-xs uppercase tracking-wide font-bold mb-2" style={{ color: "#327F74" }}>
            Received From / مستلم من
          </div>
          <div className="font-semibold text-base text-gray-900">{receipt.memberName}</div>
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            <div>Member ID: {receipt.memberId}</div>
            <div>Email: {receipt.memberEmail}</div>
            <div>Phone: {receipt.memberPhone}</div>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#327F74", color: "white" }}>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Description</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Type</th>
              <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                Amount (AED){receipt.vatApplicable ? " Excl. VAT" : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{receipt.planName || receipt.transactionType}</div>
                <div className="text-xs text-gray-500 mt-0.5">Invoice Ref: {receipt.invoiceNo}</div>
              </td>
              <td className="px-4 py-3 text-gray-600">{receipt.transactionType}</td>
              <td className="px-4 py-3 text-right font-semibold" style={{ color: "#327F74" }}>
                AED {receipt.amount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="rounded-lg p-4" style={{ background: "#f9fafb" }}>
          <div className="space-y-2 text-sm">
            {receipt.discount > 0 && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>Discount</span>
                <span>- AED {receipt.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700">
              <span>Gross Total</span>
              <span className="font-medium">AED {grossTotal.toFixed(2)}</span>
            </div>
            {receipt.vatApplicable && (
              <div className="flex justify-between text-gray-500">
                <span>VAT (5%)</span>
                <span>AED {vat.toFixed(2)}</span>
              </div>
            )}
            <div
              className="flex justify-between text-base font-bold pt-2 mt-1"
              style={{ borderTop: "2px solid #327F74", color: "#327F74" }}
            >
              <span>Total Amount Received</span>
              <span>AED {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        <div className="rounded-lg p-4" style={{ background: "#fffbeb", borderLeft: "4px solid #f59e0b" }}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-amber-800 font-semibold uppercase tracking-wide mb-0.5">Payment Method</div>
              <div className="text-gray-800 font-medium">{receipt.paymentMethod}</div>
            </div>
            <div>
              <div className="text-amber-800 font-semibold uppercase tracking-wide mb-0.5">Processed By</div>
              <div className="text-gray-800 font-medium">{receipt.processedBy}</div>
            </div>
            {showValidity && receipt.validFrom && receipt.validTill && (
              <div className="col-span-2">
                <div className="text-amber-800 font-semibold uppercase tracking-wide mb-0.5">Subscription Validity</div>
                <div className="text-gray-800 font-medium" style={{ color: "#327F74" }}>
                  {fmtDate(receipt.validFrom)} – {fmtDate(receipt.validTill)}
                </div>
              </div>
            )}
            {receipt.remarks && (
              <div className="col-span-2">
                <div className="text-amber-800 font-semibold uppercase tracking-wide mb-0.5">Remarks</div>
                <div className="text-gray-700">{receipt.remarks}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 border-t" style={{ borderColor: "#e5e7eb" }}>
          <div className="font-semibold text-sm mb-1" style={{ color: "#327F74" }}>
            Thank you for your business! شكراً لتعاملكم معنا
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            This is an official receipt voucher issued by GymBios against the invoice referenced above.<br />
            Please retain for your records. For queries: support@gymbios.ae | +971 4 XXX XXXX
          </p>
          <p className="text-xs text-gray-300 mt-2">
            Computer-generated document — valid without physical signature.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Customer Credit Receipt Document ─────────────────────────────────────

function CreditReceiptDoc({ credit }: { credit: CustomerCredit }) {
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const creditTypeColors: Record<string, { bg: string; text: string }> = {
    "Prepaid Credit": { bg: "#dbeafe", text: "#1e40af" },
    "Refund as Credit": { bg: "#fee2e2", text: "#991b1b" },
    "Promotional Credit": { bg: "#f3e8ff", text: "#6b21a8" },
    "Loyalty Credit": { bg: "#fef9c3", text: "#854d0e" },
  };
  const colors = creditTypeColors[credit.creditType] || { bg: "#f1f5f9", text: "#475569" };

  return (
    <div className="bg-white rounded-lg overflow-hidden text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div
        className="p-6 flex items-start justify-between"
        style={{ background: "linear-gradient(135deg, #327F74 0%, #1F5A52 100%)" }}
      >
        <div className="text-white">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            GymBios
          </h1>
          <p className="text-xs opacity-80 mt-0.5">Wellness Services Operating System</p>
          <p className="text-xs opacity-70 mt-2 leading-relaxed">
            Dubai, United Arab Emirates<br />
            Phone: +971 4 XXX XXXX | billing@gymbios.ae<br />
            TRN: 100XXXXXXXX0003
          </p>
        </div>
        <div className="text-right text-white">
          <div className="text-xs uppercase tracking-widest opacity-70 mb-1">Document Type</div>
          <div className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Customer Credit Receipt
          </div>
          <div className="text-xs opacity-70 mt-0.5">إيصال رصيد العميل</div>
          <div className="mt-3 rounded px-3 py-1.5 text-xs" style={{ background: colors.bg, color: colors.text }}>
            <div className="font-bold">{credit.creditType}</div>
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-3 gap-0 border-b" style={{ borderColor: "#e5e7eb" }}>
        {[
          { label: "Credit Note No.", value: credit.creditNo, accent: true },
          { label: "Date Issued", value: fmtDate(credit.date), accent: false },
          { label: "Credit Status", value: credit.status, accent: false },
        ].map((item) => (
          <div key={item.label} className="p-4 border-r last:border-r-0" style={{ borderColor: "#e5e7eb" }}>
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{item.label}</div>
            {item.label === "Credit Status" ? (
              <span
                className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background:
                    credit.status === "Active"
                      ? "#dcfce7"
                      : credit.status === "Fully Used"
                      ? "#e0e7ff"
                      : credit.status === "Expired"
                      ? "#fee2e2"
                      : "#fef9c3",
                  color:
                    credit.status === "Active"
                      ? "#166534"
                      : credit.status === "Fully Used"
                      ? "#3730a3"
                      : credit.status === "Expired"
                      ? "#991b1b"
                      : "#854d0e",
                }}
              >
                {credit.status}
              </span>
            ) : (
              <div
                className="font-bold text-base"
                style={{ color: item.accent ? "#327F74" : "#1a1a1a" }}
              >
                {item.value}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {/* Credited To */}
        <div
          className="p-4 rounded-lg border-l-4"
          style={{ background: "#f0f9f7", borderColor: "#327F74" }}
        >
          <div className="text-xs uppercase tracking-wide font-bold mb-2" style={{ color: "#327F74" }}>
            Credit Issued To / صادر إلى
          </div>
          <div className="font-semibold text-base text-gray-900">{credit.memberName}</div>
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            <div>Member ID: {credit.memberId}</div>
            <div>Email: {credit.memberEmail}</div>
            <div>Phone: {credit.memberPhone}</div>
          </div>
        </div>

        {/* Credit details table */}
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#327F74", color: "white" }}>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Credit Description</th>
              <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Amount (AED)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{credit.creditType}</div>
                {credit.linkedInvoice && (
                  <div className="text-xs text-gray-500 mt-0.5">Against Invoice: {credit.linkedInvoice}</div>
                )}
                {credit.remarks && (
                  <div className="text-xs text-gray-500">{credit.remarks}</div>
                )}
              </td>
              <td className="px-4 py-3 text-right font-semibold" style={{ color: "#327F74" }}>
                AED {credit.amount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Credit balance summary */}
        <div className="rounded-lg p-4" style={{ background: "#f9fafb" }}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>Total Credit Issued</span>
              <span className="font-medium">AED {credit.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Amount Utilized</span>
              <span className="text-red-500">- AED {credit.usedAmount.toFixed(2)}</span>
            </div>
            <div
              className="flex justify-between text-base font-bold pt-2 mt-1"
              style={{ borderTop: "2px solid #327F74", color: "#327F74" }}
            >
              <span>Available Credit Balance</span>
              <span>AED {credit.balance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-lg p-4" style={{ background: "#fffbeb", borderLeft: "4px solid #f59e0b" }}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-amber-800 font-semibold uppercase tracking-wide mb-0.5">Processed By</div>
              <div className="text-gray-800 font-medium">{credit.processedBy}</div>
            </div>
            {credit.expiryDate && (
              <div>
                <div className="text-amber-800 font-semibold uppercase tracking-wide mb-0.5">Credit Expiry</div>
                <div className="text-gray-800 font-medium">{fmtDate(credit.expiryDate)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 border-t" style={{ borderColor: "#e5e7eb" }}>
          <div className="font-semibold text-sm mb-1" style={{ color: "#327F74" }}>
            Customer Credit Statement — GymBios
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            This credit receipt is an official record issued by GymBios.<br />
            Credits are non-transferable and subject to expiry. For queries: support@gymbios.ae
          </p>
          <p className="text-xs text-gray-300 mt-2">
            Computer-generated document — valid without physical signature.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function MemberReceipts({ onNavigate, embedded = false }: MemberReceiptsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");

  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  const [creditSearchQuery, setCreditSearchQuery] = useState("");
  const [creditTypeFilter, setCreditTypeFilter] = useState("All");
  const [creditStatusFilter, setCreditStatusFilter] = useState("All");
  const [selectedCredit, setSelectedCredit] = useState<CustomerCredit | null>(null);
  const [isCreditReceiptOpen, setIsCreditReceiptOpen] = useState(false);

  // ── Receipt filters ──────────────────────────────────────────────────────
  const filteredReceipts = useMemo(() => {
    let filtered = [...mockReceipts];
    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.memberPhone.includes(searchQuery) ||
          r.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (transactionTypeFilter !== "All") {
      filtered = filtered.filter((r) => r.transactionType === transactionTypeFilter);
    }
    if (statusFilter !== "All") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    const today = new Date();
    if (dateFilter === "today") {
      filtered = filtered.filter((r) => r.date.toDateString() === today.toDateString());
    } else if (dateFilter === "week") {
      const ago = new Date(today.getTime() - 7 * 86400000);
      filtered = filtered.filter((r) => r.date >= ago);
    } else if (dateFilter === "month") {
      const ago = new Date(today.getTime() - 30 * 86400000);
      filtered = filtered.filter((r) => r.date >= ago);
    }
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [searchQuery, transactionTypeFilter, statusFilter, dateFilter]);

  const totalCollected = useMemo(
    () => filteredReceipts.filter((r) => r.status === "Paid").reduce((s, r) => s + r.amount, 0),
    [filteredReceipts]
  );

  // ── Credit filters ───────────────────────────────────────────────────────
  const filteredCredits = useMemo(() => {
    let filtered = [...mockCredits];
    if (creditSearchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.memberName.toLowerCase().includes(creditSearchQuery.toLowerCase()) ||
          c.memberId.toLowerCase().includes(creditSearchQuery.toLowerCase()) ||
          c.creditNo.toLowerCase().includes(creditSearchQuery.toLowerCase())
      );
    }
    if (creditTypeFilter !== "All") {
      filtered = filtered.filter((c) => c.creditType === creditTypeFilter);
    }
    if (creditStatusFilter !== "All") {
      filtered = filtered.filter((c) => c.status === creditStatusFilter);
    }
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [creditSearchQuery, creditTypeFilter, creditStatusFilter]);

  const totalCreditBalance = useMemo(
    () => filteredCredits.reduce((s, c) => s + c.balance, 0),
    [filteredCredits]
  );

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const getTransactionTypeColor = (type: string) => {
    const map: Record<string, string> = {
      Membership: "bg-blue-100 text-blue-800",
      Renewal: "bg-green-100 text-green-800",
      "Add-on": "bg-purple-100 text-purple-800",
      "Daily Entry": "bg-orange-100 text-orange-800",
      Upgrade: "bg-teal-100 text-teal-800",
    };
    return map[type] || "bg-gray-100 text-gray-800";
  };

  const getCreditTypeColor = (type: string) => {
    const map: Record<string, string> = {
      "Prepaid Credit": "bg-blue-100 text-blue-800",
      "Refund as Credit": "bg-red-100 text-red-800",
      "Promotional Credit": "bg-purple-100 text-purple-800",
      "Loyalty Credit": "bg-yellow-100 text-yellow-800",
    };
    return map[type] || "bg-gray-100 text-gray-800";
  };

  const getCreditStatusColor = (status: string) => {
    const map: Record<string, string> = {
      Active: "bg-green-100 text-green-800",
      "Fully Used": "bg-indigo-100 text-indigo-800",
      Expired: "bg-red-100 text-red-800",
      Pending: "bg-yellow-100 text-yellow-800",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  };

  const PaymentIcon = ({ method }: { method: string }) => {
    if (method === "Cash") return <DollarSign className="h-3.5 w-3.5" />;
    if (method === "Wallet") return <Wallet className="h-3.5 w-3.5" />;
    return <CreditCard className="h-3.5 w-3.5" />;
  };

  // ── Action handlers ──────────────────────────────────────────────────────
  const openVoucher = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsVoucherModalOpen(true);
  };
  const openReceiptDetail = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsReceiptModalOpen(true);
  };
  const openCreditReceipt = (credit: CustomerCredit) => {
    setSelectedCredit(credit);
    setIsCreditReceiptOpen(true);
  };

  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened");
  };
  const downloadDocument = (html: string, filename: string) => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const handleReceiptDownload = (receipt: Receipt) => {
    downloadDocument(receiptVoucherHtml(receipt), `${receipt.receiptNo}-Receipt-Voucher.html`);
    toast.success(`${receipt.receiptNo} downloaded`, {
      description: "Open the document to view, print, or save it as PDF.",
    });
  };
  const handleCreditDownload = (credit: CustomerCredit) => {
    downloadDocument(creditReceiptHtml(credit), `${credit.creditNo}-Customer-Credit-Receipt.html`);
    toast.success(`${credit.creditNo} downloaded`, {
      description: "Open the document to view, print, or save it as PDF.",
    });
  };
  const handleWhatsApp = (phone: string) => toast.success(`Sent via WhatsApp to ${phone}`);
  const handleSMS = (phone: string) => toast.success(`Sent via SMS to ${phone}`);
  const handleEmail = (email: string) => toast.success(`Sent via Email to ${email}`);

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className={embedded ? "bg-background" : "min-h-screen bg-background"}>
      {/* Page Header */}
      {!embedded && <div className="border-b bg-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ background: "linear-gradient(135deg, #327F74 0%, #1F5A52 100%)" }}
              >
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1
                  className="text-2xl text-foreground"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Member Receipts
                </h1>
                <p className="text-muted-foreground text-sm">
                  Invoice receipt vouchers & customer credit statements
                </p>
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
        </div>
      </div>}

      {/* Main Content */}
      <div className={embedded ? "pt-1" : "p-6"}>
        <Tabs defaultValue="invoice-receipts">
          <TabsList className="mb-6 h-auto w-full justify-start gap-1 rounded-xl border border-[#327F74]/15 bg-[#F0F8F6] p-1.5 sm:w-auto">
            <TabsTrigger
              value="invoice-receipts"
              className="gap-2 rounded-lg px-4 py-2.5 data-[state=active]:bg-[#327F74] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <FileText className="h-4 w-4" />
              Invoice Receipts
              <Badge className="ml-1 bg-white/20 text-current hover:bg-white/20">
                {mockReceipts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="customer-credits"
              className="gap-2 rounded-lg px-4 py-2.5 data-[state=active]:bg-[#327F74] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Wallet className="h-4 w-4" />
              Customer Credits
              <Badge className="ml-1 bg-white/20 text-current hover:bg-white/20">
                {mockCredits.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* ══ TAB 1: Invoice Receipts ══════════════════════════════════════ */}
          <TabsContent value="invoice-receipts" className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Receipts",
                  value: filteredReceipts.length,
                  icon: <FileText className="h-5 w-5 text-blue-600" />,
                  bg: "bg-blue-50",
                },
                {
                  label: "Paid",
                  value: filteredReceipts.filter((r) => r.status === "Paid").length,
                  icon: <CheckCircle className="h-5 w-5 text-green-600" />,
                  bg: "bg-green-50",
                },
                {
                  label: "Pending",
                  value: filteredReceipts.filter((r) => r.status === "Pending").length,
                  icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
                  bg: "bg-orange-50",
                },
                {
                  label: "Total Collected",
                  value: `AED ${totalCollected.toLocaleString()}`,
                  icon: <DollarSign className="h-5 w-5" style={{ color: "#327F74" }} />,
                  bg: "bg-teal-50",
                },
              ].map((card) => (
                <Card key={card.label}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{card.label}</p>
                        <p className="text-xl font-semibold mt-0.5">{card.value}</p>
                      </div>
                      <div className={`p-2.5 rounded-lg ${card.bg}`}>{card.icon}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Collection banner */}
            <div
              className="rounded-lg p-4 flex items-center justify-between text-white"
              style={{ background: "linear-gradient(135deg, #327F74 0%, #1F5A52 100%)" }}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="h-6 w-6 opacity-80" />
                <div>
                  <p className="text-xs opacity-80">Total Collected (Current Filter)</p>
                  <p className="text-2xl font-bold">AED {totalCollected.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Transactions</p>
                <p className="text-lg font-semibold">
                  {filteredReceipts.filter((r) => r.status === "Paid").length} Paid
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name / ID / receipt / invoice…"
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
              <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
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

            {/* Table */}
            <Card>
              <CardHeader className="pb-0 flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" style={{ color: "#327F74" }} />
                  All Invoice Receipts
                  <Badge variant="secondary">{filteredReceipts.length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Showing {filteredReceipts.length} of {mockReceipts.length}
                </p>
              </CardHeader>
              <CardContent className="p-0 mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Receipt No.</TableHead>
                        <TableHead>Invoice No.</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount (AED)</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReceipts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                            No receipts found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReceipts.map((receipt) => (
                          <TableRow key={receipt.id} className="hover:bg-muted/40">
                            <TableCell className="text-sm">{fmtDate(receipt.date)}</TableCell>
                            <TableCell className="font-medium text-sm">{receipt.receiptNo}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{receipt.invoiceNo}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{receipt.memberName}</p>
                                <p className="text-xs text-muted-foreground">{receipt.memberId}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getTransactionTypeColor(receipt.transactionType)}>
                                {receipt.transactionType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{receipt.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm">
                                <PaymentIcon method={receipt.paymentMethod} />
                                {receipt.paymentMethod}
                              </div>
                            </TableCell>
                            <TableCell>
                              {receipt.status === "Paid" ? (
                                <Badge className="bg-green-100 text-green-800">✅ Paid</Badge>
                              ) : (
                                <Badge className="bg-orange-100 text-orange-800">⏳ Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => openVoucher(receipt)}
                                  className="whitespace-nowrap bg-[#327F74] text-white hover:bg-[#1F5A52]"
                                >
                                  <Receipt className="mr-1.5 h-3.5 w-3.5" />
                                  Receipt Voucher
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      More ▾
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-60">
                                  <DropdownMenuItem
                                    onClick={() => openReceiptDetail(receipt)}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4 mr-2 text-blue-600" />
                                    View Receipt Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openVoucher(receipt)}
                                    className="cursor-pointer font-medium"
                                    style={{ color: "#327F74" }}
                                  >
                                    <Receipt className="h-4 w-4 mr-2" style={{ color: "#327F74" }} />
                                    Receipt Voucher (Against Invoice)
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleReceiptDownload(receipt)}
                                    className="cursor-pointer"
                                  >
                                    <Download className="h-4 w-4 mr-2 text-green-600" />
                                    Download Receipt
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={handlePrint}
                                    className="cursor-pointer"
                                  >
                                    <Printer className="h-4 w-4 mr-2 text-purple-600" />
                                    Print
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleWhatsApp(receipt.memberPhone)}
                                    className="cursor-pointer"
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                                    Send via WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleSMS(receipt.memberPhone)}
                                    className="cursor-pointer"
                                  >
                                    <Send className="h-4 w-4 mr-2 text-blue-600" />
                                    Send via SMS
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEmail(receipt.memberEmail)}
                                    className="cursor-pointer"
                                  >
                                    <Mail className="h-4 w-4 mr-2 text-orange-600" />
                                    Send via Email
                                  </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ TAB 2: Customer Credits ══════════════════════════════════════ */}
          <TabsContent value="customer-credits" className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Credits",
                  value: filteredCredits.length,
                  icon: <Wallet className="h-5 w-5 text-blue-600" />,
                  bg: "bg-blue-50",
                },
                {
                  label: "Active Credits",
                  value: filteredCredits.filter((c) => c.status === "Active").length,
                  icon: <CheckCircle className="h-5 w-5 text-green-600" />,
                  bg: "bg-green-50",
                },
                {
                  label: "Fully Used",
                  value: filteredCredits.filter((c) => c.status === "Fully Used").length,
                  icon: <RefreshCw className="h-5 w-5 text-indigo-600" />,
                  bg: "bg-indigo-50",
                },
                {
                  label: "Total Balance",
                  value: `AED ${totalCreditBalance.toLocaleString()}`,
                  icon: <BadgeDollarSign className="h-5 w-5" style={{ color: "#327F74" }} />,
                  bg: "bg-teal-50",
                },
              ].map((card) => (
                <Card key={card.label}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{card.label}</p>
                        <p className="text-xl font-semibold mt-0.5">{card.value}</p>
                      </div>
                      <div className={`p-2.5 rounded-lg ${card.bg}`}>{card.icon}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Credit balance banner */}
            <div
              className="rounded-lg p-4 flex items-center justify-between text-white"
              style={{ background: "linear-gradient(135deg, #327F74 0%, #1F5A52 100%)" }}
            >
              <div className="flex items-center gap-3">
                <Gift className="h-6 w-6 opacity-80" />
                <div>
                  <p className="text-xs opacity-80">Total Outstanding Credit Balance</p>
                  <p className="text-2xl font-bold">AED {totalCreditBalance.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Active Credits</p>
                <p className="text-lg font-semibold">
                  {filteredCredits.filter((c) => c.status === "Active").length} Active
                </p>
              </div>
            </div>

            {/* Credit Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by member / credit note…"
                  value={creditSearchQuery}
                  onChange={(e) => setCreditSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={creditTypeFilter} onValueChange={setCreditTypeFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Credit Type" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="Prepaid Credit">Prepaid Credit</SelectItem>
                  <SelectItem value="Refund as Credit">Refund as Credit</SelectItem>
                  <SelectItem value="Promotional Credit">Promotional Credit</SelectItem>
                  <SelectItem value="Loyalty Credit">Loyalty Credit</SelectItem>
                </SelectContent>
              </Select>
              <Select value={creditStatusFilter} onValueChange={setCreditStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Fully Used">Fully Used</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Credits Table */}
            <Card>
              <CardHeader className="pb-0 flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" style={{ color: "#327F74" }} />
                  Customer Credit Ledger
                  <Badge variant="secondary">{filteredCredits.length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Showing {filteredCredits.length} of {mockCredits.length}
                </p>
              </CardHeader>
              <CardContent className="p-0 mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Credit Note No.</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Credit Type</TableHead>
                        <TableHead>Issued (AED)</TableHead>
                        <TableHead>Used (AED)</TableHead>
                        <TableHead>Balance (AED)</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCredits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                            No credits found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCredits.map((credit) => (
                          <TableRow key={credit.id} className="hover:bg-muted/40">
                            <TableCell className="text-sm">{fmtDate(credit.date)}</TableCell>
                            <TableCell className="font-medium text-sm">{credit.creditNo}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{credit.memberName}</p>
                                <p className="text-xs text-muted-foreground">{credit.memberId}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getCreditTypeColor(credit.creditType)}>
                                {credit.creditType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{credit.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-red-600">{credit.usedAmount.toLocaleString()}</TableCell>
                            <TableCell
                              className="font-semibold"
                              style={{ color: credit.balance > 0 ? "#327F74" : "#6b7280" }}
                            >
                              {credit.balance.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {credit.expiryDate ? fmtDate(credit.expiryDate) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge className={getCreditStatusColor(credit.status)}>
                                {credit.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => openCreditReceipt(credit)}
                                  className="whitespace-nowrap bg-[#327F74] text-white hover:bg-[#1F5A52]"
                                >
                                  <Receipt className="mr-1.5 h-3.5 w-3.5" />
                                  Credit Receipt
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      More ▾
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-60">
                                  <DropdownMenuItem
                                    onClick={() => openCreditReceipt(credit)}
                                    className="cursor-pointer font-medium"
                                    style={{ color: "#327F74" }}
                                  >
                                    <Receipt className="h-4 w-4 mr-2" style={{ color: "#327F74" }} />
                                    View Credit Receipt
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleCreditDownload(credit)}
                                    className="cursor-pointer"
                                  >
                                    <Download className="h-4 w-4 mr-2 text-green-600" />
                                    Download Credit Receipt
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
                                    <Printer className="h-4 w-4 mr-2 text-purple-600" />
                                    Print
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleWhatsApp(credit.memberPhone)}
                                    className="cursor-pointer"
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                                    Send via WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEmail(credit.memberEmail)}
                                    className="cursor-pointer"
                                  >
                                    <Mail className="h-4 w-4 mr-2 text-orange-600" />
                                    Send via Email
                                  </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Receipt Detail Modal ──────────────────────────────────────────── */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receipt: {selectedReceipt?.receiptNo}</DialogTitle>
            <DialogDescription>
              {selectedReceipt?.memberName} · {selectedReceipt?.memberId}
            </DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Invoice No.", selectedReceipt.invoiceNo],
                  ["Date", fmtDate(selectedReceipt.date)],
                  ["Type", selectedReceipt.transactionType],
                  ["Payment", selectedReceipt.paymentMethod],
                  ["Plan", selectedReceipt.planName || "—"],
                  ["Processed By", selectedReceipt.processedBy],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium">{val}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="rounded-lg p-3" style={{ background: "#f0f9f7" }}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">AED {selectedReceipt.amount}</span>
                </div>
                {selectedReceipt.discount > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>Discount</span>
                    <span>- AED {selectedReceipt.discount}</span>
                  </div>
                )}
                {selectedReceipt.vatApplicable && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>VAT (5%)</span>
                    <span>AED {((selectedReceipt.amount - selectedReceipt.discount) * 0.05).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold mt-1 pt-1" style={{ borderTop: "1px solid #327F74", color: "#327F74" }}>
                  <span>Total</span>
                  <span>
                    AED{" "}
                    {(
                      (selectedReceipt.amount - selectedReceipt.discount) *
                      (selectedReceipt.vatApplicable ? 1.05 : 1)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => selectedReceipt && openVoucher(selectedReceipt)}>
              <Receipt className="h-4 w-4 mr-2" />
              View Receipt Voucher
            </Button>
            <Button
              onClick={() => selectedReceipt && handleWhatsApp(selectedReceipt.memberPhone)}
              className="gap-2 text-white"
              style={{ background: "#25D366" }}
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Receipt Voucher Modal ─────────────────────────────────────────── */}
      <Dialog open={isVoucherModalOpen} onOpenChange={setIsVoucherModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white border-b">
            <span className="font-semibold text-sm" style={{ color: "#327F74" }}>
              Receipt Voucher — Against Invoice {selectedReceipt?.invoiceNo}
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-3.5 w-3.5 mr-1" />
                Print
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => selectedReceipt && handleReceiptDownload(selectedReceipt)}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download
              </Button>
              {selectedReceipt && (
                <Button
                  size="sm"
                  className="text-white"
                  style={{ background: "#25D366" }}
                  onClick={() => handleWhatsApp(selectedReceipt.memberPhone)}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  WhatsApp
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setIsVoucherModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4">
            {selectedReceipt && <ReceiptVoucherDoc receipt={selectedReceipt} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Customer Credit Receipt Modal ─────────────────────────────────── */}
      <Dialog open={isCreditReceiptOpen} onOpenChange={setIsCreditReceiptOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white border-b">
            <span className="font-semibold text-sm" style={{ color: "#327F74" }}>
              Customer Credit Receipt — {selectedCredit?.creditNo}
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-3.5 w-3.5 mr-1" />
                Print
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => selectedCredit && handleCreditDownload(selectedCredit)}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download
              </Button>
              {selectedCredit && (
                <Button
                  size="sm"
                  className="text-white"
                  style={{ background: "#25D366" }}
                  onClick={() => handleWhatsApp(selectedCredit.memberPhone)}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  WhatsApp
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setIsCreditReceiptOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4">
            {selectedCredit && <CreditReceiptDoc credit={selectedCredit} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
