package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.RecordBillPaymentRequestDTO;
import com.company.project.dto.SupplierBillItemDTO;
import com.company.project.dto.SupplierBillRequestDTO;
import com.company.project.dto.SupplierBillResponseDTO;
import com.company.project.dto.SupplierBillsPageResponseDTO;
import com.company.project.entities.Product;
import com.company.project.entities.ProductStock;
import com.company.project.entities.Supplier;
import com.company.project.entities.SupplierBill;
import com.company.project.entities.SupplierBillItem;
import com.company.project.entities.Warehouse;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.ProductRepository;
import com.company.project.repositories.ProductStockRepository;
import com.company.project.repositories.SupplierBillItemRepository;
import com.company.project.repositories.SupplierBillRepository;
import com.company.project.repositories.SupplierRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class SupplierBillService {

    private final SupplierBillRepository supplierBillRepository;
    private final SupplierBillItemRepository supplierBillItemRepository;
    private final SupplierRepository supplierRepository;
    private final ProductStockRepository productStockRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;

    private final FinancialEventService financialEventService;
    private final PaymentVoucherService paymentVoucherService;

    public SupplierBillService(SupplierBillRepository supplierBillRepository,
                               SupplierBillItemRepository supplierBillItemRepository,
                               SupplierRepository supplierRepository,
                               ProductStockRepository productStockRepository,
                               ProductRepository productRepository,
                               WarehouseRepository warehouseRepository,
                               FinancialEventService financialEventService,
                               PaymentVoucherService paymentVoucherService) {
        this.supplierBillRepository     = supplierBillRepository;
        this.supplierBillItemRepository = supplierBillItemRepository;
        this.supplierRepository         = supplierRepository;
        this.productStockRepository     = productStockRepository;
        this.productRepository          = productRepository;
        this.warehouseRepository        = warehouseRepository;
        this.financialEventService      = financialEventService;
        this.paymentVoucherService      = paymentVoucherService;
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public SupplierBillResponseDTO createBill(SupplierBillRequestDTO req) {
        Supplier supplier = supplierRepository.findById(req.getSupplierId())
                .orElseThrow(() -> new EntityNotFoundException("Supplier not found with id: " + req.getSupplierId()));

        SupplierBill bill = new SupplierBill();
        bill.setSupplierId(supplier.getId());
        bill.setSupplierName(supplier.getName());
        bill.setPurchaseOrderId(req.getPurchaseOrderId());
        bill.setInvoiceNumber(req.getInvoiceNumber());
        bill.setBillDate(req.getBillDate());
        bill.setDueDate(req.getDueDate());
        bill.setShippingCost(req.getShippingCost() != null ? req.getShippingCost() : BigDecimal.ZERO);
        bill.setWarehouseId(req.getWarehouseId());
        bill.setPriority(req.getPriority() != null ? req.getPriority() : "MEDIUM");
        bill.setNotes(req.getNotes());
        bill.setReceivedBy(req.getReceivedBy());
        bill.setTaxCode(req.getTaxCode());
        bill.setStatus("DRAFT");
        bill.setPaymentStatus("UNPAID");
        bill.setAmountPaid(BigDecimal.ZERO);

        // Save to get id
        bill = supplierBillRepository.save(bill);

        // Generate bill number
        bill.setBillNumber("BIL-" + String.format("%08d", bill.getId()));
        bill = supplierBillRepository.save(bill);

        // Save items and compute totals
        List<SupplierBillItemDTO> itemReqs = req.getItems() != null ? req.getItems() : new ArrayList<>();
        final Long billId = bill.getId();
        for (SupplierBillItemDTO itemDto : itemReqs) {
            supplierBillItemRepository.save(buildItem(billId, itemDto));
        }

        // Recalculate totals from saved items
        List<SupplierBillItem> savedItems = supplierBillItemRepository.findByBillId(bill.getId());
        computeAndSetTotals(bill, itemReqs, savedItems);
        bill = supplierBillRepository.save(bill);

        return SupplierBillResponseDTO.fromEntity(bill, savedItems);
    }

    public SupplierBillResponseDTO updateBill(Long id, SupplierBillRequestDTO req) {
        SupplierBill bill = supplierBillRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Supplier bill not found with id: " + id));

        if (!"DRAFT".equals(bill.getStatus())) {
            throw new BusinessRuleViolationException("Cannot edit supplier bill in status: " + bill.getStatus());
        }

        Supplier supplier = supplierRepository.findById(req.getSupplierId())
                .orElseThrow(() -> new EntityNotFoundException("Supplier not found with id: " + req.getSupplierId()));

        bill.setSupplierId(supplier.getId());
        bill.setSupplierName(supplier.getName());
        bill.setPurchaseOrderId(req.getPurchaseOrderId());
        bill.setInvoiceNumber(req.getInvoiceNumber());
        bill.setBillDate(req.getBillDate());
        bill.setDueDate(req.getDueDate());
        if (req.getShippingCost() != null) bill.setShippingCost(req.getShippingCost());
        bill.setWarehouseId(req.getWarehouseId());
        if (req.getPriority() != null) bill.setPriority(req.getPriority());
        bill.setNotes(req.getNotes());
        bill.setReceivedBy(req.getReceivedBy());
        bill.setTaxCode(req.getTaxCode());

        // Delete existing items and save new
        supplierBillItemRepository.deleteByBillId(bill.getId());

        List<SupplierBillItemDTO> itemReqs = req.getItems() != null ? req.getItems() : new ArrayList<>();
        final Long billId = bill.getId();
        for (SupplierBillItemDTO itemDto : itemReqs) {
            supplierBillItemRepository.save(buildItem(billId, itemDto));
        }

        List<SupplierBillItem> savedItems = supplierBillItemRepository.findByBillId(bill.getId());
        computeAndSetTotals(bill, itemReqs, savedItems);
        bill = supplierBillRepository.save(bill);

        return SupplierBillResponseDTO.fromEntity(bill, savedItems);
    }

    public SupplierBillResponseDTO confirmBill(Long id) {
        SupplierBill bill = supplierBillRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Supplier bill not found with id: " + id));

        if (!"DRAFT".equals(bill.getStatus())) {
            throw new BusinessRuleViolationException("Only DRAFT bills can be confirmed. Current status: " + bill.getStatus());
        }

        // Bills created before warehouse selection existed on the purchase form (or where the
        // user just left it unset) would otherwise silently skip the stock-in below — fall back
        // to a real warehouse instead, and persist it so cancel/backfill see the same value.
        Long warehouseId = resolveWarehouseId(bill);
        if (warehouseId != null && !warehouseId.equals(bill.getWarehouseId())) {
            bill.setWarehouseId(warehouseId);
        }

        bill.setStatus("CONFIRMED");
        bill = supplierBillRepository.save(bill);

        // Generate journal entry: DR Purchase/COGS + GST Input, CR Accounts Payable
        financialEventService.onSupplierBillConfirmed(bill);

        // Increment stock for each item (only if not linked to a PO, since PO receiveItems handles stock)
        List<SupplierBillItem> items = supplierBillItemRepository.findByBillId(bill.getId());
        if (bill.getPurchaseOrderId() == null) {
            for (SupplierBillItem item : items) {
                if (item.getProductId() != null && warehouseId != null) {
                    applyStockIncrement(item.getProductId(), warehouseId, item.getQuantity() != null ? item.getQuantity() : 0, item.getUnitPrice());
                }
            }
        }

        return SupplierBillResponseDTO.fromEntity(bill, items);
    }

    /**
     * One-time self-heal for bills that were confirmed before the purchase form had a warehouse
     * field (so their stock-in never applied). Safe to call on every startup: it only touches
     * CONFIRMED bills that still have a null warehouseId, and stamps a resolved one on each so
     * it's never reprocessed.
     */
    public void backfillMissingWarehouseStock() {
        List<SupplierBill> orphaned = supplierBillRepository.findAll().stream()
                .filter(b -> "CONFIRMED".equals(b.getStatus()) && b.getWarehouseId() == null)
                .collect(Collectors.toList());

        for (SupplierBill bill : orphaned) {
            Long warehouseId = resolveWarehouseId(bill);
            if (warehouseId == null) continue; // no warehouse exists anywhere yet — nothing to backfill into

            List<SupplierBillItem> items = supplierBillItemRepository.findByBillId(bill.getId());
            for (SupplierBillItem item : items) {
                if (item.getProductId() == null) continue;
                applyStockIncrement(item.getProductId(), warehouseId, item.getQuantity() != null ? item.getQuantity() : 0, item.getUnitPrice());
            }

            bill.setWarehouseId(warehouseId);
            supplierBillRepository.save(bill);
        }
    }

    public SupplierBillResponseDTO cancelBill(Long id) {
        SupplierBill bill = supplierBillRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Supplier bill not found with id: " + id));

        if ("CANCELLED".equals(bill.getStatus())) {
            throw new BusinessRuleViolationException("Bill is already cancelled.");
        }
        // Money already paid against it would be stranded (voucher + ledger stay posted).
        if (bill.getAmountPaid() != null && bill.getAmountPaid().compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessRuleViolationException("Bill " + bill.getBillNumber() + " has payments recorded ("
                    + bill.getAmountPaid() + ") and can't be cancelled. Settle it with a debit note instead.");
        }

        // If CONFIRMED, reverse stock (only if not linked to a PO)
        if ("CONFIRMED".equals(bill.getStatus()) && bill.getPurchaseOrderId() == null) {
            List<SupplierBillItem> items = supplierBillItemRepository.findByBillId(bill.getId());
            for (SupplierBillItem item : items) {
                if (item.getProductId() != null && bill.getWarehouseId() != null) {
                    Optional<ProductStock> stockOpt = productStockRepository
                            .findByProductIdAndWarehouseId(item.getProductId(), bill.getWarehouseId());
                    if (stockOpt.isPresent()) {
                        ProductStock stock = stockOpt.get();
                        int current = stock.getCurrentStock() == null ? 0 : stock.getCurrentStock();
                        int qty = item.getQuantity() != null ? item.getQuantity() : 0;
                        stock.setCurrentStock(Math.max(0, current - qty));
                        productStockRepository.save(stock);
                    }
                }
            }
        }

        bill.setStatus("CANCELLED");
        bill = supplierBillRepository.save(bill);

        List<SupplierBillItem> items = supplierBillItemRepository.findByBillId(bill.getId());
        return SupplierBillResponseDTO.fromEntity(bill, items);
    }

    /** Field-by-field copy, so stamping a date never mutates the request's legs (also passed to the voucher). */
    private static com.company.project.dto.PaymentSplitDTO copyLeg(com.company.project.dto.PaymentSplitDTO leg) {
        com.company.project.dto.PaymentSplitDTO c = new com.company.project.dto.PaymentSplitDTO(leg.getMethod(), leg.getAmount(), leg.getReference());
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

    public SupplierBillResponseDTO recordPayment(Long id, RecordBillPaymentRequestDTO req) {
        SupplierBill bill = supplierBillRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Supplier bill not found with id: " + id));

        if (!"CONFIRMED".equals(bill.getStatus())) {
            throw new BusinessRuleViolationException("Payments can only be recorded on CONFIRMED bills. Current status: " + bill.getStatus());
        }

        BigDecimal amount = req.getAmount() != null ? req.getAmount().setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleViolationException("Payment amount must be greater than 0.");
        }
        BigDecimal total = bill.getTotalAmount() != null ? bill.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal currentPaid = bill.getAmountPaid() != null ? bill.getAmountPaid() : BigDecimal.ZERO;
        BigDecimal balance = total.subtract(currentPaid);
        if (amount.subtract(balance).compareTo(new BigDecimal("0.01")) > 0) {
            throw new BusinessRuleViolationException("Payment of " + amount + " is more than the balance due (" + balance.max(BigDecimal.ZERO) + ").");
        }

        BigDecimal newAmountPaid = currentPaid.add(amount);
        bill.setAmountPaid(newAmountPaid);
        if (req.getPaymentMethod() != null) {
            // More than one payment with different methods reads as "Mixed" on the bill.
            String prev = bill.getPaymentMethod();
            bill.setPaymentMethod(currentPaid.compareTo(BigDecimal.ZERO) > 0 && prev != null && !prev.equalsIgnoreCase(req.getPaymentMethod())
                    ? "Mixed" : req.getPaymentMethod());
        }
        // Keep every payment's legs on the bill (append, don't overwrite earlier payments),
        // each stamped with its payment date for the invoice's Payments tab. A single-method
        // payment arrives without a breakdown — record it as one leg too, otherwise it would
        // be missing from the list as soon as any later payment adds legs.
        String paidOn = (req.getPaymentDate() != null ? req.getPaymentDate() : java.time.LocalDate.now()).toString();
        List<com.company.project.dto.PaymentSplitDTO> newLegs = new ArrayList<>();
        if (req.getPaymentBreakdown() != null && !req.getPaymentBreakdown().isEmpty()) {
            for (com.company.project.dto.PaymentSplitDTO leg : req.getPaymentBreakdown()) {
                com.company.project.dto.PaymentSplitDTO copy = copyLeg(leg);
                copy.setPaymentDate(paidOn);
                newLegs.add(copy);
            }
        } else {
            com.company.project.dto.PaymentSplitDTO single = new com.company.project.dto.PaymentSplitDTO(
                    req.getPaymentMethod() != null ? req.getPaymentMethod() : "Cash", amount, null);
            single.setPaymentDate(paidOn);
            newLegs.add(single);
        }
        List<com.company.project.dto.PaymentSplitDTO> legs = new ArrayList<>();
        if (bill.getPaymentBreakdown() != null) legs.addAll(bill.getPaymentBreakdown());
        legs.addAll(newLegs);
        bill.setPaymentBreakdown(legs);
        bill.setPaymentStatus(newAmountPaid.compareTo(total) >= 0 ? "PAID" : "PARTIAL");
        bill = supplierBillRepository.save(bill);

        // Dated payment voucher → DR Accounts Payable / CR Cash-Bank, and the supplier SOA's payment line.
        paymentVoucherService.recordSupplierBillPayment(bill, amount, req.getPaymentMethod(), req.getPaymentBreakdown(),
                req.getNotes(), req.getPaymentDate(), total.subtract(newAmountPaid));

        List<SupplierBillItem> items = supplierBillItemRepository.findByBillId(bill.getId());
        return SupplierBillResponseDTO.fromEntity(bill, items);
    }

    // ── Supplier statement of account ───────────────────────────────────────

    /**
     * Supplier SOA for a period: confirmed invoices are credits (we owe more), payments
     * are debits (we owe less). Payments come from Paid supplier payment vouchers; any
     * amount recorded on a bill before vouchers were created for bill payments (so with
     * no voucher behind it) is shown as one "payment on invoice" line so the balance
     * still matches the bills. Positive balance = payable to the supplier.
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getStatement(Long supplierId, java.time.LocalDate from, java.time.LocalDate to) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new EntityNotFoundException("Supplier not found with id: " + supplierId));
        java.time.LocalDate start = from != null ? from : java.time.LocalDate.of(1970, 1, 1);
        java.time.LocalDate end = to != null ? to : java.time.LocalDate.now();

        List<SupplierBill> bills = supplierBillRepository.findAll().stream()
                .filter(b -> supplierId.equals(b.getSupplierId()) && "CONFIRMED".equals(b.getStatus()))
                .collect(Collectors.toList());
        java.util.Set<String> billNumbers = bills.stream().map(SupplierBill::getBillNumber).collect(Collectors.toSet());
        List<com.company.project.entities.PaymentVoucher> vouchers = paymentVoucherService.findPaidSupplierVouchers(supplier.getName());

        List<java.util.Map<String, Object>> all = new ArrayList<>();
        for (SupplierBill b : bills) {
            java.time.LocalDate d = b.getBillDate() != null ? b.getBillDate() : b.getCreatedAt().toLocalDate();
            all.add(entry(d, 0, "INVOICE", b.getBillNumber(),
                    "Purchase invoice" + (b.getPurchaseOrderId() != null ? " (against PO)" : ""),
                    b.getInvoiceNumber(), BigDecimal.ZERO, nz(b.getTotalAmount())));

            BigDecimal vouchered = vouchers.stream()
                    .filter(v -> b.getBillNumber().equals(v.getBillNo()))
                    .map(v -> nz(v.getAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal legacy = nz(b.getAmountPaid()).subtract(vouchered);
            if (legacy.compareTo(new BigDecimal("0.01")) >= 0) {
                java.time.LocalDate pd = b.getUpdatedAt() != null ? b.getUpdatedAt().toLocalDate() : d;
                all.add(entry(pd, 1, "PAYMENT", b.getBillNumber(), "Payment recorded on invoice",
                        b.getPaymentMethod(), legacy, BigDecimal.ZERO));
            }
        }
        for (com.company.project.entities.PaymentVoucher v : vouchers) {
            java.time.LocalDate d = v.getPaymentDate() != null ? v.getPaymentDate() : java.time.LocalDate.now();
            boolean linked = v.getBillNo() != null && billNumbers.contains(v.getBillNo());
            all.add(entry(d, 1, "PAYMENT", v.getVoucherNo(),
                    linked ? "Payment against " + v.getBillNo() : (v.getDescription() != null ? v.getDescription() : "Payment on account"),
                    v.getPaymentMethod(), nz(v.getAmount()), BigDecimal.ZERO));
        }
        all.sort(java.util.Comparator
                .comparing((java.util.Map<String, Object> e) -> (java.time.LocalDate) e.get("transaction_date"))
                .thenComparing(e -> (Integer) e.get("_order"))
                .thenComparing(e -> String.valueOf(e.get("document_no"))));

        BigDecimal opening = BigDecimal.ZERO, totalDebit = BigDecimal.ZERO, totalCredit = BigDecimal.ZERO;
        List<java.util.Map<String, Object>> entries = new ArrayList<>();
        for (java.util.Map<String, Object> e : all) {
            java.time.LocalDate d = (java.time.LocalDate) e.get("transaction_date");
            BigDecimal debit = (BigDecimal) e.get("debit"), credit = (BigDecimal) e.get("credit");
            if (d.isBefore(start)) { opening = opening.add(credit).subtract(debit); continue; }
            if (d.isAfter(end)) continue;
            totalDebit = totalDebit.add(debit);
            totalCredit = totalCredit.add(credit);
            entries.add(e);
        }
        BigDecimal running = opening;
        for (java.util.Map<String, Object> e : entries) {
            running = running.add((BigDecimal) e.get("credit")).subtract((BigDecimal) e.get("debit"));
            e.put("running_balance", running);
            e.remove("_order");
        }

        java.util.Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("supplier_id", supplier.getId());
        out.put("supplier_name", supplier.getName());
        out.put("from", start);
        out.put("to", end);
        out.put("opening_balance", opening);
        out.put("total_debit", totalDebit);
        out.put("total_credit", totalCredit);
        out.put("closing_balance", running);
        out.put("entries", entries);
        return out;
    }

    private static java.util.Map<String, Object> entry(java.time.LocalDate date, int order, String type, String documentNo,
                                                      String description, String reference, BigDecimal debit, BigDecimal credit) {
        java.util.Map<String, Object> e = new java.util.LinkedHashMap<>();
        e.put("transaction_date", date);
        e.put("_order", order);
        e.put("type", type);
        e.put("document_no", documentNo);
        e.put("description", description);
        e.put("reference", reference);
        e.put("debit", debit);
        e.put("credit", credit);
        return e;
    }

    private static BigDecimal nz(BigDecimal v) { return v != null ? v : BigDecimal.ZERO; }

    public void deleteBill(Long id) {
        SupplierBill bill = supplierBillRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Supplier bill not found with id: " + id));

        if (!"DRAFT".equals(bill.getStatus())) {
            throw new BusinessRuleViolationException("Only DRAFT bills can be deleted. Current status: " + bill.getStatus());
        }

        supplierBillItemRepository.deleteByBillId(bill.getId());
        supplierBillRepository.delete(bill);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SupplierBillResponseDTO getBillById(Long id) {
        SupplierBill bill = supplierBillRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Supplier bill not found with id: " + id));
        List<SupplierBillItem> items = supplierBillItemRepository.findByBillId(bill.getId());
        return SupplierBillResponseDTO.fromEntity(bill, items);
    }

    @Transactional(readOnly = true)
    public SupplierBillsPageResponseDTO getBills(int page, int size, String status, String search) {
        Specification<SupplierBill> spec = buildSpec(status, search);
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<SupplierBill> billPage = supplierBillRepository.findAll(spec, pageable);

        List<SupplierBillResponseDTO> dtos = billPage.getContent().stream()
                .map(bill -> {
                    List<SupplierBillItem> items = supplierBillItemRepository.findByBillId(bill.getId());
                    return SupplierBillResponseDTO.fromEntity(bill, items);
                })
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(page, size, billPage.getTotalElements(), billPage.getTotalPages());
        return new SupplierBillsPageResponseDTO(dtos, pagination);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Bill's own warehouse if set, else the first active warehouse, else the first warehouse of any kind. */
    private Long resolveWarehouseId(SupplierBill bill) {
        if (bill.getWarehouseId() != null) return bill.getWarehouseId();

        List<Warehouse> active = warehouseRepository.findByIsActiveTrue();
        if (!active.isEmpty()) return active.get(0).getId();

        List<Warehouse> all = warehouseRepository.findAll();
        return all.isEmpty() ? null : all.get(0).getId();
    }

    private void applyStockIncrement(Long productId, Long warehouseId, int quantity, BigDecimal unitPrice) {
        int oldTotalStock = 0;
        List<ProductStock> allStocks = productStockRepository.findByProductId(productId);
        if (allStocks != null) {
            oldTotalStock = allStocks.stream().mapToInt(s -> s.getCurrentStock() == null ? 0 : s.getCurrentStock()).sum();
        }

        Optional<ProductStock> stockOpt = productStockRepository
                .findByProductIdAndWarehouseId(productId, warehouseId);
        if (stockOpt.isPresent()) {
            ProductStock stock = stockOpt.get();
            stock.setCurrentStock((stock.getCurrentStock() == null ? 0 : stock.getCurrentStock()) + quantity);
            productStockRepository.save(stock);
        } else {
            ProductStock newStock = new ProductStock();
            newStock.setProductId(productId);
            newStock.setWarehouseId(warehouseId);
            newStock.setCurrentStock(quantity);
            newStock.setOpeningStock(0);
            newStock.setReorderLevel(0);
            productStockRepository.save(newStock);
        }

        // Update Moving Average Cost
        Optional<Product> prodOpt = productRepository.findById(productId);
        if (prodOpt.isPresent()) {
            Product p = prodOpt.get();
            BigDecimal oldCost = p.getCostPrice() != null ? p.getCostPrice() : BigDecimal.ZERO;
            BigDecimal newCostPrice = unitPrice != null ? unitPrice : BigDecimal.ZERO;
            
            int newTotalStock = oldTotalStock + quantity;
            if (newTotalStock > 0) {
                BigDecimal oldTotalVal = oldCost.multiply(BigDecimal.valueOf(oldTotalStock));
                BigDecimal newVal = newCostPrice.multiply(BigDecimal.valueOf(quantity));
                BigDecimal avgCost = oldTotalVal.add(newVal).divide(BigDecimal.valueOf(newTotalStock), 2, RoundingMode.HALF_UP);
                p.setCostPrice(avgCost);
                productRepository.save(p);
            }
        }
    }

    private SupplierBillItem buildItem(Long billId, SupplierBillItemDTO dto) {
        SupplierBillItem item = new SupplierBillItem();
        item.setBillId(billId);
        item.setProductId(dto.getProductId());
        item.setProductName(dto.getProductName());
        item.setProductSku(dto.getProductSku());
        item.setUnitOfMeasure(dto.getUnitOfMeasure());
        item.setQuantity(dto.getQuantity());
        item.setUnitPrice(dto.getUnitPrice() != null ? dto.getUnitPrice() : BigDecimal.ZERO);

        BigDecimal discPct = dto.getDiscountPercent() != null ? dto.getDiscountPercent() : BigDecimal.ZERO;
        BigDecimal taxPct = dto.getTaxPercent() != null ? dto.getTaxPercent() : BigDecimal.ZERO;
        item.setDiscountPercent(discPct);
        item.setTaxPercent(taxPct);

        BigDecimal lineTotal = item.getUnitPrice()
                .multiply(BigDecimal.valueOf(item.getQuantity() != null ? item.getQuantity() : 1));
        BigDecimal discount = lineTotal.multiply(discPct)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal afterDiscount = lineTotal.subtract(discount);
        BigDecimal tax = afterDiscount.multiply(taxPct)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal total = afterDiscount.add(tax);
        item.setTotalAmount(total);

        item.setNotes(dto.getNotes());
        return item;
    }

    private void computeAndSetTotals(SupplierBill bill, List<SupplierBillItemDTO> itemDtos,
                                     List<SupplierBillItem> savedItems) {
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal discountAmount = BigDecimal.ZERO;
        BigDecimal taxAmount = BigDecimal.ZERO;

        for (SupplierBillItemDTO dto : itemDtos) {
            BigDecimal qty = BigDecimal.valueOf(dto.getQuantity() != null ? dto.getQuantity() : 1);
            BigDecimal price = dto.getUnitPrice() != null ? dto.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal discPct = dto.getDiscountPercent() != null ? dto.getDiscountPercent() : BigDecimal.ZERO;
            BigDecimal taxPct = dto.getTaxPercent() != null ? dto.getTaxPercent() : BigDecimal.ZERO;

            BigDecimal lineTotal = price.multiply(qty);
            BigDecimal disc = lineTotal.multiply(discPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal afterDisc = lineTotal.subtract(disc);
            BigDecimal tax = afterDisc.multiply(taxPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            subtotal = subtotal.add(lineTotal);
            discountAmount = discountAmount.add(disc);
            taxAmount = taxAmount.add(tax);
        }

        BigDecimal shipping = bill.getShippingCost() != null ? bill.getShippingCost() : BigDecimal.ZERO;
        BigDecimal totalAmount = subtotal.subtract(discountAmount).add(taxAmount).add(shipping);

        bill.setSubtotal(subtotal);
        bill.setDiscountAmount(discountAmount);
        bill.setTaxAmount(taxAmount);
        bill.setTotalAmount(totalAmount);
    }

    private Specification<SupplierBill> buildSpec(String status, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("supplierName")), like),
                        cb.like(cb.lower(root.get("invoiceNumber")), like)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
