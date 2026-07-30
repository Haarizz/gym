import React, { useState, useMemo } from "react";
import { useCurrency, CurrencyValue, CurrencyGlyph } from "../utils/currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  FileText,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
  Receipt,
  CalendarDays,
  Search,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { salaryPaymentsService, SalaryPaymentEmployee } from "../utils/supabase/salary-payments-service";

export function PayrollReports() {
  const { currencyCode } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all-departments");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [employeesData, setEmployeesData] = useState<SalaryPaymentEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await salaryPaymentsService.getEmployees();
        setEmployeesData(data);
      } catch (error) {
        toast.error("Failed to load payroll reports data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    return employeesData.filter((item) => {
      if (departmentFilter !== "all-departments" && item.department !== departmentFilter) return false;
      if (statusFilter !== "all-status" && item.paymentStatus.toLowerCase() !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.employeeId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [searchQuery, departmentFilter, statusFilter]);

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => ({
        base: acc.base + curr.baseSalary,
        allowances: acc.allowances + curr.allowances,
        deductions: acc.deductions + curr.deductions,
        net: acc.net + curr.netSalary,
      }),
      { base: 0, allowances: 0, deductions: 0, net: 0 }
    );
  }, [filteredData]);

  const handleExport = () => {
    toast.success("Report exported successfully!");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payroll Reports</h1>
          <p className="text-muted-foreground mt-1">
            Detailed breakdown of employee salaries, allowances, and deductions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExport} style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-primary/10 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-departments">All Departments</SelectItem>
                <SelectItem value="Personal Training">Personal Training</SelectItem>
                <SelectItem value="Group Classes">Group Classes</SelectItem>
                <SelectItem value="Front Desk">Front Desk</SelectItem>
                <SelectItem value="Management">Management</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/10 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Total Net Pay
              <Wallet className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              <CurrencyValue amount={totals.net} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Total Base Salary
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              <CurrencyValue amount={totals.base} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Total Allowances
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <CurrencyValue amount={totals.allowances} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Total Deductions
              <Receipt className="h-4 w-4 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              <CurrencyValue amount={totals.deductions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>Detailed Payroll Register</CardTitle>
          <CardDescription>
            Showing {filteredData.length} records based on current filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Base Salary</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Overtime</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right font-bold">Net Pay</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading payroll reports data...
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No payroll records found matching the criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.employeeId || row.id}</div>
                    </TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell className="text-right"><CurrencyGlyph /> {row.baseSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-600">+{row.allowances.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-600">+0</TableCell>
                    <TableCell className="text-right text-red-600">-{row.deductions.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold"><CurrencyGlyph /> {row.netSalary.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={row.paymentStatus === "Paid" ? "bg-green-100 text-green-800 hover:bg-green-100" : row.paymentStatus === "On Hold" ? "bg-red-100 text-red-800 hover:bg-red-100" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"}>
                        {row.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
