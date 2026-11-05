package com.company.project.performance.api;

import com.company.project.entities.Staff;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.performance.PerformanceClock;
import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.PeriodResult;
import com.company.project.performance.attribution.UnassignedService;
import com.company.project.performance.events.PerformanceEvent;
import com.company.project.performance.events.PerformanceEventRebuilder;
import com.company.project.performance.events.PerformanceEventRepository;
import com.company.project.performance.events.PerformanceParityService;
import com.company.project.performance.incentives.IncentivePlan;
import com.company.project.performance.incentives.IncentivePlanService;
import com.company.project.performance.settlement.SettlementService;
import com.company.project.performance.targets.Target;
import com.company.project.performance.targets.TargetService;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.ShiftAttendanceService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

/**
 * Performance & incentives API (plan §6 api/): the targets board, commission review, incentive
 * plan editor, unassigned sales, and each person's own figures. Everything reads
 * {@link PerformanceEngine}.
 */
@RestController
@RequestMapping("/api/performance")
public class PerformanceController {

    @PersistenceContext
    private EntityManager em;

    private final PerformanceEngine engine;
    private final SettlementService settlements;
    private final TargetService targets;
    private final IncentivePlanService plans;
    private final UnassignedService unassigned;
    private final PerformanceEventRebuilder rebuilder;
    private final PerformanceEventRepository events;
    private final PerformanceParityService parity;
    private final ShiftAttendanceService attendance;
    private final StaffRepository staffRepository;
    private final PerformanceClock clock;

    public PerformanceController(PerformanceEngine engine, SettlementService settlements, TargetService targets,
                                 IncentivePlanService plans, UnassignedService unassigned, PerformanceEventRebuilder rebuilder,
                                 PerformanceEventRepository events, PerformanceParityService parity,
                                 ShiftAttendanceService attendance, StaffRepository staffRepository, PerformanceClock clock) {
        this.engine = engine;
        this.settlements = settlements;
        this.targets = targets;
        this.plans = plans;
        this.unassigned = unassigned;
        this.rebuilder = rebuilder;
        this.events = events;
        this.parity = parity;
        this.attendance = attendance;
        this.staffRepository = staffRepository;
        this.clock = clock;
    }

    @GetMapping("/metrics")
    public List<Map<String, Object>> metrics() {
        return PerformanceViews.metrics();
    }

    // ── Overview (targets board + commission review) ─────────────────────────

    /** from / to are yyyy-MM (at most 12 months; future months are left out). */
    @GetMapping("/overview")
    @Transactional(readOnly = true)
    public Map<String, Object> overview(@RequestParam String from, @RequestParam String to,
                                        @RequestParam(name = "staff_id", required = false) Long staffId) {
        YearMonth current = clock.currentMonth(null);
        YearMonth f = YearMonth.parse(from);
        YearMonth t = YearMonth.parse(to);
        if (t.isAfter(current)) t = current;
        if (f.isAfter(t)) f = t;
        if (f.plusMonths(11).isBefore(t)) f = t.minusMonths(11);

        List<Staff> staff = attendance.workforce().stream()
                .filter(s -> staffId == null || staffId.equals(s.getId())).toList();
        List<Long> ids = staff.stream().map(Staff::getId).toList();
        Map<YearMonth, Map<Long, PeriodResult>> results = engine.evaluate(ids, f, t);
        Map<Long, IncentivePlan> planByStaff = engine.plansFor(ids, t);

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Staff s : staff) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("staff_id", s.getId());
            row.put("staff_code", s.getStaffId());
            row.put("name", s.getName());
            row.put("role", s.getRole());
            row.put("department", s.getDepartment());
            row.put("branch", s.getBranch());
            row.put("photo_url", s.getPhotoUrl());
            IncentivePlan plan = planByStaff.get(s.getId());
            row.put("plan", plan != null ? Map.of("id", plan.getId(), "name", plan.getName()) : null);
            List<Map<String, Object>> months = new ArrayList<>();
            results.forEach((m, byStaff) -> {
                PeriodResult r = byStaff.get(s.getId());
                if (r != null) months.add(PerformanceViews.period(r));
            });
            row.put("months", months);
            rows.add(row);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("periods", results.keySet().stream().map(YearMonth::toString).toList());
        out.put("current_period", current.toString());
        out.put("rows", rows);
        out.put("branch", PerformanceViews.branch(engine.evaluateBranch(BranchContextHolder.getActiveBranchId(), t)));
        return out;
    }

    @GetMapping("/branch")
    public Map<String, Object> branch(@RequestParam String period) {
        return PerformanceViews.branch(engine.evaluateBranch(BranchContextHolder.getActiveBranchId(), YearMonth.parse(period)));
    }

    /** The signed-in staff member's own month (web My Targets, mobile). */
    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<?> me(@AuthenticationPrincipal UserDetailsImpl principal,
                                @RequestParam(required = false) String period) {
        if (principal == null) return ResponseEntity.status(401).body("Not authenticated");
        Staff s = staffRepository.findByUserId(principal.getId()).orElse(null);
        if (s == null) return ResponseEntity.status(404).body("No staff record linked to this account.");
        YearMonth m = period != null ? YearMonth.parse(period) : clock.currentMonth(null);
        PeriodResult r = engine.evaluate(s.getId(), m);
        Map<String, Object> out = PerformanceViews.period(r);
        IncentivePlan plan = engine.planFor(s.getId(), m);
        out.put("staff_id", s.getId());
        out.put("name", s.getName());
        out.put("role", s.getRole());
        out.put("plan", plan != null ? PerformanceViews.plan(plan, 0) : null);
        return ResponseEntity.ok(out);
    }

    /** Credited activity behind a person's month (audit trail). */
    @GetMapping("/events")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> events(@RequestParam(name = "staff_id") Long staffId, @RequestParam String period) {
        PerformanceClock.Window w = clock.window(YearMonth.parse(period), null);
        List<Map<String, Object>> out = new ArrayList<>();
        for (PerformanceEvent e : events.findForStaff(staffId, w.start(), w.end(), PageRequest.of(0, 500))) {
            out.add(eventView(e));
        }
        return out;
    }

    static Map<String, Object> eventView(PerformanceEvent e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("metric", e.getMetric());
        m.put("occurred_at", e.getOccurredAt().toString());
        m.put("quantity", e.getQuantity());
        m.put("amount", e.getAmount());
        m.put("source_type", e.getSourceType());
        m.put("source_id", e.getSourceId());
        m.put("correction", e.getRevision() > 0);
        return m;
    }

    // ── Settlements ──────────────────────────────────────────────────────────

    /** action: approve | reject | pay | reset. Body: { staff_id, period: yyyy-MM, note?, adjustment? } */
    @PostMapping("/settlements/{action}")
    public Map<String, Object> decide(@PathVariable String action, @RequestBody Map<String, Object> body) {
        Long staffId = Long.valueOf(String.valueOf(body.get("staff_id")));
        YearMonth period = YearMonth.parse(String.valueOf(body.get("period")));
        Object note = body.get("note");
        Object adj = body.get("adjustment");
        BigDecimal adjustment = adj != null && !String.valueOf(adj).isBlank() ? new BigDecimal(String.valueOf(adj)) : null;
        return PerformanceViews.settlement(settlements.decide(staffId, period, action,
                note != null && !String.valueOf(note).isBlank() ? String.valueOf(note) : null, adjustment));
    }

    @PostMapping("/settlements/bulk/approve")
    public Map<String, Object> approveAll(@RequestBody Map<String, Object> body) {
        return Map.of("approved", settlements.approveAll(YearMonth.parse(String.valueOf(body.get("period")))));
    }

    // ── Targets ──────────────────────────────────────────────────────────────

    @GetMapping("/targets")
    public List<Map<String, Object>> targets(@RequestParam String period) {
        return targets.applicable(YearMonth.parse(period)).stream().map(PerformanceViews::target).toList();
    }

    @PutMapping("/targets")
    public ResponseEntity<?> saveTarget(@RequestBody TargetService.TargetRequest req) {
        Target t = targets.save(req);
        return t == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(PerformanceViews.target(t));
    }

    @DeleteMapping("/targets/{id}")
    public ResponseEntity<Void> deleteTarget(@PathVariable Long id) {
        targets.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** Body: { from: yyyy-MM, to: yyyy-MM } */
    @PostMapping("/targets/copy")
    public Map<String, Object> copyTargets(@RequestBody Map<String, String> body) {
        return Map.of("copied", targets.copy(YearMonth.parse(body.get("from")), YearMonth.parse(body.get("to"))));
    }

    // ── Incentive plans ──────────────────────────────────────────────────────

    @GetMapping("/plans")
    public List<Map<String, Object>> plans() {
        return plans.list().stream().map(p -> PerformanceViews.plan(p, plans.settledMonths(p.getId()))).toList();
    }

    @PostMapping("/plans")
    public Map<String, Object> createPlan(@RequestBody IncentivePlanService.PlanRequest req) {
        IncentivePlan p = plans.create(req);
        return PerformanceViews.plan(plans.get(p.getId()), 0);
    }

    @PutMapping("/plans/{id}")
    public Map<String, Object> updatePlan(@PathVariable Long id, @RequestBody IncentivePlanService.PlanRequest req) {
        plans.update(id, req);
        return PerformanceViews.plan(plans.get(id), 0);
    }

    /** A new version from req.effective_from; the current version ends the month before. */
    @PostMapping("/plans/{id}/versions")
    public Map<String, Object> newVersion(@PathVariable Long id, @RequestBody IncentivePlanService.PlanRequest req) {
        IncentivePlan p = plans.newVersion(id, req);
        return PerformanceViews.plan(plans.get(p.getId()), 0);
    }

    @DeleteMapping("/plans/{id}")
    public ResponseEntity<Void> deletePlan(@PathVariable Long id) {
        plans.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Attribution & maintenance ────────────────────────────────────────────

    @GetMapping("/unassigned")
    public Map<String, Object> unassigned(@RequestParam(defaultValue = "6") int months) {
        return unassigned.list(LocalDateTime.now().minusMonths(Math.max(1, Math.min(24, months))));
    }

    /** Body: { staff_id } (null clears it). type: receipt | sale | lead */
    @PutMapping("/unassigned/{type}/{id}")
    public ResponseEntity<Void> assign(@PathVariable String type, @PathVariable Long id, @RequestBody Map<String, Object> body) {
        Object staff = body.get("staff_id");
        unassigned.assign(type, id, staff != null && !String.valueOf(staff).isBlank() ? Long.valueOf(String.valueOf(staff)) : null);
        return ResponseEntity.noContent().build();
    }

    /** Body: { branch_id?, from?: yyyy-MM, to?: yyyy-MM } — re-derives the ledger (writes only differences). */
    @PostMapping("/rebuild")
    public Map<String, Object> rebuild(@RequestBody(required = false) Map<String, String> body) {
        Map<String, String> b = body != null ? body : Map.of();
        Long branch = b.get("branch_id") != null && !b.get("branch_id").isBlank() ? Long.valueOf(b.get("branch_id")) : null;
        LocalDateTime from = b.get("from") != null ? clock.window(YearMonth.parse(b.get("from")), branch).start() : null;
        LocalDateTime to = b.get("to") != null ? clock.window(YearMonth.parse(b.get("to")), branch).end() : null;
        PerformanceEventRebuilder.Result r = rebuilder.rebuild(branch, from, to);
        return Map.of("sources_checked", r.sourcesChecked(), "events_written", r.eventsWritten());
    }

    @GetMapping("/parity")
    public Map<String, Object> parity(@RequestParam(defaultValue = "6") int months,
                                      @RequestParam(name = "differences_only", defaultValue = "true") boolean differencesOnly) {
        return parity.compare(months, differencesOnly);
    }

    @GetMapping("/migration-report")
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> migrationReport() {
        List<Map<String, Object>> out = new ArrayList<>();
        try {
            for (Object[] r : (List<Object[]>) em.createNativeQuery(
                    "SELECT kind, branch_id, ref_id, detail, created_at FROM performance_migration_report ORDER BY id").getResultList()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("kind", r[0]);
                m.put("branch_id", r[1]);
                m.put("ref_id", r[2]);
                m.put("detail", r[3]);
                m.put("created_at", r[4] != null ? r[4].toString() : null);
                out.add(m);
            }
        } catch (RuntimeException e) {
            throw new EntityNotFoundException("No migration report in this database");
        }
        return out;
    }
}
