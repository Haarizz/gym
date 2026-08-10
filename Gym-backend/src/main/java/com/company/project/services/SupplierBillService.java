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

    public SupplierBillService(SupplierBillRepository supplierBillRepository,
                               SupplierBillItemRepository supplierBillItemRepository,
                               SupplierRepository supplierRepository,
                               ProductStockRepository productStockRepository,
                               ProductRepository productRepository,
                               WarehouseRepository warehouseRepository,
                               FinancialEventService financialEventService) {
        this.supplierBillRepository     = supplierBillRepository;
        this.supplierBillItemRepository = supplierBillItemRepository;
        this.supplierRepository         = supplierRepository;
        this.productStockRepository     = productStockRepository;
        this.productRepository          = productRepository;
        this.warehouseRepository        = warehouseRepository;
        this.financialEventService      = financialEventService;
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

    public SupplierBillResponseDTO recordPayment(Long id, RecordBillPaymentRequestDTO req) {
        SupplierBill bill = supplierBillRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Supplier bill not found with id: " + id));

        if (!"CONFIRMED".equals(bill.getStatus())) {
            throw new BusinessRuleViolationException("Payments can only be recorded on CONFIRMED bills. Current status: " + bill.getStatus());
        }

        BigDecimal currentPaid = bill.getAmountPaid() != null ? bill.getAmountPaid() : BigDecimal.ZERO;
        BigDecimal newAmountPaid = currentPaid.add(req.getAmount() != null ? req.getAmount() : BigDecimal.ZERO);
        bill.setAmountPaid(newAmountPaid);
        if (req.getPaymentMethod() != null) bill.setPaymentMethod(req.getPaymentMethod());
        if (req.getPaymentBreakdown() != null) bill.setPaymentBreakdown(req.getPaymentBreakdown());

        BigDecimal total = bill.getTotalAmount() != null ? bill.getTotalAmount() : BigDecimal.ZERO;
        if (newAmountPaid.compareTo(total) >= 0) {
            bill.setPaymentStatus("PAID");
        } else {
            bill.setPaymentStatus("PARTIAL");
        }

        bill = supplierBillRepository.save(bill);
        List<SupplierBillItem> items = supplierBillItemRepository.findByBillId(bill.getId());
        return SupplierBillResponseDTO.fromEntity(bill, items);
    }

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
