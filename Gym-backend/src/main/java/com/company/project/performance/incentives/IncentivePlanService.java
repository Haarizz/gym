package com.company.project.performance.incentives;

import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.performance.metric.Metric;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * Editing incentive plans (plan §5.2). A plan no settled month was approved under can be edited
 * in place. Once a month has been approved under it, changing rates means a new version from a
 * later month: the old version ends the month before, so past months keep their rates.
 */
@Service
@Transactional
public class IncentivePlanService {

    @PersistenceContext
    private EntityManager em;

    private final IncentivePlanRepository repository;

    public IncentivePlanService(IncentivePlanRepository repository) {
        this.repository = repository;
    }

    public record LineRequest(String metric, String basis, BigDecimal rate, Integer minUnits, BigDecimal capAmount) {}

    public record BonusRequest(String metric, BigDecimal thresholdPct, String rewardType, BigDecimal rewardValue,
                               String conditionMetric, BigDecimal conditionMin) {}

    public record AssignmentRequest(String role, Long staffId) {}

    public record PlanRequest(String name, Long branchId, String effectiveFrom, String status,
                              List<AssignmentRequest> assignments, List<LineRequest> lines, List<BonusRequest> bonuses) {}

    @Transactional(readOnly = true)
    public List<IncentivePlan> list() {
        List<IncentivePlan> plans = repository.findAllWithAssignments();
        plans.forEach(p -> { p.getLines().size(); p.getBonuses().size(); });
        return plans;
    }

    @Transactional(readOnly = true)
    public IncentivePlan get(Long id) {
        IncentivePlan p = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Incentive plan not found"));
        p.getAssignments().size();
        p.getLines().size();
        p.getBonuses().size();
        return p;
    }

    /** Months approved (or paid) under this plan. */
    @Transactional(readOnly = true)
    public long settledMonths(Long planId) {
        return ((Number) em.createNativeQuery("SELECT COUNT(*) FROM commission_earnings WHERE plan_id = :p")
                .setParameter("p", planId).getSingleResult()).longValue();
    }

    /**
     * The plan as it would be saved, validated the same way, but never stored. Used to preview
     * what a plan would pay before saving it.
     */
    @Transactional(readOnly = true)
    public IncentivePlan draft(PlanRequest req) {
        IncentivePlan p = new IncentivePlan();
        apply(p, req.name() == null || req.name().isBlank()
                ? new PlanRequest("Preview", req.branchId(), req.effectiveFrom(), req.status(), req.assignments(), req.lines(), req.bonuses())
                : req);
        return p;
    }

    public IncentivePlan create(PlanRequest req) {
        IncentivePlan p = new IncentivePlan();
        apply(p, req);
        return repository.save(p);
    }

    public IncentivePlan update(Long id, PlanRequest req) {
        IncentivePlan p = get(id);
        if (settledMonths(id) > 0) {
            throw new BusinessRuleViolationException(
                    "Months have already been approved under this plan. Create a new version from a later month instead.");
        }
        apply(p, req);
        return repository.save(p);
    }

    /**
     * A new version of the plan from {@code req.effectiveFrom} (a later month than the current
     * version's start). The current version ends the day before.
     */
    public IncentivePlan newVersion(Long id, PlanRequest req) {
        IncentivePlan current = get(id);
        LocalDate from = firstOfMonth(req.effectiveFrom());
        if (!from.isAfter(current.getEffectiveFrom())) {
            throw new BusinessRuleViolationException("A new version must start after " + YearMonth.from(current.getEffectiveFrom()));
        }
        IncentivePlan next = new IncentivePlan();
        apply(next, req);
        next.setEffectiveFrom(from);
        current.setEffectiveTo(from.minusDays(1));
        repository.save(current);
        return repository.save(next);
    }

    /** Archives a plan months were settled under (they keep showing it); deletes one never used. */
    public void delete(Long id) {
        IncentivePlan p = get(id);
        if (settledMonths(id) > 0) {
            p.setStatus(IncentivePlan.ARCHIVED);
            repository.save(p);
        } else {
            repository.delete(p);
        }
    }

    private void apply(IncentivePlan p, PlanRequest req) {
        if (req.name() == null || req.name().isBlank()) throw new BusinessRuleViolationException("Plan name is required");
        p.setName(req.name().trim());
        p.setBranchId(req.branchId());
        p.setEffectiveFrom(req.effectiveFrom() != null ? firstOfMonth(req.effectiveFrom())
                : p.getEffectiveFrom() != null ? p.getEffectiveFrom() : YearMonth.now().atDay(1));
        String status = req.status() != null ? req.status().trim().toLowerCase() : IncentivePlan.ACTIVE;
        if (!List.of(IncentivePlan.DRAFT, IncentivePlan.ACTIVE, IncentivePlan.ARCHIVED).contains(status)) {
            throw new BusinessRuleViolationException("Unknown plan status " + req.status());
        }
        p.setStatus(status);

        p.getAssignments().clear();
        for (AssignmentRequest a : req.assignments() != null ? req.assignments() : List.<AssignmentRequest>of()) {
            boolean hasRole = a.role() != null && !a.role().isBlank();
            if (!hasRole && a.staffId() == null) continue;
            IncentivePlanAssignment x = new IncentivePlanAssignment();
            x.setPlan(p);
            x.setStaffId(a.staffId());
            x.setRole(a.staffId() == null ? a.role().trim() : null);
            p.getAssignments().add(x);
        }

        p.getLines().clear();
        for (LineRequest l : req.lines() != null ? req.lines() : List.<LineRequest>of()) {
            Metric metric = Metric.require(l.metric());
            if (metric.isVirtual()) throw new BusinessRuleViolationException("Commission lines need a specific metric");
            String basis = l.basis() != null ? l.basis().trim().toLowerCase() : "";
            if (!List.of(IncentivePlanLine.PERCENT_OF_AMOUNT, IncentivePlanLine.FIXED_PER_UNIT).contains(basis)) {
                throw new BusinessRuleViolationException("Unknown commission basis " + l.basis());
            }
            if (IncentivePlanLine.PERCENT_OF_AMOUNT.equals(basis) && !metric.hasAmount()) {
                throw new BusinessRuleViolationException(metric.label() + " has no money amount: pay it per unit");
            }
            if (l.rate() == null || l.rate().signum() < 0) throw new BusinessRuleViolationException("Rate can't be negative");
            if (l.rate().signum() == 0) continue;
            if (IncentivePlanLine.PERCENT_OF_AMOUNT.equals(basis) && l.rate().compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new BusinessRuleViolationException("A percentage can't exceed 100");
            }
            IncentivePlanLine x = new IncentivePlanLine();
            x.setPlan(p);
            x.setMetric(metric.name());
            x.setBasis(basis);
            x.setRate(l.rate());
            x.setMinUnits(l.minUnits() != null && l.minUnits() > 0 ? l.minUnits() : null);
            x.setCapAmount(l.capAmount() != null && l.capAmount().signum() > 0 ? l.capAmount() : null);
            p.getLines().add(x);
        }

        p.getBonuses().clear();
        for (BonusRequest b : req.bonuses() != null ? req.bonuses() : List.<BonusRequest>of()) {
            Metric metric = Metric.require(b.metric());
            if (b.thresholdPct() == null || b.thresholdPct().signum() <= 0) {
                throw new BusinessRuleViolationException("A bonus needs a target threshold above 0%");
            }
            String reward = b.rewardType() != null ? b.rewardType().trim().toLowerCase() : "";
            if (!List.of(IncentivePlanBonus.FIXED, IncentivePlanBonus.PERCENT_OF_METRIC_AMOUNT).contains(reward)) {
                throw new BusinessRuleViolationException("Unknown bonus reward " + b.rewardType());
            }
            if (IncentivePlanBonus.PERCENT_OF_METRIC_AMOUNT.equals(reward) && !metric.hasAmount()) {
                throw new BusinessRuleViolationException(metric.label() + " has no money amount: use a fixed bonus");
            }
            if (b.rewardValue() == null || b.rewardValue().signum() <= 0) continue;
            IncentivePlanBonus x = new IncentivePlanBonus();
            x.setPlan(p);
            x.setTriggerType(IncentivePlanBonus.TARGET_ATTAINMENT);
            x.setMetric(metric.name());
            x.setThresholdPct(b.thresholdPct());
            x.setRewardType(reward);
            x.setRewardValue(b.rewardValue());
            if (b.conditionMetric() != null && !b.conditionMetric().isBlank() && b.conditionMin() != null) {
                x.setConditionMetric(Metric.require(b.conditionMetric()).name());
                x.setConditionMin(b.conditionMin());
            }
            p.getBonuses().add(x);
        }
    }

    private static LocalDate firstOfMonth(String value) {
        if (value == null || value.isBlank()) throw new BusinessRuleViolationException("Effective month is required");
        String v = value.trim();
        return v.length() == 7 ? YearMonth.parse(v).atDay(1) : YearMonth.from(LocalDate.parse(v)).atDay(1);
    }
}
