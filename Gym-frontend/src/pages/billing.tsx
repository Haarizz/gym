import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { 
  Receipt, 
  AlertCircle, 
  DollarSign, 
  CreditCard, 
  Download, 
  Search, 
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Plus,
  FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const memberReceipts = [
  {
    id: 1001,
    memberName: "Sarah Johnson",
    memberEmail: "sarah.j@email.com",
    avatar: "/avatars/sarah.jpg",
    service: "Premium Annual Membership",
    amount: 1200,
    date: "2024-09-24",
    status: "Paid",
    paymentMethod: "Credit Card",
    invoiceNumber: "INV-2024-1001",
    transactionType: "Registration"
  },
  {
    id: 1002,
    memberName: "Mike Chen",
    memberEmail: "mike.chen@email.com",
    avatar: "/avatars/mike.jpg",
    service: "Standard Monthly Membership",
    amount: 79,
    date: "2024-09-23",
    status: "Paid",
    paymentMethod: "Bank Transfer",
    invoiceNumber: "INV-2024-1002",
    transactionType: "Renewal"
  },
  {
    id: 1003,
    memberName: "Emily Rodriguez",
    memberEmail: "emily.r@email.com",
    avatar: "/avatars/emily.jpg",
    service: "Personal Training Session",
    amount: 65,
    date: "2024-09-22",
    status: "Pending",
    paymentMethod: "Cash",
    invoiceNumber: "INV-2024-1003",
    transactionType: "Add-on"
  },
  {
    id: 1004,
    memberName: "David Thompson",
    memberEmail: "david.t@email.com",
    avatar: "/avatars/david.jpg",
    service: "Premium Monthly Membership",
    amount: 99,
    date: "2024-09-20",
    status: "Overdue",
    paymentMethod: "Credit Card",
    invoiceNumber: "INV-2024-1004",
    transactionType: "Renewal"
  },
  {
    id: 1005,
    memberName: "Alex Turner",
    memberEmail: "alex.t@email.com",
    avatar: "/avatars/alex.jpg",
    service: "Membership Upgrade",
    amount: 150,
    date: "2024-09-25",
    status: "Paid",
    paymentMethod: "Credit Card",
    invoiceNumber: "INV-2024-1005",
    transactionType: "Upgrade"
  },
  {
    id: 1006,
    memberName: "Lisa Park",
    memberEmail: "lisa.p@email.com",
    avatar: "/avatars/lisa.jpg",
    service: "Receipt Reprint",
    amount: 5,
    date: "2024-09-21",
    status: "Paid",
    paymentMethod: "Cash",
    invoiceNumber: "INV-2024-1006",
    transactionType: "Member Receipts"
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

      <style>{`
        @keyframes tabSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [role="tabpanel"][data-state="active"] {
          animation: tabSlideIn 0.22s ease-out;
        }
      `}</style>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Collection</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Target: AED {monthlyTarget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Payments</CardTitle>
            <div className="p-2 rounded-lg bg-red-100">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">
              AED {overdueAmount} total
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due Soon</CardTitle>
            <div className="p-2 rounded-lg bg-orange-100">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dueSoonCount}</div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
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
        <TabsList className="w-full flex">
          <TabsTrigger value="receipts" className="flex-1">Member Receipts</TabsTrigger>
          <TabsTrigger value="dues" className="flex-1">Member Due</TabsTrigger>
          <TabsTrigger value="collection" className="flex-1">Total Collection</TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="space-y-6">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
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
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
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
                    <TableRow key={receipt.id} className="hover:bg-slate-50/50 transition-colors">
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
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-primary/20 hover:bg-blue-50" onClick={() => setSelectedReceipt(receipt)}>
                            <FileText className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-primary/20 hover:bg-green-50">
                            <Download className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-primary/20 hover:bg-purple-50">
                            <Send className="h-4 w-4 text-purple-600" />
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
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
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
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
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
                    <TableRow key={due.id} className="hover:bg-slate-50/50 transition-colors">
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
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-primary/20 hover:bg-blue-50">
                            <Send className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-primary/20 hover:bg-green-50">
                            <CreditCard className="h-4 w-4 text-green-600" />
                          </Button>
                          {due.status === "Overdue" && (
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-primary/20 hover:bg-red-50">
                              <AlertCircle className="h-4 w-4 text-red-600" />
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
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
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

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
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
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Total Collection Analytics</CardTitle>
              <CardDescription>Revenue collection trends and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
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
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">AED {totalCollected.toLocaleString()}</div>
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

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Average Monthly</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  AED {Math.round(collectionData.reduce((sum, item) => sum + item.collected, 0) / collectionData.length).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on 9 months
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
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

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Collection by Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "Credit Card", value: 65, color: "text-blue-600", bar: "bg-blue-600" },
                  { label: "Bank Transfer", value: 20, color: "text-indigo-600", bar: "bg-indigo-600" },
                  { label: "Cash", value: 10, color: "text-emerald-600", bar: "bg-emerald-600" },
                  { label: "Check", value: 5, color: "text-amber-600", bar: "bg-amber-600" },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-lg bg-white shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <span className={`text-sm font-semibold ${item.color}`}>{item.value}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200/60 overflow-hidden">
                      <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
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
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button>
                <Send className="mr-2 h-4 w-4" />
                Email Receipt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

