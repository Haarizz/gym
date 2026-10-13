package com.company.project.services;

import com.company.project.dto.BiosInsightsDTO.*;
import com.company.project.repositories.MemberRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Real-data figures for the BiOS analysis dialogs — replaces the "Sample data"
 * sections the dialogs shipped with. Every method is @Transactional, so the
 * request's branch filter (BranchFilterAspect) scopes each query to the active
 * branch, or to all branches in "All Branches" mode. Queries always start FROM a
 * branch-filtered entity; entities without a branch column (POS sale items,
 * purchase-order items, asset maintenance, workout feedback) are only ever
 * reached through their filtered parent.
 */
@Service
@Transactional(readOnly = true)
public class BiosInsightsService {

    /** Receipts that represent money actually taken. */
    private static final String MONEY_RECEIPT = "(r.approvalStatus IS NULL OR r.approvalStatus <> 'REJECTED') "
            + "AND (r.status IS NULL OR LOWER(r.status) NOT IN ('cancelled', 'refunded', 'void')) "
            + "AND COALESCE(r.paidAmount, 0) > 0";

    private static final Map<String, String> STREAM_BY_TRANSACTION_TYPE = Map.of(
            "new", "New memberships",
            "renewal", "Renewals",
            "add-on", "Add-ons",
            "daily entry", "Day passes",
            "class booking", "Class & PT bookings",
            "payment", "Balance payments",
            "freeze charge", "Freeze charges");
    private static final String RETAIL_STREAM = "Retail (POS)";

    @PersistenceContext
    private EntityManager entityManager;

    // ── Revenue ───────────────────────────────────────────────────────────────

    public RevenueInsights getRevenueInsights(int days) {
        int windowDays = Math.max(7, Math.min(days, 365));
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = today.minusDays(windowDays - 1L).atStartOfDay();
        LocalDateTime previousFrom = from.minusDays(windowDays);
        LocalDateTime streamsFrom = today.minusDays(59).atStartOfDay();
        LocalDateTime last30From = today.minusDays(29).atStartOfDay();
        LocalDateTime loadFrom = previousFrom.isBefore(streamsFrom) ? previousFrom : streamsFrom;

        List<Object[]> receipts = rows("SELECT r.paymentMethod, r.transactionDate, r.paidAmount, r.transactionType, r.membershipType "
                + "FROM Receipt r WHERE " + MONEY_RECEIPT + " AND r.transactionDate >= :from AND r.transactionDate <= :now",
                Map.of("from", loadFrom, "now", now));
        List<Object[]> posSales = rows("SELECT t.paymentMethod, t.createdAt, t.totalAmount FROM SaleTransaction t "
                + "WHERE t.status = 'COMPLETED' AND t.createdAt >= :from AND t.createdAt <= :now",
                Map.of("from", loadFrom, "now", now));

        // Payment method / weekday / hour over the window: receipts + POS sales.
        Map<String, long[]> methodCounts = new LinkedHashMap<>();
        Map<String, BigDecimal> methodAmounts = new HashMap<>();
        long[] weekdayCounts = new long[8];
        BigDecimal[] weekdayAmounts = zeros(8);
        long[] hourCounts = new long[24];
        BigDecimal[] hourAmounts = zeros(24);
        Map<String, BigDecimal> streamCurrent = new LinkedHashMap<>();
        Map<String, BigDecimal> streamPrevious = new HashMap<>();
        Map<String, long[]> typeReceipts = new HashMap<>();
        Map<String, BigDecimal> typeRevenue = new HashMap<>();
        Map<String, BigDecimal> typePrevious = new HashMap<>();

        List<Object[]> transactions = new ArrayList<>();
        for (Object[] r : receipts) transactions.add(new Object[] { r[0], r[1], r[2], r[3], r[4] });
        for (Object[] t : posSales) transactions.add(new Object[] { t[0], t[1], t[2], null, null });

        for (Object[] t : transactions) {
            LocalDateTime at = (LocalDateTime) t[1];
            BigDecimal amount = bd(t[2]);
            boolean isReceipt = t[3] != null || t[4] != null;
            String stream = isReceipt
                    ? STREAM_BY_TRANSACTION_TYPE.getOrDefault(lower(t[3]), "Other billing")
                    : RETAIL_STREAM;
            if (!at.isBefore(last30From)) {
                streamCurrent.merge(stream, amount, BigDecimal::add);
            } else if (!at.isBefore(streamsFrom)) {
                streamPrevious.merge(stream, amount, BigDecimal::add);
            }

            String type = lower(t[3]);
            boolean membershipSale = "new".equals(type) || "renewal".equals(type);
            String membershipType = label(t[4], "Unknown");
            if (!at.isBefore(from)) {
                String method = paymentMethodLabel(t[0]);
                methodCounts.computeIfAbsent(method, k -> new long[1])[0]++;
                methodAmounts.merge(method, amount, BigDecimal::add);
                int weekday = at.getDayOfWeek().getValue();
                weekdayCounts[weekday]++;
                weekdayAmounts[weekday] = weekdayAmounts[weekday].add(amount);
                hourCounts[at.getHour()]++;
                hourAmounts[at.getHour()] = hourAmounts[at.getHour()].add(amount);
                if (membershipSale) {
                    typeReceipts.computeIfAbsent(membershipType, k -> new long[1])[0]++;
                    typeRevenue.merge(membershipType, amount, BigDecimal::add);
                }
            } else if (!at.isBefore(previousFrom) && membershipSale) {
                typePrevious.merge(membershipType, amount, BigDecimal::add);
            }
        }

        List<PaymentMethodRow> paymentMethods = methodCounts.entrySet().stream()
                .map(e -> new PaymentMethodRow(e.getKey(), e.getValue()[0], methodAmounts.get(e.getKey())))
                .sorted(Comparator.comparing(PaymentMethodRow::amount).reversed())
                .toList();
        List<TimeSlotRow> byWeekday = new ArrayList<>();
        for (int d = 1; d <= 7; d++) byWeekday.add(new TimeSlotRow(d, weekdayCounts[d], weekdayAmounts[d]));
        List<TimeSlotRow> byHour = new ArrayList<>();
        for (int h = 0; h < 24; h++) byHour.add(new TimeSlotRow(h, hourCounts[h], hourAmounts[h]));

        // Membership types: members from the effective-status breakdown, fee/tenure from member rows.
        Map<String, MemberFacts> facts = memberFactsByType();
        Set<String> types = new TreeSet<>(facts.keySet());
        types.addAll(typeRevenue.keySet());
        List<MembershipTypeRevenue> membershipTypes = types.stream().map(type -> {
            MemberFacts f = facts.getOrDefault(type, new MemberFacts());
            return new MembershipTypeRevenue(type, f.members, f.active,
                    typeReceipts.getOrDefault(type, new long[1])[0],
                    typeRevenue.getOrDefault(type, BigDecimal.ZERO),
                    typePrevious.getOrDefault(type, BigDecimal.ZERO),
                    f.avgFee(), f.members > 0 ? round1(100.0 * f.expired / f.members) : 0.0,
                    f.avgTenureMonths());
        }).sorted(Comparator.comparing(MembershipTypeRevenue::revenue).reversed()
                .thenComparing(MembershipTypeRevenue::members, Comparator.reverseOrder())).toList();

        // Trainer (PT) and class tables from sessions dated in the window and their bookings.
        LocalDate fromDate = from.toLocalDate();
        Map<String, SessionAgg> trainers = new LinkedHashMap<>();
        Map<String, SessionAgg> classes = new LinkedHashMap<>();
        for (Object[] s : rows("SELECT s.id, s.type, s.name, tr.name, s.capacity FROM TrainingSession s LEFT JOIN s.trainer tr "
                + "WHERE s.date >= :from AND s.date <= :to", Map.of("from", fromDate, "to", today))) {
            SessionAgg agg = sessionBucket(s[1], s[2], s[3], trainers, classes);
            if (agg == null) continue;
            agg.sessions.add((Long) s[0]);
            agg.capacity += lng(s[4]);
        }
        for (Object[] b : rows("SELECT s.type, s.name, tr.name, b.price, b.refundedAmount, b.paymentStatus FROM Booking b "
                + "JOIN b.session s LEFT JOIN s.trainer tr WHERE s.date >= :from AND s.date <= :to AND b.cancelledBy IS NULL",
                Map.of("from", fromDate, "to", today))) {
            SessionAgg agg = sessionBucket(b[0], b[1], b[2], trainers, classes);
            if (agg == null) continue;
            agg.bookings++;
            if ("paid".equalsIgnoreCase(String.valueOf(b[5]))) {
                agg.revenue = agg.revenue.add(bd(b[3]).subtract(bd(b[4])).max(BigDecimal.ZERO));
            }
        }

        // Retail by POS category, with cost for margin.
        Map<String, Object[]> retailAgg = new HashMap<>();
        for (Object[] i : rows("SELECT i.categoryName, i.quantity, i.totalAmount, i.costPrice, t.id "
                + "FROM SaleTransaction t, SaleTransactionItem i WHERE i.transactionId = t.id AND t.status = 'COMPLETED' "
                + "AND t.createdAt >= :from AND t.createdAt <= :now", Map.of("from", from, "now", now))) {
            String category = label(i[0], "Uncategorised");
            Object[] agg = retailAgg.computeIfAbsent(category, k -> new Object[] { 0L, new HashSet<Long>(), BigDecimal.ZERO, BigDecimal.ZERO });
            long qty = lng(i[1]);
            agg[0] = (Long) agg[0] + qty;
            @SuppressWarnings("unchecked") Set<Long> txns = (Set<Long>) agg[1];
            txns.add((Long) i[4]);
            agg[2] = ((BigDecimal) agg[2]).add(bd(i[2]));
            agg[3] = ((BigDecimal) agg[3]).add(bd(i[3]).multiply(BigDecimal.valueOf(qty)));
        }
        @SuppressWarnings("unchecked")
        List<RetailCategory> retail = retailAgg.entrySet().stream()
                .map(e -> new RetailCategory(e.getKey(), (Long) e.getValue()[0], ((Set<Long>) e.getValue()[1]).size(),
                        (BigDecimal) e.getValue()[2], (BigDecimal) e.getValue()[3]))
                .sorted(Comparator.comparing(RetailCategory::revenue).reversed()).toList();

        Set<String> streamNames = new LinkedHashSet<>(streamCurrent.keySet());
        streamNames.addAll(streamPrevious.keySet());
        List<RevenueStream> streams = streamNames.stream()
                .map(s -> new RevenueStream(s, streamCurrent.getOrDefault(s, BigDecimal.ZERO), streamPrevious.getOrDefault(s, BigDecimal.ZERO)))
                .sorted(Comparator.comparing(RevenueStream::current).reversed()).toList();

        Object[] leadCounts = single("SELECT COUNT(l), SUM(CASE WHEN LOWER(l.status) = 'converted' THEN 1 ELSE 0 END) "
                + "FROM Lead l WHERE l.createdAt >= :from", Map.of("from", from));

        return new RevenueInsights(windowDays, paymentMethods, byWeekday, byHour, membershipTypes,
                toSessionRows(trainers), toSessionRows(classes), retail, streams,
                lng(leadCounts[0]), lng(leadCounts[1]));
    }

    // ── Members ───────────────────────────────────────────────────────────────

    public MemberInsights getMemberInsights() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime last30 = today.minusDays(29).atStartOfDay();

        List<MemberRow> members = loadMembers(startOfToday);
        Map<Long, BigDecimal> ltvByMember = ltvByMember();

        // Visits: last-30-day count and last check-in per member.
        Map<Long, long[]> visits30 = new HashMap<>();
        Map<Long, LocalDateTime> lastVisit = new HashMap<>();
        for (Object[] v : rows("SELECT a.member.id, SUM(CASE WHEN a.checkInTime >= :last30 THEN 1 ELSE 0 END), MAX(a.checkInTime) "
                + "FROM Attendance a WHERE a.member IS NOT NULL GROUP BY a.member.id", Map.of("last30", last30))) {
            visits30.put((Long) v[0], new long[] { lng(v[1]) });
            lastVisit.put((Long) v[0], (LocalDateTime) v[2]);
        }
        // Class / PT bookings in the last 30 days per member.
        Map<Long, long[]> bookings30 = new HashMap<>(); // [class, pt]
        for (Object[] b : rows("SELECT b.member.id, s.type, COUNT(b) FROM Booking b JOIN b.session s "
                + "WHERE b.member IS NOT NULL AND b.cancelledBy IS NULL AND s.date >= :from GROUP BY b.member.id, s.type",
                Map.of("from", last30.toLocalDate()))) {
            long[] counts = bookings30.computeIfAbsent((Long) b[0], k -> new long[2]);
            if ("pt".equalsIgnoreCase(String.valueOf(b[1]))) counts[1] += lng(b[2]); else counts[0] += lng(b[2]);
        }
        Map<Long, Long> posPurchases30 = new HashMap<>();
        for (Object[] p : rows("SELECT t.memberId, COUNT(t) FROM SaleTransaction t WHERE t.memberId IS NOT NULL "
                + "AND t.status = 'COMPLETED' AND t.createdAt >= :from GROUP BY t.memberId", Map.of("from", last30))) {
            posPurchases30.put((Long) p[0], lng(p[1]));
        }

        List<MemberRow> active = members.stream().filter(m -> m.active).toList();
        long visits = 0, classUsers = 0, ptUsers = 0;
        for (MemberRow m : active) {
            visits += visits30.getOrDefault(m.id, new long[1])[0];
            long[] b = bookings30.getOrDefault(m.id, new long[2]);
            if (b[0] > 0) classUsers++;
            if (b[1] > 0) ptUsers++;
        }
        Engagement engagement = new Engagement(active.size(), ratio(visits, active.size()),
                percent(classUsers, active.size()), percent(ptUsers, active.size()));

        // Segments per membership type.
        Map<String, List<MemberRow>> byType = members.stream().collect(Collectors.groupingBy(m -> m.membershipType, TreeMap::new, Collectors.toList()));
        List<SegmentRow> segments = byType.entrySet().stream().map(e -> {
            List<MemberRow> all = e.getValue();
            List<MemberRow> act = all.stream().filter(m -> m.active).toList();
            long v = act.stream().mapToLong(m -> visits30.getOrDefault(m.id, new long[1])[0]).sum();
            long c = act.stream().mapToLong(m -> bookings30.getOrDefault(m.id, new long[2])[0]).sum();
            long p = act.stream().mapToLong(m -> bookings30.getOrDefault(m.id, new long[2])[1]).sum();
            return new SegmentRow(e.getKey(), all.size(), act.size(), ratio(v, act.size()), ratio(c, act.size()), ratio(p, act.size()),
                    averageAge(all, today), averageFee(all), averageLtv(all, ltvByMember), averageTenure(all, today));
        }).sorted(Comparator.comparing(SegmentRow::members).reversed()).toList();

        // Demographics.
        String[] bandLabels = { "Under 18", "18-24", "25-34", "35-44", "45-54", "55+" };
        Map<String, List<MemberRow>> bands = new LinkedHashMap<>();
        for (String band : bandLabels) bands.put(band, new ArrayList<>());
        List<MemberRow> withBirthDate = members.stream().filter(m -> m.dateOfBirth != null && !m.dateOfBirth.isAfter(today)).toList();
        for (MemberRow m : withBirthDate) bands.get(ageBand(Period.between(m.dateOfBirth, today).getYears())).add(m);
        List<BandRow> ageBands = bands.entrySet().stream()
                .map(e -> new BandRow(e.getKey(), e.getValue().size(), averageLtv(e.getValue(), ltvByMember))).toList();
        List<LabelCount> genders = countBy(members, m -> genderLabel(m.gender), Integer.MAX_VALUE);
        List<LabelCount> nationalities = countBy(members.stream().filter(m -> m.nationality != null && !m.nationality.isBlank()).toList(),
                m -> m.nationality.trim(), 6);

        // Activity levels among effectively active members (check-ins in the last 30 days).
        long[] levels = new long[5];
        for (MemberRow m : active) {
            long n = visits30.getOrDefault(m.id, new long[1])[0];
            levels[n >= 15 ? 0 : n >= 8 ? 1 : n >= 4 ? 2 : n >= 1 ? 3 : 4]++;
        }
        String[] levelLabels = { "15+ visits", "8-14 visits", "4-7 visits", "1-3 visits", "No visits" };
        List<BandRow> activityLevels = new ArrayList<>();
        for (int i = 0; i < 5; i++) activityLevels.add(new BandRow(levelLabels[i], levels[i], null));

        // Tenure stages: all members by months since joining, with how many are still active.
        String[] stageLabels = { "0-3 months", "3-6 months", "6-12 months", "12-24 months", "24+ months" };
        long[][] stages = new long[5][2];
        for (MemberRow m : members) {
            if (m.joined == null) continue;
            long months = ChronoUnit.MONTHS.between(m.joined.toLocalDate(), today);
            int i = months < 3 ? 0 : months < 6 ? 1 : months < 12 ? 2 : months < 24 ? 3 : 4;
            stages[i][0]++;
            if (m.active) stages[i][1]++;
        }
        List<TenureStage> tenureStages = new ArrayList<>();
        for (int i = 0; i < 5; i++) tenureStages.add(new TenureStage(stageLabels[i], stages[i][0], stages[i][1]));

        List<MemberRow> paying = members.stream().filter(m -> ltvByMember.containsKey(m.id)).toList();
        Ltv ltv = new Ltv(averageLtv(paying, ltvByMember), paying.size(), averageTenure(members, today));

        // Engagement tiers (BI engine members tab).
        List<EngagementTier> tiers = new ArrayList<>();
        String[] tierLabels = { "High engagement (8+ visits)", "Medium engagement (2-7 visits)", "Low engagement (0-1 visits)" };
        for (int t = 0; t < 3; t++) {
            final int tier = t;
            List<MemberRow> inTier = active.stream().filter(m -> {
                long n = visits30.getOrDefault(m.id, new long[1])[0];
                return tier == 0 ? n >= 8 : tier == 1 ? n >= 2 && n < 8 : n < 2;
            }).toList();
            long tv = inTier.stream().mapToLong(m -> visits30.getOrDefault(m.id, new long[1])[0]).sum();
            long tc = inTier.stream().filter(m -> bookings30.getOrDefault(m.id, new long[2])[0] > 0).count();
            long tp = inTier.stream().mapToLong(m -> posPurchases30.getOrDefault(m.id, 0L)).sum();
            tiers.add(new EngagementTier(tierLabels[t], inTier.size(), round1(ratio(tv, inTier.size()) * 7 / 30.0),
                    percent(tc, inTier.size()), ratio(tp, inTier.size()), averageLtv(inTier, ltvByMember)));
        }

        // At risk: effectively active members with no check-in for 14+ days (or never), longest gap first.
        List<AtRiskMember> atRisk = active.stream()
                .map(m -> {
                    LocalDateTime last = lastVisit.get(m.id);
                    Long days = last != null ? ChronoUnit.DAYS.between(last.toLocalDate(), today) : null;
                    return new AtRiskMember(m.id, m.name, m.memberCode, last != null ? last.toLocalDate() : null, days,
                            m.endDate != null ? m.endDate.toLocalDate() : null);
                })
                .filter(r -> r.daysSinceVisit() == null || r.daysSinceVisit() >= 14)
                .sorted(Comparator.comparing((AtRiskMember r) -> r.daysSinceVisit() == null ? Long.MAX_VALUE : r.daysSinceVisit()).reversed())
                .limit(10).toList();

        // Acquisition: leads by source in the last 12 months, with converted members' lifetime value.
        List<ChannelRow> acquisition = leadSources(today.minusMonths(12).atStartOfDay(), ltvByMember);

        return new MemberInsights(today, segments, ageBands, genders, nationalities, averageAge(members, today),
                withBirthDate.size(), activityLevels, engagement, tenureStages, ltv, acquisition, tiers, atRisk,
                satisfaction(today));
    }

    // ── Marketing ─────────────────────────────────────────────────────────────

    public MarketingInsights getMarketingInsights(int days) {
        int windowDays = Math.max(7, Math.min(days, 730));
        LocalDate today = LocalDate.now();
        LocalDateTime from = today.minusDays(windowDays - 1L).atStartOfDay();
        List<ChannelRow> leadSources = leadSources(from, ltvByMember());

        Map<Long, Object[]> redemptions = new HashMap<>();
        for (Object[] r : rows("SELECT p.promotionId, COUNT(p), COALESCE(SUM(p.revenue), 0), COALESCE(SUM(p.savings), 0) "
                + "FROM PromotionRedemption p WHERE p.redeemedAt >= :from GROUP BY p.promotionId", Map.of("from", from))) {
            redemptions.put((Long) r[0], r);
        }
        List<PromotionRow> promotions = new ArrayList<>();
        for (Object[] c : rows("SELECT c.id, c.name, c.status, c.type, c.startDate, c.endDate FROM PromotionCampaign c "
                + "WHERE c.endDate IS NULL OR c.endDate >= :from", Map.of("from", from.toLocalDate()))) {
            Object[] r = redemptions.get((Long) c[0]);
            promotions.add(new PromotionRow(label(c[1], "Untitled"), label(c[2], "—"), label(c[3], "—"),
                    (LocalDate) c[4], (LocalDate) c[5], r != null ? lng(r[1]) : 0, r != null ? bd(r[2]) : BigDecimal.ZERO,
                    r != null ? bd(r[3]) : BigDecimal.ZERO));
        }
        promotions.sort(Comparator.comparing(PromotionRow::revenue).reversed().thenComparing(PromotionRow::redemptions, Comparator.reverseOrder()));

        Object[] ref = single("SELECT COUNT(f), "
                + "SUM(CASE WHEN LOWER(f.status) = 'successful' THEN 1 ELSE 0 END), "
                + "SUM(CASE WHEN LOWER(f.status) = 'pending' THEN 1 ELSE 0 END), "
                + "SUM(CASE WHEN LOWER(f.status) = 'expired' THEN 1 ELSE 0 END), "
                + "COALESCE(SUM(CASE WHEN LOWER(f.status) = 'successful' THEN f.rewardAmount ELSE 0 END), 0), "
                + "COALESCE(SUM(CASE WHEN LOWER(f.status) = 'successful' THEN f.purchaseAmount ELSE 0 END), 0) "
                + "FROM Referral f WHERE f.date >= :from", Map.of("from", from.toLocalDate()));
        Referrals referrals = new Referrals(lng(ref[0]), lng(ref[1]), lng(ref[2]), lng(ref[3]), bd(ref[4]), bd(ref[5]));

        return new MarketingInsights(windowDays, leadSources, promotions, referrals);
    }

    // ── Operations ────────────────────────────────────────────────────────────

    public OperationsInsights getOperationsInsights() {
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        // Last 14 days, one point per day.
        LocalDate dailyFrom = today.minusDays(13);
        Map<LocalDate, long[]> dailyCounts = new TreeMap<>(); // checkIns, bookings, capacity
        Map<LocalDate, BigDecimal> dailyRevenue = new HashMap<>();
        for (LocalDate d = dailyFrom; !d.isAfter(today); d = d.plusDays(1)) dailyCounts.put(d, new long[3]);
        for (Object[] a : rows("SELECT a.checkInTime FROM Attendance a WHERE a.checkInTime >= :from AND a.checkInTime <= :now",
                Map.of("from", dailyFrom.atStartOfDay(), "now", now))) {
            long[] c = dailyCounts.get(((LocalDateTime) a[0]).toLocalDate());
            if (c != null) c[0]++;
        }
        for (Object[] s : rows("SELECT s.date, s.capacity, (SELECT COUNT(b) FROM Booking b WHERE b.session = s AND b.cancelledBy IS NULL) "
                + "FROM TrainingSession s WHERE s.date >= :from AND s.date <= :to", Map.of("from", dailyFrom, "to", today))) {
            long[] c = dailyCounts.get((LocalDate) s[0]);
            if (c != null) { c[1] += lng(s[2]); c[2] += lng(s[1]); }
        }
        for (Object[] r : rows("SELECT r.transactionDate, r.paidAmount FROM Receipt r WHERE " + MONEY_RECEIPT
                + " AND r.transactionDate >= :from AND r.transactionDate <= :now", Map.of("from", dailyFrom.atStartOfDay(), "now", now))) {
            dailyRevenue.merge(((LocalDateTime) r[0]).toLocalDate(), bd(r[1]), BigDecimal::add);
        }
        for (Object[] t : rows("SELECT t.createdAt, t.totalAmount FROM SaleTransaction t WHERE t.status = 'COMPLETED' "
                + "AND t.createdAt >= :from AND t.createdAt <= :now", Map.of("from", dailyFrom.atStartOfDay(), "now", now))) {
            dailyRevenue.merge(((LocalDateTime) t[0]).toLocalDate(), bd(t[1]), BigDecimal::add);
        }
        List<DailyPoint> daily = dailyCounts.entrySet().stream()
                .map(e -> new DailyPoint(e.getKey(), e.getValue()[0], dailyRevenue.getOrDefault(e.getKey(), BigDecimal.ZERO),
                        e.getValue()[1], e.getValue()[2])).toList();

        // Departments: this month's individual targets grouped by the staff member's department.
        Map<String, Object[]> deptAgg = new TreeMap<>();
        for (Object[] t : rows("SELECT st.department, st.id, t.revenueTarget, t.revenueAchieved, t.sessionsTarget, t.sessionsAchieved "
                + "FROM StaffTarget t JOIN t.staff st WHERE t.year = :year AND t.month = :month AND LOWER(t.scope) = 'individual'",
                Map.of("year", today.getYear(), "month", today.getMonthValue()))) {
            Object[] agg = deptAgg.computeIfAbsent(label(t[0], "Unassigned"),
                    k -> new Object[] { new HashSet<Long>(), BigDecimal.ZERO, BigDecimal.ZERO, 0L, 0L });
            @SuppressWarnings("unchecked") Set<Long> staff = (Set<Long>) agg[0];
            staff.add((Long) t[1]);
            agg[1] = ((BigDecimal) agg[1]).add(bd(t[2]));
            agg[2] = ((BigDecimal) agg[2]).add(bd(t[3]));
            agg[3] = (Long) agg[3] + lng(t[4]);
            agg[4] = (Long) agg[4] + lng(t[5]);
        }
        @SuppressWarnings("unchecked")
        List<DepartmentRow> departments = deptAgg.entrySet().stream()
                .map(e -> new DepartmentRow(e.getKey(), ((Set<Long>) e.getValue()[0]).size(), (BigDecimal) e.getValue()[1],
                        (BigDecimal) e.getValue()[2], (Long) e.getValue()[3], (Long) e.getValue()[4])).toList();

        return new OperationsInsights(daily, departments, inventory(today), assets(today), financialPosition(today),
                expenseChanges(today), reportActivity(today));
    }

    private Inventory inventory(LocalDate today) {
        Map<Long, LocalDateTime> lastSale = new HashMap<>();
        for (Object[] s : rows("SELECT i.productId, MAX(t.createdAt) FROM SaleTransaction t, SaleTransactionItem i "
                + "WHERE i.transactionId = t.id AND t.status = 'COMPLETED' GROUP BY i.productId", Map.of())) {
            lastSale.put((Long) s[0], (LocalDateTime) s[1]);
        }
        long products = lng(single("SELECT COUNT(p) FROM Product p", Map.of())[0]);
        long units = 0, low = 0;
        BigDecimal stockValue = BigDecimal.ZERO;
        List<StockItem> lowItems = new ArrayList<>();
        List<StockItem> dead = new ArrayList<>();
        for (Object[] s : rows("SELECT p.id, p.name, SUM(s.currentStock), MAX(s.reorderLevel), p.costPrice "
                + "FROM ProductStock s, Product p WHERE s.productId = p.id GROUP BY p.id, p.name, p.costPrice", Map.of())) {
            long qty = lng(s[2]);
            long reorder = lng(s[3]);
            BigDecimal value = bd(s[4]).multiply(BigDecimal.valueOf(Math.max(qty, 0)));
            LocalDateTime sold = lastSale.get((Long) s[0]);
            Long daysSince = sold != null ? ChronoUnit.DAYS.between(sold.toLocalDate(), today) : null;
            StockItem item = new StockItem(label(s[1], "Product"), qty, reorder, value, daysSince);
            units += Math.max(qty, 0);
            stockValue = stockValue.add(value);
            if (reorder > 0 && qty <= reorder) {
                low++;
                lowItems.add(item);
            }
            if (qty > 0 && (daysSince == null || daysSince >= 45)) dead.add(item);
        }
        lowItems.sort(Comparator.comparingLong(StockItem::quantity));
        dead.sort(Comparator.comparing(StockItem::value).reversed());

        // Purchase cost changes: latest vs previous unit price per product across purchase orders.
        Map<Long, List<Object[]>> purchases = new LinkedHashMap<>();
        for (Object[] p : rows("SELECT i.productId, i.productName, o.supplierName, i.unitPrice, o.orderDate "
                + "FROM PurchaseOrder o, PurchaseOrderItem i WHERE i.purchaseOrderId = o.id AND i.productId IS NOT NULL "
                + "AND i.unitPrice IS NOT NULL AND LOWER(o.status) NOT IN ('cancelled', 'draft') ORDER BY o.orderDate DESC", Map.of())) {
            purchases.computeIfAbsent((Long) p[0], k -> new ArrayList<>()).add(p);
        }
        List<CostChange> costChanges = new ArrayList<>();
        for (List<Object[]> history : purchases.values()) {
            if (history.size() < 2) continue;
            Object[] latest = history.get(0);
            Object[] previous = history.get(1);
            Object[] cheapest = history.stream().min(Comparator.comparing(h -> bd(h[3]))).orElse(latest);
            LocalDateTime orderDate = (LocalDateTime) latest[4];
            costChanges.add(new CostChange(label(latest[1], "Product"), label(latest[2], "—"), bd(previous[3]), bd(latest[3]),
                    orderDate != null ? orderDate.toLocalDate() : null, label(cheapest[2], "—"), bd(cheapest[3])));
        }
        costChanges.sort(Comparator.comparing((CostChange c) -> c.previousCost().signum() == 0 ? BigDecimal.ZERO
                : c.latestCost().subtract(c.previousCost()).divide(c.previousCost(), 4, RoundingMode.HALF_UP)).reversed());

        return new Inventory(products, units, stockValue, low, limit(lowItems, 10), limit(dead, 10), limit(costChanges, 10));
    }

    private Assets assets(LocalDate today) {
        Object[] totals = single("SELECT COUNT(a), COALESCE(SUM(a.purchasePrice), 0), COALESCE(SUM(a.currentValue), 0), "
                + "COALESCE(SUM(a.purchasePrice * a.depreciationRate / 100), 0), "
                + "SUM(CASE WHEN LOWER(a.status) = 'maintenance' THEN 1 ELSE 0 END) "
                + "FROM Asset a WHERE a.status IS NULL OR LOWER(a.status) <> 'disposed'", Map.of());
        Map<Long, Object[]> maintenance = new HashMap<>();
        for (Object[] m : rows("SELECT a.id, MAX(m.maintenanceDate), "
                + "COALESCE(SUM(CASE WHEN m.maintenanceDate >= :yearAgo THEN m.cost ELSE 0 END), 0) "
                + "FROM Asset a, AssetMaintenance m WHERE m.asset = a GROUP BY a.id", Map.of("yearAgo", today.minusYears(1)))) {
            maintenance.put((Long) m[0], m);
        }
        List<AssetRow> needingService = new ArrayList<>();
        for (Object[] a : rows("SELECT a.id, a.code, a.name, a.status, a.condition, a.utilizationRate, a.nextMaintenanceDate "
                + "FROM Asset a WHERE (a.status IS NULL OR LOWER(a.status) <> 'disposed') "
                + "AND (LOWER(a.status) = 'maintenance' OR a.nextMaintenanceDate <= :soon) ORDER BY a.nextMaintenanceDate",
                Map.of("soon", today.plusDays(14)))) {
            Object[] m = maintenance.get((Long) a[0]);
            needingService.add(new AssetRow(label(a[1], "—"), label(a[2], "Asset"), label(a[3], "—"), label(a[4], "—"),
                    a[5] != null ? ((Number) a[5]).intValue() : null, m != null ? (LocalDate) m[1] : null,
                    (LocalDate) a[6], m != null ? bd(m[2]) : BigDecimal.ZERO));
        }
        return new Assets(lng(totals[0]), bd(totals[1]), bd(totals[2]), bd(totals[3]).setScale(2, RoundingMode.HALF_UP),
                lng(totals[4]), limit(needingService, 10));
    }

    private FinancialPosition financialPosition(LocalDate today) {
        BigDecimal payables = bd(single("SELECT COALESCE(SUM(b.totalAmount - COALESCE(b.amountPaid, 0)), 0) FROM SupplierBill b "
                + "WHERE (b.status IS NULL OR b.status <> 'CANCELLED') AND (b.paymentStatus IS NULL OR b.paymentStatus <> 'PAID')", Map.of())[0]);
        Object[] receivables = single("SELECT COALESCE(SUM(m.outstandingBalance), 0), COUNT(m) FROM Member m "
                + "WHERE m.outstandingBalance > 0", Map.of());

        // Posted balances per account code, named and typed by the chart of accounts.
        Map<String, Object[]> accounts = new HashMap<>();
        for (Object[] a : rows("SELECT a.code, a.name, a.type, a.subGroup FROM AccountHead a WHERE a.code IS NOT NULL", Map.of())) {
            accounts.putIfAbsent((String) a[0], a);
        }
        List<AccountBalance> liabilities = new ArrayList<>();
        BigDecimal cashAndBank = BigDecimal.ZERO;
        for (Object[] b : rows("SELECT l.accountCode, SUM(COALESCE(l.debit, 0) - COALESCE(l.credit, 0)) "
                + "FROM JournalVoucher jv, JournalVoucherLine l WHERE l.journalVoucherId = jv.id AND jv.status = 'POSTED' "
                + "GROUP BY l.accountCode", Map.of())) {
            Object[] account = accounts.get((String) b[0]);
            if (account == null) continue;
            BigDecimal debitBalance = bd(b[1]);
            String type = lower(account[2]);
            String name = label(account[1], "");
            String group = lower(account[3]);
            if ("liability".equals(type) && debitBalance.signum() != 0) {
                liabilities.add(new AccountBalance((String) b[0], name, debitBalance.negate()));
            } else if ("asset".equals(type) && (name.toLowerCase().matches(".*\\b(cash|bank)\\b.*") || group.matches(".*\\b(cash|bank)\\b.*"))) {
                cashAndBank = cashAndBank.add(debitBalance);
            }
        }
        liabilities.sort(Comparator.comparing(AccountBalance::balance).reversed());

        BigDecimal expenses90 = bd(single("SELECT COALESCE(SUM(e.totalAmount), 0) FROM Expense e WHERE UPPER(e.status) = 'APPROVED' "
                + "AND e.date >= :from", Map.of("from", today.minusDays(89)))[0]);
        return new FinancialPosition(payables, bd(receivables[0]), lng(receivables[1]), liabilities, cashAndBank,
                expenses90.divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP));
    }

    private List<ExpenseChange> expenseChanges(LocalDate today) {
        LocalDate last30 = today.minusDays(29);
        LocalDate previous30 = today.minusDays(59);
        Map<String, BigDecimal[]> byCategory = new TreeMap<>();
        for (Object[] e : rows("SELECT e.category, e.date, e.totalAmount FROM Expense e WHERE UPPER(e.status) = 'APPROVED' "
                + "AND e.date >= :from AND e.date <= :to", Map.of("from", previous30, "to", today))) {
            BigDecimal[] amounts = byCategory.computeIfAbsent(label(e[0], "Uncategorised"), k -> zeros(2));
            int slot = ((LocalDate) e[1]).isBefore(last30) ? 1 : 0;
            amounts[slot] = amounts[slot].add(bd(e[2]));
        }
        return byCategory.entrySet().stream().map(e -> new ExpenseChange(e.getKey(), e.getValue()[0], e.getValue()[1])).toList();
    }

    private List<ActivityMonth> reportActivity(LocalDate today) {
        YearMonth first = YearMonth.from(today).minusMonths(5);
        Map<YearMonth, long[]> byMonth = new TreeMap<>();
        for (YearMonth m = first; !m.isAfter(YearMonth.from(today)); m = m.plusMonths(1)) byMonth.put(m, new long[2]);
        for (Object[] a : rows("SELECT a.type, a.createdAt FROM BiosActivityLog a WHERE a.createdAt >= :from",
                Map.of("from", first.atDay(1).atStartOfDay()))) {
            long[] counts = byMonth.get(YearMonth.from((LocalDateTime) a[1]));
            if (counts != null) counts["EXPORT".equals(a[0]) ? 1 : 0]++;
        }
        return byMonth.entrySet().stream().map(e -> new ActivityMonth(e.getKey().toString(), e.getValue()[0], e.getValue()[1])).toList();
    }

    // ── Shared pieces ─────────────────────────────────────────────────────────

    private Satisfaction satisfaction(LocalDate today) {
        LocalDateTime from = today.minusDays(89).atStartOfDay();
        LocalDateTime previousFrom = from.minusDays(90);
        // Feedback has no branch column: reach it through the (branch-filtered) attendance it belongs to.
        String feedbackFrom = "FROM Attendance a, WorkoutFeedback f WHERE f.attendance = a ";
        Object[] current = single("SELECT COUNT(f), AVG(f.overallSatisfaction), AVG(f.trainerRating), AVG(f.equipmentQuality), "
                + "AVG(f.facilityRating) " + feedbackFrom + "AND f.submittedAt >= :from", Map.of("from", from));
        Object[] previous = single("SELECT AVG(f.overallSatisfaction) " + feedbackFrom
                + "AND f.submittedAt >= :from AND f.submittedAt < :to", Map.of("from", previousFrom, "to", from));
        ReturnScore returnScore = returnScore(feedbackFrom, from, previousFrom);

        Object[] reviewTotals = single("SELECT COUNT(r), AVG(r.rating) FROM Review r", Map.of());
        Map<Integer, Long> distribution = new HashMap<>();
        for (Object[] r : rows("SELECT r.rating, COUNT(r) FROM Review r WHERE r.rating IS NOT NULL GROUP BY r.rating", Map.of())) {
            distribution.put(((Number) r[0]).intValue(), lng(r[1]));
        }
        List<LabelCount> stars = new ArrayList<>();
        for (int s = 5; s >= 1; s--) stars.add(new LabelCount(s + " star", distribution.getOrDefault(s, 0L)));

        List<FeedbackComment> comments = entityManager.createQuery("SELECT f.submittedAt, f.overallSatisfaction, f.comments "
                        + feedbackFrom + "AND f.comments IS NOT NULL AND f.comments <> '' ORDER BY f.submittedAt DESC", Object[].class)
                .setMaxResults(5).getResultList().stream()
                .map(c -> new FeedbackComment(((LocalDateTime) c[0]).toLocalDate(), c[1] != null ? ((Number) c[1]).intValue() : null, (String) c[2]))
                .toList();

        return new Satisfaction(lng(current[0]), avg(current[1]), avg(current[2]), avg(current[3]), avg(current[4]),
                avg(previous[0]), returnScore, new ReviewSummary(lng(reviewTotals[0]), avg(reviewTotals[1]), stars), comments);
    }

    private ReturnScore returnScore(String feedbackFrom, LocalDateTime from, LocalDateTime previousFrom) {
        String counts = "SELECT COUNT(f), SUM(CASE WHEN f.likelyToReturn >= 9 THEN 1 ELSE 0 END), "
                + "SUM(CASE WHEN f.likelyToReturn BETWEEN 7 AND 8 THEN 1 ELSE 0 END), "
                + "SUM(CASE WHEN f.likelyToReturn <= 6 THEN 1 ELSE 0 END) " + feedbackFrom
                + "AND f.likelyToReturn IS NOT NULL AND f.submittedAt >= :from AND f.submittedAt < :to";
        Object[] now = single(counts, Map.of("from", from, "to", LocalDateTime.now().plusSeconds(1)));
        Object[] before = single(counts, Map.of("from", previousFrom, "to", from));
        return new ReturnScore(lng(now[0]), lng(now[1]), lng(now[2]), lng(now[3]),
                npsScore(lng(now[0]), lng(now[1]), lng(now[3])), npsScore(lng(before[0]), lng(before[1]), lng(before[3])));
    }

    private List<ChannelRow> leadSources(LocalDateTime from, Map<Long, BigDecimal> ltvByMember) {
        Map<String, long[]> counts = new TreeMap<>();
        Map<String, List<BigDecimal>> convertedLtv = new HashMap<>();
        for (Object[] l : rows("SELECT l.source, l.status, l.memberId FROM Lead l WHERE l.createdAt >= :from", Map.of("from", from))) {
            String source = label(l[0], "Unknown");
            long[] c = counts.computeIfAbsent(source, k -> new long[2]);
            c[0]++;
            if ("converted".equalsIgnoreCase(String.valueOf(l[1]))) {
                c[1]++;
                if (l[2] != null && ltvByMember.containsKey((Long) l[2])) {
                    convertedLtv.computeIfAbsent(source, k -> new ArrayList<>()).add(ltvByMember.get((Long) l[2]));
                }
            }
        }
        return counts.entrySet().stream().map(e -> {
            List<BigDecimal> values = convertedLtv.get(e.getKey());
            BigDecimal avgLtv = values == null || values.isEmpty() ? null
                    : values.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
            return new ChannelRow(e.getKey(), e.getValue()[0], e.getValue()[1], avgLtv);
        }).sorted(Comparator.comparing(ChannelRow::leads).reversed()).toList();
    }

    /** Lifetime paid per member, from money receipts. */
    private Map<Long, BigDecimal> ltvByMember() {
        Map<Long, BigDecimal> ltv = new HashMap<>();
        for (Object[] r : rows("SELECT r.memberDbId, SUM(r.paidAmount) FROM Receipt r WHERE " + MONEY_RECEIPT
                + " AND r.memberDbId IS NOT NULL GROUP BY r.memberDbId", Map.of())) {
            ltv.put((Long) r[0], bd(r[1]));
        }
        return ltv;
    }

    private static final class MemberRow {
        Long id; String name; String memberCode; String membershipType; boolean active; boolean expired;
        String gender; LocalDate dateOfBirth; String nationality; BigDecimal fee; LocalDateTime joined; LocalDateTime endDate;
    }

    private List<MemberRow> loadMembers(LocalDateTime asOf) {
        List<MemberRow> members = new ArrayList<>();
        for (Object[] m : rows("SELECT m.id, m.name, m.memberId, m.membershipType, "
                + "CASE WHEN " + MemberRepository.BIOS_EFFECTIVELY_ACTIVE + " THEN 1 ELSE 0 END, "
                + "CASE WHEN " + MemberRepository.BIOS_EFFECTIVELY_EXPIRED + " THEN 1 ELSE 0 END, "
                + "m.gender, m.dateOfBirth, m.nationality, COALESCE(m.monthlyFee, m.membershipFee), "
                + MemberRepository.BIOS_JOIN_DATE + ", " + MemberRepository.BIOS_END_DATE + " FROM Member m", Map.of("asOf", asOf))) {
            MemberRow row = new MemberRow();
            row.id = (Long) m[0];
            row.name = (String) m[1];
            row.memberCode = (String) m[2];
            row.membershipType = label(m[3], "Unknown");
            row.active = lng(m[4]) == 1;
            row.expired = lng(m[5]) == 1;
            row.gender = (String) m[6];
            row.dateOfBirth = (LocalDate) m[7];
            row.nationality = (String) m[8];
            row.fee = m[9] != null ? bd(m[9]) : null;
            row.joined = (LocalDateTime) m[10];
            row.endDate = (LocalDateTime) m[11];
            members.add(row);
        }
        return members;
    }

    private static final class MemberFacts {
        long members, active, expired;
        BigDecimal feeTotal = BigDecimal.ZERO;
        long feeCount, tenureMonthsTotal, tenureCount;
        BigDecimal avgFee() {
            return feeCount > 0 ? feeTotal.divide(BigDecimal.valueOf(feeCount), 2, RoundingMode.HALF_UP) : null;
        }
        Double avgTenureMonths() { return tenureCount > 0 ? round1((double) tenureMonthsTotal / tenureCount) : null; }
    }

    private Map<String, MemberFacts> memberFactsByType() {
        LocalDate today = LocalDate.now();
        Map<String, MemberFacts> facts = new HashMap<>();
        for (MemberRow m : loadMembers(today.atStartOfDay())) {
            MemberFacts f = facts.computeIfAbsent(m.membershipType, k -> new MemberFacts());
            f.members++;
            if (m.active) f.active++;
            if (m.expired) f.expired++;
            if (m.fee != null && m.fee.signum() > 0) { f.feeTotal = f.feeTotal.add(m.fee); f.feeCount++; }
            if (m.joined != null) { f.tenureMonthsTotal += tenureMonths(m, today); f.tenureCount++; }
        }
        return facts;
    }

    /** Months from joining until the membership ended, or until today while still active. */
    private static long tenureMonths(MemberRow m, LocalDate today) {
        LocalDate end = !m.active && m.endDate != null && m.endDate.toLocalDate().isBefore(today) ? m.endDate.toLocalDate() : today;
        return Math.max(0, ChronoUnit.MONTHS.between(m.joined.toLocalDate(), end));
    }

    private static Double averageTenure(List<MemberRow> members, LocalDate today) {
        List<MemberRow> joined = members.stream().filter(m -> m.joined != null).toList();
        return joined.isEmpty() ? null : round1(joined.stream().mapToLong(m -> tenureMonths(m, today)).average().orElse(0));
    }

    private static Double averageAge(List<MemberRow> members, LocalDate today) {
        List<MemberRow> born = members.stream().filter(m -> m.dateOfBirth != null && !m.dateOfBirth.isAfter(today)).toList();
        return born.isEmpty() ? null : round1(born.stream().mapToInt(m -> Period.between(m.dateOfBirth, today).getYears()).average().orElse(0));
    }

    private static BigDecimal averageFee(List<MemberRow> members) {
        List<BigDecimal> fees = members.stream().map(m -> m.fee).filter(f -> f != null && f.signum() > 0).toList();
        return fees.isEmpty() ? null : fees.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(fees.size()), 2, RoundingMode.HALF_UP);
    }

    /** Average lifetime paid across the given members who have paid anything; null if none have. */
    private static BigDecimal averageLtv(List<MemberRow> members, Map<Long, BigDecimal> ltvByMember) {
        List<BigDecimal> values = members.stream().map(m -> ltvByMember.get(m.id)).filter(Objects::nonNull).toList();
        return values.isEmpty() ? null : values.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    private static String ageBand(int age) {
        return age < 18 ? "Under 18" : age < 25 ? "18-24" : age < 35 ? "25-34" : age < 45 ? "35-44" : age < 55 ? "45-54" : "55+";
    }

    private static String genderLabel(String gender) {
        if (gender == null || gender.isBlank()) return "Not recorded";
        String g = gender.trim().toLowerCase();
        if (g.equals("m") || g.equals("male")) return "Male";
        if (g.equals("f") || g.equals("female")) return "Female";
        return gender.trim().substring(0, 1).toUpperCase() + gender.trim().substring(1).toLowerCase();
    }

    private static <T> List<LabelCount> countBy(List<T> items, Function<T, String> key, int max) {
        return items.stream().collect(Collectors.groupingBy(key, Collectors.counting())).entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(max).map(e -> new LabelCount(e.getKey(), e.getValue())).toList();
    }

    private static final class SessionAgg {
        final Set<Long> sessions = new HashSet<>();
        long bookings, capacity;
        BigDecimal revenue = BigDecimal.ZERO;
    }

    /** PT sessions group by trainer; everything else (classes) by session name. */
    private static SessionAgg sessionBucket(Object type, Object sessionName, Object trainerName,
                                            Map<String, SessionAgg> trainers, Map<String, SessionAgg> classes) {
        if ("pt".equalsIgnoreCase(String.valueOf(type))) {
            return trainers.computeIfAbsent(label(trainerName, "Unassigned trainer"), k -> new SessionAgg());
        }
        return classes.computeIfAbsent(label(sessionName, "Class"), k -> new SessionAgg());
    }

    private static List<SessionRevenue> toSessionRows(Map<String, SessionAgg> groups) {
        return groups.entrySet().stream()
                .map(e -> new SessionRevenue(e.getKey(), e.getValue().sessions.size(), e.getValue().bookings,
                        e.getValue().capacity, e.getValue().revenue))
                .sorted(Comparator.comparing(SessionRevenue::revenue).reversed().thenComparing(SessionRevenue::bookings, Comparator.reverseOrder()))
                .toList();
    }

    private static String paymentMethodLabel(Object method) {
        if (method == null || method.toString().isBlank()) return "Not recorded";
        String m = method.toString().trim().replace('_', ' ');
        return m.substring(0, 1).toUpperCase() + m.substring(1).toLowerCase();
    }

    private static Double npsScore(long responses, long promoters, long detractors) {
        return responses > 0 ? round1(100.0 * (promoters - detractors) / responses) : null;
    }

    private List<Object[]> rows(String jpql, Map<String, Object> params) {
        TypedQuery<Object[]> query = entityManager.createQuery(jpql, Object[].class);
        params.forEach(query::setParameter);
        return query.getResultList();
    }

    /** A single aggregate row; single-column queries are wrapped so callers can always index [0]. */
    private Object[] single(String jpql, Map<String, Object> params) {
        var query = entityManager.createQuery(jpql);
        params.forEach(query::setParameter);
        Object result = query.getSingleResult();
        return result instanceof Object[] array ? array : new Object[] { result };
    }

    private static <T> List<T> limit(List<T> items, int max) {
        return items.size() > max ? new ArrayList<>(items.subList(0, max)) : items;
    }

    private static BigDecimal[] zeros(int n) {
        BigDecimal[] values = new BigDecimal[n];
        Arrays.fill(values, BigDecimal.ZERO);
        return values;
    }

    private static BigDecimal bd(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal b) return b;
        return new BigDecimal(value.toString());
    }

    private static long lng(Object value) {
        return value != null ? ((Number) value).longValue() : 0L;
    }

    private static Double avg(Object value) {
        return value != null ? round1(((Number) value).doubleValue()) : null;
    }

    private static String lower(Object value) {
        return value != null ? value.toString().trim().toLowerCase() : "";
    }

    private static String label(Object value, String fallback) {
        return value != null && !value.toString().isBlank() ? value.toString().trim() : fallback;
    }

    private static double ratio(long total, long count) {
        return count > 0 ? round1((double) total / count) : 0.0;
    }

    private static double percent(long part, long whole) {
        return whole > 0 ? round1(100.0 * part / whole) : 0.0;
    }

    private static double round1(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
