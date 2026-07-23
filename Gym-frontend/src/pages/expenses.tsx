import React, { useState, useEffect } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Calendar } from "../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Plus,
  Search,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  Building2,
  Target,
  DollarSign,
  Receipt,
  FileText,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import { expensesService, type Expense, type ExpenseCreateRequest, type ExpenseStats } from "../utils/supabase/expenses-service";

// Category color mapping
const categoryColors: Record<string, string> = {
  Utilities: "bg-blue-100 text-blue-800",
  Rent: "bg-green-100 text-green-800",
  Equipment: "bg-orange-100 text-orange-800",
  Operational: "bg-purple-100 text-purple-800",
  Marketing: "bg-pink-100 text-pink-800",
  Salaries: "bg-indigo-100 text-indigo-800",
  Maintenance: "bg-yellow-100 text-yellow-800",
  Other: "bg-gray-100 text-gray-800",
};

// Status color mapping
const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  approved: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  draft: "bg-gray-100 text-gray-800",
  rejected: "bg-red-100 text-red-800",
};

const defaultForm: ExpenseCreateRequest = {
  date: format(new Date(), "yyyy-MM-dd"),
  vendorName: "",
  category: "",
  costCenter: "",
  location: "",
  amount: 0,
  taxRate: 0,
  notes: "",
  status: "pending",
};

export function Expenses() {
  const { currencyCode } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTaxRate, setSelectedTaxRate] = useState("all");
  const [formDate, setFormDate] = useState<Date>(new Date());
  const [form, setForm] = useState<ExpenseCreateRequest>(defaultForm);

  const locations = ["Downtown", "Mall Branch", "Marina Branch", "All Locations"];
  const categories = ["Utilities", "Rent", "Equipment", "Operational", "Marketing", "Salaries", "Maintenance", "Other"];
  const costCenters = [
    "Gym Equipment", "Electric", "Facility", "Digital Marketing", "Cleaning",
    "Water & Sewer", "Internet & Telecom", "Security", "Maintenance", "Administration"
  ];
  const taxRates = ["0", "5", "10"];
  const statuses = ["pending", "paid", "approved", "rejected", "draft"];

  const loadData = async () => {
    try {
      setLoading(true);
      const [expenseData, statsData] = await Promise.all([
        expensesService.getExpenses(),
        expensesService.getStats(),
      ]);
      setExpenses(expenseData);
      setStats(statsData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = selectedLocation === "all" || expense.location === selectedLocation;
    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || expense.status === selectedStatus;
    const matchesTaxRate = selectedTaxRate === "all" || expense.taxRate.toString() === selectedTaxRate;
    return matchesSearch && matchesLocation && matchesCategory && matchesStatus && matchesTaxRate;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalTax = filteredExpenses.reduce((sum, e) => sum + e.taxAmount, 0);
  const topCategory = Object.entries(
    filteredExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.totalAmount;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([, a], [, b]) => b - a)[0];

  const calculateTotal = () => {
    const amount = form.amount || 0;
    const taxRate = form.taxRate || 0;
    return amount + (amount * taxRate) / 100;
  };

  const resetForm = () => {
    setForm(defaultForm);
    setFormDate(new Date());
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.vendorName || !form.category || !form.amount) {
      toast.error("Please fill in vendor, category, and amount");
      return;
    }
    const payload: ExpenseCreateRequest = {
      ...form,
      date: format(formDate, "yyyy-MM-dd"),
    };
    try {
      if (editingId) {
        await expensesService.updateExpense(editingId, payload);
        toast.success("Expense updated");
        setIsEditOpen(false);
      } else {
        await expensesService.createExpense(payload);
        toast.success("Expense added");
        setIsAddOpen(false);
      }
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save expense");
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({
      date: expense.date,
      vendorName: expense.vendorName,
      category: expense.category,
      costCenter: expense.costCenter,
      location: expense.location,
      amount: expense.amount,
      taxRate: expense.taxRate,
      notes: expense.notes,
      status: expense.status,
      receiptUrl: expense.receiptUrl,
    });
    setFormDate(expense.date ? new Date(expense.date) : new Date());
    setIsEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await expensesService.deleteExpense(id);
      toast.success("Expense deleted");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete expense");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await expensesService.updateStatus(id, status);
      toast.success(`Expense marked as ${status}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const expenseForm = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
      <div className="space-y-2">
        <Label>Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(formDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formDate}
              onSelect={(date) => setFormDate(date || new Date())}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Vendor / Payee</Label>
        <Input
          value={form.vendorName}
          onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
          placeholder="Enter vendor name"
        />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Cost Center</Label>
        <Select value={form.costCenter} onValueChange={(v) => setForm({ ...form, costCenter: v })}>
          <SelectTrigger><SelectValue placeholder="Select cost center" /></SelectTrigger>
          <SelectContent>
            {costCenters.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
          <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
          <SelectContent>
            {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Amount ({currencyCode})</Label>
        <Input
          type="number"
          step="0.01"
          value={form.amount || ""}
          onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <Label>Tax Rate (%)</Label>
        <Select
          value={form.taxRate?.toString() ?? "0"}
          onValueChange={(v) => setForm({ ...form, taxRate: parseFloat(v) })}
        >
          <SelectTrigger><SelectValue placeholder="Select tax rate" /></SelectTrigger>
          <SelectContent>
            {taxRates.map((r) => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Total Amount ({currencyCode})</Label>
        <div className="bg-gray-50 p-3 rounded-md border">
          <span className="text-lg font-semibold text-primary">
            {calculateTotal().toFixed(2)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={form.status ?? "pending"} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Receipt URL (optional)</Label>
        <Input
          value={form.receiptUrl ?? ""}
          onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label>Notes / Description</Label>
        <Textarea
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Add notes or description..."
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Expenses / Ledgers</h1>
          <p className="text-gray-600 mt-1">
            Track and categorize all business expenses with tax management
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>
                  Create a new expense entry with tax calculation and cost center allocation.
                </DialogDescription>
              </DialogHeader>
              {expenseForm}
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">Add Expense</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Total Expenses</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <DollarSign className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              <CurrencyGlyph /> {totalExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{filteredExpenses.length} transactions</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Total Tax Paid</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Receipt className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              <CurrencyGlyph /> {totalTax.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">VAT & other taxes</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Top Category</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {topCategory?.[0] || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {topCategory ? `${currencyCode} ${topCategory[1].toFixed(2)}` : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Locations</CardTitle>
            <div className="bg-emerald-50 p-2 rounded-lg">
              <Building2 className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              {new Set(filteredExpenses.map((e) => e.location).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active locations</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger><SelectValue placeholder="All Locations" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedTaxRate} onValueChange={setSelectedTaxRate}>
              <SelectTrigger><SelectValue placeholder="All Tax Rates" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tax Rates</SelectItem>
                {taxRates.map((r) => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the expense details below.</DialogDescription>
          </DialogHeader>
          {expenseForm}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expenses Table */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            Expense Ledger
            {loading && <span className="ml-2 text-sm font-normal text-gray-500">(loading...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-white overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-primary">Date</TableHead>
                  <TableHead className="font-semibold text-primary">Vendor / Payee</TableHead>
                  <TableHead className="font-semibold text-primary">Category</TableHead>
                  <TableHead className="font-semibold text-primary">Cost Center</TableHead>
                  <TableHead className="font-semibold text-primary">Location</TableHead>
                  <TableHead className="font-semibold text-primary text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-primary text-right">Tax %</TableHead>
                  <TableHead className="font-semibold text-primary text-right">Total</TableHead>
                  <TableHead className="font-semibold text-primary">Status</TableHead>
                  <TableHead className="font-semibold text-primary">Notes</TableHead>
                  <TableHead className="font-semibold text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense, index) => (
                  <TableRow
                    key={expense.id}
                    className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/40"} hover:bg-slate-50/80 transition-colors`}
                  >
                    <TableCell>
                      {expense.date ? format(new Date(expense.date), "dd/MM/yyyy") : "-"}
                    </TableCell>
                    <TableCell className="font-medium">{expense.vendorName}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={categoryColors[expense.category] ?? "bg-gray-100 text-gray-800"}
                      >
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{expense.costCenter}</TableCell>
                    <TableCell>{expense.location}</TableCell>
                    <TableCell className="text-right"><CurrencyGlyph /> {expense.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{expense.taxRate}%</TableCell>
                    <TableCell className="text-right font-semibold"><CurrencyGlyph /> {expense.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[expense.status] ?? "bg-gray-100 text-gray-800"}
                      >
                        {expense.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={expense.notes}>
                      {expense.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(expense)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {expense.status !== "approved" && expense.status !== "paid" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(expense.id, "approved")}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              Mark Approved
                            </DropdownMenuItem>
                          )}
                          {expense.status !== "pending" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(expense.id, "pending")}>
                              <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                              Mark Pending
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!loading && filteredExpenses.length === 0 && (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
              <p className="text-gray-600 mb-4">
                {expenses.length === 0
                  ? "No expenses have been recorded yet. Add your first expense above."
                  : "No expenses match your current filter criteria."}
              </p>
              {expenses.length > 0 && (
                <Button onClick={() => {
                  setSearchTerm("");
                  setSelectedLocation("all");
                  setSelectedCategory("all");
                  setSelectedStatus("all");
                  setSelectedTaxRate("all");
                }}>
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
