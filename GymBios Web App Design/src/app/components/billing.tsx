import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Download, 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Send, 
  Calendar, 
  CreditCard, 
  Wallet, 
  Mail, 
  FileText, 
  Printer 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { toast } from 'sonner@2.0.3';

const memberReceipts = [
  {
    id: 1001,
    memberName: "Sarah Johnson",
    memberEmail: "sarah.j@email.com",
    memberPhone: "+971 50 123 4567",
    memberId: "MEM-2024-001",
    avatar: "/avatars/sarah.jpg",
    service: "Premium Annual Membership",
    amount: 1200,
    discount: 100,
    date: "2024-09-24",
    status: "Paid",
    paymentMethod: "Credit Card",
    invoiceNumber: "INV-2024-1001",
    transactionType: "Registration",
    vatApplicable: true,
    amountPaid: 1155,
    validityFrom: "2024-09-24",
    validityTo: "2025-09-24"
  },
  {
    id: 1002,
    memberName: "Mike Chen",
    memberEmail: "mike.chen@email.com",
    memberPhone: "+971 55 987 6543",
    memberId: "MEM-2024-002",
    avatar: "/avatars/mike.jpg",
    service: "Standard Monthly Membership",
    amount: 79,
    discount: 0,
    date: "2024-09-23",
    status: "Paid",
    paymentMethod: "Bank Transfer",
    invoiceNumber: "INV-2024-1002",
    transactionType: "Renewal",
    vatApplicable: true,
    amountPaid: 82.95,
    validityFrom: "2024-09-23",
    validityTo: "2024-10-23"
  },
  {
    id: 1003,
    memberName: "Emily Rodriguez",
    memberEmail: "emily.r@email.com",
    memberPhone: "+971 52 456 7890",
    memberId: "MEM-2024-003",
    avatar: "/avatars/emily.jpg",
    service: "Personal Training Session",
    amount: 65,
    discount: 5,
    date: "2024-09-22",
    status: "Pending",
    paymentMethod: "Cash",
    invoiceNumber: "INV-2024-1003",
    transactionType: "Add-on",
    vatApplicable: false,
    amountPaid: 100,
    validityFrom: "2024-09-22",
    validityTo: "2024-10-22"
  },
  {
    id: 1004,
    memberName: "David Thompson",
    memberEmail: "david.t@email.com",
    memberPhone: "+971 50 234 5678",
    memberId: "MEM-2024-004",
    avatar: "/avatars/david.jpg",
    service: "Premium Monthly Membership",
    amount: 99,
    discount: 0,
    date: "2024-09-20",
    status: "Overdue",
    paymentMethod: "Credit Card",
    invoiceNumber: "INV-2024-1004",
    transactionType: "Renewal",
    vatApplicable: true,
    amountPaid: 103.95,
    validityFrom: "2024-09-20",
    validityTo: "2024-10-20"
  },
  {
    id: 1005,
    memberName: "Alex Turner",
    memberEmail: "alex.t@email.com",
    memberPhone: "+971 56 345 6789",
    memberId: "MEM-2024-005",
    avatar: "/avatars/alex.jpg",
    service: "Membership Upgrade",
    amount: 150,
    discount: 20,
    date: "2024-09-25",
    status: "Paid",
    paymentMethod: "Credit Card",
    invoiceNumber: "INV-2024-1005",
    transactionType: "Upgrade",
    vatApplicable: true,
    amountPaid: 136.5
  },
  {
    id: 1006,
    memberName: "Lisa Park",
    memberEmail: "lisa.p@email.com",
    memberPhone: "+971 54 567 8901",
    memberId: "MEM-2024-006",
    avatar: "/avatars/lisa.jpg",
    service: "Receipt Reprint",
    amount: 5,
    discount: 0,
    date: "2024-09-21",
    status: "Paid",
    paymentMethod: "Cash",
    invoiceNumber: "INV-2024-1006",
    transactionType: "Member Receipts",
    vatApplicable: false,
    amountPaid: 10
  }
];

const memberDues = [
  {
    id: 1,
    memberName: "David Thompson",
    memberEmail: "david.t@email.com",
    avatar: "/avatars/david.jpg",
    membership: "Premium Monthly",
    amount: 99,
    dueDate: "2024-09-10",
    daysOverdue: 14,
    lastPayment: "2024-08-10",
    status: "Overdue"
  },
  {
    id: 2,
    memberName: "Lisa Wong",
    memberEmail: "lisa.w@email.com",
    avatar: "/avatars/lisa.jpg",
    membership: "Standard Monthly",
    amount: 79,
    dueDate: "2024-09-28",
    daysOverdue: 0,
    lastPayment: "2024-08-28",
    status: "Due Soon"
  },
  {
    id: 3,
    memberName: "James Miller",
    memberEmail: "james.m@email.com",
    avatar: "/avatars/james.jpg",
    membership: "Basic Monthly",
    amount: 49,
    dueDate: "2024-10-01",
    daysOverdue: 0,
    lastPayment: "2024-09-01",
    status: "Due Soon"
  },
  {
    id: 4,
    memberName: "Anna Davis",
    memberEmail: "anna.d@email.com",
    avatar: "/avatars/anna.jpg",
    membership: "Premium Monthly",
    amount: 99,
    dueDate: "2024-09-15",
    daysOverdue: 9,
    lastPayment: "2024-08-15",
    status: "Overdue"
  }
];

const collectionData = [
  { month: 'Jan', collected: 45000, target: 50000 },
  { month: 'Feb', collected: 52000, target: 50000 },
  { month: 'Mar', collected: 48000, target: 50000 },
  { month: 'Apr', collected: 55000, target: 50000 },
  { month: 'May', collected: 51000, target: 50000 },
  { month: 'Jun', collected: 58000, target: 50000 },
  { month: 'Jul', collected: 54000, target: 50000 },
  { month: 'Aug', collected: 56000, target: 50000 },
  { month: 'Sep', collected: 47000, target: 50000 }
];

interface BillingProps {
  onNavigate?: (section: string) => void;
}

export function Billing({ onNavigate }: BillingProps = {}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTransactionType, setSelectedTransactionType] = useState("all-transactions");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [receiptToEmail, setReceiptToEmail] = useState<any>(null);

  const generateReceiptHTML = (receipt: any) => {
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Check if VAT is applicable
    const isVATApplicable = receipt.vatApplicable !== false; // Default to true if not specified
    
    // Calculate financial breakdown
    const subscriptionTotal = receipt.amount;
    const discount = receipt.discount || 0;
    const grossTotal = subscriptionTotal - discount;
    const vat = isVATApplicable ? grossTotal * 0.05 : 0;
    const invoiceAmount = isVATApplicable ? grossTotal + vat : grossTotal;
    
    // Get amount paid by customer
    const amountPaid = receipt.amountPaid || invoiceAmount;
    const changeDue = amountPaid - invoiceAmount;
    
    // Check if validity period should be shown (Registration, Renewal, Day Check in, Add-on)
    const showValidity = ['Registration', 'Renewal', 'Day Check in', 'Add-on'].includes(receipt.transactionType);
    const validityText = showValidity && receipt.validityFrom && receipt.validityTo 
      ? `<br><span style="color: #327F74; font-size: 12px; font-weight: 600;">Subscription validity: from ${new Date(receipt.validityFrom).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} To: ${new Date(receipt.validityTo).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>`
      : '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - ${receipt.invoiceNumber}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans', 'Noto Sans Arabic', sans-serif; padding: 20px; background: #f5f5f5; }
        .invoice {
          font-variant-numeric: tabular-nums lining-nums;
          font-feature-settings: "tnum" 1, "lnum" 1;
        }
        .receipt-container { 
            width: 210mm; 
            min-height: 297mm; 
            margin: 0 auto; 
            background: white; 
            padding: 20mm; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            position: relative;
            box-sizing: border-box;
        }
        .header { border-bottom: 3px solid #327F74; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
        .header-left { flex: 1; }
        .company-name { color: #327F74; font-size: 32px; font-weight: bold; margin-bottom: 5px; }
        .company-tagline { color: #666; font-size: 14px; margin-bottom: 10px; }
        .company-details { color: #888; font-size: 12px; line-height: 1.6; }
        .qr-top-right { width: 120px; height: 120px; background: white; border: 2px solid #327F74; display: flex; align-items: center; justify-content: center; border-radius: 6px; flex-shrink: 0; }
        .qr-inner { text-align: center; color: #327F74; }
        .receipt-title { text-align: center; font-size: 28px; color: #333; margin: 30px 0; font-weight: 600; letter-spacing: 1px; }
        .receipt-info { display: flex; justify-content: space-between; margin-bottom: 30px; padding: 20px; background: #f9fafb; border-radius: 6px; }
        .info-block { flex: 1; }
        .info-label { color: #888; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; font-weight: 600; }
        .info-value { color: #333; font-size: 14px; font-weight: 600; }
        .receipt-number { color: #327F74; font-size: 18px; font-weight: bold; }
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; background: ${receipt.status === 'Paid' ? '#dcfce7' : receipt.status === 'Pending' ? '#fef9c3' : '#fee2e2'}; color: ${receipt.status === 'Paid' ? '#166534' : receipt.status === 'Pending' ? '#854d0e' : '#991b1b'}; }
        .customer-section { margin-bottom: 30px; padding: 20px; background: #f9fafb; border-left: 4px solid #327F74; border-radius: 6px; }
        .section-title { color: #327F74; font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.5px; }
        .customer-name { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 5px; }
        .customer-detail { color: #666; font-size: 14px; margin-bottom: 3px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        .items-table thead { background: #327F74; color: white; }
        .items-table th { padding: 15px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .items-table td { padding: 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #333; }
        .items-table tbody tr:hover { background: #f9fafb; }
        .amount-cell { font-weight: 600; color: #327F74; }
        .totals-section { margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 6px; }
        .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; }
        .total-row.normal { color: #666; }
        .total-row.discount { color: #E63946; font-weight: 600; }
        .total-row.gross { color: #333; font-weight: 600; padding-top: 10px; border-top: 1px solid #e5e7eb; }
        .total-row.vat { color: #666; }
        .total-row.grand-total { font-size: 20px; font-weight: bold; color: #327F74; padding-top: 15px; margin-top: 10px; border-top: 2px solid #327F74; }
        .payment-info { margin: 30px 0; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; }
        .payment-method { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #333; }
        .payment-label { font-weight: 600; color: #78350f; }
        .footer { margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb; text-align: center; }
        .thank-you { font-size: 18px; color: #327F74; font-weight: 600; margin-bottom: 15px; }
        .footer-note { color: #888; font-size: 12px; line-height: 1.6; margin-bottom: 10px; }
        .contact-info { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px; }
        .print-info { margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 6px; font-size: 11px; color: #666; text-align: center; }
        @media print {
            body { padding: 0; background: white; }
            .receipt-container { 
                box-shadow: none; 
                width: 210mm; 
                min-height: 297mm; 
                margin: 0; 
                border-radius: 0;
                page-break-after: always;
            }
            .print-info { display: none; }
            @page {
                size: A4;
                margin: 0;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container invoice">
        <div class="header">
            <div class="header-left">
                <div class="company-name">GymBios</div>
                <div class="company-tagline">Wellness Services Operating System</div>
                <div class="company-details">Dubai, United Arab Emirates<br>Phone: +971 4 XXX XXXX | Email: billing@gymbios.ae<br>TRN: 100XXXXXXXX0003</div>
            </div>
            <div class="qr-top-right">
                <div class="qr-inner">
                    <div style="font-size: 36px; margin-bottom: 5px;">⚡</div>
                    <div style="font-size: 10px; font-weight: 600;">RECEIPT VERIFICATION</div>
                    <div style="font-size: 9px; margin-top: 3px;">${receipt.invoiceNumber}</div>
                </div>
            </div>
        </div>
        <div class="receipt-title">${isVATApplicable ? 'Tax Invoice فاتورة ضريبية' : 'Invoice فاتورة'}</div>
        <div class="receipt-info">
            <div class="info-block"><div class="info-label">Receipt Number</div><div class="receipt-number">${receipt.invoiceNumber}</div></div>
            <div class="info-block"><div class="info-label">Date Issued</div><div class="info-value">${new Date(receipt.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
            <div class="info-block"><div class="info-label">Status</div><div><span class="status-badge">${receipt.status}</span></div></div>
        </div>
        <div class="customer-section">
            <div class="section-title">Bill To</div>
            <div class="customer-name">${receipt.memberName}</div>
            <div class="customer-detail"><strong>Member ID:</strong> ${receipt.memberId || 'N/A'}</div>
            <div class="customer-detail"><strong>Email:</strong> ${receipt.memberEmail}</div>
            <div class="customer-detail"><strong>Phone:</strong> ${receipt.memberPhone || 'N/A'}</div>
        </div>
        <table class="items-table">
            <thead><tr><th>Description</th><th>Type</th><th style="text-align: right;">${isVATApplicable ? 'Amount (Incl. VAT)' : 'Amount'}</th></tr></thead>
            <tbody>
                <tr>
                    <td><strong>${receipt.service}</strong><br><span style="color: #888; font-size: 12px;">Transaction Type: ${receipt.transactionType}</span></td>
                    <td>${receipt.transactionType}</td>
                    <td class="amount-cell" style="text-align: right;">AED ${subscriptionTotal.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
        <div class="totals-section">
            <div class="total-row normal"><span>Subscription Total${isVATApplicable ? ' (Incl. VAT)' : ''}:</span><span>AED ${subscriptionTotal.toFixed(2)}</span></div>
            ${discount > 0 ? `<div class="total-row discount"><span>Discount:</span><span>- AED ${discount.toFixed(2)}</span></div>` : ''}
            <div class="total-row gross"><span>Gross Total:</span><span>AED ${grossTotal.toFixed(2)}</span></div>
            ${isVATApplicable ? `<div class="total-row vat"><span>VAT (5%):</span><span>AED ${vat.toFixed(2)}</span></div>` : ''}
            <div class="total-row grand-total"><span>Invoice Amount:</span><span>AED ${invoiceAmount.toFixed(2)}</span></div>
            <div class="total-row normal" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;"><span>TOTAL PAID:</span><span>AED ${amountPaid.toFixed(2)}</span></div>
            ${changeDue > 0 ? `<div class="total-row normal" style="color: #16a34a; font-weight: 600;"><span>Change Due / Back:</span><span>AED ${changeDue.toFixed(2)}</span></div>` : ''}
            ${validityText}
        </div>
        <div class="payment-info">
            <div class="payment-method"><span class="payment-label">Payment Method:</span><span>${receipt.paymentMethod}</span></div>
            <div class="payment-method" style="margin-top: 8px;"><span class="payment-label">Transaction Date:</span><span>${new Date(receipt.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
        </div>
        <div class="footer">
            <div class="thank-you">Thank you for your business!</div>
            <div class="footer-note">This is an official receipt issued by GymBios. Please retain this receipt for your records.<br>For any queries regarding this transaction, please contact our billing department.</div>
            <div class="contact-info"><strong>GymBios - Wellness Services Operating System</strong><br>Dubai, United Arab Emirates | Phone: +971 4 XXX XXXX<br>Email: support@gymbios.ae | Website: www.gymbios.ae<br>TRN: 100XXXXXXXX0003</div>
        </div>
        <div class="print-info">Receipt generated on ${currentDate}<br>This is a computer-generated receipt and is valid without signature.</div>
    </div>
</body>
</html>`;
  };

  const handleDownloadReceipt = (receipt: any) => {
    // Generate and download receipt as PDF-style HTML
    const receiptHTML = generateReceiptHTML(receipt);
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${receipt.invoiceNumber}_Receipt.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Receipt ${receipt.invoiceNumber} downloaded`, {
      description: `Downloaded receipt for ${receipt.memberName}`,
      duration: 3000,
    });
  };

  const handleEmailReceipt = (receipt: any) => {
    setReceiptToEmail(receipt);
    setEmailTo(receipt.memberEmail);
    setEmailDialogOpen(true);
  };

  const sendReceiptEmail = () => {
    if (!emailTo || !receiptToEmail) return;
    
    // Simulate email sending - in production this would call email API
    toast.success(`Receipt sent to ${emailTo}`, {
      description: `${receiptToEmail.invoiceNumber} emailed successfully`,
      duration: 3000,
    });
    
    setEmailDialogOpen(false);
    setEmailTo("");
    setReceiptToEmail(null);
  };

  const handlePrintReceipt = (receipt: any) => {
    // Create printable receipt and open print dialog
    const receiptHTML = generateReceiptHTML(receipt);
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      
      toast.success(`Opening print dialog`, {
        description: `Printing receipt ${receipt.invoiceNumber}`,
        duration: 2000,
      });
    } else {
      toast.error('Unable to open print window', {
        description: 'Please allow pop-ups for this site',
        duration: 3000,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid": return "bg-green-100 text-green-800";
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "Overdue": return "bg-red-100 text-red-800";
      case "Due Soon": return "bg-orange-100 text-orange-800";
      case "Cancelled": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredReceipts = memberReceipts.filter(receipt => {
    const matchesSearch = receipt.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || receipt.status.toLowerCase() === selectedStatus;
    const matchesTransactionType = selectedTransactionType === "all-transactions" || 
                                 receipt.transactionType.toLowerCase() === selectedTransactionType.toLowerCase();
    return matchesSearch && matchesStatus && matchesTransactionType;
  });

  const totalCollected = collectionData[collectionData.length - 1].collected;
  const monthlyTarget = collectionData[collectionData.length - 1].target;
  const overdueCount = memberDues.filter(m => m.status === "Overdue").length;
  const dueSoonCount = memberDues.filter(m => m.status === "Due Soon").length;
  const overdueAmount = memberDues.filter(m => m.status === "Overdue").reduce((sum, m) => sum + m.amount, 0);

  // Today's collection data
  const todaysCollectionCash = 4850;
  const todaysCollectionCard = 8920;
  const todaysCollectionCredit = 1200;
  const todaysCollectionTotal = todaysCollectionCash + todaysCollectionCard + todaysCollectionCredit;
  const todaysTarget = 15000;

  // Monthly collection breakdown
  const monthlyCollectionCash = 12500;
  const monthlyCollectionCard = 28000;
  const monthlyCollectionCredit = 6500;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Manage member receipts, dues, and payment collections.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button onClick={() => onNavigate && onNavigate("create-receipt")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Receipt
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" style={{ display: 'none' }}>
                <Plus className="mr-2 h-4 w-4" />
                Old Create Receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Receipt</DialogTitle>
                <DialogDescription>
                  Generate a receipt for a member payment.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="member">Select Member</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sarah">Sarah Johnson</SelectItem>
                      <SelectItem value="mike">Mike Chen</SelectItem>
                      <SelectItem value="emily">Emily Rodriguez</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service">Service</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly Membership</SelectItem>
                        <SelectItem value="annual">Annual Membership</SelectItem>
                        <SelectItem value="pt">Personal Training</SelectItem>
                        <SelectItem value="addon">Add-on Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" placeholder="99.00" type="number" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Credit Card</SelectItem>
                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline">Cancel</Button>
                <Button>Create Receipt</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Today's Collection Card */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Collection</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#327F74]" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-2xl font-bold text-[#327F74]">AED {todaysCollectionTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Target: AED {todaysTarget.toLocaleString()} ({((todaysCollectionTotal / todaysTarget) * 100).toFixed(0)}%)
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-muted-foreground">Cash</span>
                </div>
                <span className="font-medium">AED {todaysCollectionCash.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-muted-foreground">Card</span>
                </div>
                <span className="font-medium">AED {todaysCollectionCard.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-orange-600" />
                  <span className="text-muted-foreground">Credit</span>
                </div>
                <span className="font-medium text-orange-600">AED {todaysCollectionCredit.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Collection Card */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Collection</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-2xl font-bold">AED {totalCollected.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Target: AED {monthlyTarget.toLocaleString()} ({((totalCollected / monthlyTarget) * 100).toFixed(0)}%)
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-muted-foreground">Cash</span>
                </div>
                <span className="font-medium">AED {monthlyCollectionCash.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-muted-foreground">Card</span>
                </div>
                <span className="font-medium">AED {monthlyCollectionCard.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-orange-600" />
                  <span className="text-muted-foreground">Credit</span>
                </div>
                <span className="font-medium text-orange-600">AED {monthlyCollectionCredit.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">
              AED {overdueAmount} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dueSoonCount}</div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">94%</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receipts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="receipts">Member Receipts</TabsTrigger>
          <TabsTrigger value="dues">Member Due</TabsTrigger>
          <TabsTrigger value="collection">Total Collection</TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Member Receipts</CardTitle>
                  <CardDescription>All payment receipts and transaction history</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
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
                      placeholder="Search receipts..."
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
                    <SelectItem value="registration">Registration</SelectItem>
                    <SelectItem value="renewal">Renewal</SelectItem>
                    <SelectItem value="upgrade">Upgrade</SelectItem>
                    <SelectItem value="add-on">Add-on</SelectItem>
                    <SelectItem value="member receipts">Member Receipts</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="this-month">
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">
                        {receipt.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={receipt.avatar} />
                            <AvatarFallback>{receipt.memberName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{receipt.memberName}</div>
                            <div className="text-sm text-muted-foreground">{receipt.memberEmail}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{receipt.service}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {receipt.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">AED {receipt.amount}</TableCell>
                      <TableCell>{new Date(receipt.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                          {receipt.paymentMethod}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(receipt.status)}>
                          {receipt.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedReceipt(receipt)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(receipt)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEmailReceipt(receipt)}>
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handlePrintReceipt(receipt)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dues" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Member Due Payments</CardTitle>
                  <CardDescription>Track overdue and upcoming membership payments</CardDescription>
                </div>
                <Button>
                  <Send className="mr-2 h-4 w-4" />
                  Send Reminders
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Membership</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberDues.map((due) => (
                    <TableRow key={due.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={due.avatar} />
                            <AvatarFallback>{due.memberName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{due.memberName}</div>
                            <div className="text-sm text-muted-foreground">{due.memberEmail}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{due.membership}</TableCell>
                      <TableCell className="font-medium">AED {due.amount}</TableCell>
                      <TableCell>
                        <div className={due.status === "Overdue" ? "text-red-600" : ""}>
                          {new Date(due.dueDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {due.daysOverdue > 0 ? (
                          <span className="text-red-600 font-medium">{due.daysOverdue} days</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(due.lastPayment).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(due.status)}>
                          {due.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <CreditCard className="h-4 w-4" />
                          </Button>
                          {due.status === "Overdue" && (
                            <Button variant="outline" size="sm" className="text-red-600">
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Overdue Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Overdue Amount</span>
                    <span className="font-bold text-red-600">AED {overdueAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Number of Overdue Members</span>
                    <span className="font-bold">{overdueCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Days Overdue</span>
                    <span className="font-bold">
                      {Math.round(memberDues.filter(m => m.daysOverdue > 0).reduce((sum, m) => sum + m.daysOverdue, 0) / overdueCount || 0)} days
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Send className="mr-2 h-4 w-4" />
                  Send Overdue Reminders
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Payment Plans
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Export Overdue Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Freeze Overdue Accounts
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="collection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Collection Analytics</CardTitle>
              <CardDescription>Revenue collection trends and performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={collectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="collected" fill="#8884d8" name="Collected" />
                  <Bar dataKey="target" fill="#82ca9d" name="Target" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${totalCollected.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">
                  {((totalCollected / monthlyTarget) * 100).toFixed(1)}% of target
                </p>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min((totalCollected / monthlyTarget) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Monthly</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${Math.round(collectionData.reduce((sum, item) => sum + item.collected, 0) / collectionData.length).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on 9 months
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">+12.3%</div>
                <p className="text-sm text-muted-foreground">
                  Year over year
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Collection by Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">65%</div>
                  <p className="text-sm text-muted-foreground">Credit Card</p>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">20%</div>
                  <p className="text-sm text-muted-foreground">Bank Transfer</p>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">10%</div>
                  <p className="text-sm text-muted-foreground">Cash</p>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">5%</div>
                  <p className="text-sm text-muted-foreground">Check</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Receipt Details Dialog */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Receipt Details</DialogTitle>
              <DialogDescription>
                View complete details of the selected receipt transaction
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-bold text-lg">{selectedReceipt.invoiceNumber}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(selectedReceipt.date).toLocaleDateString()}
                  </div>
                </div>
                <Badge className={getStatusColor(selectedReceipt.status)}>
                  {selectedReceipt.status}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Member:</span>
                  <span className="text-sm">{selectedReceipt.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Service:</span>
                  <span className="text-sm">{selectedReceipt.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Payment Method:</span>
                  <span className="text-sm">{selectedReceipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-medium">Total Amount:</span>
                  <span className="font-bold text-lg">${selectedReceipt.amount}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => handlePrintReceipt(selectedReceipt)}>
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
              <Button variant="outline" onClick={() => handleDownloadReceipt(selectedReceipt)}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button variant="outline" onClick={() => {
                const receipt = selectedReceipt;
                setSelectedReceipt(null);
                handleEmailReceipt(receipt);
              }}>
                <Mail className="mr-2 h-4 w-4" />
                Email Receipt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Email Receipt Dialog */}
      {emailDialogOpen && (
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Email Receipt</DialogTitle>
              <DialogDescription>
                Send the receipt to the member's email address
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-bold text-lg">{receiptToEmail?.invoiceNumber}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(receiptToEmail?.date).toLocaleDateString()}
                  </div>
                </div>
                <Badge className={getStatusColor(receiptToEmail?.status)}>
                  {receiptToEmail?.status}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Member:</span>
                  <span className="text-sm">{receiptToEmail?.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Service:</span>
                  <span className="text-sm">{receiptToEmail?.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Payment Method:</span>
                  <span className="text-sm">{receiptToEmail?.paymentMethod}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-medium">Total Amount:</span>
                  <span className="font-bold text-lg">${receiptToEmail?.amount}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                placeholder="Enter email address"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={sendReceiptEmail}>
                Send Email
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}