import React, { useState, useEffect } from "react";
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
  Filter,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  TrendingDown,
  Building2,
  Target,
  DollarSign,
  Receipt,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "../components/ui/utils";

// Types
interface Expense {
  id: string;
  date: string;
  vendor: string;
  category: string;
  costCenter: string;
  location: string;
  amount: number;
  taxRate: number;
  total: number;
  notes: string;
  status: "paid" | "pending" | "draft";
}

// Mock data
const mockExpenses: Expense[] = [
  {
    id: "1",
    date: "2025-09-29",
    vendor: "ACME Supplies",
    category: "Equipment",
    costCenter: "Gym Equipment",
    location: "Downtown",
    amount: 500,
    taxRate: 5,
    total: 525,
    notes: "Monthly equipment maintenance",
    status: "paid",
  },
  {
    id: "2",
    date: "2025-09-28",
    vendor: "PowerCo",
    category: "Utilities",
    costCenter: "Electric",
    location: "Downtown",
    amount: 300,
    taxRate: 5,
    total: 315,
    notes: "Electricity bill - September",
    status: "paid",
  },
  {
    id: "3",
    date: "2025-09-27",
    vendor: "City Properties",
    category: "Rent",
    costCenter: "Facility",
    location: "Mall Branch",
    amount: 8000,
    taxRate: 0,
    total: 8000,
    notes: "Monthly rent - October",
    status: "pending",
  },
  {
    id: "4",
    date: "2025-09-26",
    vendor: "Marketing Pro",
    category: "Marketing",
    costCenter: "Digital Marketing",
    location: "All Locations",
    amount: 1200,
    taxRate: 5,
    total: 1260,
    notes: "Social media campaign",
    status: "draft",
  },
  {
    id: "5",
    date: "2025-09-25",
    vendor: "CleanCorp",
    category: "Operational",
    costCenter: "Cleaning",
    location: "Downtown",
    amount: 450,
    taxRate: 5,
    total: 472.5,
    notes: "Weekly cleaning services",
    status: "paid",
  },
];

// Category color mapping
const categoryColors = {
  Utilities: "bg-blue-100 text-blue-800",
  Rent: "bg-green-100 text-green-800",
  Equipment: "bg-orange-100 text-orange-800",
  Operational: "bg-purple-100 text-purple-800",
  Marketing: "bg-pink-100 text-pink-800",
};

// Status color mapping
const statusColors = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  draft: "bg-gray-100 text-gray-800",
};

export function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCostCenter, setSelectedCostCenter] = useState("all");
  const [selectedTaxRate, setSelectedTaxRate] = useState("all");
  const [dateRange, setDateRange] = useState("month");
  
  // Add Expense Form State
  const [newExpense, setNewExpense] = useState({
    date: new Date(),
    vendor: "",
    category: "",
    costCenter: "",
    location: "",
    amount: "",
    taxRate: "",
    notes: "",
  });

  // Filter options
  const locations = ["Downtown", "Mall Branch", "Marina Branch", "All Locations"];
  const categories = ["Utilities", "Rent", "Equipment", "Operational", "Marketing"];
  const costCenters = [
    "Gym Equipment", 
    "Electric", 
    "Facility", 
    "Digital Marketing", 
    "Cleaning",
    "Water & Sewer",
    "Internet & Telecom",
    "Security",
    "Maintenance"
  ];
  const taxRates = ["0", "5", "10"];

  // Calculate totals
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = 
      expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.notes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = selectedLocation === "all" || expense.location === selectedLocation;
    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory;
    const matchesCostCenter = selectedCostCenter === "all" || expense.costCenter === selectedCostCenter;
    const matchesTaxRate = selectedTaxRate === "all" || expense.taxRate.toString() === selectedTaxRate;
    
    return matchesSearch && matchesLocation && matchesCategory && matchesCostCenter && matchesTaxRate;
  });

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.total, 0);
  const totalTax = filteredExpenses.reduce((sum, expense) => sum + (expense.total - expense.amount), 0);
  const totalByCategory = categories.reduce((acc, category) => {
    acc[category] = filteredExpenses
      .filter(expense => expense.category === category)
      .reduce((sum, expense) => sum + expense.total, 0);
    return acc;
  }, {} as Record<string, number>);

  // Calculate total for new expense
  const calculateTotal = () => {
    const amount = parseFloat(newExpense.amount) || 0;
    const taxRate = parseFloat(newExpense.taxRate) || 0;
    return amount + (amount * taxRate / 100);
  };

  const handleAddExpense = () => {
    if (!newExpense.vendor || !newExpense.category || !newExpense.amount) return;
    
    const expense: Expense = {
      id: Date.now().toString(),
      date: format(newExpense.date, "yyyy-MM-dd"),
      vendor: newExpense.vendor,
      category: newExpense.category,
      costCenter: newExpense.costCenter,
      location: newExpense.location,
      amount: parseFloat(newExpense.amount),
      taxRate: parseFloat(newExpense.taxRate) || 0,
      total: calculateTotal(),
      notes: newExpense.notes,
      status: "draft",
    };
    
    setExpenses([expense, ...expenses]);
    setNewExpense({
      date: new Date(),
      vendor: "",
      category: "",
      costCenter: "",
      location: "",
      amount: "",
      taxRate: "",
      notes: "",
    });
    setIsAddExpenseOpen(false);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(expense => expense.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary rounded-lg p-2">
            <TrendingDown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Expenses / Ledgers</h1>
            <p className="text-sm text-gray-600">
              Track and categorize all business expenses with tax management
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>
                  Create a new expense entry with tax calculation and cost center allocation.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newExpense.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newExpense.date ? format(newExpense.date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newExpense.date}
                        onSelect={(date) => setNewExpense({...newExpense, date: date || new Date()})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor / Payee</Label>
                  <Input
                    id="vendor"
                    value={newExpense.vendor}
                    onChange={(e) => setNewExpense({...newExpense, vendor: e.target.value})}
                    placeholder="Enter vendor name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value) => setNewExpense({...newExpense, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costCenter">Cost Center</Label>
                  <Select
                    value={newExpense.costCenter}
                    onValueChange={(value) => setNewExpense({...newExpense, costCenter: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cost center" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters.map((center) => (
                        <SelectItem key={center} value={center}>
                          {center}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={newExpense.location}
                    onValueChange={(value) => setNewExpense({...newExpense, location: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (AED)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Select
                    value={newExpense.taxRate}
                    onValueChange={(value) => setNewExpense({...newExpense, taxRate: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {taxRates.map((rate) => (
                        <SelectItem key={rate} value={rate}>
                          {rate}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Total Amount (AED)</Label>
                  <div className="bg-gray-50 p-3 rounded-md border">
                    <span className="text-lg font-semibold text-primary">
                      {calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes / Description</Label>
                  <Textarea
                    id="notes"
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                    placeholder="Add notes or description..."
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsAddExpenseOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddExpense} className="bg-primary hover:bg-primary/90">
                  Add Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              {totalExpenses.toFixed(2)} AED
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {filteredExpenses.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Tax Paid</CardTitle>
              <Receipt className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              {totalTax.toFixed(2)} AED
            </div>
            <p className="text-xs text-gray-600 mt-1">
              VAT & other taxes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Top Category</CardTitle>
              <Target className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              {Object.entries(totalByCategory).sort(([,a], [,b]) => b - a)[0]?.[0] || "N/A"}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {Object.entries(totalByCategory).sort(([,a], [,b]) => b - a)[0]?.[1]?.toFixed(2) || "0"} AED
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Locations</CardTitle>
              <Building2 className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              {new Set(filteredExpenses.map(e => e.location)).size}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Active locations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
              <SelectTrigger>
                <SelectValue placeholder="All Cost Centers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cost Centers</SelectItem>
                {costCenters.map((center) => (
                  <SelectItem key={center} value={center}>
                    {center}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTaxRate} onValueChange={setSelectedTaxRate}>
              <SelectTrigger>
                <SelectValue placeholder="All Tax Rates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tax Rates</SelectItem>
                {taxRates.map((rate) => (
                  <SelectItem key={rate} value={rate}>
                    {rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expense Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
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
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-gray-50">
                    <TableCell>{format(new Date(expense.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-medium">{expense.vendor}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={categoryColors[expense.category as keyof typeof categoryColors]}
                      >
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{expense.costCenter}</TableCell>
                    <TableCell>{expense.location}</TableCell>
                    <TableCell className="text-right">{expense.amount.toFixed(2)} AED</TableCell>
                    <TableCell className="text-right">{expense.taxRate}%</TableCell>
                    <TableCell className="text-right font-semibold">{expense.total.toFixed(2)} AED</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={statusColors[expense.status]}
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
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteExpense(expense.id)}
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
          
          {filteredExpenses.length === 0 && (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
              <p className="text-gray-600 mb-4">
                No expenses match your current filter criteria.
              </p>
              <Button onClick={() => {
                setSearchTerm("");
                setSelectedLocation("all");
                setSelectedCategory("all");
                setSelectedCostCenter("all");
                setSelectedTaxRate("all");
              }}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

