package com.company.project.services;

import com.company.project.dto.SalaryPaymentEmployeeRequestDTO;
import com.company.project.dto.SalaryPaymentEmployeeResponseDTO;
import com.company.project.dto.SalaryPaymentRequestDTO;
import com.company.project.dto.SalaryPaymentResponseDTO;
import com.company.project.dto.SplitPaymentDTO;
import com.company.project.entities.SalaryPayment;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.entities.SalaryPaymentEmployee;
import com.company.project.entities.Staff;
import com.company.project.repositories.SalaryPaymentEmployeeRepository;
import com.company.project.repositories.SalaryPaymentRepository;
import com.company.project.repositories.StaffRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class SalaryPaymentService {

    private final SalaryPaymentEmployeeRepository employeeRepository;
    private final SalaryPaymentRepository paymentRepository;
    private final StaffRepository staffRepository;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;
    private final FinancialEventService financialEventService;
    private final PaymentVoucherService paymentVoucherService;
    private final com.company.project.repositories.PaymentVoucherRepository paymentVoucherRepository;
    private final PayrollRunService payrollRuns;
    private final com.company.project.repositories.PayrollRunRepository payrollRunRepository;
    private final com.company.project.repositories.PayrollRunLineRepository payrollLineRepository;
    private final AdvancesDeductionsService advancesDeductions;
    private final CommissionEarningService commissions;

    public SalaryPaymentService(SalaryPaymentEmployeeRepository employeeRepository,
                                SalaryPaymentRepository paymentRepository,
                                StaffRepository staffRepository,
                                ObjectMapper objectMapper,
                                NotificationService notificationService,
                                FinancialEventService financialEventService,
                                PaymentVoucherService paymentVoucherService,
                                com.company.project.repositories.PaymentVoucherRepository paymentVoucherRepository,
                                PayrollRunService payrollRuns,
                                com.company.project.repositories.PayrollRunRepository payrollRunRepository,
                                com.company.project.repositories.PayrollRunLineRepository payrollLineRepository,
                                AdvancesDeductionsService advancesDeductions,
                                CommissionEarningService commissions) {
        this.employeeRepository    = employeeRepository;
        this.paymentRepository     = paymentRepository;
        this.staffRepository       = staffRepository;
        this.objectMapper          = objectMapper;
        this.notificationService   = notificationService;
        this.financialEventService = financialEventService;
        this.paymentVoucherService = paymentVoucherService;
        this.paymentVoucherRepository = paymentVoucherRepository;
        this.payrollRuns = payrollRuns;
        this.payrollRunRepository = payrollRunRepository;
        this.payrollLineRepository = payrollLineRepository;
        this.advancesDeductions = advancesDeductions;
        this.commissions = commissions;
    }

    /**
     * Every active staff member with their payment status for one month (default: the current
     * month): Paid when a salary payment exists for that month, otherwise Pending (or On Hold if set).
     * The status used to live on the employee record and stayed "Paid" forever after one payment.
     * When the month has an approved payroll run, each employee on it shows their payroll pay
     * (net, gross and deductions) and is Paid once their payroll line is paid. Everyone else (no
     * payroll for the month) gets the month's items — allowances, approved commission, due advance
     * installments and deductions — which a payment then settles (see createPayment).
     */
    public List<SalaryPaymentEmployeeResponseDTO> getEmployees(String search, String department, String status,
                                                               String month, Integer year) {
        LocalDate today = LocalDate.now();
        String periodMonth = month != null && !month.isBlank() ? month.trim()
                : today.getMonth().getDisplayName(java.time.format.TextStyle.FULL, Locale.ENGLISH);
        int periodYear = year != null ? year : today.getYear();
        Map<String, SalaryPayment> paymentThisPeriod = paymentRepository.findAll().stream()
                .filter(p -> p.getEmployeeId() != null && periodMonth.equalsIgnoreCase(p.getMonth())
                        && p.getYear() != null && p.getYear() == periodYear
                        && (p.getStatus() == null || "Paid".equalsIgnoreCase(p.getStatus())))
                .collect(Collectors.toMap(SalaryPayment::getEmployeeId, Function.identity(),
                        (a, b) -> a.getId() > b.getId() ? a : b));
        java.util.Set<String> paidThisPeriod = paymentThisPeriod.keySet();
        java.time.YearMonth period = parsePeriod(periodMonth, periodYear);
        com.company.project.entities.PayrollRun run = period != null ? payrollRuns.runFor(period) : null;
        Map<String, com.company.project.entities.PayrollRunLine> lineByCode = PayrollRunService.payable(run)
                ? payrollRuns.lines(run.getId()).stream().filter(l -> l.getEmployeeCode() != null)
                        .collect(Collectors.toMap(com.company.project.entities.PayrollRunLine::getEmployeeCode, Function.identity(), (a, b) -> a))
                : Map.of();
        ManualContext manual = period != null ? manualContext(period) : null;
        boolean payrollUsed = payrollRunRepository.count() > 0;
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        boolean hasSearch = !normalizedSearch.isBlank();
        boolean filterDepartment = department != null && !department.isBlank() && !department.equalsIgnoreCase("all");
        boolean filterStatus = status != null && !status.isBlank() && !status.equalsIgnoreCase("all");

        List<Staff> staff = staffRepository.findAll(Sort.by("name"));
        List<Staff> filteredStaff = staff.stream()
                .filter(s -> {
                    if (!hasSearch) return true;
                    return (s.getName() != null && s.getName().toLowerCase(Locale.ROOT).contains(normalizedSearch))
                            || (s.getStaffId() != null && s.getStaffId().toLowerCase(Locale.ROOT).contains(normalizedSearch));
                })
                .filter(s -> !filterDepartment || (s.getDepartment() != null && s.getDepartment().equalsIgnoreCase(department)))
                .collect(Collectors.toList());

        // Every active staff member is listed; those already paid through this page have a payroll
        // record (created on their first payment) that carries their status and last payment. Before,
        // as soon as one record existed only staff with a record were listed and the rest vanished.
        Map<String, SalaryPaymentEmployee> records = employeeRepository.findAll().stream()
                .filter(e -> e.getEmployeeId() != null)
                .collect(Collectors.toMap(SalaryPaymentEmployee::getEmployeeId, Function.identity(), (a, b) -> a));
        Map<String, Staff> staffByCode = filteredStaff.stream()
                .collect(Collectors.toMap(s -> s.getStaffId() != null ? s.getStaffId() : String.valueOf(s.getId()), Function.identity(), (a, b) -> a));

        return filteredStaff.stream()
                .filter(s -> s.getStatus() == null || !"inactive".equalsIgnoreCase(s.getStatus()))
                .map(s -> {
                    SalaryPaymentEmployee record = s.getStaffId() != null ? records.get(s.getStaffId()) : null;
                    SalaryPaymentEmployeeResponseDTO dto = record == null ? fromStaff(s) : SalaryPaymentEmployeeResponseDTO.fromEntity(record);
                    boolean paid = s.getStaffId() != null && paidThisPeriod.contains(s.getStaffId());
                    dto.setPaymentStatus(paid ? "Paid"
                            : record != null && "On Hold".equalsIgnoreCase(record.getPaymentStatus()) ? "On Hold" : "Pending");
                    if (record == null) return dto;
                    // the staff record is the source of truth for who they are and their basic salary
                    dto.setEmployeeName(s.getName());
                    dto.setDepartment(s.getDepartment());
                    dto.setDesignation(s.getRole());
                    if (s.getBaseSalary() != null && s.getBaseSalary().signum() > 0) {
                        BigDecimal allowances = dto.getAllowances() != null ? dto.getAllowances() : BigDecimal.ZERO;
                        BigDecimal deductions = dto.getDeductions() != null ? dto.getDeductions() : BigDecimal.ZERO;
                        dto.setBaseSalary(s.getBaseSalary());
                        dto.setNetSalary(s.getBaseSalary().add(allowances).subtract(deductions));
                    }
                    return dto;
                })
                .map(dto -> withPayroll(dto, run, lineByCode.get(dto.getEmployeeId())))
                .map(dto -> {
                    dto.setPayrollUsed(payrollUsed);
                    return withManualItems(dto, staffByCode.get(dto.getEmployeeId()), records.get(dto.getEmployeeId()), manual, run);
                })
                .map(dto -> withPaidAmounts(dto, paymentThisPeriod.get(dto.getEmployeeId())))
                .filter(dto -> !filterStatus || (dto.getPaymentStatus() != null && dto.getPaymentStatus().equalsIgnoreCase(status)))
                .collect(Collectors.toList());
    }

    private static SalaryPaymentEmployeeResponseDTO withPayroll(SalaryPaymentEmployeeResponseDTO dto,
                                                                com.company.project.entities.PayrollRun run,
                                                                com.company.project.entities.PayrollRunLine line) {
        if (run == null) return dto;
        dto.setPayrollRunId(run.getId());
        dto.setPayrollRunStatus(run.getStatus());
        if (line == null) return dto;
        dto.setPayrollRunLineId(line.getId());
        dto.setBaseSalary(line.getBasicSalary());
        dto.setGrossPay(line.getGrossPay());
        dto.setAllowances(line.getGrossPay().subtract(line.getBasicSalary()));
        dto.setDeductions(line.getAttendanceDeduction().add(line.getAdvanceRepayment()).add(line.getOtherDeductions()));
        dto.setNetSalary(line.getNetPay());
        dto.setPaymentStatus(line.getPaidAt() != null ? "Paid" : "Pending");
        return dto;
    }

    /** "October" + 2026 -> 2026-10 (null if the month name isn't recognised). */
    private static java.time.YearMonth parsePeriod(String month, Integer year) {
        if (month == null || year == null) return null;
        try {
            return java.time.YearMonth.of(year, java.time.Month.valueOf(month.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * The approved payroll line this payment settles: the one asked for, or the employee's line on
     * the month's approved run. Null for a manual payment (no run, or not on it). A month whose
     * payroll is still a draft can't be paid for employees on it — it would be paid twice later.
     */
    private com.company.project.entities.PayrollRunLine resolvePayrollLine(SalaryPaymentRequestDTO req) {
        if (req.getPayrollRunLineId() != null) {
            com.company.project.entities.PayrollRunLine line = payrollLineRepository.findById(req.getPayrollRunLineId())
                    .orElseThrow(() -> new RuntimeException("Payroll line not found"));
            if (req.getEmployeeId() != null && !req.getEmployeeId().equals(line.getEmployeeCode())) {
                throw new BusinessRuleViolationException("That payroll line belongs to another employee");
            }
            return line;
        }
        java.time.YearMonth period = parsePeriod(req.getMonth(), req.getYear());
        com.company.project.entities.PayrollRun run = period != null ? payrollRuns.runFor(period) : null;
        if (run == null) return null;
        com.company.project.entities.PayrollRunLine line = payrollRuns.lines(run.getId()).stream()
                .filter(l -> req.getEmployeeId() != null && req.getEmployeeId().equals(l.getEmployeeCode()))
                .findFirst().orElse(null);
        if (line != null && !PayrollRunService.payable(run)) {
            throw new BusinessRuleViolationException("Payroll for " + req.getMonth() + " " + req.getYear()
                    + " is still a draft. Approve it in Payroll first, or delete the draft to pay manually.");
        }
        return line;
    }

    // ── Paying without payroll ───────────────────────────────────────────────

    /** What's due in a month, loaded once per request. */
    private record ManualContext(Map<String, List<Map<String, Object>>> advances,
                                 Map<Long, List<Map<String, Object>>> deductions,
                                 Map<Long, Map<String, BigDecimal>> commission) {}

    private ManualContext manualContext(java.time.YearMonth period) {
        return new ManualContext(advancesDeductions.dueForPeriod(period), advancesDeductions.deductionsForPeriod(period),
                commissions.approvedForPeriod(period));
    }

    /** Basic salary: the staff record, else the old Salary Payments record. */
    private static BigDecimal staffBasic(Staff s, SalaryPaymentEmployee record) {
        BigDecimal basic = s.getBaseSalary() != null && s.getBaseSalary().signum() > 0 ? s.getBaseSalary()
                : record != null && record.getBaseSalary() != null ? record.getBaseSalary() : BigDecimal.ZERO;
        return money(basic);
    }

    /**
     * The month's items for a payment made without payroll, each with a key the client sends back:
     * allowance:<name> and commission (earnings); advance:<id>, deduction:<id> and fixed-deduction.
     */
    private List<Map<String, Object>> manualItems(Staff s, SalaryPaymentEmployee record, BigDecimal basic, ManualContext ctx) {
        List<Map<String, Object>> items = new ArrayList<>();
        List<Map<String, Object>> allowances = payrollRuns.allowances(s, basic);
        if (allowances.isEmpty() && record != null && record.getAllowances() != null && record.getAllowances().signum() > 0) {
            items.add(manualItem("allowance:Allowances", "earning", "Allowances", record.getAllowances(), null));
        }
        for (Map<String, Object> a : allowances) {
            items.add(manualItem("allowance:" + a.get("name"), "earning", String.valueOf(a.get("name")), (BigDecimal) a.get("amount"), null));
        }
        BigDecimal commission = ctx.commission().getOrDefault(s.getId(), Map.of()).values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (commission.signum() > 0) items.add(manualItem("commission", "earning", "Commission (approved)", commission, null));
        String code = s.getStaffId() != null ? s.getStaffId() : String.valueOf(s.getId());
        for (Map<String, Object> a : ctx.advances().getOrDefault(code, List.of())) {
            Object n = a.get("installment_no"), of = a.get("installments");
            String label = "Advance installment" + (n != null ? " " + n + (of != null ? " of " + of : "") : "")
                    + (a.get("advance_type") != null ? " (" + a.get("advance_type") + ")" : "");
            items.add(manualItem("advance:" + a.get("advance_id"), "advance", label, (BigDecimal) a.get("amount"), (Long) a.get("advance_id")));
        }
        for (Map<String, Object> d : ctx.deductions().getOrDefault(s.getId(), List.of())) {
            Object reason = d.get("reason");
            String label = d.get("type") + (reason != null && !String.valueOf(reason).isBlank() ? " — " + reason : "");
            items.add(manualItem("deduction:" + d.get("deduction_id"), "deduction", label, (BigDecimal) d.get("amount"), (Long) d.get("deduction_id")));
        }
        if (record != null && record.getDeductions() != null && record.getDeductions().signum() > 0) {
            items.add(manualItem("fixed-deduction", "fixed", "Fixed deduction", record.getDeductions(), null));
        }
        return items;
    }

    private static Map<String, Object> manualItem(String key, String kind, String label, BigDecimal amount, Long refId) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("key", key);
        m.put("kind", kind);
        m.put("label", label);
        m.put("amount", money(amount));
        m.put("ref_id", refId);
        return m;
    }

    /** Sum of the earning items (true) or the deduction items (false). */
    private static BigDecimal total(List<Map<String, Object>> items, boolean earnings) {
        return items.stream().filter(i -> "earning".equals(i.get("kind")) == earnings)
                .map(i -> (BigDecimal) i.get("amount")).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Employees paid without payroll this month: show the month's items and the net they come to. */
    private SalaryPaymentEmployeeResponseDTO withManualItems(SalaryPaymentEmployeeResponseDTO dto, Staff s,
                                                             SalaryPaymentEmployee record, ManualContext ctx,
                                                             com.company.project.entities.PayrollRun run) {
        if (s == null || ctx == null || dto.getPayrollRunLineId() != null) return dto;
        if (run != null && "Draft".equals(run.getStatus())) return dto;
        if ("Paid".equalsIgnoreCase(dto.getPaymentStatus())) return dto;
        BigDecimal basic = staffBasic(s, record);
        List<Map<String, Object>> items = manualItems(s, record, basic, ctx);
        BigDecimal earnings = total(items, true);
        BigDecimal deductions = total(items, false);
        dto.setBaseSalary(basic);
        dto.setAllowances(earnings);
        dto.setDeductions(deductions);
        dto.setNetSalary(basic.add(earnings).subtract(deductions).max(BigDecimal.ZERO));
        dto.setItems(items);
        return dto;
    }

    /** Paid without payroll: show what the payment actually covered, not today's salary setup. */
    private SalaryPaymentEmployeeResponseDTO withPaidAmounts(SalaryPaymentEmployeeResponseDTO dto, SalaryPayment payment) {
        if (payment == null || dto.getPayrollRunLineId() != null || !"Paid".equalsIgnoreCase(dto.getPaymentStatus())) return dto;
        com.fasterxml.jackson.databind.JsonNode s = readJson(payment.getSettlementJson());
        if (s != null) {
            BigDecimal basic = new BigDecimal(s.path("basic").asText("0"));
            BigDecimal gross = new BigDecimal(s.path("gross").asText("0"));
            dto.setBaseSalary(basic);
            dto.setAllowances(gross.subtract(basic));
            dto.setDeductions(new BigDecimal(s.path("total_deductions").asText("0")));
        }
        dto.setNetSalary(payment.getNetSalary());
        dto.setLastPaymentDate(payment.getPaymentDate());
        return dto;
    }

    /** Records the advance installments, deductions and commission a manual payment covered. */
    private void settleManualItems(List<Map<String, Object>> chosen, java.time.YearMonth period, Staff payee, SalaryPayment payment) {
        String note = "Salary " + payment.getMonth() + " " + payment.getYear();
        for (Map<String, Object> item : chosen) {
            Long refId = (Long) item.get("ref_id");
            switch (String.valueOf(item.get("kind"))) {
                case "advance" -> advancesDeductions.recordRepayment(refId, period.atDay(1), (BigDecimal) item.get("amount"),
                        "salary_payment", null, note);
                case "deduction" -> advancesDeductions.markDeductionApplied(refId, period);
                default -> {
                    if ("commission".equals(item.get("key"))) commissions.markPaidBySalaryPayment(period, payee.getId());
                }
            }
        }
    }

    private static Map<String, Object> manualSettlement(BigDecimal basic, List<Map<String, Object>> chosen,
                                                        BigDecimal extraAllowance, BigDecimal extraDeduction, BigDecimal net) {
        List<Map<String, Object>> earnings = new ArrayList<>();
        List<Map<String, Object>> deductions = new ArrayList<>();
        for (Map<String, Object> i : chosen) {
            ("earning".equals(i.get("kind")) ? earnings : deductions).add(settleRow(String.valueOf(i.get("label")),
                    (BigDecimal) i.get("amount"), String.valueOf(i.get("kind")), (Long) i.get("ref_id")));
        }
        if (extraAllowance.signum() > 0) earnings.add(settleRow("Other allowance", extraAllowance, "other", null));
        if (extraDeduction.signum() > 0) deductions.add(settleRow("Other deduction", extraDeduction, "other", null));
        return settlementMap("manual", basic, earnings, deductions, net);
    }

    /** The payroll line's pay, in the same shape as a manual settlement. */
    private Map<String, Object> settlementFromLine(com.company.project.entities.PayrollRunLine l) {
        com.fasterxml.jackson.databind.JsonNode b = readJson(l.getBreakdownJson());
        List<Map<String, Object>> earnings = new ArrayList<>();
        List<Map<String, Object>> deductions = new ArrayList<>();
        if (b != null && b.path("allowances").size() > 0) {
            for (com.fasterxml.jackson.databind.JsonNode a : b.path("allowances")) {
                earnings.add(settleRow(a.path("name").asText("Allowance"), new BigDecimal(a.path("amount").asText("0")), "earning", null));
            }
        } else if (l.getAllowances() != null && l.getAllowances().signum() > 0) {
            earnings.add(settleRow("Allowances", l.getAllowances(), "earning", null));
        }
        if (l.getOtPay() != null && l.getOtPay().signum() > 0) earnings.add(settleRow("Overtime", l.getOtPay(), "earning", null));
        if (l.getCommission() != null && l.getCommission().signum() > 0) earnings.add(settleRow("Commission", l.getCommission(), "earning", null));
        if (l.getAttendanceDeduction() != null && l.getAttendanceDeduction().signum() > 0) {
            deductions.add(settleRow("Absence / unpaid leave", l.getAttendanceDeduction(), "attendance", null));
        }
        if (b != null) {
            for (com.fasterxml.jackson.databind.JsonNode a : b.path("advances")) {
                deductions.add(settleRow("Advance installment " + a.path("installment_no").asText("") + " of " + a.path("installments").asText(""),
                        new BigDecimal(a.path("amount").asText("0")), "advance", a.path("advance_id").asLong()));
            }
            for (com.fasterxml.jackson.databind.JsonNode d : b.path("deductions")) {
                String reason = d.path("reason").asText("");
                deductions.add(settleRow(d.path("type").asText("Deduction") + (reason.isBlank() || "null".equals(reason) ? "" : " — " + reason),
                        new BigDecimal(d.path("amount").asText("0")), "deduction", d.path("deduction_id").asLong()));
            }
        }
        return settlementMap("payroll", money(l.getBasicSalary()), earnings, deductions, money(l.getNetPay()));
    }

    private static Map<String, Object> settleRow(String label, BigDecimal amount, String kind, Long refId) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("label", label);
        m.put("amount", money(amount));
        m.put("kind", kind);
        m.put("ref_id", refId);
        return m;
    }

    private static Map<String, Object> settlementMap(String source, BigDecimal basic, List<Map<String, Object>> earnings,
                                                     List<Map<String, Object>> deductions, BigDecimal net) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("source", source);
        m.put("basic", basic);
        m.put("earnings", earnings);
        m.put("deductions", deductions);
        m.put("gross", basic.add(earnings.stream().map(e -> (BigDecimal) e.get("amount")).reduce(BigDecimal.ZERO, BigDecimal::add)));
        m.put("total_deductions", deductions.stream().map(e -> (BigDecimal) e.get("amount")).reduce(BigDecimal.ZERO, BigDecimal::add));
        m.put("net", net);
        return m;
    }

    private static BigDecimal money(BigDecimal v) {
        return (v != null ? v : BigDecimal.ZERO).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private com.fasterxml.jackson.databind.JsonNode readJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }

    private String writeJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return null;
        }
    }

    public SalaryPaymentEmployeeResponseDTO createEmployee(SalaryPaymentEmployeeRequestDTO req) {
        SalaryPaymentEmployee e = new SalaryPaymentEmployee();
        e.setEmployeeId(req.getEmployeeId());
        e.setEmployeeName(req.getEmployeeName());
        e.setDepartment(req.getDepartment());
        e.setDesignation(req.getDesignation());
        e.setBaseSalary(req.getBaseSalary() != null ? req.getBaseSalary() : BigDecimal.ZERO);
        e.setAllowances(req.getAllowances() != null ? req.getAllowances() : BigDecimal.ZERO);
        e.setDeductions(req.getDeductions() != null ? req.getDeductions() : BigDecimal.ZERO);
        e.setNetSalary(req.getNetSalary() != null ? req.getNetSalary() : BigDecimal.ZERO);
        e.setPaymentStatus(req.getPaymentStatus() != null ? req.getPaymentStatus() : "Pending");
        e.setBankAccount(req.getBankAccount());
        e.setEmail(req.getEmail());
        return SalaryPaymentEmployeeResponseDTO.fromEntity(employeeRepository.save(e));
    }

    public SalaryPaymentEmployeeResponseDTO updateEmployee(Long id, SalaryPaymentEmployeeRequestDTO req) {
        SalaryPaymentEmployee e = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + id));
        if (req.getEmployeeId() != null) e.setEmployeeId(req.getEmployeeId());
        if (req.getEmployeeName() != null) e.setEmployeeName(req.getEmployeeName());
        if (req.getDepartment() != null) e.setDepartment(req.getDepartment());
        if (req.getDesignation() != null) e.setDesignation(req.getDesignation());
        if (req.getBaseSalary() != null) e.setBaseSalary(req.getBaseSalary());
        if (req.getAllowances() != null) e.setAllowances(req.getAllowances());
        if (req.getDeductions() != null) e.setDeductions(req.getDeductions());
        if (req.getNetSalary() != null) e.setNetSalary(req.getNetSalary());
        if (req.getPaymentStatus() != null) e.setPaymentStatus(req.getPaymentStatus());
        if (req.getBankAccount() != null) e.setBankAccount(req.getBankAccount());
        if (req.getEmail() != null) e.setEmail(req.getEmail());
        return SalaryPaymentEmployeeResponseDTO.fromEntity(employeeRepository.save(e));
    }

    public List<SalaryPaymentResponseDTO> getPayments(String employeeId, String month, Integer year) {
        List<SalaryPayment> payments = paymentRepository.findAll(Sort.by(Sort.Direction.DESC, "paymentDate"));
        // Each payment raised a voucher whose bill no is SAL-<employee>-<month>-<year>; match on that + amount.
        Map<String, String> voucherNos = new java.util.HashMap<>();
        paymentVoucherRepository.findByBillNoStartingWith("SAL-").stream()
                .sorted(java.util.Comparator.comparing(com.company.project.entities.PaymentVoucher::getId))
                .forEach(v -> voucherNos.put(voucherKey(v.getBillNo(), v.getAmount()), v.getVoucherNo()));
        return payments.stream()
                .filter(p -> employeeId == null || employeeId.isBlank() || employeeId.equalsIgnoreCase(p.getEmployeeId()))
                .filter(p -> month == null || month.isBlank() || month.equalsIgnoreCase(p.getMonth()))
                .filter(p -> year == null || p.getYear() == null || p.getYear().equals(year))
                .map(p -> {
                    SalaryPaymentResponseDTO dto = SalaryPaymentResponseDTO.fromEntity(p, parseSplitPayments(p.getSplitPaymentsJson()));
                    dto.setVoucherNo(voucherNos.get(voucherKey(salaryBillNo(p), p.getNetSalary())));
                    dto.setSettlement(readJson(p.getSettlementJson()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private static String salaryBillNo(SalaryPayment p) {
        return "SAL-" + p.getEmployeeId() + "-" + p.getMonth() + "-" + p.getYear();
    }

    private static String voucherKey(String billNo, BigDecimal amount) {
        return billNo + "|" + (amount != null ? amount.stripTrailingZeros().toPlainString() : "0");
    }

    public SalaryPaymentResponseDTO createPayment(SalaryPaymentRequestDTO req) {
        com.company.project.entities.PayrollRunLine payrollLine = resolvePayrollLine(req);
        if (payrollLine != null) {
            com.company.project.entities.PayrollRun run = payrollRunRepository.findById(payrollLine.getRunId())
                    .orElseThrow(() -> new RuntimeException("Payroll run not found"));
            if (!PayrollRunService.payable(run)) {
                throw new BusinessRuleViolationException("Approve this payroll in Payroll before paying it");
            }
            if (payrollLine.getPaidAt() != null) {
                throw new BusinessRuleViolationException(payrollLine.getEmployeeName() + " has already been paid for "
                        + java.time.YearMonth.of(run.getPeriodYear(), run.getPeriodMonth()).getMonth()
                                .getDisplayName(java.time.format.TextStyle.FULL, Locale.ENGLISH) + " " + run.getPeriodYear());
            }
            // the payroll decides the period and the amount
            req.setMonth(java.time.Month.of(run.getPeriodMonth()).getDisplayName(java.time.format.TextStyle.FULL, Locale.ENGLISH));
            req.setYear(run.getPeriodYear());
            if (req.getNetSalary() == null) {
                req.setNetSalary(payrollLine.getNetPay());
            } else if (req.getNetSalary().subtract(payrollLine.getNetPay()).abs().compareTo(new BigDecimal("0.01")) > 0) {
                throw new BusinessRuleViolationException(payrollLine.getEmployeeName() + "'s net pay on the approved payroll is "
                        + payrollLine.getNetPay().toPlainString() + ". Pay that amount, or reopen the payroll to change it.");
            }
        }
        // Without payroll: settle the items chosen from the month's list (see getEmployees).
        java.time.YearMonth manualPeriod = null;
        Staff manualPayee = null;
        List<Map<String, Object>> manualChosen = List.of();
        Map<String, Object> settlement = payrollLine != null ? settlementFromLine(payrollLine) : null;
        if (payrollLine == null && Boolean.TRUE.equals(req.getApplyItems())) {
            manualPeriod = parsePeriod(req.getMonth(), req.getYear());
            manualPayee = staffRepository.findByStaffId(req.getEmployeeId()).orElse(null);
            if (manualPeriod == null) throw new BusinessRuleViolationException("Choose the salary month to pay");
            if (manualPayee == null) throw new BusinessRuleViolationException("Employee not found: " + req.getEmployeeId());
            final String periodMonth = req.getMonth();
            final Integer periodYear = req.getYear();
            boolean alreadyPaid = paymentRepository.findAll().stream()
                    .anyMatch(p -> req.getEmployeeId().equals(p.getEmployeeId()) && periodMonth.equalsIgnoreCase(p.getMonth())
                            && periodYear.equals(p.getYear()) && (p.getStatus() == null || "Paid".equalsIgnoreCase(p.getStatus())));
            if (alreadyPaid) {
                throw new BusinessRuleViolationException(manualPayee.getName() + " has already been paid for " + periodMonth + " " + periodYear);
            }
            SalaryPaymentEmployee rec = employeeRepository.findByEmployeeId(req.getEmployeeId()).orElse(null);
            BigDecimal basic = staffBasic(manualPayee, rec);
            Map<String, Map<String, Object>> available = new java.util.LinkedHashMap<>();
            for (Map<String, Object> item : manualItems(manualPayee, rec, basic, manualContext(manualPeriod))) {
                available.putIfAbsent((String) item.get("key"), item);
            }
            List<Map<String, Object>> chosen = new ArrayList<>();
            for (String key : req.getItemKeys() != null ? new java.util.LinkedHashSet<>(req.getItemKeys()) : java.util.Set.<String>of()) {
                Map<String, Object> item = available.get(key);
                if (item == null) {
                    throw new BusinessRuleViolationException("An allowance, advance installment, deduction or commission for "
                            + manualPayee.getName() + " has changed since the page was loaded. Reload and try again.");
                }
                chosen.add(item);
            }
            BigDecimal extraAllowance = money(req.getExtraAllowance());
            BigDecimal extraDeduction = money(req.getExtraDeduction());
            if (extraAllowance.signum() < 0 || extraDeduction.signum() < 0) {
                throw new BusinessRuleViolationException("Other allowance and other deduction can't be negative");
            }
            BigDecimal net = basic.add(total(chosen, true)).add(extraAllowance)
                    .subtract(total(chosen, false)).subtract(extraDeduction).max(BigDecimal.ZERO);
            if (req.getNetSalary() == null) {
                req.setNetSalary(net);
            } else if (req.getNetSalary().subtract(net).abs().compareTo(new BigDecimal("0.01")) > 0) {
                throw new BusinessRuleViolationException("Net salary for the selected items is " + net.toPlainString()
                        + ", not " + req.getNetSalary().toPlainString());
            }
            manualChosen = chosen;
            settlement = manualSettlement(basic, chosen, extraAllowance, extraDeduction, net);
        }

        SalaryPaymentEmployee employee = employeeRepository.findByEmployeeId(req.getEmployeeId())
                .orElseGet(() -> {
                    Staff staff = staffRepository.findByStaffId(req.getEmployeeId()).orElse(null);
                    if (staff == null) {
                        throw new RuntimeException("Employee not found with employeeId: " + req.getEmployeeId());
                    }
                    SalaryPaymentEmployee created = new SalaryPaymentEmployee();
                    created.setEmployeeId(staff.getStaffId());
                    created.setEmployeeName(staff.getName());
                    created.setDepartment(staff.getDepartment());
                    created.setDesignation(staff.getRole());
                    BigDecimal baseSalary = staff.getBaseSalary() != null ? staff.getBaseSalary()
                            : (req.getNetSalary() != null ? req.getNetSalary() : BigDecimal.ZERO);
                    created.setBaseSalary(baseSalary);
                    created.setAllowances(BigDecimal.ZERO);
                    created.setDeductions(BigDecimal.ZERO);
                    created.setNetSalary(req.getNetSalary() != null ? req.getNetSalary() : baseSalary);
                    created.setPaymentStatus("Pending");
                    created.setEmail(staff.getEmail());
                    return employeeRepository.save(created);
                });

        SalaryPayment payment = new SalaryPayment();
        payment.setEmployeeId(req.getEmployeeId());
        payment.setEmployeeName(req.getEmployeeName() != null ? req.getEmployeeName() : employee.getEmployeeName());
        payment.setMonth(req.getMonth());
        payment.setYear(req.getYear());
        payment.setNetSalary(req.getNetSalary() != null ? req.getNetSalary() : employee.getNetSalary());
        payment.setPaymentDate(req.getPaymentDate() != null ? req.getPaymentDate() : LocalDate.now());
        payment.setNotes(req.getNotes());
        payment.setProcessedBy(req.getProcessedBy() != null ? req.getProcessedBy() : "HR Manager");
        payment.setStatus("Paid");
        payment.setSplitPaymentsJson(toSplitJson(req.getSplitPayments()));
        if (payrollLine != null) {
            payment.setPayrollRunId(payrollLine.getRunId());
            payment.setPayrollRunLineId(payrollLine.getId());
        }
        payment.setSettlementJson(writeJson(settlement));
        payment = paymentRepository.save(payment);

        employee.setPaymentStatus("Paid");
        employee.setLastPaymentDate(payment.getPaymentDate());
        employeeRepository.save(employee);

        // Create payment voucher document for UI display
        com.company.project.entities.PaymentVoucher voucher = paymentVoucherService.createPaymentVoucherFromModule(
                payment.getEmployeeName(),
                "Employee",
                salaryBillNo(payment),
                payment.getNetSalary(),
                resolvePrimaryPaymentMethod(req.getSplitPayments()),
                "Salary: " + payment.getEmployeeName() + " – " + payment.getMonth() + "/" + payment.getYear(),
                payment.getNotes()
        );

        // Generate journal entry: DR Salary Expense, CR Cash at Bank
        financialEventService.onSalaryPaid(payment);

        // Paying a payroll line settles that employee's advance installments, deductions and commission.
        if (payrollLine != null) payrollRuns.settleLine(payrollLine, payment.getId());
        // ...and without payroll, the items chosen for this payment.
        if (!manualChosen.isEmpty()) settleManualItems(manualChosen, manualPeriod, manualPayee, payment);

        notificationService.notifyRoles(
                List.of("GYMBIOS_ADMIN", "HR"),
                "Salary Payment Processed",
                "Salary for " + payment.getEmployeeName() + " (" + payment.getMonth() + "/" + payment.getYear() +
                ") of AED " + payment.getNetSalary() + " has been processed.",
                "SUCCESS", "HIGH", "PAYROLL",
                payment.getId(), "/salary-payments",
                "PAYROLL_" + payment.getEmployeeId() + "_" + payment.getMonth() + "_" + payment.getYear()
        );

        SalaryPaymentResponseDTO dto = SalaryPaymentResponseDTO.fromEntity(payment, parseSplitPayments(payment.getSplitPaymentsJson()));
        if (voucher != null) dto.setVoucherNo(voucher.getVoucherNo());
        dto.setSettlement(readJson(payment.getSettlementJson()));
        return dto;
    }

    public List<SalaryPaymentResponseDTO> createBulkPayments(List<SalaryPaymentRequestDTO> reqs) {
        List<SalaryPaymentResponseDTO> created = new ArrayList<>();
        for (SalaryPaymentRequestDTO req : reqs) {
            created.add(createPayment(req));
        }
        return created;
    }

    private String resolvePrimaryPaymentMethod(List<SplitPaymentDTO> splits) {
        if (splits == null || splits.isEmpty()) return "Bank Transfer";
        return splits.stream()
                .filter(s -> s.getAmount() != null)
                .max(java.util.Comparator.comparing(SplitPaymentDTO::getAmount))
                .map(SplitPaymentDTO::getMode)
                .orElse("Bank Transfer");
    }

    private String toSplitJson(List<SplitPaymentDTO> splits) {
        try {
            if (splits == null) return "[]";
            return objectMapper.writeValueAsString(splits);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<SplitPaymentDTO> parseSplitPayments(String json) {
        try {
            if (json == null || json.isBlank()) return new ArrayList<>();
            return objectMapper.readValue(json, new TypeReference<List<SplitPaymentDTO>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private SalaryPaymentEmployeeResponseDTO fromStaff(Staff staff) {
        SalaryPaymentEmployeeResponseDTO dto = new SalaryPaymentEmployeeResponseDTO();
        dto.setId(staff.getId());
        dto.setEmployeeId(staff.getStaffId() != null ? staff.getStaffId() : String.valueOf(staff.getId()));
        dto.setEmployeeName(staff.getName());
        dto.setDepartment(staff.getDepartment());
        dto.setDesignation(staff.getRole());
        dto.setBaseSalary(staff.getBaseSalary() != null ? staff.getBaseSalary() : BigDecimal.ZERO);
        dto.setAllowances(BigDecimal.ZERO);
        dto.setDeductions(BigDecimal.ZERO);
        dto.setNetSalary(staff.getBaseSalary() != null ? staff.getBaseSalary() : BigDecimal.ZERO);
        dto.setPaymentStatus("Pending");
        dto.setLastPaymentDate(null);
        dto.setBankAccount(null);
        dto.setEmail(staff.getEmail());
        dto.setCreatedAt(staff.getCreatedAt());
        dto.setUpdatedAt(staff.getUpdatedAt());
        return dto;
    }
}
