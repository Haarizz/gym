package com.company.project.services.pos;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.pos.PosResponses.*;
import com.company.project.entities.*;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

import static com.company.project.services.pos.PosSupport.nz;
import static com.company.project.services.pos.PosSupport.r2;

/**
 * X-report (one session), Z-report (one business day across every session of the
 * branch) and sales analytics (a date range), built from the same aggregation so
 * all three always agree. Tender figures come from each sale's ledger legs, so
 * cash is the cash actually kept (net of change) and credit is what went on account.
 */
@Service
@Transactional(readOnly = true)
public class PosReportService {

    public static final String CASH = "Cash";
    public static final String CARD = "Card";
    public static final String ONLINE = "Online";
    public static final String CREDIT = "Credit";
    public static final String WALLET = "Wallet";
    public static final String OTHER = "Other";
    private static final List<String> TENDER_ORDER = List.of(CASH, CARD, ONLINE, WALLET, CREDIT, OTHER);

    private final PosSessionRepository sessionRepo;
    private final SaleTransactionRepository saleRepo;
    private final SaleTransactionItemRepository itemRepo;
    private final PosSaleReturnRepository returnRepo;
    private final PosSaleReturnItemRepository returnItemRepo;
    private final PosCreditPaymentRepository creditPaymentRepo;
    private final CashMovementRepository movementRepo;
    private final PosDayCloseRepository dayCloseRepo;
    private final PosHeldSaleRepository heldRepo;
    private final PosMapper mapper;
    private final PosSupport support;

    public PosReportService(PosSessionRepository sessionRepo, SaleTransactionRepository saleRepo,
                            SaleTransactionItemRepository itemRepo, PosSaleReturnRepository returnRepo,
                            PosSaleReturnItemRepository returnItemRepo, PosCreditPaymentRepository creditPaymentRepo,
                            CashMovementRepository movementRepo, PosDayCloseRepository dayCloseRepo,
                            PosHeldSaleRepository heldRepo, PosMapper mapper, PosSupport support) {
        this.sessionRepo = sessionRepo;
        this.saleRepo = saleRepo;
        this.itemRepo = itemRepo;
        this.returnRepo = returnRepo;
        this.returnItemRepo = returnItemRepo;
        this.creditPaymentRepo = creditPaymentRepo;
        this.movementRepo = movementRepo;
        this.dayCloseRepo = dayCloseRepo;
        this.heldRepo = heldRepo;
        this.mapper = mapper;
        this.support = support;
    }

    // ── X-report ────────────────────────────────────────────────────────────

    public XReport xReport(Long sessionId) {
        PosSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("POS session not found with id: " + sessionId));
        Data d = new Data();
        d.sessions = List.of(session);
        d.sales = new ArrayList<>(saleRepo.findByPosSessionIdOrderByCreatedAtDesc(sessionId));
        d.sales.sort(Comparator.comparing(SaleTransaction::getId));
        d.returns = returnRepo.findByPosSessionIdOrderByCreatedAtDesc(sessionId);
        d.creditPayments = creditPaymentRepo.findByPosSessionIdOrderByCreatedAtDesc(sessionId);
        d.movements = movementRepo.findByPosSessionIdInOrderByCreatedAtAsc(List.of(sessionId));
        load(d);
        ReportSummary summary = summarize(d);
        return new XReport(mapper.session(session), summary, topItems(d, 15), categories(d), hourly(d.sales),
                cashEvents(d), invoices(d.sales), returnDtos(d), LocalDateTime.now(), support.currentDisplayName());
    }

    /** Cash the drawer of this session should hold right now. */
    public BigDecimal expectedCash(Long sessionId) {
        return xReport(sessionId).summary().cash().expectedCash();
    }

    // ── Z-report ────────────────────────────────────────────────────────────

    public ZReport zReport(LocalDate date) {
        LocalDate day = date != null ? date : support.today();
        Data d = new Data();
        d.sessions = sessionRepo.findByBusinessDateOrderByOpenedAtAsc(day);
        d.sales = saleRepo.findByBusinessDateOrderByCreatedAtAsc(day);
        d.returns = returnRepo.findByBusinessDateOrderByCreatedAtDesc(day);
        d.creditPayments = creditPaymentRepo.findByBusinessDateOrderByCreatedAtDesc(day);
        d.movements = d.sessions.isEmpty() ? List.of()
                : movementRepo.findByPosSessionIdInOrderByCreatedAtAsc(d.sessions.stream().map(PosSession::getId).toList());
        load(d);
        ReportSummary summary = summarize(d);
        List<SessionDTO> sessions = mapper.sessions(d.sessions);
        PosDayClose close = dayCloseRepo.findFirstByBusinessDate(day).orElse(null);

        // OPEN and SUSPENDED both still hold a drawer that has to be counted out.
        long open = d.sessions.stream().filter(s -> !"CLOSED".equals(s.getStatus())).count();
        int held = (int) heldRepo.count();
        BigDecimal varianceTotal = d.sessions.stream().map(PosSession::getCashVariance).map(PosSupport::nz)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<ChecklistItem> checklist = new ArrayList<>();
        checklist.add(new ChecklistItem("SESSIONS_CLOSED", "All sessions closed", open == 0,
                open == 0 ? d.sessions.size() + " session(s) closed" : open + " session(s) still open"));
        // Once the day is closed that's the finished state, not a failed check — show it
        // as done rather than a red "Day not already closed" next to the Closed badge.
        checklist.add(close == null
                ? new ChecklistItem("NOT_ALREADY_CLOSED", "Day not yet closed", true, "Ready to close")
                : new ChecklistItem("DAY_CLOSED", "Day closed", true,
                        "Closed by " + close.getClosedBy() + " (" + close.getCloseNumber() + ")"));
        checklist.add(new ChecklistItem("HELD_SALES", "No parked sales", held == 0,
                held == 0 ? "No held carts" : held + " held cart(s) will stay parked (warning only)"));
        checklist.add(new ChecklistItem("CASH_VARIANCE", "Cash variance reviewed", varianceTotal.signum() == 0,
                "Total variance " + r2(varianceTotal)));
        boolean canClose = open == 0 && close == null && !day.isAfter(support.today());

        return new ZReport(day, summary, sessions, cashiers(d), topItems(d, 20), categories(d), hourly(d.sales),
                cashEvents(d), invoices(d.sales), checklist, canClose, mapper.dayClose(close), held,
                LocalDateTime.now(), support.currentDisplayName());
    }

    // ── Analytics ───────────────────────────────────────────────────────────

    public Analytics analytics(LocalDate from, LocalDate to) {
        LocalDate end = to != null ? to : support.today();
        LocalDate start = from != null ? from : end.minusDays(29);
        if (start.isAfter(end)) throw new BusinessRuleViolationException("The start date is after the end date.");
        if (start.plusDays(366).isBefore(end)) throw new BusinessRuleViolationException("Analytics is limited to a one-year range.");
        Data d = new Data();
        d.sessions = List.of();
        d.sales = saleRepo.findByBusinessDateBetweenOrderByCreatedAtAsc(start, end);
        d.returns = returnRepo.findByBusinessDateBetweenOrderByCreatedAtDesc(start, end);
        d.creditPayments = List.of();
        d.movements = List.of();
        load(d);

        Map<LocalDate, int[]> counts = new TreeMap<>();
        Map<LocalDate, BigDecimal> amounts = new TreeMap<>();
        Map<LocalDate, BigDecimal> returns = new TreeMap<>();
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            counts.put(day, new int[]{0});
            amounts.put(day, BigDecimal.ZERO);
            returns.put(day, BigDecimal.ZERO);
        }
        for (SaleTransaction t : d.sales) {
            LocalDate day = businessDate(t);
            if (!counts.containsKey(day)) continue;
            counts.get(day)[0]++;
            amounts.merge(day, nz(t.getTotalAmount()), BigDecimal::add);
        }
        for (PosSaleReturn r : d.returns) {
            if (r.getBusinessDate() != null && returns.containsKey(r.getBusinessDate())) {
                returns.merge(r.getBusinessDate(), nz(r.getTotalAmount()), BigDecimal::add);
            }
        }
        List<DayLine> daily = counts.keySet().stream()
                .map(day -> new DayLine(day, counts.get(day)[0], r2(amounts.get(day)), r2(returns.get(day))))
                .toList();
        return new Analytics(start, end, summarize(d), daily, hourly(d.sales), topItems(d, 15), categories(d), cashiers(d));
    }

    // ── Aggregation ─────────────────────────────────────────────────────────

    private static final class Data {
        List<PosSession> sessions;
        List<SaleTransaction> sales;
        List<PosSaleReturn> returns;
        List<PosCreditPayment> creditPayments;
        List<CashMovement> movements;
        List<SaleTransactionItem> items = List.of();
        Map<Long, List<PosSaleReturnItem>> returnItems = Map.of();
    }

    private void load(Data d) {
        if (!d.sales.isEmpty()) d.items = itemRepo.findByTransactionIdIn(d.sales.stream().map(SaleTransaction::getId).toList());
        if (!d.returns.isEmpty()) {
            d.returnItems = returnItemRepo.findByReturnIdIn(d.returns.stream().map(PosSaleReturn::getId).toList())
                    .stream().collect(Collectors.groupingBy(PosSaleReturnItem::getReturnId));
        }
    }

    private ReportSummary summarize(Data d) {
        int invoiceCount = d.sales.size();
        BigDecimal gross = BigDecimal.ZERO, lineDisc = BigDecimal.ZERO, billDisc = BigDecimal.ZERO,
                taxable = BigDecimal.ZERO, tax = BigDecimal.ZERO, total = BigDecimal.ZERO, creditSales = BigDecimal.ZERO;
        int discounted = 0;
        Map<String, BigDecimal[]> tenders = bucketMap();
        for (SaleTransaction t : d.sales) {
            gross = gross.add(nz(t.getSubtotal()));
            BigDecimal ld = t.getLineDiscountAmount() != null ? t.getLineDiscountAmount() : nz(t.getDiscountAmount());
            lineDisc = lineDisc.add(ld);
            billDisc = billDisc.add(nz(t.getBillDiscountAmount()));
            if (nz(t.getDiscountAmount()).signum() > 0) discounted++;
            taxable = taxable.add(t.getTaxableAmount() != null ? t.getTaxableAmount()
                    : nz(t.getSubtotal()).subtract(nz(t.getDiscountAmount())));
            tax = tax.add(nz(t.getTaxAmount()));
            total = total.add(nz(t.getTotalAmount()));
            creditSales = creditSales.add(nz(t.getCreditAmount()));
            for (PaymentSplitDTO leg : legsOf(t)) addTo(tenders, bucket(leg.getMethod()), nz(leg.getAmount()));
        }

        Map<String, BigDecimal[]> refunds = bucketMap();
        BigDecimal returnTotal = BigDecimal.ZERO, returnTax = BigDecimal.ZERO;
        int itemsReturned = 0;
        for (PosSaleReturn r : d.returns) {
            returnTotal = returnTotal.add(nz(r.getTotalAmount()));
            returnTax = returnTax.add(nz(r.getTaxAmount()));
            List<PaymentSplitDTO> legs = r.getRefundBreakdown() == null || r.getRefundBreakdown().isEmpty()
                    ? List.of(new PaymentSplitDTO(r.getRefundMethod(), r.getTotalAmount(), null)) : r.getRefundBreakdown();
            for (PaymentSplitDTO leg : legs) addTo(refunds, bucket(leg.getMethod()), nz(leg.getAmount()));
            for (PosSaleReturnItem i : d.returnItems.getOrDefault(r.getId(), List.of())) itemsReturned += i.getQuantity();
        }

        Map<String, BigDecimal[]> collections = bucketMap();
        BigDecimal collected = BigDecimal.ZERO;
        for (PosCreditPayment p : d.creditPayments) {
            collected = collected.add(nz(p.getAmount()));
            addTo(collections, bucket(p.getPaymentMethod()), nz(p.getAmount()));
        }

        BigDecimal cashIn = BigDecimal.ZERO, cashOut = BigDecimal.ZERO;
        for (CashMovement m : d.movements) {
            if ("DROP_IN".equals(m.getType())) cashIn = cashIn.add(nz(m.getAmount()));
            else if ("CASH_OUT".equals(m.getType())) cashOut = cashOut.add(nz(m.getAmount()));
        }
        BigDecimal opening = d.sessions.stream().map(PosSession::getOpeningCash).map(PosSupport::nz)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cashSales = tenders.get(CASH)[1];
        BigDecimal cashCollections = collections.get(CASH)[1];
        BigDecimal cashRefunds = refunds.get(CASH)[1];
        BigDecimal expected = opening.add(cashSales).add(cashCollections).add(cashIn).subtract(cashOut).subtract(cashRefunds);

        int itemsSold = d.items.stream().mapToInt(i -> i.getQuantity() == null ? 0 : i.getQuantity()).sum();
        BigDecimal avg = invoiceCount == 0 ? BigDecimal.ZERO : total.divide(BigDecimal.valueOf(invoiceCount), 2, RoundingMode.HALF_UP);
        List<SaleTransaction> byId = d.sales.stream().sorted(Comparator.comparing(SaleTransaction::getId)).toList();

        return new ReportSummary(invoiceCount, r2(gross), r2(lineDisc), r2(billDisc), r2(lineDisc.add(billDisc)), discounted,
                r2(taxable), r2(tax), r2(total), d.returns.size(), r2(returnTotal), r2(returnTax),
                r2(total.subtract(returnTotal)), itemsSold, itemsReturned, avg, r2(creditSales), r2(collected),
                d.creditPayments.size(), tenderLines(tenders), tenderLines(refunds), tenderLines(collections),
                new CashPosition(r2(opening), r2(cashSales), r2(cashCollections), r2(cashIn), r2(cashOut),
                        r2(cashRefunds), r2(expected)),
                byId.isEmpty() ? null : byId.get(0).getTransactionNumber(),
                byId.isEmpty() ? null : byId.get(byId.size() - 1).getTransactionNumber());
    }

    /** A sale's ledger legs; legacy single-method sales become one leg for the whole total. */
    static List<PaymentSplitDTO> legsOf(SaleTransaction t) {
        if (t.getPaymentBreakdown() != null && !t.getPaymentBreakdown().isEmpty()) return t.getPaymentBreakdown();
        return List.of(new PaymentSplitDTO(t.getPaymentMethod(), nz(t.getTotalAmount()), null));
    }

    static String bucket(String method) {
        if (method == null) return CASH;
        String m = method.trim().toUpperCase(Locale.ROOT).replace('_', ' ');
        if (m.equals("CASH") || m.equals("CASH IN HAND")) return CASH;
        if (m.equals("CARD") || m.contains("CARD") || m.equals("VISA") || m.equals("MASTERCARD")) return CARD;
        if (m.startsWith("ONLINE") || m.contains("TRANSFER") || m.equals("UPI")) return ONLINE;
        if (m.equals("CREDIT") || m.equals("ON ACCOUNT")) return CREDIT;
        if (m.equals("WALLET")) return WALLET;
        return OTHER;
    }

    private static Map<String, BigDecimal[]> bucketMap() {
        Map<String, BigDecimal[]> m = new LinkedHashMap<>();
        for (String k : TENDER_ORDER) m.put(k, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
        return m;
    }

    private static void addTo(Map<String, BigDecimal[]> m, String bucket, BigDecimal amount) {
        BigDecimal[] v = m.get(bucket);
        v[0] = v[0].add(BigDecimal.ONE);
        v[1] = v[1].add(amount);
    }

    private static List<TenderLine> tenderLines(Map<String, BigDecimal[]> m) {
        List<TenderLine> out = new ArrayList<>();
        for (String k : TENDER_ORDER) {
            BigDecimal[] v = m.get(k);
            if (v[0].signum() > 0 || CASH.equals(k) || CARD.equals(k)) out.add(new TenderLine(k, v[0].intValue(), r2(v[1])));
        }
        return out;
    }

    private static List<ItemLine> topItems(Data d, int limit) {
        Map<String, ItemAgg> agg = new LinkedHashMap<>();
        for (SaleTransactionItem i : d.items) {
            String key = i.getProductId() != null ? "p" + i.getProductId() : "n" + i.getProductName();
            ItemAgg a = agg.computeIfAbsent(key, k -> new ItemAgg(i));
            a.qty += i.getQuantity() == null ? 0 : i.getQuantity();
            BigDecimal taxable = i.getTaxableAmount() != null ? i.getTaxableAmount() : nz(i.getTotalAmount());
            a.amount = a.amount.add(taxable).add(nz(i.getTaxAmount()));
        }
        return agg.values().stream()
                .sorted(Comparator.comparing((ItemAgg a) -> a.amount).reversed())
                .limit(limit)
                .map(a -> new ItemLine(a.productId, a.name, a.sku, a.category, a.qty, r2(a.amount)))
                .toList();
    }

    private static final class ItemAgg {
        final Long productId;
        final String name;
        final String sku;
        final String category;
        int qty;
        BigDecimal amount = BigDecimal.ZERO;

        ItemAgg(SaleTransactionItem i) {
            productId = i.getProductId();
            name = i.getProductName();
            sku = i.getProductSku();
            category = i.getCategoryName() == null ? "Uncategorized" : i.getCategoryName();
        }
    }

    private static List<CategoryLine> categories(Data d) {
        Map<String, BigDecimal> amounts = new LinkedHashMap<>();
        Map<String, Integer> qty = new LinkedHashMap<>();
        for (SaleTransactionItem i : d.items) {
            String c = i.getCategoryName() == null ? "Uncategorized" : i.getCategoryName();
            BigDecimal taxable = i.getTaxableAmount() != null ? i.getTaxableAmount() : nz(i.getTotalAmount());
            amounts.merge(c, taxable.add(nz(i.getTaxAmount())), BigDecimal::add);
            qty.merge(c, i.getQuantity() == null ? 0 : i.getQuantity(), Integer::sum);
        }
        return amounts.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(e -> new CategoryLine(e.getKey(), qty.get(e.getKey()), r2(e.getValue())))
                .toList();
    }

    /**
     * Zone for hour-of-day buckets: the terminal's own timezone (X-Client-Timezone header,
     * an IANA id such as "Asia/Dubai"). Timestamps are stored in UTC (see GymApplication),
     * so without it the busiest-hours chart would be shifted by the UTC offset.
     */
    private static ZoneId clientZone() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            String tz = attrs.getRequest().getHeader("X-Client-Timezone");
            if (tz != null && !tz.isBlank()) {
                try {
                    return ZoneId.of(tz.trim());
                } catch (DateTimeException ignored) {
                    // unknown zone id — fall back to UTC
                }
            }
        }
        return ZoneOffset.UTC;
    }

    private static List<HourLine> hourly(List<SaleTransaction> sales) {
        ZoneId zone = clientZone();
        int[] counts = new int[24];
        BigDecimal[] amounts = new BigDecimal[24];
        Arrays.fill(amounts, BigDecimal.ZERO);
        for (SaleTransaction t : sales) {
            if (t.getCreatedAt() == null) continue;
            int h = t.getCreatedAt().atOffset(ZoneOffset.UTC).atZoneSameInstant(zone).getHour();
            counts[h]++;
            amounts[h] = amounts[h].add(nz(t.getTotalAmount()));
        }
        List<HourLine> out = new ArrayList<>();
        for (int h = 0; h < 24; h++) out.add(new HourLine(h, counts[h], r2(amounts[h])));
        return out;
    }

    private static List<CashierLine> cashiers(Data d) {
        Map<String, List<SaleTransaction>> by = new TreeMap<>();
        for (SaleTransaction t : d.sales) {
            String c = t.getCashierName() != null ? t.getCashierName() : (t.getCreatedBy() != null ? t.getCreatedBy() : "Unknown");
            by.computeIfAbsent(c, k -> new ArrayList<>()).add(t);
        }
        List<CashierLine> out = new ArrayList<>();
        by.forEach((cashier, list) -> {
            BigDecimal gross = list.stream().map(SaleTransaction::getSubtotal).map(PosSupport::nz).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal total = list.stream().map(SaleTransaction::getTotalAmount).map(PosSupport::nz).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal refunded = list.stream().map(SaleTransaction::getRefundedAmount).map(PosSupport::nz).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal disc = list.stream().map(SaleTransaction::getDiscountAmount).map(PosSupport::nz).reduce(BigDecimal.ZERO, BigDecimal::add);
            out.add(new CashierLine(cashier, list.size(), r2(gross), r2(total.subtract(refunded)), r2(disc), r2(refunded)));
        });
        return out;
    }

    private static List<CashEvent> cashEvents(Data d) {
        List<CashEvent> out = new ArrayList<>();
        for (CashMovement m : d.movements) {
            out.add(new CashEvent("DROP_IN".equals(m.getType()) ? "Cash In" : "Cash Out", m.getCategory(), m.getReason(),
                    r2(m.getAmount()), m.getCreatedBy(), m.getCreatedAt()));
        }
        for (PosCreditPayment p : d.creditPayments) {
            if (CASH.equals(bucket(p.getPaymentMethod()))) {
                out.add(new CashEvent("Credit Collection", p.getMemberName(), p.getPaymentNumber(), r2(p.getAmount()),
                        p.getReceivedBy(), p.getCreatedAt()));
            }
        }
        for (PosSaleReturn r : d.returns) {
            List<PaymentSplitDTO> legs = r.getRefundBreakdown() == null ? List.of() : r.getRefundBreakdown();
            BigDecimal cash = legs.stream().filter(l -> CASH.equals(bucket(l.getMethod())))
                    .map(PaymentSplitDTO::getAmount).map(PosSupport::nz).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (cash.signum() > 0) {
                out.add(new CashEvent("Cash Refund", r.getTransactionNumber(), r.getReturnNumber(), r2(cash),
                        r.getCashierName(), r.getCreatedAt()));
            }
        }
        out.sort(Comparator.comparing(CashEvent::at, Comparator.nullsLast(Comparator.naturalOrder())));
        return out;
    }

    private static List<ReportInvoiceLine> invoices(List<SaleTransaction> sales) {
        return sales.stream().sorted(Comparator.comparing(SaleTransaction::getId))
                .map(t -> new ReportInvoiceLine(t.getId(), t.getTransactionNumber(), t.getCreatedAt(), t.getMemberName(),
                        t.getCashierName() != null ? t.getCashierName() : t.getCreatedBy(),
                        t.getPaymentSummary() != null ? t.getPaymentSummary() : t.getPaymentMethod(),
                        r2(t.getTotalAmount()), r2(t.getRefundedAmount()), t.getStatus()))
                .toList();
    }

    private List<ReturnDTO> returnDtos(Data d) {
        return d.returns.stream().map(r -> mapper.saleReturn(r, d.returnItems.getOrDefault(r.getId(), List.of()))).toList();
    }

    private static LocalDate businessDate(SaleTransaction t) {
        if (t.getBusinessDate() != null) return t.getBusinessDate();
        return t.getCreatedAt() != null ? t.getCreatedAt().toLocalDate() : null;
    }
}
