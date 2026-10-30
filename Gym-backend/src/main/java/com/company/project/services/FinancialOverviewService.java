package com.company.project.services;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.entities.AccountHead;
import com.company.project.entities.Branch;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;
import com.company.project.entities.Receipt;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.SupplierBill;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.BankReconciliationRepository;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.FinancialSettingRepository;
import com.company.project.repositories.JournalVoucherLineRepository;
import com.company.project.repositories.JournalVoucherRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.SaleTransactionRepository;
import com.company.project.repositories.SupplierBillRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.services.pos.PosBusinessDayService;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Financial Analytics page (GET /api/financial-analytics/overview): every figure for a date
 * range next to the same figure for a comparison period.
 *
 * Profit &amp; loss and balances come from POSTED journal vouchers — the same source as the
 * Income Statement and Balance Sheet, so the numbers agree with the reports. Collections by
 * payment method, paying members and receivable ageing come from receipts / POS sales /
 * members, which carry what the journal doesn't (payment method, who owes what since when).
 * Everything is branch-scoped by the Hibernate branch filter (All Branches = whole gym).
 */
@Service
@Transactional(readOnly = true)
public class FinancialOverviewService {

    private static final List<String> REVENUE_RECEIPT_STATUSES = StaffProgressCalculator.REVENUE_RECEIPT_STATUSES;
    private static final Set<String> OPEN_BILL_STATUSES = Set.of("Pending", "Overdue", "Partial");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd MMM");
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMM yyyy");

    private final AccountHeadRepository accountHeadRepository;
    private final JournalVoucherRepository journalVoucherRepository;
    private final JournalVoucherLineRepository journalVoucherLineRepository;
    private final ReceiptRepository receiptRepository;
    private final SaleTransactionRepository saleTransactionRepository;
    private final MemberRepository memberRepository;
    private final SupplierBillRepository supplierBillRepository;
    private final BankReconciliationRepository bankReconciliationRepository;
    private final BranchRepository branchRepository;
    private final PosBusinessDayService businessDayService;
    private final FinancialSettingRepository financialSettingRepository;

    public FinancialOverviewService(AccountHeadRepository accountHeadRepository,
                                    JournalVoucherRepository journalVoucherRepository,
                                    JournalVoucherLineRepository journalVoucherLineRepository,
                                    ReceiptRepository receiptRepository,
                                    SaleTransactionRepository saleTransactionRepository,
                                    MemberRepository memberRepository,
                                    SupplierBillRepository supplierBillRepository,
                                    BankReconciliationRepository bankReconciliationRepository,
                                    BranchRepository branchRepository,
                                    PosBusinessDayService businessDayService,
                                    FinancialSettingRepository financialSettingRepository) {
        this.accountHeadRepository = accountHeadRepository;
        this.journalVoucherRepository = journalVoucherRepository;
        this.journalVoucherLineRepository = journalVoucherLineRepository;
        this.receiptRepository = receiptRepository;
        this.saleTransactionRepository = saleTransactionRepository;
        this.memberRepository = memberRepository;
        this.supplierBillRepository = supplierBillRepository;
        this.bankReconciliationRepository = bankReconciliationRepository;
        this.branchRepository = branchRepository;
        this.businessDayService = businessDayService;
        this.financialSettingRepository = financialSettingRepository;
    }

    // ── Account classification ───────────────────────────────────────────────

    /** What an account code is for these analytics; one entry per code (heads repeat per branch). */
    record Account(String code, String name, String type, BigDecimal opening) {
        boolean revenue() { return "REVENUE".equals(type); }
        boolean expense() { return "EXPENSE".equals(type); }
        String lname() { return name == null ? "" : name.toLowerCase(Locale.ROOT); }
        /** Cash in hand / bank accounts — what "cash flow" moves through. */
        boolean cash() {
            return "ASSET".equals(type) && (code.startsWith("100") || lname().contains("cash") || lname().contains("bank"))
                    && !lname().contains("receivable") && !lname().contains("advance");
        }
        boolean receivable() { return "ASSET".equals(type) && (code.equals("1100") || lname().contains("accounts receivable")); }
        boolean payable() { return "LIABILITY".equals(type) && (code.equals("2000") || lname().contains("accounts payable")); }
        /** Output tax payable and input credit (net = what is owed to the tax authority). */
        boolean tax() {
            return "LIABILITY".equals(type) && (lname().contains("tax") || lname().contains("gst") || lname().contains("vat"));
        }
        boolean deferred() { return "LIABILITY".equals(type) && lname().contains("deferred"); }
    }

    /** One posted journal line with its voucher's date and branch. */
    record Posting(LocalDate date, Long branchId, Long voucherId, Account account, BigDecimal debit, BigDecimal credit) {
        /** Revenue earned (credit-normal) or expense incurred (debit-normal) by this line. */
        BigDecimal pnl() {
            return account.revenue() ? credit.subtract(debit) : debit.subtract(credit);
        }
    }

    record Range(LocalDate from, LocalDate to) {
        boolean contains(LocalDate d) { return d != null && !d.isBefore(from) && !d.isAfter(to); }
        long days() { return ChronoUnit.DAYS.between(from, to) + 1; }
        LocalDateTime start() { return from.atStartOfDay(); }
        LocalDateTime endExclusive() { return to.plusDays(1).atStartOfDay(); }
    }

    // ── Overview ──────────────────────────────────────────────────────────────

    public Map<String, Object> overview(LocalDate from, LocalDate to, String compare) {
        return overview(from, to, compare, null, null);
    }

    /**
     * @param compare      "year" = same dates last year, otherwise the period just before
     * @param compareFrom  explicit comparison range (both or neither) — e.g. month-to-date
     * @param compareTo    against the same days of last month; wins over `compare`
     */
    public Map<String, Object> overview(LocalDate from, LocalDate to, String compare,
                                        LocalDate compareFrom, LocalDate compareTo) {
        LocalDate today = LocalDate.now(businessDayService.zone());
        if (to == null) to = today;
        if (from == null) from = to.withDayOfMonth(1);
        if (from.isAfter(to)) throw new IllegalArgumentException("The start date must be on or before the end date");
        if (ChronoUnit.DAYS.between(from, to) > 3 * 366) throw new IllegalArgumentException("Pick a range of three years or less");

        Range current = new Range(from, to);
        boolean yearOverYear = "year".equalsIgnoreCase(compare);
        Range previous;
        if (compareFrom != null && compareTo != null) {
            if (compareFrom.isAfter(compareTo)) throw new IllegalArgumentException("The comparison start must be on or before its end");
            if (ChronoUnit.DAYS.between(compareFrom, compareTo) > 3 * 366) throw new IllegalArgumentException("Pick a comparison of three years or less");
            previous = new Range(compareFrom, compareTo);
        } else {
            previous = yearOverYear
                    ? new Range(from.minusYears(1), to.minusYears(1))
                    : new Range(from.minusDays(current.days()), from.minusDays(1));
        }

        Map<String, Account> accounts = loadAccounts();
        // Only the vouchers the figures and charts look at (both periods and the 12-month
        // chart). Everything posted before that only feeds the closing balances, which the
        // database totals per account instead of loading years of lines.
        LocalDate windowFrom = java.util.stream.Stream.of(current.from(), previous.from(), to.withDayOfMonth(1).minusMonths(11))
                .min(Comparator.naturalOrder()).orElse(from);
        LocalDate windowTo = previous.to().isAfter(to) ? previous.to() : to;
        Map<String, BigDecimal> netBeforeWindow = new HashMap<>();
        for (Object[] row : journalVoucherLineRepository.sumPostedNetByAccountBefore(windowFrom)) {
            if (row[0] != null) netBeforeWindow.put((String) row[0], row[1] == null ? BigDecimal.ZERO : new BigDecimal(row[1].toString()));
        }
        List<JournalVoucher> vouchers = journalVoucherRepository.findByStatusAndDateBetweenOrderByDateDesc("POSTED", windowFrom, windowTo).stream()
                .filter(v -> v.getDate() != null && v.getDeletedAt() == null)
                .collect(Collectors.toList());
        Map<Long, JournalVoucher> voucherById = vouchers.stream()
                .collect(Collectors.toMap(JournalVoucher::getId, Function.identity(), (a, b) -> a));
        List<Posting> postings = new ArrayList<>();
        if (!voucherById.isEmpty()) {
            for (JournalVoucherLine line : journalVoucherLineRepository.findByJournalVoucherIdIn(voucherById.keySet())) {
                JournalVoucher v = voucherById.get(line.getJournalVoucherId());
                Account a = line.getAccountCode() == null ? null : accounts.get(line.getAccountCode());
                if (v == null || a == null) continue;
                postings.add(new Posting(v.getDate(), v.getBranchId(), v.getId(), a, nz(line.getDebit()), nz(line.getCredit())));
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("period", periodInfo(current, granularity(current)));
        out.put("comparePeriod", Map.of("from", previous.from(), "to", previous.to(),
                "mode", yearOverYear ? "year" : "previous"));

        // P&L for both periods.
        PnL now = pnl(postings, current);
        PnL before = pnl(postings, previous);

        // Cash movement through cash / bank accounts, netted per voucher so transfers between
        // cash and bank don't count as money in and out.
        CashFlow cashNow = cashFlow(postings, current);
        CashFlow cashBefore = cashFlow(postings, previous);

        // Balances as of the end of the range (opening balance + everything posted up to it).
        BigDecimal receivableLedger = balance(postings, accounts, netBeforeWindow, to, Account::receivable, true);
        BigDecimal payableLedger = balance(postings, accounts, netBeforeWindow, to, Account::payable, false);
        BigDecimal taxPayable = balance(postings, accounts, netBeforeWindow, to, Account::tax, false);
        BigDecimal deferredRevenue = balance(postings, accounts, netBeforeWindow, to, Account::deferred, false);
        BigDecimal cashBalance = balance(postings, accounts, netBeforeWindow, to, Account::cash, true);

        // Takings by payment method (membership receipts + POS sales), current and previous.
        Collections takingsNow = collections(current);
        Collections takingsBefore = collections(previous);

        // Member dues and supplier bills (live position, not period-bound).
        Receivables receivables = receivables(today);
        Payables payables = payables(today);

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("revenue", metric(now.revenue, before.revenue));
        kpis.put("expenses", metric(now.expenses, before.expenses));
        kpis.put("netProfit", metric(now.profit(), before.profit()));
        // A margin change against a period with no revenue means nothing — null, not a fake delta.
        Map<String, Object> margin = new LinkedHashMap<>();
        margin.put("current", now.margin());
        margin.put("previous", before.margin());
        margin.put("change", before.revenue.signum() > 0 && now.revenue.signum() > 0 ? round1(now.margin() - before.margin()) : null);
        kpis.put("profitMargin", margin);
        kpis.put("cashIn", metric(cashNow.in, cashBefore.in));
        kpis.put("cashOut", metric(cashNow.out, cashBefore.out));
        kpis.put("netCashFlow", metric(cashNow.in.subtract(cashNow.out), cashBefore.in.subtract(cashBefore.out)));
        kpis.put("cashBalance", cashBalance);
        kpis.put("collections", metric(takingsNow.total(), takingsBefore.total()));
        kpis.put("avgDailyRevenue", metric(
                now.revenue.divide(BigDecimal.valueOf(current.days()), 2, RoundingMode.HALF_UP),
                before.revenue.divide(BigDecimal.valueOf(previous.days()), 2, RoundingMode.HALF_UP)));
        // LinkedHashMap, not Map.of: changePct is null when there's nothing to compare against.
        Map<String, Object> payingMembers = new LinkedHashMap<>();
        payingMembers.put("current", takingsNow.payingMembers.size());
        payingMembers.put("previous", takingsBefore.payingMembers.size());
        payingMembers.put("changePct", pctChange(BigDecimal.valueOf(takingsNow.payingMembers.size()),
                BigDecimal.valueOf(takingsBefore.payingMembers.size())));
        kpis.put("payingMembers", payingMembers);
        kpis.put("avgReceipt", metric(takingsNow.avgReceipt(), takingsBefore.avgReceipt()));
        kpis.put("receivables", Map.of(
                "amount", receivables.memberTotal, "members", receivables.memberCount,
                "overdue", receivables.overdue, "ledger", receivableLedger));
        kpis.put("payables", Map.of(
                "amount", payables.total, "overdue", payables.overdue, "bills", payables.count, "ledger", payableLedger));
        kpis.put("taxPayable", taxPayable);
        kpis.put("deferredRevenue", deferredRevenue);
        long openReconciliations = bankReconciliationRepository.findAll().stream()
                .filter(r -> "OPEN".equals(r.getStatus()) || "IN_PROGRESS".equals(r.getStatus())).count();
        kpis.put("openReconciliations", openReconciliations);
        out.put("kpis", kpis);

        out.put("trend", trend(postings, current, previous));
        out.put("monthly", monthly(postings, to));
        out.put("revenueByAccount", byAccount(now.revenueByCode, before.revenueByCode, accounts));
        out.put("expenseByAccount", byAccount(now.expenseByCode, before.expenseByCode, accounts));
        out.put("collectionsByMethod", takingsNow.byMethodRows(takingsBefore));
        out.put("collectionsBySource", List.of(
                row("Memberships & dues", takingsNow.membership, takingsBefore.membership),
                row("POS sales", takingsNow.pos, takingsBefore.pos)));
        out.put("receivablesAging", receivables.aging);
        out.put("topDebtors", receivables.topDebtors);
        out.put("payablesAging", payables.aging);
        out.put("upcomingPayables", payables.upcoming);
        out.put("branches", branchComparison(postings, current, previous));
        out.put("activity", activity(postings, voucherById, current));
        out.put("insights", insights(now, before, cashNow, receivables, payables, taxPayable,
                openReconciliations, takingsNow, accounts, yearOverYear, currencyCode()));
        return out;
    }

    // ── P&L ───────────────────────────────────────────────────────────────────

    static final class PnL {
        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal expenses = BigDecimal.ZERO;
        Map<String, BigDecimal> revenueByCode = new HashMap<>();
        Map<String, BigDecimal> expenseByCode = new HashMap<>();

        BigDecimal profit() { return revenue.subtract(expenses); }

        double margin() {
            return revenue.signum() > 0 ? round1(profit().doubleValue() * 100.0 / revenue.doubleValue()) : 0.0;
        }
    }

    static PnL pnl(List<Posting> postings, Range range) {
        PnL p = new PnL();
        for (Posting x : postings) {
            if (!range.contains(x.date())) continue;
            if (x.account().revenue()) {
                p.revenue = p.revenue.add(x.pnl());
                p.revenueByCode.merge(x.account().code(), x.pnl(), BigDecimal::add);
            } else if (x.account().expense()) {
                p.expenses = p.expenses.add(x.pnl());
                p.expenseByCode.merge(x.account().code(), x.pnl(), BigDecimal::add);
            }
        }
        return p;
    }

    record CashFlow(BigDecimal in, BigDecimal out) {}

    static CashFlow cashFlow(List<Posting> postings, Range range) {
        Map<Long, BigDecimal> netByVoucher = new HashMap<>();
        for (Posting x : postings) {
            if (!range.contains(x.date()) || !x.account().cash()) continue;
            netByVoucher.merge(x.voucherId(), x.debit().subtract(x.credit()), BigDecimal::add);
        }
        BigDecimal in = BigDecimal.ZERO, out = BigDecimal.ZERO;
        for (BigDecimal net : netByVoucher.values()) {
            if (net.signum() > 0) in = in.add(net);
            else out = out.add(net.negate());
        }
        return new CashFlow(in, out);
    }

    /** Balance at the end of `asOf`: debit-normal (assets) or credit-normal (liabilities). */
    /** netBefore: debit − credit per account code posted before the loaded postings begin. */
    static BigDecimal balance(List<Posting> postings, Map<String, Account> accounts, Map<String, BigDecimal> netBefore,
                              LocalDate asOf, java.util.function.Predicate<Account> which, boolean debitNormal) {
        BigDecimal total = accounts.values().stream().filter(which).map(Account::opening).reduce(BigDecimal.ZERO, BigDecimal::add);
        for (Account a : accounts.values()) {
            BigDecimal net = netBefore.get(a.code());
            if (net != null && which.test(a)) total = total.add(debitNormal ? net : net.negate());
        }
        for (Posting x : postings) {
            if (x.date().isAfter(asOf) || !which.test(x.account())) continue;
            BigDecimal net = x.debit().subtract(x.credit());
            total = total.add(debitNormal ? net : net.negate());
        }
        return total;
    }

    // ── Trends ────────────────────────────────────────────────────────────────

    static String granularity(Range r) {
        long days = r.days();
        if (days <= 45) return "day";
        if (days <= 200) return "week";
        return "month";
    }

    static LocalDate bucketStart(LocalDate d, String granularity) {
        return switch (granularity) {
            case "day" -> d;
            case "week" -> d.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            default -> d.withDayOfMonth(1);
        };
    }

    static LocalDate nextBucket(LocalDate d, String granularity) {
        return switch (granularity) {
            case "day" -> d.plusDays(1);
            case "week" -> d.plusWeeks(1);
            default -> d.plusMonths(1);
        };
    }

    static String bucketLabel(LocalDate d, String granularity) {
        return "month".equals(granularity) ? d.format(MONTH) : d.format(DAY);
    }

    /**
     * The range bucketed by day / week / month, with the comparison period's revenue lined up
     * bucket-for-bucket (bucket i of the comparison = bucket i of this period) so both can share a chart.
     */
    static List<Map<String, Object>> trend(List<Posting> postings, Range current, Range previous) {
        String g = granularity(current);
        List<LocalDate> buckets = new ArrayList<>();
        for (LocalDate d = bucketStart(current.from(), g); !d.isAfter(current.to()); d = nextBucket(d, g)) buckets.add(d);
        List<LocalDate> prevBuckets = new ArrayList<>();
        for (LocalDate d = bucketStart(previous.from(), g); !d.isAfter(previous.to()); d = nextBucket(d, g)) prevBuckets.add(d);

        Map<LocalDate, BigDecimal[]> cur = new HashMap<>();
        Map<LocalDate, BigDecimal> prevRevenue = new HashMap<>();
        Map<LocalDate, Map<Long, BigDecimal>> cashByBucket = new HashMap<>();
        for (Posting x : postings) {
            if (current.contains(x.date())) {
                LocalDate b = bucketStart(x.date(), g);
                BigDecimal[] v = cur.computeIfAbsent(b, k -> zeros(2));
                if (x.account().revenue()) v[0] = v[0].add(x.pnl());
                else if (x.account().expense()) v[1] = v[1].add(x.pnl());
                if (x.account().cash()) {
                    cashByBucket.computeIfAbsent(b, k -> new HashMap<>())
                            .merge(x.voucherId(), x.debit().subtract(x.credit()), BigDecimal::add);
                }
            } else if (previous.contains(x.date()) && x.account().revenue()) {
                prevRevenue.merge(bucketStart(x.date(), g), x.pnl(), BigDecimal::add);
            }
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < buckets.size(); i++) {
            LocalDate b = buckets.get(i);
            BigDecimal[] v = cur.getOrDefault(b, zeros(2));
            BigDecimal in = BigDecimal.ZERO, out = BigDecimal.ZERO;
            for (BigDecimal net : cashByBucket.getOrDefault(b, Map.of()).values()) {
                if (net.signum() > 0) in = in.add(net); else out = out.add(net.negate());
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("start", b);
            row.put("label", bucketLabel(b, g));
            row.put("revenue", v[0]);
            row.put("expenses", v[1]);
            row.put("profit", v[0].subtract(v[1]));
            row.put("cashIn", in);
            row.put("cashOut", out);
            row.put("previousRevenue", i < prevBuckets.size() ? prevRevenue.getOrDefault(prevBuckets.get(i), BigDecimal.ZERO) : null);
            rows.add(row);
        }
        return rows;
    }

    /** The 12 calendar months ending with the range's last month, with margin. */
    static List<Map<String, Object>> monthly(List<Posting> postings, LocalDate to) {
        LocalDate first = to.withDayOfMonth(1).minusMonths(11);
        Map<LocalDate, BigDecimal[]> byMonth = new LinkedHashMap<>();
        for (int i = 0; i < 12; i++) byMonth.put(first.plusMonths(i), zeros(2));
        for (Posting x : postings) {
            BigDecimal[] v = byMonth.get(x.date().withDayOfMonth(1));
            if (v == null) continue;
            if (x.account().revenue()) v[0] = v[0].add(x.pnl());
            else if (x.account().expense()) v[1] = v[1].add(x.pnl());
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        byMonth.forEach((m, v) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", m);
            row.put("label", m.format(MONTH));
            row.put("revenue", v[0]);
            row.put("expenses", v[1]);
            row.put("profit", v[0].subtract(v[1]));
            row.put("margin", v[0].signum() > 0 ? round1(v[0].subtract(v[1]).doubleValue() * 100.0 / v[0].doubleValue()) : null);
            rows.add(row);
        });
        return rows;
    }

    static List<Map<String, Object>> byAccount(Map<String, BigDecimal> now, Map<String, BigDecimal> before,
                                              Map<String, Account> accounts) {
        BigDecimal total = now.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        Set<String> codes = new TreeSet<>(now.keySet());
        codes.addAll(before.keySet());
        return codes.stream()
                .map(code -> {
                    BigDecimal cur = now.getOrDefault(code, BigDecimal.ZERO);
                    BigDecimal prev = before.getOrDefault(code, BigDecimal.ZERO);
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("code", code);
                    row.put("name", accounts.containsKey(code) ? accounts.get(code).name() : code);
                    row.put("current", cur);
                    row.put("previous", prev);
                    row.put("changePct", pctChange(cur, prev));
                    row.put("share", total.signum() > 0 ? round1(cur.doubleValue() * 100.0 / total.doubleValue()) : 0.0);
                    return row;
                })
                .filter(r -> ((BigDecimal) r.get("current")).signum() != 0 || ((BigDecimal) r.get("previous")).signum() != 0)
                .sorted(Comparator.comparing((Map<String, Object> r) -> (BigDecimal) r.get("current")).reversed())
                .collect(Collectors.toList());
    }

    // ── Collections (receipts + POS) ──────────────────────────────────────────

    static final class Collections {
        BigDecimal membership = BigDecimal.ZERO;
        BigDecimal pos = BigDecimal.ZERO;
        long receiptCount;
        Set<Long> payingMembers = new HashSet<>();
        Map<String, BigDecimal> byMethod = new HashMap<>();
        Map<String, Long> countByMethod = new HashMap<>();

        BigDecimal total() { return membership.add(pos); }

        BigDecimal avgReceipt() {
            return receiptCount > 0 ? membership.divide(BigDecimal.valueOf(receiptCount), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        }

        void add(String method, BigDecimal amount) {
            if (amount == null || amount.signum() <= 0) return;
            String m = normalizeMethod(method);
            byMethod.merge(m, amount, BigDecimal::add);
            countByMethod.merge(m, 1L, Long::sum);
        }

        List<Map<String, Object>> byMethodRows(Collections before) {
            BigDecimal total = byMethod.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            return byMethod.entrySet().stream()
                    .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                    .map(e -> {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("method", e.getKey());
                        row.put("amount", e.getValue());
                        row.put("count", countByMethod.getOrDefault(e.getKey(), 0L));
                        row.put("share", total.signum() > 0 ? round1(e.getValue().doubleValue() * 100.0 / total.doubleValue()) : 0.0);
                        row.put("previous", before.byMethod.getOrDefault(e.getKey(), BigDecimal.ZERO));
                        return row;
                    })
                    .collect(Collectors.toList());
        }
    }

    Collections collections(Range range) {
        Collections c = new Collections();
        Specification<Receipt> receiptSpec = (root, q, cb) -> cb.and(
                root.get("status").in(REVENUE_RECEIPT_STATUSES),
                cb.greaterThanOrEqualTo(root.get("transactionDate"), range.start()),
                cb.lessThan(root.get("transactionDate"), range.endExclusive()));
        for (Receipt r : receiptRepository.findAll(receiptSpec)) {
            BigDecimal received = StaffProgressCalculator.receivedAmount(r);
            if (received.signum() <= 0) continue;
            BigDecimal collected = addSplits(c, r.getPaymentBreakdown(), r.getPaymentMethod(), received);
            if (collected.signum() <= 0) continue;
            c.membership = c.membership.add(collected);
            c.receiptCount++;
            if (r.getMemberDbId() != null) c.payingMembers.add(r.getMemberDbId());
        }
        Specification<SaleTransaction> saleSpec = (root, q, cb) -> cb.and(
                cb.equal(root.get("status"), "COMPLETED"),
                cb.greaterThanOrEqualTo(root.get("createdAt"), range.start()),
                cb.lessThan(root.get("createdAt"), range.endExclusive()));
        for (SaleTransaction s : saleTransactionRepository.findAll(saleSpec)) {
            BigDecimal amount = nz(s.getTotalAmount());
            if (amount.signum() <= 0) continue;
            c.pos = c.pos.add(addSplits(c, s.getPaymentBreakdown(), s.getPaymentMethod(), amount));
        }
        return c;
    }

    /**
     * Books a payment under its method(s) and returns what was actually collected: a split
     * payment counts under each of its methods, and anything sold "on credit" is left out —
     * it is owed, not received (it shows up in member dues instead).
     */
    static BigDecimal addSplits(Collections c, List<PaymentSplitDTO> splits, String method, BigDecimal total) {
        if (splits != null) {
            List<PaymentSplitDTO> real = splits.stream()
                    .filter(s -> s != null && s.getAmount() != null && s.getAmount().signum() > 0)
                    .filter(s -> !ON_CREDIT.equals(normalizeMethod(s.getMethod())))
                    .collect(Collectors.toList());
            BigDecimal sum = real.stream().map(PaymentSplitDTO::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (sum.signum() > 0) {
                // Never more than was actually received (a part-paid bill's breakdown can describe the full price).
                BigDecimal factor = total.compareTo(sum) >= 0 ? BigDecimal.ONE : total.divide(sum, 6, RoundingMode.HALF_UP);
                BigDecimal collected = BigDecimal.ZERO;
                for (PaymentSplitDTO s : real) {
                    BigDecimal part = s.getAmount().multiply(factor).setScale(2, RoundingMode.HALF_UP);
                    c.add(s.getMethod(), part);
                    collected = collected.add(part);
                }
                return collected;
            }
            if (!splits.isEmpty()) return BigDecimal.ZERO; // every split was on credit
        }
        if (ON_CREDIT.equals(normalizeMethod(method))) return BigDecimal.ZERO;
        c.add(method, total);
        return total;
    }

    static final String ON_CREDIT = "On credit";

    static String normalizeMethod(String method) {
        if (method == null || method.isBlank()) return "Other";
        String m = method.trim().toLowerCase(Locale.ROOT);
        if (m.contains("+") || m.contains("mixed") || m.contains("split")) return "Split payment";
        if (m.contains("cash")) return "Cash";
        if (m.contains("card") || m.contains("visa") || m.contains("master") || m.contains("debit") || m.contains("credit card")) return "Card";
        if (m.contains("upi") || m.contains("online") || m.contains("gpay") || m.contains("google pay")
                || m.contains("phonepe") || m.contains("paytm") || m.contains("apple pay")) return "Online / UPI";
        if (m.contains("bank") || m.contains("transfer") || m.contains("neft") || m.contains("imps") || m.contains("rtgs")) return "Bank transfer";
        if (m.contains("cheque") || m.contains("check")) return "Cheque";
        if (m.contains("wallet")) return "Wallet";
        if (m.contains("credit")) return "On credit";
        return Character.toUpperCase(m.charAt(0)) + m.substring(1);
    }

    // ── Receivables & payables ────────────────────────────────────────────────

    static final class Receivables {
        BigDecimal memberTotal = BigDecimal.ZERO;
        long memberCount;
        BigDecimal overdue = BigDecimal.ZERO;
        List<Map<String, Object>> aging = new ArrayList<>();
        List<Map<String, Object>> topDebtors = new ArrayList<>();
    }

    private static final String[][] AGING_BUCKETS = {
            {"current", "Not yet due"}, {"1-30", "1–30 days"}, {"31-60", "31–60 days"},
            {"61-90", "61–90 days"}, {"90+", "Over 90 days"}};

    static String agingBucket(long daysOverdue) {
        if (daysOverdue <= 0) return "current";
        if (daysOverdue <= 30) return "1-30";
        if (daysOverdue <= 60) return "31-60";
        if (daysOverdue <= 90) return "61-90";
        return "90+";
    }

    static List<Map<String, Object>> agingRows(Map<String, BigDecimal> amounts, Map<String, Long> counts) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String[] b : AGING_BUCKETS) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("bucket", b[0]);
            row.put("label", b[1]);
            row.put("amount", amounts.getOrDefault(b[0], BigDecimal.ZERO));
            row.put("count", counts.getOrDefault(b[0], 0L));
            rows.add(row);
        }
        return rows;
    }

    Receivables receivables(LocalDate today) {
        Receivables r = new Receivables();
        r.memberTotal = nz(memberRepository.sumOutstandingBalance());
        r.memberCount = memberRepository.countWithOutstandingBalance();

        // Ageing from the open bills behind those balances (same definition as the member's own
        // "pay balance" screen): open, not an instalment receipt, amount still unpaid.
        Specification<Receipt> openSpec = (root, q, cb) -> root.get("status").in(OPEN_BILL_STATUSES);
        Map<String, BigDecimal> amounts = new HashMap<>();
        Map<String, Long> counts = new HashMap<>();
        Map<String, Object[]> byMember = new HashMap<>(); // key -> [name, amount, oldestDue, memberDbId]
        for (Receipt bill : receiptRepository.findAll(openSpec)) {
            if ("Payment".equals(bill.getTransactionType())) continue;
            BigDecimal paid = bill.getTotalPaidToDate() != null ? bill.getTotalPaidToDate() : nz(bill.getPaidAmount());
            BigDecimal due = nz(bill.getAmount()).subtract(paid);
            if (due.signum() <= 0) continue;
            LocalDate dueDate = bill.getDueDate() != null ? bill.getDueDate().toLocalDate()
                    : bill.getTransactionDate() != null ? bill.getTransactionDate().toLocalDate() : today;
            long overdueDays = ChronoUnit.DAYS.between(dueDate, today);
            String bucket = agingBucket(overdueDays);
            amounts.merge(bucket, due, BigDecimal::add);
            counts.merge(bucket, 1L, Long::sum);
            if (overdueDays > 0) r.overdue = r.overdue.add(due);
            String key = bill.getMemberDbId() != null ? "m" + bill.getMemberDbId() : "n" + bill.getMemberName();
            Object[] d = byMember.computeIfAbsent(key, k -> new Object[]{bill.getMemberName(), BigDecimal.ZERO, dueDate, bill.getMemberDbId()});
            d[1] = ((BigDecimal) d[1]).add(due);
            if (dueDate.isBefore((LocalDate) d[2])) d[2] = dueDate;
        }
        r.aging = agingRows(amounts, counts);
        r.topDebtors = byMember.values().stream()
                .sorted(Comparator.comparing((Object[] d) -> (BigDecimal) d[1]).reversed())
                .limit(8)
                .map(d -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("name", d[0] != null ? d[0] : "Unknown member");
                    row.put("memberId", d[3]);
                    row.put("amount", d[1]);
                    row.put("oldestDue", d[2]);
                    row.put("daysOverdue", Math.max(0, ChronoUnit.DAYS.between((LocalDate) d[2], today)));
                    return row;
                })
                .collect(Collectors.toList());
        return r;
    }

    static final class Payables {
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal overdue = BigDecimal.ZERO;
        long count;
        List<Map<String, Object>> aging = new ArrayList<>();
        List<Map<String, Object>> upcoming = new ArrayList<>();
    }

    Payables payables(LocalDate today) {
        Payables p = new Payables();
        Map<String, BigDecimal> amounts = new HashMap<>();
        Map<String, Long> counts = new HashMap<>();
        List<Map<String, Object>> open = new ArrayList<>();
        for (SupplierBill b : supplierBillRepository.findAll()) {
            if ("CANCELLED".equals(b.getStatus()) || "PAID".equals(b.getPaymentStatus())) continue;
            BigDecimal due = nz(b.getTotalAmount()).subtract(nz(b.getAmountPaid()));
            if (due.signum() <= 0) continue;
            LocalDate dueDate = b.getDueDate() != null ? b.getDueDate() : b.getBillDate() != null ? b.getBillDate() : today;
            long overdueDays = ChronoUnit.DAYS.between(dueDate, today);
            String bucket = agingBucket(overdueDays);
            amounts.merge(bucket, due, BigDecimal::add);
            counts.merge(bucket, 1L, Long::sum);
            p.total = p.total.add(due);
            p.count++;
            if (overdueDays > 0) p.overdue = p.overdue.add(due);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("vendor", b.getSupplierName());
            row.put("bill", b.getBillNumber());
            row.put("amount", due);
            row.put("dueDate", dueDate);
            row.put("daysOverdue", Math.max(0, overdueDays));
            open.add(row);
        }
        p.aging = agingRows(amounts, counts);
        p.upcoming = open.stream()
                .sorted(Comparator.comparing(r -> (LocalDate) r.get("dueDate")))
                .limit(8)
                .collect(Collectors.toList());
        return p;
    }

    // ── Branches, activity ────────────────────────────────────────────────────

    /** Per-branch P&L, only in All Branches mode (a branch user sees just their own branch). */
    List<Map<String, Object>> branchComparison(List<Posting> postings, Range current, Range previous) {
        if (BranchContextHolder.getActiveBranchId() != null) return List.of();
        Map<Long, BigDecimal[]> byBranch = new HashMap<>(); // revenue, expenses, previous revenue
        for (Posting x : postings) {
            if (x.branchId() == null || !(x.account().revenue() || x.account().expense())) continue;
            boolean inCurrent = current.contains(x.date());
            boolean inPrevious = previous.contains(x.date());
            if (!inCurrent && !inPrevious) continue;
            BigDecimal[] v = byBranch.computeIfAbsent(x.branchId(), k -> zeros(3));
            if (inCurrent && x.account().revenue()) v[0] = v[0].add(x.pnl());
            if (inCurrent && x.account().expense()) v[1] = v[1].add(x.pnl());
            if (inPrevious && x.account().revenue()) v[2] = v[2].add(x.pnl());
        }
        if (byBranch.size() < 2) return List.of();
        Map<Long, String> names = branchRepository.findByIdIn(new ArrayList<>(byBranch.keySet())).stream()
                .collect(Collectors.toMap(Branch::getId, Branch::getBranchName, (a, b) -> a));
        BigDecimal totalRevenue = byBranch.values().stream().map(v -> v[0]).reduce(BigDecimal.ZERO, BigDecimal::add);
        return byBranch.entrySet().stream()
                .map(e -> {
                    BigDecimal[] v = e.getValue();
                    BigDecimal profit = v[0].subtract(v[1]);
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("branchId", e.getKey());
                    row.put("name", names.getOrDefault(e.getKey(), "Branch " + e.getKey()));
                    row.put("revenue", v[0]);
                    row.put("expenses", v[1]);
                    row.put("profit", profit);
                    row.put("margin", v[0].signum() > 0 ? round1(profit.doubleValue() * 100.0 / v[0].doubleValue()) : null);
                    row.put("revenueShare", totalRevenue.signum() > 0 ? round1(v[0].doubleValue() * 100.0 / totalRevenue.doubleValue()) : 0.0);
                    row.put("revenueChangePct", pctChange(v[0], v[2]));
                    return row;
                })
                .sorted(Comparator.comparing((Map<String, Object> r) -> (BigDecimal) r.get("revenue")).reversed())
                .collect(Collectors.toList());
    }

    /** Vouchers in the range that touched income or expense accounts, newest first. */
    static List<Map<String, Object>> activity(List<Posting> postings, Map<Long, JournalVoucher> vouchers, Range range) {
        Map<Long, BigDecimal[]> byVoucher = new LinkedHashMap<>(); // revenue, expense
        Map<Long, Set<String>> accountsByVoucher = new HashMap<>();
        for (Posting x : postings) {
            if (!range.contains(x.date()) || !(x.account().revenue() || x.account().expense())) continue;
            BigDecimal[] v = byVoucher.computeIfAbsent(x.voucherId(), k -> zeros(2));
            if (x.account().revenue()) v[0] = v[0].add(x.pnl()); else v[1] = v[1].add(x.pnl());
            accountsByVoucher.computeIfAbsent(x.voucherId(), k -> new LinkedHashSet<>()).add(x.account().name());
        }
        return byVoucher.entrySet().stream()
                .map(e -> {
                    JournalVoucher jv = vouchers.get(e.getKey());
                    BigDecimal[] v = e.getValue();
                    boolean income = v[0].abs().compareTo(v[1].abs()) >= 0;
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", jv.getId());
                    row.put("date", jv.getDate());
                    row.put("voucherNo", jv.getVoucherNo());
                    row.put("narration", jv.getNarration());
                    row.put("reference", jv.getReference());
                    row.put("kind", income ? (v[0].signum() >= 0 ? "income" : "income_reversal")
                            : (v[1].signum() >= 0 ? "expense" : "expense_reversal"));
                    row.put("amount", income ? v[0] : v[1]);
                    row.put("accounts", String.join(", ", accountsByVoucher.getOrDefault(e.getKey(), Set.of())));
                    return row;
                })
                .sorted(Comparator.comparing((Map<String, Object> r) -> (LocalDate) r.get("date")).reversed()
                        .thenComparing(r -> (Long) r.get("id"), Comparator.reverseOrder()))
                .limit(200)
                .collect(Collectors.toList());
    }

    // ── Insights (rule-based, computed from the figures above) ────────────────

    List<Map<String, Object>> insights(PnL now, PnL before, CashFlow cash, Receivables receivables, Payables payables,
                                       BigDecimal taxPayable, long openReconciliations, Collections takings,
                                       Map<String, Account> accounts, boolean yearOverYear, String cur) {
        List<Map<String, Object>> list = new ArrayList<>();
        String vs = yearOverYear ? "the same period last year" : "the previous period";

        // No early return: the P&L rules below stay quiet on an empty period, while the
        // position-based ones (dues, supplier bills, tax) still matter.
        if (now.revenue.signum() == 0 && now.expenses.signum() == 0) {
            list.add(insight("info", 6, "No posted income or expenses in this period",
                    "Nothing has been posted to the books for these dates yet. Try a wider range."));
        }
        if (now.profit().signum() < 0) {
            list.add(insight("critical", 1, "Spending is higher than income",
                    "Expenses exceeded revenue by " + money(cur, now.profit().negate()) + " in this period."));
        } else if (now.revenue.signum() > 0) {
            String tone = now.margin() >= 20 ? "positive" : "info";
            list.add(insight(tone, 3, "Profit margin " + now.margin() + "%",
                    "You kept " + money(cur, now.profit()) + " of every " + money(cur, now.revenue) + " earned"
                            + (before.revenue.signum() > 0 ? " (" + signed(round1(now.margin() - before.margin())) + " pts vs " + vs + ")." : ".")));
        }
        Double revChange = pctChange(now.revenue, before.revenue);
        if (revChange != null && Math.abs(revChange) >= 5) {
            list.add(insight(revChange > 0 ? "positive" : "warning", revChange > 0 ? 3 : 2,
                    "Revenue " + (revChange > 0 ? "up " : "down ") + Math.abs(revChange) + "%",
                    money(cur, now.revenue) + " this period vs " + money(cur, before.revenue) + " in " + vs + "."));
        }
        Double expChange = pctChange(now.expenses, before.expenses);
        if (expChange != null && expChange >= 15 && now.expenses.signum() > 0) {
            // The account behind most of the increase.
            String driver = now.expenseByCode.entrySet().stream()
                    .max(Comparator.comparing(e -> e.getValue().subtract(before.expenseByCode.getOrDefault(e.getKey(), BigDecimal.ZERO))))
                    .map(e -> accounts.containsKey(e.getKey()) ? accounts.get(e.getKey()).name() : e.getKey())
                    .orElse(null);
            list.add(insight("warning", 2, "Expenses up " + expChange + "%",
                    money(cur, now.expenses) + " vs " + money(cur, before.expenses) + " in " + vs
                            + (driver != null ? "; the biggest increase is in " + driver + "." : ".")));
        }
        now.expenseByCode.entrySet().stream().max(Map.Entry.comparingByValue()).ifPresent(top -> {
            double share = now.expenses.signum() > 0 ? round1(top.getValue().doubleValue() * 100.0 / now.expenses.doubleValue()) : 0;
            if (share >= 40) {
                String name = accounts.containsKey(top.getKey()) ? accounts.get(top.getKey()).name() : top.getKey();
                list.add(insight("info", 4, name + " is " + share + "% of expenses",
                        money(cur, top.getValue()) + " of " + money(cur, now.expenses) + " spent this period went to " + name + "."));
            }
        });
        now.revenueByCode.entrySet().stream().max(Map.Entry.comparingByValue()).ifPresent(top -> {
            double share = now.revenue.signum() > 0 ? round1(top.getValue().doubleValue() * 100.0 / now.revenue.doubleValue()) : 0;
            String name = accounts.containsKey(top.getKey()) ? accounts.get(top.getKey()).name() : top.getKey();
            if (share >= 70 && now.revenueByCode.size() > 1) {
                list.add(insight("info", 4, name + " brings " + share + "% of revenue",
                        "Most income depends on this one stream; growing the others spreads the risk."));
            }
        });
        if (cash.in().subtract(cash.out()).signum() < 0) {
            list.add(insight("warning", 2, "More cash went out than came in",
                    "Net cash flow was " + money(cur, cash.in().subtract(cash.out())) + " (in " + money(cur, cash.in())
                            + ", out " + money(cur, cash.out()) + ")."));
        }
        if (receivables.memberTotal.signum() > 0) {
            boolean overdue = receivables.overdue.signum() > 0;
            list.add(insight(overdue ? "warning" : "info", overdue ? 2 : 4,
                    receivables.memberCount + (receivables.memberCount == 1 ? " member owes " : " members owe ") + money(cur, receivables.memberTotal),
                    overdue ? money(cur, receivables.overdue) + " of it is past its due date — follow up from Billing."
                            : "None of it is overdue yet."));
        }
        if (payables.overdue.signum() > 0) {
            list.add(insight("critical", 1, money(cur, payables.overdue) + " of supplier bills overdue",
                    payables.count + " unpaid " + (payables.count == 1 ? "bill" : "bills") + " totalling " + money(cur, payables.total) + "."));
        }
        if (taxPayable.signum() > 0) {
            list.add(insight("info", 5, "Keep " + money(cur, taxPayable) + " aside for tax",
                    "Net tax / GST collected and not yet paid, as of the end of this period."));
        }
        if (openReconciliations > 0) {
            list.add(insight("info", 5, openReconciliations + " bank reconciliation" + (openReconciliations == 1 ? "" : "s") + " open",
                    "Finish them so the cash and bank balances here can be trusted."));
        }
        if (!takings.payingMembers.isEmpty() && takings.receiptCount > 0) {
            list.add(insight("info", 6, takings.payingMembers.size() + " members paid this period",
                    "Average membership payment " + money(cur, takings.avgReceipt()) + " across " + takings.receiptCount + " receipts."));
        }
        list.sort(Comparator.comparingInt(m -> (Integer) m.get("rank")));
        return list.stream().limit(8).collect(Collectors.toList());
    }

    private static Map<String, Object> insight(String type, int rank, String title, String detail) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", type);
        m.put("rank", rank);
        m.put("title", title);
        m.put("detail", detail);
        return m;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<String, Account> loadAccounts() {
        Map<String, Account> map = new LinkedHashMap<>();
        for (AccountHead a : accountHeadRepository.findAllByOrderByCodeAsc()) {
            if (a.getCode() == null) continue;
            String type = a.getType() == null ? "" : a.getType().toUpperCase(Locale.ROOT);
            Account existing = map.get(a.getCode());
            BigDecimal opening = nz(a.getOpeningBalance());
            // Heads repeat per branch with the same code: one entry, openings summed.
            map.put(a.getCode(), existing == null
                    ? new Account(a.getCode(), a.getName(), type, opening)
                    : new Account(a.getCode(), existing.name(), existing.type(), existing.opening().add(opening)));
        }
        return map;
    }

    private static Map<String, Object> periodInfo(Range r, String granularity) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("from", r.from());
        m.put("to", r.to());
        m.put("days", r.days());
        m.put("granularity", granularity);
        return m;
    }

    private static Map<String, Object> metric(BigDecimal current, BigDecimal previous) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("current", current);
        m.put("previous", previous);
        m.put("changePct", pctChange(current, previous));
        return m;
    }

    private static Map<String, Object> row(String label, BigDecimal current, BigDecimal previous) {
        Map<String, Object> m = metric(current, previous);
        m.put("label", label);
        return m;
    }

    /** % change, or null when there's nothing to compare against. */
    static Double pctChange(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.signum() == 0) return null;
        return round1(current.subtract(previous).doubleValue() * 100.0 / previous.abs().doubleValue());
    }

    private static BigDecimal[] zeros(int n) {
        BigDecimal[] a = new BigDecimal[n];
        Arrays.fill(a, BigDecimal.ZERO);
        return a;
    }

    private static String money(String cur, BigDecimal v) {
        String amount = String.format(Locale.ROOT, "%,.0f", v.setScale(0, RoundingMode.HALF_UP));
        return cur == null || cur.isBlank() ? amount : cur + " " + amount;
    }

    /** The display currency the web app uses (Settings → currency), else AED like the app default. */
    private String currencyCode() {
        return financialSettingRepository.findByCategoryOrderBySettingKeyAsc("APP_PREFERENCES").stream()
                .filter(f -> "currency_code".equals(f.getSettingKey()) && f.getSettingValue() != null && !f.getSettingValue().isBlank())
                .map(f -> f.getSettingValue().trim())
                .findFirst().orElse("AED");
    }

    private static String signed(double v) {
        return (v > 0 ? "+" : "") + v;
    }

    static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
