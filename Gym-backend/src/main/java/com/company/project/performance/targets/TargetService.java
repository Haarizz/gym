package com.company.project.performance.targets;

import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;
import com.company.project.security.BranchContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.*;

/** Setting targets (plan §5.1). Monthly only; a target is replaced as a whole when saved again. */
@Service
@Transactional
public class TargetService {

    private final TargetRepository repository;
    private final PerformanceEngine engine;

    public TargetService(TargetRepository repository, PerformanceEngine engine) {
        this.repository = repository;
        this.engine = engine;
    }

    public record LineRequest(String metric, String measure, BigDecimal goal) {}

    public record TargetRequest(String scope, Long staffId, String role, Long branchId, String period,
                                Boolean repeatMonthly, List<LineRequest> lines) {}

    /** Targets set for the month itself, plus the repeating ones still in force for it. */
    @Transactional(readOnly = true)
    public List<Target> applicable(YearMonth month) {
        return repository.findApplicableTo(month.atDay(1)).stream()
                .sorted(Comparator.comparing(Target::getScope).thenComparing(Target::getPeriodStart, Comparator.reverseOrder()))
                .toList();
    }

    public Target save(TargetRequest req) {
        if (req.period() == null) throw new BusinessRuleViolationException("Month is required");
        YearMonth month = YearMonth.parse(req.period());
        String scope = req.scope() == null ? Target.SCOPE_STAFF : req.scope().trim().toLowerCase();
        Long staffId = null;
        String role = null;
        Long branchId = req.branchId() != null ? req.branchId() : BranchContextHolder.getActiveBranchId();
        switch (scope) {
            case Target.SCOPE_STAFF -> {
                if (req.staffId() == null) throw new BusinessRuleViolationException("Choose a staff member");
                PerformanceEngine.StaffInfo s = engine.staffInfo(List.of(req.staffId())).get(req.staffId());
                if (s == null) throw new EntityNotFoundException("Employee not found");
                staffId = s.id();
                branchId = s.branchId();
            }
            case Target.SCOPE_ROLE -> {
                if (req.role() == null || req.role().isBlank()) throw new BusinessRuleViolationException("Choose a role");
                role = req.role().trim();
            }
            case Target.SCOPE_BRANCH -> {
                if (branchId == null) throw new BusinessRuleViolationException("Choose a branch");
            }
            default -> throw new BusinessRuleViolationException("Unknown target scope " + req.scope());
        }

        Map<String, TargetLine> lines = new LinkedHashMap<>();
        for (LineRequest l : req.lines() != null ? req.lines() : List.<LineRequest>of()) {
            if (l.goal() == null || l.goal().signum() <= 0) continue; // 0 / blank = no goal
            Metric metric = Metric.require(l.metric());
            Measure measure = Measure.parse(l.measure());
            if (!metric.supports(measure)) {
                throw new BusinessRuleViolationException(metric.label() + " has no " + measure.code() + " to target");
            }
            TargetLine line = new TargetLine();
            line.setMetric(metric.name());
            line.setMeasure(measure.code());
            line.setGoal(l.goal());
            lines.put(metric.name() + "|" + measure.code(), line);
        }

        Long fStaff = staffId;
        String fRole = role;
        Long fBranch = branchId;
        Target target = repository.findForMonth(month.atDay(1)).stream()
                .filter(t -> t.getScope().equals(scope) && Objects.equals(t.getStaffId(), fStaff)
                        && Objects.equals(t.getBranchId(), fBranch)
                        && Objects.equals(t.getRole() == null ? null : t.getRole().toLowerCase(), fRole == null ? null : fRole.toLowerCase()))
                .findFirst().orElse(null);
        if (lines.isEmpty()) {
            if (target != null) repository.delete(target);
            return null;
        }
        if (target == null) {
            target = new Target();
            target.setScope(scope);
            target.setStaffId(staffId);
            target.setRole(role);
            target.setBranchId(branchId);
            target.setPeriodStart(month.atDay(1));
            target.setPeriodEnd(month.atEndOfMonth());
        }
        target.setRepeatMonthly(Boolean.TRUE.equals(req.repeatMonthly()));
        // Update matching lines in place. Clearing and re-adding would fail on uq_target_line,
        // because Hibernate flushes the new inserts before the orphan deletes.
        Iterator<TargetLine> it = target.getLines().iterator();
        while (it.hasNext()) {
            TargetLine existing = it.next();
            TargetLine wanted = lines.remove(existing.getMetric() + "|" + existing.getMeasure());
            if (wanted == null) it.remove();
            else existing.setGoal(wanted.getGoal());
        }
        for (TargetLine l : lines.values()) {
            l.setTarget(target);
            target.getLines().add(l);
        }
        return repository.save(target);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    /** Copies every target set for {@code from} into {@code to}, leaving targets {@code to} already has. */
    public int copy(YearMonth from, YearMonth to) {
        List<Target> existing = repository.findForMonth(to.atDay(1));
        int copied = 0;
        for (Target t : repository.findForMonth(from.atDay(1))) {
            boolean taken = existing.stream().anyMatch(e -> TargetResolver.scopeKey(e).equals(TargetResolver.scopeKey(t)));
            if (taken) continue;
            Target c = new Target();
            c.setScope(t.getScope());
            c.setStaffId(t.getStaffId());
            c.setRole(t.getRole());
            c.setBranchId(t.getBranchId());
            c.setPeriodStart(to.atDay(1));
            c.setPeriodEnd(to.atEndOfMonth());
            c.setRepeatMonthly(t.isRepeatMonthly());
            for (TargetLine l : t.getLines()) {
                TargetLine n = new TargetLine();
                n.setTarget(c);
                n.setMetric(l.getMetric());
                n.setMeasure(l.getMeasure());
                n.setGoal(l.getGoal());
                c.getLines().add(n);
            }
            repository.save(c);
            copied++;
        }
        return copied;
    }
}
