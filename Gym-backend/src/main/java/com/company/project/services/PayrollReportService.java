package com.company.project.services;

import com.company.project.entities.AdvanceRepayment;
import com.company.project.entities.PayrollRun;
import com.company.project.entities.PayrollRunLine;
import com.company.project.entities.SalaryAdvance;
import com.company.project.entities.SalaryPayment;
import com.company.project.entities.Staff;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.AdvanceRepaymentRepository;
import com.company.project.repositories.PayrollRunLineRepository;
import com.company.project.repositories.PayrollRunRepository;
import com.company.project.repositories.SalaryAdvanceRepository;
import com.company.project.repositories.SalaryPaymentRepository;
import com.company.project.repositories.StaffRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The data behind Payroll Reports and Payroll Analytics: one row per employee per month, from the
 * month's payroll run when there is one, otherwise from the salary payments made for that month
 * (their settlement breakdown) — so gyms that only use Salary Payments get the same reports.
 *
 * <ul>
 *   <li>Approved / paid runs: every line is a row; status Paid once the line is settled, else Unpaid.</li>
 *   <li>Draft runs: rows with status Draft (pages leave them out of cost totals by default). A draft
 *       line is dropped when the employee was already paid manually for the month.</li>
 *   <li>Manual payments (no payroll line) for employees not on the run: a Paid row built from the
 *       payment's settlement — basic, allowances, overtime, commission, deductions.</li>
 * </ul>
 * Branch scoping comes from the branch filter on runs, payments, staff and advances.
 */
@Service
@Transactional(readOnly = true)
public class PayrollReportService {

    private static final DateTimeFormatter LABEL = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);
    private static final int MAX_MONTHS = 36;

    private final PayrollRunRepository runRepository;
    private final PayrollRunLineRepository lineRepository;
    private final SalaryPaymentRepository paymentRepository;
    private final StaffRepository staffRepository;
    private final SalaryAdvanceRepository advanceRepository;
    private final AdvanceRepaymentRepository repaymentRepository;
    private final ObjectMapper objectMapper;

    public PayrollReportService(PayrollRunRepository runRepository, PayrollRunLineRepository lineRepository,
                                SalaryPaymentRepository paymentRepository, StaffRepository staffRepository,
                                SalaryAdvanceRepository advanceRepository, AdvanceRepaymentRepository repaymentRepository,
                                ObjectMapper objectMapper) {
        this.runRepository = runRepository;
        this.lineRepository = lineRepository;
        this.paymentRepository = paymentRepository;
        this.staffRepository = staffRepository;
        this.advanceRepository = advanceRepository;
        this.repaymentRepository = repaymentRepository;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> dataset(YearMonth from, YearMonth to) {
        YearMonth now = YearMonth.now();
        if (to == null) to = now;
        if (from == null) from = to.minusMonths(5);
        if (from.isAfter(to)) throw new BusinessRuleViolationException("The start month must be on or before the end month");
        if (from.plusMonths(MAX_MONTHS - 1).isBefore(to)) throw new BusinessRuleViolationException("Pick a range of three years or less");
        final YearMonth start = from, end = to;

        List<Staff> staff = staffRepository.findAll();
        Map<String, Staff> staffByCode = new HashMap<>();
        Map<Long, Staff> staffById = new HashMap<>();
        for (Staff s : staff) {
            staffById.put(s.getId(), s);
            staffByCode.putIfAbsent(code(s), s);
        }

        // The latest run per month in range.
        Map<YearMonth, PayrollRun> runByMonth = new HashMap<>();
        for (PayrollRun r : runRepository.findAll()) {
            if (r.getPeriodYear() == null || r.getPeriodMonth() == null) continue;
            YearMonth m = YearMonth.of(r.getPeriodYear(), r.getPeriodMonth());
            if (m.isBefore(start) || m.isAfter(end)) continue;
            runByMonth.merge(m, r, (a, b) -> a.getId() > b.getId() ? a : b);
        }
        Map<Long, List<PayrollRunLine>> linesByRun = runByMonth.isEmpty() ? Map.of()
                : lineRepository.findByRunIdIn(runByMonth.values().stream().map(PayrollRun::getId).toList()).stream()
                        .collect(Collectors.groupingBy(PayrollRunLine::getRunId));

        // Paid salary payments for months in range.
        Map<Long, SalaryPayment> paymentById = new HashMap<>();
        Map<YearMonth, List<SalaryPayment>> paymentsByMonth = new HashMap<>();
        for (SalaryPayment p : paymentRepository.findAll()) {
            if (p.getStatus() != null && !"Paid".equalsIgnoreCase(p.getStatus())) continue;
            YearMonth m = period(p.getMonth(), p.getYear());
            if (m == null || m.isBefore(start) || m.isAfter(end)) continue;
            paymentById.put(p.getId(), p);
            paymentsByMonth.computeIfAbsent(m, k -> new ArrayList<>()).add(p);
        }

        List<Map<String, Object>> records = new ArrayList<>();
        List<Map<String, Object>> runs = new ArrayList<>();
        for (YearMonth m = start; !m.isAfter(end); m = m.plusMonths(1)) {
            List<SalaryPayment> monthPayments = paymentsByMonth.getOrDefault(m, List.of());
            Set<String> paidManually = monthPayments.stream()
                    .filter(p -> p.getPayrollRunLineId() == null && p.getEmployeeId() != null)
                    .map(SalaryPayment::getEmployeeId).collect(Collectors.toSet());
            Set<String> covered = new HashSet<>();
            Set<Long> usedPayments = new HashSet<>();

            PayrollRun run = runByMonth.get(m);
            if (run != null) {
                boolean draft = "Draft".equals(run.getStatus());
                List<PayrollRunLine> lines = linesByRun.getOrDefault(run.getId(), List.of());
                BigDecimal paidAmount = BigDecimal.ZERO, outstanding = BigDecimal.ZERO;
                int paidCount = 0;
                for (PayrollRunLine l : lines) {
                    String code = l.getEmployeeCode() != null ? l.getEmployeeCode()
                            : l.getStaffId() != null && staffById.containsKey(l.getStaffId()) ? code(staffById.get(l.getStaffId()))
                            : String.valueOf(l.getStaffId());
                    if (draft && paidManually.contains(code)) continue;
                    boolean paid = !draft && (l.getSalaryPaymentId() != null || l.getPaidAt() != null);
                    SalaryPayment payment = l.getSalaryPaymentId() != null ? paymentById.get(l.getSalaryPaymentId()) : null;
                    if (payment != null) usedPayments.add(payment.getId());
                    Staff s = l.getStaffId() != null ? staffById.get(l.getStaffId()) : staffByCode.get(code);
                    records.add(fromLine(m, run, l, code, s, draft ? "Draft" : paid ? "Paid" : "Unpaid", payment));
                    covered.add(code);
                    if (paid) { paidCount++; paidAmount = paidAmount.add(nz(l.getNetPay())); }
                    else if (!draft) outstanding = outstanding.add(nz(l.getNetPay()));
                }
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("id", run.getId());
                r.put("month", m.toString());
                r.put("label", m.format(LABEL));
                r.put("status", run.getStatus());
                r.put("employees", lines.size());
                r.put("gross", money(run.getTotalGross()));
                r.put("deductions", money(run.getTotalDeductions()));
                r.put("net", money(run.getTotalNet()));
                r.put("paidCount", paidCount);
                r.put("paidAmount", money(paidAmount));
                r.put("outstanding", money(outstanding));
                r.put("approvedBy", run.getApprovedBy());
                r.put("approvedAt", run.getApprovedAt());
                r.put("createdAt", run.getCreatedAt());
                runs.add(r);
            }

            for (SalaryPayment p : monthPayments) {
                if (usedPayments.contains(p.getId())) continue;
                String code = p.getEmployeeId() != null ? p.getEmployeeId() : "payment-" + p.getId();
                // a payment linked to a line we didn't see (e.g. the run was regenerated) still counts once
                if (p.getPayrollRunLineId() != null && covered.contains(code)) continue;
                records.add(fromPayment(m, p, code, staffByCode.get(code)));
                covered.add(code);
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("from", start.toString());
        out.put("to", end.toString());
        List<Map<String, Object>> months = new ArrayList<>();
        for (YearMonth m = start; !m.isAfter(end); m = m.plusMonths(1)) {
            months.add(Map.of("month", m.toString(), "label", m.format(LABEL), "current", m.equals(now)));
        }
        out.put("months", months);
        out.put("payrollUsed", runRepository.count() > 0);
        out.put("records", records);
        out.put("runs", runs);
        out.put("payments", payments(paymentById.values(), staffByCode));
        out.put("advances", advances(start, end, staffByCode));
        out.put("staff", staffSummary(staff, start, end));
        return out;
    }

    // ── Rows ────────────────────────────────────────────────────────────────

    private Map<String, Object> fromLine(YearMonth m, PayrollRun run, PayrollRunLine l, String code, Staff s,
                                         String status, SalaryPayment payment) {
        BigDecimal otherDeductions = nz(l.getOtherDeductions());
        BigDecimal totalDeductions = nz(l.getAttendanceDeduction()).add(nz(l.getAdvanceRepayment())).add(otherDeductions);
        Map<String, Object> r = base(m, code, s, firstNonBlank(l.getEmployeeName(), s != null ? s.getName() : null),
                firstNonBlank(l.getDepartment(), s != null ? s.getDepartment() : null),
                firstNonBlank(l.getDesignation(), s != null ? s.getRole() : null));
        r.put("source", "payroll");
        r.put("runId", run.getId());
        r.put("runStatus", run.getStatus());
        r.put("status", status);
        r.put("basic", money(l.getBasicSalary()));
        r.put("allowances", money(l.getAllowances()));
        r.put("overtime", money(l.getOtPay()));
        r.put("commission", money(l.getCommission()));
        r.put("unitemised", BigDecimal.ZERO.setScale(2));
        r.put("gross", money(l.getGrossPay()));
        r.put("attendanceDeduction", money(l.getAttendanceDeduction()));
        r.put("advanceRecovery", money(l.getAdvanceRepayment()));
        r.put("otherDeductions", money(otherDeductions));
        r.put("totalDeductions", money(totalDeductions));
        r.put("net", money(l.getNetPay()));
        Map<String, Object> att = new LinkedHashMap<>();
        att.put("scheduledDays", num(l.getScheduledDays()));
        att.put("presentDays", num(l.getPresentDays()));
        att.put("absentDays", num(l.getAbsentDays()));
        att.put("paidLeaveDays", num(l.getPaidLeaveDays()));
        att.put("unpaidLeaveDays", num(l.getUnpaidLeaveDays()));
        att.put("lateCount", l.getLateCount() != null ? l.getLateCount() : 0);
        att.put("scheduledHours", num(l.getScheduledHours()));
        att.put("actualHours", num(l.getActualHours()));
        att.put("otHours", num(l.getApprovedOtHours()));
        // Fixed-salary staff (no shift) have no attendance to report.
        boolean tracked = nz(l.getScheduledDays()).signum() > 0 || nz(l.getActualHours()).signum() > 0
                || nz(l.getApprovedOtHours()).signum() > 0;
        r.put("attendance", tracked ? att : null);
        r.put("items", lineItems(l));
        putPayment(r, payment, l.getPaidAt() != null ? l.getPaidAt().toLocalDate() : null);
        return r;
    }

    private Map<String, Object> fromPayment(YearMonth m, SalaryPayment p, String code, Staff s) {
        Map<String, Object> r = base(m, code, s, firstNonBlank(s != null ? s.getName() : null, p.getEmployeeName()),
                s != null ? s.getDepartment() : null, s != null ? s.getRole() : null);
        r.put("source", p.getPayrollRunLineId() != null ? "payroll" : "manual");
        r.put("runId", p.getPayrollRunId());
        r.put("runStatus", null);
        r.put("status", "Paid");
        BigDecimal net = nz(p.getNetSalary());
        BigDecimal basic = BigDecimal.ZERO, allowances = BigDecimal.ZERO, overtime = BigDecimal.ZERO, commission = BigDecimal.ZERO;
        BigDecimal attendance = BigDecimal.ZERO, advance = BigDecimal.ZERO, other = BigDecimal.ZERO;
        List<Map<String, Object>> items = new ArrayList<>();
        JsonNode st = readJson(p.getSettlementJson());
        if (st != null) {
            basic = dec(st.path("basic"));
            for (JsonNode e : st.path("earnings")) {
                String label = e.path("label").asText("");
                BigDecimal amount = dec(e.path("amount"));
                if ("Overtime".equalsIgnoreCase(label)) overtime = overtime.add(amount);
                else if (label.toLowerCase(Locale.ROOT).startsWith("commission")) commission = commission.add(amount);
                else allowances = allowances.add(amount);
                items.add(item(label, amount, "earning"));
            }
            for (JsonNode d : st.path("deductions")) {
                BigDecimal amount = dec(d.path("amount"));
                switch (d.path("kind").asText("")) {
                    case "attendance" -> attendance = attendance.add(amount);
                    case "advance" -> advance = advance.add(amount);
                    default -> other = other.add(amount);
                }
                items.add(item(d.path("label").asText("Deduction"), amount, "deduction"));
            }
        }
        // Payments made before settlements were recorded only carry the net amount: report it as
        // not itemised rather than guessing a breakdown.
        BigDecimal unitemised = st == null ? net : BigDecimal.ZERO;
        BigDecimal gross = basic.add(allowances).add(overtime).add(commission).add(unitemised);
        r.put("basic", money(basic));
        r.put("unitemised", money(unitemised));
        r.put("allowances", money(allowances));
        r.put("overtime", money(overtime));
        r.put("commission", money(commission));
        r.put("gross", money(gross));
        r.put("attendanceDeduction", money(attendance));
        r.put("advanceRecovery", money(advance));
        r.put("otherDeductions", money(other));
        r.put("totalDeductions", money(attendance.add(advance).add(other)));
        r.put("net", money(net));
        r.put("netOnly", st == null);
        r.put("attendance", null);
        r.put("items", items);
        putPayment(r, p, null);
        return r;
    }

    private static Map<String, Object> base(YearMonth m, String code, Staff s, String name, String department, String designation) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("month", m.toString());
        r.put("monthLabel", m.format(LABEL));
        r.put("employeeCode", code);
        r.put("staffId", s != null ? s.getId() : null);
        r.put("name", name != null ? name : code);
        r.put("department", department != null && !department.isBlank() ? department.trim() : "Unassigned");
        r.put("designation", designation);
        return r;
    }

    private void putPayment(Map<String, Object> r, SalaryPayment p, LocalDate fallbackDate) {
        r.put("paymentId", p != null ? p.getId() : null);
        r.put("paidDate", p != null && p.getPaymentDate() != null ? p.getPaymentDate() : fallbackDate);
        r.put("paidAmount", p != null ? money(p.getNetSalary()) : BigDecimal.ZERO.setScale(2));
        r.put("methods", p != null ? methods(p) : List.of());
    }

    private List<Map<String, Object>> lineItems(PayrollRunLine l) {
        List<Map<String, Object>> items = new ArrayList<>();
        JsonNode b = readJson(l.getBreakdownJson());
        if (b != null && b.path("allowances").size() > 0) {
            for (JsonNode a : b.path("allowances")) items.add(item(a.path("name").asText("Allowance"), dec(a.path("amount")), "earning"));
        } else if (nz(l.getAllowances()).signum() > 0) {
            items.add(item("Allowances", l.getAllowances(), "earning"));
        }
        if (nz(l.getOtPay()).signum() > 0) items.add(item("Overtime", l.getOtPay(), "earning"));
        if (nz(l.getCommission()).signum() > 0) items.add(item("Commission", l.getCommission(), "earning"));
        if (nz(l.getAttendanceDeduction()).signum() > 0) items.add(item("Absence / unpaid leave", l.getAttendanceDeduction(), "deduction"));
        if (b != null) {
            for (JsonNode a : b.path("advances")) items.add(item("Advance installment", dec(a.path("amount")), "deduction"));
            for (JsonNode d : b.path("deductions")) items.add(item(d.path("type").asText("Deduction"), dec(d.path("amount")), "deduction"));
        }
        return items;
    }

    private static Map<String, Object> item(String label, BigDecimal amount, String kind) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("amount", money(amount));
        m.put("kind", kind);
        return m;
    }

    // ── Payments ────────────────────────────────────────────────────────────

    private List<Map<String, Object>> payments(java.util.Collection<SalaryPayment> payments, Map<String, Staff> staffByCode) {
        return payments.stream()
                .sorted(Comparator.comparing((SalaryPayment p) -> p.getPaymentDate() != null ? p.getPaymentDate() : LocalDate.MIN).reversed()
                        .thenComparing(SalaryPayment::getId, Comparator.reverseOrder()))
                .map(p -> {
                    Staff s = p.getEmployeeId() != null ? staffByCode.get(p.getEmployeeId()) : null;
                    YearMonth m = period(p.getMonth(), p.getYear());
                    Map<String, Object> r = new LinkedHashMap<>();
                    r.put("id", p.getId());
                    r.put("month", m != null ? m.toString() : null);
                    r.put("monthLabel", m != null ? m.format(LABEL) : p.getMonth() + " " + p.getYear());
                    r.put("employeeCode", p.getEmployeeId());
                    r.put("name", firstNonBlank(s != null ? s.getName() : null, p.getEmployeeName()));
                    r.put("department", s != null && s.getDepartment() != null && !s.getDepartment().isBlank() ? s.getDepartment().trim() : "Unassigned");
                    r.put("amount", money(p.getNetSalary()));
                    r.put("date", p.getPaymentDate());
                    r.put("methods", methods(p));
                    r.put("source", p.getPayrollRunLineId() != null ? "payroll" : "manual");
                    r.put("processedBy", p.getProcessedBy());
                    r.put("notes", p.getNotes());
                    return r;
                })
                .collect(Collectors.toList());
    }

    /** The payment's split tenders; a payment with none is one cash amount. */
    private List<Map<String, Object>> methods(SalaryPayment p) {
        List<Map<String, Object>> out = new ArrayList<>();
        JsonNode split = readJson(p.getSplitPaymentsJson());
        if (split != null && split.isArray()) {
            for (JsonNode s : split) {
                BigDecimal amount = dec(s.path("amount"));
                if (amount.signum() <= 0) continue;
                String mode = s.path("mode").asText("");
                out.add(Map.of("mode", mode.isBlank() || "null".equals(mode) ? "Other" : mode, "amount", money(amount)));
            }
        }
        if (out.isEmpty() && nz(p.getNetSalary()).signum() > 0) out.add(Map.of("mode", "Unspecified", "amount", money(p.getNetSalary())));
        return out;
    }

    // ── Advances ────────────────────────────────────────────────────────────

    private Map<String, Object> advances(YearMonth start, YearMonth end, Map<String, Staff> staffByCode) {
        List<SalaryAdvance> all = advanceRepository.findAll();
        Map<YearMonth, BigDecimal[]> monthly = new LinkedHashMap<>(); // issued, recovered
        for (YearMonth m = start; !m.isAfter(end); m = m.plusMonths(1)) monthly.put(m, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});

        BigDecimal outstanding = BigDecimal.ZERO;
        List<Map<String, Object>> open = new ArrayList<>();
        for (SalaryAdvance a : all) {
            String status = a.getStatus() != null ? a.getStatus() : "";
            boolean issued = !status.equalsIgnoreCase("Pending Approval") && !status.equalsIgnoreCase("Rejected")
                    && !"Rejected".equalsIgnoreCase(a.getApprovalStatus());
            if (!issued) continue;
            LocalDate when = a.getApprovedDate() != null ? a.getApprovedDate() : a.getRequestDate();
            BigDecimal[] v = when != null ? monthly.get(YearMonth.from(when)) : null;
            if (v != null) v[0] = v[0].add(nz(a.getApprovedAmount()));
            if (nz(a.getBalance()).signum() > 0) {
                outstanding = outstanding.add(a.getBalance());
                Staff s = a.getEmployeeId() != null ? staffByCode.get(a.getEmployeeId()) : null;
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("id", a.getId());
                r.put("employeeCode", a.getEmployeeId());
                r.put("name", firstNonBlank(s != null ? s.getName() : null, a.getEmployeeName()));
                r.put("department", firstNonBlank(s != null ? s.getDepartment() : null, a.getDepartment(), "Unassigned"));
                r.put("type", a.getAdvanceType());
                r.put("approved", money(a.getApprovedAmount()));
                r.put("recovered", money(a.getTotalDeducted()));
                r.put("balance", money(a.getBalance()));
                r.put("installment", money(a.getInstallmentAmount()));
                r.put("installments", a.getInstallmentCount());
                r.put("issuedOn", when);
                r.put("nextDeduction", a.getNextDeductionDate());
                r.put("status", a.getStatus());
                open.add(r);
            }
        }
        for (AdvanceRepayment rp : repaymentRepository.findAll()) {
            if (rp.getPeriodMonth() == null || !"Processed".equalsIgnoreCase(rp.getStatus())) continue;
            BigDecimal[] v = monthly.get(YearMonth.from(rp.getPeriodMonth()));
            if (v != null) v[1] = v[1].add(nz(rp.getAmount()));
        }
        open.sort(Comparator.comparing((Map<String, Object> r) -> (BigDecimal) r.get("balance")).reversed());
        List<Map<String, Object>> months = new ArrayList<>();
        monthly.forEach((m, v) -> months.add(Map.of("month", m.toString(), "label", m.format(LABEL),
                "issued", money(v[0]), "recovered", money(v[1]))));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("outstanding", money(outstanding));
        out.put("openCount", open.size());
        out.put("open", open);
        out.put("monthly", months);
        return out;
    }

    // ── Staff ───────────────────────────────────────────────────────────────

    private static Map<String, Object> staffSummary(List<Staff> staff, YearMonth start, YearMonth end) {
        List<Staff> active = staff.stream()
                .filter(s -> s.getStatus() == null || !"inactive".equalsIgnoreCase(s.getStatus()))
                .toList();
        Map<String, BigDecimal[]> byDept = new LinkedHashMap<>(); // count, base
        BigDecimal base = BigDecimal.ZERO;
        int joined = 0;
        for (Staff s : active) {
            String dept = s.getDepartment() != null && !s.getDepartment().isBlank() ? s.getDepartment().trim() : "Unassigned";
            BigDecimal[] v = byDept.computeIfAbsent(dept, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            v[0] = v[0].add(BigDecimal.ONE);
            v[1] = v[1].add(nz(s.getBaseSalary()));
            base = base.add(nz(s.getBaseSalary()));
            if (s.getJoinDate() != null) {
                YearMonth j = YearMonth.from(s.getJoinDate());
                if (!j.isBefore(start) && !j.isAfter(end)) joined++;
            }
        }
        List<Map<String, Object>> departments = new ArrayList<>();
        byDept.forEach((d, v) -> departments.add(Map.of("department", d, "count", v[0].intValue(), "baseSalary", money(v[1]))));
        departments.sort(Comparator.comparing((Map<String, Object> r) -> (BigDecimal) r.get("baseSalary")).reversed());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("active", active.size());
        out.put("monthlyBase", money(base));
        out.put("joinedInRange", joined);
        out.put("departments", departments);
        return out;
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private static String code(Staff s) {
        return s.getStaffId() != null && !s.getStaffId().isBlank() ? s.getStaffId() : String.valueOf(s.getId());
    }

    /** Salary payments store the month by name ("October"); tolerate short names too. */
    static YearMonth period(String month, Integer year) {
        if (month == null || year == null || month.isBlank()) return null;
        String m = month.trim().toLowerCase(Locale.ROOT);
        for (Month candidate : Month.values()) {
            String full = candidate.getDisplayName(TextStyle.FULL, Locale.ENGLISH).toLowerCase(Locale.ROOT);
            if (full.equals(m) || (m.length() >= 3 && full.startsWith(m))) return YearMonth.of(year, candidate);
        }
        try {
            return YearMonth.of(year, Integer.parseInt(m));
        } catch (Exception e) {
            return null;
        }
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) if (v != null && !v.isBlank()) return v.trim();
        return null;
    }

    private JsonNode readJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }

    private static BigDecimal dec(JsonNode n) {
        if (n == null || n.isMissingNode() || n.isNull()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(n.asText("0"));
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static BigDecimal money(BigDecimal v) {
        return nz(v).setScale(2, RoundingMode.HALF_UP);
    }

    private static double num(BigDecimal v) {
        return nz(v).doubleValue();
    }
}
