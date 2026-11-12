package com.company.project.services;

import com.company.project.services.RevenueOperationsService.Metric;
import com.company.project.services.RevenueOperationsService.Window;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

import static com.company.project.services.RevenueOperationsService.amountRows;
import static com.company.project.services.RevenueOperationsService.bd;
import static com.company.project.services.RevenueOperationsService.bstatus;
import static com.company.project.services.RevenueOperationsService.capitalize;
import static com.company.project.services.RevenueOperationsService.countRows;
import static com.company.project.services.RevenueOperationsService.isPt;
import static com.company.project.services.RevenueOperationsService.label;
import static com.company.project.services.RevenueOperationsService.num;
import static com.company.project.services.RevenueOperationsService.nz;
import static com.company.project.services.RevenueOperationsService.orderedCountRows;
import static com.company.project.services.RevenueOperationsService.pct;
import static com.company.project.services.RevenueOperationsService.round;

/**
 * Business Insights › Campaigns, Renewals & Upgrades and Training & Classes. Each is loaded
 * on its own when its section is opened (like Targets), for the selected range and the same
 * comparison window as the rest of the page ({@link RevenueDashboardService#comparisonWindow}).
 *
 * Every response carries `metrics` in the shape the Comparison hub already renders (area, key,
 * label, current, previous, format, goodWhenUp) plus the section's own tables.
 */
@Service
@Transactional(readOnly = true)
public class BusinessInsightsService {

    /** Money received: same rule as revenue and targets. */
    private static final String PAID =
            "r.status IN ('Paid', 'Partial') AND (r.approvalStatus IS NULL OR UPPER(r.approvalStatus) NOT IN ('PENDING', 'REJECTED'))";
    /** A membership bill that stands (paid or not), for renewal tracking. */
    private static final String STANDING =
            "(r.approvalStatus IS NULL OR UPPER(r.approvalStatus) <> 'REJECTED') " +
            "AND (r.status IS NULL OR LOWER(r.status) NOT IN ('cancelled', 'void', 'voided', 'refunded'))";
    /** How long after a membership ends a renewal still counts as one (else it's lapsed). */
    private static final int GRACE_DAYS = 30;
    private static final int LIST_ROWS = 30;

    @PersistenceContext
    private EntityManager em;

    private record Ctx(Window cur, Window pre, Map<String, Object> meta) {}

    private static Ctx ctx(LocalDate from, LocalDate to, String compare) {
        if (to.isBefore(from)) {
            LocalDate swap = from;
            from = to;
            to = swap;
        }
        LocalDate requestedTo = to;
        LocalDate[] w = RevenueDashboardService.comparisonWindow(from, to, compare, LocalDate.now());
        Window cur = new Window(from, w[1]);
        Window pre = new Window(w[2], w[3]);
        boolean lastYear = "last-year".equalsIgnoreCase(compare);
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("from", cur.from().toString());
        meta.put("to", cur.to().toString());
        meta.put("toDate", !cur.to().equals(requestedTo));
        meta.put("previousFrom", pre.from().toString());
        meta.put("previousTo", pre.to().toString());
        meta.put("compare", lastYear ? "last-year" : "previous");
        meta.put("label", lastYear ? "Same period last year" : "Previous period");
        return new Ctx(cur, pre, meta);
    }

    private List<Object[]> rows(String jpql, Window w) {
        return em.createQuery(jpql, Object[].class)
                .setParameter("s", w.start()).setParameter("e", w.end()).getResultList();
    }

    private List<Object[]> dateRows(String jpql, Window w) {
        return em.createQuery(jpql, Object[].class)
                .setParameter("f", w.from()).setParameter("t", w.to()).getResultList();
    }

    /** Runs an IN query in chunks (some databases cap bind parameters). */
    private <K> List<Object[]> inRows(String jpql, Collection<K> ids) {
        List<Object[]> out = new ArrayList<>();
        List<K> all = new ArrayList<>(ids);
        for (int i = 0; i < all.size(); i += 1000) {
            out.addAll(em.createQuery(jpql, Object[].class)
                    .setParameter("ids", all.subList(i, Math.min(all.size(), i + 1000))).getResultList());
        }
        return out;
    }

    /** Most recent check-in per member. */
    private Map<Long, LocalDateTime> lastVisits(Collection<Long> memberIds) {
        Map<Long, LocalDateTime> out = new HashMap<>();
        if (memberIds.isEmpty()) return out;
        for (Object[] r : inRows("SELECT m.id, MAX(a.checkInTime) FROM Attendance a JOIN a.member m WHERE m.id IN :ids GROUP BY m.id", memberIds)) {
            out.put((Long) r[0], (LocalDateTime) r[1]);
        }
        return out;
    }

    private static Map<String, Object> row(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    private static double money(BigDecimal v) {
        return round(nz(v).doubleValue());
    }

    private static double ratio(double a, double b) {
        return b == 0 ? Double.NaN : a / b;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Campaigns
    // ═════════════════════════════════════════════════════════════════════════

    private record CampaignPeriod(List<Object[]> spend, List<Object[]> leads, Map<Long, BigDecimal> leadRevenue,
                                  List<Object[]> redemptions, Map<Long, LocalDateTime> joins,
                                  List<Object[]> referrals, List<Object[]> messages) {}

    private static boolean leadConverted(Object[] l) {
        return "converted".equalsIgnoreCase((String) l[1]) || l[2] != null;
    }

    private CampaignPeriod loadCampaigns(Window w) {
        // MarketingCampaignSpend isn't branch-scoped itself; its campaign is
        List<Object[]> spend = dateRows(
                "SELECT s.campaignId, s.spendDate, s.amount, s.category FROM MarketingCampaignSpend s, MarketingCampaign c " +
                "WHERE c.id = s.campaignId AND s.spendDate >= :f AND s.spendDate <= :t", w);
        List<Object[]> leads = rows(
                "SELECT l.marketingCampaignId, l.status, l.memberId, l.createdAt, l.source FROM Lead l " +
                "WHERE l.createdAt >= :s AND l.createdAt < :e", w);

        // Revenue from each converted campaign lead's member in their first 90 days
        Map<Long, LocalDateTime> since = new HashMap<>();
        for (Object[] l : leads) {
            if (l[0] == null || l[2] == null) continue;
            since.merge((Long) l[2], (LocalDateTime) l[3], (a, b) -> a.isBefore(b) ? a : b);
        }
        Map<Long, BigDecimal> leadRevenue = new HashMap<>();
        if (!since.isEmpty()) {
            for (Object[] r : inRows("SELECT r.memberDbId, COALESCE(r.transactionDate, r.createdAt), r.paidAmount FROM Receipt r " +
                    "WHERE r.memberDbId IN :ids AND " + PAID, since.keySet())) {
                LocalDateTime start = since.get((Long) r[0]);
                LocalDateTime at = (LocalDateTime) r[1];
                if (start == null || at == null || at.isBefore(start.toLocalDate().atStartOfDay()) || at.isAfter(start.plusDays(90))) continue;
                leadRevenue.merge((Long) r[0], bd(r[2]), BigDecimal::add);
            }
        }

        List<Object[]> redemptions = rows(
                "SELECT r.promotionId, r.memberId, r.revenue, r.savings, r.redeemedAt FROM PromotionRedemption r " +
                "WHERE r.redeemedAt >= :s AND r.redeemedAt < :e", w);
        Set<Long> members = new HashSet<>();
        for (Object[] r : redemptions) if (r[1] != null) members.add((Long) r[1]);
        Map<Long, LocalDateTime> joins = new HashMap<>();
        if (!members.isEmpty()) {
            for (Object[] m : inRows("SELECT m.id, m.joinDate FROM Member m WHERE m.id IN :ids", members)) {
                joins.put((Long) m[0], (LocalDateTime) m[1]);
            }
        }

        List<Object[]> referrals = rows(
                "SELECT r.createdAt, r.status, r.visitDate, r.signupDate, r.paymentDate, r.rewardAmount, r.referrerName " +
                "FROM Referral r WHERE r.createdAt >= :s AND r.createdAt < :e", w);
        List<Object[]> messages = rows(
                "SELECT m.type, m.sentAt FROM MessageCampaign m WHERE m.sentAt >= :s AND m.sentAt < :e", w);
        return new CampaignPeriod(spend, leads, leadRevenue, redemptions, joins, referrals, messages);
    }

    /** [spend, leads, converted, revenue] per campaign id. */
    private static Map<Long, double[]> campaignTotals(CampaignPeriod p) {
        Map<Long, double[]> out = new HashMap<>();
        for (Object[] s : p.spend()) out.computeIfAbsent((Long) s[0], k -> new double[4])[0] += bd(s[2]).doubleValue();
        Set<Long> counted = new HashSet<>();
        for (Object[] l : p.leads()) {
            if (l[0] == null) continue;
            double[] v = out.computeIfAbsent((Long) l[0], k -> new double[4]);
            v[1]++;
            if (leadConverted(l)) {
                v[2]++;
                // A member's revenue counts once, against the campaign that brought them in
                if (l[2] != null && counted.add((Long) l[2])) v[3] += nz(p.leadRevenue().get((Long) l[2])).doubleValue();
            }
        }
        return out;
    }

    private static double[] sumTotals(Map<Long, double[]> totals) {
        double[] s = new double[4];
        for (double[] v : totals.values()) for (int i = 0; i < 4; i++) s[i] += v[i];
        return s;
    }

    /** [redemptions, revenue, savings, unique members]. */
    private static double[] promoStats(CampaignPeriod p) {
        double revenue = 0, savings = 0;
        Set<Long> members = new HashSet<>();
        for (Object[] r : p.redemptions()) {
            revenue += bd(r[2]).doubleValue();
            savings += bd(r[3]).doubleValue();
            if (r[1] != null) members.add((Long) r[1]);
        }
        return new double[]{p.redemptions().size(), revenue, savings, members.size()};
    }

    /** [referred, visited, signed up, paid / successful, rewards]. */
    private static double[] referralStats(CampaignPeriod p) {
        double visited = 0, signed = 0, paid = 0, rewards = 0;
        for (Object[] r : p.referrals()) {
            boolean ok = "successful".equalsIgnoreCase((String) r[1]);
            if (r[2] != null || r[3] != null || r[4] != null || ok) visited++;
            if (r[3] != null || r[4] != null || ok) signed++;
            if (r[4] != null || ok) paid++;
            if (ok) rewards += bd(r[5]).doubleValue();
        }
        return new double[]{p.referrals().size(), visited, signed, paid, rewards};
    }

    public Map<String, Object> getCampaigns(LocalDate from, LocalDate to, String compare) {
        Ctx x = ctx(from, to, compare);
        CampaignPeriod c = loadCampaigns(x.cur());
        CampaignPeriod p = loadCampaigns(x.pre());
        Map<Long, double[]> tc = campaignTotals(c), tp = campaignTotals(p);
        double[] sc = sumTotals(tc), sp = sumTotals(tp);
        double[] pc = promoStats(c), pp = promoStats(p);
        double[] rc = referralStats(c), rp = referralStats(p);

        String a = "campaigns";
        List<Metric> metrics = new ArrayList<>();
        metrics.add(new Metric(a, "campaignSpend", "Campaign spend", sc[0], sp[0], "money", false));
        metrics.add(new Metric(a, "campaignLeads", "Leads from campaigns", sc[1], sp[1], "count", true));
        metrics.add(new Metric(a, "campaignConversions", "Campaign leads converted", sc[2], sp[2], "count", true));
        metrics.add(new Metric(a, "campaignConversionRate", "Campaign conversion rate", pct(sc[2], sc[1]), pct(sp[2], sp[1]), "percent", true));
        metrics.add(new Metric(a, "costPerLead", "Cost per lead", ratio(sc[0], sc[1]), ratio(sp[0], sp[1]), "money", false));
        metrics.add(new Metric(a, "costPerConversion", "Cost per conversion", ratio(sc[0], sc[2]), ratio(sp[0], sp[2]), "money", false));
        metrics.add(new Metric(a, "campaignRevenue", "Revenue from converted leads", sc[3], sp[3], "money", true));
        metrics.add(new Metric(a, "returnOnSpend", "Return on spend (×)", ratio(sc[3], sc[0]), ratio(sp[3], sp[0]), "decimal", true));
        metrics.add(new Metric(a, "promoRedemptions", "Promotion redemptions", pc[0], pp[0], "count", true));
        metrics.add(new Metric(a, "promoRevenue", "Revenue with promotions", pc[1], pp[1], "money", true));
        metrics.add(new Metric(a, "promoDiscount", "Discount given", pc[2], pp[2], "money", false));
        metrics.add(new Metric(a, "referralsMade", "Referrals made", rc[0], rp[0], "count", true));
        metrics.add(new Metric(a, "referralsPaid", "Referrals that paid", rc[3], rp[3], "count", true));
        metrics.add(new Metric(a, "referralRewards", "Referral rewards", rc[4], rp[4], "money", false));
        metrics.add(new Metric(a, "messagesSent", "Messages sent", c.messages().size(), p.messages().size(), "count", true));

        Map<String, Object> out = new LinkedHashMap<>(x.meta());
        out.put("metrics", metrics.stream().map(Metric::toMap).toList());
        out.put("campaigns", campaignRows(x, tc, tp));
        out.put("funnel", List.of(
                row("name", "Leads", "current", (long) sc[1], "previous", (long) sp[1]),
                row("name", "Contacted", "current", contacted(c.leads()), "previous", contacted(p.leads())),
                row("name", "Converted", "current", (long) sc[2], "previous", (long) sp[2])));
        out.put("spendByCategory", amountRows(c.spend(), p.spend(), s -> label((String) s[3], "Other"), s -> bd(s[2]), 0));
        out.put("promotions", promotionRows(c, p));
        out.put("referralFunnel", List.of(
                row("name", "Referred", "current", (long) rc[0], "previous", (long) rp[0]),
                row("name", "Visited", "current", (long) rc[1], "previous", (long) rp[1]),
                row("name", "Signed up", "current", (long) rc[2], "previous", (long) rp[2]),
                row("name", "Paid", "current", (long) rc[3], "previous", (long) rp[3])));
        List<Map<String, Object>> referrers = countRows(c.referrals(), p.referrals(), r -> label((String) r[6], "Unknown"), 10);
        Map<String, Long> ok = new HashMap<>();
        for (Object[] r : c.referrals()) {
            if ("successful".equalsIgnoreCase((String) r[1])) ok.merge(label((String) r[6], "Unknown"), 1L, Long::sum);
        }
        referrers.forEach(r -> r.put("converted", ok.getOrDefault((String) r.get("name"), 0L)));
        out.put("topReferrers", referrers);
        out.put("messages", countRows(c.messages(), p.messages(), m -> label((String) m[0], "Message"), 0));
        return out;
    }

    private static long contacted(List<Object[]> leads) {
        return leads.stream().filter(l -> l[0] != null).filter(l -> {
            String s = l[1] == null ? "new" : ((String) l[1]).toLowerCase(Locale.ROOT);
            return !"new".equals(s) || leadConverted(l);
        }).count();
    }

    private List<Map<String, Object>> campaignRows(Ctx x, Map<Long, double[]> tc, Map<Long, double[]> tp) {
        Map<Long, BigDecimal> allTime = new HashMap<>();
        for (Object[] r : em.createQuery("SELECT s.campaignId, SUM(s.amount) FROM MarketingCampaignSpend s GROUP BY s.campaignId", Object[].class).getResultList()) {
            allTime.put((Long) r[0], bd(r[1]));
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] m : em.createQuery(
                "SELECT c.id, c.name, c.platform, c.status, c.ownerName, c.startDate, c.endDate, c.budget, c.targetLeads, c.targetConversions " +
                "FROM MarketingCampaign c", Object[].class).getResultList()) {
            Long id = (Long) m[0];
            LocalDate start = (LocalDate) m[5], end = (LocalDate) m[6];
            boolean overlaps = (start == null || !start.isAfter(x.cur().to())) && (end == null || !end.isBefore(x.cur().from()));
            double[] c = tc.getOrDefault(id, new double[4]), p = tp.getOrDefault(id, new double[4]);
            if (!overlaps && c[0] == 0 && c[1] == 0 && p[0] == 0 && p[1] == 0) continue;
            BigDecimal budget = (BigDecimal) m[7];
            BigDecimal spentAllTime = allTime.getOrDefault(id, BigDecimal.ZERO);
            out.add(row(
                    "id", id, "name", m[1], "platform", m[2], "status", m[3], "owner", m[4],
                    "startDate", start == null ? null : start.toString(), "endDate", end == null ? null : end.toString(),
                    "budget", budget == null ? null : money(budget), "spentAllTime", money(spentAllTime),
                    "budgetUsed", budget == null || budget.signum() == 0 ? null : round(spentAllTime.doubleValue() * 100 / budget.doubleValue()),
                    "spend", round(c[0]), "previousSpend", round(p[0]),
                    "leads", (long) c[1], "previousLeads", (long) p[1],
                    "converted", (long) c[2], "previousConverted", (long) p[2],
                    "targetLeads", m[8], "targetConversions", m[9],
                    "revenue", round(c[3]), "previousRevenue", round(p[3]),
                    "costPerLead", c[1] == 0 ? null : round(c[0] / c[1]),
                    "costPerConversion", c[2] == 0 ? null : round(c[0] / c[2])));
        }
        out.sort(Comparator.comparingDouble((Map<String, Object> r) -> (double) r.get("spend") + (long) r.get("leads")).reversed());
        return out;
    }

    private List<Map<String, Object>> promotionRows(CampaignPeriod c, CampaignPeriod p) {
        Map<Long, Object[]> promos = new HashMap<>();
        for (Object[] r : em.createQuery("SELECT p.id, p.name, p.code, p.type, p.usageLimit, p.status FROM PromotionCampaign p", Object[].class).getResultList()) {
            promos.put((Long) r[0], r);
        }
        // [redemptions, revenue, savings, newMembers] + unique members
        Map<Long, double[]> cur = new HashMap<>(), prev = new HashMap<>();
        Map<Long, Set<Long>> members = new HashMap<>();
        for (Object[] r : c.redemptions()) {
            Long id = (Long) r[0];
            double[] v = cur.computeIfAbsent(id, k -> new double[4]);
            v[0]++;
            v[1] += bd(r[2]).doubleValue();
            v[2] += bd(r[3]).doubleValue();
            LocalDateTime joined = r[1] == null ? null : c.joins().get((Long) r[1]);
            LocalDateTime at = (LocalDateTime) r[4];
            if (joined != null && at != null && !joined.isBefore(at.minusDays(30))) v[3]++;
            if (r[1] != null) members.computeIfAbsent(id, k -> new HashSet<>()).add((Long) r[1]);
        }
        for (Object[] r : p.redemptions()) {
            double[] v = prev.computeIfAbsent((Long) r[0], k -> new double[4]);
            v[0]++;
            v[1] += bd(r[2]).doubleValue();
            v[2] += bd(r[3]).doubleValue();
        }
        Set<Long> ids = new HashSet<>(cur.keySet());
        ids.addAll(prev.keySet());
        List<Map<String, Object>> out = new ArrayList<>();
        for (Long id : ids) {
            Object[] m = promos.get(id);
            double[] v = cur.getOrDefault(id, new double[4]), pv = prev.getOrDefault(id, new double[4]);
            out.add(row(
                    "name", m == null ? "Promotion #" + id : m[1], "code", m == null ? null : m[2],
                    "type", m == null ? null : label((String) m[3], null), "status", m == null ? null : m[5],
                    "usageLimit", m == null ? null : m[4],
                    "current", (long) v[0], "previous", (long) pv[0],
                    "members", members.getOrDefault(id, Set.of()).size(), "newMembers", (long) v[3],
                    "amount", round(v[1]), "previousAmount", round(pv[1]),
                    "savings", round(v[2]), "previousSavings", round(pv[2])));
        }
        out.sort((a, b) -> Long.compare((long) b.get("current"), (long) a.get("current")));
        return out;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Renewals & upgrades
    // ═════════════════════════════════════════════════════════════════════════

    /** A New/Renewal membership bill. */
    private record Bill(long id, Long member, String type, String kind, String plan, LocalDateTime at,
                        LocalDateTime validTill, BigDecimal paid, BigDecimal amount, String name, String phone) {
        BigDecimal value() { return paid != null && paid.signum() > 0 ? paid : nz(amount); }
    }

    private static final String BILL_SELECT =
            "SELECT r.id, r.memberDbId, r.transactionType, r.renewalKind, r.planName, COALESCE(r.transactionDate, r.createdAt), " +
            "r.validTill, r.paidAmount, r.amount, r.memberName, r.memberPhone FROM Receipt r ";

    private static Bill bill(Object[] r) {
        return new Bill((Long) r[0], (Long) r[1], (String) r[2], (String) r[3], (String) r[4], (LocalDateTime) r[5],
                (LocalDateTime) r[6], (BigDecimal) r[7], (BigDecimal) r[8], (String) r[9], (String) r[10]);
    }

    /** Each member's New/Renewal bills, oldest first. */
    private Map<Long, List<Bill>> memberBills(Window cur, Window pre) {
        LocalDateTime s = (pre.start().isBefore(cur.start()) ? pre.start() : cur.start());
        LocalDateTime e = (pre.end().isAfter(cur.end()) ? pre.end() : cur.end());
        // Members with a membership sold or ending in either window…
        List<Long> ids = em.createQuery(
                        "SELECT DISTINCT r.memberDbId FROM Receipt r WHERE r.memberDbId IS NOT NULL AND r.transactionType IN ('New', 'Renewal') AND " + STANDING +
                        " AND ((COALESCE(r.transactionDate, r.createdAt) >= :s AND COALESCE(r.transactionDate, r.createdAt) < :e) " +
                        "  OR (r.validTill >= :s AND r.validTill < :e))", Long.class)
                .setParameter("s", s).setParameter("e", e).getResultList();
        // …and all their membership bills, so the bill before / after each one is known
        Map<Long, List<Bill>> out = new HashMap<>();
        for (Object[] r : inRows(BILL_SELECT + "WHERE r.memberDbId IN :ids AND r.transactionType IN ('New', 'Renewal') AND " + STANDING, ids)) {
            Bill b = bill(r);
            if (b.at() != null) out.computeIfAbsent(b.member(), k -> new ArrayList<>()).add(b);
        }
        out.values().forEach(l -> l.sort(Comparator.comparing(Bill::at).thenComparingLong(Bill::id)));
        return out;
    }

    /** Renewal / Upgrade / Downgrade: the receipt's own stamp, else judged from the bill before. */
    private static String kindOf(Bill b, Bill before, Map<String, BigDecimal> prices) {
        if (b.kind() != null && !b.kind().isBlank()) return capitalize(b.kind().trim().toLowerCase(Locale.ROOT));
        if (before == null || before.plan() == null || b.plan() == null || before.plan().trim().equalsIgnoreCase(b.plan().trim())) return "Renewal";
        BigDecimal was = prices.getOrDefault(before.plan().trim().toLowerCase(Locale.ROOT), before.value());
        BigDecimal now = prices.getOrDefault(b.plan().trim().toLowerCase(Locale.ROOT), b.value());
        return nz(now).compareTo(nz(was)) < 0 ? "Downgrade" : "Upgrade";
    }

    private record RenewalSale(Bill bill, Bill before, String kind, long daysBeforeEnd) {}

    private record Ending(Bill bill, Bill next, String outcome) {}

    private record RenewalPeriod(List<RenewalSale> sales, List<Ending> endings, long newSales,
                                 Map<String, Long> newByPlan, Set<Long> buyers, Set<Long> addonBuyers) {}

    private RenewalPeriod renewalPeriod(Window w, Map<Long, List<Bill>> bills, Map<String, BigDecimal> prices) {
        List<RenewalSale> sales = new ArrayList<>();
        List<Ending> endings = new ArrayList<>();
        Map<String, Long> newByPlan = new HashMap<>();
        Set<Long> buyers = new HashSet<>();
        long newSales = 0;
        LocalDateTime now = LocalDateTime.now();
        for (List<Bill> list : bills.values()) {
            for (int i = 0; i < list.size(); i++) {
                Bill b = list.get(i);
                Bill before = i > 0 ? list.get(i - 1) : null;
                Bill next = i + 1 < list.size() ? list.get(i + 1) : null;
                if (w.contains(b.at())) {
                    buyers.add(b.member());
                    if ("Renewal".equalsIgnoreCase(b.type())) {
                        long days = before == null || before.validTill() == null ? 0
                                : ChronoUnit.DAYS.between(b.at().toLocalDate(), before.validTill().toLocalDate());
                        sales.add(new RenewalSale(b, before, kindOf(b, before, prices), days));
                    } else {
                        newSales++;
                        newByPlan.merge(label(b.plan(), "No plan"), 1L, Long::sum);
                    }
                }
                // Memberships that ran out in the window (and already have, as of today)
                if (b.validTill() != null && w.contains(b.validTill()) && b.validTill().isBefore(now)) {
                    String outcome;
                    if (next != null && !next.at().isAfter(b.validTill().plusDays(GRACE_DAYS))) {
                        String k = kindOf(next, b, prices);
                        outcome = "Upgrade".equals(k) ? "Upgraded" : "Downgrade".equals(k) ? "Downgraded" : "Renewed";
                    } else if (b.validTill().plusDays(GRACE_DAYS).isAfter(now)) {
                        outcome = "Not renewed yet";
                    } else {
                        outcome = "Lapsed";
                    }
                    endings.add(new Ending(b, next, outcome));
                }
            }
        }
        Set<Long> addonBuyers = new HashSet<>(em.createQuery(
                        "SELECT DISTINCT r.memberDbId FROM Receipt r WHERE r.transactionType = 'Add-on' AND " + PAID +
                        " AND COALESCE(r.transactionDate, r.createdAt) >= :s AND COALESCE(r.transactionDate, r.createdAt) < :e", Long.class)
                .setParameter("s", w.start()).setParameter("e", w.end()).getResultList());
        return new RenewalPeriod(sales, endings, newSales, newByPlan, buyers, addonBuyers);
    }

    private static long countKind(RenewalPeriod p, String kind) {
        return p.sales().stream().filter(s -> kind.equals(s.kind())).count();
    }

    private static long countOutcome(RenewalPeriod p, String... outcomes) {
        Set<String> set = Set.of(outcomes);
        return p.endings().stream().filter(e -> set.contains(e.outcome())).count();
    }

    private static String timing(long daysBeforeEnd) {
        if (daysBeforeEnd > 7) return "Early (8+ days before)";
        if (daysBeforeEnd >= 0) return "On time (last week)";
        if (daysBeforeEnd >= -7) return "Up to a week late";
        if (daysBeforeEnd >= -30) return "8–30 days late";
        return "Win-back (30+ days)";
    }

    public Map<String, Object> getRenewals(LocalDate from, LocalDate to, String compare) {
        Ctx x = ctx(from, to, compare);
        Map<String, BigDecimal> prices = new HashMap<>();
        for (Object[] r : em.createQuery("SELECT p.name, p.price FROM MembershipPlan p", Object[].class).getResultList()) {
            if (r[0] != null && r[1] != null) prices.put(((String) r[0]).trim().toLowerCase(Locale.ROOT), (BigDecimal) r[1]);
        }
        Map<Long, List<Bill>> bills = memberBills(x.cur(), x.pre());
        RenewalPeriod c = renewalPeriod(x.cur(), bills, prices);
        RenewalPeriod p = renewalPeriod(x.pre(), bills, prices);

        long renewedC = countOutcome(c, "Renewed", "Upgraded", "Downgraded"), renewedP = countOutcome(p, "Renewed", "Upgraded", "Downgraded");
        long lapsedC = countOutcome(c, "Lapsed"), lapsedP = countOutcome(p, "Lapsed");
        double revC = c.sales().stream().mapToDouble(s -> s.bill().value().doubleValue()).sum();
        double revP = p.sales().stream().mapToDouble(s -> s.bill().value().doubleValue()).sum();
        long earlyC = c.sales().stream().filter(s -> s.before() != null && s.daysBeforeEnd() >= 0).count();
        long earlyP = p.sales().stream().filter(s -> s.before() != null && s.daysBeforeEnd() >= 0).count();
        long attachC = c.buyers().stream().filter(c.addonBuyers()::contains).count();
        long attachP = p.buyers().stream().filter(p.addonBuyers()::contains).count();

        String a = "renewals";
        List<Metric> metrics = new ArrayList<>();
        metrics.add(new Metric(a, "renewalRate", "Renewal rate", pct(renewedC, renewedC + lapsedC), pct(renewedP, renewedP + lapsedP), "percent", true));
        metrics.add(new Metric(a, "renewalsSold", "Renewals (same plan)", countKind(c, "Renewal"), countKind(p, "Renewal"), "count", true));
        metrics.add(new Metric(a, "upgrades", "Upgrades", countKind(c, "Upgrade"), countKind(p, "Upgrade"), "count", true));
        metrics.add(new Metric(a, "downgrades", "Downgrades", countKind(c, "Downgrade"), countKind(p, "Downgrade"), "count", false));
        metrics.add(new Metric(a, "membershipsEnded", "Memberships ended", c.endings().size(), p.endings().size(), "count", false));
        metrics.add(new Metric(a, "lapsed", "Lapsed (not back within 30 days)", lapsedC, lapsedP, "count", false));
        metrics.add(new Metric(a, "notRenewedYet", "Ended, not renewed yet", countOutcome(c, "Not renewed yet"), countOutcome(p, "Not renewed yet"), "count", false));
        metrics.add(new Metric(a, "renewalRevenue", "Renewal revenue", revC, revP, "money", true));
        metrics.add(new Metric(a, "renewedOnTime", "Renewed before expiry", pct(earlyC, c.sales().size()), pct(earlyP, p.sales().size()), "percent", true));
        metrics.add(new Metric(a, "addonAttach", "Bought an add-on too", pct(attachC, c.buyers().size()), pct(attachP, p.buyers().size()), "percent", true));

        Map<String, Object> out = new LinkedHashMap<>(x.meta());
        out.put("metrics", metrics.stream().map(Metric::toMap).toList());
        out.put("outcomes", orderedCountRows(c.endings(), p.endings(), Ending::outcome,
                List.of("Renewed", "Upgraded", "Downgraded", "Not renewed yet", "Lapsed")));
        out.put("timing", orderedCountRows(
                c.sales().stream().filter(s -> s.before() != null && s.before().validTill() != null).toList(),
                p.sales().stream().filter(s -> s.before() != null && s.before().validTill() != null).toList(),
                s -> timing(s.daysBeforeEnd()),
                List.of("Early (8+ days before)", "On time (last week)", "Up to a week late", "8–30 days late", "Win-back (30+ days)")));

        Function<RenewalSale, String> path = s -> label(s.before() == null ? null : s.before().plan(), "Unknown plan") + " → " + label(s.bill().plan(), "Unknown plan");
        List<RenewalSale> changesC = c.sales().stream().filter(s -> !"Renewal".equals(s.kind())).toList();
        List<RenewalSale> changesP = p.sales().stream().filter(s -> !"Renewal".equals(s.kind())).toList();
        List<Map<String, Object>> changes = amountRows(changesC, changesP, path, s -> s.bill().value(), 0);
        Map<String, String> kinds = new HashMap<>();
        Map<String, Double> uplift = new HashMap<>();
        for (RenewalSale s : changesC) {
            kinds.put(path.apply(s), s.kind());
            uplift.merge(path.apply(s), s.bill().value().subtract(s.before() == null ? BigDecimal.ZERO : s.before().value()).doubleValue(), Double::sum);
        }
        for (RenewalSale s : changesP) kinds.putIfAbsent(path.apply(s), s.kind());
        changes.forEach(r -> {
            r.put("kind", kinds.get((String) r.get("name")));
            r.put("difference", round(uplift.getOrDefault((String) r.get("name"), 0.0)));
        });
        out.put("planChanges", changes);
        out.put("plans", planRows(c, p));

        // Lapsed and not-yet-renewed members of this period, most valuable first
        List<Ending> gone = c.endings().stream().filter(e -> "Lapsed".equals(e.outcome()) || "Not renewed yet".equals(e.outcome()))
                .sorted(Comparator.comparing((Ending e) -> e.bill().value()).reversed()).limit(LIST_ROWS).toList();
        Map<Long, LocalDateTime> visits = lastVisits(gone.stream().map(e -> e.bill().member()).toList());
        out.put("lapsedMembers", gone.stream().map(e -> row(
                "memberId", e.bill().member(), "name", e.bill().name(), "phone", e.bill().phone(), "plan", e.bill().plan(),
                "endedOn", e.bill().validTill().toLocalDate().toString(), "value", money(e.bill().value()),
                "status", e.outcome(), "lastVisit", dateOrNull(visits.get(e.bill().member())))).toList());
        out.put("lapsedTotal", gone.size() < LIST_ROWS ? gone.size() : countOutcome(c, "Lapsed", "Not renewed yet"));
        out.put("dueSoon", dueSoon());
        return out;
    }

    private static String dateOrNull(LocalDateTime t) {
        return t == null ? null : t.toLocalDate().toString();
    }

    /** Per plan: new sales, renewals, upgrades/downgrades into it, endings out of it, renewal rate. */
    private List<Map<String, Object>> planRows(RenewalPeriod c, RenewalPeriod p) {
        Map<String, long[]> v = new LinkedHashMap<>();
        Function<String, long[]> at = k -> v.computeIfAbsent(label(k, "No plan"), z -> new long[8]);
        c.newByPlan().forEach((k, n) -> at.apply(k)[0] += n);
        for (RenewalSale s : c.sales()) {
            long[] r = at.apply(s.bill().plan());
            switch (s.kind()) {
                case "Upgrade" -> r[2]++;
                case "Downgrade" -> r[3]++;
                default -> r[1]++;
            }
        }
        for (Ending e : c.endings()) {
            long[] r = at.apply(e.bill().plan());
            if ("Not renewed yet".equals(e.outcome())) continue;
            r[4]++;
            if (!"Lapsed".equals(e.outcome())) r[5]++;
        }
        for (Ending e : p.endings()) {
            long[] r = at.apply(e.bill().plan());
            if ("Not renewed yet".equals(e.outcome())) continue;
            r[6]++;
            if (!"Lapsed".equals(e.outcome())) r[7]++;
        }
        Map<String, Long> active = new HashMap<>();
        for (Object[] r : em.createQuery("SELECT m.membershipPlan, COUNT(m) FROM Member m WHERE LOWER(m.membershipStatus) IN ('active', 'frozen') GROUP BY m.membershipPlan", Object[].class).getResultList()) {
            active.merge(label((String) r[0], "No plan"), (Long) r[1], Long::sum);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        v.forEach((name, r) -> out.add(row(
                "name", name, "activeMembers", active.getOrDefault(name, 0L), "newSales", r[0], "renewals", r[1],
                "upgradesIn", r[2], "downgradesIn", r[3], "ended", r[4], "renewed", r[5],
                "renewalRate", r[4] == 0 ? null : round(r[5] * 100.0 / r[4]),
                "previousRenewalRate", r[6] == 0 ? null : round(r[7] * 100.0 / r[6]))));
        out.sort((a, b) -> Long.compare((long) b.get("activeMembers"), (long) a.get("activeMembers")));
        return out;
    }

    /** Active memberships running out in the next 30 days (as of today, whatever the range). */
    private Map<String, Object> dueSoon() {
        LocalDateTime now = LocalDateTime.now();
        List<Object[]> rows = em.createQuery(
                        "SELECT m.id, m.name, m.phone, m.membershipPlan, m.membershipEndDate, m.membershipFee FROM Member m " +
                        "WHERE m.membershipEndDate >= :s AND m.membershipEndDate < :e AND LOWER(m.membershipStatus) IN ('active', 'frozen') " +
                        "ORDER BY m.membershipEndDate", Object[].class)
                .setParameter("s", now.toLocalDate().atStartOfDay()).setParameter("e", now.toLocalDate().plusDays(31).atStartOfDay())
                .getResultList();
        long in7 = 0, in14 = 0;
        for (Object[] r : rows) {
            long d = ChronoUnit.DAYS.between(now.toLocalDate(), ((LocalDateTime) r[4]).toLocalDate());
            if (d <= 7) in7++;
            if (d <= 14) in14++;
        }
        List<Object[]> shown = rows.stream().limit(50).toList();
        Map<Long, LocalDateTime> visits = lastVisits(shown.stream().map(r -> (Long) r[0]).toList());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("in7", in7);
        out.put("in14", in14);
        out.put("in30", rows.size());
        out.put("members", shown.stream().map(r -> row(
                "memberId", r[0], "name", r[1], "phone", r[2], "plan", r[3],
                "endsOn", ((LocalDateTime) r[4]).toLocalDate().toString(),
                "daysLeft", ChronoUnit.DAYS.between(now.toLocalDate(), ((LocalDateTime) r[4]).toLocalDate()),
                "value", r[5] == null ? null : money((BigDecimal) r[5]),
                "lastVisit", dateOrNull(visits.get((Long) r[0])))).toList());
        return out;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Training & classes
    // ═════════════════════════════════════════════════════════════════════════

    private record TrainingPeriod(List<Object[]> sold, Set<Long> repeatBuyers, List<Object[]> expired,
                                  Map<Long, long[]> usage, List<Object[]> bookings, List<Object[]> sessions,
                                  List<Object[]> reviews, List<Object[]> changes, List<Object[]> activeEnrolments) {}

    private static boolean seated(Object[] b) {
        return !RevenueOperationsService.NO_SEAT.contains(bstatus(b));
    }

    private static boolean attended(Object[] b) {
        String s = bstatus(b);
        return "checked-in".equals(s) || "checked_in".equals(s) || "attended".equals(s);
    }

    private static boolean noShow(Object[] b) {
        String s = bstatus(b);
        return "no-show".equals(s) || "no_show".equals(s);
    }

    /** A PT session that took place: checked in, or confirmed and already past. */
    private static boolean delivered(Object[] b) {
        if (attended(b)) return true;
        return "confirmed".equals(bstatus(b)) && b[3] != null && ((LocalDate) b[3]).isBefore(LocalDate.now());
    }

    private TrainingPeriod loadTraining(Window w) {
        // Packages sold: [id, packageId, memberId, trainerId, packageName, planType, sessionsTotal, price, status, createdAt]
        List<Object[]> sold = rows(
                "SELECT e.id, e.packageId, e.memberId, e.trainerId, e.packageName, e.planType, e.sessionsTotal, e.price, e.status, e.createdAt " +
                "FROM PackageEnrolment e WHERE e.createdAt >= :s AND e.createdAt < :e", w);
        Set<Long> buyers = new HashSet<>();
        for (Object[] e : sold) if (e[2] != null) buyers.add((Long) e[2]);
        Set<Long> repeat = new HashSet<>();
        if (!buyers.isEmpty()) {
            Map<Long, LocalDateTime> first = new HashMap<>();
            for (Object[] r : inRows("SELECT e.memberId, MIN(e.createdAt) FROM PackageEnrolment e WHERE e.memberId IN :ids GROUP BY e.memberId", buyers)) {
                first.put((Long) r[0], (LocalDateTime) r[1]);
            }
            for (Object[] e : sold) {
                LocalDateTime f = e[2] == null ? null : first.get((Long) e[2]);
                if (f != null && f.isBefore((LocalDateTime) e[9])) repeat.add((Long) e[0]);
            }
        }

        // Packages that ran out in the window (already ended): [id, sessionsTotal, planType, noShowPolicy, unusedAtExpiry, price]
        List<Object[]> expired = em.createQuery(
                        "SELECT e.id, e.sessionsTotal, e.planType, e.noShowPolicy, e.unusedAtExpiry, e.price FROM PackageEnrolment e " +
                        "WHERE e.endDate >= :f AND e.endDate <= :t AND e.endDate < :today " +
                        "AND (e.status IS NULL OR e.status <> 'cancelled')", Object[].class)
                .setParameter("f", w.from()).setParameter("t", w.to()).setParameter("today", LocalDate.now()).getResultList();
        Map<Long, long[]> usage = new HashMap<>();
        Set<Long> expiredIds = new HashSet<>();
        for (Object[] e : expired) expiredIds.add((Long) e[0]);
        if (!expiredIds.isEmpty()) {
            for (Object[] b : inRows("SELECT b.enrolmentId, b.status FROM Booking b WHERE b.enrolmentId IN :ids", expiredIds)) {
                long[] u = usage.computeIfAbsent((Long) b[0], k -> new long[2]);
                String s = b[1] == null ? "confirmed" : ((String) b[1]).toLowerCase(Locale.ROOT);
                if ("no-show".equals(s) || "no_show".equals(s)) u[1]++;
                else if (!"cancelled".equals(s) && !"waitlisted".equals(s)) u[0]++;
            }
        }

        // Bookings: [status, price, paymentStatus, date, type, name, trainerId, trainerName, sessionId, startTime, enrolmentId, memberId]
        List<Object[]> bookings = dateRows(
                "SELECT b.status, b.price, b.paymentStatus, s.date, s.type, s.name, t.id, t.name, s.id, s.startTime, b.enrolmentId, m.id " +
                "FROM Booking b JOIN b.session s LEFT JOIN s.trainer t LEFT JOIN b.member m " +
                "WHERE s.date >= :f AND s.date <= :t", w);
        // Sessions: [id, type, name, capacity, status, date, startTime, trainerId, trainerName]
        List<Object[]> sessions = dateRows(
                "SELECT s.id, s.type, s.name, s.capacity, s.status, s.date, s.startTime, t.id, t.name " +
                "FROM TrainingSession s LEFT JOIN s.trainer t WHERE s.date >= :f AND s.date <= :t", w);
        // Reviews of sessions in the window: [rating, sessionId, type, name, trainerId]
        List<Object[]> reviews = dateRows(
                "SELECT r.rating, s.id, s.type, s.name, t.id FROM SessionReview r, TrainingSession s LEFT JOIN s.trainer t " +
                "WHERE s.id = r.sessionId AND s.date >= :f AND s.date <= :t", w);
        List<Object[]> changes = dateRows(
                "SELECT c.fromTrainerId, c.toTrainerId FROM PackageTrainerChange c WHERE c.effectiveDate >= :f AND c.effectiveDate <= :t", w);
        // PT enrolments running at any point in the window: [trainerId, memberId]
        List<Object[]> active = dateRows(
                "SELECT e.trainerId, e.memberId FROM PackageEnrolment e WHERE e.startDate <= :t AND (e.endDate IS NULL OR e.endDate >= :f) " +
                "AND (e.status IS NULL OR e.status <> 'cancelled')", w);
        return new TrainingPeriod(sold, repeat, expired, usage, bookings, sessions, reviews, changes, active);
    }

    private static boolean live(Object[] e) {
        return e[8] == null || !"cancelled".equalsIgnoreCase((String) e[8]);
    }

    /** Sessions bought but never used on packages that ran out (session packs only). */
    private static long unusedSessions(TrainingPeriod p) {
        long unused = 0;
        for (Object[] e : p.expired()) {
            if (e[1] == null || "days".equalsIgnoreCase((String) e[2])) continue;
            long[] u = p.usage().getOrDefault((Long) e[0], new long[2]);
            long used = u[0] + ("counts".equalsIgnoreCase((String) e[3]) ? u[1] : 0);
            unused += Math.max(0, ((Number) e[1]).longValue() - used);
        }
        return unused;
    }

    /** [PT revenue, packages sold, sessions delivered, PT clients, class sessions, class seats, class booked, class attended,
     *  class no-shows, class bookings (incl. cancelled), class cancellations, rating sum, rating count, PT no-shows, PT held]. */
    private static double[] trainingStats(TrainingPeriod p) {
        double ptRevenue = 0, packages = 0;
        for (Object[] e : p.sold()) {
            if (!live(e)) continue;
            packages++;
            ptRevenue += bd(e[7]).doubleValue();
        }
        double delivered = 0, ptNoShow = 0, ptHeld = 0;
        Set<Long> clients = new HashSet<>();
        for (Object[] b : p.bookings()) {
            if (!isPt(b[4])) continue;
            // Pay-per-session PT (not drawn from a package)
            if (b[10] == null && b[2] != null && "paid".equalsIgnoreCase((String) b[2]) && seated(b)) ptRevenue += bd(b[1]).doubleValue();
            if (!seated(b)) continue;
            if (b[11] != null) clients.add((Long) b[11]);
            if (delivered(b)) delivered++;
            if (noShow(b)) ptNoShow++;
            if (b[3] != null && ((LocalDate) b[3]).isBefore(LocalDate.now()) && !"pending_approval".equals(bstatus(b))) ptHeld++;
        }
        for (Object[] a : p.activeEnrolments()) if (a[1] != null) clients.add((Long) a[1]);

        Map<Long, Integer> capacity = new HashMap<>();
        double classSessions = 0;
        for (Object[] s : p.sessions()) {
            if (isPt(s[1]) || "cancelled".equalsIgnoreCase((String) s[4])) continue;
            classSessions++;
            if (s[3] != null && ((Number) s[3]).intValue() > 0) capacity.put((Long) s[0], ((Number) s[3]).intValue());
        }
        double seats = capacity.values().stream().mapToInt(Integer::intValue).sum();
        Map<Long, Integer> taken = new HashMap<>();
        double attendedN = 0, noShows = 0, total = 0, cancelled = 0, booked = 0;
        for (Object[] b : p.bookings()) {
            if (isPt(b[4]) || "waitlisted".equals(bstatus(b))) continue;
            total++;
            if ("cancelled".equals(bstatus(b))) {
                cancelled++;
                continue;
            }
            booked++;
            if (attended(b)) attendedN++;
            if (noShow(b)) noShows++;
            if (capacity.containsKey((Long) b[8])) taken.merge((Long) b[8], 1, Integer::sum);
        }
        double seated = taken.entrySet().stream().mapToDouble(e -> Math.min(e.getValue(), capacity.get(e.getKey()))).sum();
        double ratingSum = 0, ratingN = 0;
        for (Object[] r : p.reviews()) {
            if (r[0] == null) continue;
            ratingSum += ((Number) r[0]).doubleValue();
            ratingN++;
        }
        return new double[]{ptRevenue, packages, delivered, clients.size(), classSessions, seats, seated, attendedN,
                noShows, total, cancelled, ratingSum, ratingN, ptNoShow, ptHeld, booked};
    }

    public Map<String, Object> getTraining(LocalDate from, LocalDate to, String compare) {
        Ctx x = ctx(from, to, compare);
        TrainingPeriod c = loadTraining(x.cur());
        TrainingPeriod p = loadTraining(x.pre());
        double[] sc = trainingStats(c), sp = trainingStats(p);
        long soldC = c.sold().stream().filter(BusinessInsightsService::live).count();
        long soldP = p.sold().stream().filter(BusinessInsightsService::live).count();

        String a = "training";
        List<Metric> metrics = new ArrayList<>();
        metrics.add(new Metric(a, "ptRevenue", "PT revenue", sc[0], sp[0], "money", true));
        metrics.add(new Metric(a, "packagesSold", "PT packages sold", sc[1], sp[1], "count", true));
        metrics.add(new Metric(a, "repeatPackages", "Bought again (repeat clients)",
                pct(c.repeatBuyers().size(), soldC), pct(p.repeatBuyers().size(), soldP), "percent", true));
        metrics.add(new Metric(a, "ptSessions", "PT sessions delivered", sc[2], sp[2], "count", true));
        metrics.add(new Metric(a, "ptClients", "PT clients", sc[3], sp[3], "count", true));
        metrics.add(new Metric(a, "ptNoShowRate", "PT no-show rate", pct(sc[13], sc[14]), pct(sp[13], sp[14]), "percent", false));
        metrics.add(new Metric(a, "packagesExpired", "Packages that ran out", c.expired().size(), p.expired().size(), "count", false));
        metrics.add(new Metric(a, "unusedSessions", "Sessions expired unused", unusedSessions(c), unusedSessions(p), "count", false));
        metrics.add(new Metric(a, "classSessions", "Classes run", sc[4], sp[4], "count", true));
        metrics.add(new Metric(a, "classFill", "Class fill rate", pct(sc[6], sc[5]), pct(sp[6], sp[5]), "percent", true));
        metrics.add(new Metric(a, "classAvgAttendance", "Avg. booked per class", ratio(sc[15], sc[4]), ratio(sp[15], sp[4]), "decimal", true));
        metrics.add(new Metric(a, "classNoShowRate", "Class no-show rate", pct(sc[8], sc[15]), pct(sp[8], sp[15]), "percent", false));
        metrics.add(new Metric(a, "classCancelRate", "Class late-cancel rate", pct(sc[10], sc[9]), pct(sp[10], sp[9]), "percent", false));
        metrics.add(new Metric(a, "avgRating", "Avg. session rating (of 5)", ratio(sc[11], sc[12]), ratio(sp[11], sp[12]), "decimal", true));

        Map<String, Object> out = new LinkedHashMap<>(x.meta());
        out.put("metrics", metrics.stream().map(Metric::toMap).toList());
        out.put("trainers", trainerRows(c, p));
        out.put("classes", classRows(c, p));
        List<Object[]> liveC = c.sold().stream().filter(BusinessInsightsService::live).toList();
        List<Object[]> liveP = p.sold().stream().filter(BusinessInsightsService::live).toList();
        out.put("packages", amountRows(liveC, liveP, e -> label((String) e[4], "PT package"), e -> bd(e[7]), 10));
        out.put("packageMix", countRows(liveC, liveP, e -> "days".equalsIgnoreCase((String) e[5]) ? "Day-based" : "Session packs", 0));
        out.put("heatmap", heatmap(c));
        return out;
    }

    private List<Map<String, Object>> trainerRows(TrainingPeriod c, TrainingPeriod p) {
        Map<Long, String> names = new HashMap<>();
        for (Object[] r : em.createQuery("SELECT s.id, s.name FROM Staff s", Object[].class).getResultList()) names.put((Long) r[0], (String) r[1]);
        // [clients, PT delivered, prev PT delivered, classes taught, prev classes, PT no-shows, packages sold, package revenue,
        //  rating sum, rating n, switched away, switched in]
        Map<Long, double[]> v = new HashMap<>();
        Function<Long, double[]> at = id -> v.computeIfAbsent(id, k -> new double[12]);
        Map<Long, Set<Long>> clients = new HashMap<>();
        for (Object[] b : c.bookings()) {
            if (b[6] == null || !isPt(b[4]) || !seated(b)) continue;
            Long t = (Long) b[6];
            if (b[11] != null) clients.computeIfAbsent(t, k -> new HashSet<>()).add((Long) b[11]);
            if (delivered(b)) at.apply(t)[1]++;
            if (noShow(b)) at.apply(t)[5]++;
        }
        for (Object[] e : c.activeEnrolments()) {
            if (e[0] != null && e[1] != null) clients.computeIfAbsent((Long) e[0], k -> new HashSet<>()).add((Long) e[1]);
        }
        for (Object[] b : p.bookings()) if (b[6] != null && isPt(b[4]) && seated(b) && delivered(b)) at.apply((Long) b[6])[2]++;
        for (Object[] s : c.sessions()) if (s[7] != null && !isPt(s[1]) && !"cancelled".equalsIgnoreCase((String) s[4])) at.apply((Long) s[7])[3]++;
        for (Object[] s : p.sessions()) if (s[7] != null && !isPt(s[1]) && !"cancelled".equalsIgnoreCase((String) s[4])) at.apply((Long) s[7])[4]++;
        for (Object[] e : c.sold()) {
            if (e[3] == null || !live(e)) continue;
            at.apply((Long) e[3])[6]++;
            at.apply((Long) e[3])[7] += bd(e[7]).doubleValue();
        }
        for (Object[] r : c.reviews()) {
            if (r[4] == null || r[0] == null) continue;
            at.apply((Long) r[4])[8] += ((Number) r[0]).doubleValue();
            at.apply((Long) r[4])[9]++;
        }
        for (Object[] ch : c.changes()) {
            if (ch[0] != null) at.apply((Long) ch[0])[10]++;
            if (ch[1] != null) at.apply((Long) ch[1])[11]++;
        }
        clients.forEach((t, set) -> at.apply(t)[0] = set.size());
        Map<Long, String> sessionNames = new HashMap<>();
        for (Object[] s : c.sessions()) if (s[7] != null && s[8] != null) sessionNames.put((Long) s[7], (String) s[8]);
        List<Map<String, Object>> out = new ArrayList<>();
        v.forEach((id, r) -> out.add(row(
                "name", names.getOrDefault(id, sessionNames.getOrDefault(id, "Staff #" + id)),
                "clients", (long) r[0], "ptSessions", (long) r[1], "previousPtSessions", (long) r[2],
                "classes", (long) r[3], "previousClasses", (long) r[4], "noShows", (long) r[5],
                "packagesSold", (long) r[6], "packageRevenue", round(r[7]),
                "rating", r[9] == 0 ? null : round(r[8] / r[9]), "reviews", (long) r[9],
                "switchedAway", (long) r[10], "switchedIn", (long) r[11])));
        out.sort((x, y) -> Double.compare(((long) y.get("ptSessions")) + ((long) y.get("classes")) + (double) y.get("packageRevenue") / 1000,
                ((long) x.get("ptSessions")) + ((long) x.get("classes")) + (double) x.get("packageRevenue") / 1000));
        return out;
    }

    /** Per class name: sessions run, bookings, fill, no-shows, cancellations, rating — both periods. */
    private static List<Map<String, Object>> classRows(TrainingPeriod c, TrainingPeriod p) {
        Map<String, double[]> cur = classTally(c), prev = classTally(p);
        Map<String, String> types = new HashMap<>();
        for (Object[] s : c.sessions()) if (!isPt(s[1])) types.putIfAbsent(label((String) s[2], "Untitled class"), RevenueOperationsService.sessionTypeLabel((String) s[1]));
        List<String> names = new ArrayList<>(cur.keySet());
        prev.keySet().stream().filter(k -> !cur.containsKey(k)).forEach(names::add);
        List<Map<String, Object>> out = new ArrayList<>();
        for (String n : names) {
            double[] a = cur.getOrDefault(n, new double[9]), b = prev.getOrDefault(n, new double[9]);
            out.add(row(
                    "name", n, "type", types.get(n),
                    "current", (long) a[0], "previous", (long) b[0],
                    "booked", (long) a[2], "previousBooked", (long) b[2],
                    "avgBooked", a[0] == 0 ? null : round(a[2] / a[0]),
                    "fill", a[1] == 0 ? null : round(a[3] * 100 / a[1]), "previousFill", b[1] == 0 ? null : round(b[3] * 100 / b[1]),
                    "full", (long) a[4],
                    "noShowRate", a[2] == 0 ? null : round(a[5] * 100 / a[2]),
                    "cancelRate", a[6] == 0 ? null : round(a[7] * 100 / a[6]),
                    "rating", a[8] == 0 ? null : round(ratingSum(c, n) / a[8])));
        }
        out.sort((x, y) -> Long.compare((long) y.get("booked"), (long) x.get("booked")));
        return out;
    }

    private static double ratingSum(TrainingPeriod p, String name) {
        return p.reviews().stream().filter(r -> r[0] != null && !isPt(r[2]) && name.equals(label((String) r[3], "Untitled class")))
                .mapToDouble(r -> ((Number) r[0]).doubleValue()).sum();
    }

    /** name → [sessions, seats, booked, seated (capped), full sessions, no-shows, bookings incl. cancelled, cancelled, reviews]. */
    private static Map<String, double[]> classTally(TrainingPeriod p) {
        Map<String, double[]> out = new LinkedHashMap<>();
        Map<Long, String> nameOf = new HashMap<>();
        Map<Long, Integer> capacity = new HashMap<>();
        for (Object[] s : p.sessions()) {
            if (isPt(s[1]) || "cancelled".equalsIgnoreCase((String) s[4])) continue;
            String n = label((String) s[2], "Untitled class");
            nameOf.put((Long) s[0], n);
            double[] v = out.computeIfAbsent(n, k -> new double[9]);
            v[0]++;
            if (s[3] != null && ((Number) s[3]).intValue() > 0) {
                capacity.put((Long) s[0], ((Number) s[3]).intValue());
                v[1] += ((Number) s[3]).intValue();
            }
        }
        Map<Long, Integer> taken = new HashMap<>();
        for (Object[] b : p.bookings()) {
            String n = nameOf.get((Long) b[8]);
            if (n == null || "waitlisted".equals(bstatus(b))) continue;
            double[] v = out.get(n);
            v[6]++;
            if ("cancelled".equals(bstatus(b))) {
                v[7]++;
                continue;
            }
            v[2]++;
            if (noShow(b)) v[5]++;
            taken.merge((Long) b[8], 1, Integer::sum);
        }
        taken.forEach((sid, n) -> {
            Integer cap = capacity.get(sid);
            if (cap == null) return;
            double[] v = out.get(nameOf.get(sid));
            v[3] += Math.min(n, cap);
            if (n >= cap) v[4]++;
        });
        for (Object[] r : p.reviews()) {
            if (r[0] == null || isPt(r[2])) continue;
            double[] v = out.get(label((String) r[3], "Untitled class"));
            if (v != null) v[8]++;
        }
        return out;
    }

    /** Class fill by weekday × start hour for this period. */
    private static List<Map<String, Object>> heatmap(TrainingPeriod p) {
        Map<Long, Integer> booked = new HashMap<>();
        for (Object[] b : p.bookings()) if (!isPt(b[4]) && seated(b)) booked.merge((Long) b[8], 1, Integer::sum);
        Map<String, double[]> cells = new LinkedHashMap<>();
        for (Object[] s : p.sessions()) {
            if (isPt(s[1]) || "cancelled".equalsIgnoreCase((String) s[4]) || s[5] == null || s[6] == null) continue;
            DayOfWeek d = ((LocalDate) s[5]).getDayOfWeek();
            int h = ((LocalTime) s[6]).getHour();
            double[] v = cells.computeIfAbsent(d.getValue() + ":" + h, k -> new double[3]);
            v[0]++;
            int cap = s[3] == null ? 0 : ((Number) s[3]).intValue();
            int n = booked.getOrDefault((Long) s[0], 0);
            if (cap > 0) {
                v[1] += cap;
                v[2] += Math.min(n, cap);
            }
        }
        List<Map<String, Object>> out = new ArrayList<>();
        cells.forEach((k, v) -> {
            int day = Integer.parseInt(k.substring(0, k.indexOf(':')));
            int hour = Integer.parseInt(k.substring(k.indexOf(':') + 1));
            out.add(row("day", day, "dayName", DayOfWeek.of(day).getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                    "hour", hour, "sessions", (long) v[0], "seats", (long) v[1], "booked", (long) v[2],
                    "fill", v[1] == 0 ? null : round(v[2] * 100 / v[1])));
        });
        return out;
    }
}
