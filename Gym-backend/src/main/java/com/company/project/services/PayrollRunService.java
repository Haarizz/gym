package com.company.project.services;

import com.company.project.performance.settlement.SettlementService;
import com.company.project.entities.PayrollRun;
import com.company.project.entities.PayrollRunLine;
import com.company.project.entities.SalaryPayment;
import com.company.project.entities.SalaryPaymentEmployee;
import com.company.project.entities.Shift;
import com.company.project.entities.Staff;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.PayrollRunLineRepository;
import com.company.project.repositories.PayrollRunRepository;
import com.company.project.repositories.SalaryPaymentEmployeeRepository;
import com.company.project.repositories.SalaryPaymentRepository;
import com.company.project.repositories.ShiftRepository;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Monthly payroll runs. For every employee not marked inactive:
 * <pre>
 *   Gross = basic + allowances + approved overtime pay + approved commission
 *   Net   = gross - attendance deduction - advance installments - other deductions   (never below 0)
 *
 *   per-day rate         = basic / working days of a full month on the employee's shift pattern
 *   attendance deduction = per-day rate x (absent days + unpaid leave days)   (half day = 0.5)
 *   overtime pay         = approved OT hours x basic / working hours of that full month x 1.25
 * </pre>
 * The rates use the whole month even when the shift was assigned (or ended) mid-month: days the
 * assignments don't cover are counted as if the nearest assigned shift applied. Otherwise a shift
 * assigned on the 16th would spread a full month's basic over half a month of days.
 * Someone who joined during the month gets basic and allowances prorated to the share of the
 * month employed (working days on their shift pattern, else calendar days).
 * Employees without a shift have no scheduled days, so no attendance deduction or overtime.
 * Recoveries never exceed the pay: a deduction that doesn't fit is deferred to next month and an
 * advance installment takes only what's left, so the net never needs flooring and nothing is
 * recorded as recovered that wasn't withheld.
 * Allowances come from the employee profile (fixed or % of basic), else Salary Payments.
 * Draft -> Approved -> Partially Paid -> Paid: an approved run is paid in Salary Payments, one
 * employee at a time. Paying an employee's line records their advance installments (posting the
 * journals), advances their deductions and marks their commission paid.
 */
@Service
@Transactional
public class PayrollRunService {

    public static final BigDecimal OT_MULTIPLIER = new BigDecimal("1.25");

    private final PayrollRunRepository runRepository;
    private final PayrollRunLineRepository lineRepository;
    private final ShiftAttendanceService attendance;
    private final SettlementService commissions;
    private final AdvancesDeductionsService advancesDeductions;
    private final SalaryPaymentEmployeeRepository salaryEmployeeRepository;
    private final ShiftRepository shiftRepository;
    private final SalaryPaymentRepository salaryPaymentRepository;
    private final ObjectMapper objectMapper;

    public PayrollRunService(PayrollRunRepository runRepository, PayrollRunLineRepository lineRepository,
                             ShiftAttendanceService attendance, SettlementService commissions,
                             AdvancesDeductionsService advancesDeductions,
                             SalaryPaymentEmployeeRepository salaryEmployeeRepository, ShiftRepository shiftRepository,
                             SalaryPaymentRepository salaryPaymentRepository, ObjectMapper objectMapper) {
        this.runRepository = runRepository;
        this.lineRepository = lineRepository;
        this.attendance = attendance;
        this.commissions = commissions;
        this.advancesDeductions = advancesDeductions;
        this.salaryEmployeeRepository = salaryEmployeeRepository;
        this.shiftRepository = shiftRepository;
        this.salaryPaymentRepository = salaryPaymentRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listRuns() {
        return runRepository.findAllByOrderByPeriodYearDescPeriodMonthDescIdDesc().stream().map(r -> runMap(r, null)).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRun(Long id) {
        PayrollRun run = runRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Payroll run not found"));
        return runMap(run, lineRepository.findByRunIdOrderByEmployeeNameAsc(id));
    }

    /** Calculates the month and saves it as a Draft run, replacing an earlier draft. */
    public Map<String, Object> generate(int year, int month, String notes) {
        YearMonth period = YearMonth.of(year, month);
        if (period.isAfter(YearMonth.now().plusMonths(1))) {
            throw new BusinessRuleViolationException("Payroll can't be generated that far ahead");
        }
        for (PayrollRun existing : runRepository.findByPeriodYearAndPeriodMonth(year, month)) {
            if (!"Draft".equals(existing.getStatus())) {
                throw new BusinessRuleViolationException("Payroll for " + label(period) + " is already " + existing.getStatus().toLowerCase());
            }
            lineRepository.deleteByRunId(existing.getId());
            runRepository.delete(existing);
        }
        runRepository.flush();

        // Someone joining after the month isn't on its payroll.
        List<Staff> staff = attendance.workforce().stream()
                .filter(s -> s.getJoinDate() == null || !s.getJoinDate().isAfter(period.atEndOfMonth()))
                .toList();
        if (staff.isEmpty()) throw new BusinessRuleViolationException("There are no active employees to pay");

        Map<Long, List<Map<String, Object>>> days = attendance.daysByStaff(period.atDay(1), period.atEndOfMonth());
        Map<Long, Map<String, BigDecimal>> approvedCommission = commissions.approvedForPeriod(period);
        Map<String, List<Map<String, Object>>> advances = advancesDeductions.dueForPeriod(period);
        Map<Long, List<Map<String, Object>>> deductions = advancesDeductions.deductionsForPeriod(period);
        Map<Long, Shift> shifts = new java.util.HashMap<>();
        shiftRepository.findAll().forEach(sh -> shifts.put(sh.getId(), sh));

        PayrollRun run = new PayrollRun();
        run.setPeriodYear(year);
        run.setPeriodMonth(month);
        run.setStatus("Draft");
        run.setNotes(notes);
        runRepository.save(run);

        BigDecimal totalGross = BigDecimal.ZERO, totalDeductions = BigDecimal.ZERO, totalNet = BigDecimal.ZERO;
        for (Staff s : staff) {
            PayrollRunLine line = calculate(run, s, days.getOrDefault(s.getId(), List.of()), shifts,
                    approvedCommission.getOrDefault(s.getId(), Map.of()),
                    s.getStaffId() != null ? advances.getOrDefault(s.getStaffId(), List.of()) : List.of(),
                    deductions.getOrDefault(s.getId(), List.of()));
            lineRepository.save(line);
            totalGross = totalGross.add(line.getGrossPay());
            totalDeductions = totalDeductions.add(line.getAttendanceDeduction()).add(line.getAdvanceRepayment()).add(line.getOtherDeductions());
            totalNet = totalNet.add(line.getNetPay());
        }
        run.setEmployeeCount(staff.size());
        run.setTotalGross(totalGross);
        run.setTotalDeductions(totalDeductions);
        run.setTotalNet(totalNet);
        runRepository.save(run);
        return getRun(run.getId());
    }

    private PayrollRunLine calculate(PayrollRun run, Staff s, List<Map<String, Object>> days, Map<Long, Shift> shifts,
                                     Map<String, BigDecimal> commission, List<Map<String, Object>> advanceItems,
                                     List<Map<String, Object>> deductionItems) {
        YearMonth period = YearMonth.of(run.getPeriodYear(), run.getPeriodMonth());
        // Joined during the month: only days from the joining date count toward attendance, and
        // basic + allowances are prorated (below). Days before it are neither paid nor "absent".
        LocalDate joined = s.getJoinDate() != null && s.getJoinDate().isAfter(period.atDay(1))
                && !s.getJoinDate().isAfter(period.atEndOfMonth()) ? s.getJoinDate() : null;
        List<Map<String, Object>> employedDays = joined == null ? days
                : days.stream().filter(d -> !LocalDate.parse((String) d.get("date")).isBefore(joined)).toList();
        Map<String, Object> sum = ShiftAttendanceService.summarize(employedDays);
        Optional<SalaryPaymentEmployee> payrollRecord = s.getStaffId() != null
                ? salaryEmployeeRepository.findByEmployeeId(s.getStaffId()) : Optional.empty();
        BigDecimal monthlyBasic = s.getBaseSalary() != null && s.getBaseSalary().signum() > 0 ? s.getBaseSalary()
                : payrollRecord.map(SalaryPaymentEmployee::getBaseSalary).orElse(BigDecimal.ZERO);
        monthlyBasic = money(monthlyBasic);

        double scheduledDays = num(sum.get("scheduled_days"));
        double scheduledHours = num(sum.get("scheduled_hours"));
        double absent = num(sum.get("absent"));
        double unpaid = num(sum.get("unpaid_leave"));
        double approvedOtHours = num(sum.get("approved_ot_hours"));
        boolean hasShift = scheduledDays > 0;
        double[] basis = rateBasis(days, shifts, joined);
        double rateDays = basis[0] > 0 ? basis[0] : scheduledDays;
        double rateHours = basis[1] > 0 ? basis[1] : scheduledHours;

        // Share of the month employed: working days on the shift pattern, else calendar days.
        BigDecimal employedShare = BigDecimal.ONE;
        if (joined != null) {
            double share = hasShift && basis[0] > 0
                    ? (basis[0] - basis[2]) / basis[0]
                    : (period.lengthOfMonth() - (joined.getDayOfMonth() - 1)) / (double) period.lengthOfMonth();
            employedShare = BigDecimal.valueOf(Math.max(0, Math.min(1, share))).setScale(6, RoundingMode.HALF_UP);
        }
        BigDecimal basic = money(monthlyBasic.multiply(employedShare));

        List<Map<String, Object>> allowanceItems = allowances(s, monthlyBasic);
        BigDecimal allowances;
        if (!allowanceItems.isEmpty()) {
            if (joined != null) {
                final BigDecimal shareF = employedShare;
                allowanceItems = allowanceItems.stream()
                        .map(a -> item((String) a.get("name"), money(((BigDecimal) a.get("amount")).multiply(shareF)))).toList();
            }
            allowances = allowanceItems.stream().map(a -> (BigDecimal) a.get("amount")).reduce(BigDecimal.ZERO, BigDecimal::add);
        } else {
            allowances = money(payrollRecord.map(SalaryPaymentEmployee::getAllowances).orElse(BigDecimal.ZERO).multiply(employedShare));
            if (allowances.signum() > 0) allowanceItems = List.of(item("Allowances", allowances));
        }

        // Day and hour rates come from the full monthly basic, whatever share of the month was employed.
        BigDecimal perDay = hasShift && rateDays > 0 ? monthlyBasic.divide(BigDecimal.valueOf(rateDays), 4, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal attendanceDeduction = money(perDay.multiply(BigDecimal.valueOf(absent + unpaid))).min(basic);
        BigDecimal otRate = hasShift && rateHours > 0
                ? monthlyBasic.divide(BigDecimal.valueOf(rateHours), 4, RoundingMode.HALF_UP).multiply(OT_MULTIPLIER)
                : BigDecimal.ZERO;
        BigDecimal otPay = money(otRate.multiply(BigDecimal.valueOf(approvedOtHours)));
        BigDecimal commissionTotal = money(commission.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add));

        BigDecimal gross = basic.add(allowances).add(otPay).add(commissionTotal);

        // Recoveries never exceed the pay. Other deductions are taken whole when they fit, else
        // deferred to next month; advance installments take what's left (the rest stays on the
        // advance's balance). Each item records what was actually withheld, so settling the line
        // only ever records recoveries that really came out of this salary.
        BigDecimal available = gross.subtract(attendanceDeduction).max(BigDecimal.ZERO);
        List<Map<String, Object>> takenDeductions = new ArrayList<>();
        BigDecimal otherTotal = BigDecimal.ZERO;
        for (Map<String, Object> d : deductionItems) {
            BigDecimal due = money((BigDecimal) d.get("amount"));
            boolean fits = due.compareTo(available) <= 0;
            Map<String, Object> copy = new LinkedHashMap<>(d);
            copy.put("amount", fits ? due : BigDecimal.ZERO.setScale(2));
            if (!fits) {
                copy.put("due", due);
                copy.put("deferred", true);
            } else {
                available = available.subtract(due);
                otherTotal = otherTotal.add(due);
            }
            takenDeductions.add(copy);
        }
        List<Map<String, Object>> takenAdvances = new ArrayList<>();
        BigDecimal advanceTotal = BigDecimal.ZERO;
        for (Map<String, Object> a : advanceItems) {
            BigDecimal due = money((BigDecimal) a.get("amount"));
            BigDecimal take = due.min(available);
            Map<String, Object> copy = new LinkedHashMap<>(a);
            copy.put("amount", take);
            if (take.compareTo(due) < 0) copy.put("due", due);
            available = available.subtract(take);
            advanceTotal = advanceTotal.add(take);
            takenAdvances.add(copy);
        }
        BigDecimal net = gross.subtract(attendanceDeduction).subtract(advanceTotal).subtract(otherTotal).max(BigDecimal.ZERO);

        Map<String, Object> breakdown = new LinkedHashMap<>();
        breakdown.put("has_shift", hasShift);
        breakdown.put("allowances", allowanceItems);
        breakdown.put("per_day_rate", money(perDay));
        breakdown.put("rate_days", rateDays);
        breakdown.put("rate_hours", ShiftAttendanceService.hours((int) Math.round(rateHours * 60)));
        breakdown.put("ot_rate", money(otRate));
        breakdown.put("ot_multiplier", OT_MULTIPLIER);
        breakdown.put("commission", commission);
        breakdown.put("advances", takenAdvances);
        breakdown.put("deductions", takenDeductions);
        breakdown.put("attendance", sum);
        if (joined != null) {
            breakdown.put("joined_on", joined.toString());
            breakdown.put("monthly_basic", monthlyBasic);
            breakdown.put("employed_share", employedShare.setScale(4, RoundingMode.HALF_UP));
        }

        PayrollRunLine l = new PayrollRunLine();
        l.setRunId(run.getId());
        l.setBranchId(run.getBranchId());
        l.setStaffId(s.getId());
        l.setEmployeeCode(s.getStaffId());
        l.setEmployeeName(s.getName());
        l.setDesignation(s.getRole());
        l.setDepartment(s.getDepartment());
        l.setBasicSalary(basic);
        l.setAllowances(allowances);
        l.setScheduledDays(bd(scheduledDays));
        l.setPresentDays(bd(num(sum.get("present"))));
        l.setAbsentDays(bd(absent));
        l.setPaidLeaveDays(bd(num(sum.get("paid_leave"))));
        l.setUnpaidLeaveDays(bd(unpaid));
        l.setLateCount(((Number) sum.get("late_count")).intValue());
        l.setScheduledHours(bd(scheduledHours));
        l.setActualHours(bd(num(sum.get("actual_hours"))));
        l.setRegularHours(bd(num(sum.get("regular_hours"))));
        l.setApprovedOtHours(bd(approvedOtHours));
        l.setOtPay(otPay);
        l.setCommission(commissionTotal);
        l.setAttendanceDeduction(attendanceDeduction);
        l.setAdvanceRepayment(advanceTotal);
        l.setOtherDeductions(otherTotal);
        l.setGrossPay(gross);
        l.setNetPay(net);
        l.setBreakdownJson(write(breakdown));
        return l;
    }

    /**
     * {working days, working hours, working days before {@code joined}} of the full month on the
     * employee's shift pattern. Days a shift covers count as scheduled; days no assignment covers
     * ("No Shift") use the nearest covered day's shift. Roster days off and leave/holiday
     * overrides stay as they are.
     */
    private static double[] rateBasis(List<Map<String, Object>> days, Map<Long, Shift> shifts, LocalDate joined) {
        int n = days.size();
        double workDays = 0, beforeJoining = 0;
        int minutes = 0;
        for (int i = 0; i < n; i++) {
            Map<String, Object> d = days.get(i);
            boolean preJoin = joined != null && LocalDate.parse((String) d.get("date")).isBefore(joined);
            if (d.get("shift_id") != null) {
                if (Boolean.TRUE.equals(d.get("scheduled"))) {
                    workDays++;
                    if (preJoin) beforeJoining++;
                    minutes += ((Number) d.get("scheduled_minutes")).intValue();
                }
                continue;
            }
            if (!"No Shift".equals(d.get("status")) && d.get("status_override") == null) continue;
            Shift nearest = null;
            for (int k = 1; k < n && nearest == null; k++) {
                if (i + k < n && days.get(i + k).get("shift_id") != null) nearest = shifts.get(((Number) days.get(i + k).get("shift_id")).longValue());
                else if (i - k >= 0 && days.get(i - k).get("shift_id") != null) nearest = shifts.get(((Number) days.get(i - k).get("shift_id")).longValue());
            }
            if (nearest == null) return new double[] { 0, 0, 0 };
            if (ShiftAttendanceService.worksOn(nearest, LocalDate.parse((String) d.get("date")))) {
                workDays++;
                if (preJoin) beforeJoining++;
                minutes += ShiftAttendanceService.netMinutes(nearest);
            }
        }
        return new double[] { workDays, minutes / 60.0, beforeJoining };
    }

    /** Allowances from the employee profile: [{name, type: fixed|pct, value}] under payroll.allowances. */
    public List<Map<String, Object>> allowances(Staff s, BigDecimal basic) {
        List<Map<String, Object>> out = new ArrayList<>();
        JsonNode profile = read(s.getProfileJson());
        if (profile == null) return out;
        for (JsonNode a : profile.path("payroll").path("allowances")) {
            BigDecimal value;
            try {
                value = new BigDecimal(a.path("value").asText("0").isBlank() ? "0" : a.path("value").asText("0"));
            } catch (NumberFormatException e) {
                continue;
            }
            if (value.signum() <= 0) continue;
            BigDecimal amount = "pct".equals(a.path("type").asText())
                    ? basic.multiply(value).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                    : money(value);
            out.add(item(a.path("name").asText("Allowance"), amount));
        }
        return out;
    }

    /**
     * Approves a draft. From then on Salary Payments pays it line by line (see settleLine).
     * Employees already paid manually for the month are linked to their line, and lines with
     * nothing to pay are settled straight away.
     */
    public Map<String, Object> approve(Long id) {
        PayrollRun run = runRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Payroll run not found"));
        if (!"Draft".equals(run.getStatus())) throw new BusinessRuleViolationException("Only a draft payroll can be approved");
        run.setStatus("Approved");
        run.setApprovedBy(StaffAttendanceReviewService.currentUser());
        run.setApprovedAt(LocalDateTime.now());
        runRepository.save(run);

        YearMonth period = YearMonth.of(run.getPeriodYear(), run.getPeriodMonth());
        String monthName = period.getMonth().getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH);
        List<SalaryPayment> manual = salaryPaymentRepository.findAll().stream()
                .filter(p -> p.getPayrollRunLineId() == null && monthName.equalsIgnoreCase(p.getMonth())
                        && p.getYear() != null && p.getYear() == period.getYear())
                .toList();
        for (PayrollRunLine line : lineRepository.findByRunIdOrderByEmployeeNameAsc(id)) {
            SalaryPayment already = manual.stream()
                    .filter(p -> line.getEmployeeCode() != null && line.getEmployeeCode().equals(p.getEmployeeId()))
                    .findFirst().orElse(null);
            if (already != null) {
                already.setPayrollRunId(run.getId());
                already.setPayrollRunLineId(line.getId());
                salaryPaymentRepository.save(already);
                if (already.getSettlementJson() != null) {
                    // that payment already settled the advances, deductions and commission it covered
                    line.setSalaryPaymentId(already.getId());
                    line.setPaidAt(LocalDateTime.now());
                    lineRepository.save(line);
                } else {
                    settleLine(line, already.getId());
                }
            } else if (line.getNetPay() == null || line.getNetPay().signum() <= 0) {
                settleLine(line, null);
            }
        }
        refreshStatus(run);
        return getRun(id);
    }

    /** Back to Draft (to recalculate) — only while nobody on it has been paid. */
    public Map<String, Object> reopen(Long id) {
        PayrollRun run = runRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Payroll run not found"));
        if (!"Approved".equals(run.getStatus())) throw new BusinessRuleViolationException("Only an approved payroll with no payments can be reopened");
        if (lineRepository.findByRunIdOrderByEmployeeNameAsc(id).stream().anyMatch(l -> l.getPaidAt() != null)) {
            throw new BusinessRuleViolationException("Salaries on this payroll have already been settled, so it can't be reopened");
        }
        run.setStatus("Draft");
        run.setApprovedBy(null);
        run.setApprovedAt(null);
        runRepository.save(run);
        return getRun(id);
    }

    /** The month's payroll run (latest), or null. */
    @Transactional(readOnly = true)
    public PayrollRun runFor(YearMonth period) {
        return runRepository.findByPeriodYearAndPeriodMonth(period.getYear(), period.getMonthValue()).stream()
                .max(java.util.Comparator.comparing(PayrollRun::getId)).orElse(null);
    }

    /** Approved, partly paid or paid — i.e. Salary Payments pays from it. */
    public static boolean payable(PayrollRun run) {
        return run != null && !"Draft".equals(run.getStatus());
    }

    @Transactional(readOnly = true)
    public List<PayrollRunLine> lines(Long runId) {
        return lineRepository.findByRunIdOrderByEmployeeNameAsc(runId);
    }

    /**
     * An employee's line has been paid (salaryPaymentId) or had nothing to pay (null): record their
     * advance installments (posting the repayment journals), advance their deductions and mark the
     * included commission paid — so these only ever happen for salary that really went out.
     */
    public void settleLine(PayrollRunLine line, Long salaryPaymentId) {
        if (line.getPaidAt() != null) throw new BusinessRuleViolationException(line.getEmployeeName() + " has already been paid for this payroll");
        PayrollRun run = runRepository.findById(line.getRunId()).orElseThrow(() -> new EntityNotFoundException("Payroll run not found"));
        if (!payable(run)) throw new BusinessRuleViolationException("Approve the payroll before paying it");
        YearMonth period = YearMonth.of(run.getPeriodYear(), run.getPeriodMonth());
        JsonNode breakdown = read(line.getBreakdownJson());
        if (breakdown != null) {
            for (JsonNode a : breakdown.path("advances")) {
                BigDecimal amount = new BigDecimal(a.path("amount").asText("0"));
                if (amount.signum() <= 0) continue;
                try {
                    advancesDeductions.recordRepayment(a.path("advance_id").asLong(), period.atDay(1), amount,
                            "payroll", run.getId(), "Payroll " + label(period));
                } catch (BusinessRuleViolationException | EntityNotFoundException e) {
                    // repaid or cancelled since the payroll was calculated — nothing left to recover
                }
            }
            for (JsonNode d : breakdown.path("deductions")) {
                // a deferred deduction (didn't fit in this pay) stays due for next month
                if (new BigDecimal(d.path("amount").asText("0")).signum() <= 0) continue;
                advancesDeductions.markDeductionApplied(d.path("deduction_id").asLong(), period);
            }
        }
        // Only the commission this line included is paid — commission approved after the payroll
        // was calculated stays approved for the next payment.
        if (line.getStaffId() != null && breakdown != null) {
            List<String> categories = new ArrayList<>();
            breakdown.path("commission").fieldNames().forEachRemaining(categories::add);
            if (!categories.isEmpty()) commissions.markPaidByPayroll(period, run.getId(), List.of(line.getStaffId()), categories);
        }
        line.setSalaryPaymentId(salaryPaymentId);
        line.setPaidAt(LocalDateTime.now());
        lineRepository.save(line);
        refreshStatus(run);
    }

    /** Approved -> Partially Paid -> Paid as lines are paid. */
    private void refreshStatus(PayrollRun run) {
        List<PayrollRunLine> lines = lineRepository.findByRunIdOrderByEmployeeNameAsc(run.getId());
        long paid = lines.stream().filter(l -> l.getPaidAt() != null).count();
        String status = paid == 0 ? "Approved" : paid < lines.size() ? "Partially Paid" : "Paid";
        if (!status.equals(run.getStatus())) {
            run.setStatus(status);
            if ("Paid".equals(status)) {
                run.setDisbursedBy(StaffAttendanceReviewService.currentUser());
                run.setDisbursedAt(LocalDateTime.now());
            }
            runRepository.save(run);
        }
    }

    public void deleteRun(Long id) {
        PayrollRun run = runRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Payroll run not found"));
        if (!"Draft".equals(run.getStatus())) throw new BusinessRuleViolationException("Only a draft payroll can be deleted");
        lineRepository.deleteByRunId(id);
        runRepository.delete(run);
    }

    /** Things to sort out before generating the month: unapproved commission and overtime. */
    @Transactional(readOnly = true)
    public Map<String, Object> readiness(int year, int month) {
        YearMonth period = YearMonth.of(year, month);
        Map<Long, BigDecimal> undecided = period.isBefore(YearMonth.now()) ? commissions.undecidedForPeriod(period) : Map.of();
        int pendingOt = 0, incomplete = 0, noShift = 0, pendingCorrections = 0;
        double absentDays = 0;
        for (List<Map<String, Object>> days : attendance.daysByStaff(period.atDay(1), period.atEndOfMonth()).values()) {
            Map<String, Object> sum = ShiftAttendanceService.summarize(days);
            pendingOt += ((Number) sum.get("pending_ot_days")).intValue();
            incomplete += ((Number) sum.get("incomplete_punches")).intValue();
            if (num(sum.get("scheduled_days")) == 0) noShift++;
            absentDays += num(sum.get("absent")) + num(sum.get("unpaid_leave"));
            pendingCorrections += (int) days.stream().filter(d -> Boolean.TRUE.equals(d.get("pending_correction"))).count();
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("period", period.toString());
        m.put("employees", attendance.workforce().size());
        m.put("undecided_commission_staff", undecided.size());
        m.put("undecided_commission_total", undecided.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add));
        m.put("pending_ot_days", pendingOt);
        m.put("incomplete_punches", incomplete);
        m.put("pending_corrections", pendingCorrections);
        m.put("employees_without_shift", noShift);
        m.put("deductible_absence_days", absentDays);
        m.put("month_running", !period.isBefore(YearMonth.now()));
        return m;
    }

    // ── mapping ──────────────────────────────────────────────────────────────

    private Map<String, Object> runMap(PayrollRun r, List<PayrollRunLine> lines) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("period", YearMonth.of(r.getPeriodYear(), r.getPeriodMonth()).toString());
        m.put("period_label", label(YearMonth.of(r.getPeriodYear(), r.getPeriodMonth())));
        m.put("year", r.getPeriodYear());
        m.put("month", r.getPeriodMonth());
        m.put("status", r.getStatus());
        m.put("employee_count", r.getEmployeeCount());
        m.put("total_gross", r.getTotalGross());
        m.put("total_deductions", r.getTotalDeductions());
        m.put("total_net", r.getTotalNet());
        m.put("notes", r.getNotes());
        m.put("created_by", r.getCreatedBy());
        m.put("created_at", r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
        m.put("approved_by", r.getApprovedBy());
        m.put("approved_at", r.getApprovedAt() != null ? r.getApprovedAt().toString() : null);
        m.put("disbursed_by", r.getDisbursedBy());
        m.put("disbursed_at", r.getDisbursedAt() != null ? r.getDisbursedAt().toString() : null);
        List<PayrollRunLine> all = lines != null ? lines : lineRepository.findByRunIdOrderByEmployeeNameAsc(r.getId());
        m.put("paid_count", all.stream().filter(l -> l.getPaidAt() != null).count());
        m.put("paid_total", all.stream().filter(l -> l.getPaidAt() != null && l.getNetPay() != null)
                .map(PayrollRunLine::getNetPay).reduce(BigDecimal.ZERO, BigDecimal::add));
        if (lines != null) {
            m.put("lines", lines.stream().map(this::lineMap).toList());
        }
        return m;
    }

    private Map<String, Object> lineMap(PayrollRunLine l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", l.getId());
        m.put("staff_id", l.getStaffId());
        m.put("employee_code", l.getEmployeeCode());
        m.put("employee_name", l.getEmployeeName());
        m.put("designation", l.getDesignation());
        m.put("department", l.getDepartment());
        m.put("basic_salary", l.getBasicSalary());
        m.put("allowances", l.getAllowances());
        m.put("scheduled_days", l.getScheduledDays());
        m.put("present_days", l.getPresentDays());
        m.put("absent_days", l.getAbsentDays());
        m.put("paid_leave_days", l.getPaidLeaveDays());
        m.put("unpaid_leave_days", l.getUnpaidLeaveDays());
        m.put("late_count", l.getLateCount());
        m.put("scheduled_hours", l.getScheduledHours());
        m.put("actual_hours", l.getActualHours());
        m.put("regular_hours", l.getRegularHours());
        m.put("approved_ot_hours", l.getApprovedOtHours());
        m.put("ot_pay", l.getOtPay());
        m.put("commission", l.getCommission());
        m.put("attendance_deduction", l.getAttendanceDeduction());
        m.put("advance_repayment", l.getAdvanceRepayment());
        m.put("other_deductions", l.getOtherDeductions());
        m.put("gross_pay", l.getGrossPay());
        m.put("net_pay", l.getNetPay());
        m.put("breakdown", read(l.getBreakdownJson()));
        m.put("salary_payment_id", l.getSalaryPaymentId());
        m.put("paid_at", l.getPaidAt() != null ? l.getPaidAt().toString() : null);
        return m;
    }

    private static String label(YearMonth p) {
        return p.getMonth().getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH) + " " + p.getYear();
    }

    private static Map<String, Object> item(String name, BigDecimal amount) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("amount", amount);
        return m;
    }

    private static BigDecimal money(BigDecimal v) {
        return (v != null ? v : BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal bd(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP);
    }

    private static double num(Object o) {
        return o instanceof Number n ? n.doubleValue() : 0;
    }

    private JsonNode read(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }

    private String write(Object o) {
        try {
            return objectMapper.writeValueAsString(o);
        } catch (Exception e) {
            return null;
        }
    }

}
