package com.company.project.services;

import com.company.project.dto.ReceiptVoucherRequestDTO;
import com.company.project.dto.ReceiptVoucherResponseDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.ReceiptVoucher;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.JournalEntrySourceRepository;
import com.company.project.repositories.JournalVoucherRepository;
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
    private final BranchRepository branchRepository;
    private final JournalVoucherService journalVoucherService;
    private final JournalVoucherRepository journalVoucherRepository;

    public ReceiptVoucherService(ReceiptVoucherRepository receiptVoucherRepository,
                                  NotificationService notificationService,
                                  FinancialEventService financialEventService,
                                  VoucherNumberService voucherNumberService,
                                  JournalEntrySourceRepository journalEntrySourceRepository,
                                  BranchRepository branchRepository,
                                  JournalVoucherService journalVoucherService,
                                  JournalVoucherRepository journalVoucherRepository) {
        this.receiptVoucherRepository = receiptVoucherRepository;
        this.notificationService = notificationService;
        this.financialEventService = financialEventService;
        this.voucherNumberService = voucherNumberService;
        this.journalEntrySourceRepository = journalEntrySourceRepository;
        this.branchRepository = branchRepository;
        this.journalVoucherService = journalVoucherService;
        this.journalVoucherRepository = journalVoucherRepository;
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
        List<ReceiptVoucher> all = receiptVoucherRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "date", "id"));
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

    /**
     * The manual create/update paths (this form) had no amount check at all, unlike
     * createVoucherFromModule()'s "amount == null || <= 0" guard — a negative or
     * zero amount saved fine and, once marked "completed", would post a negative
     * DR/CR pair to the ledger via onManualReceiptVoucherPosted, corrupting real
     * account balances. Every write path must go through this so it can't be
     * bypassed by calling the API directly even if the frontend form also validates.
     */
    private void assertPositiveAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleViolationException("Amount must be greater than 0");
        }
    }

    public ReceiptVoucherResponseDTO createReceiptVoucher(ReceiptVoucherRequestDTO req) {
        assertPositiveAmount(req.getAmount());
        ReceiptVoucher rv = new ReceiptVoucher();
        rv.setVoucherNo(voucherNumberService.next("RV"));
        applyRequest(rv, req);
        rv.setStatus(req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus() : "draft");
        ReceiptVoucher saved = receiptVoucherRepository.save(rv);
        postToLedgerIfNeeded(saved);
        notificationService.notifyRoles(
                List.of("GYMBIOS_ADMIN", "MANAGER", "ACCOUNTANT"),
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
        assertPositiveAmount(req.getAmount());
        ReceiptVoucher rv = receiptVoucherRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Receipt Voucher not found: " + id));

        // Once a voucher is posted to the General Ledger (either auto-created from a
        // real payment event, or a manual voucher that has since been marked
        // "completed"), its amount is the source the original journal entry was built
        // from. If the amount changes, that entry is now wrong — silently leaving it
        // in place would desync the voucher document from the books it's supposed to
        // be proof of. Rather than block the edit outright, reverse the stale entry
        // and repost a fresh one for the corrected amount, dated today (the actual
        // correction date), same as reversing any other posted journal entry.
        var existingSource = journalEntrySourceRepository
                .findBySourceEntityTypeAndSourceEntityId("ReceiptVoucher", rv.getId());
        boolean amountChanged = req.getAmount() != null && rv.getAmount().compareTo(req.getAmount()) != 0;

        if (existingSource.isPresent() && amountChanged) {
            journalVoucherRepository.findByIdAndDeletedAtIsNull(existingSource.get().getJournalVoucherId())
                    .filter(jv -> "POSTED".equalsIgnoreCase(jv.getStatus()) && jv.getReversedByVoucherId() == null)
                    .ifPresent(jv -> journalVoucherService.reverseJournalVoucher(
                            jv.getId(), LocalDate.now(),
                            "Receipt Voucher " + rv.getVoucherNo() + " amount corrected"));
            // Clear the idempotency guard so postToLedgerIfNeeded() below can post a
            // new entry for the corrected amount instead of silently no-op'ing.
            journalEntrySourceRepository.deleteBySourceEntityTypeAndSourceEntityId("ReceiptVoucher", rv.getId());
        }

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

    /**
     * Deleting a voucher that was already posted to the General Ledger must not
     * leave that journal entry behind — an orphaned JV would still show real
     * money received in the books for a receipt that, as far as this module is
     * concerned, no longer exists. Ledger entries are never hard-deleted once
     * posted (see JournalVoucherService.deleteJournalVoucher's own DRAFT/
     * CANCELLED-only guard), so this reverses it instead: an equal-and-opposite
     * entry that zeroes out its effect, same as the standard "correct a posted
     * entry" path elsewhere in Financials.
     */
    public void deleteReceiptVoucher(Long id) {
        ReceiptVoucher rv = receiptVoucherRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Receipt Voucher not found: " + id));

        journalEntrySourceRepository
                .findBySourceEntityTypeAndSourceEntityId("ReceiptVoucher", id)
                .flatMap(source -> journalVoucherRepository.findByIdAndDeletedAtIsNull(source.getJournalVoucherId()))
                .filter(jv -> "POSTED".equalsIgnoreCase(jv.getStatus()) && jv.getReversedByVoucherId() == null)
                .ifPresent(jv -> journalVoucherService.reverseJournalVoucher(
                        jv.getId(), LocalDate.now(), "Receipt Voucher " + rv.getVoucherNo() + " deleted"));

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
        createVoucherFromModule(source, sourceCategory, memberName, memberId, amount,
                paymentMode, reference, transactionId, notes, paymentBreakdown, null);
    }

    /**
     * Same as above, plus the branch the underlying record belongs to — unlike
     * the manual "Add Receipt" form (which always sends a branch), callers of
     * this module-triggered path previously left the voucher's branch blank
     * entirely, which showed up as an empty Branch field everywhere the
     * voucher was displayed or printed. branchId is resolved to a branch name
     * here (rather than making every caller do its own lookup); a null or
     * unresolvable id just leaves the branch blank as before, it never fails
     * the voucher creation.
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
            List<com.company.project.dto.PaymentSplitDTO> paymentBreakdown,
            Long branchId) {

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
        rv.setBranchId(branchId);
        if (branchId != null) {
            branchRepository.findById(branchId).map(Branch::getBranchName).ifPresent(rv::setBranch);
        }

        ReceiptVoucher saved = receiptVoucherRepository.save(rv);

        notificationService.notifyRoles(
                List.of("GYMBIOS_ADMIN", "MANAGER", "ACCOUNTANT"),
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
