import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import {
  Calendar,
  Search,
  Download,
  FileText,
  Filter,
  DollarSign,
  CreditCard,
  Wallet,
  X,
  TrendingUp,
  Users,
  RefreshCcw,
} from 'lucide-react';
import { toast } from "sonner";

interface CustomReportsProps {
  onNavigate?: (section: string) => void;
}

// Sample membership report data
const membershipReportData = [
  {
    id: 1,
    memberId: 'M-0092',
    memberName: 'John Mathew',
    photoUrl: null,
    mobile: '0501234567',
    transactionType: 'Renewal',
    planName: 'Premium 6M',
    planAmount: 1200,
    paymentMode: 'Card',
    paidByCash: 0,
    paidByCard: 1200,
    dueAmount: 0,
    dueDate: null,
    transactionDate: '2025-10-11',
  },
  {
    id: 2,
    memberId: 'M-0145',
    memberName: 'Sara Ahmed',
    photoUrl: null,
    mobile: '0509876543',
    transactionType: 'New Member',
    planName: 'Basic 3M',
    planAmount: 600,
    paymentMode: 'Cash',
    paidByCash: 600,
    paidByCard: 0,
    dueAmount: 0,
    dueDate: null,
    transactionDate: '2025-10-11',
  },
  {
    id: 3,
    memberId: 'M-0178',
    memberName: 'Mohammed Ali',
    photoUrl: null,
    mobile: '0551234567',
    transactionType: 'Upgrade',
    planName: 'Premium Annual',
    planAmount: 2400,
    paymentMode: 'Mixed',
    paidByCash: 1000,
    paidByCard: 1200,
    dueAmount: 200,
    dueDate: '2025-10-20',
    transactionDate: '2025-10-11',
  },
  {
    id: 4,
    memberId: 'M-0201',
    memberName: 'Fatima Hassan',
    photoUrl: null,
    mobile: '0504445566',
    transactionType: 'New Member',
    planName: 'Standard 6M',
    planAmount: 900,
    paymentMode: 'Card',
    paidByCash: 0,
    paidByCard: 900,
    dueAmount: 0,
    dueDate: null,
    transactionDate: '2025-10-11',
  },
  {
    id: 5,
    memberId: 'M-0089',
    memberName: 'Ahmed Khalid',
    photoUrl: null,
    mobile: '0557778899',
    transactionType: 'Add-on',
    planName: 'Personal Training 10 Sessions',
    planAmount: 800,
    paymentMode: 'Card',
    paidByCash: 0,
    paidByCard: 800,
    dueAmount: 0,
    dueDate: null,
    transactionDate: '2025-10-11',
  },
  {
    id: 6,
    memberId: 'M-0156',
    memberName: 'Layla Omar',
    photoUrl: null,
    mobile: '0502223344',
    transactionType: 'Renewal',
    planName: 'Premium 6M',
    planAmount: 1200,
    paymentMode: 'Cash',
    paidByCash: 1200,
    paidByCard: 0,
    dueAmount: 0,
    dueDate: null,
    transactionDate: '2025-10-10',
  },
  {
    id: 7,
    memberId: 'M-0234',
    memberName: 'Yousef Ibrahim',
    photoUrl: null,
    mobile: '0558889999',
    transactionType: 'New Member',
    planName: 'Basic 6M',
    planAmount: 1000,
    paymentMode: 'Mixed',
    paidByCash: 500,
    paidByCard: 300,
    dueAmount: 200,
    dueDate: '2025-10-18',
    transactionDate: '2025-10-10',
  },
  {
    id: 8,
    memberId: 'M-0067',
    memberName: 'Mariam Saeed',
    photoUrl: null,
    mobile: '0503334455',
    transactionType: 'Add-on',
    planName: 'Nutrition Consultation',
    planAmount: 300,
    paymentMode: 'Card',
    paidByCash: 0,
    paidByCard: 300,
    dueAmount: 0,
    dueDate: null,
    transactionDate: '2025-10-09',
  },
  {
    id: 9,
    memberId: 'M-0198',
    memberName: 'Hassan Mahmoud',
    photoUrl: null,
    mobile: '0556667788',
    transactionType: 'Upgrade',
    planName: 'Premium Annual',
    planAmount: 2400,
    paymentMode: 'Card',
    paidByCash: 0,
    paidByCard: 2400,
    dueAmount: 0,
    dueDate: null,
    transactionDate: '2025-10-09',
  },
  {
    id: 10,
    memberId: 'M-0112',
    memberName: 'Aisha Abdullah',
    photoUrl: null,
    mobile: '0509998877',
    transactionType: 'Renewal',
    planName: 'Standard 3M',
    planAmount: 500,
    paymentMode: 'Cash',
    paidByCash: 500,
    paidByCard: 0,
    dueAmount: 0,
    dueDate: null,
    transactionDate: '2025-10-08',
  },
];

export function CustomReports({ onNavigate }: CustomReportsProps) {
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [showSummary, setShowSummary] = useState(false);

  // Get today and yesterday dates
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Filter data based on date range
  const filteredByDate = useMemo(() => {
    let startDate = today;
    let endDate = today;

    if (dateRange === 'yesterday') {
      startDate = yesterday;
      endDate = yesterday;
    } else if (dateRange === 'custom') {
      startDate = customStartDate || today;
      endDate = customEndDate || today;
    }

    return membershipReportData.filter(record => {
      const recordDate = record.transactionDate;
      return recordDate >= startDate && recordDate <= endDate;
    });
  }, [dateRange, customStartDate, customEndDate, today, yesterday]);

  // Filter by transaction type
  const filteredByType = useMemo(() => {
    if (transactionTypeFilter === 'all') return filteredByDate;
    return filteredByDate.filter(record => record.transactionType === transactionTypeFilter);
  }, [filteredByDate, transactionTypeFilter]);

  // Filter by search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return filteredByType;
    const query = searchQuery.toLowerCase();
    return filteredByType.filter(record =>
      record.memberName.toLowerCase().includes(query) ||
      record.memberId.toLowerCase().includes(query) ||
      record.mobile.includes(query)
    );
  }, [filteredByType, searchQuery]);

  // Calculate summary
  const summary = useMemo(() => {
    const totalPlans = filteredData.length;
    const totalRevenue = filteredData.reduce((sum, record) => sum + record.planAmount, 0);
    const totalCash = filteredData.reduce((sum, record) => sum + record.paidByCash, 0);
    const totalCard = filteredData.reduce((sum, record) => sum + record.paidByCard, 0);
    const totalDue = filteredData.reduce((sum, record) => sum + record.dueAmount, 0);

    return {
      totalPlans,
      totalRevenue,
      totalCash,
      totalCard,
      totalDue,
    };
  }, [filteredData]);

  // Apply date range
  const handleApply = () => {
    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
      toast.error('Please select both start and end dates');
      return;
    }
    setShowSummary(true);
    setTimeout(() => setShowSummary(false), 5000);
    toast.success('Report generated successfully!');
  };

  // Export functions
  const handleExportPDF = () => {
    toast.success('Exporting report as PDF...');
  };

  const handleExportExcel = () => {
    toast.success('Exporting report as Excel...');
  };

  // Get transaction type badge
  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'New Member':
        return <Badge className="bg-green-100 text-green-700">New Member</Badge>;
      case 'Renewal':
        return <Badge className="bg-blue-100 text-blue-700">Renewal</Badge>;
      case 'Upgrade':
        return <Badge className="bg-purple-100 text-purple-700">Upgrade</Badge>;
      case 'Add-on':
        return <Badge className="bg-orange-100 text-orange-700">Add-on</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Custom Reports</h1>
        <p className="text-gray-600 mt-1">
          Generate detailed membership reports with custom date ranges
        </p>
      </div>

      {/* Date Range Filter Card */}
      <Card className="border-primary/20 mb-6">
        <CardHeader className="bg-gradient-light border-b border-primary/10">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Date Range Filter</span>
          </CardTitle>
          <CardDescription>Select a date range to generate your report</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Quick Select Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={dateRange === 'today' ? 'default' : 'outline'}
                className={dateRange === 'today' ? 'btn-primary' : 'border-primary/20'}
                onClick={() => setDateRange('today')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Today
              </Button>
              <Button
                variant={dateRange === 'yesterday' ? 'default' : 'outline'}
                className={dateRange === 'yesterday' ? 'btn-primary' : 'border-primary/20'}
                onClick={() => setDateRange('yesterday')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Yesterday
              </Button>
              <Button
                variant={dateRange === 'custom' ? 'default' : 'outline'}
                className={dateRange === 'custom' ? 'btn-primary' : 'border-primary/20'}
                onClick={() => setDateRange('custom')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Custom Range
              </Button>
            </div>

            {/* Custom Date Range Inputs */}
            {dateRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            )}

            {/* Apply Button */}
            <div className="flex justify-end">
              <Button className="btn-primary" onClick={handleApply}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Apply & Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Toast */}
      {showSummary && (
        <Card className="border-primary/20 mb-6 bg-white shadow-lg animate-in slide-in-from-top">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <DollarSign className="h-5 w-5 text-primary mr-2" />
                Summary ({dateRange === 'today' ? 'Today' : dateRange === 'yesterday' ? 'Yesterday' : 'Custom Range'})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSummary(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">Total Plans Sold</p>
                <p className="text-2xl font-bold text-blue-700">{summary.totalPlans}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-green-700">AED {summary.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600 mb-1">Cash</p>
                <p className="text-2xl font-bold text-purple-700">AED {summary.totalCash.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-600 mb-1">Card</p>
                <p className="text-2xl font-bold text-orange-700">AED {summary.totalCard.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600 mb-1">Total Dues</p>
                <p className="text-2xl font-bold text-red-700">AED {summary.totalDue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membership Report Table */}
      <Card className="border-primary/20">
        <CardHeader className="bg-gradient-light border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Membership Report (Detailed)</span>
              </CardTitle>
              <CardDescription>
                Complete transaction history for selected date range
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, member ID, or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="New Member">New Member</SelectItem>
                  <SelectItem value="Renewal">Renewal</SelectItem>
                  <SelectItem value="Upgrade">Upgrade</SelectItem>
                  <SelectItem value="Add-on">Add-on</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-primary">{filteredData.length}</span> of {membershipReportData.length} records
            </p>
          </div>

          {/* Table */}
          <div className="border border-primary/20 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-light sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-primary font-semibold">#</TableHead>
                    <TableHead className="text-primary font-semibold">Member ID</TableHead>
                    <TableHead className="text-primary font-semibold">Photo & Name</TableHead>
                    <TableHead className="text-primary font-semibold">Mobile</TableHead>
                    <TableHead className="text-primary font-semibold">Type</TableHead>
                    <TableHead className="text-primary font-semibold">Plan</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Amount (AED)</TableHead>
                    <TableHead className="text-primary font-semibold">Pay Mode</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Cash</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Card</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Due</TableHead>
                    <TableHead className="text-primary font-semibold">Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData.map((record, index) => (
                      <TableRow key={record.id} className="hover:bg-gradient-light transition-colors">
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-primary/30">
                            {record.memberId}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8 border border-primary/20">
                              <AvatarImage src={record.photoUrl || undefined} />
                              <AvatarFallback className="bg-gradient-primary text-white text-xs">
                                {record.memberName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{record.memberName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{record.mobile}</TableCell>
                        <TableCell>{getTransactionBadge(record.transactionType)}</TableCell>
                        <TableCell className="font-medium">{record.planName}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {record.planAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {record.paymentMode === 'Cash' && (
                            <Badge className="bg-purple-100 text-purple-700">Cash</Badge>
                          )}
                          {record.paymentMode === 'Card' && (
                            <Badge className="bg-blue-100 text-blue-700">Card</Badge>
                          )}
                          {record.paymentMode === 'Mixed' && (
                            <Badge className="bg-orange-100 text-orange-700">Mixed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.paidByCash > 0 ? record.paidByCash.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.paidByCard > 0 ? record.paidByCard.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.dueAmount > 0 ? (
                            <span className="font-semibold text-red-600">
                              {record.dueAmount.toLocaleString()}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {record.dueDate ? (
                            <span className="text-sm text-gray-600">
                              {new Date(record.dueDate).toLocaleDateString('en-GB')}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <FileText className="h-12 w-12 mb-3 text-gray-300" />
                          <p className="font-medium">No records found</p>
                          <p className="text-sm">Try adjusting your filters or date range</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Summary Footer */}
          {filteredData.length > 0 && (
            <div className="mt-6 p-4 bg-gradient-light rounded-lg border border-primary/20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
                  <p className="text-xl font-bold text-primary">{summary.totalPlans}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-xl font-bold text-green-600">AED {summary.totalRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Collected</p>
                  <p className="text-xl font-bold text-blue-600">
                    AED {(summary.totalCash + summary.totalCard).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Outstanding Dues</p>
                  <p className="text-xl font-bold text-red-600">AED {summary.totalDue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

