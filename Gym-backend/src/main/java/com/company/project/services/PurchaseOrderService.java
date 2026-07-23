package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.PurchaseOrderItemDTO;
import com.company.project.dto.PurchaseOrderPageResponseDTO;
import com.company.project.dto.PurchaseOrderRequestDTO;
import com.company.project.dto.PurchaseOrderResponseDTO;
import com.company.project.dto.ReceiveItemsRequestDTO;
import com.company.project.entities.ProductStock;
import com.company.project.entities.PurchaseOrder;
import com.company.project.entities.PurchaseOrderItem;
import com.company.project.entities.Supplier;
import com.company.project.repositories.ProductStockRepository;
import com.company.project.repositories.PurchaseOrderItemRepository;
import com.company.project.repositories.PurchaseOrderRepository;
import com.company.project.repositories.SupplierRepository;
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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final SupplierRepository supplierRepository;
    private final ProductStockRepository productStockRepository;
    private final NotificationService notificationService;

    public PurchaseOrderService(PurchaseOrderRepository purchaseOrderRepository,
                                PurchaseOrderItemRepository purchaseOrderItemRepository,
                                SupplierRepository supplierRepository,
                                ProductStockRepository productStockRepository,
                                NotificationService notificationService) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
        this.supplierRepository = supplierRepository;
        this.productStockRepository = productStockRepository;
        this.notificationService = notificationService;
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public PurchaseOrderResponseDTO createOrder(PurchaseOrderRequestDTO req) {
        Supplier supplier = supplierRepository.findById(req.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + req.getSupplierId()));

        PurchaseOrder po = new PurchaseOrder();
        po.setSupplierId(supplier.getId());
        po.setSupplierName(supplier.getName());
        po.setOrderDate(parseDateTime(req.getOrderDate()));
        po.setExpectedDeliveryDate(parseDateTime(req.getExpectedDeliveryDate()));
        po.setPriority(req.getPriority() != null ? req.getPriority() : "MEDIUM");
        po.setPaymentTerms(req.getPaymentTerms());
        po.setDeliveryAddress(req.getDeliveryAddress());
        po.setNotes(req.getNotes());
        po.setCreatedBy(req.getCreatedBy());
        po.setShippingCost(req.getShippingCost() != null ? req.getShippingCost() : BigDecimal.ZERO);
        po.setStatus("DRAFT");

        // Compute totals from items
        List<PurchaseOrderRequestDTO.POItemRequest> itemReqs = req.getItems() != null ? req.getItems() : new ArrayList<>();
        BigDecimal subtotal = computeSubtotal(itemReqs);
        BigDecimal taxAmount = computeTax(itemReqs);
        BigDecimal total = subtotal.add(taxAmount).add(po.getShippingCost());
        po.setSubtotal(subtotal);
        po.setTaxAmount(taxAmount);
        po.setDiscountAmount(BigDecimal.ZERO);
        po.setTotalAmount(total);

        // Save to get id
        po = purchaseOrderRepository.save(po);

        // Generate PO number
        po.setPoNumber("PO-" + String.format("%08d", po.getId()));
        po = purchaseOrderRepository.save(po);

        // Save items
        final Long poId = po.getId();
        for (PurchaseOrderRequestDTO.POItemRequest itemReq : itemReqs) {
            purchaseOrderItemRepository.save(buildItem(poId, itemReq));
        }

        List<PurchaseOrderItem> savedItems = purchaseOrderItemRepository.findByPurchaseOrderId(po.getId());
        return PurchaseOrderResponseDTO.fromEntity(po, supplier, savedItems);
    }

    public PurchaseOrderResponseDTO updateOrder(Long id, PurchaseOrderRequestDTO req) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase order not found with id: " + id));

        if (!("DRAFT".equals(po.getStatus()) || "PENDING_APPROVAL".equals(po.getStatus()))) {
            throw new RuntimeException("Cannot edit purchase order in status: " + po.getStatus());
        }

        Supplier supplier = supplierRepository.findById(req.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + req.getSupplierId()));

        po.setSupplierId(supplier.getId());
        po.setSupplierName(supplier.getName());
        po.setOrderDate(parseDateTime(req.getOrderDate()));
        po.setExpectedDeliveryDate(parseDateTime(req.getExpectedDeliveryDate()));
        if (req.getPriority() != null) po.setPriority(req.getPriority());
        po.setPaymentTerms(req.getPaymentTerms());
        po.setDeliveryAddress(req.getDeliveryAddress());
        po.setNotes(req.getNotes());
        po.setCreatedBy(req.getCreatedBy());
        if (req.getShippingCost() != null) po.setShippingCost(req.getShippingCost());

        // Delete existing items and save new
        purchaseOrderItemRepository.deleteByPurchaseOrderId(po.getId());

        List<PurchaseOrderRequestDTO.POItemRequest> itemReqs = req.getItems() != null ? req.getItems() : new ArrayList<>();
        BigDecimal subtotal = computeSubtotal(itemReqs);
        BigDecimal taxAmount = computeTax(itemReqs);
        BigDecimal total = subtotal.add(taxAmount).add(po.getShippingCost());
        po.setSubtotal(subtotal);
        po.setTaxAmount(taxAmount);
        po.setTotalAmount(total);

        po = purchaseOrderRepository.save(po);

        final Long poId = po.getId();
        for (PurchaseOrderRequestDTO.POItemRequest itemReq : itemReqs) {
            purchaseOrderItemRepository.save(buildItem(poId, itemReq));
        }

        List<PurchaseOrderItem> savedItems = purchaseOrderItemRepository.findByPurchaseOrderId(po.getId());
        return PurchaseOrderResponseDTO.fromEntity(po, supplier, savedItems);
    }

    public PurchaseOrderResponseDTO updateStatus(Long id, String newStatus) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase order not found with id: " + id));

        String current = po.getStatus();
        validateTransition(current, newStatus);

        po.setStatus(newStatus);
        po = purchaseOrderRepository.save(po);

        if ("CONFIRMED".equalsIgnoreCase(newStatus) || "RECEIVED".equalsIgnoreCase(newStatus)) {
            String label = "CONFIRMED".equalsIgnoreCase(newStatus) ? "Confirmed" : "Received";
            notificationService.notifyRoles(
                    List.of("ADMIN", "MANAGER"),
                    "Purchase Order " + label,
                    "PO " + po.getPoNumber() + " has been " + label.toLowerCase() + ".",
                    "SUCCESS", "MEDIUM", "INVENTORY",
                    po.getId(), "/purchase-order",
                    "PO_" + newStatus.toUpperCase() + "_" + po.getId()
            );
        }

        Supplier supplier = supplierRepository.findById(po.getSupplierId()).orElse(null);
        List<PurchaseOrderItem> items = purchaseOrderItemRepository.findByPurchaseOrderId(po.getId());
        return PurchaseOrderResponseDTO.fromEntity(po, supplier, items);
    }

    public PurchaseOrderResponseDTO receiveItems(Long id, ReceiveItemsRequestDTO req) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase order not found with id: " + id));

        for (ReceiveItemsRequestDTO.ReceivedItem receivedItem : req.getItems()) {
            PurchaseOrderItem poItem = purchaseOrderItemRepository.findById(receivedItem.getPurchaseOrderItemId())
                    .orElseThrow(() -> new RuntimeException("PO item not found with id: " + receivedItem.getPurchaseOrderItemId()));

            int newQtyReceived = (poItem.getQuantityReceived() == null ? 0 : poItem.getQuantityReceived())
                    + receivedItem.getQuantityReceived();
            poItem.setQuantityReceived(newQtyReceived);
            purchaseOrderItemRepository.save(poItem);

            // Increase stock
            if (poItem.getProductId() != null && receivedItem.getWarehouseId() != null) {
                Optional<ProductStock> stockOpt = productStockRepository
                        .findByProductIdAndWarehouseId(poItem.getProductId(), receivedItem.getWarehouseId());
                if (stockOpt.isPresent()) {
                    ProductStock stock = stockOpt.get();
                    stock.setCurrentStock((stock.getCurrentStock() == null ? 0 : stock.getCurrentStock())
                            + receivedItem.getQuantityReceived());
                    productStockRepository.save(stock);
                } else {
                    ProductStock newStock = new ProductStock();
                    newStock.setProductId(poItem.getProductId());
                    newStock.setWarehouseId(receivedItem.getWarehouseId());
                    newStock.setCurrentStock(receivedItem.getQuantityReceived());
                    newStock.setOpeningStock(0);
                    newStock.setReorderLevel(0);
                    productStockRepository.save(newStock);
                }
            }
        }

        // Check if all items are fully received
        List<PurchaseOrderItem> allItems = purchaseOrderItemRepository.findByPurchaseOrderId(po.getId());
        boolean allReceived = allItems.stream()
                .allMatch(i -> i.getQuantityReceived() != null && i.getQuantityReceived() >= i.getQuantityOrdered());

        po.setStatus(allReceived ? "RECEIVED" : "PARTIALLY_RECEIVED");
        po.setActualDeliveryDate(LocalDateTime.now());
        po = purchaseOrderRepository.save(po);

        Supplier supplier = supplierRepository.findById(po.getSupplierId()).orElse(null);
        return PurchaseOrderResponseDTO.fromEntity(po, supplier, allItems);
    }

    public void deleteOrder(Long id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase order not found with id: " + id));
        if (!("DRAFT".equals(po.getStatus()) || "CANCELLED".equals(po.getStatus()))) {
            throw new RuntimeException("Cannot delete purchase order in status: " + po.getStatus());
        }
        purchaseOrderItemRepository.deleteByPurchaseOrderId(po.getId());
        purchaseOrderRepository.delete(po);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PurchaseOrderResponseDTO getById(Long id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase order not found with id: " + id));
        Supplier supplier = supplierRepository.findById(po.getSupplierId()).orElse(null);
        List<PurchaseOrderItem> items = purchaseOrderItemRepository.findByPurchaseOrderId(po.getId());
        return PurchaseOrderResponseDTO.fromEntity(po, supplier, items);
    }

    @Transactional(readOnly = true)
    public PurchaseOrderPageResponseDTO getOrders(String search, String status, Long supplierId, int page, int size) {
        Specification<PurchaseOrder> spec = buildSpec(search, status, supplierId);
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<PurchaseOrder> poPage = purchaseOrderRepository.findAll(spec, pageable);

        // Prefetch suppliers
        List<Long> supplierIds = poPage.getContent().stream()
                .map(PurchaseOrder::getSupplierId).distinct().collect(Collectors.toList());
        Map<Long, Supplier> supplierMap = supplierRepository.findAllById(supplierIds).stream()
                .collect(Collectors.toMap(Supplier::getId, s -> s));

        List<PurchaseOrderResponseDTO> dtos = poPage.getContent().stream()
                .map(po -> {
                    Supplier sup = supplierMap.get(po.getSupplierId());
                    List<PurchaseOrderItem> items = purchaseOrderItemRepository.findByPurchaseOrderId(po.getId());
                    return PurchaseOrderResponseDTO.fromEntity(po, sup, items);
                })
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(page, size, poPage.getTotalElements(), poPage.getTotalPages());
        return new PurchaseOrderPageResponseDTO(dtos, pagination);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private PurchaseOrderItem buildItem(Long poId, PurchaseOrderRequestDTO.POItemRequest req) {
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setPurchaseOrderId(poId);
        item.setProductId(req.getProductId());
        item.setProductName(req.getProductName());
        item.setProductSku(req.getProductSku());
        item.setUnitOfMeasure(req.getUnitOfMeasure());
        item.setQuantityOrdered(req.getQuantityOrdered());
        item.setQuantityReceived(0);
        item.setUnitPrice(req.getUnitPrice() != null ? req.getUnitPrice() : BigDecimal.ZERO);

        BigDecimal discPct = req.getDiscountPercent() != null ? req.getDiscountPercent() : BigDecimal.ZERO;
        BigDecimal taxPct = req.getTaxPercent() != null ? req.getTaxPercent() : BigDecimal.ZERO;
        item.setDiscountPercent(discPct);
        item.setTaxPercent(taxPct);

        BigDecimal qty = BigDecimal.valueOf(req.getQuantityOrdered() != null ? req.getQuantityOrdered() : 0);
        BigDecimal unitPrice = item.getUnitPrice();
        BigDecimal lineAmt = unitPrice.multiply(qty);
        BigDecimal discAmt = lineAmt.multiply(discPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal afterDisc = lineAmt.subtract(discAmt);
        BigDecimal taxAmt = afterDisc.multiply(taxPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        item.setTotalAmount(afterDisc.add(taxAmt));
        item.setNotes(req.getNotes());
        return item;
    }

    private BigDecimal computeSubtotal(List<PurchaseOrderRequestDTO.POItemRequest> items) {
        return items.stream()
                .map(i -> {
                    BigDecimal qty = BigDecimal.valueOf(i.getQuantityOrdered() != null ? i.getQuantityOrdered() : 0);
                    BigDecimal price = i.getUnitPrice() != null ? i.getUnitPrice() : BigDecimal.ZERO;
                    BigDecimal disc = i.getDiscountPercent() != null ? i.getDiscountPercent() : BigDecimal.ZERO;
                    BigDecimal line = price.multiply(qty);
                    BigDecimal discAmt = line.multiply(disc).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    return line.subtract(discAmt);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal computeTax(List<PurchaseOrderRequestDTO.POItemRequest> items) {
        return items.stream()
                .map(i -> {
                    BigDecimal qty = BigDecimal.valueOf(i.getQuantityOrdered() != null ? i.getQuantityOrdered() : 0);
                    BigDecimal price = i.getUnitPrice() != null ? i.getUnitPrice() : BigDecimal.ZERO;
                    BigDecimal disc = i.getDiscountPercent() != null ? i.getDiscountPercent() : BigDecimal.ZERO;
                    BigDecimal tax = i.getTaxPercent() != null ? i.getTaxPercent() : BigDecimal.ZERO;
                    BigDecimal line = price.multiply(qty);
                    BigDecimal discAmt = line.multiply(disc).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    BigDecimal afterDisc = line.subtract(discAmt);
                    return afterDisc.multiply(tax).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void validateTransition(String current, String next) {
        boolean valid = false;
        switch (current) {
            case "DRAFT":
                valid = "PENDING_APPROVAL".equals(next);
                break;
            case "PENDING_APPROVAL":
                valid = "APPROVED".equals(next) || "DRAFT".equals(next);
                break;
            case "APPROVED":
                valid = "ORDERED".equals(next) || "CANCELLED".equals(next);
                break;
            case "ORDERED":
                valid = "PARTIALLY_RECEIVED".equals(next) || "RECEIVED".equals(next) || "CANCELLED".equals(next);
                break;
            default:
                valid = false;
        }
        if (!valid) {
            throw new RuntimeException("Invalid status transition from " + current + " to " + next);
        }
    }

    private LocalDateTime parseDateTime(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        try {
            // Try ISO date-time first
            return LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception e1) {
            try {
                // Try ISO date (add midnight)
                return LocalDateTime.parse(dateStr + "T00:00:00", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } catch (Exception e2) {
                return null;
            }
        }
    }

    private Specification<PurchaseOrder> buildSpec(String search, String status, Long supplierId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("poNumber")), like),
                        cb.like(cb.lower(root.get("supplierName")), like)
                ));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (supplierId != null) {
                predicates.add(cb.equal(root.get("supplierId"), supplierId));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
