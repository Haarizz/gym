import React, { useState, useEffect, useCallback } from 'react';
import { taxComplianceService, TaxComplianceItem } from '../utils/supabase/tax-compliance-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { 
  FileText,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Filter,
  Search,
  FileSpreadsheet,
  FileCode,
  Eye,
  Settings,
  History,
  Bell,
  ChevronRight,
  Building2,
  Receipt,
  DollarSign,
  BarChart3,
  Archive
} from 'lucide-react';
import { format, addMonths, addQuarters, addYears, isBefore, isAfter, isWithinInterval } from 'date-fns';

// Sample data for tax types
const sampleTaxTypes = [
  {
    id: 1,
    taxType: "Corporate Tax",
    filingFrequency: "Quarterly",
    rate: "9%",
    linkedAccounts: ["Revenue", "Operating Expenses", "Depreciation"],
    status: "Active",
    nextDueDate: new Date(2025, 11, 31), // Dec 31, 2025
    lastFiled: new Date(2025, 8, 30), // Sep 30, 2025
    currentPeriod: "Q4 2025",
    amountPayable: 45500
  },
  {
    id: 2,
    taxType: "VAT",
    filingFrequency: "Monthly",
    rate: "5%",
    linkedAccounts: ["Sales Revenue", "Purchase Expenses"],
    status: "Active",
    nextDueDate: new Date(2025, 10, 28), // Nov 28, 2025
    lastFiled: new Date(2025, 9, 28), // Oct 28, 2025
    currentPeriod: "November 2025",
    amountPayable: 12300
  },
  {
    id: 3,
    taxType: "Excise Tax",
    filingFrequency: "Quarterly",
    rate: "50%",
    linkedAccounts: ["Excisable Goods Revenue"],
    status: "Active",
    nextDueDate: new Date(2025, 11, 31), // Dec 31, 2025
    lastFiled: new Date(2025, 8, 30), // Sep 30, 2025
    currentPeriod: "Q4 2025",
    amountPayable: 8900
  }
];

// Sample filings data
const sampleFilings = [
  {
    id: 1,
    taxTypeId: 1,
    taxType: "Corporate Tax",
    period: "Q3 2025",
    dueDate: new Date(2025, 8, 30),
    status: "Filed",
    amountPayable: 42000,
    filedDate: new Date(2025, 8, 25),
    documents: ["Q3_Corporate_Tax_Return.pdf", "Payment_Receipt_42000.pdf"],
    notes: "Filed on time with all supporting documents"
  },
  {
    id: 2,
    taxTypeId: 2,
    taxType: "VAT",
    period: "October 2025",
    dueDate: new Date(2025, 9, 28),
    status: "Filed",
    amountPayable: 11800,
    filedDate: new Date(2025, 9, 26),
    documents: ["October_VAT_Return.pdf", "VAT_Payment_Receipt.pdf"],
    notes: "Regular monthly filing completed"
  },
  {
    id: 3,
    taxTypeId: 2,
    taxType: "VAT",
    period: "November 2025",
    dueDate: new Date(2025, 10, 28),
    status: "Pending",
    amountPayable: 12300,
    filedDate: null,
    documents: [],
    notes: ""
  },
  {
    id: 4,
    taxTypeId: 1,
    taxType: "Corporate Tax",
    period: "Q4 2025",
    dueDate: new Date(2025, 11, 31),
    status: "Pending",
    amountPayable: 45500,
    filedDate: null,
    documents: [],
    notes: ""
  },
  {
    id: 5,
    taxTypeId: 3,
    taxType: "Excise Tax",
    period: "Q4 2025",
    dueDate: new Date(2025, 11, 31),
    status: "Pending",
    amountPayable: 8900,
    filedDate: null,
    documents: [],
    notes: ""
  },
  {
    id: 6,
    taxTypeId: 2,
    taxType: "VAT",
    period: "September 2025",
    dueDate: new Date(2025, 8, 28),
    status: "Overdue",
    amountPayable: 10500,
    filedDate: null,
    documents: [],
    notes: "Requires immediate attention"
  }
];

// Sample audit log data
const sampleAuditLog = [
  {
    id: 1,
    timestamp: new Date(2025, 9, 26, 14, 30),
    user: "Sarah Johnson",
    action: "Filed VAT Return",
    taxType: "VAT",
    period: "October 2025",
    details: "Submitted October VAT return with AED 11,800 payable"
  },
  {
    id: 2,
    timestamp: new Date(2025, 9, 26, 14, 25),
    user: "Sarah Johnson",
    action: "Uploaded Document",
    taxType: "VAT",
    period: "October 2025",
    details: "Uploaded October_VAT_Return.pdf"
  },
  {
    id: 3,
    timestamp: new Date(2025, 8, 25, 16, 45),
    user: "Ahmed Hassan",
    action: "Filed Corporate Tax Return",
    taxType: "Corporate Tax",
    period: "Q3 2025",
    details: "Submitted Q3 Corporate Tax return with AED 42,000 payable"
  },
  {
    id: 4,
    timestamp: new Date(2025, 8, 20, 10, 15),
    user: "Sarah Johnson",
    action: "Updated Configuration",
    taxType: "VAT",
    period: "N/A",
    details: "Updated VAT filing frequency to Monthly"
  }
];

export function TaxCompliance() {
  const [activeTab, setActiveTab] = useState("overview");
  const [taxTypes, setTaxTypes] = useState(sampleTaxTypes);
  const [filings, setFilings] = useState(sampleFilings);
  const [apiFilings, setApiFilings] = useState<TaxComplianceItem[]>([]);
  const [auditLog] = useState(sampleAuditLog);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showFilingDialog, setShowFilingDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingTaxType, setEditingTaxType] = useState<typeof sampleTaxTypes[0] | null>(null);
  const [selectedFiling, setSelectedFiling] = useState<typeof sampleFilings[0] | null>(null);
  const [viewingFiling, setViewingFiling] = useState<typeof sampleFilings[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTaxType, setFilterTaxType] = useState("all");
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Form data for tax configuration
  const [configFormData, setConfigFormData] = useState({
    taxType: "",
    filingFrequency: "Monthly",
    rate: "",
    linkedAccounts: "",
    status: "Active"
  });

  // Form data for filing
  const [filingFormData, setFilingFormData] = useState({
    period: "",
    amountPayable: "",
    notes: "",
    status: "Filed"
  });

  const loadApiFilings = useCallback(async () => {
    try {
      const data = await taxComplianceService.getAll();
      setApiFilings(data);
    } catch {
      // fall back to mock data
    }
  }, []);

  useEffect(() => { loadApiFilings(); }, [loadApiFilings]);

  const resetConfigForm = () => {
    setConfigFormData({
      taxType: "",
      filingFrequency: "Monthly",
      rate: "",
      linkedAccounts: "",
      status: "Active"
    });
    setEditingTaxType(null);
  };

  const resetFilingForm = () => {
    setFilingFormData({
      period: "",
      amountPayable: "",
      notes: "",
      status: "Filed"
    });
    setSelectedFiling(null);
  };

  const handleAddTaxType = async () => {
    const newTaxType = {
      id: Date.now(),
      taxType: configFormData.taxType,
      filingFrequency: configFormData.filingFrequency,
      rate: configFormData.rate,
      linkedAccounts: configFormData.linkedAccounts.split(",").map(a => a.trim()),
      status: configFormData.status as "Active" | "Inactive",
      nextDueDate: addMonths(new Date(), 1),
      lastFiled: null,
      currentPeriod: format(new Date(), "MMMM yyyy"),
      amountPayable: 0
    };
    // Also create a compliance record in the backend
    try {
      await taxComplianceService.create({
        taxType: configFormData.taxType.toUpperCase().replace(' ', '_'),
        taxPeriod: format(new Date(), "MMMM yyyy"),
        dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
        status: 'PENDING',
      });
      await loadApiFilings();
    } catch {
      // silently fail - UI still updates
    }
    setTaxTypes([...taxTypes, newTaxType]);
    setShowConfigDialog(false);
    resetConfigForm();
  };

  const handleUpdateTaxType = () => {
    if (!editingTaxType) return;
    const updatedTaxTypes = taxTypes.map(tt => 
      tt.id === editingTaxType.id 
        ? {
            ...tt,
            taxType: configFormData.taxType,
            filingFrequency: configFormData.filingFrequency,
            rate: configFormData.rate,
            linkedAccounts: configFormData.linkedAccounts.split(",").map(a => a.trim()),
            status: configFormData.status as "Active" | "Inactive"
          }
        : tt
    );
    setTaxTypes(updatedTaxTypes);
    setShowConfigDialog(false);
    resetConfigForm();
  };

  const handleEditTaxType = (taxType: typeof sampleTaxTypes[0]) => {
    setEditingTaxType(taxType);
    setConfigFormData({
      taxType: taxType.taxType,
      filingFrequency: taxType.filingFrequency,
      rate: taxType.rate,
      linkedAccounts: taxType.linkedAccounts.join(", "),
      status: taxType.status
    });
    setShowConfigDialog(true);
  };

  const handleDeleteTaxType = (id: number) => {
    setTaxTypes(taxTypes.filter(tt => tt.id !== id));
  };

  const handleUpdateFiling = async () => {
    if (!selectedFiling) return;
    const updatedFilings = filings.map(f =>
      f.id === selectedFiling.id
        ? {
            ...f,
            status: filingFormData.status as "Pending" | "Filed" | "Overdue",
            amountPayable: parseFloat(filingFormData.amountPayable) || f.amountPayable,
            notes: filingFormData.notes,
            filedDate: filingFormData.status === "Filed" ? new Date() : null
          }
        : f
    );
    setFilings(updatedFilings);
    // If API filing exists with matching period, update via API
    const apiMatch = apiFilings.find(af =>
      af.taxPeriod === selectedFiling.period &&
      af.taxType.toLowerCase().replace('_', ' ') === selectedFiling.taxType.toLowerCase()
    );
    if (apiMatch) {
      try {
        if (filingFormData.status === "Filed") {
          await taxComplianceService.markFiled(apiMatch.id, {
            filedDate: format(new Date(), 'yyyy-MM-dd'),
            filingAmount: parseFloat(filingFormData.amountPayable) || undefined,
          });
        } else {
          await taxComplianceService.update(apiMatch.id, {
            taxType: apiMatch.taxType,
            taxPeriod: apiMatch.taxPeriod,
            dueDate: apiMatch.dueDate,
            notes: filingFormData.notes || undefined,
            status: filingFormData.status.toUpperCase(),
          });
        }
        await loadApiFilings();
      } catch {
        // silently fail
      }
    }
    setShowFilingDialog(false);
    resetFilingForm();
  };

  const handleEditFiling = (filing: typeof sampleFilings[0]) => {
    setSelectedFiling(filing);
    setFilingFormData({
      period: filing.period,
      amountPayable: filing.amountPayable.toString(),
      notes: filing.notes,
      status: filing.status
    });
    setShowFilingDialog(true);
  };

  const handleViewFiling = (filing: typeof sampleFilings[0]) => {
    setViewingFiling(filing);
    setShowViewDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Filed": return "bg-green-100 text-green-800 border-green-200";
      case "Pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Overdue": return "bg-red-100 text-red-800 border-red-200";
      case "Active": return "bg-green-100 text-green-800 border-green-200";
      case "Inactive": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Filed": return <CheckCircle className="h-4 w-4" />;
      case "Pending": return <Clock className="h-4 w-4" />;
      case "Overdue": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredFilings = filings.filter(filing => {
    const matchesSearch = filing.taxType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          filing.period.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || filing.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesTaxType = filterTaxType === "all" || filing.taxType === filterTaxType;
    return matchesSearch && matchesStatus && matchesTaxType;
  });

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate summary stats
  const totalPendingAmount = filings
    .filter(f => f.status === "Pending" || f.status === "Overdue")
    .reduce((sum, f) => sum + f.amountPayable, 0);
  
  const overdueFilings = filings.filter(f => f.status === "Overdue").length;
  const upcomingFilings = filings.filter(f => {
    const daysUntil = getDaysUntilDue(f.dueDate);
    return f.status === "Pending" && daysUntil <= 7 && daysUntil >= 0;
  }).length;
  const filedThisMonth = filings.filter(f => {
    const filedDate = f.filedDate;
    if (!filedDate) return false;
    const now = new Date();
    return filedDate.getMonth() === now.getMonth() && filedDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tax Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage Corporate Tax, VAT, and Excise Tax compliance in one centralized interface</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="shadow-sm hover:shadow-md transition-all"
            onClick={() => setShowAuditLog(true)}
          >
            <History className="mr-2 h-4 w-4" />
            Audit Log
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
            onClick={() => setShowConfigDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Tax Type
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Total Pending Amount</CardTitle>
            <div className="bg-emerald-50 p-2 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">AED {totalPendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all tax types</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Overdue Filings</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{overdueFilings}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Due This Week</CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Bell className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{upcomingFilings}</div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming in next 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Filed This Month</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{filedThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="configuration">
            <Settings className="mr-2 h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="filings">
            <FileText className="mr-2 h-4 w-4" />
            Filings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {taxTypes.filter(tt => tt.status === "Active").map((taxType) => {
            const daysUntil = getDaysUntilDue(taxType.nextDueDate);
            const isUrgent = daysUntil <= 7 && daysUntil >= 0;
              
            return (
                <Card key={taxType.id} className={`bg-white border border-gray-100 shadow-sm ${isUrgent ? 'ring-2 ring-red-200' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{taxType.taxType}</CardTitle>
                      <Badge className={getStatusColor(taxType.status)}>
                        {taxType.status}
                      </Badge>
                    </div>
                    <CardDescription>{taxType.currentPeriod}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Next Due Date</span>
                        {isUrgent && <Badge variant="outline" className="text-xs" style={{ color: '#E63946', borderColor: '#E63946' }}>
                          {daysUntil} days left
                        </Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{format(taxType.nextDueDate, "dd MMM yyyy")}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Amount Payable</div>
                      <div className="text-2xl font-bold" style={{ color: '#2B7A78' }}>
                        AED {taxType.amountPayable.toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Filing Frequency</div>
                      <Badge variant="outline">{taxType.filingFrequency}</Badge>
                    </div>

                    {taxType.lastFiled && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Last Filed</div>
                        <div className="text-sm">{format(taxType.lastFiled, "dd MMM yyyy")}</div>
                      </div>
                    )}

                    <Button 
                      className="w-full mt-4 bg-white shadow-sm hover:shadow-md border border-gray-200"
                      variant="ghost"
                      onClick={() => {
                        const filing = filings.find(f => 
                          f.taxTypeId === taxType.id && f.status === "Pending"
                        );
                        if (filing) handleEditFiling(filing);
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      File Return
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filing Calendar */}
          <Card className="bg-white border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle>Filing Calendar</CardTitle>
              <CardDescription>Upcoming due dates and filing statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filings
                  .filter(f => f.status !== "Filed")
                  .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
                  .slice(0, 5)
                  .map((filing) => {
                    const daysUntil = getDaysUntilDue(filing.dueDate);
                    return (
                      <div key={filing.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-lg" style={{ backgroundColor: '#F0F9F9' }}>
                            {getStatusIcon(filing.status)}
                          </div>
                          <div>
                            <div className="font-medium">{filing.taxType}</div>
                            <div className="text-sm text-muted-foreground">{filing.period}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">AED {filing.amountPayable.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              Due: {format(filing.dueDate, "dd MMM yyyy")}
                            </div>
                          </div>
                          <Badge className={getStatusColor(filing.status)}>
                            {filing.status}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => handleEditFiling(filing)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Tax Type Configuration</CardTitle>
              <CardDescription>Define and manage tax types, filing frequencies, and linked accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="min-w-full">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Filing Frequency</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Linked Accounts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxTypes.map((taxType) => (
                    <TableRow key={taxType.id}>
                      <TableCell>
                        <div className="font-medium">{taxType.taxType}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{taxType.filingFrequency}</Badge>
                      </TableCell>
                      <TableCell>{taxType.rate}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {taxType.linkedAccounts.slice(0, 2).map((account, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {account}
                            </Badge>
                          ))}
                          {taxType.linkedAccounts.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{taxType.linkedAccounts.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(taxType.status)}>
                          {taxType.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditTaxType(taxType)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteTaxType(taxType.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-0 shadow-sm hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Corporate Tax Summary
                </CardTitle>
                <CardDescription>Income, deductions, taxable profit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Revenue</span>
                    <span className="font-medium">AED 1,850,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deductions</span>
                    <span className="font-medium">AED 1,344,440</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxable Profit</span>
                    <span className="font-medium">AED 505,560</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium">Tax Payable (9%)</span>
                    <span className="font-bold" style={{ color: '#2B7A78' }}>AED 45,500</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-white shadow-sm hover:shadow-md border-0" variant="ghost" size="sm">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button className="flex-1 bg-white shadow-sm hover:shadow-md border-0" variant="ghost" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  VAT Return Report
                </CardTitle>
                <CardDescription>Output VAT, Input VAT, Net VAT</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Output VAT (5%)</span>
                    <span className="font-medium">AED 92,500</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Input VAT (5%)</span>
                    <span className="font-medium">AED 80,200</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium">Net VAT Payable</span>
                    <span className="font-bold" style={{ color: '#2B7A78' }}>AED 12,300</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-white shadow-sm hover:shadow-md border-0" variant="ghost" size="sm">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button className="flex-1 bg-white shadow-sm hover:shadow-md border-0" variant="ghost" size="sm">
                    <FileCode className="mr-2 h-4 w-4" />
                    XML
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Excise Tax Report
                </CardTitle>
                <CardDescription>Tax on specific goods/services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Excisable Goods Value</span>
                    <span className="font-medium">AED 17,800</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax Rate</span>
                    <span className="font-medium">50%</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium">Excise Tax Payable</span>
                    <span className="font-bold" style={{ color: '#2B7A78' }}>AED 8,900</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-white shadow-sm hover:shadow-md border-0" variant="ghost" size="sm">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button className="flex-1 bg-white shadow-sm hover:shadow-md border-0" variant="ghost" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filing History */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Filing History</CardTitle>
              <CardDescription>Log of all submitted returns and payment statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4">
                <Select value={filterTaxType} onValueChange={setFilterTaxType}>
                  <SelectTrigger className="w-[200px] shadow-sm">
                    <SelectValue placeholder="All Tax Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tax Types</SelectItem>
                    <SelectItem value="Corporate Tax">Corporate Tax</SelectItem>
                    <SelectItem value="VAT">VAT</SelectItem>
                    <SelectItem value="Excise Tax">Excise Tax</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[200px] shadow-sm">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="filed">Filed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="ghost" className="bg-white shadow-sm hover:shadow-md border-0">
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </div>

              <Table className="min-w-full">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Filed Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFilings
                    .filter(f => f.status === "Filed")
                    .sort((a, b) => (b.filedDate?.getTime() || 0) - (a.filedDate?.getTime() || 0))
                    .map((filing) => (
                      <TableRow key={filing.id}>
                        <TableCell>
                          <div className="font-medium">{filing.taxType}</div>
                        </TableCell>
                        <TableCell>{filing.period}</TableCell>
                        <TableCell>{format(filing.dueDate, "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          {filing.filedDate ? format(filing.filedDate, "dd MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">AED {filing.amountPayable.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(filing.status)}>
                            {getStatusIcon(filing.status)}
                            <span className="ml-1">{filing.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleViewFiling(filing)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filings Tab */}
      <TabsContent value="filings" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Filings Management</CardTitle>
                  <CardDescription>Manage tax periods, filing due dates, and document uploads</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by tax type or period..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>

                <Select value={filterTaxType} onValueChange={setFilterTaxType}>
                  <SelectTrigger className="w-[200px] shadow-sm">
                    <SelectValue placeholder="All Tax Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tax Types</SelectItem>
                    <SelectItem value="Corporate Tax">Corporate Tax</SelectItem>
                    <SelectItem value="VAT">VAT</SelectItem>
                    <SelectItem value="Excise Tax">Excise Tax</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[200px] shadow-sm">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="filed">Filed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {filteredFilings.map((filing) => {
                  const daysUntil = getDaysUntilDue(filing.dueDate);
                  const isUrgent = daysUntil <= 7 && daysUntil >= 0 && filing.status !== "Filed";

                  return (
                    <div 
                      key={filing.id} 
                      className={`p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-all border border-gray-100 ${isUrgent ? 'ring-2 ring-red-200' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4 flex-1">
                          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-slate-50">
                            {getStatusIcon(filing.status)}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold">{filing.taxType}</h3>
                                <Badge className={getStatusColor(filing.status)}>
                                  {filing.status}
                                </Badge>
                                {isUrgent && (
                                <Badge variant="outline" className="border-red-200 text-red-600">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Due in {daysUntil} days
                                </Badge>
                              )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                Tax Period: {filing.period}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Due Date:</span>
                                <div className="font-medium">{format(filing.dueDate, "dd MMM yyyy")}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Amount:</span>
                                <div className="font-medium text-gymbios-primary">
                                  AED {filing.amountPayable.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Documents:</span>
                                <div className="font-medium">{filing.documents.length} file(s)</div>
                              </div>
                            </div>

                            {filing.notes && (
                              <div className="text-sm p-2 bg-slate-50 rounded">
                                <span className="text-muted-foreground">Notes: </span>
                                {filing.notes}
                              </div>
                            )}

                            {filing.documents.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {filing.documents.map((doc, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {doc}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-white shadow-sm hover:shadow-md border-0"
                            onClick={() => handleEditFiling(filing)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-white shadow-sm hover:shadow-md border-0"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-white shadow-sm hover:shadow-md border-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tax Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={(open) => {
        setShowConfigDialog(open);
        if (!open) resetConfigForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTaxType ? "Edit Tax Type" : "Add New Tax Type"}
            </DialogTitle>
            <DialogDescription>
              Configure tax type, filing frequency, and linked accounts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="taxType">Tax Type *</Label>
              <Select 
                value={configFormData.taxType} 
                onValueChange={(value) => setConfigFormData({...configFormData, taxType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tax type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Corporate Tax">Corporate Tax</SelectItem>
                  <SelectItem value="VAT">VAT (Value Added Tax)</SelectItem>
                  <SelectItem value="Excise Tax">Excise Tax</SelectItem>
                  <SelectItem value="Customs Duty">Customs Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filingFrequency">Filing Frequency *</Label>
              <Select 
                value={configFormData.filingFrequency} 
                onValueChange={(value) => setConfigFormData({...configFormData, filingFrequency: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Tax Rate *</Label>
              <Input
                id="rate"
                placeholder="e.g., 5%, 9%, 50%"
                value={configFormData.rate}
                onChange={(e) => setConfigFormData({...configFormData, rate: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedAccounts">Linked Accounts (comma-separated)</Label>
              <Textarea
                id="linkedAccounts"
                placeholder="e.g., Revenue, Operating Expenses, Depreciation"
                value={configFormData.linkedAccounts}
                onChange={(e) => setConfigFormData({...configFormData, linkedAccounts: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={configFormData.status} 
                onValueChange={(value) => setConfigFormData({...configFormData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowConfigDialog(false);
                resetConfigForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={editingTaxType ? handleUpdateTaxType : handleAddTaxType}
              style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
            >
              {editingTaxType ? "Update" : "Add"} Tax Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filing Dialog */}
      <Dialog open={showFilingDialog} onOpenChange={(open) => {
        setShowFilingDialog(open);
        if (!open) resetFilingForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Filing Status</DialogTitle>
            <DialogDescription>
              {selectedFiling && `${selectedFiling.taxType} - ${selectedFiling.period}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="period">Tax Period</Label>
              <Input
                id="period"
                value={filingFormData.period}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountPayable">Amount Payable (AED) *</Label>
              <Input
                id="amountPayable"
                type="number"
                placeholder="0.00"
                value={filingFormData.amountPayable}
                onChange={(e) => setFilingFormData({...filingFormData, amountPayable: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Filing Status *</Label>
              <Select 
                value={filingFormData.status} 
                onValueChange={(value) => setFilingFormData({...filingFormData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Filed">Filed</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Remarks</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes or remarks..."
                value={filingFormData.notes}
                onChange={(e) => setFilingFormData({...filingFormData, notes: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Upload Documents</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  PDF, Excel, or XML files
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowFilingDialog(false);
                resetFilingForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateFiling}
              style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
            >
              Update Filing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Audit & History Log
            </DialogTitle>
            <DialogDescription>
              Track user actions, edits, and submissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {auditLog.map((log) => (
              <div key={log.id} className="flex gap-4 p-3 border rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 rounded-full" style={{ backgroundColor: '#F0F9F9' }}>
                  <History className="h-5 w-5" style={{ color: '#2B7A78' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <div className="font-medium">{log.action}</div>
                      <div className="text-sm text-muted-foreground">{log.user}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(log.timestamp, "dd MMM yyyy, HH:mm")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {log.taxType}
                    </Badge>
                    {log.period !== "N/A" && (
                      <Badge variant="outline" className="text-xs">
                        {log.period}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {log.details}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditLog(false)}>
              Close
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filing View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="w-[360px] max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Filing Details</DialogTitle>
            <DialogDescription>
              Review filing information and supporting documents
            </DialogDescription>
          </DialogHeader>
          {viewingFiling && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Tax Type</Label>
                  <div className="font-medium">{viewingFiling.taxType}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Period</Label>
                  <div className="font-medium">{viewingFiling.period}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Due Date</Label>
                  <div className="font-medium">{format(viewingFiling.dueDate, "dd MMM yyyy")}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Filed Date</Label>
                  <div className="font-medium">
                    {viewingFiling.filedDate ? format(viewingFiling.filedDate, "dd MMM yyyy") : "-"}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <div className="font-medium">AED {viewingFiling.amountPayable.toLocaleString()}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <Badge className={getStatusColor(viewingFiling.status)}>
                      {getStatusIcon(viewingFiling.status)}
                      <span className="ml-1">{viewingFiling.status}</span>
                    </Badge>
                  </div>
                </div>
              </div>

              {viewingFiling.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <div className="mt-1 text-sm bg-slate-50 rounded-md p-3">
                    {viewingFiling.notes}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Documents</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {viewingFiling.documents.length > 0 ? (
                    viewingFiling.documents.map((doc, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        {doc}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No documents uploaded</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

