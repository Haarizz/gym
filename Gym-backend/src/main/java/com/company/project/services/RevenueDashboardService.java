package com.company.project.services;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.entities.Expense;
import com.company.project.entities.Receipt;
import com.company.project.entities.SaleTransaction;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.ExpenseRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.SaleTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * Backs the web dashboard's "Revenue Dashboard" tab: money actually received in a
 * date range, split by revenue stream and payment method, plus spent expenses.
 *
 * Revenue sources (none of them create rows in another, so summing them never
 * double-counts):
 *  - Receipts: each row's own paidAmount (membership, renewals, add-ons, day passes,
 *    settlements of outstanding bills) — same cash basis as DashboardService.getKPIs().
 *  - Completed POS sales, split into Merchandise / Cafe & F&B / Equipment by the
 *    product category name.
 *  - Paid PT and class bookings (dated by their session).
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

    private final ReceiptRepository receiptRepository;
    private final SaleTransactionRepository saleTransactionRepository;
    private final BookingRepository bookingRepository;
    private final ExpenseRepository expenseRepository;
    private final MemberRepository memberRepository;

    public RevenueDashboardService(ReceiptRepository receiptRepository,
                                   SaleTransactionRepository saleTransactionRepository,
                                   BookingRepository bookingRepository,
                                   ExpenseRepository expenseRepository,
                                   MemberRepository memberRepository) {
        this.receiptRepository = receiptRepository;
        this.saleTransactionRepository = saleTransactionRepository;
        this.bookingRepository = bookingRepository;
        this.expenseRepository = expenseRepository;
        this.memberRepository = memberRepository;
    }

    /** One unit of money received: when, which stream, which bucket inside it, how it was paid. */
    private record Entry(LocalDateTime at, String stream, String item, Map<String, BigDecimal> byMethod) {
        BigDecimal total() {
            return byMethod.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        }
    }

    public Map<String, Object> getSummary(LocalDate from, LocalDate to, String granularity) {
        if (to.isBefore(from)) {
            LocalDate swap = from;
            from = to;
            to = swap;
        }
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        LocalDate prevTo = from.minusDays(1);
        LocalDate prevFrom = prevTo.minusDays(days - 1);
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

        Map<String, Object> membersCard = new LinkedHashMap<>();
        membersCard.put("count", memberRepository.countByMembershipStatus("active"));
        membersCard.put("newInPeriod", memberRepository.countByJoinDateBetween(from.atStartOfDay(), to.plusDays(1).atStartOfDay()));
        result.put("activeMembers", membersCard);

        result.put("paymentMethods", groupByMethod(current));

        Map<String, Object> streams = new LinkedHashMap<>();
        for (String stream : List.of("membership", "services", "merchandise", "cafe", "equipment")) {
            List<Entry> ofStream = current.stream().filter(e -> e.stream().equals(stream)).toList();
            Map<String, Object> summary = streamSummary(ofStream);
            summary.put("breakdown", groupByItem(ofStream));
            streams.put(stream, summary);
        }
        result.put("streams", streams);

        result.put("trend", buildTrend(current, expenses, from, to, bucket));
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

    // ── Collection ─────────────────────────────────────────────────────────────

    private List<Entry> collectEntries(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        List<Entry> entries = new ArrayList<>();

        for (Receipt r : receiptRepository.findPaidBetween(start, end)) {
            String type = r.getTransactionType() != null && !r.getTransactionType().isBlank()
                    ? r.getTransactionType() : "Other";
            entries.add(new Entry(r.getTransactionDate(), "membership", receiptLabel(type),
                    splitByMethod(r.getPaidAmount(), r.getPaymentBreakdown(), r.getPaymentMethod())));
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
            BigDecimal saleTotal = nz(t.getTotalAmount());
            if (saleTotal.signum() <= 0) continue;
            Map<String, BigDecimal> saleByMethod = splitByMethod(saleTotal, t.getPaymentBreakdown(), t.getPaymentMethod());
            List<Object[]> lines = linesBySale.getOrDefault(t.getId(), List.of());
            BigDecimal linesTotal = lines.stream().map(l -> nz((BigDecimal) l[3])).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (lines.isEmpty() || linesTotal.signum() <= 0) {
                entries.add(new Entry(t.getCreatedAt(), "merchandise", "Uncategorized", saleByMethod));
                continue;
            }
            for (Object[] line : lines) {
                String category = (String) line[1];
                BigDecimal share = nz((BigDecimal) line[3]).divide(linesTotal, 10, RoundingMode.HALF_UP);
                Map<String, BigDecimal> lineByMethod = new LinkedHashMap<>();
                saleByMethod.forEach((m, amt) -> lineByMethod.put(m, amt.multiply(share).setScale(2, RoundingMode.HALF_UP)));
                entries.add(new Entry(t.getCreatedAt(), posStream(category), category, lineByMethod));
            }
        }

        for (Object[] b : bookingRepository.findPaidBySessionDateBetween(from, to)) {
            String sessionName = (String) b[0];
            String sessionType = (String) b[1];
            LocalDate date = (LocalDate) b[2];
            LocalTime time = b[3] != null ? (LocalTime) b[3] : LocalTime.NOON;
            String name = sessionName != null && !sessionName.isBlank()
                    ? sessionName : ("pt".equalsIgnoreCase(sessionType) ? "Personal Training" : "Class");
            // Bookings don't record how they were paid
            entries.add(new Entry(date.atTime(time), "services", name, Map.of("Other", nz((BigDecimal) b[4]))));
        }
        return entries;
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
        return groupRows(expenses,
                e -> e.getCategory() != null && !e.getCategory().isBlank() ? e.getCategory() : "Uncategorized",
                e -> nz(e.getTotalAmount()));
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
