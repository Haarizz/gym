package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.RecordBillPaymentRequestDTO;
import com.company.project.dto.SalesInvoiceItemDTO;
import com.company.project.dto.SalesInvoiceRequestDTO;
import com.company.project.dto.SalesInvoiceResponseDTO;
import com.company.project.dto.SalesInvoicesPageResponseDTO;
import com.company.project.entities.FinancialSetting;
import com.company.project.entities.Member;
import com.company.project.entities.Product;
import com.company.project.entities.ProductStock;
import com.company.project.entities.ReceiptVoucher;
import com.company.project.entities.SalesInvoice;
import com.company.project.entities.SalesInvoiceItem;
import com.company.project.entities.Warehouse;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.FinancialSettingRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ProductRepository;
import com.company.project.repositories.ProductStockRepository;
import com.company.project.repositories.SalesInvoiceItemRepository;
import com.company.project.repositories.SalesInvoiceRepository;
import com.company.project.repositories.WarehouseRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Back-office Sales Invoice (Sales & Purchases › Sales Invoice), ported from BillBull.
 * Direct sales only — to a member (on account allowed) or a walk-in customer (paid in full).
 *
 * Lifecycle: DRAFT (editable, no stock / ledger effect) → CONFIRMED (stock out per line
 * warehouse when Stock Check is on, receivable + revenue + VAT + COGS posted, payments
 * recorded against it) → CANCELLED (only while unpaid; stock and ledger reversed).
 */
@Service
@Transactional
public class SalesInvoiceService {

    /** Same switch the POS follows — Sales & Purchases › Settings › Stock Check. */
    private static final String STOCK_CHECK_SETTING_KEY = "stock_check_enabled";
    private static final String WALK_IN_NAME = "Walk-in Customer";
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal CENT = new BigDecimal("0.01");
    private static final BigDecimal MAX_ROUND_OFF = BigDecimal.ONE;

    private final SalesInvoiceRepository invoiceRepository;
    private final SalesInvoiceItemRepository itemRepository;
    private final ProductRepository productRepository;
    private final ProductStockRepository productStockRepository;
    private final WarehouseRepository warehouseRepository;
    private final MemberRepository memberRepository;
    private final FinancialSettingRepository financialSettingRepository;
    private final FinancialEventService financialEventService;
    private final ReceiptVoucherService receiptVoucherService;

    /** Optional (absent in unit tests): branch tax policy — Settings › Tax Configuration. */
    private com.company.project.services.TaxPolicyService taxPolicy;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setTaxPolicy(@org.springframework.context.annotation.Lazy com.company.project.services.TaxPolicyService taxPolicy) {
        this.taxPolicy = taxPolicy;
    }

    public SalesInvoiceService(SalesInvoiceRepository invoiceRepository,
                               SalesInvoiceItemRepository itemRepository,
                               ProductRepository productRepository,
                               ProductStockRepository productStockRepository,
                               WarehouseRepository warehouseRepository,
                               MemberRepository memberRepository,
                               FinancialSettingRepository financialSettingRepository,
                               FinancialEventService financialEventService,
                               ReceiptVoucherService receiptVoucherService) {
        this.invoiceRepository          = invoiceRepository;
        this.itemRepository             = itemRepository;
        this.productRepository          = productRepository;
        this.productStockRepository     = productStockRepository;
        this.warehouseRepository        = warehouseRepository;
        this.memberRepository           = memberRepository;
        this.financialSettingRepository = financialSettingRepository;
        this.financialEventService      = financialEventService;
        this.receiptVoucherService      = receiptVoucherService;
    }

    /** Defaults to ON (the POS's existing behaviour) until explicitly turned off. */
    private boolean isStockCheckEnabled() {
        return financialSettingRepository.findBySettingKey(STOCK_CHECK_SETTING_KEY)
                .map(FinancialSetting::getSettingValue)
                .map(value -> !"false".equalsIgnoreCase(value))
                .orElse(true);
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public SalesInvoiceResponseDTO createInvoice(SalesInvoiceRequestDTO req) {
        SalesInvoice invoice = new SalesInvoice();
        invoice.setStatus("DRAFT");
        invoice.setPaymentStatus("UNPAID");
        invoice.setAmountPaid(BigDecimal.ZERO);
        applyHeader(invoice, req);
        List<SalesInvoiceItem> items = buildItems(req.getItems());
        computeTotals(invoice, items);

        invoice = invoiceRepository.save(invoice);
        invoice.setInvoiceNumber("SI-" + String.format("%08d", invoice.getId()));
        invoice = invoiceRepository.save(invoice);

        saveItems(invoice.getId(), items);
        return toDto(invoice);
    }

    public SalesInvoiceResponseDTO updateInvoice(Long id, SalesInvoiceRequestDTO req) {
        SalesInvoice invoice = findForUpdate(id);
        if (!"DRAFT".equals(invoice.getStatus())) {
            throw new BusinessRuleViolationException("Only draft invoices can be edited. " + invoice.getInvoiceNumber() + " is " + invoice.getStatus() + ".");
        }
        applyHeader(invoice, req);
        List<SalesInvoiceItem> items = buildItems(req.getItems());
        computeTotals(invoice, items);
        invoice = invoiceRepository.save(invoice);

        itemRepository.deleteByInvoiceId(invoice.getId());
        itemRepository.flush();
        saveItems(invoice.getId(), items);
        return toDto(invoice);
    }

    public void deleteInvoice(Long id) {
        SalesInvoice invoice = findForUpdate(id);
        if (!"DRAFT".equals(invoice.getStatus())) {
            throw new BusinessRuleViolationException("Only draft invoices can be deleted — cancel " + invoice.getInvoiceNumber() + " instead.");
        }
        itemRepository.deleteByInvoiceId(invoice.getId());
        invoiceRepository.delete(invoice);
    }

    /**
     * Posts a draft: takes the goods out of stock (Stock Check on), books the receivable,
     * revenue, VAT and COGS, then applies `payment` if one is given. A walk-in sale has no
     * account to owe on, so it must be paid in full here. All-or-nothing: if stock is short
     * or the payment is invalid, nothing is posted.
     */
    public SalesInvoiceResponseDTO confirmInvoice(Long id, RecordBillPaymentRequestDTO payment) {
        SalesInvoice invoice = findForUpdate(id);
        if (!"DRAFT".equals(invoice.getStatus())) {
            throw new BusinessRuleViolationException("Only draft invoices can be confirmed. " + invoice.getInvoiceNumber() + " is " + invoice.getStatus() + ".");
        }
        List<SalesInvoiceItem> items = itemRepository.findByInvoiceIdOrderByIdAsc(invoice.getId());
        if (items.isEmpty()) {
            throw new BusinessRuleViolationException("Add at least one item before confirming the invoice.");
        }

        BigDecimal total = nz(invoice.getTotalAmount());
        BigDecimal paying = payment != null ? r2(nz(payment.getAmount())) : BigDecimal.ZERO;
        if (paying.signum() < 0) throw new BusinessRuleViolationException("Payment amount cannot be negative.");
        if (paying.compareTo(total) > 0) {
            throw new BusinessRuleViolationException("Payment of " + paying + " is more than the invoice total (" + total + ").");
        }
        if (isWalkIn(invoice) && total.subtract(paying).compareTo(CENT) >= 0) {
            throw new BusinessRuleViolationException("Walk-in sales must be paid in full when confirming (" + total
                    + "). To sell on account, choose a member as the customer.");
        }

        boolean stockCheck = isStockCheckEnabled();
        if (stockCheck) takeStock(items);

        BigDecimal cogs = BigDecimal.ZERO;
        for (SalesInvoiceItem item : items) {
            BigDecimal cost = productRepository.findById(item.getProductId())
                    .map(Product::getCostPrice).orElse(BigDecimal.ZERO);
            item.setCostPrice(r2(nz(cost)));
            cogs = cogs.add(nz(cost).multiply(BigDecimal.valueOf(qty(item))));
        }
        itemRepository.saveAll(items);

        invoice.setTotalCogs(r2(cogs));
        invoice.setStockDeducted(stockCheck);
        invoice.setStatus("CONFIRMED");
        invoice.setPaymentStatus(total.signum() > 0 ? "UNPAID" : "PAID");
        invoice = invoiceRepository.save(invoice);

        financialEventService.onSalesInvoiceConfirmed(invoice);

        if (paying.signum() > 0) {
            invoice = applyPayment(invoice, paying, payment);
        }
        return toDto(invoice);
    }

    public SalesInvoiceResponseDTO recordPayment(Long id, RecordBillPaymentRequestDTO req) {
        SalesInvoice invoice = findForUpdate(id);
        if (invoice.isPos()) {
            throw new BusinessRuleViolationException(invoice.getInvoiceNumber() + " is a POS sale. Collect its credit from "
                    + "Point of Sale › Customers & credit so the POS sale and the till stay in step.");
        }
        if (!"CONFIRMED".equals(invoice.getStatus())) {
            throw new BusinessRuleViolationException("Payments can only be recorded on confirmed invoices. " + invoice.getInvoiceNumber() + " is " + invoice.getStatus() + ".");
        }
        BigDecimal amount = req != null ? r2(nz(req.getAmount())) : BigDecimal.ZERO;
        if (amount.signum() <= 0) throw new BusinessRuleViolationException("Payment amount must be greater than 0.");
        BigDecimal balance = balanceOf(invoice);
        if (amount.compareTo(balance) > 0) {
            throw new BusinessRuleViolationException("Payment of " + amount + " is more than the balance due (" + balance.max(BigDecimal.ZERO) + ").");
        }
        return toDto(applyPayment(invoice, amount, req));
    }

    public SalesInvoiceResponseDTO cancelInvoice(Long id) {
        SalesInvoice invoice = findForUpdate(id);
        if (invoice.isPos()) {
            throw new BusinessRuleViolationException(invoice.getInvoiceNumber() + " is a POS sale and can't be cancelled here. "
                    + "Use a sales return on the POS terminal.");
        }
        if ("CANCELLED".equals(invoice.getStatus())) {
            throw new BusinessRuleViolationException("Invoice is already cancelled.");
        }
        // Money already received against it would be stranded (voucher + ledger stay posted).
        if (nz(invoice.getAmountPaid()).signum() > 0) {
            throw new BusinessRuleViolationException("Invoice " + invoice.getInvoiceNumber() + " has payments recorded ("
                    + invoice.getAmountPaid() + ") and can't be cancelled. Settle it with a credit note instead.");
        }

        if ("CONFIRMED".equals(invoice.getStatus())) {
            if (Boolean.TRUE.equals(invoice.getStockDeducted())) {
                for (SalesInvoiceItem item : itemRepository.findByInvoiceIdOrderByIdAsc(invoice.getId())) {
                    if (item.getWarehouseId() != null) restoreStock(item.getProductId(), item.getWarehouseId(), qty(item));
                }
            }
            financialEventService.onSalesInvoiceCancelled(invoice);
        }

        invoice.setStatus("CANCELLED");
        return toDto(invoiceRepository.save(invoice));
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SalesInvoiceResponseDTO getInvoiceById(Long id) {
        return toDto(find(id));
    }

    @Transactional(readOnly = true)
    public SalesInvoicesPageResponseDTO getInvoices(int page, int size, String status, String search) {
        return getInvoices(page, size, status, search, null);
    }

    /** @param source MANUAL, POS, or null/blank for both. */
    @Transactional(readOnly = true)
    public SalesInvoicesPageResponseDTO getInvoices(int page, int size, String status, String search, String source) {
        Pageable pageable = PageRequest.of(Math.max(page, 1) - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<SalesInvoice> result = invoiceRepository.findAll(buildSpec(status, search, source), pageable);
        List<SalesInvoiceResponseDTO> dtos = result.getContent().stream().map(this::toDto).collect(Collectors.toList());
        PaginationDTO pagination = new PaginationDTO(page, size, result.getTotalElements(), result.getTotalPages());
        return new SalesInvoicesPageResponseDTO(dtos, pagination);
    }

    // ── Helpers: header & lines ─────────────────────────────────────────────

    private void applyHeader(SalesInvoice invoice, SalesInvoiceRequestDTO req) {
        LocalDate invoiceDate = req.getInvoiceDate() != null ? req.getInvoiceDate() : LocalDate.now();
        if (req.getDueDate() != null && req.getDueDate().isBefore(invoiceDate)) {
            throw new BusinessRuleViolationException("Due date cannot be before the invoice date.");
        }
        invoice.setInvoiceDate(invoiceDate);
        invoice.setDueDate(req.getDueDate());
        invoice.setPaymentTerms(blankToNull(req.getPaymentTerms()));
        invoice.setReference(blankToNull(req.getReference()));
        invoice.setSalesperson(blankToNull(req.getSalesperson()));

        boolean member = SalesInvoice.CUSTOMER_MEMBER.equalsIgnoreCase(String.valueOf(req.getCustomerType()));
        if (member) {
            if (req.getMemberId() == null) throw new BusinessRuleViolationException("Select the member this invoice is for.");
            Member m = memberRepository.findById(req.getMemberId())
                    .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + req.getMemberId()));
            invoice.setCustomerType(SalesInvoice.CUSTOMER_MEMBER);
            invoice.setMemberId(m.getId());
            invoice.setCustomerName(firstNonBlank(req.getCustomerName(), m.getName()));
            invoice.setCustomerPhone(firstNonBlank(req.getCustomerPhone(), m.getPhone()));
            invoice.setCustomerEmail(firstNonBlank(req.getCustomerEmail(), m.getEmail()));
            invoice.setCustomerAddress(firstNonBlank(req.getCustomerAddress(), m.getAddress()));
        } else {
            invoice.setCustomerType(SalesInvoice.CUSTOMER_WALK_IN);
            invoice.setMemberId(null);
            invoice.setCustomerName(firstNonBlank(req.getCustomerName(), WALK_IN_NAME));
            invoice.setCustomerPhone(blankToNull(req.getCustomerPhone()));
            invoice.setCustomerEmail(blankToNull(req.getCustomerEmail()));
            invoice.setCustomerAddress(blankToNull(req.getCustomerAddress()));
        }
        invoice.setCustomerTrn(blankToNull(req.getCustomerTrn()));

        BigDecimal footer = r2(nz(req.getFooterDiscount()));
        BigDecimal delivery = r2(nz(req.getDeliveryCharge()));
        BigDecimal roundOff = r2(nz(req.getRoundOff()));
        if (footer.signum() < 0) throw new BusinessRuleViolationException("Footer discount cannot be negative.");
        if (delivery.signum() < 0) throw new BusinessRuleViolationException("Delivery charge cannot be negative.");
        if (roundOff.abs().compareTo(MAX_ROUND_OFF) > 0) {
            throw new BusinessRuleViolationException("Round-off must be between -1.00 and 1.00.");
        }
        invoice.setPricesIncludeTax(Boolean.TRUE.equals(req.getPricesIncludeTax()));
        invoice.setFooterDiscount(footer);
        invoice.setDeliveryCharge(delivery);
        invoice.setRoundOff(roundOff);
        invoice.setNotes(blankToNull(req.getNotes()));
        invoice.setInternalNotes(blankToNull(req.getInternalNotes()));
    }

    private List<SalesInvoiceItem> buildItems(List<SalesInvoiceItemDTO> reqs) {
        if (reqs == null || reqs.isEmpty()) {
            throw new BusinessRuleViolationException("Add at least one item to the invoice.");
        }
        List<SalesInvoiceItem> items = new ArrayList<>();
        int line = 0;
        for (SalesInvoiceItemDTO dto : reqs) {
            line++;
            if (dto.getProductId() == null) {
                throw new BusinessRuleViolationException("Line " + line + ": pick a product from the catalog.");
            }
            Product product = productRepository.findById(dto.getProductId())
                    .orElseThrow(() -> new EntityNotFoundException("Product not found with id: " + dto.getProductId()));
            if (dto.getQuantity() == null || dto.getQuantity() < 1) {
                throw new BusinessRuleViolationException("Line " + line + " (" + product.getName() + "): quantity must be at least 1.");
            }
            BigDecimal price = dto.getUnitPrice() != null ? dto.getUnitPrice() : nz(product.getSellingPrice());
            if (price.signum() < 0) {
                throw new BusinessRuleViolationException("Line " + line + " (" + product.getName() + "): price cannot be negative.");
            }
            BigDecimal disc = nz(dto.getDiscountPercent());
            if (disc.signum() < 0 || disc.compareTo(HUNDRED) > 0) {
                throw new BusinessRuleViolationException("Line " + line + " (" + product.getName() + "): discount must be between 0 and 100%.");
            }
            if (disc.signum() > 0 && Boolean.FALSE.equals(product.getAllowDiscount())) {
                throw new BusinessRuleViolationException("Line " + line + " (" + product.getName() + "): discounts are not allowed on this product.");
            }
            BigDecimal productMax = nz(product.getMaxDiscountPercent());
            if (productMax.signum() > 0 && disc.compareTo(productMax) > 0) {
                throw new BusinessRuleViolationException("Line " + line + " (" + product.getName() + "): the maximum discount is "
                        + productMax.stripTrailingZeros().toPlainString() + "%.");
            }
            if (dto.getWarehouseId() != null && !warehouseRepository.existsById(dto.getWarehouseId())) {
                throw new EntityNotFoundException("Warehouse not found with id: " + dto.getWarehouseId());
            }

            SalesInvoiceItem item = new SalesInvoiceItem();
            item.setProductId(product.getId());
            item.setProductName(firstNonBlank(dto.getProductName(), product.getName()));
            item.setProductSku(firstNonBlank(dto.getProductSku(), product.getSku()));
            item.setUnitOfMeasure(firstNonBlank(dto.getUnitOfMeasure(), product.getDefaultUnit()));
            item.setWarehouseId(dto.getWarehouseId());
            item.setQuantity(dto.getQuantity());
            item.setUnitPrice(r2(price));
            item.setDiscountPercent(disc.setScale(2, RoundingMode.HALF_UP));
            // VAT follows the branch tax policy (or the product's own rate) — never the client.
            item.setTaxPercent((taxPolicy != null ? taxPolicy.salesRate(product) : nz(product.getTaxRate())).setScale(2, RoundingMode.HALF_UP));
            item.setNotes(blankToNull(dto.getNotes()));
            items.add(item);
        }
        return items;
    }

    private void saveItems(Long invoiceId, List<SalesInvoiceItem> items) {
        for (SalesInvoiceItem item : items) {
            item.setId(null);
            item.setInvoiceId(invoiceId);
        }
        itemRepository.saveAll(items);
    }

    /**
     * Invoice math (mirrored by the editor's salesInvoiceUtils.invoiceTotals):
     * line gross = qty × price, less its discount → net; the footer discount is spread
     * over the lines in proportion to net (the last line takes the rounding remainder);
     * VAT is then added on top (VAT Excl.) or extracted from the price (VAT Incl.).
     * Total = taxable + VAT + delivery charge + round-off.
     */
    private void computeTotals(SalesInvoice invoice, List<SalesInvoiceItem> items) {
        boolean inclusive = Boolean.TRUE.equals(invoice.getPricesIncludeTax());
        int n = items.size();
        BigDecimal[] nets = new BigDecimal[n];
        BigDecimal gross = BigDecimal.ZERO, discount = BigDecimal.ZERO, netSum = BigDecimal.ZERO;
        int lastWithNet = -1;
        for (int i = 0; i < n; i++) {
            SalesInvoiceItem item = items.get(i);
            BigDecimal g = r2(nz(item.getUnitPrice()).multiply(BigDecimal.valueOf(qty(item))));
            BigDecimal d = pct(g, item.getDiscountPercent());
            nets[i] = g.subtract(d);
            item.setDiscountAmount(d);
            gross = gross.add(g);
            discount = discount.add(d);
            netSum = netSum.add(nets[i]);
            if (nets[i].signum() > 0) lastWithNet = i;
        }

        BigDecimal footer = nz(invoice.getFooterDiscount()).min(netSum).max(BigDecimal.ZERO);
        BigDecimal remaining = footer, footerApplied = BigDecimal.ZERO;
        BigDecimal taxable = BigDecimal.ZERO, tax = BigDecimal.ZERO;
        for (int i = 0; i < n; i++) {
            SalesInvoiceItem item = items.get(i);
            BigDecimal share = BigDecimal.ZERO;
            if (footer.signum() > 0 && nets[i].signum() > 0) {
                share = i == lastWithNet ? remaining : footer.multiply(nets[i]).divide(netSum, 2, RoundingMode.HALF_UP);
                share = share.min(nets[i]).max(BigDecimal.ZERO);
                remaining = remaining.subtract(share);
            }
            BigDecimal after = nets[i].subtract(share);
            BigDecimal rate = nz(item.getTaxPercent());
            BigDecimal lineTaxable, lineTax;
            if (inclusive) {
                lineTaxable = after.multiply(HUNDRED).divide(HUNDRED.add(rate), 2, RoundingMode.HALF_UP);
                lineTax = after.subtract(lineTaxable);
            } else {
                lineTaxable = after;
                lineTax = pct(after, rate);
            }
            item.setFooterDiscountShare(share);
            item.setTaxableAmount(lineTaxable);
            item.setTaxAmount(lineTax);
            item.setTotalAmount(lineTaxable.add(lineTax));
            footerApplied = footerApplied.add(share);
            taxable = taxable.add(lineTaxable);
            tax = tax.add(lineTax);
        }

        BigDecimal total = taxable.add(tax).add(nz(invoice.getDeliveryCharge())).add(nz(invoice.getRoundOff()));
        if (total.signum() < 0) throw new BusinessRuleViolationException("Invoice total cannot be negative.");

        invoice.setSubtotal(gross);
        invoice.setDiscountAmount(discount);
        invoice.setFooterDiscount(footerApplied);
        invoice.setTaxableAmount(taxable);
        invoice.setTaxAmount(tax);
        invoice.setTotalAmount(r2(total));
    }

    // ── Helpers: stock ──────────────────────────────────────────────────────

    /**
     * Stock Check on: every line leaves from a warehouse (the first active one when the
     * line has none), each product × warehouse must hold the combined quantity of its
     * lines, and only then is anything deducted — so a shortfall on one line posts nothing.
     */
    private void takeStock(List<SalesInvoiceItem> items) {
        Long fallback = null;
        Map<String, Integer> needed = new LinkedHashMap<>();
        Map<String, SalesInvoiceItem> sample = new LinkedHashMap<>();
        for (SalesInvoiceItem item : items) {
            if (item.getWarehouseId() == null) {
                if (fallback == null) fallback = defaultWarehouseId();
                if (fallback == null) {
                    throw new BusinessRuleViolationException("No warehouse exists to take " + item.getProductName()
                            + " from. Add a warehouse or turn off Stock Check in Sales Settings.");
                }
                item.setWarehouseId(fallback);
            }
            String key = item.getProductId() + ":" + item.getWarehouseId();
            needed.merge(key, qty(item), Integer::sum);
            sample.putIfAbsent(key, item);
        }

        for (Map.Entry<String, Integer> e : needed.entrySet()) {
            SalesInvoiceItem item = sample.get(e.getKey());
            int available = productStockRepository.findForUpdate(item.getProductId(), item.getWarehouseId())
                    .map(s -> s.getCurrentStock() == null ? 0 : s.getCurrentStock()).orElse(0);
            if (available < e.getValue()) {
                String wh = warehouseRepository.findById(item.getWarehouseId()).map(Warehouse::getName).orElse("the selected warehouse");
                throw new BusinessRuleViolationException("Insufficient stock for " + item.getProductName() + " in " + wh
                        + ". Available: " + available + ", required: " + e.getValue() + ".");
            }
        }

        for (Map.Entry<String, Integer> e : needed.entrySet()) {
            SalesInvoiceItem item = sample.get(e.getKey());
            ProductStock stock = productStockRepository.findForUpdate(item.getProductId(), item.getWarehouseId())
                    .orElseThrow(() -> new EntityNotFoundException("Stock not found in warehouse"));
            stock.setCurrentStock((stock.getCurrentStock() == null ? 0 : stock.getCurrentStock()) - e.getValue());
            productStockRepository.save(stock);
        }
    }

    private void restoreStock(Long productId, Long warehouseId, int quantity) {
        ProductStock stock = productStockRepository.findForUpdate(productId, warehouseId).orElseGet(() -> {
            ProductStock s = new ProductStock();
            s.setProductId(productId);
            s.setWarehouseId(warehouseId);
            s.setCurrentStock(0);
            s.setOpeningStock(0);
            s.setReorderLevel(0);
            return s;
        });
        stock.setCurrentStock((stock.getCurrentStock() == null ? 0 : stock.getCurrentStock()) + quantity);
        productStockRepository.save(stock);
    }

    private Long defaultWarehouseId() {
        List<Warehouse> active = warehouseRepository.findByIsActiveTrue();
        if (!active.isEmpty()) return active.get(0).getId();
        List<Warehouse> all = warehouseRepository.findAll();
        return all.isEmpty() ? null : all.get(0).getId();
    }

    // ── Helpers: payments ───────────────────────────────────────────────────

    /**
     * Adds a payment: running total + status on the invoice, every leg kept (stamped with its
     * date) for the Payments tab, a receipt voucher, and DR Cash/Bank · CR Receivable.
     */
    private SalesInvoice applyPayment(SalesInvoice invoice, BigDecimal amount, RecordBillPaymentRequestDTO req) {
        LocalDate paidOn = req != null && req.getPaymentDate() != null ? req.getPaymentDate() : LocalDate.now();
        if (paidOn.isAfter(LocalDate.now())) throw new BusinessRuleViolationException("Payment date cannot be in the future.");
        String method = req != null && req.getPaymentMethod() != null && !req.getPaymentMethod().isBlank() ? req.getPaymentMethod() : "CASH";
        List<PaymentSplitDTO> breakdown = req != null ? req.getPaymentBreakdown() : null;

        BigDecimal before = nz(invoice.getAmountPaid());
        BigDecimal after = before.add(amount);
        invoice.setAmountPaid(after);
        String prev = invoice.getPaymentMethod();
        invoice.setPaymentMethod(before.signum() > 0 && prev != null && !prev.equalsIgnoreCase(method) ? "MIXED" : method);

        List<PaymentSplitDTO> newLegs = new ArrayList<>();
        if (breakdown != null && !breakdown.isEmpty()) {
            for (PaymentSplitDTO leg : breakdown) {
                PaymentSplitDTO copy = copyLeg(leg);
                copy.setPaymentDate(paidOn.toString());
                newLegs.add(copy);
            }
        } else {
            PaymentSplitDTO single = new PaymentSplitDTO(modeLabel(method), amount, null);
            single.setPaymentDate(paidOn.toString());
            newLegs.add(single);
        }
        List<PaymentSplitDTO> legs = new ArrayList<>();
        if (invoice.getPaymentBreakdown() != null) legs.addAll(invoice.getPaymentBreakdown());
        legs.addAll(newLegs);
        invoice.setPaymentBreakdown(legs);
        invoice.setPaymentStatus(after.compareTo(nz(invoice.getTotalAmount())) >= 0 ? "PAID" : "PARTIAL");
        invoice = invoiceRepository.save(invoice);

        ReceiptVoucher voucher = receiptVoucherService.createVoucherFromModule(
                "Sales Invoice – " + invoice.getInvoiceNumber(),
                ReceiptVoucherService.SALES_INVOICE_CATEGORY,
                invoice.getCustomerName(),
                invoice.getMemberId(),
                amount,
                modeLabel(method),
                invoice.getInvoiceNumber(),
                invoice.getInvoiceNumber(),
                req != null ? req.getNotes() : null,
                breakdown,
                invoice.getBranchId(),
                paidOn);
        financialEventService.onSalesInvoicePaymentReceived(invoice, voucher, amount, method, breakdown, paidOn);
        return invoice;
    }

    /** Field-by-field copy, so stamping a date never mutates the request's legs (also passed to the voucher). */
    private static PaymentSplitDTO copyLeg(PaymentSplitDTO leg) {
        PaymentSplitDTO c = new PaymentSplitDTO(leg.getMethod(), leg.getAmount(), leg.getReference());
        c.setCardType(leg.getCardType());
        c.setChequeNumber(leg.getChequeNumber());
        c.setChequeDate(leg.getChequeDate());
        c.setBankName(leg.getBankName());
        c.setBankAccountCode(leg.getBankAccountCode());
        c.setBankAccountName(leg.getBankAccountName());
        c.setOnlinePaymentType(leg.getOnlinePaymentType());
        c.setProviderName(leg.getProviderName());
        return c;
    }

    private static String modeLabel(String method) {
        if (method == null) return "Cash";
        return switch (method.trim().toUpperCase(Locale.ROOT).replace(' ', '_')) {
            case "CASH" -> "Cash";
            case "CARD", "CREDIT_CARD", "DEBIT_CARD" -> "Card";
            case "ONLINE", "ONLINE_PAYMENT", "BANK_TRANSFER" -> "Online";
            case "CHEQUE", "CHECK" -> "Cheque";
            case "MIXED" -> "Mixed";
            default -> method;
        };
    }

    // ── Helpers: misc ───────────────────────────────────────────────────────

    private SalesInvoice find(Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sales invoice not found with id: " + id));
    }

    /** Locked read for every write path — see SalesInvoiceRepository.findByIdForUpdate. */
    private SalesInvoice findForUpdate(Long id) {
        return invoiceRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new EntityNotFoundException("Sales invoice not found with id: " + id));
    }

    private SalesInvoiceResponseDTO toDto(SalesInvoice invoice) {
        return SalesInvoiceResponseDTO.fromEntity(invoice, itemRepository.findByInvoiceIdOrderByIdAsc(invoice.getId()));
    }

    private static boolean isWalkIn(SalesInvoice invoice) {
        return !SalesInvoice.CUSTOMER_MEMBER.equals(invoice.getCustomerType());
    }

    private static BigDecimal balanceOf(SalesInvoice invoice) {
        return nz(invoice.getTotalAmount()).subtract(nz(invoice.getAmountPaid()));
    }

    private static int qty(SalesInvoiceItem item) {
        return item.getQuantity() != null ? item.getQuantity() : 0;
    }

    private static BigDecimal pct(BigDecimal amount, BigDecimal percent) {
        return amount.multiply(nz(percent)).divide(HUNDRED, 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal r2(BigDecimal v) { return v.setScale(2, RoundingMode.HALF_UP); }

    private static BigDecimal nz(BigDecimal v) { return v != null ? v : BigDecimal.ZERO; }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }

    private static String firstNonBlank(String a, String b) {
        String x = blankToNull(a);
        return x != null ? x : blankToNull(b);
    }

    private Specification<SalesInvoice> buildSpec(String status, String search, String source) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (source != null && !source.isBlank()) {
                String src = source.trim().toUpperCase(Locale.ROOT);
                predicates.add(SalesInvoice.SOURCE_MANUAL.equals(src)
                        ? cb.or(cb.isNull(root.get("source")), cb.equal(root.get("source"), src))
                        : cb.equal(root.get("source"), src));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status.trim().toUpperCase(Locale.ROOT)));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("invoiceNumber")), like),
                        cb.like(cb.lower(root.get("customerName")), like),
                        cb.like(cb.lower(root.get("customerPhone")), like),
                        cb.like(cb.lower(root.get("reference")), like)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
