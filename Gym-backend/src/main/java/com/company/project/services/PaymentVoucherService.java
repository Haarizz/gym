package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.PaymentVoucherBillDTO;
import com.company.project.dto.PaymentVoucherRequestDTO;
import com.company.project.dto.PaymentVoucherResponseDTO;
import com.company.project.dto.PaymentVouchersPageResponseDTO;
import com.company.project.dto.PaymentVoucherStatsDTO;
import com.company.project.entities.PaymentVoucher;
import com.company.project.entities.PaymentVoucherBill;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.PaymentVoucherBillRepository;
import com.company.project.repositories.PaymentVoucherRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@Transactional
public class PaymentVoucherService {

    private final PaymentVoucherRepository paymentVoucherRepository;
    private final PaymentVoucherBillRepository billRepository;
    private final FinancialEventService financialEventService;
    private final VoucherNumberService voucherNumberService;

    public PaymentVoucherService(PaymentVoucherRepository paymentVoucherRepository,
                                 PaymentVoucherBillRepository billRepository,
                                 FinancialEventService financialEventService,
                                 VoucherNumberService voucherNumberService) {
        this.paymentVoucherRepository = paymentVoucherRepository;
        this.billRepository           = billRepository;
        this.financialEventService    = financialEventService;
        this.voucherNumberService     = voucherNumberService;
    }

    private static final List<String> SORTABLE_FIELDS = List.of(
            "voucherNo", "supplierName", "paymentDate", "amount", "status", "supplierType");

    /**
     * Real DB-level pagination (Specification + Pageable, matching ReceiptService's
     * established pattern) — previously loaded every payment voucher on the branch
     * into memory before filtering/sorting/returning the whole list, with no cap.
     * Branch scoping is not re-applied here: PaymentVoucher already carries
     * @Filter("branchFilter"), enabled automatically for this query exactly as it
     * was for the old findAllByOrderByPaymentDateDesc() call.
     *
     * `category` mirrors the frontend's composite quick-filter exactly (not a raw
     * column match): "pending" = status IN (Pending, Partial), "paid" = status =
     * Paid, "overdue" = status = Overdue, "supplier" = supplierType = Supplier —
     * kept in sync with payment-voucher.tsx's filteredAndSortedVouchers logic.
     */
    @Transactional(readOnly = true)
    public PaymentVouchersPageResponseDTO getPaymentVouchers(
            String search, String status, String supplierType, String category,
            LocalDate from, LocalDate to, String sortField, String sortDirection,
            int page, int limit) {
        Specification<PaymentVoucher> spec = buildSpec(search, status, supplierType, category, from, to);

        String sortBy = SORTABLE_FIELDS.contains(sortField) ? sortField : "paymentDate";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(direction, sortBy));

        Page<PaymentVoucher> voucherPage = paymentVoucherRepository.findAll(spec, pageable);

        List<PaymentVoucherResponseDTO> dtos = voucherPage.getContent().stream()
                .map(pv -> {
                    List<PaymentVoucherBill> bills = billRepository.findByPaymentVoucherId(pv.getId());
                    return PaymentVoucherResponseDTO.fromEntity(pv, bills);
                })
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(
                page, limit, voucherPage.getTotalElements(), voucherPage.getTotalPages());

        return new PaymentVouchersPageResponseDTO(dtos, pagination);
    }

    private Specification<PaymentVoucher> buildSpec(String search, String status, String supplierType,
                                                      String category, LocalDate from, LocalDate to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("voucherNo")), pattern),
                        cb.like(cb.lower(root.get("supplierName")), pattern),
                        cb.like(cb.lower(root.get("billNo")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern)
                ));
            }
            if (status != null && !status.isBlank() && !status.equalsIgnoreCase("all")) {
                predicates.add(cb.equal(cb.lower(root.get("status")), status.toLowerCase(Locale.ROOT)));
            }
            if (supplierType != null && !supplierType.isBlank() && !supplierType.equalsIgnoreCase("all")) {
                predicates.add(cb.equal(cb.lower(root.get("supplierType")), supplierType.toLowerCase(Locale.ROOT)));
            }
            if (category != null && !category.isBlank() && !category.equalsIgnoreCase("all")) {
                switch (category.toLowerCase(Locale.ROOT)) {
                    case "pending" -> predicates.add(cb.lower(root.get("status")).in("pending", "partial"));
                    case "paid" -> predicates.add(cb.equal(cb.lower(root.get("status")), "paid"));
                    case "overdue" -> predicates.add(cb.equal(cb.lower(root.get("status")), "overdue"));
                    case "supplier" -> predicates.add(cb.equal(cb.lower(root.get("supplierType")), "supplier"));
                    default -> { /* unrecognized category — no additional filter */ }
                }
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("paymentDate"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("paymentDate"), to));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * True branch-wide stats for the dashboard cards — mirrors ExpenseService.getStats():
     * a full aggregate over every voucher, independent of the current page/filters, so
     * these numbers stay correct once the list itself is paginated.
     */
    @Transactional(readOnly = true)
    public PaymentVoucherStatsDTO getStats() {
        List<PaymentVoucher> all = paymentVoucherRepository.findAll();

        LocalDate now = LocalDate.now();
        BigDecimal totalPaidThisMonth = all.stream()
                .filter(v -> "Paid".equalsIgnoreCase(v.getStatus())
                        && v.getPaymentDate() != null
                        && v.getPaymentDate().getMonthValue() == now.getMonthValue()
                        && v.getPaymentDate().getYear() == now.getYear())
                .map(PaymentVoucher::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPending = all.stream()
                .filter(v -> "Pending".equalsIgnoreCase(v.getStatus()) || "Partial".equalsIgnoreCase(v.getStatus()))
                .map(PaymentVoucher::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long overdueCount = all.stream().filter(v -> "Overdue".equalsIgnoreCase(v.getStatus())).count();

        LocalDate nextWeek = now.plusDays(7);
        long upcomingPayments = all.stream()
                .filter(v -> "Pending".equalsIgnoreCase(v.getStatus())
                        && v.getPaymentDate() != null
                        && !v.getPaymentDate().isAfter(nextWeek))
                .count();

        PaymentVoucherStatsDTO stats = new PaymentVoucherStatsDTO();
        stats.setTotalPaidThisMonth(totalPaidThisMonth);
        stats.setTotalPending(totalPending);
        stats.setOverdueCount(overdueCount);
        stats.setUpcomingPayments(upcomingPayments);
        return stats;
    }

    public PaymentVoucherResponseDTO getPaymentVoucherById(Long id) {
        PaymentVoucher pv = paymentVoucherRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Payment Voucher not found: " + id));
        List<PaymentVoucherBill> bills = billRepository.findByPaymentVoucherId(id);
        return PaymentVoucherResponseDTO.fromEntity(pv, bills);
    }

    public PaymentVoucherResponseDTO createPaymentVoucher(PaymentVoucherRequestDTO req) {
        PaymentVoucher pv = new PaymentVoucher();
        pv.setVoucherNo(voucherNumberService.next("PV"));
        applyRequest(pv, req);
        pv.setStatus(req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus() : "Pending");
        PaymentVoucher saved = paymentVoucherRepository.save(pv);
        List<PaymentVoucherBill> bills = saveBills(saved.getId(), req.getBills());
        postToLedgerIfPaid(saved);
        return PaymentVoucherResponseDTO.fromEntity(saved, bills);
    }

    public PaymentVoucherResponseDTO updatePaymentVoucher(Long id, PaymentVoucherRequestDTO req) {
        PaymentVoucher pv = paymentVoucherRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Payment Voucher not found: " + id));
        applyRequest(pv, req);
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            pv.setStatus(req.getStatus());
        }
        PaymentVoucher saved = paymentVoucherRepository.save(pv);
        // Replace bills
        billRepository.deleteByPaymentVoucherId(id);
        List<PaymentVoucherBill> bills = saveBills(id, req.getBills());
        postToLedgerIfPaid(saved);
        return PaymentVoucherResponseDTO.fromEntity(saved, bills);
    }

    public PaymentVoucherResponseDTO updateStatus(Long id, String status) {
        PaymentVoucher pv = paymentVoucherRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Payment Voucher not found: " + id));
        pv.setStatus(status);
        PaymentVoucher saved = paymentVoucherRepository.save(pv);
        postToLedgerIfPaid(saved);

        List<PaymentVoucherBill> bills = billRepository.findByPaymentVoucherId(id);
        return PaymentVoucherResponseDTO.fromEntity(saved, bills);
    }

    /**
     * Generates the journal entry (DR Accounts Payable, CR Cash/Bank) the first
     * time a voucher's status is "Paid" — regardless of whether that happened via
     * create, a full update, or the dedicated status-patch endpoint. onSupplierPaid()
     * is idempotent per voucher id, so calling this on every save is safe even if
     * the voucher was already posted.
     */
    private void postToLedgerIfPaid(PaymentVoucher pv) {
        if ("Paid".equalsIgnoreCase(pv.getStatus())) {
            financialEventService.onSupplierPaid(pv);
        }
    }

    public void deletePaymentVoucher(Long id) {
        PaymentVoucher pv = paymentVoucherRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Payment Voucher not found: " + id));
        billRepository.deleteByPaymentVoucherId(id);
        paymentVoucherRepository.delete(pv);
    }

    /**
     * Internal helper — called by expense-type modules (Payroll, etc.) to
     * automatically post a PaymentVoucher into the General Ledger / Financials.
     * NOT exposed as an HTTP endpoint.
     */
    public void createPaymentVoucherFromModule(
            String supplierName,
            String supplierType,
            String billNo,
            BigDecimal amount,
            String paymentMethod,
            String description,
            String notes) {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;

        PaymentVoucher pv = new PaymentVoucher();
        pv.setVoucherNo(voucherNumberService.next("PV"));
        pv.setSupplierName(supplierName);
        pv.setSupplierType(supplierType != null ? supplierType : "Employee");
        pv.setBillNo(billNo);
        pv.setPaymentDate(LocalDate.now());
        pv.setAmount(amount);
        pv.setPaymentMethod(paymentMethod != null ? paymentMethod : "Bank Transfer");
        pv.setDescription(description);
        pv.setNotes(notes);
        pv.setStatus("Paid");

        paymentVoucherRepository.save(pv);
        // No separate notification — callers already send their own
    }

    private void applyRequest(PaymentVoucher pv, PaymentVoucherRequestDTO req) {
        pv.setSupplierName(req.getSupplierName());
        pv.setSupplierType(req.getSupplierType() != null ? req.getSupplierType() : "Supplier");
        pv.setBillNo(req.getBillNo());
        pv.setPaymentDate(req.getPaymentDate() != null ? req.getPaymentDate() : LocalDate.now());
        pv.setAmount(req.getAmount() != null ? req.getAmount() : BigDecimal.ZERO);
        pv.setPaymentMethod(req.getPaymentMethod());
        pv.setPaymentBreakdown(req.getPaymentBreakdown());
        pv.setDescription(req.getDescription());
        pv.setBankAccount(req.getBankAccount());
        pv.setChequeNo(req.getChequeNo());
        pv.setChequeDate(req.getChequeDate());
        pv.setNotes(req.getNotes());
    }

    private List<PaymentVoucherBill> saveBills(Long paymentVoucherId, List<PaymentVoucherBillDTO> billDTOs) {
        if (billDTOs == null || billDTOs.isEmpty()) return Collections.emptyList();
        return billDTOs.stream().map(dto -> {
            PaymentVoucherBill bill = new PaymentVoucherBill();
            bill.setPaymentVoucherId(paymentVoucherId);
            bill.setBillNo(dto.getBillNo());
            bill.setBillDate(dto.getBillDate());
            bill.setOriginalAmount(dto.getOriginalAmount() != null ? dto.getOriginalAmount() : BigDecimal.ZERO);
            bill.setPaidAmount(dto.getPaidAmount() != null ? dto.getPaidAmount() : BigDecimal.ZERO);
            bill.setRemainingBalance(dto.getRemainingBalance() != null ? dto.getRemainingBalance() : BigDecimal.ZERO);
            bill.setDueDate(dto.getDueDate());
            bill.setStatus(dto.getStatus() != null ? dto.getStatus() : "Pending");
            return billRepository.save(bill);
        }).collect(Collectors.toList());
    }
}
