package com.company.project.services;

import com.company.project.entities.AdvanceRepayment;
import com.company.project.entities.DeductionType;
import com.company.project.entities.EmployeeDeduction;
import com.company.project.entities.PayrollRun;
import com.company.project.entities.PayrollRunLine;
import com.company.project.entities.SalaryAdvance;
import com.company.project.entities.Staff;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AdvanceRepaymentRepository;
import com.company.project.repositories.DeductionTypeRepository;
import com.company.project.repositories.EmployeeDeductionRepository;
import com.company.project.repositories.PayrollRunLineRepository;
import com.company.project.repositories.PayrollRunRepository;
import com.company.project.repositories.SalaryAdvanceRepository;
import com.company.project.repositories.SalaryPaymentRepository;
import com.company.project.entities.SalaryPayment;
import com.company.project.repositories.StaffRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Advances & Deductions: employee deductions and their types, the installment schedule of
 * salary advances (derived from the approved advance + its recorded repayments), manual
 * repayments / skips, and the transaction history. Payroll calls {@link #dueForPeriod} and
 * {@link #deductionsForPeriod} to fill its deduction columns.
 */
@Service
@Transactional
public class AdvancesDeductionsService {

    public static final Set<String> CALC_METHODS = Set.of("Fixed", "Percentage", "Per Day", "Per Hour");
    public static final Set<String> FREQUENCIES = Set.of("One-Time", "Monthly");
    /** Advance statuses that still get installments deducted. */
    public static final Set<String> REPAYING = Set.of("Active", "Approved");

    private final DeductionTypeRepository typeRepository;
    private final EmployeeDeductionRepository deductionRepository;
    private final AdvanceRepaymentRepository repaymentRepository;
    private final SalaryAdvanceRepository advanceRepository;
    private final StaffRepository staffRepository;
    private final PayrollRunRepository runRepository;
    private final PayrollRunLineRepository lineRepository;
    private final FinancialEventService financialEventService;
    private final ObjectMapper objectMapper;
    private final SalaryPaymentRepository salaryPaymentRepository;

    public AdvancesDeductionsService(DeductionTypeRepository typeRepository, EmployeeDeductionRepository deductionRepository,
                                     AdvanceRepaymentRepository repaymentRepository, SalaryAdvanceRepository advanceRepository,
                                     StaffRepository staffRepository, PayrollRunRepository runRepository,
                                     PayrollRunLineRepository lineRepository, FinancialEventService financialEventService,
                                     ObjectMapper objectMapper, SalaryPaymentRepository salaryPaymentRepository) {
        this.typeRepository = typeRepository;
        this.deductionRepository = deductionRepository;
        this.repaymentRepository = repaymentRepository;
        this.advanceRepository = advanceRepository;
        this.staffRepository = staffRepository;
        this.runRepository = runRepository;
        this.lineRepository = lineRepository;
        this.financialEventService = financialEventService;
        this.objectMapper = objectMapper;
        this.salaryPaymentRepository = salaryPaymentRepository;
    }

    // ── Deduction types ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listTypes() {
        return typeRepository.findAllByOrderByIdAsc().stream().map(this::typeMap).toList();
    }

    public Map<String, Object> saveType(Long id, Map<String, Object> b) {
        DeductionType t = id != null
                ? typeRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Deduction type not found"))
                : new DeductionType();
        if (b.containsKey("name") || id == null) {
            String name = ShiftService.str(b.get("name"));
            if (name == null) throw new BusinessRuleViolationException("Give the deduction type a name");
            t.setName(name);
        }
        if (b.containsKey("code") || id == null) {
            String code = ShiftService.str(b.get("code"));
            if (code == null) code = t.getName().replaceAll("[^A-Za-z]", "").toUpperCase();
            t.setCode(code.substring(0, Math.min(6, code.length())).toUpperCase());
        }
        if (b.containsKey("calc_method")) {
            String m = ShiftService.str(b.get("calc_method"));
            if (m == null || !CALC_METHODS.contains(m)) throw new BusinessRuleViolationException("Unsupported calculation method");
            t.setCalcMethod(m);
        }
        if (b.containsKey("recurring")) t.setRecurring(Boolean.TRUE.equals(b.get("recurring")));
        if (b.containsKey("requires_approval")) t.setRequiresApproval(Boolean.TRUE.equals(b.get("requires_approval")));
        if (b.containsKey("active")) t.setActive(!Boolean.FALSE.equals(b.get("active")));
        return typeMap(typeRepository.save(t));
    }

    private Map<String, Object> typeMap(DeductionType t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("name", t.getName());
        m.put("code", t.getCode());
        m.put("calc_method", t.getCalcMethod());
        m.put("recurring", t.getRecurring());
        m.put("requires_approval", t.getRequiresApproval());
        m.put("active", t.getActive());
        return m;
    }

    // ── Employee deductions ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listDeductions() {
        Map<Long, Staff> staff = staffById();
        Map<Long, DeductionType> types = typeRepository.findAll().stream().collect(Collectors.toMap(DeductionType::getId, t -> t));
        return deductionRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(d -> deductionMap(d, staff.get(d.getStaffId()), types.get(d.getTypeId())))
                .toList();
    }

    public Map<String, Object> createDeduction(Map<String, Object> b) {
        EmployeeDeduction d = new EmployeeDeduction();
        applyDeduction(d, b);
        DeductionType type = typeRepository.findById(d.getTypeId()).orElseThrow();
        boolean draft = Boolean.TRUE.equals(b.get("draft"));
        d.setStatus(draft ? "Draft" : Boolean.TRUE.equals(type.getRequiresApproval()) ? "Pending" : "Active");
        if ("Active".equals(d.getStatus())) {
            d.setApprovedBy(StaffAttendanceReviewService.currentUser());
            d.setApprovedAt(LocalDateTime.now());
        }
        Staff s = staffRepository.findById(d.getStaffId()).orElseThrow();
        d.setBranchId(s.getBranchId());
        deductionRepository.save(d);
        return deductionMap(d, s, type);
    }

    public Map<String, Object> updateDeduction(Long id, Map<String, Object> b) {
        EmployeeDeduction d = deductionRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Deduction not found"));
        if (!List.of("Draft", "Pending", "Active", "Paused").contains(d.getStatus())) {
            throw new BusinessRuleViolationException("A " + d.getStatus().toLowerCase() + " deduction can't be edited");
        }
        applyDeduction(d, b);
        deductionRepository.save(d);
        return deductionMap(d, staffRepository.findById(d.getStaffId()).orElse(null), typeRepository.findById(d.getTypeId()).orElse(null));
    }

    /** approve | reject | pause | resume | cancel | submit */
    public Map<String, Object> changeDeductionStatus(Long id, String action) {
        EmployeeDeduction d = deductionRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Deduction not found"));
        String from = d.getStatus();
        String to = switch (action) {
            case "submit" -> require(from, "Draft", "Pending");
            case "approve" -> require(from, "Pending", "Active");
            case "reject" -> require(from, "Pending", "Rejected");
            case "pause" -> require(from, "Active", "Paused");
            case "resume" -> require(from, "Paused", "Active");
            case "cancel" -> {
                if (List.of("Completed", "Cancelled", "Rejected").contains(from)) {
                    throw new BusinessRuleViolationException("This deduction is already " + from.toLowerCase());
                }
                yield "Cancelled";
            }
            default -> throw new BusinessRuleViolationException("Unknown action " + action);
        };
        d.setStatus(to);
        if ("approve".equals(action)) {
            d.setApprovedBy(StaffAttendanceReviewService.currentUser());
            d.setApprovedAt(LocalDateTime.now());
        }
        deductionRepository.save(d);
        return deductionMap(d, staffRepository.findById(d.getStaffId()).orElse(null), typeRepository.findById(d.getTypeId()).orElse(null));
    }

    public void deleteDeduction(Long id) {
        EmployeeDeduction d = deductionRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Deduction not found"));
        if (d.getCompletedInstallments() != null && d.getCompletedInstallments() > 0) {
            throw new BusinessRuleViolationException("This deduction has already been applied to payroll — cancel it instead");
        }
        deductionRepository.delete(d);
    }

    private static String require(String from, String expected, String to) {
        if (!expected.equals(from)) throw new BusinessRuleViolationException("Only a " + expected.toLowerCase() + " deduction can do that");
        return to;
    }

    private void applyDeduction(EmployeeDeduction d, Map<String, Object> b) {
        if (b.containsKey("staff_id") || d.getStaffId() == null) {
            Long staffId = ShiftService.longOrNull(b.get("staff_id"));
            if (staffId == null || staffRepository.findById(staffId).isEmpty()) throw new BusinessRuleViolationException("Pick an employee");
            d.setStaffId(staffId);
        }
        if (b.containsKey("type_id") || d.getTypeId() == null) {
            Long typeId = ShiftService.longOrNull(b.get("type_id"));
            if (typeId == null || typeRepository.findById(typeId).isEmpty()) throw new BusinessRuleViolationException("Pick a deduction type");
            d.setTypeId(typeId);
        }
        if (b.containsKey("amount") || d.getId() == null) {
            BigDecimal amount = ShiftService.dec(b.get("amount"));
            if (amount == null || amount.signum() <= 0) throw new BusinessRuleViolationException("Enter an amount above zero");
            d.setAmount(amount);
        }
        if (b.containsKey("quantity")) {
            BigDecimal q = ShiftService.dec(b.get("quantity"));
            d.setQuantity(q != null && q.signum() > 0 ? q : BigDecimal.ONE);
        }
        if (b.containsKey("frequency")) {
            String f = ShiftService.str(b.get("frequency"));
            if (f == null || !FREQUENCIES.contains(f)) throw new BusinessRuleViolationException("Frequency must be One-Time or Monthly");
            d.setFrequency(f);
        }
        if (b.containsKey("installments")) d.setInstallments(ShiftService.intOr(b.get("installments"), 1));
        if ("One-Time".equals(d.getFrequency())) d.setInstallments(1);
        if (b.containsKey("start_month") || d.getStartMonth() == null) {
            LocalDate m = ShiftService.date(b.get("start_month"));
            d.setStartMonth((m != null ? m : LocalDate.now()).withDayOfMonth(1));
        }
        if (b.containsKey("reason")) d.setReason(ShiftService.str(b.get("reason")));
    }

    private Map<String, Object> deductionMap(EmployeeDeduction d, Staff s, DeductionType t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("staff_id", d.getStaffId());
        m.put("staff_name", s != null ? s.getName() : "Unknown");
        m.put("staff_code", s != null ? s.getStaffId() : null);
        m.put("department", s != null ? s.getDepartment() : null);
        m.put("photo_url", s != null ? s.getPhotoUrl() : null);
        m.put("type_id", d.getTypeId());
        m.put("type_name", t != null ? t.getName() : null);
        m.put("type_code", t != null ? t.getCode() : null);
        m.put("calc_method", t != null ? t.getCalcMethod() : "Fixed");
        m.put("amount", d.getAmount());
        m.put("quantity", d.getQuantity());
        m.put("monthly_amount", s != null ? monthlyAmount(d, t, s) : d.getAmount());
        m.put("frequency", d.getFrequency());
        m.put("installments", d.getInstallments());
        m.put("completed_installments", d.getCompletedInstallments());
        m.put("start_month", d.getStartMonth().toString());
        m.put("reason", d.getReason());
        m.put("status", d.getStatus());
        m.put("approved_by", d.getApprovedBy());
        m.put("created_at", d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
        return m;
    }

    /** What one installment of the deduction takes from this employee's pay. */
    public static BigDecimal monthlyAmount(EmployeeDeduction d, DeductionType t, Staff s) {
        String method = t != null ? t.getCalcMethod() : "Fixed";
        BigDecimal amount = d.getAmount() != null ? d.getAmount() : BigDecimal.ZERO;
        return switch (method) {
            case "Percentage" -> (s.getBaseSalary() != null ? s.getBaseSalary() : BigDecimal.ZERO)
                    .multiply(amount).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            case "Per Day", "Per Hour" -> amount.multiply(d.getQuantity() != null ? d.getQuantity() : BigDecimal.ONE)
                    .setScale(2, RoundingMode.HALF_UP);
            default -> amount.setScale(2, RoundingMode.HALF_UP);
        };
    }

    /** Active deductions that apply to this payroll month, per staff id. */
    @Transactional(readOnly = true)
    public Map<Long, List<Map<String, Object>>> deductionsForPeriod(YearMonth period) {
        Map<Long, DeductionType> types = typeRepository.findAll().stream().collect(Collectors.toMap(DeductionType::getId, t -> t));
        Map<Long, Staff> staff = staffById();
        LocalDate month = period.atDay(1);
        Map<Long, List<Map<String, Object>>> out = new LinkedHashMap<>();
        for (EmployeeDeduction d : deductionRepository.findByStatus("Active")) {
            if (d.getStartMonth().isAfter(month)) continue;
            // already taken for this month (or a later one) by payroll or a salary payment
            if (d.getLastAppliedMonth() != null && !d.getLastAppliedMonth().isBefore(month)) continue;
            boolean applies = "One-Time".equals(d.getFrequency())
                    ? d.getStartMonth().equals(month) || (d.getCompletedInstallments() == 0 && d.getStartMonth().isBefore(month))
                    : d.getInstallments() == null || d.getInstallments() <= 0 || d.getCompletedInstallments() < d.getInstallments();
            Staff s = staff.get(d.getStaffId());
            if (!applies || s == null) continue;
            DeductionType t = types.get(d.getTypeId());
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("deduction_id", d.getId());
            item.put("type", t != null ? t.getName() : "Deduction");
            item.put("code", t != null ? t.getCode() : null);
            item.put("amount", monthlyAmount(d, t, s));
            item.put("reason", d.getReason());
            item.put("installment_no", d.getCompletedInstallments() + 1);
            item.put("installments", d.getInstallments());
            out.computeIfAbsent(d.getStaffId(), k -> new ArrayList<>()).add(item);
        }
        return out;
    }

    /** Marks a deduction's installment as taken from the given month's salary. */
    public void markDeductionApplied(Long deductionId, YearMonth period) {
        deductionRepository.findById(deductionId).ifPresent(d -> {
            d.setLastAppliedMonth(period.atDay(1));
            d.setCompletedInstallments((d.getCompletedInstallments() != null ? d.getCompletedInstallments() : 0) + 1);
            if ("One-Time".equals(d.getFrequency())
                    || (d.getInstallments() != null && d.getInstallments() > 0 && d.getCompletedInstallments() >= d.getInstallments())) {
                d.setStatus("Completed");
            }
            deductionRepository.save(d);
        });
    }

    // ── Advance installments ─────────────────────────────────────────────────

    /** The full installment schedule of every advance with an approved amount. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> schedule(Long advanceId) {
        Map<Long, List<AdvanceRepayment>> byAdvance = repaymentRepository.findAll().stream()
                .collect(Collectors.groupingBy(AdvanceRepayment::getAdvanceId));
        List<Map<String, Object>> rows = new ArrayList<>();
        YearMonth current = YearMonth.now();
        for (SalaryAdvance a : advanceRepository.findAll()) {
            if (advanceId != null && !advanceId.equals(a.getId())) continue;
            if (a.getApprovedAmount() == null || a.getApprovedAmount().signum() <= 0) continue;
            if (!REPAYING.contains(a.getStatus()) && !"Fully Repaid".equals(a.getStatus())) continue;
            List<AdvanceRepayment> recorded = new ArrayList<>(byAdvance.getOrDefault(a.getId(), List.of()));
            recorded.sort(Comparator.comparing(AdvanceRepayment::getPeriodMonth).thenComparing(AdvanceRepayment::getId));
            int n = 0, row = 0;
            BigDecimal balance = a.getApprovedAmount();
            LocalDate lastMonth = null;
            for (AdvanceRepayment r : recorded) {
                boolean skipped = "Skipped".equals(r.getStatus());
                if (!skipped) n++;
                rows.add(installmentRow(a, ++row, skipped ? null : n, r.getPeriodMonth(), r.getScheduledAmount(), r.getAmount(),
                        r.getBalanceBefore(), r.getBalanceAfter(), r.getStatus(), r.getId(), r.getSource()));
                balance = r.getBalanceAfter();
                lastMonth = r.getPeriodMonth();
            }
            if (!REPAYING.contains(a.getStatus())) continue;
            LocalDate start = a.getStartMonth() != null ? a.getStartMonth().withDayOfMonth(1) : current.atDay(1);
            LocalDate month = lastMonth != null && !lastMonth.isBefore(start) ? lastMonth.plusMonths(1) : start;
            BigDecimal inst = installmentAmount(a);
            int guard = 0;
            while (balance.signum() > 0 && guard++ < 120) {
                BigDecimal amt = inst.min(balance);
                n++;
                row++;
                YearMonth ym = YearMonth.from(month);
                String status = ym.isBefore(current) ? "Overdue" : ym.equals(current) ? "Due" : "Upcoming";
                rows.add(installmentRow(a, row, n, month, amt, BigDecimal.ZERO, balance, balance.subtract(amt), status, null, null));
                balance = balance.subtract(amt);
                month = month.plusMonths(1);
            }
        }
        rows.sort(Comparator.<Map<String, Object>, String>comparing(r -> (String) r.get("due_month"))
                .thenComparing(r -> String.valueOf(r.get("employee_name"))));
        return rows;
    }

    private static BigDecimal installmentAmount(SalaryAdvance a) {
        if (a.getInstallmentAmount() != null && a.getInstallmentAmount().signum() > 0) return a.getInstallmentAmount();
        int count = a.getInstallmentCount() != null && a.getInstallmentCount() > 0 ? a.getInstallmentCount() : 1;
        return a.getApprovedAmount().divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
    }

    private static Map<String, Object> installmentRow(SalaryAdvance a, int row, Integer n, LocalDate month, BigDecimal scheduled,
                                                      BigDecimal actual, BigDecimal before, BigDecimal after, String status,
                                                      Long repaymentId, String source) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId() + "-" + row);
        m.put("advance_id", a.getId());
        m.put("employee_id", a.getEmployeeId());
        m.put("employee_name", a.getEmployeeName());
        m.put("installment_no", n);
        m.put("installments", a.getInstallmentCount());
        m.put("due_month", month.toString());
        m.put("scheduled_amount", scheduled);
        m.put("actual_amount", actual);
        m.put("balance_before", before);
        m.put("balance_after", after);
        m.put("status", status);
        m.put("repayment_id", repaymentId);
        m.put("source", source);
        return m;
    }

    /** Installments to deduct in this payroll month (one per repaying advance), keyed by employee code. */
    @Transactional(readOnly = true)
    public Map<String, List<Map<String, Object>>> dueForPeriod(YearMonth period) {
        Map<String, List<Map<String, Object>>> out = new LinkedHashMap<>();
        LocalDate month = period.atDay(1);
        for (Map<String, Object> row : schedule(null)) {
            String status = (String) row.get("status");
            if (!List.of("Due", "Overdue", "Upcoming").contains(status)) continue;
            LocalDate due = LocalDate.parse((String) row.get("due_month"));
            if (due.isAfter(month)) continue;
            SalaryAdvance a = advanceRepository.findById((Long) row.get("advance_id")).orElse(null);
            if (a == null || Boolean.FALSE.equals(a.getAutoDeduct())) continue;
            String key = String.valueOf(row.get("employee_id"));
            List<Map<String, Object>> list = out.computeIfAbsent(key, k -> new ArrayList<>());
            // one installment per advance per payroll: the earliest outstanding one
            if (list.stream().anyMatch(i -> i.get("advance_id").equals(row.get("advance_id")))) continue;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("advance_id", a.getId());
            item.put("advance_type", a.getAdvanceType());
            item.put("installment_no", row.get("installment_no"));
            item.put("installments", a.getInstallmentCount());
            item.put("amount", row.get("scheduled_amount"));
            item.put("due_month", row.get("due_month"));
            list.add(item);
        }
        return out;
    }

    /** Records a repayment (manual, or from a disbursed payroll run) and updates the advance. */
    public AdvanceRepayment recordRepayment(Long advanceId, LocalDate periodMonth, BigDecimal amount, String source,
                                            Long payrollRunId, String note) {
        SalaryAdvance a = advanceRepository.findById(advanceId).orElseThrow(() -> new EntityNotFoundException("Advance not found"));
        if (!REPAYING.contains(a.getStatus())) throw new BusinessRuleViolationException("This advance is not being repaid");
        BigDecimal balance = a.getBalance() != null ? a.getBalance() : BigDecimal.ZERO;
        if (balance.signum() <= 0) throw new BusinessRuleViolationException("This advance is already fully repaid");
        BigDecimal amt = amount != null && amount.signum() > 0 ? amount.min(balance) : installmentAmount(a).min(balance);
        int done = (int) repaymentRepository.findByAdvanceIdOrderByPeriodMonthAscIdAsc(advanceId).stream()
                .filter(x -> "Processed".equals(x.getStatus())).count();

        AdvanceRepayment r = new AdvanceRepayment();
        r.setAdvanceId(advanceId);
        r.setInstallmentNo(done + 1);
        r.setPeriodMonth((periodMonth != null ? periodMonth : LocalDate.now()).withDayOfMonth(1));
        r.setScheduledAmount(installmentAmount(a).min(balance));
        r.setAmount(amt);
        r.setBalanceBefore(balance);
        r.setBalanceAfter(balance.subtract(amt));
        r.setStatus("Processed");
        r.setSource(source);
        r.setPayrollRunId(payrollRunId);
        r.setNote(note);
        r.setBranchId(a.getBranchId());
        repaymentRepository.save(r);

        a.setTotalDeducted((a.getTotalDeducted() != null ? a.getTotalDeducted() : BigDecimal.ZERO).add(amt));
        a.setBalance(balance.subtract(amt));
        if (a.getBalance().signum() <= 0) {
            a.setStatus("Fully Repaid");
            a.setNextDeductionDate(null);
        } else {
            a.setNextDeductionDate(r.getPeriodMonth().plusMonths(1));
        }
        advanceRepository.save(a);
        financialEventService.onSalaryAdvanceRepaid(r, a);
        return r;
    }

    /** Pushes an installment back a month: nothing is taken and the schedule moves on. */
    public void skipInstallment(Long advanceId, LocalDate periodMonth, String note) {
        SalaryAdvance a = advanceRepository.findById(advanceId).orElseThrow(() -> new EntityNotFoundException("Advance not found"));
        if (!REPAYING.contains(a.getStatus())) throw new BusinessRuleViolationException("This advance is not being repaid");
        BigDecimal balance = a.getBalance() != null ? a.getBalance() : BigDecimal.ZERO;
        AdvanceRepayment r = new AdvanceRepayment();
        r.setAdvanceId(advanceId);
        r.setInstallmentNo(null); // a skipped month isn't an installment
        r.setPeriodMonth((periodMonth != null ? periodMonth : LocalDate.now()).withDayOfMonth(1));
        r.setScheduledAmount(installmentAmount(a).min(balance));
        r.setAmount(BigDecimal.ZERO);
        r.setBalanceBefore(balance);
        r.setBalanceAfter(balance);
        r.setStatus("Skipped");
        r.setSource("manual");
        r.setNote(note);
        r.setBranchId(a.getBranchId());
        repaymentRepository.save(r);
        a.setNextDeductionDate(r.getPeriodMonth().plusMonths(1));
        advanceRepository.save(a);
    }

    /** Advances issued, installments recovered and deductions taken when payroll salaries were paid. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> transactions() {
        List<Map<String, Object>> out = new ArrayList<>();
        Map<Long, SalaryAdvance> advances = advanceRepository.findAll().stream()
                .collect(Collectors.toMap(SalaryAdvance::getId, Function.identity()));
        for (SalaryAdvance a : advances.values()) {
            if (a.getApprovedAmount() == null || a.getApprovedAmount().signum() <= 0 || a.getApprovedDate() == null) continue;
            if ("Rejected".equals(a.getStatus())) continue;
            out.add(tx(a.getApprovedDate(), a.getEmployeeName(), "ADV-" + a.getId(),
                    "Advance issued (" + a.getAdvanceType() + ")", a.getApprovedAmount(), YearMonth.from(a.getApprovedDate()), "Advance Issued"));
        }
        for (AdvanceRepayment r : repaymentRepository.findAllByOrderByPeriodMonthDescIdDesc()) {
            if (!"Processed".equals(r.getStatus())) continue;
            SalaryAdvance a = advances.get(r.getAdvanceId());
            LocalDate when = r.getCreatedAt() != null ? r.getCreatedAt().toLocalDate() : r.getPeriodMonth();
            out.add(tx(when, a != null ? a.getEmployeeName() : "—", "ADV-" + r.getAdvanceId() + "/" + r.getInstallmentNo(),
                    "Advance installment #" + r.getInstallmentNo() + ("payroll".equals(r.getSource()) ? " (payroll)"
                            : "salary_payment".equals(r.getSource()) ? " (salary payment)" : " (repaid directly)"),
                    r.getAmount().negate(), YearMonth.from(r.getPeriodMonth()), "Advance Repayment"));
        }
        for (PayrollRun run : runRepository.findAll()) {
            if ("Draft".equals(run.getStatus()) || "Approved".equals(run.getStatus())) continue;
            boolean legacy = "Disbursed".equals(run.getStatus()); // paid in one go before per-employee payments
            YearMonth ym = YearMonth.of(run.getPeriodYear(), run.getPeriodMonth());
            LocalDate when = run.getDisbursedAt() != null ? run.getDisbursedAt().toLocalDate() : ym.atEndOfMonth();
            for (PayrollRunLine line : lineRepository.findByRunIdOrderByEmployeeNameAsc(run.getId())) {
                if (!legacy && line.getPaidAt() == null) continue;
                LocalDate paidOn = line.getPaidAt() != null ? line.getPaidAt().toLocalDate() : when;
                JsonNode breakdown = readJson(line.getBreakdownJson());
                if (breakdown == null) continue;
                for (JsonNode d : breakdown.path("deductions")) {
                    out.add(tx(paidOn, line.getEmployeeName(), "DED-" + d.path("deduction_id").asText(),
                            d.path("type").asText("Deduction") + (d.hasNonNull("reason") ? " — " + d.path("reason").asText() : ""),
                            new BigDecimal(d.path("amount").asText("0")).negate(), ym, "Other Deduction"));
                }
                BigDecimal attendance = line.getAttendanceDeduction();
                if (attendance != null && attendance.signum() > 0) {
                    out.add(tx(paidOn, line.getEmployeeName(), "PAY-" + run.getId(), "Attendance deduction (absence / unpaid leave)",
                            attendance.negate(), ym, "Attendance Deduction"));
                }
            }
        }
        // deductions taken by salary payments made without payroll
        for (SalaryPayment p : salaryPaymentRepository.findAll()) {
            if (p.getSettlementJson() == null) continue;
            JsonNode s = readJson(p.getSettlementJson());
            // payroll-paid deductions are listed from the payroll lines above
            if (s == null || !"manual".equals(s.path("source").asText())) continue;
            YearMonth ym;
            try {
                ym = YearMonth.of(p.getYear(), java.time.Month.valueOf(p.getMonth().trim().toUpperCase(java.util.Locale.ROOT)));
            } catch (Exception e) {
                continue;
            }
            LocalDate paidOn = p.getPaymentDate() != null ? p.getPaymentDate() : ym.atEndOfMonth();
            for (JsonNode d : s.path("deductions")) {
                if (!"deduction".equals(d.path("kind").asText())) continue;
                out.add(tx(paidOn, p.getEmployeeName(), "DED-" + d.path("ref_id").asText(), d.path("label").asText("Deduction"),
                        new BigDecimal(d.path("amount").asText("0")).negate(), ym, "Other Deduction"));
            }
        }
        out.sort(Comparator.<Map<String, Object>, String>comparing(m -> (String) m.get("date")).reversed());
        return out;
    }

    private static Map<String, Object> tx(LocalDate date, String employee, String ref, String description,
                                          BigDecimal amount, YearMonth period, String type) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("date", date.toString());
        m.put("employee_name", employee);
        m.put("reference", ref);
        m.put("description", description);
        m.put("amount", amount);
        m.put("period", period.toString());
        m.put("type", type);
        return m;
    }

    private JsonNode readJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }

    private Map<Long, Staff> staffById() {
        return staffRepository.findAll().stream().collect(Collectors.toMap(Staff::getId, s -> s));
    }
}
