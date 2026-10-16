import React, { useState, useMemo, useEffect } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Checkbox } from "../components/ui/checkbox";
import { Separator } from "../components/ui/separator";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Wallet,
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  FileText,
  Plus,
  Minus,
  Download,
  Search,
  Filter,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Receipt,
  TrendingUp,
  Building,
  User,
  BarChart3,
  PieChart,
  Send,
  ArrowLeftRight,
  Upload,
  X,
  Trash2,
  Split
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { salaryPaymentsService, SalaryPayItem, SalarySettlement } from "../utils/supabase/salary-payments-service";
import { exportAsCsv } from "../utils/export-utils";
import { printHtml } from "../utils/print-html";
import { getCompanyDetails } from "../utils/company-details";
import { amountInWords } from "../components/print-templates/documentTemplate";
import { Note } from "../components/workforce/ui";

interface SalaryPaymentsProps {
  onNavigate?: (section: string) => void;
  /** Month name + year to open on (Payroll's "Pay salaries" passes its run's period). */
  initialMonth?: string;
  initialYear?: string;
}

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentStatus: "Paid" | "Pending" | "On Hold";
  lastPaymentDate: Date | null;
  bankAccount?: string;
  email?: string;
  payrollRunId?: number | null;
  payrollRunLineId?: number | null;
  payrollRunStatus?: string | null;
  grossPay?: number | null;
  items?: SalaryPayItem[] | null;
  payrollUsed?: boolean;
}

interface SplitPayment {
  id: string;
  mode: string;
  amount: number;
  reference: string;
}

interface PaymentHistory {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  year: number;
  netSalary: number;
  splitPayments: SplitPayment[];
  paymentDate: Date;
  notes: string;
  status: "Paid";
  processedBy: string;
  voucherNo?: string | null;
  settlement?: SalarySettlement | null;
}


// Payments default to the current month (they used to be hard-coded to Oct/Nov 2025).
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CURRENT_MONTH = MONTH_NAMES[new Date().getMonth()];
const CURRENT_YEAR = String(new Date().getFullYear());
const YEAR_OPTIONS = [-1, 0, 1].map(d => String(new Date().getFullYear() + d));

export function SalaryPayments({ onNavigate, initialMonth, initialYear }: SalaryPaymentsProps) {
  const { currencyCode } = useCurrency();
  const [activeTab, setActiveTab] = useState("individual");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  // The salary month being paid: statuses, amounts and every payment on this page are for it.
  const [monthFilter, setMonthFilter] = useState(MONTH_NAMES.includes(initialMonth ?? "") ? initialMonth! : CURRENT_MONTH);
  const [yearFilter, setYearFilter] = useState(initialYear && /^\d{4}$/.test(initialYear) ? initialYear : CURRENT_YEAR);
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-all";
  
  // Individual payment state
  const [showIndividualPaymentModal, setShowIndividualPaymentModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [enableSplitPayment, setEnableSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { id: "1", mode: "Bank Transfer", amount: 0, reference: "" }
  ]);
  // Without payroll: the month's items (allowances, commission, advance installments, deductions)
  // are all included unless unticked; paymentAdjustments then holds the "other" amounts on top.
  const [excludedItems, setExcludedItems] = useState<string[]>([]);
  const [paymentAdjustments, setPaymentAdjustments] = useState({
    allowances: 0,
    deductions: 0,
  });
  const [paymentFormData, setPaymentFormData] = useState({
    month: CURRENT_MONTH,
    year: CURRENT_YEAR,
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    notes: ""
  });

  // Bulk payment state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [bulkEnableSplit, setBulkEnableSplit] = useState(false);
  const [bulkSplitPayments, setBulkSplitPayments] = useState<SplitPayment[]>([
    { id: "1", mode: "Bank Transfer", amount: 0, reference: "" }
  ]);

  /** Prints the salary payment voucher (company header, payee, period, payment split, signatures). */
  const printVoucher = async (payment: PaymentHistory) => {
    const company = await getCompanyDetails().catch(() => null);
    const emp = employees.find(e => e.employeeId === payment.employeeId);
    const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const money = (n: number) => `${currencyCode} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const voucherNo = payment.voucherNo || `SAL-${payment.employeeId}-${payment.month}-${payment.year}`;
    const splits = payment.splitPayments.length
      ? payment.splitPayments
      : [{ id: "1", mode: "Bank Transfer", amount: payment.netSalary, reference: "" }];
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Salary Voucher ${esc(voucherNo)}</title>
<style>
@page{size:A4;margin:16mm}
*{box-sizing:border-box}
body{font-family:'Plus Jakarta Sans Variable',"Segoe UI",Arial,sans-serif;color:#1e293b;font-size:12px;margin:0}
.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2B7A78;padding-bottom:14px;margin-bottom:18px}
.top img{max-height:48px;max-width:200px;display:block;margin-bottom:6px}
.co{font-size:22px;font-weight:700;color:#2B7A78}
.co-d{color:#64748b;font-size:11px;line-height:1.6}
.title{text-align:right}
.title h1{margin:0;font-size:18px;letter-spacing:.06em;color:#1e293b}
.title .no{font-size:13px;font-weight:700;color:#2B7A78;margin-top:4px}
.title .meta{color:#64748b;font-size:11px;margin-top:2px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.box{background:#f1f5f9;border-radius:8px;padding:10px 12px}
.lbl{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:3px}
.val{font-size:13px;font-weight:600}
table{width:100%;border-collapse:collapse;margin-top:6px}
th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;background:#f1f5f9;padding:8px 10px}
td{padding:9px 10px;border-bottom:1px solid #eef2f7}
.r{text-align:right}
.total{margin-top:14px;display:flex;justify-content:space-between;align-items:center;background:#2B7A7814;border-radius:8px;padding:12px 14px}
.total .amt{font-size:20px;font-weight:800;color:#2B7A78}
.words{margin-top:8px;font-size:11px;color:#475569}
.notes{margin-top:14px;font-size:11px;color:#475569}
.sign{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:56px}
.sign div{border-top:1px solid #94a3b8;padding-top:6px;text-align:center;font-size:11px;color:#475569}
footer{margin-top:28px;font-size:10px;color:#94a3b8;text-align:center}
</style></head><body>
<div class="top">
  <div>${company?.logo ? `<img src="${company.logo}" alt="">` : ""}
    <div class="co">${esc(company?.name || "GymBios")}</div>
    <div class="co-d">${[company?.address, [company?.phone && `Phone: ${company.phone}`, company?.email && `Email: ${company.email}`].filter(Boolean).join(" | "), company?.trn && `TRN: ${company.trn}`].filter(Boolean).map(esc).join("<br/>")}</div>
  </div>
  <div class="title"><h1>SALARY PAYMENT VOUCHER</h1><div class="no">${esc(voucherNo)}</div>
    <div class="meta">Date: ${esc(format(payment.paymentDate, "dd MMM yyyy"))}</div></div>
</div>
<div class="grid">
  <div class="box"><div class="lbl">Paid to</div><div class="val">${esc(payment.employeeName)}</div>
    <div class="co-d">${esc([payment.employeeId, emp?.designation, emp?.department].filter(Boolean).join(" · "))}</div></div>
  <div class="box"><div class="lbl">Salary period</div><div class="val">${esc(`${payment.month} ${payment.year}`)}</div>
    <div class="co-d">${emp?.bankAccount ? `Account: ${esc(emp.bankAccount)}` : "&nbsp;"}</div></div>
</div>
${payment.settlement ? `<table style="margin-bottom:14px">
  <thead><tr><th>Earnings</th><th class="r">Amount</th><th>Deductions</th><th class="r">Amount</th></tr></thead>
  <tbody>${(() => {
    const st = payment.settlement!;
    const earn = [{ label: "Basic salary", amount: st.basic }, ...st.earnings];
    const rows = Math.max(earn.length, st.deductions.length);
    return Array.from({ length: rows }, (_, i) => `<tr><td>${esc(earn[i]?.label ?? "")}</td><td class="r">${earn[i] ? esc(money(earn[i].amount)) : ""}</td><td>${esc(st.deductions[i]?.label ?? "")}</td><td class="r">${st.deductions[i] ? esc(money(st.deductions[i].amount)) : ""}</td></tr>`).join("")
      + `<tr><td><strong>Gross</strong></td><td class="r"><strong>${esc(money(st.gross))}</strong></td><td><strong>Total deductions</strong></td><td class="r"><strong>${esc(money(st.totalDeductions))}</strong></td></tr>`;
  })()}</tbody>
</table>` : ""}
<table>
  <thead><tr><th>Payment mode</th><th>Reference</th><th class="r">Amount</th></tr></thead>
  <tbody>${splits.map(sp => `<tr><td>${esc(sp.mode || "—")}</td><td>${esc(sp.reference || "—")}</td><td class="r">${esc(money(sp.amount))}</td></tr>`).join("")}</tbody>
</table>
<div class="total"><span style="font-weight:700">Net salary paid</span><span class="amt">${esc(money(payment.netSalary))}</span></div>
<div class="words">Amount in words: <strong>${esc(amountInWords(payment.netSalary, currencyCode))}</strong></div>
${payment.notes ? `<div class="notes"><strong>Notes:</strong> ${esc(payment.notes)}</div>` : ""}
<div class="sign"><div>Prepared by<br/><strong>${esc(payment.processedBy || "")}</strong></div><div>Approved by</div><div>Received by (employee)</div></div>
<footer>Generated by GymBios on ${esc(new Date().toLocaleString())}</footer>
</body></html>`;
    printHtml(html);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [employeesData, paymentsData] = await Promise.all([
        salaryPaymentsService.getEmployees({ month: monthFilter, year: Number(yearFilter) }),
        salaryPaymentsService.getPayments(),
      ]);
      setEmployees(employeesData);
      setPaymentHistory(paymentsData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load salary payment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedEmployees([]);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter, yearFilter]);

  // The month's payroll run, if any (every employee row carries it).
  const payrollRun = useMemo(() => {
    const e = employees.find(x => x.payrollRunId);
    return e ? { id: e.payrollRunId!, status: e.payrollRunStatus || "" } : null;
  }, [employees]);
  const payrollDraft = payrollRun?.status === "Draft";
  const yearOptions = useMemo(() => Array.from(new Set([...YEAR_OPTIONS, yearFilter])).sort(), [yearFilter]);

  // Get unique departments — skip staff with no department: an empty value can't be a
  // Select option (Radix throws), which crashed the whole page (BG_85).
  const departments = Array.from(new Set(employees.map(e => e.department?.trim()).filter((d): d is string => !!d)));

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
      const matchesStatus = statusFilter === "all" || emp.paymentStatus === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalEmployees = employees.length;
    const totalSalary = employees.reduce((sum, emp) => sum + emp.netSalary, 0);
    const paidCount = employees.filter(e => e.paymentStatus === "Paid").length;
    const pendingCount = employees.filter(e => e.paymentStatus === "Pending").length;
    const onHoldCount = employees.filter(e => e.paymentStatus === "On Hold").length;
    const pendingAmount = employees
      .filter(e => e.paymentStatus === "Pending")
      .reduce((sum, e) => sum + e.netSalary, 0);

    // Payment mode distribution
    const modeDistribution = paymentHistory.reduce((acc, payment) => {
      payment.splitPayments.forEach(split => {
        acc[split.mode] = (acc[split.mode] || 0) + split.amount;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEmployees,
      totalSalary,
      paidCount,
      pendingCount,
      onHoldCount,
      pendingAmount,
      modeDistribution
    };
  }, [employees, paymentHistory]);

  // Calculate split payment total
  const calculateSplitTotal = (splits: SplitPayment[]) => {
    return splits.reduce((sum, split) => sum + (split.amount || 0), 0);
  };

  // Validate split payment
  const validateSplitPayment = (netSalary: number, splits: SplitPayment[]) => {
    const total = calculateSplitTotal(splits);
    const hasEmptyFields = splits.some(s => !s.mode || s.amount <= 0);
    return {
      isValid: total === netSalary && !hasEmptyFields,
      total,
      difference: netSalary - total
    };
  };

  // An approved payroll fixes the amount; otherwise base + the allowances/deductions entered.
  const selectedItems = selectedEmployee && !selectedEmployee.payrollRunLineId ? selectedEmployee.items ?? null : null;
  const includedItems = (selectedItems ?? []).filter(i => !excludedItems.includes(i.key));
  const itemTotal = (earning: boolean) => includedItems.filter(i => (i.kind === "earning") === earning).reduce((s, i) => s + i.amount, 0);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const selectedNet: number = !selectedEmployee ? 0 : selectedEmployee.payrollRunLineId
    ? selectedEmployee.netSalary
    : round2(Math.max(0, selectedEmployee.baseSalary + itemTotal(true) + paymentAdjustments.allowances - itemTotal(false) - paymentAdjustments.deductions));

  const handleOpenIndividualPayment = (employee: Employee) => {
    const fromItems = !employee.payrollRunLineId && !!employee.items;
    const initialAllowances = fromItems ? 0 : employee.allowances || 0;
    const initialDeductions = fromItems ? 0 : employee.deductions || 0;
    const computedNet = employee.payrollRunLineId || fromItems ? employee.netSalary : Math.max(0, employee.baseSalary + initialAllowances - initialDeductions);
    setExcludedItems([]);
    setSelectedEmployee(employee);
    setEnableSplitPayment(false);
    setPaymentAdjustments({
      allowances: initialAllowances,
      deductions: initialDeductions,
    });
    setSplitPayments([
      { id: "1", mode: "Bank Transfer", amount: computedNet, reference: "" }
    ]);
    setPaymentFormData({
      month: monthFilter,
      year: yearFilter,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      notes: ""
    });
    setShowIndividualPaymentModal(true);
  };

  const handleAddSplitPayment = (isBulk = false) => {
    const setter = isBulk ? setBulkSplitPayments : setSplitPayments;
    setter(prev => [
      ...prev,
      { id: Date.now().toString(), mode: "Cash", amount: 0, reference: "" }
    ]);
  };

  const handleRemoveSplitPayment = (id: string, isBulk = false) => {
    const setter = isBulk ? setBulkSplitPayments : setSplitPayments;
    setter(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSplitPayment = (id: string, field: keyof SplitPayment, value: any, isBulk = false) => {
    const setter = isBulk ? setBulkSplitPayments : setSplitPayments;
    setter(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleProcessIndividualPayment = async () => {
    if (!selectedEmployee) return;

    const netSalary = selectedNet;
    const paymentsToUse = enableSplitPayment ? splitPayments : [{
      id: "1",
      mode: splitPayments[0]?.mode || "Bank Transfer",
      amount: netSalary,
      reference: splitPayments[0]?.reference || ""
    }];

    const validation = validateSplitPayment(netSalary, paymentsToUse);
    if (enableSplitPayment && !validation.isValid) {
      toast.error(`Split payment total must equal net salary. Difference: ${currencyCode} ${Math.abs(validation.difference)}`);
      return;
    }

    try {
      await salaryPaymentsService.createPayment({
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.name,
        month: monthFilter,
        year: parseInt(yearFilter),
        netSalary,
        splitPayments: paymentsToUse,
        payrollRunLineId: selectedEmployee.payrollRunLineId ?? undefined,
        applyItems: !!selectedItems,
        itemKeys: includedItems.map(i => i.key),
        extraAllowance: paymentAdjustments.allowances,
        extraDeduction: paymentAdjustments.deductions,
        paymentDate: paymentFormData.paymentDate,
        notes: paymentFormData.notes,
        processedBy: "HR Manager",
      });
      toast.success(`Payment processed successfully for ${selectedEmployee.name}!`);
      setShowIndividualPaymentModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process payment");
    }
  };

  const handleProcessBulkPayment = async () => {
    const selectedCount = selectedEmployees.length;
    if (selectedCount === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    const selectedEmps = employees.filter(e => selectedEmployees.includes(e.id));
    const totalAmount = selectedEmps.reduce((sum, e) => sum + e.netSalary, 0);

    if (bulkEnableSplit) {
      const validation = validateSplitPayment(totalAmount, bulkSplitPayments);
      if (!validation.isValid) {
        toast.error(`Split payment total must equal total salary. Difference: ${currencyCode} ${Math.abs(validation.difference)}`);
        return;
      }
    }

    const paymentDate = format(new Date(), "yyyy-MM-dd");
    const bulkRequests = selectedEmps.map(emp => ({
      employeeId: emp.employeeId,
      employeeName: emp.name,
      month: monthFilter,
      year: parseInt(yearFilter),
      netSalary: emp.netSalary,
      payrollRunLineId: emp.payrollRunLineId ?? undefined,
      // without payroll: everything due this month, as listed
      applyItems: !emp.payrollRunLineId && !!emp.items,
      itemKeys: (emp.items ?? []).map(i => i.key),
      splitPayments: bulkEnableSplit 
        ? bulkSplitPayments.map(s => ({...s}))
        : [{ id: "1", mode: "Bank Transfer", amount: emp.netSalary, reference: `Bulk-${Date.now()}` }],
      paymentDate,
      notes: "Bulk payment processing",
      processedBy: "HR Manager",
    }));

    try {
      await salaryPaymentsService.createBulkPayments(bulkRequests);
      setSelectedEmployees([]);
      toast.success(`Bulk payment processed for ${selectedCount} employees!`);
      setShowBulkPaymentModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process bulk payments");
    }
  };

  const handleToggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    const pending = filteredEmployees.filter(e => e.paymentStatus === "Pending");
    if (selectedEmployees.length === pending.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(pending.map(e => e.id));
    }
  };

  const handleExportEmployees = () => {
    if (filteredEmployees.length === 0) {
      toast.error("No employees to export");
      return;
    }
    exportAsCsv(
      `payroll-employees_${format(new Date(), "yyyy-MM-dd")}.csv`,
      ["Employee ID", "Name", "Department", "Designation", "Base Salary", "Allowances", "Deductions", "Net Salary", "Status", "Last Payment Date"],
      filteredEmployees.map(e => [
        e.employeeId, e.name, e.department, e.designation,
        e.baseSalary, e.allowances, e.deductions, e.netSalary, e.paymentStatus,
        e.lastPaymentDate ? format(e.lastPaymentDate, "yyyy-MM-dd") : "",
      ])
    );
    toast.success("Export started");
  };

  const handleExportPaymentHistory = () => {
    if (paymentHistory.length === 0) {
      toast.error("No payment history to export");
      return;
    }
    exportAsCsv(
      `salary-payments_${format(new Date(), "yyyy-MM-dd")}.csv`,
      ["Employee", "Month", "Year", "Net Salary", "Payment Date", "Status", "Processed By"],
      paymentHistory.map(p => [
        p.employeeName, p.month, p.year, p.netSalary,
        format(p.paymentDate, "yyyy-MM-dd"), p.status, p.processedBy,
      ])
    );
    toast.success("Export started");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "On Hold":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Paid":
        return <CheckCircle className="h-4 w-4" />;
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "On Hold":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPaymentModeIcon = (mode: string) => {
    switch (mode) {
      case "Cash":
        return <Banknote className="h-4 w-4" />;
      case "Bank Transfer":
        return <CreditCard className="h-4 w-4" />;
      case "Cheque":
        return <FileText className="h-4 w-4" />;
      case "Digital Wallet":
        return <Smartphone className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  // Chart data for payment mode distribution
  const modeChartData = useMemo(() => {
    return Object.entries(summaryStats.modeDistribution).map(([name, value]) => ({
      name,
      value
    }));
  }, [summaryStats.modeDistribution]);

  const COLORS = ['#0F766E', '#B91C1C', '#F4A261', '#2A9D8F', '#E76F51'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salary Payments</h1>
          <p className="text-muted-foreground">
            {monthFilter} {yearFilter} - Process individual and bulk salary payments with split payment options
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger style={{ width: "9.5rem" }} aria-label="Salary month"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTH_NAMES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger style={{ width: "6.5rem" }} aria-label="Salary year"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {payrollRun && !payrollDraft && (
        <Note tone={payrollRun.status === "Paid" || payrollRun.status === "Disbursed" ? "green" : "blue"}>
          Amounts come from the approved payroll for {monthFilter} {yearFilter} ({payrollRun.status}). Paying an employee records their advance
          installments, deductions and commission.{" "}
          <button type="button" onClick={() => onNavigate?.("payroll")} style={{ background: "none", border: 0, padding: 0, color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}>Open payroll</button>
        </Note>
      )}
      {payrollDraft && (
        <Note tone="amber">
          The payroll for {monthFilter} {yearFilter} is still a draft. Approve it in Payroll before paying salaries for this month — then the
          amounts here come from it.{" "}
          <button type="button" onClick={() => onNavigate?.("payroll")} style={{ background: "none", border: 0, padding: 0, color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}>Go to payroll</button>
        </Note>
      )}
      {!payrollRun && !loading && employees.some(e => e.payrollUsed) && (
        <Note tone="gray">
          No payroll has been run for {monthFilter} {yearFilter}: amounts are each employee's salary, allowances, approved commission and the
          advance installments and deductions due this month. Run payroll to also include attendance and overtime.
        </Note>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Employees</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active staff members
            </p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Payable</CardTitle>
            <div className="bg-emerald-50 p-2 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold"><CurrencyGlyph /> {summaryStats.totalSalary.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {monthFilter} {yearFilter}
            </p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Pending Payments</CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <CurrencyGlyph /> {summaryStats.pendingAmount.toLocaleString()} to process
            </p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Paid for {monthFilter}</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.paidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully processed
            </p>
          </CardContent>
        </Card>
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

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="individual">
            <CreditCard className="mr-2 h-4 w-4" />
            Individual Payment
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Users className="mr-2 h-4 w-4" />
            Bulk Payment
          </TabsTrigger>
          <TabsTrigger value="summary">
            <BarChart3 className="mr-2 h-4 w-4" />
            Payment Summary
          </TabsTrigger>
        </TabsList>

        {/* Individual Payment Tab */}
        <TabsContent value="individual" className="space-y-6">
          {/* Filters */}
          <Card className={cardShell}>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or employee ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-10"
                  />
                </div>

                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Employee List */}
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Select Employee for Payment</CardTitle>
              <CardDescription>Click "Pay" to process individual salary payment</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department / Designation</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Payable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.employeeId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.department || "—"}</div>
                          <div className="text-sm text-muted-foreground">{employee.designation}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CurrencyGlyph /> {employee.baseSalary.toLocaleString()}
                        {employee.payrollRunLineId && <div className="text-xs text-muted-foreground">From payroll</div>}
                      </TableCell>
                      <TableCell className="text-green-600">+{employee.allowances.toLocaleString()}</TableCell>
                      <TableCell className="text-red-600">-{employee.deductions.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="font-bold" style={{ color: 'var(--primary)' }}>
                          <CurrencyGlyph /> {employee.netSalary.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(employee.paymentStatus)}>
                          {getStatusIcon(employee.paymentStatus)}
                          <span className="ml-1">{employee.paymentStatus}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {employee.paymentStatus === "Paid" ? (
                          <Button size="sm" variant="outline" disabled>
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Paid
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={payrollDraft}
                            title={payrollDraft ? "Approve this month's payroll first" : undefined}
                            onClick={() => handleOpenIndividualPayment(employee)}
                            style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)', color: 'var(--primary-foreground)' }}
                          >
                            <Send className="mr-1 h-4 w-4" />
                            Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Payment Tab */}
        <TabsContent value="bulk" className="space-y-6">
          {/* Filters */}
          <Card className={cardShell}>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowBulkPaymentModal(true)}
                    disabled={selectedEmployees.length === 0 || payrollDraft}
                    style={{ background: 'linear-gradient(135deg, var(--danger) 0%, var(--danger) 100%)', color: 'var(--danger-foreground)' }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Process Payment ({selectedEmployees.length})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportEmployees}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Selection Table */}
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Select Employees for Bulk Payment</CardTitle>
              <CardDescription>Select multiple employees to process payments in batch</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedEmployees.length === filteredEmployees.filter(e => e.paymentStatus === "Pending").length && filteredEmployees.filter(e => e.paymentStatus === "Pending").length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Net Payable</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.filter(e => e.paymentStatus === "Pending").map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => handleToggleEmployee(employee.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.employeeId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.department || "—"}</TableCell>
                      <TableCell>
                        <span className="font-bold" style={{ color: 'var(--primary)' }}>
                          <CurrencyGlyph /> {employee.netSalary.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(employee.paymentStatus)}>
                          {employee.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {selectedEmployees.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Total Selected: {selectedEmployees.length} employees</span>
                    </div>
                    <div>
                      <span className="font-bold" style={{ color: 'var(--primary)' }}>
                        Total Amount: <CurrencyGlyph /> {employees
                          .filter(e => selectedEmployees.includes(e.id))
                          .reduce((sum, e) => sum + e.netSalary, 0)
                          .toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Mode Distribution Chart */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                  Payment Mode Distribution
                </CardTitle>
                <CardDescription>Breakdown by payment method</CardDescription>
              </CardHeader>
              <CardContent>
                {modeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={modeChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${currencyCode} ${value.toLocaleString()}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {modeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${currencyCode} ${value.toLocaleString()}`} />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No payment data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Statistics */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                  Payment Statistics
                </CardTitle>
                <CardDescription>Current month overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-muted/50 border-0 shadow-none">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                          {paymentHistory.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Payments</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50 border-0 shadow-none">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                          <CurrencyGlyph /> {paymentHistory.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Amount Paid</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Payment Mode Breakdown</h4>
                  {Object.entries(summaryStats.modeDistribution).map(([mode, amount]) => (
                    <div key={mode} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        {getPaymentModeIcon(mode)}
                        <span className="font-medium">{mode}</span>
                      </div>
                      <span className="font-bold" style={{ color: 'var(--primary)' }}>
                        <CurrencyGlyph /> {amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          <Card className={cardShell}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Payment Transactions</CardTitle>
                  <CardDescription>Latest salary payments processed</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={handleExportPaymentHistory}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Payment Mode(s)</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="font-medium">{payment.employeeName}</div>
                      </TableCell>
                      <TableCell>
                        <div>{payment.month} {payment.year}</div>
                        {payment.voucherNo && <div className="text-xs text-muted-foreground">{payment.voucherNo}</div>}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold"><CurrencyGlyph /> {payment.netSalary.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {payment.splitPayments.map((split, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {getPaymentModeIcon(split.mode)}
                              <span className="ml-1">{split.mode}: {split.amount}</span>
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{format(payment.paymentDate, "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          title={payment.voucherNo ? `Print voucher ${payment.voucherNo}` : "Print payment voucher"}
                          onClick={() => printVoucher(payment)}
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Individual Payment Modal */}
      <Dialog open={showIndividualPaymentModal} onOpenChange={setShowIndividualPaymentModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Individual Salary Payment</DialogTitle>
            <DialogDescription>
              {selectedEmployee && `${selectedEmployee.name} - ${selectedEmployee.employeeId}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {selectedEmployee && (
              <>
                {/* Employee Salary Breakdown */}
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">Salary Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Base Salary:</span>
                        <span className="font-medium"><CurrencyGlyph /> {selectedEmployee.baseSalary.toLocaleString()}</span>
                      </div>

                      {selectedEmployee.payrollRunLineId ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Allowances, overtime & commission:</span>
                            <span className="font-medium text-green-600">+ <CurrencyGlyph /> {selectedEmployee.allowances.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Absence, advance & other deductions:</span>
                            <span className="font-medium text-red-600">- <CurrencyGlyph /> {selectedEmployee.deductions.toLocaleString()}</span>
                          </div>
                          <Note tone="blue">From the approved payroll for {monthFilter} {yearFilter}. To change it, reopen the payroll before anyone is paid.</Note>
                        </>
                      ) : (
                      <>
                      {selectedItems && selectedItems.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm text-muted-foreground">Due for {monthFilter} {yearFilter} — untick anything not paid with this salary</span>
                          {selectedItems.map(item => {
                            const on = !excludedItems.includes(item.key);
                            const earning = item.kind === "earning";
                            return (
                              <label key={item.key} className="flex items-center justify-between gap-2 cursor-pointer">
                                <span className="flex items-center gap-2">
                                  <Checkbox
                                    checked={on}
                                    onCheckedChange={(v) => setExcludedItems(prev => v ? prev.filter(k => k !== item.key) : [...prev, item.key])}
                                  />
                                  <span className={on ? "text-sm" : "text-sm text-muted-foreground"} style={on ? undefined : { textDecoration: "line-through" }}>{item.label}</span>
                                </span>
                                <span className={on ? (earning ? "font-medium text-green-600" : "font-medium text-red-600") : "text-muted-foreground"}>
                                  {earning ? "+" : "-"} <CurrencyGlyph /> {item.amount.toLocaleString()}
                                </span>
                              </label>
                            );
                          })}
                          {selectedItems.some(i => i.kind === "advance" || i.kind === "deduction") && (
                            <Note tone="blue">Ticked advance installments and deductions are recorded against this salary in Advances & Deductions.</Note>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{selectedItems ? "Other allowance" : "Allowances"} ({currencyCode})</Label>
                          <Input
                            type="number"
                            value={paymentAdjustments.allowances}
                            onChange={(e) => {
                              const value = Math.max(0, parseFloat(e.target.value) || 0);
                              setPaymentAdjustments((prev) => ({ ...prev, allowances: value }));
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{selectedItems ? "Other deduction" : "Deductions"} ({currencyCode})</Label>
                          <Input
                            type="number"
                            value={paymentAdjustments.deductions}
                            onChange={(e) => {
                              const value = Math.max(0, parseFloat(e.target.value) || 0);
                              setPaymentAdjustments((prev) => ({ ...prev, deductions: value }));
                            }}
                          />
                        </div>
                      </div>
                      </>
                      )}

                      <Separator />
                      <div className="flex justify-between">
                        <span className="font-bold">Net Payable:</span>
                        <span className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                          <CurrencyGlyph /> {selectedNet.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Month and Payment Date */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Salary Month *</Label>
                    <Select
                      value={monthFilter}
                      disabled
                      onValueChange={() => {}}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(month => (
                          <SelectItem key={month} value={month}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Select
                      value={yearFilter}
                      disabled
                      onValueChange={() => {}}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date *</Label>
                    <Input
                      type="date"
                      value={paymentFormData.paymentDate}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Split Payment Toggle */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Split className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                        <div>
                          <Label htmlFor="split-toggle" className="cursor-pointer">Enable Split Payment</Label>
                          <p className="text-sm text-muted-foreground">
                            Divide payment between multiple modes (e.g., cash + bank)
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="split-toggle"
                        checked={enableSplitPayment}
                        onCheckedChange={setEnableSplitPayment}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Mode Section */}
                {enableSplitPayment ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Split Payment Configuration</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSplitPayment(false)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Payment Mode
                      </Button>
                    </div>

                    {splitPayments.map((split, index) => (
                      <Card key={split.id} className="border-2" style={{ borderColor: 'var(--primary)' }}>
                        <CardContent className="pt-6">
                          <div className="flex gap-3 items-start">
                            <div className="flex-1 space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label>Payment Mode *</Label>
                                  <Select
                                    value={split.mode}
                                    onValueChange={(value) => handleUpdateSplitPayment(split.id, "mode", value, false)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Cash">
                                        <span className="inline-flex items-center gap-2">
                                          <Banknote className="h-4 w-4 text-emerald-600" />
                                          Cash
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="Bank Transfer">
                                        <span className="inline-flex items-center gap-2">
                                          <CreditCard className="h-4 w-4 text-blue-600" />
                                          Bank Transfer
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="Cheque">
                                        <span className="inline-flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-slate-600" />
                                          Cheque
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="Digital Wallet">
                                        <span className="inline-flex items-center gap-2">
                                          <Smartphone className="h-4 w-4 text-purple-600" />
                                          Digital Wallet
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="Other">
                                        <span className="inline-flex items-center gap-2">
                                          <ArrowLeftRight className="h-4 w-4 text-amber-600" />
                                          Other
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Amount ({currencyCode}) *</Label>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={split.amount || ""}
                                    onChange={(e) => handleUpdateSplitPayment(split.id, "amount", parseFloat(e.target.value) || 0, false)}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Reference / Note</Label>
                                <Input
                                  placeholder="Transaction ID, cheque number, or note"
                                  value={split.reference}
                                  onChange={(e) => handleUpdateSplitPayment(split.id, "reference", e.target.value, false)}
                                />
                              </div>
                            </div>
                            {splitPayments.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveSplitPayment(split.id, false)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Split Validation */}
                    <Card className={
                      validateSplitPayment(
                        selectedNet,
                        splitPayments
                      ).isValid
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Total Split Amount:</span>
                          <span className="text-xl font-bold">
                            <CurrencyGlyph /> {calculateSplitTotal(splitPayments).toLocaleString()}
                          </span>
                        </div>
                        {!validateSplitPayment(
                          selectedNet,
                          splitPayments
                        ).isValid && (
                          <p className="text-sm text-red-600 mt-2">
                            Total must equal Net Payable (<CurrencyGlyph /> {selectedNet.toLocaleString()})
                            - Difference: <CurrencyGlyph /> {Math.abs(validateSplitPayment(
                              selectedNet,
                              splitPayments
                            ).difference).toLocaleString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Payment Mode *</Label>
                        <Select
                          value={splitPayments[0]?.mode || "Bank Transfer"}
                          onValueChange={(value) => handleUpdateSplitPayment(splitPayments[0]?.id || "1", "mode", value, false)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">
                              <span className="inline-flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-emerald-600" />
                                Cash
                              </span>
                            </SelectItem>
                            <SelectItem value="Bank Transfer">
                              <span className="inline-flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-blue-600" />
                                Bank Transfer
                              </span>
                            </SelectItem>
                            <SelectItem value="Cheque">
                              <span className="inline-flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-600" />
                                Cheque
                              </span>
                            </SelectItem>
                            <SelectItem value="Digital Wallet">
                              <span className="inline-flex items-center gap-2">
                                <Smartphone className="h-4 w-4 text-purple-600" />
                                Digital Wallet
                              </span>
                            </SelectItem>
                            <SelectItem value="Other">
                              <span className="inline-flex items-center gap-2">
                                <ArrowLeftRight className="h-4 w-4 text-amber-600" />
                                Other
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Reference / Note</Label>
                        <Input
                          placeholder="Transaction ID or reference"
                          value={splitPayments[0]?.reference || ""}
                          onChange={(e) => handleUpdateSplitPayment(splitPayments[0]?.id || "1", "reference", e.target.value, false)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachment */}
                <div className="space-y-2">
                  <Label>Attachment (Optional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      Upload receipt or payment proof
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG up to 5MB
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Remarks (Optional)</Label>
                  <Textarea
                    placeholder="Additional notes or comments..."
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIndividualPaymentModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProcessIndividualPayment}
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)', color: 'var(--primary-foreground)' }}
            >
              <Send className="mr-2 h-4 w-4" />
              Process Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Payment Modal */}
      <Dialog open={showBulkPaymentModal} onOpenChange={setShowBulkPaymentModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Salary Payment</DialogTitle>
            <DialogDescription>
              Process salary payments for {selectedEmployees.length} selected employees
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selected Employees:</span>
                    <span className="font-medium">{selectedEmployees.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Total Amount:</span>
                    <span className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                      <CurrencyGlyph /> {employees
                        .filter(e => selectedEmployees.includes(e.id))
                        .reduce((sum, e) => sum + e.netSalary, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Period */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Month *</Label>
                <Select
                  value={monthFilter}
                  disabled
                  onValueChange={() => {}}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year *</Label>
                <Select
                  value={yearFilter}
                  disabled
                  onValueChange={() => {}}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={paymentFormData.paymentDate}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                />
              </div>
            </div>

            {/* Split Payment Toggle */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ArrowLeftRight className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                    <div>
                      <Label htmlFor="bulk-split-toggle" className="cursor-pointer">Enable Split Payment</Label>
                      <p className="text-sm text-muted-foreground">
                        Apply same split configuration to all selected employees
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="bulk-split-toggle"
                    checked={bulkEnableSplit}
                    onCheckedChange={setBulkEnableSplit}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Configuration */}
            {!bulkEnableSplit ? (
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select defaultValue="Bank Transfer">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">
                      <span className="inline-flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-emerald-600" />
                        Cash
                      </span>
                    </SelectItem>
                    <SelectItem value="Bank Transfer">
                      <span className="inline-flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        Bank Transfer
                      </span>
                    </SelectItem>
                    <SelectItem value="Cheque">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-600" />
                        Cheque
                      </span>
                    </SelectItem>
                    <SelectItem value="Digital Wallet">
                      <span className="inline-flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-purple-600" />
                        Digital Wallet
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Split Configuration (Applied to All)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSplitPayment(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Mode
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Configure percentage split that will be applied to each employee's salary
                </p>

                {bulkSplitPayments.map((split) => (
                  <Card key={split.id} className="border-2" style={{ borderColor: 'var(--primary)' }}>
                    <CardContent className="pt-6">
                      <div className="flex gap-3 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Payment Mode *</Label>
                            <Select
                              value={split.mode}
                              onValueChange={(value) => handleUpdateSplitPayment(split.id, "mode", value, true)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Cash">
                                  <span className="inline-flex items-center gap-2">
                                    <Banknote className="h-4 w-4 text-emerald-600" />
                                    Cash
                                  </span>
                                </SelectItem>
                                <SelectItem value="Bank Transfer">
                                  <span className="inline-flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-blue-600" />
                                    Bank Transfer
                                  </span>
                                </SelectItem>
                                <SelectItem value="Cheque">
                                  <span className="inline-flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-slate-600" />
                                    Cheque
                                  </span>
                                </SelectItem>
                                <SelectItem value="Digital Wallet">
                                  <span className="inline-flex items-center gap-2">
                                    <Smartphone className="h-4 w-4 text-purple-600" />
                                    Digital Wallet
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Amount ({currencyCode}) *</Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={split.amount || ""}
                              onChange={(e) => handleUpdateSplitPayment(split.id, "amount", parseFloat(e.target.value) || 0, true)}
                            />
                          </div>
                        </div>
                        {bulkSplitPayments.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveSplitPayment(split.id, true)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Employee List */}
            <div className="space-y-2">
              <Label>Employees to be Processed</Label>
              <div className="max-h-[200px] overflow-y-auto border rounded-lg p-3 space-y-2">
                {employees
                  .filter(e => selectedEmployees.includes(e.id))
                  .map(emp => (
                    <div key={emp.id} className="flex justify-between p-2 bg-muted rounded">
                      <span className="font-medium">{emp.name}</span>
                      <span style={{ color: 'var(--primary)' }}><CurrencyGlyph /> {emp.netSalary.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkPaymentModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProcessBulkPayment}
              style={{ background: 'linear-gradient(135deg, var(--danger) 0%, var(--danger) 100%)', color: 'var(--danger-foreground)' }}
            >
              <Send className="mr-2 h-4 w-4" />
              Process Bulk Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

