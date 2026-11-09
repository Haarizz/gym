package com.company.project.services;

import com.company.project.dto.StaffTargetResponseDTO;
import com.company.project.entities.StaffTarget;
import com.company.project.repositories.StaffTargetRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Backs the Revenue Dashboard's "Comparison" sub-sections beyond money: freezes, CRM
 * (leads, follow-ups, enquiries, referrals), POS, attendance, bookings and member
 * movement — each for the selected range and the same comparison window the revenue
 * summary uses ({@link RevenueDashboardService#comparisonWindow}, cut at today), plus a bucketed trend
 * where both periods line up by index.
 *
 * Targets (institution-wide and per staff) live in {@link #getTargets} because their live
 * "achieved" figures are computed per target and are much heavier; the page loads them
 * only when the Targets section is opened.
 *
 * Every query is JPQL over branch-filtered entities, so the active branch scoping applies.
 * Map keys are camelCase on purpose (the SNAKE_CASE strategy only renames bean properties).
 */
@Service
@Transactional(readOnly = true)
public class RevenueOperationsService {

    /** Booking statuses that don't hold a seat (BookingService.NO_SEAT_STATUSES). */
    private static final Set<String> NO_SEAT = Set.of("cancelled", "waitlisted");
    private static final List<String> RECEIPT_TYPES_SHOWN =
            List.of("New", "Renewal", "Add-on", "Daily Entry", "Class Booking", "Freeze Charge", "Payment");
    private static final Map<String, String> RECEIPT_TYPE_LABELS = Map.of(
            "New", "New memberships", "Renewal", "Renewals", "Add-on", "Add-ons", "Daily Entry", "Day passes",
            "Class Booking", "Class bookings", "Freeze Charge", "Freeze charges", "Payment", "Balance settlements");
    private static final int TOP_ROWS = 8;

    @PersistenceContext
    private EntityManager em;

    private final StaffTargetRepository targetRepository;
    private final StaffTargetService staffTargetService;
    private final StaffProgressCalculator progressCalculator;

    public RevenueOperationsService(StaffTargetRepository targetRepository, StaffTargetService staffTargetService,
                                    StaffProgressCalculator progressCalculator) {
        this.targetRepository = targetRepository;
        this.staffTargetService = staffTargetService;
        this.progressCalculator = progressCalculator;
    }

    /** [from, to] as LocalDates; start/end as the half-open [start, end) timestamps. */
    private record Window(LocalDate from, LocalDate to) {
        LocalDateTime start() { return from.atStartOfDay(); }
        LocalDateTime end() { return to.plusDays(1).atStartOfDay(); }
        boolean contains(LocalDateTime t) { return t != null && !t.isBefore(start()) && t.isBefore(end()); }
    }

    /** One metric of the "at a glance" scorecard. */
    private record Metric(String area, String key, String label, double current, double previous,
                          String format, boolean goodWhenUp) {
        Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("area", area);
            m.put("key", key);
            m.put("label", label);
            // NaN = not measurable (a rate or average with nothing to measure) → null, shown as "—"
            m.put("current", Double.isNaN(current) ? null : round(current));
            m.put("previous", Double.isNaN(previous) ? null : round(previous));
            m.put("format", format);
            m.put("goodWhenUp", goodWhenUp);
            return m;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Operations
    // ═════════════════════════════════════════════════════════════════════════

    public Map<String, Object> getOperations(LocalDate from, LocalDate to, String granularity, String compare) {
        if (to.isBefore(from)) {
            LocalDate swap = from;
            from = to;
            to = swap;
        }
        LocalDate requestedTo = to;
        LocalDate[] w = RevenueDashboardService.comparisonWindow(from, to, compare, LocalDate.now());
        to = w[1];
        Window cur = new Window(from, to);
        Window pre = new Window(w[2], w[3]);
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        String bucket = RevenueDashboardService.resolveGranularity(granularity, days);
        boolean lastYear = "last-year".equalsIgnoreCase(compare);

        Period c = loadPeriod(cur);
        Period p = loadPeriod(pre);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", from.toString());
        result.put("to", to.toString());
        result.put("requestedTo", requestedTo.toString());
        result.put("toDate", !to.equals(requestedTo));
        result.put("previousFrom", pre.from().toString());
        result.put("previousTo", pre.to().toString());
        result.put("compare", lastYear ? "last-year" : "previous");
        result.put("label", lastYear ? "Same period last year" : "Previous period");
        result.put("granularity", bucket);

        List<Metric> metrics = new ArrayList<>();
        Map<String, Object> freeze = freezeSection(c, p, cur, pre, metrics);
        Map<String, Object> crm = crmSection(c, p, cur, pre, metrics);
        Map<String, Object> pos = posSection(c, p, metrics);
        Map<String, Object> attendance = attendanceSection(c, p, cur, pre, metrics);
        Map<String, Object> bookings = bookingSection(c, p, metrics);
        Map<String, Object> members = memberSection(c, p, metrics);

        result.put("metrics", metrics.stream().map(Metric::toMap).toList());
        result.put("freeze", freeze);
        result.put("crm", crm);
        result.put("pos", pos);
        result.put("attendance", attendance);
        result.put("bookings", bookings);
        result.put("members", members);
        result.put("trend", trend(c, p, cur, pre, bucket));
        return result;
    }

    /** Everything one window needs, loaded once. */
    private record Period(List<Object[]> freezes, List<Object[]> leads, List<Object[]> followUps,
                          List<Object[]> enquiries, List<Object[]> referrals, List<Object[]> sales,
                          long itemsSold, long returns, BigDecimal returnsAmount, List<Object[]> attendance,
                          List<Object[]> bookings, List<Object[]> sessions, List<Object[]> receiptTypes,
                          List<LocalDateTime> joins, long membershipsEnding) {}

    private Period loadPeriod(Window w) {
        LocalDateTime s = w.start();
        LocalDateTime e = w.end();

        // Freezes overlapping the window (started before its end, not ended before its start)
        List<Object[]> freezes = rows(
                "SELECT f.freezeStart, f.endedAt, f.requestedDays, f.chargedDays, f.chargeAmount, f.chargeWaived, " +
                "f.reason, f.source, f.freeDaysApplied, f.planName, f.limitsOverridden " +
                "FROM MembershipFreeze f, Member m WHERE m.id = f.memberDbId " +
                "AND f.freezeStart < :e AND (f.endedAt IS NULL OR f.endedAt >= :s)", s, e);

        List<Object[]> leads = rows(
                "SELECT l.createdAt, l.status, l.source, l.memberId, l.assignedStaff FROM Lead l " +
                "WHERE l.createdAt >= :s AND l.createdAt < :e", s, e);

        List<Object[]> followUps = rows(
                "SELECT f.dueDate, f.completedDate, f.status FROM FollowUp f " +
                "WHERE (f.dueDate >= :s AND f.dueDate < :e) OR (f.completedDate >= :s AND f.completedDate < :e)", s, e);

        List<Object[]> enquiries = rows(
                "SELECT q.createdAt, q.status, q.repliedAt, q.category FROM MemberEnquiry q " +
                "WHERE q.createdAt >= :s AND q.createdAt < :e", s, e);

        List<Object[]> referrals = rows(
                "SELECT r.createdAt, r.status FROM Referral r WHERE r.createdAt >= :s AND r.createdAt < :e", s, e);

        List<Object[]> sales = rows(
                "SELECT t.createdAt, t.status, t.totalAmount, t.refundedAmount, t.discountAmount, t.taxableAmount, " +
                "t.taxAmount, t.totalCogs, t.creditAmount, t.memberId, t.cashierName, t.terminalName " +
                "FROM SaleTransaction t WHERE t.createdAt >= :s AND t.createdAt < :e", s, e);

        Object items = em.createQuery(
                        "SELECT SUM(i.quantity - COALESCE(i.returnedQuantity, 0)) FROM SaleTransactionItem i, SaleTransaction t " +
                        "WHERE t.id = i.transactionId AND t.status IN ('COMPLETED', 'REFUNDED') " +
                        "AND t.createdAt >= :s AND t.createdAt < :e")
                .setParameter("s", s).setParameter("e", e).getSingleResult();

        Object[] ret = (Object[]) em.createQuery(
                        "SELECT COUNT(r), SUM(r.totalAmount) FROM PosSaleReturn r WHERE r.createdAt >= :s AND r.createdAt < :e")
                .setParameter("s", s).setParameter("e", e).getSingleResult();

        List<Object[]> attendance = rows(
                "SELECT a.checkInTime, a.type, a.checkInMethod, m.id, a.totalMinutes, a.checkOutTime " +
                "FROM Attendance a LEFT JOIN a.member m WHERE a.checkInTime >= :s AND a.checkInTime < :e", s, e);

        List<Object[]> bookings = em.createQuery(
                        "SELECT b.status, b.price, b.paymentStatus, s.date, s.type, s.name, t.name, s.id " +
                        "FROM Booking b JOIN b.session s LEFT JOIN s.trainer t " +
                        "WHERE s.date >= :f AND s.date <= :t", Object[].class)
                .setParameter("f", w.from()).setParameter("t", w.to()).getResultList();

        List<Object[]> sessions = em.createQuery(
                        "SELECT s.id, s.type, s.capacity, s.status, s.date FROM TrainingSession s " +
                        "WHERE s.date >= :f AND s.date <= :t", Object[].class)
                .setParameter("f", w.from()).setParameter("t", w.to()).getResultList();

        // Same "money received" rule as targets/revenue: Paid or Partial, approval not pending/rejected
        List<Object[]> receiptTypes = rows(
                "SELECT r.transactionType, COUNT(r), SUM(r.paidAmount) FROM Receipt r " +
                "WHERE r.status IN ('Paid', 'Partial') " +
                "AND (r.approvalStatus IS NULL OR UPPER(r.approvalStatus) NOT IN ('PENDING', 'REJECTED')) " +
                "AND ((r.transactionDate IS NOT NULL AND r.transactionDate >= :s AND r.transactionDate < :e) " +
                "  OR (r.transactionDate IS NULL AND r.createdAt >= :s AND r.createdAt < :e)) " +
                "GROUP BY r.transactionType", s, e);

        List<LocalDateTime> joins = em.createQuery(
                        "SELECT m.joinDate FROM Member m WHERE m.joinDate >= :s AND m.joinDate < :e", LocalDateTime.class)
                .setParameter("s", s).setParameter("e", e).getResultList();

        long ending = em.createQuery(
                        "SELECT COUNT(m) FROM Member m WHERE m.membershipEndDate >= :s AND m.membershipEndDate < :e", Long.class)
                .setParameter("s", s).setParameter("e", e).getSingleResult();

        return new Period(freezes, leads, followUps, enquiries, referrals, sales,
                items == null ? 0 : ((Number) items).longValue(),
                ret[0] == null ? 0 : ((Number) ret[0]).longValue(), bd(ret[1]),
                attendance, bookings, sessions, receiptTypes, joins, ending);
    }

    private List<Object[]> rows(String jpql, LocalDateTime s, LocalDateTime e) {
        return em.createQuery(jpql, Object[].class).setParameter("s", s).setParameter("e", e).getResultList();
    }

    // ── Freeze ──────────────────────────────────────────────────────────────

    private record FreezeStats(long started, long ended, double frozenDays, double avgRequestedDays,
                               BigDecimal charges, long charged, long waived, long freeDays, long overridden) {}

    private static FreezeStats freezeStats(List<Object[]> freezes, Window w) {
        LocalDateTime now = LocalDateTime.now();
        long started = 0, ended = 0, charged = 0, waived = 0, freeDays = 0, overridden = 0, requested = 0;
        double frozenHours = 0;
        BigDecimal charges = BigDecimal.ZERO;
        for (Object[] f : freezes) {
            LocalDateTime start = (LocalDateTime) f[0];
            LocalDateTime endedAt = (LocalDateTime) f[1];
            if (w.contains(endedAt)) ended++;
            // Member-days frozen inside the window (an open freeze runs until now)
            LocalDateTime a = start.isBefore(w.start()) ? w.start() : start;
            LocalDateTime stop = endedAt != null ? endedAt : now;
            LocalDateTime b = stop.isAfter(w.end()) ? w.end() : stop;
            if (b.isAfter(a)) frozenHours += Duration.between(a, b).toMinutes() / 60.0;
            if (!w.contains(start)) continue;
            started++;
            requested += num(f[2]);
            boolean isWaived = Boolean.TRUE.equals(f[5]);
            if (isWaived) waived++;
            else if (bd(f[4]).signum() > 0) {
                charged++;
                charges = charges.add(bd(f[4]));
            }
            freeDays += num(f[8]);
            if (Boolean.TRUE.equals(f[10])) overridden++;
        }
        return new FreezeStats(started, ended, frozenHours / 24.0,
                started == 0 ? Double.NaN : (double) requested / started, charges, charged, waived, freeDays, overridden);
    }

    private Map<String, Object> freezeSection(Period c, Period p, Window cur, Window pre, List<Metric> metrics) {
        FreezeStats fc = freezeStats(c.freezes(), cur);
        FreezeStats fp = freezeStats(p.freezes(), pre);
        String a = "freeze";
        metrics.add(new Metric(a, "freezesStarted", "Freezes started", fc.started(), fp.started(), "count", false));
        metrics.add(new Metric(a, "unfreezes", "Unfreezes", fc.ended(), fp.ended(), "count", true));
        metrics.add(new Metric(a, "frozenDays", "Member-days frozen", fc.frozenDays(), fp.frozenDays(), "days", false));
        metrics.add(new Metric(a, "avgFreezeDays", "Avg. freeze length", fc.avgRequestedDays(), fp.avgRequestedDays(), "days", false));
        metrics.add(new Metric(a, "freezeCharges", "Freeze charges", fc.charges().doubleValue(), fp.charges().doubleValue(), "money", true));
        metrics.add(new Metric(a, "chargedFreezes", "Charged freezes", fc.charged(), fp.charged(), "count", true));
        metrics.add(new Metric(a, "waivedFreezes", "Charges waived", fc.waived(), fp.waived(), "count", false));
        metrics.add(new Metric(a, "freeDays", "Free days granted", fc.freeDays(), fp.freeDays(), "days", false));

        Map<String, Object> out = new LinkedHashMap<>();
        Long frozenNow = em.createQuery(
                        "SELECT COUNT(DISTINCT f.memberDbId) FROM MembershipFreeze f, Member m " +
                        "WHERE m.id = f.memberDbId AND f.endedAt IS NULL AND f.freezeStart <= :now", Long.class)
                .setParameter("now", LocalDateTime.now()).getSingleResult();
        Long activeMembers = em.createQuery(
                "SELECT COUNT(m) FROM Member m WHERE LOWER(m.membershipStatus) IN ('active', 'frozen')", Long.class).getSingleResult();
        out.put("frozenNow", frozenNow);
        out.put("activeMembers", activeMembers);
        Function<Object[], String> reason = f -> {
            String r = f[6] == null ? "" : ((String) f[6]).trim();
            return r.isEmpty() ? "No reason given" : capitalize(r.length() > 40 ? r.substring(0, 40) + "…" : r);
        };
        out.put("byReason", countRows(startedIn(c.freezes(), cur), startedIn(p.freezes(), pre), reason, TOP_ROWS));
        out.put("bySource", countRows(startedIn(c.freezes(), cur), startedIn(p.freezes(), pre),
                f -> label((String) f[7], "Staff"), 0));
        out.put("byPlan", countRows(startedIn(c.freezes(), cur), startedIn(p.freezes(), pre),
                f -> label((String) f[9], "No plan"), TOP_ROWS));
        // Length buckets of freezes started in the window
        Function<Object[], String> length = f -> {
            int d = (int) num(f[2]);
            if (d <= 7) return "1–7 days";
            if (d <= 14) return "8–14 days";
            if (d <= 30) return "15–30 days";
            if (d <= 60) return "31–60 days";
            return "60+ days";
        };
        out.put("byLength", orderedCountRows(startedIn(c.freezes(), cur), startedIn(p.freezes(), pre), length,
                List.of("1–7 days", "8–14 days", "15–30 days", "31–60 days", "60+ days")));
        return out;
    }

    private static List<Object[]> startedIn(List<Object[]> freezes, Window w) {
        return freezes.stream().filter(f -> w.contains((LocalDateTime) f[0])).toList();
    }

    // ── CRM ─────────────────────────────────────────────────────────────────

    private static boolean converted(Object[] lead) {
        return "converted".equalsIgnoreCase((String) lead[1]) || lead[3] != null;
    }

    private Map<String, Object> crmSection(Period c, Period p, Window cur, Window pre, List<Metric> metrics) {
        String a = "crm";
        long leadsC = c.leads().size(), leadsP = p.leads().size();
        long convC = c.leads().stream().filter(RevenueOperationsService::converted).count();
        long convP = p.leads().stream().filter(RevenueOperationsService::converted).count();
        long lostC = c.leads().stream().filter(l -> "lost".equalsIgnoreCase((String) l[1])).count();
        long lostP = p.leads().stream().filter(l -> "lost".equalsIgnoreCase((String) l[1])).count();
        metrics.add(new Metric(a, "leads", "New leads", leadsC, leadsP, "count", true));
        metrics.add(new Metric(a, "conversions", "Leads converted", convC, convP, "count", true));
        metrics.add(new Metric(a, "conversionRate", "Lead conversion rate", pct(convC, leadsC), pct(convP, leadsP), "percent", true));
        metrics.add(new Metric(a, "lostLeads", "Leads lost", lostC, lostP, "count", false));

        long[] fuC = followUpStats(c.followUps(), cur), fuP = followUpStats(p.followUps(), pre);
        metrics.add(new Metric(a, "followUpsDue", "Follow-ups due", fuC[0], fuP[0], "count", true));
        metrics.add(new Metric(a, "followUpsDone", "Follow-ups completed", fuC[1], fuP[1], "count", true));
        metrics.add(new Metric(a, "followUpsOverdue", "Follow-ups overdue", fuC[2], fuP[2], "count", false));

        double[] enqC = enquiryStats(c.enquiries()), enqP = enquiryStats(p.enquiries());
        metrics.add(new Metric(a, "enquiries", "Member enquiries", enqC[0], enqP[0], "count", false));
        metrics.add(new Metric(a, "enquiryReplyRate", "Enquiries answered", enqC[1], enqP[1], "percent", true));
        metrics.add(new Metric(a, "enquiryReplyHours", "Avg. reply time", enqC[2], enqP[2], "hours", false));

        long refC = c.referrals().size(), refP = p.referrals().size();
        long refOkC = c.referrals().stream().filter(r -> "successful".equalsIgnoreCase((String) r[1])).count();
        long refOkP = p.referrals().stream().filter(r -> "successful".equalsIgnoreCase((String) r[1])).count();
        metrics.add(new Metric(a, "referrals", "Referrals", refC, refP, "count", true));
        metrics.add(new Metric(a, "referralsSuccessful", "Successful referrals", refOkC, refOkP, "count", true));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("byStatus", orderedCountRows(c.leads(), p.leads(), l -> statusLabel((String) l[1]),
                List.of("New", "Contacted", "Follow up", "Converted", "Lost")));
        out.put("bySource", conversionRows(c.leads(), p.leads(), l -> label((String) l[2], "Unknown")));
        out.put("byStaff", conversionRows(c.leads(), p.leads(), l -> label((String) l[4], "Unassigned")));
        out.put("enquiryCategories", countRows(c.enquiries(), p.enquiries(),
                q -> capitalize(label((String) q[3], "General").toLowerCase(Locale.ROOT)), TOP_ROWS));
        return out;
    }

    /** [due in window, completed in window, overdue (due in window, still open, due date passed)]. */
    private static long[] followUpStats(List<Object[]> followUps, Window w) {
        // The query returns rows due OR completed in the window; split them back here
        LocalDateTime now = LocalDateTime.now();
        long due = 0, done = 0, overdue = 0;
        for (Object[] f : followUps) {
            LocalDateTime dueDate = (LocalDateTime) f[0];
            LocalDateTime completed = (LocalDateTime) f[1];
            String status = f[2] == null ? "" : ((String) f[2]).toLowerCase(Locale.ROOT);
            if (w.contains(completed)) done++;
            if (!w.contains(dueDate)) continue;
            due++;
            boolean open = completed == null && !"completed".equals(status) && !"cancelled".equals(status);
            if (open && ("overdue".equals(status) || dueDate.isBefore(now))) overdue++;
        }
        return new long[]{due, done, overdue};
    }

    /** [count, % answered, avg hours to first reply]. */
    private static double[] enquiryStats(List<Object[]> enquiries) {
        long replied = 0;
        double hours = 0;
        for (Object[] q : enquiries) {
            LocalDateTime created = (LocalDateTime) q[0];
            LocalDateTime repliedAt = (LocalDateTime) q[2];
            String status = q[1] == null ? "" : ((String) q[1]).toUpperCase(Locale.ROOT);
            if (repliedAt != null || "REPLIED".equals(status) || "CLOSED".equals(status)) replied++;
            if (repliedAt != null && created != null && repliedAt.isAfter(created)) {
                hours += Duration.between(created, repliedAt).toMinutes() / 60.0;
            }
        }
        long withTime = enquiries.stream().filter(q -> q[2] != null && q[0] != null).count();
        return new double[]{enquiries.size(), pct(replied, enquiries.size()), withTime == 0 ? Double.NaN : hours / withTime};
    }

    /** Lead rows with conversions alongside: name, current, previous, converted, previousConverted. */
    private static List<Map<String, Object>> conversionRows(List<Object[]> cur, List<Object[]> prev, Function<Object[], String> key) {
        List<Map<String, Object>> rows = countRows(cur, prev, key, TOP_ROWS);
        Map<String, long[]> conv = new HashMap<>();
        for (Object[] l : cur) if (converted(l)) conv.computeIfAbsent(key.apply(l), k -> new long[2])[0]++;
        for (Object[] l : prev) if (converted(l)) conv.computeIfAbsent(key.apply(l), k -> new long[2])[1]++;
        for (Map<String, Object> r : rows) {
            long[] cv = conv.getOrDefault((String) r.get("name"), new long[2]);
            r.put("converted", cv[0]);
            r.put("previousConverted", cv[1]);
        }
        return rows;
    }

    // ── POS ─────────────────────────────────────────────────────────────────

    private record PosStats(long sales, long voided, BigDecimal gross, BigDecimal refunds, BigDecimal net,
                            BigDecimal discounts, BigDecimal profit, BigDecimal credit, long memberSales,
                            long refundedSales) {}

    private static boolean posCounted(Object[] t) {
        String status = (String) t[1];
        return "COMPLETED".equals(status) || "REFUNDED".equals(status);
    }

    private static BigDecimal posNet(Object[] t) {
        return bd(t[2]).subtract(bd(t[3])).max(BigDecimal.ZERO);
    }

    private static PosStats posStats(List<Object[]> sales) {
        long count = 0, voided = 0, memberSales = 0, refundedSales = 0;
        BigDecimal gross = BigDecimal.ZERO, refunds = BigDecimal.ZERO, discounts = BigDecimal.ZERO,
                profit = BigDecimal.ZERO, credit = BigDecimal.ZERO;
        for (Object[] t : sales) {
            String status = (String) t[1];
            if ("VOIDED".equals(status) || "CANCELLED".equals(status)) {
                voided++;
                continue;
            }
            if (!posCounted(t)) continue;
            BigDecimal total = bd(t[2]);
            BigDecimal refunded = bd(t[3]);
            if ("COMPLETED".equals(status)) count++;
            if (refunded.signum() > 0) refundedSales++;
            gross = gross.add(total);
            refunds = refunds.add(refunded);
            discounts = discounts.add(bd(t[4]));
            credit = credit.add(bd(t[8]));
            if (t[9] != null) memberSales++;
            // Gross profit on what was kept: (sale ex-tax − COGS) × share not refunded
            if (total.signum() > 0) {
                BigDecimal kept = BigDecimal.ONE.subtract(refunded.divide(total, 6, RoundingMode.HALF_UP)).max(BigDecimal.ZERO);
                BigDecimal exTax = t[5] != null ? bd(t[5]) : total.subtract(bd(t[6]));
                profit = profit.add(exTax.subtract(bd(t[7])).multiply(kept));
            }
        }
        return new PosStats(count, voided, gross, refunds, gross.subtract(refunds), discounts, profit, credit,
                memberSales, refundedSales);
    }

    private Map<String, Object> posSection(Period c, Period p, List<Metric> metrics) {
        PosStats sc = posStats(c.sales()), sp = posStats(p.sales());
        String a = "pos";
        metrics.add(new Metric(a, "posSales", "POS sales", sc.sales(), sp.sales(), "count", true));
        metrics.add(new Metric(a, "posNet", "POS net sales", sc.net().doubleValue(), sp.net().doubleValue(), "money", true));
        metrics.add(new Metric(a, "posBasket", "Avg. basket", avg(sc.net(), sc.sales()), avg(sp.net(), sp.sales()), "money", true));
        metrics.add(new Metric(a, "posItems", "Items sold", c.itemsSold(), p.itemsSold(), "count", true));
        metrics.add(new Metric(a, "posProfit", "POS gross profit", sc.profit().doubleValue(), sp.profit().doubleValue(), "money", true));
        metrics.add(new Metric(a, "posMargin", "POS gross margin",
                pct(sc.profit().doubleValue(), sc.net().doubleValue()), pct(sp.profit().doubleValue(), sp.net().doubleValue()), "percent", true));
        metrics.add(new Metric(a, "posRefunds", "POS refunds", sc.refunds().doubleValue(), sp.refunds().doubleValue(), "money", false));
        metrics.add(new Metric(a, "posReturns", "Returns processed", c.returns(), p.returns(), "count", false));
        metrics.add(new Metric(a, "posDiscounts", "POS discounts", sc.discounts().doubleValue(), sp.discounts().doubleValue(), "money", false));
        metrics.add(new Metric(a, "posCredit", "Sold on credit", sc.credit().doubleValue(), sp.credit().doubleValue(), "money", false));
        metrics.add(new Metric(a, "posVoided", "Voided / cancelled sales", sc.voided(), sp.voided(), "count", false));
        metrics.add(new Metric(a, "posMemberShare", "Sales to members",
                pct(sc.memberSales(), sc.sales()), pct(sp.memberSales(), sp.sales()), "percent", true));

        List<Object[]> curSales = c.sales().stream().filter(RevenueOperationsService::posCounted).toList();
        List<Object[]> prevSales = p.sales().stream().filter(RevenueOperationsService::posCounted).toList();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("byCashier", amountRows(curSales, prevSales, t -> label((String) t[10], "Not recorded"),
                RevenueOperationsService::posNet, TOP_ROWS));
        out.put("byTerminal", amountRows(curSales, prevSales, t -> label((String) t[11], "Not recorded"),
                RevenueOperationsService::posNet, TOP_ROWS));
        out.put("byCustomer", amountRows(curSales, prevSales, t -> t[9] != null ? "Members" : "Walk-in customers",
                RevenueOperationsService::posNet, 0));
        out.put("byWeekday", weekdayRows(curSales, prevSales, t -> (LocalDateTime) t[0]));
        return out;
    }

    // ── Attendance ──────────────────────────────────────────────────────────

    private static boolean walkIn(Object[] a) {
        String type = (String) a[1];
        return type != null && type.toLowerCase(Locale.ROOT).replace('-', '_').startsWith("walk");
    }

    private Map<String, Object> attendanceSection(Period c, Period p, Window cur, Window pre, List<Metric> metrics) {
        String a = "attendance";
        long totalC = c.attendance().size(), totalP = p.attendance().size();
        long walkC = c.attendance().stream().filter(RevenueOperationsService::walkIn).count();
        long walkP = p.attendance().stream().filter(RevenueOperationsService::walkIn).count();
        long uniqC = c.attendance().stream().map(r -> r[3]).filter(x -> x != null).distinct().count();
        long uniqP = p.attendance().stream().map(r -> r[3]).filter(x -> x != null).distinct().count();
        long daysC = ChronoUnit.DAYS.between(cur.from(), cur.to()) + 1;
        long daysP = ChronoUnit.DAYS.between(pre.from(), pre.to()) + 1;
        metrics.add(new Metric(a, "checkIns", "Total check-ins", totalC, totalP, "count", true));
        metrics.add(new Metric(a, "memberCheckIns", "Member check-ins", totalC - walkC, totalP - walkP, "count", true));
        metrics.add(new Metric(a, "walkIns", "Walk-in visits", walkC, walkP, "count", true));
        metrics.add(new Metric(a, "uniqueVisitors", "Unique members visiting", uniqC, uniqP, "count", true));
        metrics.add(new Metric(a, "visitsPerMember", "Visits per member",
                uniqC == 0 ? Double.NaN : (double) (totalC - walkC) / uniqC, uniqP == 0 ? Double.NaN : (double) (totalP - walkP) / uniqP, "decimal", true));
        metrics.add(new Metric(a, "dailyCheckIns", "Avg. check-ins per day",
                (double) totalC / daysC, (double) totalP / daysP, "decimal", true));
        metrics.add(new Metric(a, "visitMinutes", "Avg. visit length", avgMinutes(c.attendance()), avgMinutes(p.attendance()), "minutes", true));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("byWeekday", weekdayRows(c.attendance(), p.attendance(), r -> (LocalDateTime) r[0]));
        out.put("byHour", hourRows(c.attendance(), p.attendance(), r -> (LocalDateTime) r[0]));
        out.put("byMethod", countRows(c.attendance(), p.attendance(),
                r -> walkIn(r) ? "Walk-in desk" : methodLabel((String) r[2]), 0));
        return out;
    }

    private static double avgMinutes(List<Object[]> attendance) {
        double sum = 0;
        long n = 0;
        for (Object[] r : attendance) {
            double minutes = 0;
            if (r[4] != null && ((Number) r[4]).intValue() > 0) minutes = ((Number) r[4]).intValue();
            else if (r[0] != null && r[5] != null) minutes = Duration.between((LocalDateTime) r[0], (LocalDateTime) r[5]).toMinutes();
            // Forgotten check-outs (or none at all) would skew the average
            if (minutes <= 0 || minutes > 16 * 60) continue;
            sum += minutes;
            n++;
        }
        return n == 0 ? Double.NaN : sum / n;
    }

    private static String methodLabel(String method) {
        if (method == null || method.isBlank()) return "Front desk";
        String m = method.trim().toLowerCase(Locale.ROOT);
        return switch (m) {
            case "app", "mobile", "qr", "qr_code" -> "Member app / QR";
            case "manual" -> "Front desk";
            case "device", "biometric", "turnstile", "rfid", "card" -> "Access device";
            default -> capitalize(m.replace('_', ' '));
        };
    }

    // ── Bookings ────────────────────────────────────────────────────────────

    private static String bstatus(Object[] b) {
        return b[0] == null ? "confirmed" : ((String) b[0]).toLowerCase(Locale.ROOT);
    }

    private static boolean isPt(Object type) {
        return type != null && "pt".equalsIgnoreCase(((String) type).trim());
    }

    private Map<String, Object> bookingSection(Period c, Period p, List<Metric> metrics) {
        String a = "bookings";
        double[] bc = bookingStats(c), bp = bookingStats(p);
        metrics.add(new Metric(a, "bookings", "Bookings", bc[0], bp[0], "count", true));
        metrics.add(new Metric(a, "ptBookings", "PT bookings", bc[1], bp[1], "count", true));
        metrics.add(new Metric(a, "classBookings", "Class bookings", bc[2], bp[2], "count", true));
        metrics.add(new Metric(a, "bookingCheckIns", "Attended (checked in)", bc[3], bp[3], "count", true));
        metrics.add(new Metric(a, "noShows", "No-shows", bc[4], bp[4], "count", false));
        metrics.add(new Metric(a, "showRate", "Show rate", bc[5], bp[5], "percent", true));
        metrics.add(new Metric(a, "cancellations", "Cancellations", bc[6], bp[6], "count", false));
        metrics.add(new Metric(a, "cancelRate", "Cancellation rate", bc[7], bp[7], "percent", false));
        metrics.add(new Metric(a, "waitlisted", "Waitlisted", bc[8], bp[8], "count", true));
        metrics.add(new Metric(a, "sessionsHeld", "Sessions scheduled", bc[9], bp[9], "count", true));
        metrics.add(new Metric(a, "utilisation", "Seat utilisation", bc[10], bp[10], "percent", true));
        metrics.add(new Metric(a, "bookingValue", "Paid booking value", bc[11], bp[11], "money", true));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("byStatus", orderedCountRows(c.bookings(), p.bookings(), b -> bookingStatusLabel(bstatus(b)),
                List.of("Confirmed", "Pending approval", "Checked in", "No-show", "Cancelled", "Waitlisted")));
        List<Object[]> seatedC = c.bookings().stream().filter(b -> !NO_SEAT.contains(bstatus(b))).toList();
        List<Object[]> seatedP = p.bookings().stream().filter(b -> !NO_SEAT.contains(bstatus(b))).toList();
        out.put("byType", countRows(seatedC, seatedP, b -> isPt(b[4]) ? "Personal training" : sessionTypeLabel((String) b[4]), 0));
        out.put("topSessions", countRows(seatedC, seatedP, b -> label((String) b[5], "Untitled session"), TOP_ROWS));
        out.put("byTrainer", countRows(seatedC, seatedP, b -> label((String) b[6], "No trainer"), TOP_ROWS));
        out.put("byWeekday", weekdayRows(seatedC, seatedP, b -> ((LocalDate) b[3]).atStartOfDay()));
        return out;
    }

    /**
     * [bookings (seat-holding + cancelled, not waitlisted), PT, class, checked-in, no-show, show rate,
     * cancelled, cancellation rate, waitlisted, sessions scheduled, seat utilisation, paid value].
     * Show rate only counts sessions already held (dated before today).
     */
    private static double[] bookingStats(Period p) {
        LocalDate today = LocalDate.now();
        long total = 0, pt = 0, cls = 0, checked = 0, noShow = 0, cancelled = 0, waitlisted = 0, heldBooked = 0;
        BigDecimal value = BigDecimal.ZERO;
        for (Object[] b : p.bookings()) {
            String status = bstatus(b);
            if ("waitlisted".equals(status)) {
                waitlisted++;
                continue;
            }
            total++;
            if ("cancelled".equals(status)) {
                cancelled++;
                continue;
            }
            if (isPt(b[4])) pt++;
            else cls++;
            if ("checked-in".equals(status) || "checked_in".equals(status) || "attended".equals(status)) checked++;
            if ("no-show".equals(status) || "no_show".equals(status)) noShow++;
            LocalDate date = (LocalDate) b[3];
            boolean held = date != null && date.isBefore(today);
            if (held && !"pending_approval".equals(status)) heldBooked++;
            if (b[2] != null && "paid".equalsIgnoreCase((String) b[2])) value = value.add(bd(b[1]));
        }
        // Seats taken vs capacity on sessions that weren't cancelled
        Map<Long, Integer> capacity = new HashMap<>();
        long scheduled = 0;
        for (Object[] s : p.sessions()) {
            if ("cancelled".equalsIgnoreCase((String) s[3])) continue;
            scheduled++;
            if (s[2] != null && ((Number) s[2]).intValue() > 0) capacity.put((Long) s[0], ((Number) s[2]).intValue());
        }
        long seats = capacity.values().stream().mapToLong(Integer::longValue).sum();
        // Seat-holding bookings on those capacity-limited sessions (capped per session at its capacity)
        Map<Long, Integer> taken = new HashMap<>();
        for (Object[] b : p.bookings()) {
            if (NO_SEAT.contains(bstatus(b)) || !capacity.containsKey((Long) b[7])) continue;
            taken.merge((Long) b[7], 1, Integer::sum);
        }
        long seated = taken.entrySet().stream().mapToLong(e -> Math.min(e.getValue(), capacity.get(e.getKey()))).sum();
        long showBase = Math.max(heldBooked, checked + noShow);
        return new double[]{total, pt, cls, checked, noShow, pct(checked, showBase), cancelled, pct(cancelled, total),
                waitlisted, scheduled, pct(seated, seats), value.doubleValue()};
    }

    private static String bookingStatusLabel(String s) {
        return switch (s) {
            case "confirmed" -> "Confirmed";
            case "pending_approval" -> "Pending approval";
            case "checked-in", "checked_in", "attended" -> "Checked in";
            case "no-show", "no_show" -> "No-show";
            case "cancelled" -> "Cancelled";
            case "waitlisted" -> "Waitlisted";
            default -> capitalize(s.replace('_', ' '));
        };
    }

    private static String sessionTypeLabel(String type) {
        if (type == null || type.isBlank()) return "Classes";
        return switch (type.trim().toLowerCase(Locale.ROOT)) {
            case "class" -> "Classes";
            case "facility" -> "Facilities";
            default -> capitalize(type.trim());
        };
    }

    // ── Members ─────────────────────────────────────────────────────────────

    private Map<String, Object> memberSection(Period c, Period p, List<Metric> metrics) {
        String a = "members";
        Map<String, long[]> typesC = receiptTypeCounts(c.receiptTypes());
        Map<String, long[]> typesP = receiptTypeCounts(p.receiptTypes());
        long renewC = typesC.getOrDefault("Renewal", new long[2])[0];
        long renewP = typesP.getOrDefault("Renewal", new long[2])[0];
        metrics.add(new Metric(a, "joins", "New members joined", c.joins().size(), p.joins().size(), "count", true));
        metrics.add(new Metric(a, "renewals", "Renewals", renewC, renewP, "count", true));
        metrics.add(new Metric(a, "dayPasses", "Day passes sold",
                typesC.getOrDefault("Daily Entry", new long[2])[0], typesP.getOrDefault("Daily Entry", new long[2])[0], "count", true));
        metrics.add(new Metric(a, "addons", "Add-ons sold",
                typesC.getOrDefault("Add-on", new long[2])[0], typesP.getOrDefault("Add-on", new long[2])[0], "count", true));
        metrics.add(new Metric(a, "ending", "Memberships ending", c.membershipsEnding(), p.membershipsEnding(), "count", false));
        metrics.add(new Metric(a, "renewalRatio", "Renewals per ending membership",
                pct(renewC, c.membershipsEnding()), pct(renewP, p.membershipsEnding()), "percent", true));

        Map<String, Object> out = new LinkedHashMap<>();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String type : RECEIPT_TYPES_SHOWN) {
            long[] cv = typesC.getOrDefault(type, new long[2]);
            long[] pv = typesP.getOrDefault(type, new long[2]);
            if (cv[0] == 0 && pv[0] == 0) continue;
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("name", RECEIPT_TYPE_LABELS.getOrDefault(type, type));
            r.put("current", cv[0]);
            r.put("previous", pv[0]);
            r.put("amount", round(cv[1] / 100.0));
            r.put("previousAmount", round(pv[1] / 100.0));
            rows.add(r);
        }
        out.put("byReceiptType", rows);
        return out;
    }

    /** type → [count, amount in cents]. */
    private static Map<String, long[]> receiptTypeCounts(List<Object[]> rows) {
        Map<String, long[]> out = new HashMap<>();
        for (Object[] r : rows) {
            String type = r[0] == null ? "Other" : (String) r[0];
            long[] v = out.computeIfAbsent(type, k -> new long[2]);
            v[0] += ((Number) r[1]).longValue();
            v[1] += bd(r[2]).movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValue();
        }
        return out;
    }

    // ── Trend ───────────────────────────────────────────────────────────────

    private static final List<String> TREND_KEYS =
            List.of("checkIns", "bookings", "leads", "conversions", "freezes", "posSales", "posNet", "joins");

    private List<Map<String, Object>> trend(Period c, Period p, Window cur, Window pre, String bucket) {
        List<LocalDateTime> curBuckets = buckets(cur, bucket);
        List<LocalDateTime> preBuckets = buckets(pre, bucket);
        Map<LocalDateTime, double[]> cv = series(c, cur, curBuckets, bucket);
        Map<LocalDateTime, double[]> pv = series(p, pre, preBuckets, bucket);
        DateTimeFormatter hour = DateTimeFormatter.ofPattern("h a", Locale.ENGLISH);
        DateTimeFormatter day = DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH);
        DateTimeFormatter month = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < curBuckets.size(); i++) {
            LocalDateTime at = curBuckets.get(i);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("label", switch (bucket) {
                case "hourly" -> at.format(hour) + (cur.from().equals(cur.to()) ? "" : " " + at.format(day));
                case "daily" -> at.format(day);
                case "weekly" -> "Wk " + at.format(day);
                default -> at.format(month);
            });
            double[] a = cv.get(at);
            double[] b = i < preBuckets.size() ? pv.get(preBuckets.get(i)) : null;
            for (int k = 0; k < TREND_KEYS.size(); k++) {
                row.put(TREND_KEYS.get(k), round(a[k]));
                row.put(TREND_KEYS.get(k) + "Prev", b == null ? null : round(b[k]));
            }
            rows.add(row);
        }
        return rows;
    }

    private static List<LocalDateTime> buckets(Window w, String bucket) {
        List<LocalDateTime> out = new ArrayList<>();
        LocalDateTime cursor = RevenueDashboardService.bucketStart(w.start(), bucket);
        while (cursor.isBefore(w.end())) {
            out.add(cursor);
            cursor = RevenueDashboardService.next(cursor, bucket);
        }
        return out;
    }

    private static Map<LocalDateTime, double[]> series(Period p, Window w, List<LocalDateTime> buckets, String bucket) {
        Map<LocalDateTime, double[]> out = new LinkedHashMap<>();
        buckets.forEach(b -> out.put(b, new double[TREND_KEYS.size()]));
        java.util.function.BiConsumer<LocalDateTime, double[]> add = (at, delta) -> {
            if (at == null || !w.contains(at)) return;
            double[] v = out.get(RevenueDashboardService.bucketStart(at, bucket));
            if (v == null) return;
            for (int i = 0; i < delta.length; i++) v[i] += delta[i];
        };
        for (Object[] a : p.attendance()) add.accept((LocalDateTime) a[0], unit(0, 1));
        for (Object[] b : p.bookings()) {
            if (NO_SEAT.contains(bstatus(b)) || b[3] == null) continue;
            LocalTime noon = LocalTime.NOON;
            add.accept(((LocalDate) b[3]).atTime(noon), unit(1, 1));
        }
        for (Object[] l : p.leads()) {
            add.accept((LocalDateTime) l[0], unit(2, 1));
            if (converted(l)) add.accept((LocalDateTime) l[0], unit(3, 1));
        }
        for (Object[] f : p.freezes()) add.accept((LocalDateTime) f[0], unit(4, 1));
        for (Object[] t : p.sales()) {
            if (!posCounted(t)) continue;
            double[] d = new double[TREND_KEYS.size()];
            if ("COMPLETED".equals(t[1])) d[5] = 1;
            d[6] = posNet(t).doubleValue();
            add.accept((LocalDateTime) t[0], d);
        }
        for (LocalDateTime j : p.joins()) add.accept(j, unit(7, 1));
        return out;
    }

    private static double[] unit(int index, double value) {
        double[] d = new double[TREND_KEYS.size()];
        d[index] = value;
        return d;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Targets
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Monthly targets for the months the range touches and the months its comparison window
     * touches: the institution-wide target (target vs achieved, overall and by category), every
     * staff member's target vs achieved, plus the institution target history for the 12 months
     * up to the range's last month. "Achieved" is the live figure Staff Targets shows (the whole
     * month), so a partial range still compares full months.
     */
    public Map<String, Object> getTargets(LocalDate from, LocalDate to, String compare) {
        if (to.isBefore(from)) {
            LocalDate swap = from;
            from = to;
            to = swap;
        }
        LocalDate[] w = RevenueDashboardService.comparisonWindow(from, to, compare, LocalDate.now());
        to = w[1];
        List<YearMonth> curMonths = months(from, to);
        List<YearMonth> preMonths = months(w[2], w[3]);
        Map<YearMonth, List<StaffTargetResponseDTO>> cache = new HashMap<>();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("months", curMonths.stream().map(RevenueOperationsService::monthLabel).toList());
        result.put("previousMonths", preMonths.stream().map(RevenueOperationsService::monthLabel).toList());
        result.put("sameMonths", curMonths.equals(preMonths));

        result.put("institution", institutionTotals(curMonths, cache));
        result.put("previousInstitution", institutionTotals(preMonths, cache));
        result.put("staff", staffRows(curMonths, preMonths, cache));

        // Institution history: 12 months up to the range's last month
        YearMonth last = YearMonth.from(to);
        List<Map<String, Object>> history = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            YearMonth ym = last.minusMonths(i);
            Map<String, Object> totals = institutionTotals(List.of(ym), cache);
            if (!Boolean.TRUE.equals(totals.get("hasTarget")) && !ym.isAfter(YearMonth.now())) {
                // No institution target that month: still show what the gym actually took
                StaffProgressCalculator.RevenueBreakdown gym = progressCalculator.computeGymRevenueBreakdown(
                        ym.atDay(1).atStartOfDay(), ym.plusMonths(1).atDay(1).atStartOfDay());
                totals.put("achieved", scale(gym.total()));
                totals.put("membershipAchieved", scale(gym.memberships()));
                totals.put("posAchieved", scale(gym.pos()));
                totals.put("ptAchieved", scale(gym.pt()));
            }
            totals.put("month", monthLabel(ym));
            history.add(totals);
        }
        result.put("history", history);
        return result;
    }

    private static List<YearMonth> months(LocalDate from, LocalDate to) {
        List<YearMonth> out = new ArrayList<>();
        for (YearMonth ym = YearMonth.from(from); !ym.isAfter(YearMonth.from(to)); ym = ym.plusMonths(1)) out.add(ym);
        return out;
    }

    private static String monthLabel(YearMonth ym) {
        return ym.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + ym.getYear();
    }

    /**
     * The month's targets with achieved figures, from the performance engine (the same source as
     * Staff Targets): individual staff targets plus the branch-wide (institution) one.
     */
    private List<StaffTargetResponseDTO> monthTargets(YearMonth ym, Map<YearMonth, List<StaffTargetResponseDTO>> cache) {
        return cache.computeIfAbsent(ym, k -> staffTargetService.getTargets(k.getYear(), k.getMonthValue(), null, null));
    }

    private static boolean isInstitution(StaffTargetResponseDTO t) {
        return t.getStaffDbId() == null || "institution".equalsIgnoreCase(t.getScope());
    }

    private Map<String, Object> institutionTotals(List<YearMonth> months, Map<YearMonth, List<StaffTargetResponseDTO>> cache) {
        BigDecimal[] v = new BigDecimal[8];
        java.util.Arrays.fill(v, BigDecimal.ZERO);
        int withTarget = 0;
        for (YearMonth ym : months) {
            for (StaffTargetResponseDTO t : monthTargets(ym, cache)) {
                if (!isInstitution(t)) continue;
                withTarget++;
                v[0] = v[0].add(nz(t.getRevenueTarget()));
                v[1] = v[1].add(nz(t.getRevenueAchieved()));
                v[2] = v[2].add(nz(t.getMembershipRevenueTarget()));
                v[3] = v[3].add(nz(t.getMembershipRevenueAchieved()));
                v[4] = v[4].add(nz(t.getPosRevenueTarget()));
                v[5] = v[5].add(nz(t.getPosRevenueAchieved()));
                v[6] = v[6].add(nz(t.getPtRevenueTarget()));
                v[7] = v[7].add(nz(t.getPtRevenueAchieved()));
            }
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("hasTarget", withTarget > 0);
        m.put("target", scale(v[0]));
        m.put("achieved", scale(v[1]));
        m.put("membershipTarget", scale(v[2]));
        m.put("membershipAchieved", scale(v[3]));
        m.put("posTarget", scale(v[4]));
        m.put("posAchieved", scale(v[5]));
        m.put("ptTarget", scale(v[6]));
        m.put("ptAchieved", scale(v[7]));
        return m;
    }

    private List<Map<String, Object>> staffRows(List<YearMonth> curMonths, List<YearMonth> preMonths,
                                                Map<YearMonth, List<StaffTargetResponseDTO>> cache) {
        Map<String, BigDecimal[]> rows = new LinkedHashMap<>();
        Map<String, String> roles = new HashMap<>();
        java.util.function.BiConsumer<List<YearMonth>, Integer> collect = (months, offset) -> {
            for (YearMonth ym : months) {
                for (StaffTargetResponseDTO t : monthTargets(ym, cache)) {
                    if (isInstitution(t)) continue;
                    String name = t.getStaffName() != null ? t.getStaffName() : "Staff #" + t.getStaffDbId();
                    roles.putIfAbsent(name, t.getStaffRole());
                    BigDecimal[] v = rows.computeIfAbsent(name, k -> {
                        BigDecimal[] z = new BigDecimal[4];
                        java.util.Arrays.fill(z, BigDecimal.ZERO);
                        return z;
                    });
                    v[offset] = v[offset].add(nz(t.getRevenueTarget()));
                    v[offset + 1] = v[offset + 1].add(nz(t.getRevenueAchieved()));
                }
            }
        };
        collect.accept(curMonths, 0);
        collect.accept(preMonths, 2);
        List<Map<String, Object>> out = new ArrayList<>();
        rows.forEach((name, v) -> {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("name", name);
            r.put("role", roles.get(name));
            r.put("target", scale(v[0]));
            r.put("achieved", scale(v[1]));
            r.put("previousTarget", scale(v[2]));
            r.put("previousAchieved", scale(v[3]));
            out.add(r);
        });
        out.sort((x, y) -> ((BigDecimal) y.get("achieved")).compareTo((BigDecimal) x.get("achieved")));
        return out;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Row helpers
    // ═════════════════════════════════════════════════════════════════════════

    /** (name, current, previous) counts, largest current first, then previous-only names. */
    private static <T> List<Map<String, Object>> countRows(List<T> cur, List<T> prev, Function<T, String> key, int limit) {
        return amountRows(cur, prev, key, null, limit);
    }

    /**
     * (name, current, previous[, amount, previousAmount]) rows. With an amount function rows are
     * ranked by amount, else by count.
     */
    private static <T> List<Map<String, Object>> amountRows(List<T> cur, List<T> prev, Function<T, String> key,
                                                            Function<T, BigDecimal> amount, int limit) {
        Map<String, double[]> c = tally(cur, key, amount);
        Map<String, double[]> p = tally(prev, key, amount);
        int rank = amount == null ? 0 : 1;
        List<String> names = new ArrayList<>(c.keySet());
        names.sort((a, b) -> Double.compare(c.get(b)[rank], c.get(a)[rank]));
        p.keySet().stream().filter(k -> !c.containsKey(k))
                .sorted((a, b) -> Double.compare(p.get(b)[rank], p.get(a)[rank]))
                .forEach(names::add);
        if (limit > 0 && names.size() > limit) names = names.subList(0, limit);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String name : names) {
            double[] cv = c.getOrDefault(name, new double[2]);
            double[] pv = p.getOrDefault(name, new double[2]);
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("name", name);
            r.put("current", (long) cv[0]);
            r.put("previous", (long) pv[0]);
            if (amount != null) {
                r.put("amount", round(cv[1]));
                r.put("previousAmount", round(pv[1]));
            }
            rows.add(r);
        }
        return rows;
    }

    /** Count rows in a fixed order (every label present, even at zero in both periods). */
    private static <T> List<Map<String, Object>> orderedCountRows(List<T> cur, List<T> prev, Function<T, String> key,
                                                                  List<String> order) {
        Map<String, double[]> c = tally(cur, key, null);
        Map<String, double[]> p = tally(prev, key, null);
        List<String> names = new ArrayList<>(order);
        c.keySet().stream().filter(k -> !names.contains(k)).forEach(names::add);
        p.keySet().stream().filter(k -> !names.contains(k)).forEach(names::add);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String name : names) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("name", name);
            r.put("current", (long) c.getOrDefault(name, new double[2])[0]);
            r.put("previous", (long) p.getOrDefault(name, new double[2])[0]);
            rows.add(r);
        }
        return rows;
    }

    private static <T> Map<String, double[]> tally(List<T> items, Function<T, String> key, Function<T, BigDecimal> amount) {
        Map<String, double[]> out = new LinkedHashMap<>();
        for (T item : items) {
            String k = key.apply(item);
            if (k == null) continue;
            double[] v = out.computeIfAbsent(k, x -> new double[2]);
            v[0]++;
            if (amount != null) v[1] += nz(amount.apply(item)).doubleValue();
        }
        return out;
    }

    /** Mon–Sun counts (and amounts for POS) for both periods. */
    private static List<Map<String, Object>> weekdayRows(List<Object[]> cur, List<Object[]> prev,
                                                         Function<Object[], LocalDateTime> at) {
        Function<Object[], String> day = r -> {
            LocalDateTime t = at.apply(r);
            return t == null ? null : t.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
        };
        List<String> order = new ArrayList<>();
        for (DayOfWeek d : DayOfWeek.values()) order.add(d.getDisplayName(TextStyle.SHORT, Locale.ENGLISH));
        return orderedCountRows(cur, prev, day, order);
    }

    /** 5 AM – 11 PM (plus any other hour with activity) for both periods. */
    private static List<Map<String, Object>> hourRows(List<Object[]> cur, List<Object[]> prev,
                                                      Function<Object[], LocalDateTime> at) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("h a", Locale.ENGLISH);
        int[] c = new int[24], p = new int[24];
        for (Object[] r : cur) if (at.apply(r) != null) c[at.apply(r).getHour()]++;
        for (Object[] r : prev) if (at.apply(r) != null) p[at.apply(r).getHour()]++;
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            if ((h < 5 || h > 23) && c[h] == 0 && p[h] == 0) continue;
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("hour", h);
            r.put("name", LocalTime.of(h, 0).format(fmt));
            r.put("current", c[h]);
            r.put("previous", p[h]);
            rows.add(r);
        }
        return rows;
    }

    private static String statusLabel(String status) {
        if (status == null || status.isBlank()) return "New";
        return switch (status.trim().toLowerCase(Locale.ROOT)) {
            case "new" -> "New";
            case "contacted" -> "Contacted";
            case "follow_up", "follow-up", "followup" -> "Follow up";
            case "converted" -> "Converted";
            case "lost" -> "Lost";
            default -> capitalize(status.trim().replace('_', ' '));
        };
    }

    private static String label(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : capitalize(value.trim().replace('_', ' '));
    }

    private static String capitalize(String s) {
        return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    // ── Numbers ─────────────────────────────────────────────────────────────

    private static double pct(double part, double whole) {
        return whole == 0 ? Double.NaN : part * 100.0 / whole;
    }

    private static double avg(BigDecimal total, long count) {
        return count == 0 ? Double.NaN : total.doubleValue() / count;
    }

    private static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private static long num(Object v) {
        return v == null ? 0 : ((Number) v).longValue();
    }

    private static BigDecimal bd(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal b) return b;
        return new BigDecimal(v.toString());
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static BigDecimal scale(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
