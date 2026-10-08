package com.company.project.services.pos;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.TransactionDTO;
import com.company.project.entities.*;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.SupervisorApprovalRequiredException;
import com.company.project.repositories.*;
import com.company.project.security.BranchContextHolder;
import com.company.project.services.FinancialEventService;
import com.company.project.services.ReceiptVoucherService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Server-side pricing, VAT, discounts, approvals and tender legs of a POS checkout. */
class PosCheckoutServiceTest {

    @Mock private SaleTransactionRepository saleRepo;
    @Mock private SaleTransactionItemRepository itemRepo;
    @Mock private ProductRepository productRepo;
    @Mock private ProductStockRepository stockRepo;
    @Mock private ProductCategoryRepository categoryRepo;
    @Mock private PosSessionRepository sessionRepo;
    @Mock private PosHeldSaleRepository heldRepo;
    @Mock private MemberRepository memberRepo;
    @Mock private AccountHeadRepository accountHeadRepo;
    @Mock private FinancialSettingRepository financialSettingRepo;
    @Mock private FinancialEventService financialEventService;
    @Mock private ReceiptVoucherService receiptVoucherService;
    @Mock private PosSettingsService settingsService;
    @Mock private PosAuditService auditService;
    @Mock private UserRepository userRepository;
    @Mock private PosInvoiceService invoiceService;
    @Mock private PosPromotionService promotionService;

    private PosCheckoutService service;
    private PosSettings settings;
    private final AtomicLong ids = new AtomicLong(100);

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        BranchContextHolder.setActiveBranchId(1L);
        login("cashier1", "POINT_OF_SALE_VIEW", "POINT_OF_SALE_CREATE");

        PosSupport support = new PosSupport(userRepository, new BCryptPasswordEncoder());
        PosMapper mapper = new PosMapper(saleRepo, support);
        service = new PosCheckoutService(saleRepo, itemRepo, productRepo, stockRepo, categoryRepo, sessionRepo,
                heldRepo, memberRepo, accountHeadRepo, financialSettingRepo, financialEventService,
                receiptVoucherService, settingsService, auditService, support, mapper, invoiceService, promotionService);

        settings = new PosSettings();
        settings.setBranchId(1L);
        when(settingsService.current()).thenReturn(settings);

        FinancialSetting stockOff = new FinancialSetting();
        stockOff.setSettingValue("false");
        when(financialSettingRepo.findBySettingKey("stock_check_enabled")).thenReturn(Optional.of(stockOff));

        when(saleRepo.save(any(SaleTransaction.class))).thenAnswer(inv -> {
            SaleTransaction t = inv.getArgument(0);
            if (t.getId() == null) t.setId(ids.incrementAndGet());
            return t;
        });
        when(itemRepo.save(any(SaleTransactionItem.class))).thenAnswer(inv -> inv.getArgument(0));

        product(1L, "Whey Protein", "100.00", "60.00", "5");
        product(2L, "Shaker", "25.00", "10.00", "5");
        product(3L, "Water", "2.00", "1.00", "0");
    }

    @AfterEach
    void tearDown() {
        BranchContextHolder.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    void exclusiveVatWithLineAndBillDiscountReconciles() {
        // 2 × 100 at 10% line discount = 180, + 1 × 25 = 205; bill discount 5 spread 180:25.
        TransactionDTO t = service.checkout(checkout(
                List.of(item(1L, 2, "10", null), item(2L, 1, null, null)),
                "AMOUNT", "5", List.of(alloc("CASH", "300"))));

        assertEquals(new BigDecimal("225.00"), t.subtotal());
        assertEquals(new BigDecimal("20.00"), t.lineDiscountAmount());
        assertEquals(new BigDecimal("5.00"), t.billDiscountAmount());
        assertEquals(new BigDecimal("200.00"), t.taxableAmount());
        assertEquals(new BigDecimal("10.00"), t.taxAmount());
        assertEquals(new BigDecimal("210.00"), t.totalAmount());
        assertEquals(new BigDecimal("90.00"), t.changeAmount());
        assertLegsSumTo(t, "210.00");
        BigDecimal shares = t.items().stream().map(i -> i.billDiscountShare()).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(new BigDecimal("5.00"), shares);
        verify(financialEventService).onSaleCompleted(any());
    }

    @Test
    void inclusiveVatIsExtractedFromThePrice() {
        settings.setTaxInclusive(true);
        TransactionDTO t = service.checkout(checkout(List.of(item(1L, 1, null, null)), null, null,
                List.of(alloc("CARD", "100"))));
        assertEquals(new BigDecimal("100.00"), t.totalAmount());
        assertEquals(new BigDecimal("95.24"), t.taxableAmount());
        assertEquals(new BigDecimal("4.76"), t.taxAmount());
        assertEquals("CARD", t.paymentMethod());
        assertLegsSumTo(t, "100.00");
    }

    @Test
    void cashChangeIsNotPostedWhenSplitWithCard() {
        // Total 105: 50 on card, 60 cash handed over → 55 cash kept, 5 change. Legs must equal the total.
        TransactionDTO t = service.checkout(checkout(List.of(item(1L, 1, null, null)), null, null,
                List.of(alloc("CARD", "50"), alloc("CASH", "60"))));
        assertEquals(new BigDecimal("105.00"), t.totalAmount());
        assertEquals(new BigDecimal("5.00"), t.changeAmount());
        assertEquals("MIXED", t.paymentMethod());
        PaymentSplitDTO cash = t.paymentBreakdown().stream().filter(l -> "Cash".equals(l.getMethod())).findFirst().orElseThrow();
        assertEquals(new BigDecimal("55.00"), cash.getAmount());
        assertLegsSumTo(t, "105.00");
    }

    @Test
    void shortPaymentIsRejected() {
        BusinessRuleViolationException e = assertThrows(BusinessRuleViolationException.class, () ->
                service.checkout(checkout(List.of(item(1L, 1, null, null)), null, null, List.of(alloc("CASH", "100")))));
        assertTrue(e.getMessage().contains("short by 5.00"));
        verify(saleRepo, never()).save(any());
    }

    @Test
    void nonCashCannotBeOverTendered() {
        assertThrows(BusinessRuleViolationException.class, () ->
                service.checkout(checkout(List.of(item(3L, 1, null, null)), null, null, List.of(alloc("CARD", "5")))));
    }

    @Test
    void creditSalePostsToReceivableAndOnlyPaidPartGetsAReceipt() {
        Member m = new Member();
        m.setId(10L);
        m.setMemberId("GYM-0010");
        m.setName("Aisha");
        when(memberRepo.findById(10L)).thenReturn(Optional.of(m));

        PosRequests.PaymentAllocation credit = new PosRequests.PaymentAllocation("CREDIT", null, new BigDecimal("80"),
                null, null, null, "10", "Aisha");
        TransactionDTO t = service.checkout(checkout(List.of(item(1L, 1, null, null)), null, null,
                List.of(credit, alloc("CASH", "25"))));

        assertEquals(10L, t.memberId());
        assertEquals(new BigDecimal("80.00"), t.creditAmount());
        assertEquals(new BigDecimal("80.00"), t.creditOutstanding());
        PaymentSplitDTO creditLeg = t.paymentBreakdown().stream().filter(l -> "Credit".equals(l.getMethod())).findFirst().orElseThrow();
        assertEquals(FinancialEventService.ACC_RECEIVABLE, creditLeg.getBankAccountCode());
        assertLegsSumTo(t, "105.00");

        ArgumentCaptor<BigDecimal> paid = ArgumentCaptor.forClass(BigDecimal.class);
        verify(receiptVoucherService).createVoucherFromModule(anyString(), eq("POS"), anyString(), eq(10L), paid.capture(),
                anyString(), anyString(), anyString(), any(), any(), any());
        assertEquals(new BigDecimal("25.00"), paid.getValue());
    }

    @Test
    void creditNeedsACustomer() {
        PosRequests.PaymentAllocation credit = new PosRequests.PaymentAllocation("CREDIT", null, new BigDecimal("105"),
                null, null, null, null, null);
        assertThrows(BusinessRuleViolationException.class, () ->
                service.checkout(checkout(List.of(item(1L, 1, null, null)), null, null, List.of(credit))));
    }

    @Test
    void discountAboveLimitNeedsSupervisor() {
        settings.setMaxCashierDiscountPercent(new BigDecimal("10"));
        assertThrows(SupervisorApprovalRequiredException.class, () ->
                service.checkout(checkout(List.of(item(1L, 1, "25", null)), null, null, List.of(alloc("CASH", "200")))));
    }

    @Test
    void supervisorPinApprovesTheDiscount() {
        settings.setMaxCashierDiscountPercent(new BigDecimal("10"));
        settings.setSupervisorPinHash(new BCryptPasswordEncoder().encode("4321"));
        PosRequests.Checkout req = checkout(List.of(item(1L, 1, "25", null)), null, null, List.of(alloc("CASH", "200")));
        PosRequests.Checkout withPin = new PosRequests.Checkout(req.posSessionId(), req.memberId(), req.memberName(), req.items(),
                req.billDiscountType(), req.billDiscountValue(), req.paymentAllocations(), req.notes(), req.terminalName(),
                "4321", null, null, null, null, null, null);
        TransactionDTO t = service.checkout(withPin);
        assertEquals("Supervisor PIN", t.approvedBy());
        assertEquals(new BigDecimal("78.75"), t.totalAmount()); // 75 + 5% VAT
    }

    @Test
    void supervisorNeedsNoPin() {
        login("manager", "POINT_OF_SALE_EDIT");
        settings.setMaxCashierDiscountPercent(new BigDecimal("10"));
        TransactionDTO t = service.checkout(checkout(List.of(item(1L, 1, "50", null)), null, null, List.of(alloc("CASH", "60"))));
        assertEquals("manager", t.approvedBy());
    }

    @Test
    void priceOverrideIsGated() {
        PosRequests.CheckoutItem override = new PosRequests.CheckoutItem(1L, null, null, null, 1,
                new BigDecimal("80"), true, null, null);
        assertThrows(SupervisorApprovalRequiredException.class, () ->
                service.checkout(checkout(List.of(override), null, null, List.of(alloc("CASH", "100")))));

        settings.setRequireSupervisorForPriceOverride(false);
        TransactionDTO t = service.checkout(checkout(List.of(override), null, null, List.of(alloc("CASH", "100"))));
        assertEquals(new BigDecimal("84.00"), t.totalAmount());
        assertTrue(t.items().get(0).priceOverridden());
        assertEquals(new BigDecimal("100.00"), t.items().get(0).listPrice());
    }

    @Test
    void closedSessionCannotSell() {
        PosSession s = new PosSession();
        s.setId(7L);
        s.setStatus("CLOSED");
        s.setSessionNumber("SES-7");
        when(sessionRepo.findById(7L)).thenReturn(Optional.of(s));
        PosRequests.Checkout req = checkout(List.of(item(3L, 1, null, null)), null, null, List.of(alloc("CASH", "2")));
        PosRequests.Checkout inSession = new PosRequests.Checkout(7L, null, null, req.items(), null, null,
                req.paymentAllocations(), null, null, null, null, null, null, null, null, null);
        assertThrows(BusinessRuleViolationException.class, () -> service.checkout(inSession));
    }

    @Test
    void staleSessionFromYesterdayCannotSell() {
        PosSession s = new PosSession();
        s.setId(8L);
        s.setStatus("OPEN");
        s.setOpenedBy("cashier1");
        s.setSessionNumber("SES-8");
        s.setBusinessDate(LocalDate.now().minusDays(1));
        when(sessionRepo.findById(8L)).thenReturn(Optional.of(s));
        PosRequests.Checkout inSession = new PosRequests.Checkout(8L, null, null, List.of(item(3L, 1, null, null)), null, null,
                List.of(alloc("CASH", "2")), null, null, null, null, null, null, null, null, null);
        BusinessRuleViolationException e = assertThrows(BusinessRuleViolationException.class, () -> service.checkout(inSession));
        assertTrue(e.getMessage().contains("still open from"));
    }

    @Test
    void stockIsCheckedWhenEnabled() {
        when(financialSettingRepo.findBySettingKey("stock_check_enabled")).thenReturn(Optional.empty());
        ProductStock stock = new ProductStock();
        stock.setProductId(1L);
        stock.setWarehouseId(3L);
        stock.setCurrentStock(1);
        when(stockRepo.findByProductId(1L)).thenReturn(List.of(stock));
        assertThrows(BusinessRuleViolationException.class, () ->
                service.checkout(checkout(List.of(item(1L, 2, null, null)), null, null, List.of(alloc("CASH", "300")))));

        stock.setCurrentStock(5);
        TransactionDTO t = service.checkout(checkout(List.of(item(1L, 2, null, null)), null, null, List.of(alloc("CASH", "300"))));
        assertEquals(3, stock.getCurrentStock());
        assertEquals(3L, t.items().get(0).warehouseId());
    }

    // ── fixtures ────────────────────────────────────────────────────────────

    private static void login(String user, String... authorities) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, "x",
                java.util.Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList()));
    }

    private void product(Long id, String name, String price, String cost, String tax) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setSellingPrice(new BigDecimal(price));
        p.setCostPrice(new BigDecimal(cost));
        p.setTaxRate(new BigDecimal(tax));
        p.setIsActive(true);
        when(productRepo.findById(id)).thenReturn(Optional.of(p));
    }

    private static PosRequests.CheckoutItem item(Long productId, int qty, String discountPct, String discountAmt) {
        return new PosRequests.CheckoutItem(productId, null, null, null, qty, null, false,
                discountPct == null ? null : new BigDecimal(discountPct), discountAmt == null ? null : new BigDecimal(discountAmt));
    }

    private static PosRequests.PaymentAllocation alloc(String type, String amount) {
        return new PosRequests.PaymentAllocation(type, "CARD".equals(type) ? "Visa" : null, new BigDecimal(amount),
                null, null, null, null, null);
    }

    private static PosRequests.Checkout checkout(List<PosRequests.CheckoutItem> items, String billType, String billValue,
                                                 List<PosRequests.PaymentAllocation> allocations) {
        return new PosRequests.Checkout(null, null, null, items, billType, billValue == null ? null : new BigDecimal(billValue),
                allocations, null, null, null, null, null, null, null, null, null);
    }

    private static void assertLegsSumTo(TransactionDTO t, String total) {
        BigDecimal sum = t.paymentBreakdown().stream().map(PaymentSplitDTO::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, sum.compareTo(new BigDecimal(total)), "ledger legs must sum to the sale total");
    }
}
