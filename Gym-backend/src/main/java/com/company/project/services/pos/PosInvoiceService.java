package com.company.project.services.pos;

import com.company.project.entities.SaleTransaction;
import com.company.project.entities.SaleTransactionItem;
import com.company.project.entities.SalesInvoice;
import com.company.project.entities.SalesInvoiceItem;
import com.company.project.repositories.SaleTransactionItemRepository;
import com.company.project.repositories.SalesInvoiceItemRepository;
import com.company.project.repositories.SalesInvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static com.company.project.services.pos.PosSupport.nz;
import static com.company.project.services.pos.PosSupport.r2;

/**
 * Mirrors every POS sale into Sales & Purchases › Sales Invoice (source = POS), so the back
 * office sees counter sales next to manual invoices. The mirror is read-only there: the POS
 * already moved stock and posted the ledger, so the invoice is created CONFIRMED with
 * stock_deducted = true and no financial event is raised for it. Credit collected later and
 * POS returns re-sync its paid / returned figures.
 */
@Service
@Transactional
public class PosInvoiceService {

    static final String INVOICE_PREFIX = "POS-";

    private final SalesInvoiceRepository invoiceRepo;
    private final SalesInvoiceItemRepository invoiceItemRepo;
    private final SaleTransactionItemRepository saleItemRepo;

    public PosInvoiceService(SalesInvoiceRepository invoiceRepo, SalesInvoiceItemRepository invoiceItemRepo,
                             SaleTransactionItemRepository saleItemRepo) {
        this.invoiceRepo = invoiceRepo;
        this.invoiceItemRepo = invoiceItemRepo;
        this.saleItemRepo = saleItemRepo;
    }

    /** Invoice number for a POS sale: TXN-0000000042 → POS-0000000042. */
    static String invoiceNumberFor(SaleTransaction t) {
        String digits = t.getTransactionNumber() == null ? "" : t.getTransactionNumber().replaceFirst("^\\D+", "");
        return INVOICE_PREFIX + (digits.isEmpty() ? String.format("%010d", t.getId()) : digits);
    }

    /** Creates the sale's invoice on first call; later calls refresh its paid / returned figures. */
    public SalesInvoice sync(SaleTransaction t) {
        SalesInvoice inv = invoiceRepo.findByPosTransactionId(t.getId()).orElse(null);
        boolean created = inv == null;
        if (created) {
            inv = new SalesInvoice();
            inv.setSource(SalesInvoice.SOURCE_POS);
            inv.setPosTransactionId(t.getId());
            inv.setInvoiceNumber(invoiceNumberFor(t));
            inv.setInvoiceDate(t.getBusinessDate());
            inv.setDueDate(t.getBusinessDate());
            inv.setPaymentTerms("POS");
            inv.setReference(t.getTransactionNumber());
            inv.setSalesperson(t.getCashierName());
            inv.setPricesIncludeTax(Boolean.TRUE.equals(t.getTaxInclusive()));
            inv.setSubtotal(nz(t.getSubtotal()));
            inv.setDiscountAmount(nz(t.getLineDiscountAmount()));
            // Footer discount = the cashier's bill discount plus any promotion / coupon discount.
            inv.setFooterDiscount(r2(nz(t.getBillDiscountAmount()).add(nz(t.getCodeDiscountAmount()))));
            inv.setTaxableAmount(nz(t.getTaxableAmount()));
            inv.setTaxAmount(nz(t.getTaxAmount()));
            inv.setDeliveryCharge(BigDecimal.ZERO);
            inv.setRoundOff(BigDecimal.ZERO);
            inv.setTotalAmount(nz(t.getTotalAmount()));
            inv.setTotalCogs(nz(t.getTotalCogs()));
            inv.setStockDeducted(true);
            inv.setNotes(t.getNotes());
            inv.setInternalNotes("Recorded from POS"
                    + (t.getTerminalName() != null ? " · " + t.getTerminalName() : "")
                    + (t.getCashierName() != null ? " · cashier " + t.getCashierName() : ""));
            inv.setBranchId(t.getBranchId());
        }
        // Customer and payment follow the sale — an approved POS correction can change either.
        inv.setCustomerType(t.getMemberId() != null ? SalesInvoice.CUSTOMER_MEMBER : SalesInvoice.CUSTOMER_WALK_IN);
        inv.setMemberId(t.getMemberId());
        inv.setCustomerName(t.getMemberName());
        inv.setCustomerPhone(t.getMemberPhone());
        inv.setPaymentMethod(t.getPaymentMethod());
        inv.setPaymentBreakdown(t.getPaymentBreakdown());
        inv.setStatus("VOIDED".equals(t.getStatus()) ? "CANCELLED" : "CONFIRMED");
        BigDecimal total = nz(t.getTotalAmount());
        BigDecimal outstanding = nz(t.getCreditAmount()).subtract(nz(t.getCreditSettledAmount())).max(BigDecimal.ZERO);
        BigDecimal paid = total.subtract(outstanding).max(BigDecimal.ZERO);
        inv.setAmountPaid(r2(paid));
        inv.setPaymentStatus(outstanding.signum() <= 0 ? "PAID" : paid.signum() > 0 ? "PARTIAL" : "UNPAID");
        inv.setReturnedAmount(r2(nz(t.getRefundedAmount())));
        inv = invoiceRepo.save(inv);

        if (created) {
            for (SaleTransactionItem i : saleItemRepo.findByTransactionId(t.getId())) invoiceItemRepo.save(item(inv.getId(), i));
        }
        return inv;
    }

    private static SalesInvoiceItem item(Long invoiceId, SaleTransactionItem i) {
        BigDecimal taxable = i.getTaxableAmount() != null ? i.getTaxableAmount()
                : nz(i.getTotalAmount()).subtract(nz(i.getTaxAmount()));
        SalesInvoiceItem it = new SalesInvoiceItem();
        it.setInvoiceId(invoiceId);
        it.setProductId(i.getProductId());
        it.setProductName(i.getProductName());
        it.setProductSku(i.getProductSku());
        it.setWarehouseId(i.getWarehouseId());
        it.setQuantity(i.getQuantity() != null ? i.getQuantity() : 0);
        it.setUnitPrice(nz(i.getUnitPrice()));
        it.setDiscountPercent(nz(i.getDiscountPercent()));
        it.setDiscountAmount(nz(i.getDiscountAmount()));
        it.setFooterDiscountShare(nz(i.getBillDiscountShare()));
        it.setTaxPercent(nz(i.getTaxRate()));
        it.setTaxableAmount(r2(taxable));
        it.setTaxAmount(nz(i.getTaxAmount()));
        it.setTotalAmount(r2(taxable.add(nz(i.getTaxAmount()))));
        it.setCostPrice(nz(i.getCostPrice()));
        return it;
    }
}
