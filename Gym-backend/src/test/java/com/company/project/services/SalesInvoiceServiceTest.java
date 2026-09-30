package com.company.project.services;

import com.company.project.dto.RecordBillPaymentRequestDTO;
import com.company.project.dto.SalesInvoiceItemDTO;
import com.company.project.dto.SalesInvoiceRequestDTO;
import com.company.project.dto.SalesInvoiceResponseDTO;
import com.company.project.entities.FinancialSetting;
import com.company.project.entities.Product;
import com.company.project.entities.ProductStock;
import com.company.project.entities.ReceiptVoucher;
import com.company.project.entities.SalesInvoice;
import com.company.project.entities.SalesInvoiceItem;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SalesInvoiceServiceTest {

    @Mock private SalesInvoiceRepository invoiceRepository;
    @Mock private SalesInvoiceItemRepository itemRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ProductStockRepository productStockRepository;
    @Mock private WarehouseRepository warehouseRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private FinancialSettingRepository financialSettingRepository;
    @Mock private FinancialEventService financialEventService;
    @Mock private ReceiptVoucherService receiptVoucherService;

    private SalesInvoiceService service;
    private final Map<Long, SalesInvoice> invoices = new HashMap<>();
    private final List<SalesInvoiceItem> items = new ArrayList<>();
    private ProductStock stock;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new SalesInvoiceService(invoiceRepository, itemRepository, productRepository, productStockRepository,
                warehouseRepository, memberRepository, financialSettingRepository, financialEventService, receiptVoucherService);

        when(invoiceRepository.save(any(SalesInvoice.class))).thenAnswer(a -> {
            SalesInvoice inv = a.getArgument(0);
            if (inv.getId() == null) inv.setId(1L);
            invoices.put(inv.getId(), inv);
            return inv;
        });
        when(invoiceRepository.findById(anyLong())).thenAnswer(a -> Optional.ofNullable(invoices.get((Long) a.getArgument(0))));
        when(invoiceRepository.findByIdForUpdate(anyLong())).thenAnswer(a -> Optional.ofNullable(invoices.get((Long) a.getArgument(0))));
        when(itemRepository.saveAll(anyList())).thenAnswer(a -> {
            List<SalesInvoiceItem> saved = a.getArgument(0);
            for (SalesInvoiceItem i : saved) if (!items.contains(i)) items.add(i);
            return saved;
        });
        when(itemRepository.findByInvoiceIdOrderByIdAsc(anyLong())).thenAnswer(a -> new ArrayList<>(items));

        Product whey = product(10L, "Whey", "100.00", "60.00", "5.00");
        Product towel = product(11L, "Towel", "20.00", "8.00", "0.00");
        when(productRepository.findById(10L)).thenReturn(Optional.of(whey));
        when(productRepository.findById(11L)).thenReturn(Optional.of(towel));
        when(warehouseRepository.existsById(1L)).thenReturn(true);

        stock = new ProductStock();
        stock.setProductId(10L);
        stock.setWarehouseId(1L);
        stock.setCurrentStock(5);
        when(productStockRepository.findForUpdate(10L, 1L)).thenReturn(Optional.of(stock));
        when(receiptVoucherService.createVoucherFromModule(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new ReceiptVoucher());
    }

    private static Product product(long id, String name, String sell, String cost, String tax) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setSellingPrice(new BigDecimal(sell));
        p.setCostPrice(new BigDecimal(cost));
        p.setTaxRate(new BigDecimal(tax));
        return p;
    }

    private static SalesInvoiceItemDTO line(long productId, int qty, String price, String disc) {
        SalesInvoiceItemDTO d = new SalesInvoiceItemDTO();
        d.setProductId(productId);
        d.setWarehouseId(1L);
        d.setQuantity(qty);
        d.setUnitPrice(new BigDecimal(price));
        d.setDiscountPercent(new BigDecimal(disc));
        return d;
    }

    private static SalesInvoiceRequestDTO walkIn(SalesInvoiceItemDTO... lines) {
        SalesInvoiceRequestDTO r = new SalesInvoiceRequestDTO();
        r.setCustomerType("WALK_IN");
        r.setItems(List.of(lines));
        return r;
    }

    private static RecordBillPaymentRequestDTO pay(String amount) {
        RecordBillPaymentRequestDTO p = new RecordBillPaymentRequestDTO();
        p.setAmount(new BigDecimal(amount));
        p.setPaymentMethod("CASH");
        return p;
    }

    @Test
    void totalsUseProductVatWithFooterDiscountSpreadBeforeTax() {
        SalesInvoiceRequestDTO req = walkIn(line(10, 2, "100.00", "10"), line(11, 1, "20.00", "0"));
        req.setFooterDiscount(new BigDecimal("20.00"));
        req.setDeliveryCharge(new BigDecimal("5.00"));

        SalesInvoiceResponseDTO res = service.createInvoice(req);

        // Whey: 200 − 10% = 180; towel 20 → net 200. Footer 20 → 18 / 2. Whey VAT 5% of 162 = 8.10.
        assertEquals(new BigDecimal("220.00"), res.getSubtotal());
        assertEquals(new BigDecimal("20.00"), res.getDiscountAmount());
        assertEquals(new BigDecimal("20.00"), res.getFooterDiscount());
        assertEquals(new BigDecimal("180.00"), res.getTaxableAmount());
        assertEquals(new BigDecimal("8.10"), res.getTaxAmount());
        assertEquals(new BigDecimal("193.10"), res.getTotalAmount());
        assertEquals("Walk-in Customer", res.getCustomerName());
        assertEquals("SI-00000001", res.getInvoiceNumber());
    }

    @Test
    void vatInclusivePricesExtractTax() {
        SalesInvoiceRequestDTO req = walkIn(line(10, 1, "105.00", "0"));
        req.setPricesIncludeTax(true);

        SalesInvoiceResponseDTO res = service.createInvoice(req);

        assertEquals(new BigDecimal("100.00"), res.getTaxableAmount());
        assertEquals(new BigDecimal("5.00"), res.getTaxAmount());
        assertEquals(new BigDecimal("105.00"), res.getTotalAmount());
    }

    @Test
    void walkInMustPayInFullToConfirm() {
        service.createInvoice(walkIn(line(10, 1, "100.00", "0")));

        assertThrows(BusinessRuleViolationException.class, () -> service.confirmInvoice(1L, pay("50.00")));
        assertEquals(5, stock.getCurrentStock());
        verify(financialEventService, never()).onSalesInvoiceConfirmed(any());
    }

    @Test
    void confirmDeductsStockAndPostsPayment() {
        service.createInvoice(walkIn(line(10, 3, "100.00", "0")));

        SalesInvoiceResponseDTO res = service.confirmInvoice(1L, pay("315.00"));

        assertEquals("CONFIRMED", res.getStatus());
        assertEquals("PAID", res.getPaymentStatus());
        assertTrue(res.getStockDeducted());
        assertEquals(2, stock.getCurrentStock());
        assertEquals(new BigDecimal("180.00"), invoices.get(1L).getTotalCogs());
        verify(financialEventService).onSalesInvoiceConfirmed(any());
        verify(financialEventService).onSalesInvoicePaymentReceived(any(), any(), eq(new BigDecimal("315.00")), eq("CASH"), any(), any());
    }

    @Test
    void insufficientStockBlocksConfirm() {
        service.createInvoice(walkIn(line(10, 6, "100.00", "0")));

        BusinessRuleViolationException e = assertThrows(BusinessRuleViolationException.class,
                () -> service.confirmInvoice(1L, pay("630.00")));
        assertTrue(e.getMessage().contains("Insufficient stock"));
        assertEquals(5, stock.getCurrentStock());
    }

    @Test
    void stockCheckOffLeavesStockAlone() {
        FinancialSetting off = new FinancialSetting();
        off.setSettingValue("false");
        when(financialSettingRepository.findBySettingKey("stock_check_enabled")).thenReturn(Optional.of(off));
        service.createInvoice(walkIn(line(10, 9, "100.00", "0")));

        SalesInvoiceResponseDTO res = service.confirmInvoice(1L, pay("945.00"));

        assertFalse(res.getStockDeducted());
        assertEquals(5, stock.getCurrentStock());
    }

    @Test
    void cancellingUnpaidConfirmedInvoiceRestoresStock() {
        SalesInvoiceRequestDTO req = walkIn(line(10, 2, "100.00", "0"));
        service.createInvoice(req);
        // A zero payment would be refused for a walk-in; confirm then pretend it's unpaid (e.g. a member on account).
        invoices.get(1L).setCustomerType(SalesInvoice.CUSTOMER_MEMBER);
        service.confirmInvoice(1L, null);
        assertEquals(3, stock.getCurrentStock());

        SalesInvoiceResponseDTO res = service.cancelInvoice(1L);

        assertEquals("CANCELLED", res.getStatus());
        assertEquals(5, stock.getCurrentStock());
        verify(financialEventService).onSalesInvoiceCancelled(any());
    }

    @Test
    void partPaymentLeavesBalanceOnAccountAndOverpaymentIsRefused() {
        SalesInvoiceRequestDTO req = walkIn(line(10, 2, "100.00", "0"));
        req.setCustomerType("MEMBER");
        req.setMemberId(2L);
        com.company.project.entities.Member m = new com.company.project.entities.Member();
        m.setName("Gokul");
        when(memberRepository.findById(2L)).thenAnswer(a -> { m.setId(2L); return Optional.of(m); });
        service.createInvoice(req);

        SalesInvoiceResponseDTO res = service.confirmInvoice(1L, pay("110.00"));
        assertEquals("PARTIAL", res.getPaymentStatus());
        assertEquals(new BigDecimal("110.00"), res.getAmountPaid());

        assertThrows(BusinessRuleViolationException.class, () -> service.recordPayment(1L, pay("100.01")));
        SalesInvoiceResponseDTO paid = service.recordPayment(1L, pay("100.00"));
        assertEquals("PAID", paid.getPaymentStatus());
    }

    @Test
    void paidInvoiceCannotBeCancelled() {
        service.createInvoice(walkIn(line(10, 1, "100.00", "0")));
        service.confirmInvoice(1L, pay("105.00"));

        assertThrows(BusinessRuleViolationException.class, () -> service.cancelInvoice(1L));
    }
}
