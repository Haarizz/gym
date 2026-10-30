package com.company.project.services;

import com.company.project.entities.AccountHead;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;
import com.company.project.entities.Receipt;
import com.company.project.entities.SupplierBill;
import com.company.project.repositories.*;
import com.company.project.security.BranchContextHolder;
import com.company.project.services.pos.PosBusinessDayService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class FinancialOverviewServiceTest {

    @Mock private AccountHeadRepository accountHeadRepository;
    @Mock private JournalVoucherRepository journalVoucherRepository;
    @Mock private JournalVoucherLineRepository journalVoucherLineRepository;
    @Mock private ReceiptRepository receiptRepository;
    @Mock private SaleTransactionRepository saleTransactionRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private SupplierBillRepository supplierBillRepository;
    @Mock private BankReconciliationRepository bankReconciliationRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private PosBusinessDayService businessDayService;
    @Mock private FinancialSettingRepository financialSettingRepository;

    private FinancialOverviewService service;
    private final List<JournalVoucher> vouchers = new ArrayList<>();
    private final List<JournalVoucherLine> lines = new ArrayList<>();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        BranchContextHolder.setActiveBranchId(1L);
        when(businessDayService.zone()).thenReturn(ZoneOffset.UTC);
        service = new FinancialOverviewService(accountHeadRepository, journalVoucherRepository,
                journalVoucherLineRepository, receiptRepository, saleTransactionRepository, memberRepository,
                supplierBillRepository, bankReconciliationRepository, branchRepository, businessDayService,
                financialSettingRepository);

        when(accountHeadRepository.findAllByOrderByCodeAsc()).thenReturn(List.of(
                head("1000", "Cash in Hand", "ASSET", "100"),
                head("1001", "Cash at Bank", "ASSET", "0"),
                head("1100", "Accounts Receivable", "ASSET", "0"),
                head("2100", "Tax / GST Payable", "LIABILITY", "0"),
                head("4000", "Membership Revenue", "REVENUE", "0"),
                head("4100", "POS Sales Revenue", "REVENUE", "0"),
                head("5000", "Salary Expense", "EXPENSE", "0"),
                head("5100", "Maintenance Expense", "EXPENSE", "0")));
        when(journalVoucherRepository.findByStatusAndDateBetweenOrderByDateDesc(eq("POSTED"), any(), any())).thenReturn(vouchers);
        when(journalVoucherLineRepository.findByJournalVoucherIdIn(any())).thenReturn(lines);
        when(receiptRepository.findAll(any(Specification.class))).thenReturn(List.of());
        when(saleTransactionRepository.findAll(any(Specification.class))).thenReturn(List.of());
        when(supplierBillRepository.findAll()).thenReturn(List.of());
        when(bankReconciliationRepository.findAll()).thenReturn(List.of());
        when(memberRepository.sumOutstandingBalance()).thenReturn(BigDecimal.ZERO);
        when(financialSettingRepository.findByCategoryOrderBySettingKeyAsc("APP_PREFERENCES")).thenReturn(List.of());
    }

    @AfterEach
    void tearDown() {
        BranchContextHolder.clear();
    }

    private static AccountHead head(String code, String name, String type, String opening) {
        AccountHead a = new AccountHead();
        a.setCode(code);
        a.setName(name);
        a.setType(type);
        a.setOpeningBalance(new BigDecimal(opening));
        return a;
    }

    /** A posted voucher with [account, debit, credit] lines. */
    private void post(long id, LocalDate date, Object[]... rows) {
        JournalVoucher jv = new JournalVoucher();
        jv.setId(id);
        jv.setDate(date);
        jv.setStatus("POSTED");
        jv.setBranchId(1L);
        jv.setVoucherNo("JV-" + id);
        vouchers.add(jv);
        for (Object[] r : rows) {
            JournalVoucherLine l = new JournalVoucherLine();
            l.setJournalVoucherId(id);
            l.setAccountCode((String) r[0]);
            l.setDebit(new BigDecimal((String) r[1]));
            l.setCredit(new BigDecimal((String) r[2]));
            lines.add(l);
        }
    }

    @SuppressWarnings("unchecked")
    private static BigDecimal current(Map<String, Object> kpis, String key) {
        return (BigDecimal) ((Map<String, Object>) kpis.get(key)).get("current");
    }

    @SuppressWarnings("unchecked")
    private static BigDecimal previous(Map<String, Object> kpis, String key) {
        return (BigDecimal) ((Map<String, Object>) kpis.get(key)).get("previous");
    }

    @Test
    @SuppressWarnings("unchecked")
    void periodFiguresComparePreviousPeriodAndBalancesIncludeOpening() {
        LocalDate from = LocalDate.of(2026, 10, 1), to = LocalDate.of(2026, 10, 10);
        // Previous 10 days (21–30 Sep): 500 membership revenue.
        post(1, LocalDate.of(2026, 9, 25), new Object[]{"1000", "500", "0"}, new Object[]{"4000", "0", "500"});
        // This period: 1000 membership (cash), 200 POS (bank) + 20 tax, 300 salary (bank), 50 maintenance (cash).
        post(2, LocalDate.of(2026, 10, 2), new Object[]{"1000", "1000", "0"}, new Object[]{"4000", "0", "1000"});
        post(3, LocalDate.of(2026, 10, 3), new Object[]{"1001", "220", "0"}, new Object[]{"4100", "0", "200"},
                new Object[]{"2100", "0", "20"});
        post(4, LocalDate.of(2026, 10, 5), new Object[]{"5000", "300", "0"}, new Object[]{"1001", "0", "300"});
        post(5, LocalDate.of(2026, 10, 6), new Object[]{"5100", "50", "0"}, new Object[]{"1000", "0", "50"});
        // Cash -> bank transfer: not cash in or out.
        post(6, LocalDate.of(2026, 10, 7), new Object[]{"1001", "400", "0"}, new Object[]{"1000", "0", "400"});
        // After the range: ignored for the period and for balances as of the 10th.
        post(7, LocalDate.of(2026, 10, 15), new Object[]{"1000", "999", "0"}, new Object[]{"4000", "0", "999"});

        Map<String, Object> out = service.overview(from, to, "previous");
        Map<String, Object> kpis = (Map<String, Object>) out.get("kpis");

        assertEquals(0, new BigDecimal("1200").compareTo(current(kpis, "revenue")));
        assertEquals(0, new BigDecimal("500").compareTo(previous(kpis, "revenue")));
        assertEquals(140.0, ((Map<String, Object>) kpis.get("revenue")).get("changePct"));
        assertEquals(0, new BigDecimal("350").compareTo(current(kpis, "expenses")));
        assertEquals(0, new BigDecimal("850").compareTo(current(kpis, "netProfit")));
        assertEquals(70.8, ((Map<String, Object>) kpis.get("profitMargin")).get("current"));
        assertEquals(0, new BigDecimal("1220").compareTo(current(kpis, "cashIn")), "transfer is not cash in");
        assertEquals(0, new BigDecimal("350").compareTo(current(kpis, "cashOut")), "transfer is not cash out");
        // Opening 100 + 500 + 1000 + 220 - 300 - 50 (+400 -400 transfer) = 1470.
        assertEquals(0, new BigDecimal("1470").compareTo((BigDecimal) kpis.get("cashBalance")));
        assertEquals(0, new BigDecimal("20").compareTo((BigDecimal) kpis.get("taxPayable")));

        List<Map<String, Object>> trend = (List<Map<String, Object>>) out.get("trend");
        assertEquals(10, trend.size(), "a 10-day range is bucketed by day");
        assertEquals(0, new BigDecimal("1000").compareTo((BigDecimal) trend.get(1).get("revenue")));
        assertEquals(0, new BigDecimal("500").compareTo((BigDecimal) trend.get(4).get("previousRevenue")),
                "25 Sep is day 5 of the previous period, lined up with 5 Oct");

        List<Map<String, Object>> revenue = (List<Map<String, Object>>) out.get("revenueByAccount");
        assertEquals("Membership Revenue", revenue.get(0).get("name"));
        assertEquals(83.3, revenue.get(0).get("share"));
        assertEquals(12, ((List<?>) out.get("monthly")).size());
        assertTrue(((List<?>) out.get("branches")).isEmpty(), "branch comparison only in All Branches mode");
        assertEquals(4, ((List<?>) out.get("activity")).size(), "vouchers touching income/expense in range");
        List<Map<String, Object>> insights = (List<Map<String, Object>>) out.get("insights");
        assertTrue(insights.stream().anyMatch(i -> ((String) i.get("title")).startsWith("Revenue up 140")));
        assertTrue(insights.stream().anyMatch(i -> ((String) i.get("detail")).contains("AED")), "amounts carry the currency");
    }

    @Test
    @SuppressWarnings("unchecked")
    void yearOverYearComparesSameDatesLastYear() {
        post(1, LocalDate.of(2025, 10, 5), new Object[]{"1000", "300", "0"}, new Object[]{"4000", "0", "300"});
        post(2, LocalDate.of(2026, 10, 5), new Object[]{"1000", "600", "0"}, new Object[]{"4000", "0", "600"});
        Map<String, Object> out = service.overview(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), "year");
        Map<String, Object> kpis = (Map<String, Object>) out.get("kpis");
        assertEquals(0, new BigDecimal("300").compareTo(previous(kpis, "revenue")));
        assertEquals(100.0, ((Map<String, Object>) kpis.get("revenue")).get("changePct"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void receivablesAgeOpenBillsAndPayablesFlagOverdue() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        Receipt overdue = new Receipt();
        overdue.setStatus("Partial");
        overdue.setTransactionType("New");
        overdue.setMemberDbId(7L);
        overdue.setMemberName("Asha");
        overdue.setAmount(new BigDecimal("1000"));
        overdue.setTotalPaidToDate(new BigDecimal("400"));
        overdue.setDueDate(today.minusDays(40).atStartOfDay());
        Receipt instalment = new Receipt(); // "Payment" receipts are not bills
        instalment.setStatus("Partial");
        instalment.setTransactionType("Payment");
        instalment.setAmount(new BigDecimal("999"));
        when(receiptRepository.findAll(any(Specification.class))).thenReturn(List.of(overdue, instalment));
        when(memberRepository.sumOutstandingBalance()).thenReturn(new BigDecimal("600"));
        when(memberRepository.countWithOutstandingBalance()).thenReturn(1L);

        SupplierBill bill = new SupplierBill();
        bill.setStatus("POSTED");
        bill.setPaymentStatus("UNPAID");
        bill.setSupplierName("FitSupplies");
        bill.setTotalAmount(new BigDecimal("250"));
        bill.setAmountPaid(BigDecimal.ZERO);
        bill.setDueDate(today.minusDays(5));
        when(supplierBillRepository.findAll()).thenReturn(List.of(bill));

        Map<String, Object> out = service.overview(today.minusDays(6), today, "previous");
        Map<String, Object> receivables = (Map<String, Object>) ((Map<String, Object>) out.get("kpis")).get("receivables");
        assertEquals(0, new BigDecimal("600").compareTo((BigDecimal) receivables.get("overdue")));
        List<Map<String, Object>> aging = (List<Map<String, Object>>) out.get("receivablesAging");
        assertEquals(0, new BigDecimal("600").compareTo((BigDecimal) aging.stream()
                .filter(a -> "31-60".equals(a.get("bucket"))).findFirst().orElseThrow().get("amount")));
        assertEquals("Asha", ((List<Map<String, Object>>) out.get("topDebtors")).get(0).get("name"));
        Map<String, Object> payables = (Map<String, Object>) ((Map<String, Object>) out.get("kpis")).get("payables");
        assertEquals(0, new BigDecimal("250").compareTo((BigDecimal) payables.get("overdue")));
        List<Map<String, Object>> insights = (List<Map<String, Object>>) out.get("insights");
        assertEquals("critical", insights.get(0).get("type"), "overdue supplier bills rank first");
    }

    private static com.company.project.dto.PaymentSplitDTO split(String method, String amount) {
        com.company.project.dto.PaymentSplitDTO s = new com.company.project.dto.PaymentSplitDTO();
        s.setMethod(method);
        s.setAmount(new BigDecimal(amount));
        return s;
    }

    @Test
    void creditIsOwedNotCollected() {
        FinancialOverviewService.Collections c = new FinancialOverviewService.Collections();
        // Part-paid bill: 25 on credit + 24 cash, 24 actually received.
        BigDecimal got = FinancialOverviewService.addSplits(c, List.of(split("Credit", "25"), split("Cash", "24")),
                "Credit + cash", new BigDecimal("24"));
        assertEquals(0, new BigDecimal("24").compareTo(got));
        assertEquals(0, new BigDecimal("24").compareTo(c.byMethod.get("Cash")));
        assertNull(c.byMethod.get("On credit"));
        // A POS sale entirely on credit collects nothing.
        assertEquals(0, BigDecimal.ZERO.compareTo(
                FinancialOverviewService.addSplits(c, null, "CREDIT", new BigDecimal("164.85"))));
        // A card payment is not credit.
        assertEquals(0, new BigDecimal("50").compareTo(
                FinancialOverviewService.addSplits(c, List.of(split("Credit Card", "50")), "Credit Card", new BigDecimal("50"))));
        assertEquals(0, new BigDecimal("50").compareTo(c.byMethod.get("Card")));
    }

    @Test
    void helpers() {
        assertEquals("Cash", FinancialOverviewService.normalizeMethod(" cash "));
        assertEquals("Card", FinancialOverviewService.normalizeMethod("VISA"));
        assertEquals("Online / UPI", FinancialOverviewService.normalizeMethod("ONLINE"));
        assertEquals("Bank transfer", FinancialOverviewService.normalizeMethod("Bank transfer"));
        assertEquals("Split payment", FinancialOverviewService.normalizeMethod("Visa + cash + online"));
        assertEquals("Other", FinancialOverviewService.normalizeMethod(null));
        assertNull(FinancialOverviewService.pctChange(BigDecimal.TEN, BigDecimal.ZERO));
        assertEquals(-50.0, FinancialOverviewService.pctChange(new BigDecimal("5"), BigDecimal.TEN));
        assertEquals("current", FinancialOverviewService.agingBucket(0));
        assertEquals("90+", FinancialOverviewService.agingBucket(91));
        assertEquals("week", FinancialOverviewService.granularity(
                new FinancialOverviewService.Range(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 31))));
        assertEquals("month", FinancialOverviewService.granularity(
                new FinancialOverviewService.Range(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31))));
        assertThrows(IllegalArgumentException.class,
                () -> service.overview(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 1, 1), "previous"));
    }
}
