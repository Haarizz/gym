import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Plus,
  Search,
  Download,
  Printer,
  X,
  Save,
  ArrowLeft,
  Eye,
  Edit,
  Copy,
  AlertCircle,
  CheckCircle2,
  Trash2,
  MoreVertical,
  FileText,
  Calendar,
  User,
  Building2,
  Ban
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface JournalLine {
  id: string;
  ledgerAccount: string;
  description: string;
  debit: number;
  credit: number;
  costCentre: string;
}

interface JournalVoucher {
  id: string;
  journalNo: string;
  date: string;
  reference: string;
  narration: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  status: 'draft' | 'posted' | 'voided';
  preparedBy: string;
  postedBy?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Sample Data
const sampleJournalVouchers: JournalVoucher[] = [
  {
    id: '1',
    journalNo: 'JV-1024',
    date: '2025-11-26',
    reference: 'Adj-PO-32',
    narration: 'Inventory adjustment for damaged equipment',
    lines: [
      { id: '1', ledgerAccount: 'Inventory Adjustments', description: 'Equipment damage correction', debit: 350.00, credit: 0, costCentre: 'Main Branch' },
      { id: '2', ledgerAccount: 'Cost of Goods Sold', description: 'Write-off damaged items', debit: 0, credit: 350.00, costCentre: 'Main Branch' },
    ],
    totalDebit: 350.00,
    totalCredit: 350.00,
    status: 'posted',
    preparedBy: 'Ahmed Hassan',
    postedBy: 'Sarah Ahmed',
    postedAt: '2025-11-26 14:30:00',
    createdAt: '2025-11-26 10:15:00',
    updatedAt: '2025-11-26 14:30:00'
  },
  {
    id: '2',
    journalNo: 'JV-1023',
    date: '2025-11-25',
    reference: 'ADJ-RENT-11',
    narration: 'Prepaid rent adjustment for Q4 2025',
    lines: [
      { id: '1', ledgerAccount: 'Prepaid Rent', description: 'Q4 2025 rent prepayment', debit: 15000.00, credit: 0, costCentre: 'Main Branch' },
      { id: '2', ledgerAccount: 'Rent Expense', description: 'Reclassify from expense', debit: 0, credit: 15000.00, costCentre: 'Main Branch' },
    ],
    totalDebit: 15000.00,
    totalCredit: 15000.00,
    status: 'posted',
    preparedBy: 'Sarah Ahmed',
    postedBy: 'Ahmed Hassan',
    postedAt: '2025-11-25 16:45:00',
    createdAt: '2025-11-25 09:20:00',
    updatedAt: '2025-11-25 16:45:00'
  },
  {
    id: '3',
    journalNo: 'JV-1022',
    date: '2025-11-24',
    reference: '',
    narration: 'Depreciation entry for November 2025',
    lines: [
      { id: '1', ledgerAccount: 'Depreciation Expense', description: 'Monthly depreciation - Equipment', debit: 2500.00, credit: 0, costCentre: 'Main Branch' },
      { id: '2', ledgerAccount: 'Accumulated Depreciation', description: 'Equipment depreciation', debit: 0, credit: 2500.00, costCentre: 'Main Branch' },
    ],
    totalDebit: 2500.00,
    totalCredit: 2500.00,
    status: 'posted',
    preparedBy: 'Ahmed Hassan',
    postedBy: 'Sarah Ahmed',
    postedAt: '2025-11-24 17:00:00',
    createdAt: '2025-11-24 11:30:00',
    updatedAt: '2025-11-24 17:00:00'
  },
  {
    id: '4',
    journalNo: 'JV-1021',
    date: '2025-11-23',
    reference: 'MISC-ADJ-44',
    narration: 'Correction of accounting error from October',
    lines: [
      { id: '1', ledgerAccount: 'Accounts Receivable', description: 'Correction entry', debit: 1200.00, credit: 0, costCentre: 'Main Branch' },
      { id: '2', ledgerAccount: 'Revenue', description: 'Reverse incorrect entry', debit: 0, credit: 1200.00, costCentre: 'Main Branch' },
    ],
    totalDebit: 1200.00,
    totalCredit: 1200.00,
    status: 'draft',
    preparedBy: 'Sarah Ahmed',
    createdAt: '2025-11-23 13:15:00',
    updatedAt: '2025-11-23 13:15:00'
  }
];

const ledgerAccounts = [
  'Cash',
  'Bank - Main Account',
  'Accounts Receivable',
  'Inventory',
  'Inventory Adjustments',
  'Prepaid Rent',
  'Equipment',
  'Accumulated Depreciation',
  'Accounts Payable',
  'Revenue',
  'Cost of Goods Sold',
  'Rent Expense',
  'Depreciation Expense',
  'Salaries Expense',
  'Utilities Expense',
  'Marketing Expense',
  'Miscellaneous Expense'
];

const costCentres = [
  'Main Branch',
  'Cafe',
  'Training Center',
  'Admin',
  'Marketing'
];

export function JournalVoucher() {
  const [vouchers, setVouchers] = useState<JournalVoucher[]>(sampleJournalVouchers);
  const [view, setView] = useState<'list' | 'create' | 'view'>('list');
  const [selectedVoucher, setSelectedVoucher] = useState<JournalVoucher | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<JournalVoucher | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('this-month');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createdByFilter, setCreatedByFilter] = useState('all');

  // Form State
  const [journalDate, setJournalDate] = useState('');
  const [reference, setReference] = useState('');
  const [narration, setNarration] = useState('');
  const [journalLines, setJournalLines] = useState<JournalLine[]>([]);
  const currentUser = 'Ahmed Hassan'; // Would come from auth context

  // Filter vouchers
  const filteredVouchers = vouchers.filter(voucher => {
    const matchesSearch = 
      voucher.journalNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voucher.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voucher.narration.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || voucher.status === statusFilter;
    const matchesCreatedBy = createdByFilter === 'all' || voucher.preparedBy === createdByFilter;
    return matchesSearch && matchesStatus && matchesCreatedBy;
  });

  // Calculate totals
  const calculateTotals = (lines: JournalLine[]) => {
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    return { totalDebit, totalCredit, difference: totalDebit - totalCredit };
  };

  const { totalDebit, totalCredit, difference } = calculateTotals(journalLines);
  const isBalanced = Math.abs(difference) < 0.01;

  // Add new journal line
  const addJournalLine = () => {
    const newLine: JournalLine = {
      id: Date.now().toString(),
      ledgerAccount: '',
      description: '',
      debit: 0,
      credit: 0,
      costCentre: 'Main Branch'
    };
    setJournalLines([...journalLines, newLine]);
  };

  // Update journal line
  const updateJournalLine = (id: string, field: keyof JournalLine, value: any) => {
    setJournalLines(journalLines.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        
        // If updating debit, clear credit and vice versa
        if (field === 'debit' && value > 0) {
          updated.credit = 0;
        } else if (field === 'credit' && value > 0) {
          updated.debit = 0;
        }
        
        return updated;
      }
      return line;
    }));
  };

  // Remove journal line
  const removeJournalLine = (id: string) => {
    setJournalLines(journalLines.filter(line => line.id !== id));
  };

  // Save as draft
  const handleSaveDraft = () => {
    if (!journalDate || journalLines.length === 0) {
      toast.error('Please fill in journal date and add at least one line');
      return;
    }

    const newVoucher: JournalVoucher = {
      id: editingVoucher?.id || Date.now().toString(),
      journalNo: editingVoucher?.journalNo || `JV-${1025 + vouchers.length}`,
      date: journalDate,
      reference,
      narration,
      lines: journalLines,
      totalDebit,
      totalCredit,
      status: 'draft',
      preparedBy: currentUser,
      createdAt: editingVoucher?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingVoucher) {
      setVouchers(vouchers.map(v => v.id === editingVoucher.id ? newVoucher : v));
      toast.success('Journal voucher updated as draft');
    } else {
      setVouchers([newVoucher, ...vouchers]);
      toast.success('Journal voucher saved as draft');
    }

    resetForm();
    setView('list');
  };

  // Post journal
  const handlePost = () => {
    if (!isBalanced) {
      toast.error('Cannot post unbalanced journal entry');
      return;
    }

    if (!journalDate || journalLines.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newVoucher: JournalVoucher = {
      id: editingVoucher?.id || Date.now().toString(),
      journalNo: editingVoucher?.journalNo || `JV-${1025 + vouchers.length}`,
      date: journalDate,
      reference,
      narration,
      lines: journalLines,
      totalDebit,
      totalCredit,
      status: 'posted',
      preparedBy: currentUser,
      postedBy: currentUser,
      postedAt: new Date().toISOString(),
      createdAt: editingVoucher?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingVoucher) {
      setVouchers(vouchers.map(v => v.id === editingVoucher.id ? newVoucher : v));
      toast.success('Journal voucher posted successfully');
    } else {
      setVouchers([newVoucher, ...vouchers]);
      toast.success('Journal voucher posted successfully');
    }

    resetForm();
    setView('list');
  };

  // Reset form
  const resetForm = () => {
    setJournalDate('');
    setReference('');
    setNarration('');
    setJournalLines([]);
    setEditingVoucher(null);
  };

  // Edit voucher
  const handleEdit = (voucher: JournalVoucher) => {
    if (voucher.status !== 'draft') {
      toast.error('Only draft vouchers can be edited');
      return;
    }
    
    setEditingVoucher(voucher);
    setJournalDate(voucher.date);
    setReference(voucher.reference);
    setNarration(voucher.narration);
    setJournalLines([...voucher.lines]);
    setView('create');
  };

  // Clone voucher
  const handleClone = (voucher: JournalVoucher) => {
    setJournalDate(new Date().toISOString().split('T')[0]);
    setReference(voucher.reference);
    setNarration(`${voucher.narration} (Copy)`);
    setJournalLines(voucher.lines.map(line => ({ ...line, id: Date.now().toString() + Math.random() })));
    setView('create');
  };

  // Void voucher
  const handleVoid = (voucher: JournalVoucher) => {
    if (voucher.status !== 'posted') {
      toast.error('Only posted vouchers can be voided');
      return;
    }

    const voidedVoucher = {
      ...voucher,
      status: 'voided' as const,
      updatedAt: new Date().toISOString()
    };

    setVouchers(vouchers.map(v => v.id === voucher.id ? voidedVoucher : v));
    toast.success('Journal voucher voided');
    setSelectedVoucher(null);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-200 text-gray-700';
      case 'voided':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Export
  const handleExport = () => {
    toast.success('Exporting journal vouchers...');
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* List View */}
      {view === 'list' && (
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="bg-white border-b">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Journal Vouchers</h1>
                <p className="text-sm text-gray-600 mt-1">Adjustments, corrections & non-cash entries</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button 
                  className="bg-[#327F74] hover:bg-[#2B6B62] text-white"
                  onClick={() => {
                    resetForm();
                    setView('create');
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Journal Voucher
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[300px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search JV no., reference, narration..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[220px] h-11">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="this-quarter">This Quarter</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] h-11">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="voided">Voided</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                  <SelectTrigger className="w-[180px] h-11">
                    <SelectValue placeholder="Created By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="Ahmed Hassan">Ahmed Hassan</SelectItem>
                    <SelectItem value="Sarah Ahmed">Sarah Ahmed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Journal Voucher List</CardTitle>
                <span className="text-sm text-gray-500">Total: {filteredVouchers.length}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">JV No.</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Reference</TableHead>
                      <TableHead className="font-semibold">Narration</TableHead>
                      <TableHead className="font-semibold text-right">Debit (AED)</TableHead>
                      <TableHead className="font-semibold text-right">Credit (AED)</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVouchers.map((voucher) => (
                      <TableRow key={voucher.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{voucher.journalNo}</TableCell>
                        <TableCell>{new Date(voucher.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                        <TableCell className="text-gray-600">{voucher.reference || '-'}</TableCell>
                        <TableCell className="max-w-[300px] truncate text-gray-600">{voucher.narration}</TableCell>
                        <TableCell className="text-right font-medium">{voucher.totalDebit.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">{voucher.totalCredit.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(voucher.status)}>
                            {voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedVoucher(voucher);
                                setView('view');
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {voucher.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(voucher)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit View */}
      {view === 'create' && (
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b sticky top-0 z-10">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setView('list');
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    {editingVoucher ? 'Edit Journal Voucher' : 'Create Journal Voucher'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">Balance debits & credits before posting</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={() => { resetForm(); setView('list'); }}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={handleSaveDraft}>
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button 
                  className="bg-[#327F74] hover:bg-[#2B6B62] text-white"
                  onClick={handlePost}
                  disabled={!isBalanced}
                >
                  Post Journal
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column - Form */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Journal Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Journal Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Journal Date *</Label>
                          <Input
                            type="date"
                            value={journalDate}
                            onChange={(e) => setJournalDate(e.target.value)}
                            className="h-11"
                          />
                        </div>
                        <div>
                          <Label>Reference No.</Label>
                          <Input
                            placeholder="Optional internal reference"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            className="h-11"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Narration *</Label>
                        <Textarea
                          placeholder="Describe the purpose of this journal entry..."
                          value={narration}
                          onChange={(e) => setNarration(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <Label className="text-sm text-gray-600">Prepared By</Label>
                          <p className="text-sm font-medium mt-1">{currentUser}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Status</Label>
                          <div className="mt-1">
                            <Badge className="bg-gray-200 text-gray-700">Draft</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Journal Lines */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Journal Lines</CardTitle>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#327F74] text-[#327F74] hover:bg-[#327F74] hover:text-white"
                          onClick={addJournalLine}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Line
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {journalLines.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                          <p className="font-medium">No journal lines added yet</p>
                          <p className="text-sm">Click "Add Line" to start</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Table Header */}
                          <div className="grid grid-cols-12 gap-3 text-sm font-semibold text-gray-600 pb-2 border-b">
                            <div className="col-span-3">Account Ledger</div>
                            <div className="col-span-3">Description</div>
                            <div className="col-span-2">Debit (AED)</div>
                            <div className="col-span-2">Credit (AED)</div>
                            <div className="col-span-1">Cost Centre</div>
                            <div className="col-span-1"></div>
                          </div>

                          {/* Table Rows */}
                          {journalLines.map((line, index) => (
                            <div key={line.id} className="grid grid-cols-12 gap-3 items-start">
                              <div className="col-span-3">
                                <Select 
                                  value={line.ledgerAccount} 
                                  onValueChange={(value) => updateJournalLine(line.id, 'ledgerAccount', value)}
                                >
                                  <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select account" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ledgerAccounts.map(account => (
                                      <SelectItem key={account} value={account}>{account}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-3">
                                <Input
                                  placeholder="Description"
                                  value={line.description}
                                  onChange={(e) => updateJournalLine(line.id, 'description', e.target.value)}
                                  className="h-11"
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={line.debit || ''}
                                  onChange={(e) => updateJournalLine(line.id, 'debit', parseFloat(e.target.value) || 0)}
                                  disabled={line.credit > 0}
                                  className="h-11"
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={line.credit || ''}
                                  onChange={(e) => updateJournalLine(line.id, 'credit', parseFloat(e.target.value) || 0)}
                                  disabled={line.debit > 0}
                                  className="h-11"
                                />
                              </div>
                              <div className="col-span-1">
                                <Select 
                                  value={line.costCentre} 
                                  onValueChange={(value) => updateJournalLine(line.id, 'costCentre', value)}
                                >
                                  <SelectTrigger className="h-11">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {costCentres.map(centre => (
                                      <SelectItem key={centre} value={centre}>{centre}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeJournalLine(line.id)}
                                  className="h-11"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!isBalanced && journalLines.length > 0 && (
                        <div className="flex items-center space-x-2 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <p className="text-sm text-red-600">
                            Total Debit must equal Total Credit before posting. Current difference: AED {Math.abs(difference).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Summary */}
                <div className="lg:col-span-4">
                  <Card className="sticky top-24">
                    <CardHeader>
                      <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Debit</span>
                          <span className={`font-semibold ${totalDebit > 0 ? 'text-[#327F74]' : 'text-gray-900'}`}>
                            AED {totalDebit.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Credit</span>
                          <span className={`font-semibold ${totalCredit > 0 ? 'text-[#327F74]' : 'text-gray-900'}`}>
                            AED {totalCredit.toFixed(2)}
                          </span>
                        </div>
                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">Difference</span>
                            {isBalanced ? (
                              <div className="flex items-center space-x-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="font-semibold text-green-600">Balanced ✓</span>
                              </div>
                            ) : (
                              <span className="font-semibold text-red-600">
                                AED {Math.abs(difference).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <p className="text-xs text-gray-600 mb-4">
                          You can only post a journal when the entry is balanced.
                        </p>
                        <div className="space-y-2">
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={handleSaveDraft}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save as Draft
                          </Button>
                          <Button 
                            className="w-full bg-[#327F74] hover:bg-[#2B6B62] text-white"
                            onClick={handlePost}
                            disabled={!isBalanced}
                          >
                            Post Journal
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Dialog */}
      {view === 'view' && selectedVoucher && (
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b sticky top-0 z-10">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedVoucher(null);
                    setView('list');
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl font-semibold text-gray-900">{selectedVoucher.journalNo}</h1>
                    <Badge className={getStatusColor(selectedVoucher.status)}>
                      {selectedVoucher.status.charAt(0).toUpperCase() + selectedVoucher.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedVoucher.status === 'posted' ? 'Posted' : 'Created'} on {new Date(selectedVoucher.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={() => toast.success('Exporting PDF...')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={() => handleClone(selectedVoucher)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Clone
                </Button>
                {selectedVoucher.status === 'posted' && (
                  <Button 
                    variant="outline" 
                    className="border-red-600 text-red-600 hover:bg-red-50"
                    onClick={() => handleVoid(selectedVoucher)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Void JV
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Journal Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <Label className="text-sm text-gray-600">Date</Label>
                      <p className="font-medium mt-1">{new Date(selectedVoucher.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Reference</Label>
                      <p className="font-medium mt-1">{selectedVoucher.reference || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Prepared By</Label>
                      <p className="font-medium mt-1 flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        {selectedVoucher.preparedBy}
                      </p>
                    </div>
                    {selectedVoucher.postedBy && (
                      <>
                        <div>
                          <Label className="text-sm text-gray-600">Posted By</Label>
                          <p className="font-medium mt-1 flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            {selectedVoucher.postedBy}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Posted At</Label>
                          <p className="font-medium mt-1">{new Date(selectedVoucher.postedAt!).toLocaleString('en-GB')}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-4">
                    <Label className="text-sm text-gray-600">Narration</Label>
                    <p className="mt-1 text-gray-900">{selectedVoucher.narration}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Created: {new Date(selectedVoucher.createdAt).toLocaleString('en-GB')}</span>
                      <span>Updated: {new Date(selectedVoucher.updatedAt).toLocaleString('en-GB')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ledger Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Ledger Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Account Ledger</TableHead>
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="font-semibold text-right">Debit (AED)</TableHead>
                        <TableHead className="font-semibold text-right">Credit (AED)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedVoucher.lines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{line.ledgerAccount}</TableCell>
                          <TableCell className="text-gray-600">{line.description}</TableCell>
                          <TableCell className="text-right font-medium">
                            {line.debit > 0 ? line.debit.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {line.credit > 0 ? line.credit.toFixed(2) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50 font-semibold">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right text-[#327F74]">{selectedVoucher.totalDebit.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-[#327F74]">{selectedVoucher.totalCredit.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
