package com.company.project.services;

import com.company.project.dto.ReceiptVoucherRequestDTO;
import com.company.project.dto.ReceiptVoucherResponseDTO;
import com.company.project.entities.ReceiptVoucher;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.JournalEntrySourceRepository;
import com.company.project.repositories.ReceiptVoucherRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReceiptVoucherService {

    private final ReceiptVoucherRepository receiptVoucherRepository;
    private final NotificationService notificationService;
    private final FinancialEventService financialEventService;
    private final VoucherNumberService voucherNumberService;
    private final JournalEntrySourceRepository journalEntrySourceRepository;

    public ReceiptVoucherService(ReceiptVoucherRepository receiptVoucherRepository,
                                  NotificationService notificationService,
                                  FinancialEventService financialEventService,
                                  VoucherNumberService voucherNumberService,
                                  JournalEntrySourceRepository journalEntrySourceRepository) {
        this.receiptVoucherRepository = receiptVoucherRepository;
        this.notificationService = notificationService;
        this.financialEventService = financialEventService;
        this.voucherNumberService = voucherNumberService;
        this.journalEntrySourceRepository = journalEntrySourceRepository;
    }

    /**
     * Posts this voucher to the general ledger when its status is "completed" —
     * closes the gap where accountant-entered Receipt Vouchers never generated a
     * journal entry (see docs/gymbios-financial-roadmap.html — C1). Vouchers
     * created internally via createVoucherFromModule() are NOT routed through this:
     * those already have their own journal entry posted by the module that called
     * them (e.g. onSaleCompleted, onMemberPaymentReceived), so posting again here
     * would double-count the same cash movement.
     */
    private void postToLedgerIfNeeded(ReceiptVoucher rv) {
        if ("completed".equalsIgnoreCase(rv.getStatus())) {
            financialEventService.onManualReceiptVoucherPosted(rv);
        }
    }

    /**
     * Filters at the query level (via Specification) instead of loading the whole
     * table and filtering with a Java stream (see docs/gymbios-financial-roadmap.html
     * — M1).
     */
    public List<ReceiptVoucherResponseDTO> getReceiptVouchers(
            String search, String status, String branch,
            String sourceCategory, LocalDate from, LocalDate to) {
        Specification<ReceiptVoucher> spec = buildSpec(search, status, branch, sourceCategory, from, to);
        List<ReceiptVoucher> all = receiptVoucherRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "date"));
        return all.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    private Specification<ReceiptVoucher> buildSpec(
            String search, String status, String branch,
            String sourceCategory, LocalDate from, LocalDate to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null && !status.isBlank() && !status.equalsIgnoreCase("all")) {
                predicates.add(cb.equal(cb.lower(root.get("status")), status.toLowerCase(Locale.ROOT)));
            }
            if (branch != null && !branch.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("branch")), branch.toLowerCase(Locale.ROOT)));
            }
            if (sourceCategory != null && !sourceCategory.isBlank() && !sourceCategory.equalsIgnoreCase("all")) {
                predicates.add(cb.equal(cb.lower(root.get("sourceCategory")), sourceCategory.toLowerCase(Locale.ROOT)));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), to));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("voucherNo")), like),
                        cb.like(cb.lower(root.get("memberName")), like),
                        cb.like(cb.lower(root.get("source")), like),
                        cb.like(cb.lower(root.get("reference")), like)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public ReceiptVoucherResponseDTO getReceiptVoucherById(Long id) {
        ReceiptVoucher rv = receiptVoucherRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Receipt Voucher not found: " + id));
        return toResponseDTO(rv);
    }

    /** Attaches the linked posted journal entry's id, if this voucher has been posted. */
    private ReceiptVoucherResponseDTO toResponseDTO(ReceiptVoucher rv) {
        Long journalVoucherId = journalEntrySourceRepository
                .findBySourceEntityTypeAndSourceEntityId("ReceiptVoucher", rv.getId())
                .map(source -> source.getJournalVoucherId())
                .orElse(null);
        return ReceiptVoucherResponseDTO.fromEntity(rv, journalVoucherId);
    }

    public ReceiptVoucherResponseDTO createReceiptVoucher(ReceiptVoucherRequestDTO req) {
        ReceiptVoucher rv = new ReceiptVoucher();
        rv.setVoucherNo(voucherNumberService.next("RV"));
        applyRequest(rv, req);
        rv.setStatus(req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus() : "draft");
        ReceiptVoucher saved = receiptVoucherRepository.save(rv);
        postToLedgerIfNeeded(saved);
        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER", "ACCOUNTANT"),
                "Payment Received",
                "Receipt " + saved.getVoucherNo() + " created" +
                (saved.getAmount() != null ? " for AED " + saved.getAmount() : "") + ".",
                "SUCCESS", "MEDIUM", "BILLING",
                saved.getId(), "/receipt-voucher",
                "RECEIPT_CREATED_" + saved.getId()
        );
        return toResponseDTO(saved);
    }

    public ReceiptVoucherResponseDTO updateReceiptVoucher(Long id, ReceiptVoucherRequestDTO req) {
        ReceiptVoucher rv = receiptVoucherRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Receipt Voucher not found: " + id));
        applyRequest(rv, req);
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            rv.setStatus(req.getStatus());
        }
        ReceiptVoucher saved = receiptVoucherRepository.save(rv);
        postToLedgerIfNeeded(saved);
        return toResponseDTO(saved);
    }

    public ReceiptVoucherResponseDTO updateStatus(Long id, String status) {
        ReceiptVoucher rv = receiptVoucherRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Receipt Voucher not found: " + id));
        rv.setStatus(status);
        ReceiptVoucher saved = receiptVoucherRepository.save(rv);
        postToLedgerIfNeeded(saved);
        return toResponseDTO(saved);
    }

    public void deleteReceiptVoucher(Long id) {
        ReceiptVoucher rv = receiptVoucherRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Receipt Voucher not found: " + id));
        receiptVoucherRepository.delete(rv);
    }

    /**
     * Internal helper — called by any module that receives a payment (Members,
     * Add-ons, POS, etc.) to automatically post a ReceiptVoucher into the
     * General Ledger / Financials module.  NOT exposed as an HTTP endpoint.
     */
    public void createVoucherFromModule(
            String source,
            String sourceCategory,
            String memberName,
            Long memberId,
            BigDecimal amount,
            String paymentMode,
            String reference,
            String transactionId,
            String notes,
            List<com.company.project.dto.PaymentSplitDTO> paymentBreakdown) {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;

        ReceiptVoucher rv = new ReceiptVoucher();
        rv.setVoucherNo(voucherNumberService.next("RV"));
        rv.setDate(LocalDate.now());
        rv.setSource(source);
        rv.setSourceCategory(sourceCategory);
        rv.setMemberName(memberName);
        rv.setMemberId(memberId);
        rv.setAmount(amount);
        rv.setPaymentMode(paymentMode != null ? paymentMode : "Cash");
        rv.setPaymentBreakdown(paymentBreakdown);
        rv.setReference(reference);
        rv.setTransactionId(transactionId);
        rv.setNotes(notes);
        rv.setStatus("completed");   // "completed" matches FinancialAnalyticsService query
        rv.setVoucherType("Receipt");

        ReceiptVoucher saved = receiptVoucherRepository.save(rv);

        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER", "ACCOUNTANT"),
                "Payment Received – " + sourceCategory,
                source + " | Voucher " + saved.getVoucherNo() + " | AED " + saved.getAmount(),
                "SUCCESS", "MEDIUM", "BILLING",
                saved.getId(), "/receipt-voucher",
                "RECEIPT_MODULE_" + saved.getId()
        );
    }

    private void applyRequest(ReceiptVoucher rv, ReceiptVoucherRequestDTO req) {
        rv.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        rv.setSource(req.getSource());
        rv.setSourceCategory(req.getSourceCategory());
        rv.setMemberId(req.getMemberId());
        rv.setMemberName(req.getMemberName());
        rv.setAmount(req.getAmount() != null ? req.getAmount() : BigDecimal.ZERO);
        rv.setPaymentMode(req.getPaymentMode());
        rv.setPaymentBreakdown(req.getPaymentBreakdown());
        rv.setBranch(req.getBranch());
        rv.setReference(req.getReference());
        rv.setNotes(req.getNotes());
        rv.setTransactionId(req.getTransactionId());
        rv.setApprovedBy(req.getApprovedBy());
        rv.setVoucherType(req.getVoucherType());
    }
}
