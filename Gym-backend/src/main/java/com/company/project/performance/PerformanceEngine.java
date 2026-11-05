package com.company.project.performance;

import com.company.project.performance.events.PerformanceEventRepository;
import com.company.project.performance.incentives.*;
import com.company.project.performance.metric.Achieved;
import com.company.project.performance.metric.Metric;
import com.company.project.performance.settlement.SettlementView;
import com.company.project.performance.targets.Goal;
import com.company.project.performance.targets.TargetRepository;
import com.company.project.performance.targets.TargetResolver;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

/**
 * The only entry point for performance reads (plan §6). Every screen — web targets board,
 * commission review, payroll, mobile ledger, mobile performance, dashboards — asks this for the
 * staff and months it shows; none of them calculates anything itself.
 *
 * One evaluation is four queries whatever the staff count: events, targets, plans,
 * settlements. Decided months (approved / rejected / paid) return their frozen settlement;
 * only running and undecided months are calculated.
 */
@Service
@Transactional(readOnly = true)
public class PerformanceEngine {

    @PersistenceContext
    private EntityManager em;

    private final PerformanceEventRepository events;
    private final TargetRepository targets;
    private final IncentivePlanRepository plans;
    private final PerformanceClock clock;
    private final ObjectMapper objectMapper;

    public PerformanceEngine(PerformanceEventRepository events, TargetRepository targets, IncentivePlanRepository plans,
                             PerformanceClock clock, ObjectMapper objectMapper) {
        this.events = events;
        this.targets = targets;
        this.plans = plans;
        this.clock = clock;
        this.objectMapper = objectMapper;
    }

    /** Identity the engine needs about a staff member (read without the branch filter). */
    public record StaffInfo(Long id, String name, String role, Long branchId) {}

    public PeriodResult evaluate(Long staffId, YearMonth period) {
        return evaluate(List.of(staffId), period).get(staffId);
    }

    public Map<Long, PeriodResult> evaluate(Collection<Long> staffIds, YearMonth period) {
        Map<Long, PeriodResult> out = new LinkedHashMap<>();
        if (staffIds == null || staffIds.isEmpty()) return out;
        Map<Long, StaffInfo> staff = staffInfo(staffIds);
        if (staff.isEmpty()) return out;

        PerformanceClock.Window window = clock.window(period, null).upToNow();
        Map<Long, Map<Metric, Achieved>> achieved = achievedByStaff(staff.keySet(), window.start(), window.end());
        TargetResolver resolver = new TargetResolver(targets.findApplicableTo(period.atDay(1)), period);
        List<IncentivePlan> inForce = plans.findInForce(period.atDay(1));
        Map<Long, List<Object[]>> settlementRows = settlementRows(staff.keySet(), period);
        YearMonth current = clock.currentMonth(null);

        for (StaffInfo s : staff.values()) {
            Map<Metric, Achieved> a = achieved.getOrDefault(s.id(), new EnumMap<>(Metric.class));
            Map<Goal.Key, Goal> goals = resolver.forStaff(s.id(), s.role(), s.branchId());
            List<Object[]> rows = settlementRows.getOrDefault(s.id(), List.of());

            IncentiveBreakdown incentive;
            SettlementView settlement;
            if (!rows.isEmpty()) {
                incentive = frozenBreakdown(rows);
                settlement = frozenSettlement(rows);
            } else {
                IncentivePlan plan = PlanResolver.resolve(inForce, s.id(), s.role(), s.branchId()).orElse(null);
                incentive = IncentiveCalculator.calculate(plan, a, goals);
                String status = period.isBefore(current) ? SettlementView.PENDING : SettlementView.ESTIMATED;
                settlement = new SettlementView(status, incentive.total(), incentive.total(), null,
                        null, null, null, null, null, incentive.planId());
            }
            out.put(s.id(), new PeriodResult(s.id(), period, a, goals, incentive, settlement));
        }
        return out;
    }

    /** Several months for the same people (trends, year-to-date). */
    public Map<YearMonth, Map<Long, PeriodResult>> evaluate(Collection<Long> staffIds, YearMonth from, YearMonth to) {
        Map<YearMonth, Map<Long, PeriodResult>> out = new LinkedHashMap<>();
        for (YearMonth m = from; !m.isAfter(to); m = m.plusMonths(1)) out.put(m, evaluate(staffIds, m));
        return out;
    }

    /** A branch's month: everything done there, credited to staff or not, against the branch target. */
    public BranchResult evaluateBranch(Long branchId, YearMonth period) {
        PerformanceClock.Window window = clock.window(period, branchId).upToNow();
        List<Object[]> rows = branchId != null
                ? events.sumByBranch(branchId, window.start(), window.end())
                : events.sumAll(window.start(), window.end());
        Map<Metric, Achieved> a = new EnumMap<>(Metric.class);
        for (Object[] r : rows) accumulate(a, (String) r[0], r[1], r[2]);
        addRevenueTotal(a);
        TargetResolver resolver = new TargetResolver(targets.findApplicableTo(period.atDay(1)), period);
        return new BranchResult(branchId, period, a, resolver.forBranch(branchId));
    }

    public record BranchResult(Long branchId, YearMonth period, Map<Metric, Achieved> achieved, Map<Goal.Key, Goal> goals) {}

    /** The plan a person earns under in a month (null = no incentive plan). */
    public IncentivePlan planFor(Long staffId, YearMonth period) {
        StaffInfo s = staffInfo(List.of(staffId)).get(staffId);
        if (s == null) return null;
        IncentivePlan plan = PlanResolver.resolve(plans.findInForce(period.atDay(1)), s.id(), s.role(), s.branchId()).orElse(null);
        if (plan != null) {
            plan.getLines().size();
            plan.getBonuses().size();
        }
        return plan;
    }

    /**
     * Share (0–100) of each person's assigned leads that are converted, all time — a lead-pipeline
     * KPI, not an incentive metric. One query for everyone; people with no leads get 0.
     */
    @SuppressWarnings("unchecked")
    public Map<Long, Integer> leadConversionRates(Collection<Long> staffIds) {
        Map<Long, Integer> out = new HashMap<>();
        if (staffIds.isEmpty()) return out;
        List<Object[]> rows = em.createNativeQuery(
                        "SELECT assigned_staff_id, COUNT(*), SUM(CASE WHEN LOWER(status) = 'converted' THEN 1 ELSE 0 END) " +
                        "FROM leads WHERE assigned_staff_id IN (:ids) GROUP BY assigned_staff_id")
                .setParameter("ids", staffIds).getResultList();
        for (Object[] r : rows) {
            long total = ((Number) r[1]).longValue();
            long converted = r[2] != null ? ((Number) r[2]).longValue() : 0;
            out.put(((Number) r[0]).longValue(), total == 0 ? 0 : (int) Math.round(converted * 100.0 / total));
        }
        return out;
    }

    /** Share (0–100) of the person's leads created in [start, end) that are converted. */
    public int leadConversionRate(Long staffId, LocalDateTime start, LocalDateTime end) {
        Object[] r = (Object[]) em.createNativeQuery(
                        "SELECT COUNT(*), SUM(CASE WHEN LOWER(status) = 'converted' THEN 1 ELSE 0 END) FROM leads " +
                        "WHERE assigned_staff_id = :id AND created_at >= :start AND created_at < :end")
                .setParameter("id", staffId).setParameter("start", start).setParameter("end", end).getSingleResult();
        long total = ((Number) r[0]).longValue();
        long converted = r[1] != null ? ((Number) r[1]).longValue() : 0;
        return total == 0 ? 0 : (int) Math.round(converted * 100.0 / total);
    }

    /** What the person did in an arbitrary window (e.g. today), per metric, with REVENUE_TOTAL. */
    public Map<Metric, Achieved> achievedBetween(Long staffId, LocalDateTime start, LocalDateTime end) {
        return achievedByStaff(List.of(staffId), start, end).getOrDefault(staffId, emptyWithRevenue());
    }

    private static Map<Metric, Achieved> emptyWithRevenue() {
        Map<Metric, Achieved> a = new EnumMap<>(Metric.class);
        addRevenueTotal(a);
        return a;
    }

    public PerformanceClock clock() {
        return clock;
    }

    /** Leads assigned to the person (all time). */
    public long leadCount(Long staffId) {
        return ((Number) em.createNativeQuery("SELECT COUNT(*) FROM leads WHERE assigned_staff_id = :id")
                .setParameter("id", staffId).getSingleResult()).longValue();
    }

    /** Share (0–100) of the follow-ups assigned to the person that are completed; 0 with none. */
    public int followUpCompletion(Long staffId) {
        Object[] r = (Object[]) em.createNativeQuery(
                        "SELECT COUNT(*), SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) FROM follow_ups " +
                        "WHERE assigned_staff_id = :id")
                .setParameter("id", staffId).getSingleResult();
        long total = ((Number) r[0]).longValue();
        long done = r[1] != null ? ((Number) r[1]).longValue() : 0;
        return total == 0 ? 0 : (int) Math.round(done * 100.0 / total);
    }

    /** Each person's plan for the month (absent = no incentive plan), in one plan query. */
    public Map<Long, IncentivePlan> plansFor(Collection<Long> staffIds, YearMonth period) {
        Map<Long, IncentivePlan> out = new HashMap<>();
        if (staffIds.isEmpty()) return out;
        List<IncentivePlan> inForce = plans.findInForce(period.atDay(1));
        for (StaffInfo s : staffInfo(staffIds).values()) {
            PlanResolver.resolve(inForce, s.id(), s.role(), s.branchId()).ifPresent(p -> out.put(s.id(), p));
        }
        return out;
    }

    // ── Reads ────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public Map<Long, StaffInfo> staffInfo(Collection<Long> ids) {
        Map<Long, StaffInfo> out = new LinkedHashMap<>();
        if (ids.isEmpty()) return out;
        List<Object[]> rows = em.createNativeQuery("SELECT id, name, role, branch_id FROM employees WHERE id IN (:ids)")
                .setParameter("ids", ids).getResultList();
        Map<Long, StaffInfo> byId = new HashMap<>();
        for (Object[] r : rows) {
            Long id = ((Number) r[0]).longValue();
            byId.put(id, new StaffInfo(id, (String) r[1], (String) r[2], r[3] != null ? ((Number) r[3]).longValue() : null));
        }
        for (Long id : ids) if (byId.containsKey(id)) out.put(id, byId.get(id));
        return out;
    }

    private Map<Long, Map<Metric, Achieved>> achievedByStaff(Collection<Long> ids, LocalDateTime start, LocalDateTime end) {
        Map<Long, Map<Metric, Achieved>> out = new HashMap<>();
        for (Object[] r : events.sumByStaff(ids, start, end)) {
            Long id = ((Number) r[0]).longValue();
            accumulate(out.computeIfAbsent(id, k -> new EnumMap<>(Metric.class)), (String) r[1], r[2], r[3]);
        }
        out.values().forEach(PerformanceEngine::addRevenueTotal);
        return out;
    }

    private static void accumulate(Map<Metric, Achieved> into, String code, Object qty, Object amount) {
        Optional<Metric> metric = Metric.parse(code);
        if (metric.isEmpty()) return;
        long q = qty != null ? ((Number) qty).longValue() : 0;
        BigDecimal a = amount != null ? new BigDecimal(amount.toString()) : null;
        into.merge(metric.get(), new Achieved(q, a), (x, y) -> x.plus(y.count(), y.amount()));
    }

    static void addRevenueTotal(Map<Metric, Achieved> a) {
        BigDecimal total = BigDecimal.ZERO;
        for (Metric m : Metric.revenueMetrics()) total = total.add(a.getOrDefault(m, Achieved.ZERO).amountOrZero());
        a.put(Metric.REVENUE_TOTAL, new Achieved(0, total));
    }

    // ── Settlements (frozen months) ──────────────────────────────────────────

    /** status, amount, note, reviewed_by, reviewed_at, paid_at, payroll_run_id, plan_id, breakdown_json, category, computed, adjustment */
    @SuppressWarnings("unchecked")
    private Map<Long, List<Object[]>> settlementRows(Collection<Long> ids, YearMonth period) {
        List<Object[]> rows = em.createNativeQuery(
                        "SELECT staff_id, status, amount, note, reviewed_by, reviewed_at, paid_at, payroll_run_id, plan_id, " +
                        "breakdown_json, category, computed_amount, adjustment_amount FROM commission_earnings " +
                        "WHERE staff_id IN (:ids) AND period_year = :y AND period_month = :m ORDER BY id")
                .setParameter("ids", ids).setParameter("y", period.getYear()).setParameter("m", period.getMonthValue())
                .getResultList();
        Map<Long, List<Object[]>> out = new HashMap<>();
        for (Object[] r : rows) out.computeIfAbsent(((Number) r[0]).longValue(), k -> new ArrayList<>()).add(r);
        return out;
    }

    /** One or more rows (old months may hold separate memberships/pos rows) read as one settlement. */
    static SettlementView frozenSettlement(List<Object[]> rows) {
        BigDecimal amount = BigDecimal.ZERO;
        BigDecimal computed = null;
        BigDecimal adjustment = null;
        String status = null;
        List<String> notes = new ArrayList<>();
        String reviewedBy = null;
        LocalDateTime reviewedAt = null;
        LocalDateTime paidAt = null;
        Long payrollRunId = null;
        Long planId = null;
        for (Object[] r : rows) {
            String s = (String) r[1];
            BigDecimal a = r[2] != null ? new BigDecimal(r[2].toString()) : BigDecimal.ZERO;
            if (!SettlementView.REJECTED.equals(s)) amount = amount.add(a);
            status = lessFinal(status, s);
            if (r[3] != null) notes.add((String) r[3]);
            if (r[4] != null) reviewedBy = (String) r[4];
            if (r[5] != null) reviewedAt = toLdt(r[5]);
            if (r[6] != null) paidAt = toLdt(r[6]);
            if (r[7] != null) payrollRunId = ((Number) r[7]).longValue();
            if (r[8] != null) planId = ((Number) r[8]).longValue();
            if (r[11] != null) computed = (computed != null ? computed : BigDecimal.ZERO).add(new BigDecimal(r[11].toString()));
            if (r[12] != null) adjustment = (adjustment != null ? adjustment : BigDecimal.ZERO).add(new BigDecimal(r[12].toString()));
        }
        return new SettlementView(status, amount, computed, adjustment, notes.isEmpty() ? null : String.join("; ", notes),
                reviewedBy, reviewedAt, paidAt, payrollRunId, planId);
    }

    /** The status still needing action: approved before paid before rejected. */
    static String lessFinal(String a, String b) {
        if (a == null) return b;
        if (b == null) return a;
        return rank(a) <= rank(b) ? a : b;
    }

    private static int rank(String s) {
        return switch (s) {
            case SettlementView.APPROVED -> 0;
            case SettlementView.PAID -> 1;
            default -> 2;
        };
    }

    private IncentiveBreakdown frozenBreakdown(List<Object[]> rows) {
        if (rows.size() == 1 && rows.get(0)[9] != null) {
            try {
                JsonNode node = objectMapper.readTree((String) rows.get(0)[9]);
                if (!node.path("legacy").asBoolean(false)) {
                    return objectMapper.treeToValue(node, IncentiveBreakdown.class);
                }
                List<IncentiveBreakdown.LineResult> lines = new ArrayList<>();
                for (JsonNode l : node.path("lines")) {
                    lines.add(legacyLine(l.path("label").asText(), new BigDecimal(l.path("amount").asText("0"))));
                }
                return new IncentiveBreakdown(null, "Before incentive plans", lines, List.of(), total(rows), true);
            } catch (Exception ignored) {
                // fall through to the row-by-row view
            }
        }
        List<IncentiveBreakdown.LineResult> lines = new ArrayList<>();
        for (Object[] r : rows) {
            lines.add(legacyLine((String) r[10], r[2] != null ? new BigDecimal(r[2].toString()) : BigDecimal.ZERO));
        }
        Long planId = rows.get(0)[8] != null ? ((Number) rows.get(0)[8]).longValue() : null;
        return new IncentiveBreakdown(planId, planId == null ? "Before incentive plans" : null, lines, List.of(), total(rows), planId == null);
    }

    private static IncentiveBreakdown.LineResult legacyLine(String category, BigDecimal amount) {
        String label = switch (category == null ? "" : category) {
            case "memberships" -> "Membership sales (before incentive plans)";
            case "pos" -> "POS sales (before incentive plans)";
            default -> "Commission";
        };
        return new IncentiveBreakdown.LineResult(null, null, label, null, null, 0, null, amount, null, null, false, false);
    }

    private static BigDecimal total(List<Object[]> rows) {
        return frozenSettlement(rows).amount();
    }

    private static LocalDateTime toLdt(Object o) {
        if (o instanceof LocalDateTime t) return t;
        if (o instanceof java.sql.Timestamp t) return t.toLocalDateTime();
        return null;
    }
}
