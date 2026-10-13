package com.company.project.services;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.entities.Expense;
import com.company.project.entities.Receipt;
import com.company.project.entities.SaleTransaction;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.ExpenseRepository;
import com.company.project.entities.Member;
import com.company.project.entities.PosCreditPayment;
import com.company.project.entities.SalesInvoice;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.PosCreditPaymentRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.SaleTransactionRepository;
import com.company.project.repositories.SalesInvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * Backs the web dashboard's "Revenue Dashboard" tab: money actually received in a
 * date range, split by revenue stream and payment method, plus spent expenses —
 * each figure also given for a comparison period (the previous period of the same
 * length, or the same dates last year) and broken down into detailed reports.
 *
 * Revenue sources (none of them create rows in another, so summing them never
 * double-counts):
 *  - Receipts: each row's own paidAmount (membership, renewals, add-ons, day passes,
 *    settlements of outstanding bills) — same cash basis as DashboardService.getKPIs().
 *  - Completed POS sales — only the part paid at the till — split into Merchandise /
 *    Cafe & F&B / Equipment by the product category name.
 *  - POS credit payments: the on-credit part of a POS sale, counted when it's paid.
 *  - Sales-module invoices (source MANUAL): each payment leg on its own date. POS
 *    invoices are skipped — they mirror a POS sale already counted above.
 *  - Paid PT and class bookings (dated by their session).
 *
 * Every report is built from the same entries as Total Collection, so their rows
 * always add back up to it.
 *
 * Map keys are returned camelCase on purpose (the global SNAKE_CASE naming strategy
 * only applies to bean properties), so the frontend reads them as-is.
 */
@Service
@Transactional(readOnly = true)
public class RevenueDashboardService {

    private static final Pattern CAFE_CATEGORY = Pattern.compile(
            "cafe|café|coffee|food|beverage|drink|snack|juice|smoothie|shake|meal|kitchen|f&b", Pattern.CASE_INSENSITIVE);
    private static final Pattern EQUIPMENT_CATEGORY = Pattern.compile("equipment|gear|rental", Pattern.CASE_INSENSITIVE);
    private static final List<String> STREAMS = List.of("membership", "services", "merchandise", "cafe", "equipment");
    private static final Map<String, String> STREAM_LABELS = Map.of(
            "membership", "Membership", "services", "PT & Services", "merchandise", "Merchandise",
            "cafe", "Cafe & F&B", "equipment", "Equipment");
    private static final String NOT_RECORDED = "Not recorded";
    private static final int TOP_ROWS = 10;

    private final ReceiptRepository receiptRepository;
    private final SaleTransactionRepository saleTransactionRepository;
    private final BookingRepository bookingRepository;
    private final ExpenseRepository expenseRepository;
    private final MemberRepository memberRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final PosCreditPaymentRepository posCreditPaymentRepository;

    public RevenueDashboardService(ReceiptRepository receiptRepository,
                                   SaleTransactionRepository saleTransactionRepository,
                                   BookingRepository bookingRepository,
                                   ExpenseRepository expenseRepository,
                                   MemberRepository memberRepository,
                                   SalesInvoiceRepository salesInvoiceRepository,
                                   PosCreditPaymentRepository posCreditPaymentRepository) {
        this.receiptRepository = receiptRepository;
        this.saleTransactionRepository = saleTransactionRepository;
        this.bookingRepository = bookingRepository;
        this.expenseRepository = expenseRepository;
        this.memberRepository = memberRepository;
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.posCreditPaymentRepository = posCreditPaymentRepository;
    }

    /**
     * One unit of money received: when, which stream, which bucket inside it, how it
     * was paid — plus what the detailed reports group by. {@code txn} identifies the
     * transaction it came from (a POS sale yields one entry per line).
     */
    private record Entry(LocalDateTime at, String stream, String item, Map<String, BigDecimal> byMethod,
                         String txn, String detail, String member, String staff, BigDecimal discount,
                         boolean timed) {
        Entry(LocalDateTime at, String stream, String item, Map<String, BigDecimal> byMethod,
              String txn, String detail, String member, String staff, BigDecimal discount) {
            this(at, stream, item, byMethod, txn, detail, member, staff, discount, true);
        }

        BigDecimal total() {
            return byMethod.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        }
    }

    /** Amount received through one payment method within one transaction. */
    private record MethodPart(String txn, String method, BigDecimal amount) {}

    public Map<String, Object> getSummary(LocalDate from, LocalDate to, String granularity) {
        return getSummary(from, to, granularity, null);
    }

    /**
     * @param compare "previous" (default) — the same number of days just before the range;
     *                "last-year" — the same dates one year earlier.
     */
    public Map<String, Object> getSummary(LocalDate from, LocalDate to, String granularity, String compare) {
        if (to.isBefore(from)) {
            LocalDate swap = from;
            from = to;
            to = swap;
        }
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        boolean lastYear = "last-year".equalsIgnoreCase(compare);
        LocalDate prevFrom;
        LocalDate prevTo;
        if (lastYear) {
            prevFrom = from.minusYears(1);
            prevTo = to.minusYears(1);
        } else if (from.getDayOfMonth() == 1 && to.equals(to.withDayOfMonth(to.lengthOfMonth()))) {
            // Whole calendar months (This Month / Quarter / Year): compare with the months just
            // before — October vs all of September, not the 31 days from Aug 31.
            long months = ChronoUnit.MONTHS.between(from, to.plusDays(1));
            prevFrom = from.minusMonths(months);
            prevTo = from.minusDays(1);
        } else {
            prevTo = from.minusDays(1);
            prevFrom = prevTo.minusDays(days - 1);
        }
        String bucket = resolveGranularity(granularity, days);

        List<Entry> current = collectEntries(from, to);
        List<Entry> previous = collectEntries(prevFrom, prevTo);
        List<Expense> expenses = expenseRepository.findSpentBetween(from, to);
        List<Expense> previousExpenses = expenseRepository.findSpentBetween(prevFrom, prevTo);

        BigDecimal collection = sumEntries(current);
        BigDecimal previousCollection = sumEntries(previous);
        BigDecimal expenseTotal = sumExpenses(expenses);
        BigDecimal previousExpenseTotal = sumExpenses(previousExpenses);
        BigDecimal net = collection.subtract(expenseTotal);
        BigDecimal previousNet = previousCollection.subtract(previousExpenseTotal);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", from.toString());
        result.put("to", to.toString());
        result.put("previousFrom", prevFrom.toString());
        result.put("previousTo", prevTo.toString());
        result.put("compare", lastYear ? "last-year" : "previous");
        result.put("granularity", bucket);

        Map<String, Object> collectionCard = streamSummary(current);
        collectionCard.put("trend", percentageChange(collection, previousCollection));
        result.put("totalCollection", collectionCard);

        Map<String, Object> expenseCard = new LinkedHashMap<>();
        expenseCard.put("total", expenseTotal);
        expenseCard.put("count", expenses.size());
        expenseCard.put("trend", percentageChange(expenseTotal, previousExpenseTotal));
        expenseCard.put("breakdown", groupExpenses(expenses));
        result.put("expenses", expenseCard);

        Map<String, Object> netCard = new LinkedHashMap<>();
        netCard.put("total", net);
        netCard.put("trend", percentageChange(net, previousNet));
        result.put("netRevenue", netCard);

        long activeMembers = memberRepository.countByMembershipStatus("active");
        Map<String, Object> membersCard = new LinkedHashMap<>();
        membersCard.put("count", activeMembers);
        membersCard.put("newInPeriod", memberRepository.countByJoinDateBetween(from.atStartOfDay(), to.plusDays(1).atStartOfDay()));
        result.put("activeMembers", membersCard);

        result.put("paymentMethods", groupByMethod(current));

        Map<String, Object> streams = new LinkedHashMap<>();
        for (String stream : STREAMS) {
            List<Entry> ofStream = current.stream().filter(e -> e.stream().equals(stream)).toList();
            Map<String, Object> summary = streamSummary(ofStream);
            summary.put("breakdown", groupByItem(ofStream));
            streams.put(stream, summary);
        }
        result.put("streams", streams);

        result.put("trend", buildTrend(current, expenses, from, to, bucket));

        // ── Comparison period headline figures + its trend (aligned by bucket index) ──
        Map<String, Object> comparison = new LinkedHashMap<>();
        comparison.put("label", lastYear ? "Same period last year" : "Previous period");
        comparison.put("totalCollection", streamSummary(previous));
        Map<String, Object> prevExpenseCard = new LinkedHashMap<>();
        prevExpenseCard.put("total", previousExpenseTotal);
        prevExpenseCard.put("count", previousExpenses.size());
        comparison.put("expenses", prevExpenseCard);
        comparison.put("netRevenue", Map.of("total", previousNet));
        comparison.put("transactions", countTransactions(previous));
        comparison.put("avgTransaction", average(previousCollection, countTransactions(previous)));
        comparison.put("discounts", sumDiscounts(previous));
        comparison.put("payingMembers", countPayingMembers(previous));
        comparison.put("trend", buildTrend(previous, previousExpenses, prevFrom, prevTo, bucket));
        result.put("comparison", comparison);

        result.put("insights", buildInsights(current, previous, expenses, previousExpenses, collection, activeMembers));
        return result;
    }

    /** Total money received in [from, to] — the same figure as the Revenue tab's Total Collection. */
    public BigDecimal totalCollection(LocalDate from, LocalDate to) {
        return sumEntries(collectEntries(from, to));
    }

    /** Revenue-only trend for [from, to] in the given bucket size (hourly/daily/weekly/monthly). */
    public List<Map<String, Object>> collectionTrend(LocalDate from, LocalDate to, String bucket) {
        return buildTrend(collectEntries(from, to), List.of(), from, to, bucket);
    }

    // ── Detailed reports ───────────────────────────────────────────────────────

    private Map<String, Object> buildInsights(List<Entry> current, List<Entry> previous,
                                              List<Expense> expenses, List<Expense> previousExpenses,
                                              BigDecimal collection, long activeMembers) {
        Map<String, Object> insights = new LinkedHashMap<>();
        long transactions = countTransactions(current);
        insights.put("transactions", transactions);
        insights.put("avgTransaction", average(collection, transactions));
        insights.put("revenuePerMember", average(collection, activeMembers));
        insights.put("payingMembers", countPayingMembers(current));

        Map<String, Object> discounts = new LinkedHashMap<>();
        discounts.put("total", sumDiscounts(current));
        discounts.put("count", current.stream().filter(e -> e.discount().signum() > 0).map(Entry::txn).distinct().count());
        insights.put("discounts", discounts);

        // Snapshot as of now — receivables aren't tied to the selected range
        BigDecimal membershipDue = nz(memberRepository.sumOutstandingBalance());
        BigDecimal salesInvoiceDue = nz(salesInvoiceRepository.sumOutstandingDue());
        Map<String, Object> outstanding = new LinkedHashMap<>();
        outstanding.put("membership", membershipDue);
        outstanding.put("membershipCount", memberRepository.countWithOutstandingBalance());
        outstanding.put("salesInvoices", salesInvoiceDue);
        outstanding.put("total", membershipDue.add(salesInvoiceDue));
        insights.put("outstanding", outstanding);

        insights.put("streams", compareRows(current, previous, e -> STREAM_LABELS.get(e.stream()), 0));
        insights.put("paymentMethods", compareRows(methodParts(current), methodParts(previous),
                MethodPart::method, MethodPart::amount, MethodPart::txn, 0));
        insights.put("transactionTypes", compareRows(
                current.stream().filter(e -> e.stream().equals("membership")).toList(),
                previous.stream().filter(e -> e.stream().equals("membership")).toList(),
                Entry::item, 0));
        insights.put("expenseCategories", compareRows(expenses, previousExpenses,
                RevenueDashboardService::expenseCategory, e -> nz(e.getTotalAmount()), e -> "X" + e.getId(), 0));

        insights.put("topPlans", compareRows(
                current.stream().filter(e -> e.stream().equals("membership")).toList(),
                previous.stream().filter(e -> e.stream().equals("membership")).toList(),
                Entry::detail, TOP_ROWS));
        insights.put("topProducts", compareRows(
                current.stream().filter(e -> e.txn().startsWith("S")).toList(),
                previous.stream().filter(e -> e.txn().startsWith("S")).toList(),
                Entry::detail, TOP_ROWS));
        insights.put("topMembers", compareRows(current, previous, Entry::member, TOP_ROWS));
        insights.put("staff", compareRows(current, previous,
                e -> e.staff() != null ? e.staff() : NOT_RECORDED, 0));

        insights.put("weekdays", byWeekday(current, previous));
        insights.put("hours", byHour(current));
        return insights;
    }

    private static List<Map<String, Object>> compareRows(List<Entry> current, List<Entry> previous,
                                                         Function<Entry, String> key, int limit) {
        return compareRows(current, previous, key, Entry::total, Entry::txn, limit);
    }

    /**
     * Rows of (name, amount, count, previousAmount, previousCount, share) — count is the
     * number of distinct transactions. Largest current amount first, then anything that
     * only appeared in the comparison period. A null key leaves the item out.
     */
    private static <T> List<Map<String, Object>> compareRows(List<T> current, List<T> previous,
                                                             Function<T, String> key,
                                                             Function<T, BigDecimal> amount,
                                                             Function<T, String> txn, int limit) {
        Map<String, Agg> cur = aggregate(current, key, amount, txn);
        Map<String, Agg> prev = aggregate(previous, key, amount, txn);
        BigDecimal curTotal = cur.values().stream().map(a -> a.amount).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<String> names = new ArrayList<>(cur.keySet());
        names.sort((a, b) -> cur.get(b).amount.compareTo(cur.get(a).amount));
        prev.keySet().stream()
                .filter(k -> !cur.containsKey(k))
                .sorted((a, b) -> prev.get(b).amount.compareTo(prev.get(a).amount))
                .forEach(names::add);
        if (limit > 0 && names.size() > limit) names = names.subList(0, limit);

        List<Map<String, Object>> rows = new ArrayList<>();
        for (String name : names) {
            Agg c = cur.getOrDefault(name, new Agg());
            Agg p = prev.getOrDefault(name, new Agg());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", name);
            row.put("amount", c.amount.setScale(2, RoundingMode.HALF_UP));
            row.put("count", c.txns.size());
            row.put("previousAmount", p.amount.setScale(2, RoundingMode.HALF_UP));
            row.put("previousCount", p.txns.size());
            row.put("share", curTotal.signum() == 0 ? 0.0
                    : c.amount.multiply(BigDecimal.valueOf(100)).divide(curTotal, 2, RoundingMode.HALF_UP).doubleValue());
            rows.add(row);
        }
        return rows;
    }

    private static final class Agg {
        BigDecimal amount = BigDecimal.ZERO;
        final Set<String> txns = new HashSet<>();
    }

    private static <T> Map<String, Agg> aggregate(List<T> items, Function<T, String> key,
                                                  Function<T, BigDecimal> amount, Function<T, String> txn) {
        Map<String, Agg> out = new LinkedHashMap<>();
        for (T item : items) {
            String k = key.apply(item);
            if (k == null) continue;
            Agg agg = out.computeIfAbsent(k, x -> new Agg());
            agg.amount = agg.amount.add(nz(amount.apply(item)));
            agg.txns.add(txn.apply(item));
        }
        return out;
    }

    private static List<MethodPart> methodParts(List<Entry> entries) {
        List<MethodPart> parts = new ArrayList<>();
        for (Entry e : entries) {
            e.byMethod().forEach((m, amt) -> {
                if (amt.signum() > 0) parts.add(new MethodPart(e.txn(), m, amt));
            });
        }
        return parts;
    }

    /** Mon–Sun: amount and transactions, with the comparison period alongside. */
    private static List<Map<String, Object>> byWeekday(List<Entry> current, List<Entry> previous) {
        Function<Entry, String> day = e -> e.at() == null ? null
                : e.at().getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
        Map<String, Agg> cur = aggregate(current, day, Entry::total, Entry::txn);
        Map<String, Agg> prev = aggregate(previous, day, Entry::total, Entry::txn);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (DayOfWeek d : DayOfWeek.values()) {
            String name = d.getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            Agg c = cur.getOrDefault(name, new Agg());
            Agg p = prev.getOrDefault(name, new Agg());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", name);
            row.put("amount", c.amount.setScale(2, RoundingMode.HALF_UP));
            row.put("count", c.txns.size());
            row.put("previousAmount", p.amount.setScale(2, RoundingMode.HALF_UP));
            row.put("previousCount", p.txns.size());
            rows.add(row);
        }
        return rows;
    }

    /** 0–23h: when the money comes in during the day. */
    private static List<Map<String, Object>> byHour(List<Entry> current) {
        Map<Integer, Agg> hours = new LinkedHashMap<>();
        for (Entry e : current) {
            // Sales-invoice payments carry a date only — no hour to place them in
            if (e.at() == null || !e.timed()) continue;
            Agg agg = hours.computeIfAbsent(e.at().getHour(), h -> new Agg());
            agg.amount = agg.amount.add(e.total());
            agg.txns.add(e.txn());
        }
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("h a", Locale.ENGLISH);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            Agg a = hours.getOrDefault(h, new Agg());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("hour", h);
            row.put("name", LocalTime.of(h, 0).format(fmt));
            row.put("amount", a.amount.setScale(2, RoundingMode.HALF_UP));
            row.put("count", a.txns.size());
            rows.add(row);
        }
        return rows;
    }

    private static long countTransactions(List<Entry> entries) {
        return entries.stream().map(Entry::txn).distinct().count();
    }

    private static long countPayingMembers(List<Entry> entries) {
        return entries.stream().map(Entry::member).filter(m -> m != null).distinct().count();
    }

    /** Discount is stored once per transaction (on its first entry), so this never double-counts. */
    private static BigDecimal sumDiscounts(List<Entry> entries) {
        return entries.stream().map(Entry::discount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal average(BigDecimal total, long count) {
        return count == 0 ? BigDecimal.ZERO : total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
    }

    private static String expenseCategory(Expense e) {
        return e.getCategory() != null && !e.getCategory().isBlank() ? e.getCategory() : "Uncategorized";
    }

    // ── Collection ─────────────────────────────────────────────────────────────

    private List<Entry> collectEntries(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        List<Entry> entries = new ArrayList<>();

        for (Receipt r : receiptRepository.findPaidBetween(start, end)) {
            String type = r.getTransactionType() != null && !r.getTransactionType().isBlank()
                    ? r.getTransactionType() : "Other";
            String label = receiptLabel(type);
            String plan = r.getPlanName() != null && !r.getPlanName().isBlank() ? r.getPlanName() : label;
            entries.add(new Entry(r.getTransactionDate(), "membership", label,
                    splitByMethod(r.getPaidAmount(), r.getPaymentBreakdown(), r.getPaymentMethod()),
                    "R" + r.getId(), plan, memberLabel(r.getMemberName(), r.getMemberId()),
                    blankToNull(r.getProcessedBy()), nz(r.getDiscountAmount())));
        }

        // POS: allocate each sale's received total across its lines (line totals are
        // pre-discount/tax, so they're scaled to the sale total to keep it reconciling).
        Map<Long, SaleTransaction> sales = new LinkedHashMap<>();
        for (SaleTransaction t : saleTransactionRepository.findCompletedBetween(start, end)) {
            sales.put(t.getId(), t);
        }
        Map<Long, List<Object[]>> linesBySale = new LinkedHashMap<>();
        for (Object[] row : saleTransactionRepository.findCompletedLineCategoriesBetween(start, end)) {
            linesBySale.computeIfAbsent((Long) row[0], k -> new ArrayList<>()).add(row);
        }
        for (SaleTransaction t : sales.values()) {
            // Only what was paid at the till; the part sold on credit is counted when
            // it's actually received (POS credit payments, below).
            BigDecimal saleTotal = nz(t.getTotalAmount()).subtract(nz(t.getCreditAmount()));
            if (saleTotal.signum() <= 0) continue;
            String txn = "S" + t.getId();
            String member = t.getMemberId() != null ? memberLabel(t.getMemberName(), t.getMemberCode()) : null;
            String staff = blankToNull(t.getCashierName());
            BigDecimal discount = nz(t.getDiscountAmount());
            List<PaymentSplitDTO> paidLegs = t.getPaymentBreakdown() == null ? null
                    : t.getPaymentBreakdown().stream().filter(l -> !isCreditLeg(l.getMethod())).toList();
            Map<String, BigDecimal> saleByMethod = splitByMethod(saleTotal, paidLegs, t.getPaymentMethod());
            List<Object[]> lines = linesBySale.getOrDefault(t.getId(), List.of());
            BigDecimal linesTotal = lines.stream().map(l -> nz((BigDecimal) l[3])).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (lines.isEmpty() || linesTotal.signum() <= 0) {
                entries.add(new Entry(t.getCreatedAt(), "merchandise", "Uncategorized", saleByMethod,
                        txn, "Uncategorized", member, staff, discount));
                continue;
            }
            boolean first = true;
            for (Object[] line : lines) {
                String category = (String) line[1];
                String product = line.length > 4 && line[4] != null ? (String) line[4] : category;
                BigDecimal share = nz((BigDecimal) line[3]).divide(linesTotal, 10, RoundingMode.HALF_UP);
                Map<String, BigDecimal> lineByMethod = new LinkedHashMap<>();
                saleByMethod.forEach((m, amt) -> lineByMethod.put(m, amt.multiply(share).setScale(2, RoundingMode.HALF_UP)));
                entries.add(new Entry(t.getCreatedAt(), posStream(category), category, lineByMethod,
                        txn, product, member, staff, first ? discount : BigDecimal.ZERO));
                first = false;
            }
        }

        int booking = 0;
        for (Object[] b : bookingRepository.findPaidBySessionDateBetween(from, to)) {
            String sessionName = (String) b[0];
            String sessionType = (String) b[1];
            LocalDate date = (LocalDate) b[2];
            LocalTime time = b[3] != null ? (LocalTime) b[3] : LocalTime.NOON;
            String name = sessionName != null && !sessionName.isBlank()
                    ? sessionName : ("pt".equalsIgnoreCase(sessionType) ? "Personal Training" : "Class");
            // Bookings don't record how they were paid, who paid, or who took the payment
            entries.add(new Entry(date.atTime(time), "services", name, Map.of("Other", nz((BigDecimal) b[4])),
                    "B" + (booking++), name, null, null, BigDecimal.ZERO));
        }

        // POS sales made on credit, paid off later — counted on the day the money came in
        List<PosCreditPayment> creditPayments = posCreditPaymentRepository.findByCreatedAtGreaterThanEqualAndCreatedAtLessThan(start, end);
        // Sales-module invoices (products sold outside the POS): each payment leg on its own date
        List<SalesInvoice> invoices = salesInvoiceRepository.findPaidManualInvoices();
        Map<Long, String> memberCodes = memberCodes(creditPayments, invoices);

        for (PosCreditPayment p : creditPayments) {
            if (nz(p.getAmount()).signum() <= 0) continue;
            String member = p.getMemberId() != null
                    ? memberLabel(p.getMemberName(), memberCodes.get(p.getMemberId())) : null;
            entries.add(new Entry(p.getCreatedAt(), "merchandise", "POS Credit Settlements",
                    Map.of(methodBucket(p.getPaymentMethod()), nz(p.getAmount())),
                    "P" + p.getId(), "POS Credit Settlements", member, blankToNull(p.getReceivedBy()), BigDecimal.ZERO));
        }

        for (SalesInvoice inv : invoices) {
            BigDecimal paid = nz(inv.getAmountPaid());
            LocalDate invoiceDate = inv.getInvoiceDate();
            String member = inv.getMemberId() != null
                    ? memberLabel(inv.getCustomerName(), memberCodes.get(inv.getMemberId())) : null;
            String staff = blankToNull(inv.getSalesperson());
            BigDecimal discount = nz(inv.getDiscountAmount()).add(nz(inv.getFooterDiscount()));
            boolean discountCounted = invoiceDate == null || invoiceDate.isBefore(from) || invoiceDate.isAfter(to);
            // Never credit more than the invoice records as paid; "Credit" legs are on account, not money
            BigDecimal counted = BigDecimal.ZERO;
            List<Object[]> receipts = new ArrayList<>();
            if (inv.getPaymentBreakdown() != null) {
                for (PaymentSplitDTO leg : inv.getPaymentBreakdown()) {
                    if (isCreditLeg(leg.getMethod())) continue;
                    BigDecimal amount = nz(leg.getAmount()).min(paid.subtract(counted));
                    if (amount.signum() <= 0) continue;
                    counted = counted.add(amount);
                    receipts.add(new Object[]{parseDate(leg.getPaymentDate(), invoiceDate), leg.getMethod(), amount});
                }
            }
            BigDecimal rest = paid.subtract(counted);
            if (rest.compareTo(new BigDecimal("0.005")) > 0) {
                receipts.add(new Object[]{invoiceDate, inv.getPaymentMethod(), rest});
            }
            int leg = 0;
            for (Object[] r : receipts) {
                LocalDate on = (LocalDate) r[0];
                leg++;
                if (on == null || on.isBefore(from) || on.isAfter(to)) continue;
                entries.add(new Entry(on.atStartOfDay(), "merchandise", "Sales Invoices",
                        Map.of(methodBucket((String) r[1]), (BigDecimal) r[2]),
                        "I" + inv.getId() + "-" + leg, "Sales Invoices", member, staff,
                        discountCounted ? BigDecimal.ZERO : discount, false));
                discountCounted = true;
            }
        }
        return entries;
    }

    /** Business member IDs (MBR-…) for the DB ids these rows point at, in one query. */
    private Map<Long, String> memberCodes(List<PosCreditPayment> creditPayments, List<SalesInvoice> invoices) {
        Set<Long> ids = new HashSet<>();
        creditPayments.forEach(p -> { if (p.getMemberId() != null) ids.add(p.getMemberId()); });
        invoices.forEach(i -> { if (i.getMemberId() != null) ids.add(i.getMemberId()); });
        Map<Long, String> codes = new LinkedHashMap<>();
        if (ids.isEmpty()) return codes;
        for (Member m : memberRepository.findAllById(ids)) codes.put(m.getId(), m.getMemberId());
        return codes;
    }

    private static boolean isCreditLeg(String method) {
        return method != null && method.trim().equalsIgnoreCase("credit");
    }

    private static LocalDate parseDate(String value, LocalDate fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return LocalDate.parse(value.length() > 10 ? value.substring(0, 10) : value);
        } catch (java.time.format.DateTimeParseException e) {
            return fallback;
        }
    }

    /** "Name (MBR-…)"; walk-in placeholders aren't members, so they're left out of member reports. */
    private static String memberLabel(String name, String id) {
        String n = blankToNull(name);
        String i = blankToNull(id);
        if (n != null && n.toLowerCase(Locale.ROOT).startsWith("walk-in")) return null;
        if (n == null) return i;
        return i == null ? n : n + " (" + i + ")";
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String receiptLabel(String transactionType) {
        return switch (transactionType) {
            case "New" -> "New Memberships";
            case "Renewal" -> "Renewals";
            case "Add-on" -> "Add-ons";
            case "Daily Entry" -> "Day Passes";
            case "Payment" -> "Balance Settlements";
            default -> transactionType;
        };
    }

    private static String posStream(String category) {
        if (category != null && CAFE_CATEGORY.matcher(category).find()) return "cafe";
        if (category != null && EQUIPMENT_CATEGORY.matcher(category).find()) return "equipment";
        return "merchandise";
    }

    /**
     * Splits a received amount into Cash / Card / Other. Uses the per-method breakdown
     * when there is one (scaled to the received amount), else the single method label.
     */
    private static Map<String, BigDecimal> splitByMethod(BigDecimal received, List<PaymentSplitDTO> breakdown, String method) {
        BigDecimal amount = nz(received);
        Map<String, BigDecimal> out = new LinkedHashMap<>();
        if (breakdown != null && !breakdown.isEmpty()) {
            BigDecimal splitTotal = breakdown.stream().map(s -> nz(s.getAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (splitTotal.signum() > 0) {
                for (PaymentSplitDTO s : breakdown) {
                    if (nz(s.getAmount()).signum() <= 0) continue;
                    BigDecimal part = nz(s.getAmount()).multiply(amount).divide(splitTotal, 2, RoundingMode.HALF_UP);
                    out.merge(methodBucket(s.getMethod()), part, BigDecimal::add);
                }
                return out;
            }
        }
        out.put(methodBucket(method), amount);
        return out;
    }

    private static String methodBucket(String method) {
        if (method == null) return "Other";
        String m = method.trim().toLowerCase(Locale.ROOT);
        if (m.equals("cash")) return "Cash";
        if (m.contains("card") || m.equals("credit card") || m.equals("debit card")) return "Card";
        return "Other";
    }

    // ── Aggregation helpers ────────────────────────────────────────────────────

    private static Map<String, Object> streamSummary(List<Entry> entries) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", sumEntries(entries));
        m.put("cash", sumMethod(entries, "Cash"));
        m.put("card", sumMethod(entries, "Card"));
        m.put("other", sumMethod(entries, "Other"));
        m.put("count", entries.size());
        return m;
    }

    private static BigDecimal sumEntries(List<Entry> entries) {
        return entries.stream().map(Entry::total).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal sumMethod(List<Entry> entries, String method) {
        return entries.stream().map(e -> e.byMethod().getOrDefault(method, BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal sumExpenses(List<Expense> expenses) {
        return expenses.stream().map(e -> nz(e.getTotalAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static List<Map<String, Object>> groupByItem(List<Entry> entries) {
        return groupRows(entries, Entry::item, Entry::total);
    }

    private static List<Map<String, Object>> groupExpenses(List<Expense> expenses) {
        return groupRows(expenses, RevenueDashboardService::expenseCategory, e -> nz(e.getTotalAmount()));
    }

    private static List<Map<String, Object>> groupByMethod(List<Entry> entries) {
        Map<String, BigDecimal> amounts = new LinkedHashMap<>();
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Entry e : entries) {
            e.byMethod().forEach((m, amt) -> {
                if (amt.signum() <= 0) return;
                amounts.merge(m, amt, BigDecimal::add);
                counts.merge(m, 1L, Long::sum);
            });
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        amounts.forEach((m, amt) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", m);
            row.put("amount", amt);
            row.put("count", counts.get(m));
            rows.add(row);
        });
        return rows;
    }

    /** (name, count, amount) rows, largest amount first. */
    private static <T> List<Map<String, Object>> groupRows(List<T> items, Function<T, String> key, Function<T, BigDecimal> amount) {
        Map<String, BigDecimal> amounts = new LinkedHashMap<>();
        Map<String, Long> counts = new LinkedHashMap<>();
        for (T item : items) {
            String k = key.apply(item);
            amounts.merge(k, amount.apply(item), BigDecimal::add);
            counts.merge(k, 1L, Long::sum);
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        amounts.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .forEach(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("name", e.getKey());
                    row.put("count", counts.get(e.getKey()));
                    row.put("amount", e.getValue().setScale(2, RoundingMode.HALF_UP));
                    rows.add(row);
                });
        return rows;
    }

    // ── Trend ──────────────────────────────────────────────────────────────────

    private static String resolveGranularity(String requested, long days) {
        if (requested != null) {
            String g = requested.toLowerCase(Locale.ROOT);
            if (List.of("hourly", "daily", "weekly", "monthly").contains(g)) {
                // Hourly over many days would be thousands of points
                return g.equals("hourly") && days > 2 ? "daily" : g;
            }
        }
        if (days <= 1) return "hourly";
        if (days <= 62) return "daily";
        if (days <= 190) return "weekly";
        return "monthly";
    }

    private static List<Map<String, Object>> buildTrend(List<Entry> entries, List<Expense> expenses,
                                                        LocalDate from, LocalDate to, String bucket) {
        Map<LocalDateTime, BigDecimal[]> points = new LinkedHashMap<>();
        Map<LocalDateTime, String> labels = new LinkedHashMap<>();
        DateTimeFormatter hour = DateTimeFormatter.ofPattern("h a", Locale.ENGLISH);
        DateTimeFormatter day = DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH);
        DateTimeFormatter month = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);

        LocalDateTime cursor = bucketStart(from.atStartOfDay(), bucket);
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        while (cursor.isBefore(end)) {
            points.put(cursor, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            String label = switch (bucket) {
                case "hourly" -> cursor.format(hour) + (from.equals(to) ? "" : " " + cursor.format(day));
                case "daily" -> cursor.format(day);
                case "weekly" -> "Wk " + cursor.format(day);
                default -> cursor.format(month);
            };
            labels.put(cursor, label);
            cursor = next(cursor, bucket);
        }

        for (Entry e : entries) {
            if (e.at() == null) continue;
            BigDecimal[] p = points.get(bucketStart(e.at(), bucket));
            if (p != null) p[0] = p[0].add(e.total());
        }
        if (!bucket.equals("hourly")) {
            // Expenses carry a date only, so they can't be placed in hourly buckets
            for (Expense x : expenses) {
                if (x.getDate() == null) continue;
                BigDecimal[] p = points.get(bucketStart(x.getDate().atStartOfDay(), bucket));
                if (p != null) p[1] = p[1].add(nz(x.getTotalAmount()));
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        points.forEach((at, v) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("label", labels.get(at));
            row.put("start", at.toString());
            row.put("revenue", v[0].setScale(2, RoundingMode.HALF_UP));
            row.put("expenses", bucket.equals("hourly") ? null : v[1].setScale(2, RoundingMode.HALF_UP));
            rows.add(row);
        });
        return rows;
    }

    private static LocalDateTime bucketStart(LocalDateTime t, String bucket) {
        return switch (bucket) {
            case "hourly" -> t.truncatedTo(ChronoUnit.HOURS);
            case "daily" -> t.toLocalDate().atStartOfDay();
            case "weekly" -> t.toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
            default -> t.toLocalDate().withDayOfMonth(1).atStartOfDay();
        };
    }

    private static LocalDateTime next(LocalDateTime t, String bucket) {
        return switch (bucket) {
            case "hourly" -> t.plusHours(1);
            case "daily" -> t.plusDays(1);
            case "weekly" -> t.plusWeeks(1);
            default -> t.plusMonths(1);
        };
    }

    // ── Misc ───────────────────────────────────────────────────────────────────

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    /** Same formula as DashboardService.calculatePercentageChange. */
    private static double percentageChange(BigDecimal current, BigDecimal previous) {
        if (previous.signum() == 0) {
            return current.signum() > 0 ? 100.0 : 0.0;
        }
        return current.subtract(previous)
                .divide(previous.abs(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100)).doubleValue();
    }
}
