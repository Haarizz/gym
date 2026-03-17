package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.SaleTransactionPageResponseDTO;
import com.company.project.dto.SaleTransactionRequestDTO;
import com.company.project.dto.SaleTransactionResponseDTO;
import com.company.project.entities.ProductStock;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.SaleTransactionItem;
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

    private final SaleTransactionRepository saleTransactionRepository;
    private final SaleTransactionItemRepository saleTransactionItemRepository;
    private final ProductStockRepository productStockRepository;

    public SaleTransactionService(SaleTransactionRepository saleTransactionRepository,
                                  SaleTransactionItemRepository saleTransactionItemRepository,
                                  ProductStockRepository productStockRepository) {
        this.saleTransactionRepository = saleTransactionRepository;
        this.saleTransactionItemRepository = saleTransactionItemRepository;
        this.productStockRepository = productStockRepository;
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public SaleTransactionResponseDTO createTransaction(SaleTransactionRequestDTO req) {
        // Validate stock for each item
        if (req.getItems() != null) {
            for (SaleTransactionRequestDTO.SaleItemRequest itemReq : req.getItems()) {
                List<ProductStock> stocks = productStockRepository.findByProductId(itemReq.getProductId());
                int totalStock = stocks.stream().mapToInt(s -> s.getCurrentStock() == null ? 0 : s.getCurrentStock()).sum();
                if (totalStock < itemReq.getQuantity()) {
                    throw new RuntimeException("Insufficient stock for product id: " + itemReq.getProductId()
                            + ". Available: " + totalStock + ", Requested: " + itemReq.getQuantity());
                }
            }
        }

        // Build and save transaction
        SaleTransaction transaction = new SaleTransaction();
        transaction.setPosSessionId(req.getPosSessionId());
        transaction.setMemberId(req.getMemberId());
        transaction.setMemberName(req.getMemberName());
        transaction.setPaymentMethod(req.getPaymentMethod());
        transaction.setSubtotal(req.getSubtotal() != null ? req.getSubtotal() : BigDecimal.ZERO);
        transaction.setDiscountAmount(req.getDiscountAmount() != null ? req.getDiscountAmount() : BigDecimal.ZERO);
        transaction.setTaxAmount(req.getTaxAmount() != null ? req.getTaxAmount() : BigDecimal.ZERO);
        transaction.setTotalAmount(req.getTotalAmount() != null ? req.getTotalAmount() : BigDecimal.ZERO);
        transaction.setReceivedAmount(req.getReceivedAmount());
        if (req.getReceivedAmount() != null && req.getTotalAmount() != null) {
            transaction.setChangeAmount(req.getReceivedAmount().subtract(req.getTotalAmount()));
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

                BigDecimal discPct = itemReq.getDiscountPercent() != null ? itemReq.getDiscountPercent() : BigDecimal.ZERO;
                item.setDiscountPercent(discPct);

                // Compute discount amount
                BigDecimal lineBeforeDiscount = itemReq.getUnitPrice()
                        .multiply(BigDecimal.valueOf(itemReq.getQuantity()));
                BigDecimal discAmt = lineBeforeDiscount.multiply(discPct)
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                item.setDiscountAmount(discAmt);
                item.setTaxAmount(BigDecimal.ZERO);
                item.setTotalAmount(lineBeforeDiscount.subtract(discAmt));

                saleTransactionItemRepository.save(item);

                // Deduct stock — use warehouse with most stock first
                deductStock(itemReq.getProductId(), itemReq.getQuantity());
            }
        }

        List<SaleTransactionItem> savedItems = saleTransactionItemRepository.findByTransactionId(transaction.getId());
        return SaleTransactionResponseDTO.fromEntity(transaction, savedItems);
    }

    public SaleTransactionResponseDTO refundTransaction(Long id) {
        SaleTransaction transaction = saleTransactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + id));

        if ("REFUNDED".equals(transaction.getStatus())) {
            throw new RuntimeException("Transaction is already refunded");
        }
        if ("VOIDED".equals(transaction.getStatus())) {
            throw new RuntimeException("Cannot refund a voided transaction");
        }

        transaction.setStatus("REFUNDED");
        transaction = saleTransactionRepository.save(transaction);

        // Restore stock for all items
        List<SaleTransactionItem> items = saleTransactionItemRepository.findByTransactionId(id);
        for (SaleTransactionItem item : items) {
            restoreStock(item.getProductId(), item.getQuantity());
        }

        return SaleTransactionResponseDTO.fromEntity(transaction, items);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SaleTransactionResponseDTO getTransactionById(Long id) {
        SaleTransaction transaction = saleTransactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + id));
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

    private void deductStock(Long productId, int quantity) {
        List<ProductStock> stocks = productStockRepository.findByProductId(productId);
        // Sort by highest stock first
        stocks.sort(Comparator.comparingInt(s -> -(s.getCurrentStock() == null ? 0 : s.getCurrentStock())));

        int remaining = quantity;
        for (ProductStock stock : stocks) {
            if (remaining <= 0) break;
            int available = stock.getCurrentStock() == null ? 0 : stock.getCurrentStock();
            int deduct = Math.min(available, remaining);
            stock.setCurrentStock(available - deduct);
            productStockRepository.save(stock);
            remaining -= deduct;
        }
    }

    private void restoreStock(Long productId, int quantity) {
        List<ProductStock> stocks = productStockRepository.findByProductId(productId);
        if (!stocks.isEmpty()) {
            // Restore to the first warehouse
            ProductStock stock = stocks.get(0);
            stock.setCurrentStock((stock.getCurrentStock() == null ? 0 : stock.getCurrentStock()) + quantity);
            productStockRepository.save(stock);
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
