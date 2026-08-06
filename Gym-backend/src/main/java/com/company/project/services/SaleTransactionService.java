package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.SaleTransactionPageResponseDTO;
import com.company.project.dto.SaleTransactionRequestDTO;
import com.company.project.dto.SaleTransactionResponseDTO;
import com.company.project.entities.FinancialSetting;
import com.company.project.entities.Product;
import com.company.project.entities.ProductStock;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.SaleTransactionItem;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.FinancialSettingRepository;
import com.company.project.repositories.ProductRepository;
import com.company.project.repositories.ProductStockRepository;
import com.company.project.repositories.SaleTransactionItemRepository;
import com.company.project.repositories.SaleTransactionRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class SaleTransactionService {

    private static final String STOCK_CHECK_SETTING_KEY = "stock_check_enabled";

    private final SaleTransactionRepository saleTransactionRepository;
    private final SaleTransactionItemRepository saleTransactionItemRepository;
    private final ProductStockRepository productStockRepository;
    private final ProductRepository productRepository;
    private final FinancialEventService financialEventService;
    private final ReceiptVoucherService receiptVoucherService;
    private final FinancialSettingRepository financialSettingRepository;

    public SaleTransactionService(SaleTransactionRepository saleTransactionRepository,
                                  SaleTransactionItemRepository saleTransactionItemRepository,
                                  ProductStockRepository productStockRepository,
                                  ProductRepository productRepository,
                                  FinancialEventService financialEventService,
                                  ReceiptVoucherService receiptVoucherService,
                                  FinancialSettingRepository financialSettingRepository) {
        this.saleTransactionRepository     = saleTransactionRepository;
        this.saleTransactionItemRepository = saleTransactionItemRepository;
        this.productStockRepository        = productStockRepository;
        this.productRepository             = productRepository;
        this.financialEventService         = financialEventService;
        this.receiptVoucherService         = receiptVoucherService;
        this.financialSettingRepository    = financialSettingRepository;
    }

    /** Sales Settings → "Stock Check". Defaults to ON (existing behavior) until explicitly turned off. */
    private boolean isStockCheckEnabled() {
        return financialSettingRepository.findBySettingKey(STOCK_CHECK_SETTING_KEY)
                .map(FinancialSetting::getSettingValue)
                .map(value -> !"false".equalsIgnoreCase(value))
                .orElse(true);
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public SaleTransactionResponseDTO createTransaction(SaleTransactionRequestDTO req) {
        boolean stockCheckEnabled = isStockCheckEnabled();
        BigDecimal calcSubtotal = BigDecimal.ZERO;
        BigDecimal calcDiscountAmount = BigDecimal.ZERO;
        BigDecimal calcTaxAmount = BigDecimal.ZERO;
        BigDecimal calcCogs = BigDecimal.ZERO;
        java.util.Map<Long, BigDecimal> productTaxRates = new java.util.HashMap<>();

        // Pass 1: Validate stock and compute verified totals (Gap 5 - Security)
        if (req.getItems() != null) {
            for (SaleTransactionRequestDTO.SaleItemRequest itemReq : req.getItems()) {
                Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new EntityNotFoundException("Product not found with id: " + itemReq.getProductId()));

                if (stockCheckEnabled) {
                    if (itemReq.getWarehouseId() != null) {
                        ProductStock stock = productStockRepository.findByProductIdAndWarehouseId(product.getId(), itemReq.getWarehouseId())
                            .orElseThrow(() -> new EntityNotFoundException("Stock not found in warehouse for product " + product.getName()));
                        if ((stock.getCurrentStock() == null ? 0 : stock.getCurrentStock()) < itemReq.getQuantity()) {
                            throw new BusinessRuleViolationException("Insufficient stock in warehouse for product " + product.getName());
                        }
                    } else {
                        List<ProductStock> stocks = productStockRepository.findByProductId(product.getId());
                        int totalStock = stocks.stream().mapToInt(s -> s.getCurrentStock() == null ? 0 : s.getCurrentStock()).sum();
                        if (totalStock < itemReq.getQuantity()) {
                            throw new BusinessRuleViolationException("Insufficient stock for product: " + product.getName()
                                    + ". Available: " + totalStock + ", Requested: " + itemReq.getQuantity());
                        }
                    }
                }

                // Override frontend price with DB price
                BigDecimal unitPrice = product.getSellingPrice() != null ? product.getSellingPrice() : BigDecimal.ZERO;
                itemReq.setUnitPrice(unitPrice);

                BigDecimal discPct = itemReq.getDiscountPercent() != null ? itemReq.getDiscountPercent() : BigDecimal.ZERO;
                BigDecimal lineBeforeDisc = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));
                BigDecimal discAmt = lineBeforeDisc.multiply(discPct).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);

                calcSubtotal = calcSubtotal.add(lineBeforeDisc);
                calcDiscountAmount = calcDiscountAmount.add(discAmt);

                // Tax is always computed server-side from the product's own configured rate —
                // never trusted from the client — so per-product rates aren't dead configuration
                // and a modified request can't set tax to an arbitrary figure.
                BigDecimal taxRate = product.getTaxRate() != null ? product.getTaxRate() : BigDecimal.ZERO;
                productTaxRates.put(product.getId(), taxRate);
                BigDecimal itemTax = lineBeforeDisc.subtract(discAmt).multiply(taxRate)
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                calcTaxAmount = calcTaxAmount.add(itemTax);

                BigDecimal costPrice = product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO;
                calcCogs = calcCogs.add(costPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity())));
            }
        }

        BigDecimal calcTotalAmount = calcSubtotal.subtract(calcDiscountAmount).add(calcTaxAmount);

        // Build and save transaction
        SaleTransaction transaction = new SaleTransaction();
        transaction.setPosSessionId(req.getPosSessionId());
        transaction.setMemberId(req.getMemberId());
        transaction.setMemberName(req.getMemberName());
        transaction.setPaymentMethod(req.getPaymentMethod());
        transaction.setPaymentBreakdown(req.getPaymentBreakdown());
        transaction.setSubtotal(calcSubtotal);
        transaction.setDiscountAmount(calcDiscountAmount);
        transaction.setTaxAmount(calcTaxAmount);
        transaction.setTotalAmount(calcTotalAmount);
        transaction.setTotalCogs(calcCogs);
        transaction.setReceivedAmount(req.getReceivedAmount());
        if (req.getReceivedAmount() != null) {
            transaction.setChangeAmount(req.getReceivedAmount().subtract(calcTotalAmount));
        }
        transaction.setStatus("COMPLETED");
        transaction.setNotes(req.getNotes());

        // Save first to get id
        transaction = saleTransactionRepository.save(transaction);

        // Generate transaction number
        transaction.setTransactionNumber("TXN-" + String.format("%010d", transaction.getId()));
        transaction = saleTransactionRepository.save(transaction);

        // Save items and deduct stock
        if (req.getItems() != null) {
            for (SaleTransactionRequestDTO.SaleItemRequest itemReq : req.getItems()) {
                SaleTransactionItem item = new SaleTransactionItem();
                item.setTransactionId(transaction.getId());
                item.setProductId(itemReq.getProductId());
                item.setProductName(itemReq.getProductName());
                item.setProductSku(itemReq.getProductSku());
                item.setQuantity(itemReq.getQuantity());
                item.setUnitPrice(itemReq.getUnitPrice());
                item.setWarehouseId(itemReq.getWarehouseId()); // Gap 4

                BigDecimal discPct = itemReq.getDiscountPercent() != null ? itemReq.getDiscountPercent() : BigDecimal.ZERO;
                item.setDiscountPercent(discPct);

                // Compute discount amount
                BigDecimal lineBeforeDiscount = itemReq.getUnitPrice()
                        .multiply(BigDecimal.valueOf(itemReq.getQuantity()));
                BigDecimal discAmt = lineBeforeDiscount.multiply(discPct)
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                item.setDiscountAmount(discAmt);

                BigDecimal itemTaxRate = productTaxRates.getOrDefault(itemReq.getProductId(), BigDecimal.ZERO);
                BigDecimal itemTax = lineBeforeDiscount.subtract(discAmt).multiply(itemTaxRate)
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                item.setTaxAmount(itemTax);
                item.setTotalAmount(lineBeforeDiscount.subtract(discAmt));

                // If warehouse is missing, find default during deduction and save it to the item
                if (stockCheckEnabled) {
                    Long usedWarehouseId = deductStock(itemReq.getProductId(), itemReq.getWarehouseId(), itemReq.getQuantity());
                    if (item.getWarehouseId() == null) {
                        item.setWarehouseId(usedWarehouseId);
                    }
                }

                saleTransactionItemRepository.save(item);
            }
        }

        List<SaleTransactionItem> savedItems = saleTransactionItemRepository.findByTransactionId(transaction.getId());

        // Generate journal entry: DR Cash/Bank, CR Sales Revenue, CR Tax Payable
        financialEventService.onSaleCompleted(transaction);

        // Create receipt voucher document for UI display
        receiptVoucherService.createVoucherFromModule(
                "POS Sale – " + transaction.getTransactionNumber(),
                "POS",
                transaction.getMemberName(),
                transaction.getMemberId(),
                transaction.getTotalAmount(),
                transaction.getPaymentMethod(),
                transaction.getTransactionNumber(),
                transaction.getTransactionNumber(),
                transaction.getNotes(),
                transaction.getPaymentBreakdown()
        );

        return SaleTransactionResponseDTO.fromEntity(transaction, savedItems);
    }

    public SaleTransactionResponseDTO refundTransaction(Long id) {
        SaleTransaction transaction = saleTransactionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Transaction not found with id: " + id));

        if ("REFUNDED".equals(transaction.getStatus())) {
            throw new BusinessRuleViolationException("Transaction is already refunded");
        }
        if ("VOIDED".equals(transaction.getStatus())) {
            throw new BusinessRuleViolationException("Cannot refund a voided transaction");
        }

        transaction.setStatus("REFUNDED");
        transaction = saleTransactionRepository.save(transaction);

        // Restore stock for all items — skipped when Stock Check is off, for symmetry with
        // createTransaction (a sale made while Stock Check was off never touched stock, so
        // its refund shouldn't add stock back either).
        List<SaleTransactionItem> items = saleTransactionItemRepository.findByTransactionId(id);
        if (isStockCheckEnabled()) {
            for (SaleTransactionItem item : items) {
                restoreStock(item.getProductId(), item.getWarehouseId(), item.getQuantity());
            }
        }

        // Generate reversal journal entry: DR Sales Revenue, DR Tax Payable, CR Cash/Bank
        financialEventService.onSaleRefunded(transaction);

        return SaleTransactionResponseDTO.fromEntity(transaction, items);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SaleTransactionResponseDTO getTransactionById(Long id) {
        SaleTransaction transaction = saleTransactionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Transaction not found with id: " + id));
        List<SaleTransactionItem> items = saleTransactionItemRepository.findByTransactionId(id);
        return SaleTransactionResponseDTO.fromEntity(transaction, items);
    }

    @Transactional(readOnly = true)
    public SaleTransactionPageResponseDTO getTransactions(String search, String paymentMethod,
                                                          String status, Long sessionId,
                                                          int page, int size) {
        Specification<SaleTransaction> spec = buildSpec(search, paymentMethod, status, sessionId);
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<SaleTransaction> txPage = saleTransactionRepository.findAll(spec, pageable);

        List<SaleTransactionResponseDTO> dtos = txPage.getContent().stream()
                .map(t -> SaleTransactionResponseDTO.fromEntity(t, saleTransactionItemRepository.findByTransactionId(t.getId())))
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(page, size, txPage.getTotalElements(), txPage.getTotalPages());
        return new SaleTransactionPageResponseDTO(dtos, pagination);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Long deductStock(Long productId, Long warehouseId, int quantity) {
        if (warehouseId != null) {
            ProductStock stock = productStockRepository.findByProductIdAndWarehouseId(productId, warehouseId)
                    .orElseThrow(() -> new EntityNotFoundException("Stock not found in warehouse"));
            int available = stock.getCurrentStock() == null ? 0 : stock.getCurrentStock();
            if (available < quantity) {
                throw new BusinessRuleViolationException("Insufficient stock in warehouse");
            }
            stock.setCurrentStock(available - quantity);
            productStockRepository.save(stock);
            return warehouseId;
        } else {
            List<ProductStock> stocks = productStockRepository.findByProductId(productId);
            // Sort by highest stock first
            stocks.sort(Comparator.comparingInt(s -> -(s.getCurrentStock() == null ? 0 : s.getCurrentStock())));

            int remaining = quantity;
            Long defaultWarehouseId = null;
            for (ProductStock stock : stocks) {
                if (remaining <= 0) break;
                if (defaultWarehouseId == null) defaultWarehouseId = stock.getWarehouseId();
                int available = stock.getCurrentStock() == null ? 0 : stock.getCurrentStock();
                int deduct = Math.min(available, remaining);
                stock.setCurrentStock(available - deduct);
                productStockRepository.save(stock);
                remaining -= deduct;
            }
            return defaultWarehouseId;
        }
    }

    private void restoreStock(Long productId, Long warehouseId, int quantity) {
        if (warehouseId != null) {
            productStockRepository.findByProductIdAndWarehouseId(productId, warehouseId).ifPresent(stock -> {
                stock.setCurrentStock((stock.getCurrentStock() == null ? 0 : stock.getCurrentStock()) + quantity);
                productStockRepository.save(stock);
            });
        } else {
            List<ProductStock> stocks = productStockRepository.findByProductId(productId);
            if (!stocks.isEmpty()) {
                // Restore to the first warehouse
                ProductStock stock = stocks.get(0);
                stock.setCurrentStock((stock.getCurrentStock() == null ? 0 : stock.getCurrentStock()) + quantity);
                productStockRepository.save(stock);
            }
        }
    }

    private Specification<SaleTransaction> buildSpec(String search, String paymentMethod,
                                                      String status, Long sessionId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("transactionNumber")), like),
                        cb.like(cb.lower(root.get("memberName")), like)
                ));
            }
            if (paymentMethod != null && !paymentMethod.isBlank()) {
                predicates.add(cb.equal(root.get("paymentMethod"), paymentMethod));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (sessionId != null) {
                predicates.add(cb.equal(root.get("posSessionId"), sessionId));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
