package com.company.project.performance.settlement;

import com.company.project.entities.CommissionEarning;
import com.company.project.entities.Staff;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.performance.PerformanceClock;
import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.PeriodResult;
import com.company.project.performance.attribution.StaffAttribution;
import com.company.project.repositories.CommissionEarningRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.services.ShiftAttendanceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

/**
 * Commission decisions and the payroll hooks (plan §6, Phase 3). One decision per staff member
 * and month: approve freezes the engine's amount (plus an optional adjustment explained in the
 * note) with a snapshot of the breakdown and plan version; reject earns nothing; pay marks it
 * paid (normally done by a disbursed payroll run); reset reopens an undecided-looking month.
 *
 * Months decided before V119 may hold separate memberships / pos rows; actions apply to all of
 * a month's rows together.
 */
@Service
@Transactional
public class SettlementService {

    public static final String CATEGORY = "total";

    private final PerformanceEngine engine;
    private final CommissionEarningRepository repository;
    private final StaffRepository staffRepository;
    private final ShiftAttendanceService attendance;
    private final PerformanceClock clock;
    private final ObjectMapper objectMapper;

    public SettlementService(PerformanceEngine engine, CommissionEarningRepository repository, StaffRepository staffRepository,
                             ShiftAttendanceService attendance, PerformanceClock clock, ObjectMapper objectMapper) {
        this.engine = engine;
        this.repository = repository;
        this.staffRepository = staffRepository;
        this.attendance = attendance;
        this.clock = clock;
        this.objectMapper = objectMapper;
    }

    /** action: approve | reject | pay | reset. adjustment (approve only) is added to the calculated amount. */
    public SettlementView decide(Long staffId, YearMonth period, String action, String note, BigDecimal adjustment) {
        Staff s = staffRepository.findById(staffId).orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        List<CommissionEarning> rows = rows(staffId, period);
        boolean anyPaid = rows.stream().anyMatch(r -> SettlementView.PAID.equals(r.getStatus()));
        boolean allPaid = !rows.isEmpty() && rows.stream().allMatch(r -> SettlementView.PAID.equals(r.getStatus()));
        switch (action) {
            case "reset" -> {
                if (anyPaid) throw new BusinessRuleViolationException("This commission has already been paid");
                repository.deleteAll(rows);
            }
            case "approve", "reject" -> {
                if (anyPaid) throw new BusinessRuleViolationException("This commission has already been paid");
                requireEnded(period);
                PeriodResult estimate = estimate(staffId, period, rows);
                CommissionEarning e = new CommissionEarning();
                e.setStaffId(staffId);
                e.setPeriodYear(period.getYear());
                e.setPeriodMonth(period.getMonthValue());
                e.setCategory(CATEGORY);
                boolean approve = "approve".equals(action);
                BigDecimal computed = estimate.incentive().total();
                BigDecimal adj = approve && adjustment != null && adjustment.signum() != 0 ? adjustment.setScale(2, RoundingMode.HALF_UP) : null;
                if (adj != null && (note == null || note.isBlank())) {
                    throw new BusinessRuleViolationException("Explain the adjustment in the note");
                }
                BigDecimal amount = approve ? computed.add(adj != null ? adj : BigDecimal.ZERO) : BigDecimal.ZERO;
                if (amount.signum() < 0) throw new BusinessRuleViolationException("The adjusted commission can't be negative");
                e.setComputedAmount(computed);
                e.setAdjustmentAmount(adj);
                e.setAmount(amount);
                e.setStatus(approve ? SettlementView.APPROVED : SettlementView.REJECTED);
                e.setNote(note);
                e.setPlanId(estimate.incentive().planId());
                e.setBreakdownJson(snapshot(estimate));
                e.setReviewedBy(StaffAttribution.currentLogin());
                e.setReviewedAt(LocalDateTime.now());
                e.setBranchId(s.getBranchId());
                repository.save(e);
            }
            case "pay" -> {
                if (allPaid) throw new BusinessRuleViolationException("This commission has already been paid");
                List<CommissionEarning> approved = rows.stream().filter(r -> SettlementView.APPROVED.equals(r.getStatus())).toList();
                if (approved.isEmpty()) throw new BusinessRuleViolationException("Approve the commission before marking it paid");
                for (CommissionEarning e : approved) {
                    e.setStatus(SettlementView.PAID);
                    e.setPaidAt(LocalDateTime.now());
                    if (note != null) e.setNote(note);
                }
                repository.saveAll(approved);
            }
            default -> throw new BusinessRuleViolationException("Unknown action " + action);
        }
        return engine.evaluate(staffId, period).settlement();
    }

    /** Approves every undecided, non-zero month of a closed period. */
    public int approveAll(YearMonth period) {
        requireEnded(period);
        List<Long> ids = attendance.workforce().stream().map(Staff::getId).toList();
        Map<Long, PeriodResult> results = engine.evaluate(ids, period);
        int approved = 0;
        for (PeriodResult r : results.values()) {
            if (r.settlement().isDecided() || r.incentive().total().signum() <= 0) continue;
            decide(r.staffId(), period, "approve", null, null);
            approved++;
        }
        return approved;
    }

    // ── Payroll hooks ────────────────────────────────────────────────────────

    /** Approved, not yet paid commission for the month, per staff id and category. */
    @Transactional(readOnly = true)
    public Map<Long, Map<String, BigDecimal>> approvedForPeriod(YearMonth period) {
        Map<Long, Map<String, BigDecimal>> out = new LinkedHashMap<>();
        for (CommissionEarning e : repository.findByPeriodYearAndPeriodMonthAndStatusIn(
                period.getYear(), period.getMonthValue(), List.of(SettlementView.APPROVED))) {
            out.computeIfAbsent(e.getStaffId(), k -> new LinkedHashMap<>()).merge(e.getCategory(), e.getAmount(), BigDecimal::add);
        }
        return out;
    }

    /** Commission of the month still waiting for a decision, per staff id (shown as a payroll warning). */
    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> undecidedForPeriod(YearMonth period) {
        Map<Long, BigDecimal> out = new LinkedHashMap<>();
        List<Long> ids = attendance.workforce().stream().map(Staff::getId).toList();
        for (PeriodResult r : engine.evaluate(ids, period).values()) {
            if (!r.settlement().isDecided() && r.incentive().total().signum() > 0) out.put(r.staffId(), r.incentive().total());
        }
        return out;
    }

    /** Marks one employee's approved commission for the month paid by a salary payment made without payroll. */
    public void markPaidBySalaryPayment(YearMonth period, Long staffId) {
        markPaid(period, null, List.of(staffId), null);
    }

    public void markPaidByPayroll(YearMonth period, Long runId, List<Long> staffIds) {
        markPaid(period, runId, staffIds, null);
    }

    /** As above, limited to the categories the payroll line included (null = all). */
    public void markPaidByPayroll(YearMonth period, Long runId, List<Long> staffIds, List<String> categories) {
        markPaid(period, runId, staffIds, categories);
    }

    private void markPaid(YearMonth period, Long runId, List<Long> staffIds, List<String> categories) {
        for (CommissionEarning e : repository.findByPeriodYearAndPeriodMonthAndStatusIn(
                period.getYear(), period.getMonthValue(), List.of(SettlementView.APPROVED))) {
            if (!staffIds.contains(e.getStaffId())) continue;
            if (categories != null && !categories.contains(e.getCategory())) continue;
            e.setStatus(SettlementView.PAID);
            e.setPaidAt(LocalDateTime.now());
            if (runId != null) e.setPayrollRunId(runId);
            repository.save(e);
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private List<CommissionEarning> rows(Long staffId, YearMonth period) {
        List<CommissionEarning> out = new ArrayList<>();
        for (CommissionEarning e : repository.findByPeriodYearAndPeriodMonth(period.getYear(), period.getMonthValue())) {
            if (staffId.equals(e.getStaffId())) out.add(e);
        }
        return out;
    }

    /** The live calculation for the month, ignoring any decision already on it (re-approving recalculates). */
    private PeriodResult estimate(Long staffId, YearMonth period, List<CommissionEarning> rows) {
        if (rows.isEmpty()) return engine.evaluate(staffId, period);
        // Decided rows make the engine return the frozen figures; drop them for the recalculation.
        List<CommissionEarning> copy = new ArrayList<>(rows);
        repository.deleteAll(copy);
        repository.flush();
        return engine.evaluate(staffId, period);
    }

    private void requireEnded(YearMonth period) {
        if (!period.isBefore(clock.currentMonth(null))) {
            throw new BusinessRuleViolationException("Commission can be approved once the month has ended");
        }
    }

    private String snapshot(PeriodResult r) {
        try {
            return objectMapper.writeValueAsString(r.incentive());
        } catch (Exception e) {
            return null;
        }
    }
}
