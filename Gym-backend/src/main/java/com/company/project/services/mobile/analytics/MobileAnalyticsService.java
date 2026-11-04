package com.company.project.services.mobile.analytics;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.mobile.analytics.MobileAnalyticsDTOs.*;
import com.company.project.entities.SaleTransaction;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.BranchContextHolder;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Data for the mobile admin Analytics screen. Every query is scoped to the
 * active branch (X-Active-Branch-Id) — through the Hibernate branch filter and,
 * for tables without a branch column (add-ons, freezes, sale items), through
 * the owning member / sale.
 *
 * Periods: "month" (this month to date), "last_month", "3m", "12m". Each KPI
 * is compared with the previous period of the same length.
 */
@Service
@Transactional(readOnly = true)
public class MobileAnalyticsService {

    private static final int TOP_N = 6;
    private static final String OTHER = "Other";

    @PersistenceContext
    private EntityManager em;

    private final MemberRepository memberRepository;

    public MobileAnalyticsService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    // ── Periods ───────────────────────────────────────────────────────────

    enum Granularity { DAY, WEEK, MONTH }

    /** [start, end) dates plus the equally long period right before it. */
    record Period(String key, LocalDate start, LocalDate end, LocalDate prevStart, LocalDate prevEnd, Granularity granularity) {
        LocalDateTime startAt() { return start.atStartOfDay(); }
        LocalDateTime endAt() { return end.atStartOfDay(); }
        LocalDateTime prevStartAt() { return prevStart.atStartOfDay(); }
        LocalDateTime prevEndAt() { return prevEnd.atStartOfDay(); }
        Range toRange() { return new Range(key, start, end.minusDays(1), granularity.name().toLowerCase()); }
    }

    static Period resolvePeriod(String raw, LocalDate today) {
        String key = raw == null ? "month" : raw.trim().toLowerCase();
        LocalDate tomorrow = today.plusDays(1);
        LocalDate monthStart = today.withDayOfMonth(1);
        switch (key) {
            case "last_month": {
                LocalDate start = monthStart.minusMonths(1);
                return new Period(key, start, monthStart, start.minusMonths(1), start, Granularity.DAY);
            }
            case "3m": {
                LocalDate start = today.minusMonths(3).plusDays(1);
                long days = java.time.temporal.ChronoUnit.DAYS.between(start, tomorrow);
                return new Period(key, start, tomorrow, start.minusDays(days), start, Granularity.WEEK);
            }
            case "12m": {
                LocalDate start = monthStart.minusMonths(11);
                return new Period(key, start, tomorrow, start.minusMonths(12), today.minusMonths(12).plusDays(1), Granularity.MONTH);
            }
            default: {
                // Month to date vs the same number of days at the start of last month
                long elapsed = today.getDayOfMonth();
                LocalDate prevStart = monthStart.minusMonths(1);
                LocalDate prevEnd = prevStart.plusDays(Math.min(elapsed, prevStart.lengthOfMonth()));
                return new Period("month", monthStart, tomorrow, prevStart, prevEnd, Granularity.DAY);
            }
        }
    }

    static LocalDate bucketOf(LocalDate d, Granularity g) {
        return switch (g) {
            case DAY -> d;
            case WEEK -> d.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MONTH -> d.withDayOfMonth(1);
        };
    }

    /** Every bucket start in the period, so charts get explicit zero points. */
    static List<LocalDate> buckets(Period p) {
        List<LocalDate> out = new ArrayList<>();
        LocalDate b = bucketOf(p.start(), p.granularity());
        while (b.isBefore(p.end())) {
            out.add(b);
            b = switch (p.granularity()) {
                case DAY -> b.plusDays(1);
                case WEEK -> b.plusWeeks(1);
                case MONTH -> b.plusMonths(1);
            };
        }
        return out;
    }

    // ── Membership & Add-ons ──────────────────────────────────────────────

    private static final String END_DATE = MemberRepository.BIOS_END_DATE;
    private static final String VALID_RECEIPT =
            "(r.approvalStatus IS NULL OR UPPER(r.approvalStatus) <> 'REJECTED') " +
            "AND (r.status IS NULL OR LOWER(r.status) <> 'cancelled')";

    public MembershipAnalytics membership(String periodKey) {
        LocalDateTime now = LocalDateTime.now();
        Period p = resolvePeriod(periodKey, LocalDate.now());

        // [y, m, d, type, count, paid]
        Map<LocalDate, long[]> joinsByBucket = new HashMap<>(); // [new, renewals]
        long newJoins = 0, renewals = 0;
        BigDecimal revenue = BigDecimal.ZERO;
        for (Object[] row : membershipReceipts(p.startAt(), p.endAt())) {
            LocalDate day = date(row);
            boolean isNew = "new".equalsIgnoreCase((String) row[3]);
            long count = num(row[4]).longValue();
            long[] slot = joinsByBucket.computeIfAbsent(bucketOf(day, p.granularity()), k -> new long[2]);
            slot[isNew ? 0 : 1] += count;
            if (isNew) newJoins += count; else renewals += count;
            revenue = revenue.add(dec(row[5]));
        }
        long prevNew = 0, prevRenewals = 0;
        BigDecimal prevRevenue = BigDecimal.ZERO;
        for (Object[] row : membershipReceipts(p.prevStartAt(), p.prevEndAt())) {
            if ("new".equalsIgnoreCase((String) row[3])) prevNew += num(row[4]).longValue();
            else prevRenewals += num(row[4]).longValue();
            prevRevenue = prevRevenue.add(dec(row[5]));
        }

        // Lost = memberships that ended in the period and were not renewed (a renewal moves the end date on)
        Map<LocalDate, Long> lostByBucket = new HashMap<>();
        long lost = 0;
        for (Object[] row : lostMembers(p.startAt(), min(p.endAt(), now))) {
            long count = num(row[3]).longValue();
            lostByBucket.merge(bucketOf(date(row), p.granularity()), count, Long::sum);
            lost += count;
        }
        long prevLost = 0;
        for (Object[] row : lostMembers(p.prevStartAt(), min(p.prevEndAt(), now))) prevLost += num(row[3]).longValue();

        List<MembershipTrendPoint> trend = buckets(p).stream().map(b -> {
            long[] j = joinsByBucket.getOrDefault(b, new long[2]);
            return new MembershipTrendPoint(b, j[0], j[1], lostByBucket.getOrDefault(b, 0L));
        }).toList();

        long activeMembers = memberRepository.countEffectivelyActive(now);
        Double renewalRate = (renewals + lost) > 0 ? pct(renewals, renewals + lost) : null;

        String expiringJpql = "SELECT COUNT(m) FROM Member m WHERE " + MemberRepository.BIOS_EFFECTIVELY_ACTIVE
                + " AND " + END_DATE + " < :until" + branch("m");
        long expiring7 = count(expiringJpql, Map.of("asOf", now, "until", now.plusDays(7)));
        long expiring30 = count(expiringJpql, Map.of("asOf", now, "until", now.plusDays(30)));
        long frozen = count("SELECT COUNT(m) FROM Member m WHERE LOWER(m.membershipStatus) = 'frozen'" + branch("m"), Map.of());

        BigDecimal freezeCharges = sum("SELECT COALESCE(SUM(f.chargeAmount), 0) FROM MembershipFreeze f, Member m " +
                "WHERE m.id = f.memberDbId AND f.chargeWaived = false AND f.createdAt >= :s AND f.createdAt < :e" + branch("m"),
                Map.of("s", p.startAt(), "e", p.endAt()));

        List<NamedValue> revenueByPlan = topWithOther(rows(
                "SELECT COALESCE(r.planName, 'Unknown'), COUNT(r), COALESCE(SUM(r.paidAmount), 0) FROM Receipt r " +
                "WHERE r.transactionType IN ('New', 'Renewal') AND r.transactionDate >= :s AND r.transactionDate < :e AND "
                + VALID_RECEIPT + branch("r") + " GROUP BY COALESCE(r.planName, 'Unknown')",
                Map.of("s", p.startAt(), "e", p.endAt())), TOP_N);

        // Add-ons: purchases net of refunds
        List<Object[]> addonRows = addonSales(p.startAt(), p.endAt());
        BigDecimal addonRevenue = addonRows.stream().map(r -> dec(r[2])).reduce(BigDecimal.ZERO, BigDecimal::add);
        long addonUnits = addonRows.stream().mapToLong(r -> num(r[1]).longValue()).sum();
        BigDecimal prevAddonRevenue = addonSales(p.prevStartAt(), p.prevEndAt()).stream()
                .map(r -> dec(r[2])).reduce(BigDecimal.ZERO, BigDecimal::add);
        List<NamedValue> topAddons = topWithOther(addonRows, TOP_N);

        long membersWithAddon = count("SELECT COUNT(DISTINCT a.memberDbId) FROM MemberAddon a, Member m " +
                "WHERE m.id = a.memberDbId AND LOWER(a.status) = 'active' AND (a.expiryDate IS NULL OR a.expiryDate >= :now) AND "
                + MemberRepository.BIOS_EFFECTIVELY_ACTIVE + branch("m"), Map.of("now", now, "asOf", now));
        Double uptake = activeMembers > 0 ? pct(membersWithAddon, activeMembers) : null;

        return new MembershipAnalytics(
                p.toRange(), activeMembers,
                kpi(newJoins, prevNew), kpi(renewals, prevRenewals), kpi(lost, prevLost), new Kpi(revenue, prevRevenue),
                renewalRate, expiring7, expiring30, frozen, freezeCharges,
                trend, revenueByPlan,
                new Kpi(addonRevenue, prevAddonRevenue), addonUnits, uptake, topAddons);
    }

    private List<Object[]> membershipReceipts(LocalDateTime s, LocalDateTime e) {
        return rows("SELECT YEAR(r.transactionDate), MONTH(r.transactionDate), DAY(r.transactionDate), r.transactionType, " +
                "COUNT(r), COALESCE(SUM(r.paidAmount), 0) FROM Receipt r " +
                "WHERE r.transactionType IN ('New', 'Renewal') AND r.transactionDate >= :s AND r.transactionDate < :e AND "
                + VALID_RECEIPT + branch("r") +
                " GROUP BY YEAR(r.transactionDate), MONTH(r.transactionDate), DAY(r.transactionDate), r.transactionType",
                Map.of("s", s, "e", e));
    }

    private List<Object[]> lostMembers(LocalDateTime s, LocalDateTime e) {
        if (!s.isBefore(e)) return List.of();
        return rows("SELECT YEAR(" + END_DATE + "), MONTH(" + END_DATE + "), DAY(" + END_DATE + "), COUNT(m) FROM Member m " +
                "WHERE " + END_DATE + " >= :s AND " + END_DATE + " < :e " +
                "AND (m.membershipStatus IS NULL OR LOWER(m.membershipStatus) NOT IN ('pending_approval', 'frozen', 'suspended'))"
                + branch("m") +
                " GROUP BY YEAR(" + END_DATE + "), MONTH(" + END_DATE + "), DAY(" + END_DATE + ")",
                Map.of("s", s, "e", e));
    }

    /** Rows of [addonName, units, netRevenue]. */
    private List<Object[]> addonSales(LocalDateTime s, LocalDateTime e) {
        String when = "COALESCE(a.purchaseDate, a.createdAt)";
        String from = BranchContextHolder.getActiveBranchId() != null
                ? "FROM MemberAddon a, Member m WHERE m.id = a.memberDbId" + branch("m") + " AND "
                : "FROM MemberAddon a WHERE ";
        return rows("SELECT COALESCE(a.addonName, 'Add-on'), COUNT(a), " +
                "COALESCE(SUM(COALESCE(a.amount, 0) - COALESCE(a.refundedAmount, 0)), 0) " + from +
                when + " >= :s AND " + when + " < :e AND (a.status IS NULL OR LOWER(a.status) NOT IN ('cancelled', 'rejected')) " +
                "GROUP BY COALESCE(a.addonName, 'Add-on')", Map.of("s", s, "e", e));
    }

    // ── Bookings & Classes ────────────────────────────────────────────────

    /** One booking joined to its session, flattened for in-memory aggregation. */
    private record BookingRow(long sessionId, String className, boolean pt, LocalDate date, LocalTime start,
                              String trainer, String status, String paymentStatus, BigDecimal price,
                              BigDecimal refunded, long bookingId) {
        boolean cancelled() { return status != null && status.toLowerCase().startsWith("cancel"); }
        BigDecimal netPaid() {
            if (!"paid".equalsIgnoreCase(paymentStatus) || price == null) return BigDecimal.ZERO;
            return price.subtract(refunded == null ? BigDecimal.ZERO : refunded).max(BigDecimal.ZERO);
        }
    }

    private static final class TrainerTally {
        long sessions;
        long bookings;
        BigDecimal revenue = BigDecimal.ZERO;
    }

    private record SessionRow(long id, String name, boolean pt, Integer capacity, String trainer) {}

    public BookingsAnalytics bookings(String periodKey) {
        LocalDate today = LocalDate.now();
        Period p = resolvePeriod(periodKey, today);

        List<BookingRow> current = bookingRows(p.start(), p.end());
        List<BookingRow> previous = bookingRows(p.prevStart(), p.prevEnd());
        List<SessionRow> sessions = sessionRows(p.start(), p.end());
        List<SessionRow> prevSessions = sessionRows(p.prevStart(), p.prevEnd());

        Set<Long> attendedIds = new HashSet<>();
        for (Object id : list("SELECT a.booking.id FROM Attendance a WHERE a.booking IS NOT NULL " +
                "AND a.booking.session.date >= :s AND a.booking.session.date < :e" + branch("a"),
                Map.of("s", p.start(), "e", p.end()))) {
            attendedIds.add(num(id).longValue());
        }

        // Outcomes
        long attended = 0, noShow = 0, cancelled = 0, upcoming = 0;
        for (BookingRow b : current) {
            if (b.cancelled()) cancelled++;
            else if (attendedIds.contains(b.bookingId()) || "attended".equalsIgnoreCase(b.status())) attended++;
            else if (b.date().isBefore(today)) noShow++;
            else upcoming++;
        }

        // Per-class fill for group classes
        Map<Long, Long> bookedBySession = current.stream().filter(b -> !b.cancelled())
                .collect(Collectors.groupingBy(BookingRow::sessionId, Collectors.counting()));
        Map<String, long[]> byClass = new LinkedHashMap<>(); // [sessions, booked, capacity]
        for (SessionRow s : sessions) {
            if (s.pt()) continue;
            long[] c = byClass.computeIfAbsent(s.name() == null ? "Class" : s.name(), k -> new long[3]);
            c[0]++;
            c[1] += bookedBySession.getOrDefault(s.id(), 0L);
            c[2] += s.capacity() == null ? 0 : s.capacity();
        }
        List<ClassFill> classFill = byClass.entrySet().stream()
                .map(e -> new ClassFill(e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[2],
                        e.getValue()[2] > 0 ? pct(e.getValue()[1], e.getValue()[2]) : 0))
                .sorted(Comparator.comparingLong(ClassFill::booked).reversed())
                .limit(8).toList();

        // Busiest day × hour
        Map<Integer, Long> heat = new HashMap<>();
        for (BookingRow b : current) {
            if (b.cancelled() || b.start() == null) continue;
            heat.merge(b.date().getDayOfWeek().getValue() * 100 + b.start().getHour(), 1L, Long::sum);
        }
        List<HeatCell> heatmap = heat.entrySet().stream()
                .map(e -> new HeatCell(e.getKey() / 100, e.getKey() % 100, e.getValue()))
                .sorted(Comparator.comparingInt(HeatCell::day).thenComparingInt(HeatCell::hour)).toList();

        BigDecimal ptRevenue = current.stream().filter(BookingRow::pt).map(BookingRow::netPaid).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal classRevenue = current.stream().filter(b -> !b.pt()).map(BookingRow::netPaid).reduce(BigDecimal.ZERO, BigDecimal::add);

        // Trainers: sessions run, bookings taken, revenue
        Map<String, TrainerTally> byTrainer = new HashMap<>();
        for (SessionRow s : sessions) {
            byTrainer.computeIfAbsent(trainerName(s.trainer()), k -> new TrainerTally()).sessions++;
        }
        for (BookingRow b : current) {
            if (b.cancelled()) continue;
            TrainerTally t = byTrainer.computeIfAbsent(trainerName(b.trainer()), k -> new TrainerTally());
            t.bookings++;
            t.revenue = t.revenue.add(b.netPaid());
        }
        List<TrainerStat> topTrainers = byTrainer.entrySet().stream()
                .filter(e -> !"Unassigned".equals(e.getKey()))
                .map(e -> new TrainerStat(e.getKey(), e.getValue().sessions, e.getValue().bookings, e.getValue().revenue))
                .sorted(Comparator.comparing(TrainerStat::revenue).thenComparingLong(TrainerStat::bookings).reversed())
                .limit(5).toList();

        long pendingApprovals = count("SELECT COUNT(b) FROM Booking b WHERE LOWER(b.status) = 'pending_approval'" + branch("b"), Map.of());

        return new BookingsAnalytics(
                p.toRange(),
                kpi(activeCount(current), activeCount(previous)),
                new Kpi(netRevenue(current), netRevenue(previous)),
                new Kpi(fillRate(sessions, current), fillRate(prevSessions, previous)),
                kpi(current.stream().filter(BookingRow::cancelled).count(), previous.stream().filter(BookingRow::cancelled).count()),
                pendingApprovals,
                new BookingOutcomes(attended, noShow, cancelled, upcoming),
                classFill, heatmap, ptRevenue, classRevenue, topTrainers);
    }

    private List<BookingRow> bookingRows(LocalDate s, LocalDate e) {
        return rows("SELECT ts.id, ts.name, ts.type, ts.date, ts.startTime, t.name, b.status, b.paymentStatus, " +
                "b.price, b.refundedAmount, b.id FROM Booking b JOIN b.session ts LEFT JOIN ts.trainer t " +
                "WHERE ts.date >= :s AND ts.date < :e" + branch("b"), Map.of("s", s, "e", e))
                .stream().map(r -> new BookingRow(num(r[0]).longValue(), (String) r[1], isPt((String) r[2]),
                        (LocalDate) r[3], (LocalTime) r[4], (String) r[5], (String) r[6], (String) r[7],
                        (BigDecimal) r[8], (BigDecimal) r[9], num(r[10]).longValue()))
                .toList();
    }

    private List<SessionRow> sessionRows(LocalDate s, LocalDate e) {
        return rows("SELECT ts.id, ts.name, ts.type, ts.capacity, t.name FROM TrainingSession ts LEFT JOIN ts.trainer t " +
                "WHERE ts.date >= :s AND ts.date < :e AND (ts.status IS NULL OR LOWER(ts.status) NOT LIKE 'cancel%')"
                + branch("ts"), Map.of("s", s, "e", e))
                .stream().map(r -> new SessionRow(num(r[0]).longValue(), (String) r[1], isPt((String) r[2]),
                        (Integer) r[3], (String) r[4]))
                .toList();
    }

    private static boolean isPt(String type) {
        if (type == null) return false;
        String t = type.toLowerCase();
        return t.equals("pt") || t.contains("personal");
    }

    private static String trainerName(String name) {
        return name == null || name.isBlank() ? "Unassigned" : name;
    }

    private static long activeCount(List<BookingRow> rows) {
        return rows.stream().filter(b -> !b.cancelled()).count();
    }

    private static BigDecimal netRevenue(List<BookingRow> rows) {
        return rows.stream().map(BookingRow::netPaid).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal fillRate(List<SessionRow> sessions, List<BookingRow> bookings) {
        Map<Long, Integer> capacity = new HashMap<>();
        for (SessionRow s : sessions) {
            if (!s.pt() && s.capacity() != null && s.capacity() > 0) capacity.put(s.id(), s.capacity());
        }
        long seats = capacity.values().stream().mapToLong(Integer::longValue).sum();
        if (seats == 0) return null;
        long booked = bookings.stream().filter(b -> !b.cancelled() && capacity.containsKey(b.sessionId())).count();
        return BigDecimal.valueOf(pct(booked, seats));
    }

    // ── POS Sales ─────────────────────────────────────────────────────────

    private static final String VALID_SALE = "(t.status IS NULL OR UPPER(t.status) NOT IN ('VOIDED', 'CANCELLED'))";
    private static final String NET_SALE = "(t.totalAmount - COALESCE(t.refundedAmount, 0))";

    private record PosTotals(long count, BigDecimal net, BigDecimal tax, BigDecimal cogs, BigDecimal discounts) {}

    public PosAnalytics pos(String periodKey) {
        Period p = resolvePeriod(periodKey, LocalDate.now());

        // [y, m, d, count, net, tax, cogs, discounts]
        Map<LocalDate, Object[]> byBucket = new HashMap<>();
        long count = 0;
        BigDecimal net = BigDecimal.ZERO, tax = BigDecimal.ZERO, cogs = BigDecimal.ZERO, discounts = BigDecimal.ZERO;
        for (Object[] r : posDaily(p.startAt(), p.endAt())) {
            LocalDate b = bucketOf(date(r), p.granularity());
            Object[] slot = byBucket.computeIfAbsent(b, k -> new Object[]{0L, BigDecimal.ZERO});
            slot[0] = (Long) slot[0] + num(r[3]).longValue();
            slot[1] = ((BigDecimal) slot[1]).add(dec(r[4]));
            count += num(r[3]).longValue();
            net = net.add(dec(r[4]));
            tax = tax.add(dec(r[5]));
            cogs = cogs.add(dec(r[6]));
            discounts = discounts.add(dec(r[7]));
        }
        PosTotals cur = new PosTotals(count, net, tax, cogs, discounts);
        PosTotals prev = posTotals(p.prevStartAt(), p.prevEndAt());

        List<SalesTrendPoint> trend = buckets(p).stream().map(b -> {
            Object[] s = byBucket.get(b);
            return s == null ? new SalesTrendPoint(b, BigDecimal.ZERO, 0)
                    : new SalesTrendPoint(b, (BigDecimal) s[1], (Long) s[0]);
        }).toList();

        Object[] returns = rows("SELECT COUNT(r), COALESCE(SUM(r.totalAmount), 0), COALESCE(SUM(r.totalCogs), 0) " +
                "FROM PosSaleReturn r WHERE r.createdAt >= :s AND r.createdAt < :e" + branch("r"),
                Map.of("s", p.startAt(), "e", p.endAt())).get(0);
        BigDecimal prevReturnCogs = sum("SELECT COALESCE(SUM(r.totalCogs), 0) FROM PosSaleReturn r " +
                "WHERE r.createdAt >= :s AND r.createdAt < :e" + branch("r"), Map.of("s", p.prevStartAt(), "e", p.prevEndAt()));

        String itemJoin = "FROM SaleTransactionItem i, SaleTransaction t WHERE t.id = i.transactionId AND " + VALID_SALE +
                " AND t.createdAt >= :s AND t.createdAt < :e" + branch("t");
        String itemNet = "COALESCE(SUM(i.totalAmount - COALESCE(i.billDiscountShare, 0)), 0)";
        Map<String, Object> range = Map.of("s", p.startAt(), "e", p.endAt());
        List<NamedValue> topProducts = rows("SELECT COALESCE(i.productName, 'Item'), " +
                "SUM(i.quantity - COALESCE(i.returnedQuantity, 0)), " + itemNet + " " + itemJoin +
                " GROUP BY COALESCE(i.productName, 'Item')", range)
                .stream().map(r -> new NamedValue((String) r[0], dec(r[2]), num(r[1]).longValue()))
                .sorted(Comparator.comparing(NamedValue::value).reversed()).limit(TOP_N).toList();
        List<NamedValue> byCategory = topWithOther(rows("SELECT COALESCE(i.categoryName, 'Uncategorised'), " +
                "SUM(i.quantity - COALESCE(i.returnedQuantity, 0)), " + itemNet + " " + itemJoin +
                " GROUP BY COALESCE(i.categoryName, 'Uncategorised')", range), TOP_N);

        BigDecimal outstandingCredit = sum("SELECT COALESCE(SUM(t.creditAmount - COALESCE(t.creditSettledAmount, 0)), 0) " +
                "FROM SaleTransaction t WHERE " + VALID_SALE + " AND t.creditAmount > COALESCE(t.creditSettledAmount, 0)" + branch("t"), Map.of());

        return new PosAnalytics(
                p.toRange(),
                new Kpi(cur.net(), prev.net()),
                kpi(cur.count(), prev.count()),
                new Kpi(avg(cur.net(), cur.count()), avg(prev.net(), prev.count())),
                new Kpi(margin(cur, dec(returns[2])), margin(prev, prevReturnCogs)),
                cur.discounts(),
                num(returns[0]).longValue(), dec(returns[1]),
                outstandingCredit,
                trend, topProducts, byCategory, paymentMix(p));
    }

    private List<Object[]> posDaily(LocalDateTime s, LocalDateTime e) {
        return rows("SELECT YEAR(t.createdAt), MONTH(t.createdAt), DAY(t.createdAt), COUNT(t), " +
                "COALESCE(SUM(" + NET_SALE + "), 0), COALESCE(SUM(t.taxAmount), 0), COALESCE(SUM(t.totalCogs), 0), " +
                "COALESCE(SUM(t.discountAmount), 0) FROM SaleTransaction t WHERE " + VALID_SALE +
                " AND t.createdAt >= :s AND t.createdAt < :e" + branch("t") +
                " GROUP BY YEAR(t.createdAt), MONTH(t.createdAt), DAY(t.createdAt)", Map.of("s", s, "e", e));
    }

    private PosTotals posTotals(LocalDateTime s, LocalDateTime e) {
        long count = 0;
        BigDecimal net = BigDecimal.ZERO, tax = BigDecimal.ZERO, cogs = BigDecimal.ZERO, disc = BigDecimal.ZERO;
        for (Object[] r : posDaily(s, e)) {
            count += num(r[3]).longValue();
            net = net.add(dec(r[4]));
            tax = tax.add(dec(r[5]));
            cogs = cogs.add(dec(r[6]));
            disc = disc.add(dec(r[7]));
        }
        return new PosTotals(count, net, tax, cogs, disc);
    }

    /** (net sales − tax − cost of goods kept) ÷ (net sales − tax). Null when no costs are recorded. */
    private static BigDecimal margin(PosTotals t, BigDecimal returnedCogs) {
        if (t.cogs().signum() <= 0) return null;
        BigDecimal revenue = t.net().subtract(t.tax());
        if (revenue.signum() <= 0) return null;
        BigDecimal profit = revenue.subtract(t.cogs().subtract(returnedCogs));
        return profit.multiply(BigDecimal.valueOf(100)).divide(revenue, 1, RoundingMode.HALF_UP);
    }

    /** Collected amount per payment method; "Mixed" sales are split into their legs. */
    private List<NamedValue> paymentMix(Period p) {
        Map<String, BigDecimal> totals = new HashMap<>();
        Map<String, Long> counts = new HashMap<>();
        for (Object[] r : rows("SELECT COALESCE(t.paymentMethod, 'OTHER'), COUNT(t), COALESCE(SUM(t.totalAmount), 0) " +
                "FROM SaleTransaction t WHERE " + VALID_SALE + " AND t.createdAt >= :s AND t.createdAt < :e " +
                "AND LOWER(COALESCE(t.paymentMethod, '')) NOT IN ('mixed', 'split')" + branch("t") +
                " GROUP BY COALESCE(t.paymentMethod, 'OTHER')", Map.of("s", p.startAt(), "e", p.endAt()))) {
            String m = normaliseMethod((String) r[0]);
            totals.merge(m, dec(r[2]), BigDecimal::add);
            counts.merge(m, num(r[1]).longValue(), Long::sum);
        }
        TypedQuery<SaleTransaction> mixed = em.createQuery("SELECT t FROM SaleTransaction t WHERE " + VALID_SALE +
                " AND t.createdAt >= :s AND t.createdAt < :e AND LOWER(t.paymentMethod) IN ('mixed', 'split')" + branch("t"),
                SaleTransaction.class);
        mixed.setParameter("s", p.startAt()).setParameter("e", p.endAt());
        bindBranch(mixed);
        for (SaleTransaction t : mixed.getResultList()) {
            List<PaymentSplitDTO> legs = t.getPaymentBreakdown();
            if (legs == null || legs.isEmpty()) {
                totals.merge("OTHER", nz(t.getTotalAmount()), BigDecimal::add);
                counts.merge("OTHER", 1L, Long::sum);
                continue;
            }
            for (PaymentSplitDTO leg : legs) {
                String m = normaliseMethod(leg.getMethod());
                totals.merge(m, nz(leg.getAmount()), BigDecimal::add);
                counts.merge(m, 1L, Long::sum);
            }
        }
        return totals.entrySet().stream()
                .filter(e -> e.getValue().signum() > 0)
                .map(e -> new NamedValue(e.getKey(), e.getValue(), counts.getOrDefault(e.getKey(), 0L)))
                .sorted(Comparator.comparing(NamedValue::value).reversed()).toList();
    }

    static String normaliseMethod(String raw) {
        if (raw == null) return "OTHER";
        String m = raw.trim().toLowerCase();
        if (m.contains("cash")) return "CASH";
        if (m.contains("card") || m.contains("credit card") || m.contains("debit")) return "CARD";
        if (m.contains("wallet")) return "WALLET";
        if (m.contains("credit")) return "CREDIT";
        if (m.contains("online") || m.contains("upi") || m.contains("bank") || m.contains("transfer") || m.contains("stripe")) return "ONLINE";
        return "OTHER";
    }

    // ── Query helpers ─────────────────────────────────────────────────────

    /** Explicit branch clause, on top of the Hibernate filter, so joined tables without a filter are scoped too. */
    private static String branch(String alias) {
        return BranchContextHolder.getActiveBranchId() != null ? " AND " + alias + ".branchId = :branchId" : "";
    }

    private void bindBranch(jakarta.persistence.Query q) {
        Long branchId = BranchContextHolder.getActiveBranchId();
        if (branchId != null && q.getParameters().stream().anyMatch(p -> "branchId".equals(p.getName()))) {
            q.setParameter("branchId", branchId);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Object> list(String jpql, Map<String, Object> params) {
        jakarta.persistence.Query q = em.createQuery(jpql);
        params.forEach(q::setParameter);
        bindBranch(q);
        return q.getResultList();
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> rows(String jpql, Map<String, Object> params) {
        jakarta.persistence.Query q = em.createQuery(jpql);
        params.forEach(q::setParameter);
        bindBranch(q);
        return q.getResultList();
    }

    private long count(String jpql, Map<String, Object> params) {
        jakarta.persistence.Query q = em.createQuery(jpql);
        params.forEach(q::setParameter);
        bindBranch(q);
        return num(q.getSingleResult()).longValue();
    }

    private BigDecimal sum(String jpql, Map<String, Object> params) {
        jakarta.persistence.Query q = em.createQuery(jpql);
        params.forEach(q::setParameter);
        bindBranch(q);
        return dec(q.getSingleResult());
    }

    /** Rows of [name, count, amount] → top N by amount, the rest folded into "Other". */
    private static List<NamedValue> topWithOther(List<Object[]> rows, int n) {
        List<NamedValue> all = rows.stream()
                .map(r -> new NamedValue((String) r[0], dec(r[2]), num(r[1]).longValue()))
                .filter(v -> v.value().signum() > 0 || v.count() > 0)
                .sorted(Comparator.comparing(NamedValue::value).reversed()).toList();
        if (all.size() <= n) return all;
        List<NamedValue> out = new ArrayList<>(all.subList(0, n - 1));
        List<NamedValue> rest = all.subList(n - 1, all.size());
        out.add(new NamedValue(OTHER,
                rest.stream().map(NamedValue::value).reduce(BigDecimal.ZERO, BigDecimal::add),
                rest.stream().mapToLong(NamedValue::count).sum()));
        return out;
    }

    private static LocalDate date(Object[] row) {
        return LocalDate.of(num(row[0]).intValue(), num(row[1]).intValue(), num(row[2]).intValue());
    }

    private static Number num(Object o) {
        return o == null ? 0 : (Number) o;
    }

    private static BigDecimal dec(Object o) {
        if (o == null) return BigDecimal.ZERO;
        if (o instanceof BigDecimal b) return b;
        return new BigDecimal(o.toString());
    }

    private static BigDecimal nz(BigDecimal b) {
        return b == null ? BigDecimal.ZERO : b;
    }

    private static Kpi kpi(long value, long previous) {
        return new Kpi(BigDecimal.valueOf(value), BigDecimal.valueOf(previous));
    }

    private static BigDecimal avg(BigDecimal total, long count) {
        return count > 0 ? total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
    }

    private static double pct(long part, long whole) {
        return Math.round(part * 1000.0 / whole) / 10.0;
    }

    private static LocalDateTime min(LocalDateTime a, LocalDateTime b) {
        return a.isBefore(b) ? a : b;
    }
}
