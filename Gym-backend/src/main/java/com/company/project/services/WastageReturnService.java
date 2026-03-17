package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.WastageReturnItemDTO;
import com.company.project.dto.WastageReturnPageResponseDTO;
import com.company.project.dto.WastageReturnRequestDTO;
import com.company.project.dto.WastageReturnResponseDTO;
import com.company.project.dto.WastageReturnStatsDTO;
import com.company.project.entities.ProductStock;
import com.company.project.entities.WastageReturn;
import com.company.project.entities.WastageReturnItem;
import com.company.project.repositories.ProductStockRepository;
import com.company.project.repositories.WastageReturnItemRepository;
import com.company.project.repositories.WastageReturnRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class WastageReturnService {

    private final WastageReturnRepository wastageReturnRepository;
    private final WastageReturnItemRepository wastageReturnItemRepository;
    private final ProductStockRepository productStockRepository;

    public WastageReturnService(WastageReturnRepository wastageReturnRepository,
                                WastageReturnItemRepository wastageReturnItemRepository,
                                ProductStockRepository productStockRepository) {
        this.wastageReturnRepository = wastageReturnRepository;
        this.wastageReturnItemRepository = wastageReturnItemRepository;
        this.productStockRepository = productStockRepository;
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public WastageReturnResponseDTO createVoucher(WastageReturnRequestDTO req) {
        WastageReturn voucher = new WastageReturn();
        voucher.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        voucher.setType(req.getType());
        voucher.setAssociatedParty(req.getAssociatedParty());
        voucher.setPartyType(req.getPartyType() != null ? req.getPartyType() : "NONE");
        voucher.setReason(req.getReason());
        voucher.setLocation(req.getLocation());
        voucher.setRecordedBy(req.getRecordedBy());
        voucher.setNotes(req.getNotes());
        voucher.setStatus("DRAFT");
        voucher.setTotalItems(0);
        voucher.setTotalValue(BigDecimal.ZERO);

        // Save to get id
        voucher = wastageReturnRepository.save(voucher);

        // Generate voucher number: WRV-YYYYMMDD-XXXXX
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        voucher.setVoucherNumber("WRV-" + datePart + "-" + String.format("%04d", voucher.getId()));
        voucher = wastageReturnRepository.save(voucher);

        // Save items
        List<WastageReturnItemDTO> itemReqs = req.getItems() != null ? req.getItems() : new ArrayList<>();
        final Long voucherId = voucher.getId();
        for (WastageReturnItemDTO itemDto : itemReqs) {
            wastageReturnItemRepository.save(buildItem(voucherId, itemDto));
        }

        // Compute and set totals
        List<WastageReturnItem> savedItems = wastageReturnItemRepository.findByVoucherId(voucher.getId());
        computeAndSetTotals(voucher, savedItems);
        voucher = wastageReturnRepository.save(voucher);

        return WastageReturnResponseDTO.fromEntity(voucher, savedItems);
    }

    public WastageReturnResponseDTO updateVoucher(Long id, WastageReturnRequestDTO req) {
        WastageReturn voucher = wastageReturnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Wastage/Return voucher not found with id: " + id));

        if (!"DRAFT".equals(voucher.getStatus())) {
            throw new RuntimeException("Cannot edit voucher in status: " + voucher.getStatus());
        }

        voucher.setDate(req.getDate() != null ? req.getDate() : voucher.getDate());
        voucher.setType(req.getType());
        voucher.setAssociatedParty(req.getAssociatedParty());
        if (req.getPartyType() != null) voucher.setPartyType(req.getPartyType());
        voucher.setReason(req.getReason());
        voucher.setLocation(req.getLocation());
        voucher.setRecordedBy(req.getRecordedBy());
        voucher.setNotes(req.getNotes());

        // Delete existing items and save new ones
        wastageReturnItemRepository.deleteByVoucherId(voucher.getId());

        List<WastageReturnItemDTO> itemReqs = req.getItems() != null ? req.getItems() : new ArrayList<>();
        final Long voucherId = voucher.getId();
        for (WastageReturnItemDTO itemDto : itemReqs) {
            wastageReturnItemRepository.save(buildItem(voucherId, itemDto));
        }

        List<WastageReturnItem> savedItems = wastageReturnItemRepository.findByVoucherId(voucher.getId());
        computeAndSetTotals(voucher, savedItems);
        voucher = wastageReturnRepository.save(voucher);

        return WastageReturnResponseDTO.fromEntity(voucher, savedItems);
    }

    public WastageReturnResponseDTO submitForApproval(Long id) {
        WastageReturn voucher = wastageReturnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Wastage/Return voucher not found with id: " + id));

        if (!"DRAFT".equals(voucher.getStatus())) {
            throw new RuntimeException("Only DRAFT vouchers can be submitted for approval. Current status: " + voucher.getStatus());
        }

        voucher.setStatus("PENDING_APPROVAL");
        voucher = wastageReturnRepository.save(voucher);

        List<WastageReturnItem> items = wastageReturnItemRepository.findByVoucherId(voucher.getId());
        return WastageReturnResponseDTO.fromEntity(voucher, items);
    }

    public WastageReturnResponseDTO approveVoucher(Long id) {
        WastageReturn voucher = wastageReturnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Wastage/Return voucher not found with id: " + id));

        if (!"PENDING_APPROVAL".equals(voucher.getStatus())) {
            throw new RuntimeException("Only PENDING_APPROVAL vouchers can be approved. Current status: " + voucher.getStatus());
        }

        // Set approvedBy from security context
        String approver = SecurityContextHolder.getContext().getAuthentication().getName();
        voucher.setApprovedBy(approver);
        voucher.setApprovalDate(LocalDateTime.now());
        voucher.setStatus("APPROVED");

        // Adjust stock
        List<WastageReturnItem> items = wastageReturnItemRepository.findByVoucherId(voucher.getId());
        for (WastageReturnItem item : items) {
            if ("WASTAGE".equals(voucher.getType())) {
                // Wastage -> deduct stock
                adjustStock(item, false);
            } else if ("GOODS_RETURN".equals(voucher.getType())) {
                if ("CUSTOMER".equals(voucher.getPartyType())) {
                    // Customer return -> add stock back
                    adjustStock(item, true);
                } else {
                    // Supplier return or NONE -> deduct stock (sending goods back to supplier)
                    adjustStock(item, false);
                }
            }
        }

        voucher = wastageReturnRepository.save(voucher);
        return WastageReturnResponseDTO.fromEntity(voucher, items);
    }

    public WastageReturnResponseDTO rejectVoucher(Long id, String rejectionReason) {
        WastageReturn voucher = wastageReturnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Wastage/Return voucher not found with id: " + id));

        if (!"PENDING_APPROVAL".equals(voucher.getStatus())) {
            throw new RuntimeException("Only PENDING_APPROVAL vouchers can be rejected. Current status: " + voucher.getStatus());
        }

        voucher.setStatus("REJECTED");
        voucher.setRejectionReason(rejectionReason);
        voucher = wastageReturnRepository.save(voucher);

        List<WastageReturnItem> items = wastageReturnItemRepository.findByVoucherId(voucher.getId());
        return WastageReturnResponseDTO.fromEntity(voucher, items);
    }

    public WastageReturnResponseDTO completeVoucher(Long id) {
        WastageReturn voucher = wastageReturnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Wastage/Return voucher not found with id: " + id));

        if (!"APPROVED".equals(voucher.getStatus())) {
            throw new RuntimeException("Only APPROVED vouchers can be completed. Current status: " + voucher.getStatus());
        }

        voucher.setStatus("COMPLETED");
        voucher = wastageReturnRepository.save(voucher);

        List<WastageReturnItem> items = wastageReturnItemRepository.findByVoucherId(voucher.getId());
        return WastageReturnResponseDTO.fromEntity(voucher, items);
    }

    public WastageReturnResponseDTO cancelVoucher(Long id) {
        WastageReturn voucher = wastageReturnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Wastage/Return voucher not found with id: " + id));

        List<String> cancellableStatuses = Arrays.asList("DRAFT", "PENDING_APPROVAL", "APPROVED");
        if (!cancellableStatuses.contains(voucher.getStatus())) {
            throw new RuntimeException("Voucher in status " + voucher.getStatus() + " cannot be cancelled.");
        }

        // If was APPROVED, reverse stock adjustments
        if ("APPROVED".equals(voucher.getStatus())) {
            List<WastageReturnItem> items = wastageReturnItemRepository.findByVoucherId(voucher.getId());
            for (WastageReturnItem item : items) {
                if ("WASTAGE".equals(voucher.getType())) {
                    // Reverse deduct -> add back
                    adjustStock(item, true);
                } else if ("GOODS_RETURN".equals(voucher.getType())) {
                    if ("CUSTOMER".equals(voucher.getPartyType())) {
                        // Reverse add -> deduct
                        adjustStock(item, false);
                    } else {
                        // Reverse deduct -> add back
                        adjustStock(item, true);
                    }
                }
            }
        }

        voucher.setStatus("CANCELLED");
        voucher = wastageReturnRepository.save(voucher);

        List<WastageReturnItem> items = wastageReturnItemRepository.findByVoucherId(voucher.getId());
        return WastageReturnResponseDTO.fromEntity(voucher, items);
    }

    public void deleteVoucher(Long id) {
        WastageReturn voucher = wastageReturnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Wastage/Return voucher not found with id: " + id));

        if (!"DRAFT".equals(voucher.getStatus())) {
            throw new RuntimeException("Only DRAFT vouchers can be deleted. Current status: " + voucher.getStatus());
        }

        wastageReturnItemRepository.deleteByVoucherId(voucher.getId());
        wastageReturnRepository.delete(voucher);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public WastageReturnResponseDTO getById(Long id) {
        WastageReturn voucher = wastageReturnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Wastage/Return voucher not found with id: " + id));
        List<WastageReturnItem> items = wastageReturnItemRepository.findByVoucherId(voucher.getId());
        return WastageReturnResponseDTO.fromEntity(voucher, items);
    }

    @Transactional(readOnly = true)
    public WastageReturnPageResponseDTO getVouchers(int page, int size, String type, String status, String search) {
        Specification<WastageReturn> spec = buildSpec(type, status, search);
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<WastageReturn> voucherPage = wastageReturnRepository.findAll(spec, pageable);

        List<WastageReturnResponseDTO> dtos = voucherPage.getContent().stream()
                .map(v -> {
                    List<WastageReturnItem> items = wastageReturnItemRepository.findByVoucherId(v.getId());
                    return WastageReturnResponseDTO.fromEntity(v, items);
                })
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(page, size, voucherPage.getTotalElements(), voucherPage.getTotalPages());
        return new WastageReturnPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public WastageReturnStatsDTO getStats() {
        WastageReturnStatsDTO stats = new WastageReturnStatsDTO();

        List<WastageReturn> allVouchers = wastageReturnRepository.findAll();
        stats.setTotalVouchers(allVouchers.size());

        // Pending approval count
        long pendingCount = allVouchers.stream()
                .filter(v -> "PENDING_APPROVAL".equals(v.getStatus()))
                .count();
        stats.setPendingApproval((int) pendingCount);

        List<String> approvedStatuses = Arrays.asList("APPROVED", "COMPLETED");

        // Total wastage value (APPROVED or COMPLETED)
        BigDecimal totalWastageValue = allVouchers.stream()
                .filter(v -> "WASTAGE".equals(v.getType()) && approvedStatuses.contains(v.getStatus()))
                .map(v -> v.getTotalValue() != null ? v.getTotalValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setTotalWastageValue(totalWastageValue);

        // Total return value (APPROVED or COMPLETED)
        BigDecimal totalReturnValue = allVouchers.stream()
                .filter(v -> "GOODS_RETURN".equals(v.getType()) && approvedStatuses.contains(v.getStatus()))
                .map(v -> v.getTotalValue() != null ? v.getTotalValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setTotalReturnValue(totalReturnValue);

        // Monthly values (current month)
        LocalDate now = LocalDate.now();
        int currentYear = now.getYear();
        int currentMonth = now.getMonthValue();

        BigDecimal monthlyWastage = allVouchers.stream()
                .filter(v -> "WASTAGE".equals(v.getType())
                        && v.getDate() != null
                        && v.getDate().getYear() == currentYear
                        && v.getDate().getMonthValue() == currentMonth)
                .map(v -> v.getTotalValue() != null ? v.getTotalValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setMonthlyWastage(monthlyWastage);

        BigDecimal monthlyReturns = allVouchers.stream()
                .filter(v -> "GOODS_RETURN".equals(v.getType())
                        && v.getDate() != null
                        && v.getDate().getYear() == currentYear
                        && v.getDate().getMonthValue() == currentMonth)
                .map(v -> v.getTotalValue() != null ? v.getTotalValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setMonthlyReturns(monthlyReturns);

        // Top wasted products: gather items from WASTAGE vouchers
        List<Long> wastageVoucherIds = allVouchers.stream()
                .filter(v -> "WASTAGE".equals(v.getType()))
                .map(WastageReturn::getId)
                .collect(Collectors.toList());

        List<WastageReturnItem> wastageItems = new ArrayList<>();
        for (Long vid : wastageVoucherIds) {
            wastageItems.addAll(wastageReturnItemRepository.findByVoucherId(vid));
        }

        // Group by productName, sum totalCost and quantity, top 5
        // Keys must match frontend: name, value, quantity
        Map<String, Map<String, Object>> productAgg = new LinkedHashMap<>();
        for (WastageReturnItem item : wastageItems) {
            String pName = item.getProductName() != null ? item.getProductName() : "Unknown";
            productAgg.computeIfAbsent(pName, k -> {
                Map<String, Object> m = new HashMap<>();
                m.put("name", k);
                m.put("value", BigDecimal.ZERO);
                m.put("quantity", 0);
                return m;
            });
            Map<String, Object> entry = productAgg.get(pName);
            BigDecimal cost = item.getTotalCost() != null ? item.getTotalCost() : BigDecimal.ZERO;
            int qty = item.getQuantity() != null ? item.getQuantity() : 0;
            entry.put("value", ((BigDecimal) entry.get("value")).add(cost));
            entry.put("quantity", (int) entry.get("quantity") + qty);
        }

        List<Map<String, Object>> topWasted = productAgg.values().stream()
                .sorted((a, b) -> ((BigDecimal) b.get("value")).compareTo((BigDecimal) a.get("value")))
                .limit(5)
                .collect(Collectors.toList());
        stats.setTopWastedProducts(topWasted);

        // Top return reasons: from GOODS_RETURN vouchers, group by reason, count and sum value, top 5
        // Keys must match frontend: reason, count, value
        Map<String, Map<String, Object>> reasonAgg = new LinkedHashMap<>();
        for (WastageReturn v : allVouchers) {
            if (!"GOODS_RETURN".equals(v.getType())) continue;
            String reason = v.getReason() != null ? v.getReason() : "No Reason";
            reasonAgg.computeIfAbsent(reason, k -> {
                Map<String, Object> m = new HashMap<>();
                m.put("reason", k);
                m.put("count", 0);
                m.put("value", BigDecimal.ZERO);
                return m;
            });
            Map<String, Object> entry = reasonAgg.get(reason);
            BigDecimal val = v.getTotalValue() != null ? v.getTotalValue() : BigDecimal.ZERO;
            entry.put("count", (int) entry.get("count") + 1);
            entry.put("value", ((BigDecimal) entry.get("value")).add(val));
        }

        List<Map<String, Object>> topReasons = reasonAgg.values().stream()
                .sorted((a, b) -> Integer.compare((int) b.get("count"), (int) a.get("count")))
                .limit(5)
                .collect(Collectors.toList());
        stats.setTopReturnReasons(topReasons);

        return stats;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private WastageReturnItem buildItem(Long voucherId, WastageReturnItemDTO dto) {
        WastageReturnItem item = new WastageReturnItem();
        item.setVoucherId(voucherId);
        item.setProductId(dto.getProductId());
        item.setProductName(dto.getProductName());
        item.setSku(dto.getSku());
        item.setBatchNo(dto.getBatchNo());
        item.setQuantity(dto.getQuantity());
        item.setUnitCost(dto.getUnitCost() != null ? dto.getUnitCost() : BigDecimal.ZERO);
        item.setUnit(dto.getUnit());
        item.setReasonSpecific(dto.getReasonSpecific());

        // Compute totalCost
        BigDecimal unitCost = item.getUnitCost();
        int qty = item.getQuantity() != null ? item.getQuantity() : 0;
        BigDecimal totalCost = unitCost.multiply(BigDecimal.valueOf(qty));
        item.setTotalCost(totalCost);

        return item;
    }

    private void computeAndSetTotals(WastageReturn voucher, List<WastageReturnItem> items) {
        int totalItems = items.stream()
                .mapToInt(i -> i.getQuantity() != null ? i.getQuantity() : 0)
                .sum();
        BigDecimal totalValue = items.stream()
                .map(i -> i.getTotalCost() != null ? i.getTotalCost() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        voucher.setTotalItems(totalItems);
        voucher.setTotalValue(totalValue);
    }

    private void adjustStock(WastageReturnItem item, boolean add) {
        if (item.getProductId() == null) return;
        List<ProductStock> stocks = productStockRepository.findByProductId(item.getProductId());
        if (stocks.isEmpty()) return;
        int qty = item.getQuantity() != null ? item.getQuantity() : 0;
        if (add) {
            // Add to first warehouse
            ProductStock stock = stocks.get(0);
            stock.setCurrentStock((stock.getCurrentStock() == null ? 0 : stock.getCurrentStock()) + qty);
            productStockRepository.save(stock);
        } else {
            // Deduct from warehouse with most stock
            ProductStock stock = stocks.stream()
                    .max(Comparator.comparingInt(s -> s.getCurrentStock() == null ? 0 : s.getCurrentStock()))
                    .orElse(stocks.get(0));
            int current = stock.getCurrentStock() == null ? 0 : stock.getCurrentStock();
            stock.setCurrentStock(Math.max(0, current - qty));
            productStockRepository.save(stock);
        }
    }

    private Specification<WastageReturn> buildSpec(String type, String status, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (type != null && !type.isBlank()) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("voucherNumber")), like),
                        cb.like(cb.lower(root.get("reason")), like),
                        cb.like(cb.lower(root.get("location")), like)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
