package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.RecordBillPaymentRequestDTO;
import com.company.project.dto.SupplierBillItemDTO;
import com.company.project.dto.SupplierBillRequestDTO;
import com.company.project.dto.SupplierBillResponseDTO;
import com.company.project.dto.SupplierBillsPageResponseDTO;
import com.company.project.entities.ProductStock;
import com.company.project.entities.Supplier;
import com.company.project.entities.SupplierBill;
import com.company.project.entities.SupplierBillItem;
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
    private final WarehouseRepository warehouseRepository;

    public SupplierBillService(SupplierBillRepository supplierBillRepository,
                               SupplierBillItemRepository supplierBillItemRepository,
                               SupplierRepository supplierRepository,
                               ProductStockRepository productStockRepository,
                               WarehouseRepository warehouseRepository) {
        this.supplierBillRepository = supplierBillRepository;
        this.supplierBillItemRepository = supplierBillItemRepository;
        this.supplierRepository = supplierRepository;
        this.productStockRepository = productStockRepository;
        this.warehouseRepository = warehouseRepository;
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public SupplierBillResponseDTO createBill(SupplierBillRequestDTO req) {
        Supplier supplier = supplierRepository.findById(req.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + req.getSupplierId()));

        SupplierBill bill = new SupplierBill();
        bill.setSupplierId(supplier.getId());
        bill.setSupplierName(supplier.getName());
        bill.setInvoiceNumber(req.getInvoiceNumber());
        bill.setBillDate(req.getBillDate());
        bill.setDueDate(req.getDueDate());
        bill.setShippingCost(req.getShippingCost() != null ? req.getShippingCost() : BigDecimal.ZERO);
        bill.setWarehouseId(req.getWarehouseId());
        bill.setPriority(req.getPriority() != null ? req.getPriority() : "MEDIUM");
        bill.setNotes(req.getNotes());
        bill.setReceivedBy(req.getReceivedBy());
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
                .orElseThrow(() -> new RuntimeException("Supplier bill not found with id: " + id));

        if (!"DRAFT".equals(bill.getStatus())) {
            throw new RuntimeException("Cannot edit supplier bill in status: " + bill.getStatus());
        }

        Supplier supplier = supplierRepository.findById(req.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + req.getSupplierId()));

        bill.setSupplierId(supplier.getId());
        bill.setSupplierName(supplier.getName());
        bill.setInvoiceNumber(req.getInvoiceNumber());
        bill.setBillDate(req.getBillDate());
        bill.setDueDate(req.getDueDate());
        if (req.getShippingCost() != null) bill.setShippingCost(req.getShippingCost());
        bill.setWarehouseId(req.getWarehouseId());
        if (req.getPriority() != null) bill.setPriority(req.getPriority());
        bill.setNotes(req.getNotes());
        bill.setReceivedBy(req.getReceivedBy());

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
                .orElseThrow(() -> new RuntimeException("Supplier bill not found with id: " + id));

        if (!"DRAFT".equals(bill.getStatus())) {
            throw new RuntimeException("Only DRAFT bills can be confirmed. Current status: " + bill.getStatus());
        }

        bill.setStatus("CONFIRMED");

        // Increment stock for each item
        List<SupplierBillItem> items = supplierBillItemRepository.findByBillId(bill.getId());
        for (SupplierBillItem item : items) {
            if (item.getProductId() != null && bill.getWarehouseId() != null) {
                Optional<ProductStock> stockOpt = productStockRepository
                        .findByProductIdAndWarehouseId(item.getProductId(), bill.getWarehouseId());
                if (stockOpt.isPresent()) {
                    ProductStock stock = stockOpt.get();
                    stock.setCurrentStock((stock.getCurrentStock() == null ? 0 : stock.getCurrentStock())
                            + (item.getQuantity() != null ? item.getQuantity() : 0));
                    productStockRepository.save(stock);
                } else {
                    ProductStock newStock = new ProductStock();
                    newStock.setProductId(item.getProductId());
                    newStock.setWarehouseId(bill.getWarehouseId());
                    newStock.setCurrentStock(item.getQuantity() != null ? item.getQuantity() : 0);
                    newStock.setOpeningStock(0);
                    newStock.setReorderLevel(0);
                    productStockRepository.save(newStock);
                }
            }
        }

        bill = supplierBillRepository.save(bill);
        return SupplierBillResponseDTO.fromEntity(bill, items);
    }

    public SupplierBillResponseDTO cancelBill(Long id) {
        SupplierBill bill = supplierBillRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier bill not found with id: " + id));

        if ("CANCELLED".equals(bill.getStatus())) {
            throw new RuntimeException("Bill is already cancelled.");
        }

        // If CONFIRMED, reverse stock
        if ("CONFIRMED".equals(bill.getStatus())) {
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
                .orElseThrow(() -> new RuntimeException("Supplier bill not found with id: " + id));

        if (!"CONFIRMED".equals(bill.getStatus())) {
            throw new RuntimeException("Payments can only be recorded on CONFIRMED bills. Current status: " + bill.getStatus());
        }

        BigDecimal currentPaid = bill.getAmountPaid() != null ? bill.getAmountPaid() : BigDecimal.ZERO;
        BigDecimal newAmountPaid = currentPaid.add(req.getAmount() != null ? req.getAmount() : BigDecimal.ZERO);
        bill.setAmountPaid(newAmountPaid);

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
                .orElseThrow(() -> new RuntimeException("Supplier bill not found with id: " + id));

        if (!"DRAFT".equals(bill.getStatus())) {
            throw new RuntimeException("Only DRAFT bills can be deleted. Current status: " + bill.getStatus());
        }

        supplierBillItemRepository.deleteByBillId(bill.getId());
        supplierBillRepository.delete(bill);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SupplierBillResponseDTO getBillById(Long id) {
        SupplierBill bill = supplierBillRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier bill not found with id: " + id));
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

            subtotal = subtotal.add(afterDisc);
            discountAmount = discountAmount.add(disc);
            taxAmount = taxAmount.add(tax);
        }

        BigDecimal shipping = bill.getShippingCost() != null ? bill.getShippingCost() : BigDecimal.ZERO;
        BigDecimal totalAmount = subtotal.add(taxAmount).add(shipping);

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
