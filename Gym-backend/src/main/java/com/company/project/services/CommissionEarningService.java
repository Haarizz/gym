package com.company.project.services;

import com.company.project.entities.CommissionEarning;
import com.company.project.entities.CommissionRule;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffTarget;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.CommissionEarningRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.StaffTargetRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Target & Commission: each staff member's sales, units and commission per month and
 * category, computed by {@link StaffProgressCalculator} with the role's existing rates
 * (memberships: admission / base %, POS: % and per-sale). Commission then moves through
 * estimated (month running) -> pending (month ended) -> approved (amount frozen) -> paid
 * (by a disbursed payroll run or marked manually); rejected earns nothing.
 */
@Service
@Transactional
public class CommissionEarningService {

    public static final List<String> CATEGORIES = List.of("memberships", "pos");

    private final StaffProgressCalculator calculator;
    private final CommissionEarningRepository earningRepository;
    private final StaffTargetRepository targetRepository;
    private final StaffRepository staffRepository;
    private final ShiftAttendanceService attendance;
    private final ObjectMapper objectMapper;

    public CommissionEarningService(StaffProgressCalculator calculator, CommissionEarningRepository earningRepository,
                                    StaffTargetRepository targetRepository, StaffRepository staffRepository,
                                    ShiftAttendanceService attendance, ObjectMapper objectMapper) {
        this.calculator = calculator;
        this.earningRepository = earningRepository;
        this.targetRepository = targetRepository;
        this.staffRepository = staffRepository;
        this.attendance = attendance;
        this.objectMapper = objectMapper;
    }

    /** Figures for the months from..to (future months are left out). */
    @Transactional(readOnly = true)
    public Map<String, Object> overview(YearMonth from, YearMonth to, Long onlyStaffId) {
        YearMonth current = YearMonth.now();
        if (to.isAfter(current)) to = current;
        if (from.isAfter(to)) from = to;
        if (from.plusMonths(11).isBefore(to)) from = to.minusMonths(11);
        List<YearMonth> months = new ArrayList<>();
        for (YearMonth m = from; !m.isAfter(to); m = m.plusMonths(1)) months.add(m);

        Map<String, CommissionEarning> decisions = new LinkedHashMap<>();
        for (YearMonth m : months) {
            for (CommissionEarning e : earningRepository.findByPeriodYearAndPeriodMonth(m.getYear(), m.getMonthValue())) {
                decisions.put(decisionKey(e.getStaffId(), m, e.getCategory()), e);
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Staff s : attendance.workforce()) {
            if (onlyStaffId != null && !onlyStaffId.equals(s.getId())) continue;
            Optional<CommissionRule> rule = calculator.findCommissionRule(s);
            List<Map<String, Object>> perMonth = new ArrayList<>();
            for (YearMonth m : months) perMonth.add(month(s, rule, m, current, decisions));
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("staff_id", s.getId());
            row.put("staff_code", s.getStaffId());
            row.put("name", s.getName());
            row.put("role", s.getRole());
            row.put("department", s.getDepartment());
            row.put("branch", s.getBranch());
            row.put("photo_url", s.getPhotoUrl());
            row.put("rule", ruleMap(rule));
            row.put("months", perMonth);
            rows.add(row);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("periods", months.stream().map(YearMonth::toString).toList());
        out.put("current_period", current.toString());
        out.put("rows", rows);
        return out;
    }

    private Map<String, Object> month(Staff s, Optional<CommissionRule> rule, YearMonth m, YearMonth current,
                                      Map<String, CommissionEarning> decisions) {
        LocalDateTime start = m.atDay(1).atStartOfDay();
        LocalDateTime end = m.plusMonths(1).atDay(1).atStartOfDay();
        String username = s.getAppUsername() != null ? s.getAppUsername() : "";
        Map<String, Integer> units = calculator.computeUnits(s, username, start, end);
        BigDecimal membershipRevenue = calculator.computeMembershipRevenue(s, username, start, end);
        BigDecimal admissionRevenue = calculator.computeRevenue(s, username, start, end, "New");
        BigDecimal otherRevenue = membershipRevenue.subtract(admissionRevenue).max(BigDecimal.ZERO);
        BigDecimal membershipCommission = calculator.commissionOn(admissionRevenue, calculator.admissionCommissionRate(rule))
                .add(calculator.commissionOn(otherRevenue, calculator.baseCommissionRate(rule)));
        BigDecimal posRevenue = calculator.computePosRevenue(username, start, end);
        BigDecimal posCommission = calculator.computePosCommission(s, username, start, end);

        StaffTarget target = targetRepository.findByStaffIdAndYearAndMonth(s.getId(), m.getYear(), m.getMonthValue())
                .stream().findFirst().orElse(null);
        BigDecimal revenueTarget = target != null && target.getRevenueTarget() != null ? target.getRevenueTarget()
                : s.getMonthlyTarget() != null ? s.getMonthlyTarget() : BigDecimal.ZERO;

        int membershipUnits = units.getOrDefault("admissions", 0) + units.getOrDefault("renewals", 0)
                + units.getOrDefault("addons", 0) + units.getOrDefault("walkins", 0);
        List<Map<String, Object>> categories = List.of(
                category(s.getId(), m, current, "memberships", membershipUnits, membershipRevenue, membershipCommission, decisions),
                category(s.getId(), m, current, "pos", units.getOrDefault("pos_sales", 0), posRevenue, posCommission, decisions));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("period", m.toString());
        out.put("target_id", target != null ? target.getId() : null);
        out.put("revenue_target", revenueTarget);
        out.put("revenue", membershipRevenue.add(posRevenue));
        out.put("unit_targets", unitTargets(target));
        out.put("units", units);
        out.put("categories", categories);
        return out;
    }

    private static Map<String, Object> category(Long staffId, YearMonth m, YearMonth current, String category, int units,
                                                BigDecimal revenue, BigDecimal computed, Map<String, CommissionEarning> decisions) {
        CommissionEarning d = decisions.get(decisionKey(staffId, m, category));
        String status = d != null ? d.getStatus() : m.isBefore(current) ? "pending" : "estimated";
        BigDecimal amount = d != null && List.of("approved", "paid").contains(d.getStatus()) ? d.getAmount()
                : "rejected".equals(status) ? BigDecimal.ZERO : computed;
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("category", category);
        c.put("units", units);
        c.put("revenue", revenue);
        c.put("computed_commission", computed);
        c.put("commission", amount);
        c.put("status", status);
        c.put("note", d != null ? d.getNote() : null);
        c.put("reviewed_by", d != null ? d.getReviewedBy() : null);
        c.put("reviewed_at", d != null && d.getReviewedAt() != null ? d.getReviewedAt().toString() : null);
        c.put("paid_at", d != null && d.getPaidAt() != null ? d.getPaidAt().toString() : null);
        c.put("payroll_run_id", d != null ? d.getPayrollRunId() : null);
        return c;
    }

    private List<Map<String, Object>> unitTargets(StaffTarget t) {
        if (t == null || t.getUnitTargetsJson() == null || t.getUnitTargetsJson().isBlank()) return List.of();
        try {
            return objectMapper.readValue(t.getUnitTargetsJson(), new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private Map<String, Object> ruleMap(Optional<CommissionRule> rule) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("configured", rule.isPresent());
        m.put("role", rule.map(CommissionRule::getRole).orElse(null));
        m.put("base_commission", calculator.baseCommissionRate(rule));
        m.put("admission_commission", calculator.admissionCommissionRate(rule));
        m.put("pos_commission", rule.map(CommissionRule::getPosCommission).orElse(null));
        m.put("pos_commission_per_sale", rule.map(CommissionRule::getPosCommissionPerSale).orElse(null));
        return m;
    }

    private static String decisionKey(Long staffId, YearMonth m, String category) {
        return staffId + "|" + m + "|" + category;
    }

    // ── Decisions ────────────────────────────────────────────────────────────

    /** action: approve | reject | pay | reset */
    public void decide(Long staffId, YearMonth period, String category, String action, String note) {
        if (!CATEGORIES.contains(category)) throw new BusinessRuleViolationException("Unknown commission category");
        Staff s = staffRepository.findById(staffId).orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        Optional<CommissionEarning> existing = earningRepository.findByStaffIdAndPeriodYearAndPeriodMonthAndCategory(
                staffId, period.getYear(), period.getMonthValue(), category);
        String status = existing.map(CommissionEarning::getStatus).orElse(null);
        if ("paid".equals(status) && !"pay".equals(action)) {
            throw new BusinessRuleViolationException("This commission has already been paid");
        }
        switch (action) {
            case "reset" -> existing.ifPresent(earningRepository::delete);
            case "approve", "reject" -> {
                if (!period.isBefore(YearMonth.now())) {
                    throw new BusinessRuleViolationException("Commission can be approved once the month has ended");
                }
                CommissionEarning e = existing.orElseGet(CommissionEarning::new);
                e.setStaffId(staffId);
                e.setPeriodYear(period.getYear());
                e.setPeriodMonth(period.getMonthValue());
                e.setCategory(category);
                e.setAmount("approve".equals(action) ? computeCategory(s, period, category) : BigDecimal.ZERO);
                e.setStatus("approve".equals(action) ? "approved" : "rejected");
                e.setNote(note);
                e.setReviewedBy(StaffAttendanceReviewService.currentUser());
                e.setReviewedAt(LocalDateTime.now());
                if (e.getBranchId() == null) e.setBranchId(s.getBranchId());
                earningRepository.save(e);
            }
            case "pay" -> {
                CommissionEarning e = existing.filter(x -> "approved".equals(x.getStatus()))
                        .orElseThrow(() -> new BusinessRuleViolationException("Approve the commission before marking it paid"));
                e.setStatus("paid");
                e.setPaidAt(LocalDateTime.now());
                if (note != null) e.setNote(note);
                earningRepository.save(e);
            }
            default -> throw new BusinessRuleViolationException("Unknown action " + action);
        }
    }

    /** Approves every pending, non-zero commission of a closed month. */
    public int approveAll(YearMonth period) {
        if (!period.isBefore(YearMonth.now())) {
            throw new BusinessRuleViolationException("Commission can be approved once the month has ended");
        }
        int approved = 0;
        for (Staff s : attendance.workforce()) {
            for (String category : CATEGORIES) {
                boolean decided = earningRepository.findByStaffIdAndPeriodYearAndPeriodMonthAndCategory(
                        s.getId(), period.getYear(), period.getMonthValue(), category).isPresent();
                if (decided) continue;
                BigDecimal amount = computeCategory(s, period, category);
                if (amount.signum() <= 0) continue;
                CommissionEarning e = new CommissionEarning();
                e.setStaffId(s.getId());
                e.setPeriodYear(period.getYear());
                e.setPeriodMonth(period.getMonthValue());
                e.setCategory(category);
                e.setAmount(amount);
                e.setStatus("approved");
                e.setReviewedBy(StaffAttendanceReviewService.currentUser());
                e.setReviewedAt(LocalDateTime.now());
                e.setBranchId(s.getBranchId());
                earningRepository.save(e);
                approved++;
            }
        }
        return approved;
    }

    public BigDecimal computeCategory(Staff s, YearMonth m, String category) {
        LocalDateTime start = m.atDay(1).atStartOfDay();
        LocalDateTime end = m.plusMonths(1).atDay(1).atStartOfDay();
        String username = s.getAppUsername() != null ? s.getAppUsername() : "";
        if ("pos".equals(category)) return calculator.computePosCommission(s, username, start, end);
        Optional<CommissionRule> rule = calculator.findCommissionRule(s);
        BigDecimal membership = calculator.computeMembershipRevenue(s, username, start, end);
        BigDecimal admission = calculator.computeRevenue(s, username, start, end, "New");
        return calculator.commissionOn(admission, calculator.admissionCommissionRate(rule))
                .add(calculator.commissionOn(membership.subtract(admission).max(BigDecimal.ZERO), calculator.baseCommissionRate(rule)));
    }

    // ── Payroll hooks ────────────────────────────────────────────────────────

    /** Approved, not yet paid commission for the month, per staff id and category. */
    @Transactional(readOnly = true)
    public Map<Long, Map<String, BigDecimal>> approvedForPeriod(YearMonth period) {
        Map<Long, Map<String, BigDecimal>> out = new LinkedHashMap<>();
        for (CommissionEarning e : earningRepository.findByPeriodYearAndPeriodMonthAndStatusIn(
                period.getYear(), period.getMonthValue(), List.of("approved"))) {
            out.computeIfAbsent(e.getStaffId(), k -> new LinkedHashMap<>()).merge(e.getCategory(), e.getAmount(), BigDecimal::add);
        }
        return out;
    }

    /** Commission of the month still waiting for a decision, per staff id (shown as a payroll warning). */
    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> undecidedForPeriod(YearMonth period) {
        Map<Long, BigDecimal> out = new LinkedHashMap<>();
        for (Staff s : attendance.workforce()) {
            BigDecimal total = BigDecimal.ZERO;
            for (String category : CATEGORIES) {
                boolean decided = earningRepository.findByStaffIdAndPeriodYearAndPeriodMonthAndCategory(
                        s.getId(), period.getYear(), period.getMonthValue(), category).isPresent();
                if (!decided) total = total.add(computeCategory(s, period, category));
            }
            if (total.signum() > 0) out.put(s.getId(), total);
        }
        return out;
    }

    /** Marks one employee's approved commission for the month paid by a salary payment made without payroll. */
    public void markPaidBySalaryPayment(YearMonth period, Long staffId) {
        for (CommissionEarning e : earningRepository.findByPeriodYearAndPeriodMonthAndStatusIn(
                period.getYear(), period.getMonthValue(), List.of("approved"))) {
            if (!e.getStaffId().equals(staffId)) continue;
            e.setStatus("paid");
            e.setPaidAt(LocalDateTime.now());
            earningRepository.save(e);
        }
    }

    /** Marks the month's approved commission paid by the given payroll run. */
    public void markPaidByPayroll(YearMonth period, Long runId, List<Long> staffIds) {
        for (CommissionEarning e : earningRepository.findByPeriodYearAndPeriodMonthAndStatusIn(
                period.getYear(), period.getMonthValue(), List.of("approved"))) {
            if (!staffIds.contains(e.getStaffId())) continue;
            e.setStatus("paid");
            e.setPaidAt(LocalDateTime.now());
            e.setPayrollRunId(runId);
            earningRepository.save(e);
        }
    }
}
