package com.company.project.services;

import com.company.project.dto.MemberAddonPageResponseDTO;
import com.company.project.dto.MemberAddonRequestDTO;
import com.company.project.dto.MemberAddonResponseDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.ReceiptResponseDTO;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.entities.Member;
import com.company.project.entities.MemberAddon;
import com.company.project.entities.Receipt;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.MemberRepository;
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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class MemberAddonService {

    private final MemberAddonRepository memberAddonRepository;
    private final ReceiptVoucherService receiptVoucherService;
    private final FinancialEventService financialEventService;
    private final MemberRepository memberRepository;
    private final ReceiptService receiptService;
    private final WalletService walletService;
    private final AddonPaymentService addonPaymentService;

    public MemberAddonService(MemberAddonRepository memberAddonRepository,
                               ReceiptVoucherService receiptVoucherService,
                               FinancialEventService financialEventService,
                               MemberRepository memberRepository,
                               ReceiptService receiptService,
                               WalletService walletService,
                               AddonPaymentService addonPaymentService) {
        this.memberAddonRepository = memberAddonRepository;
        this.receiptVoucherService = receiptVoucherService;
        this.financialEventService = financialEventService;
        this.memberRepository = memberRepository;
        this.receiptService = receiptService;
        this.walletService = walletService;
        this.addonPaymentService = addonPaymentService;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MemberAddonPageResponseDTO getAddons(String search, String status, int page, int limit) {
        Specification<MemberAddon> spec = buildSpec(search, status);
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<MemberAddon> addonPage = memberAddonRepository.findAll(spec, pageable);

        List<MemberAddonResponseDTO> dtos = addonPage.getContent().stream()
                .map(MemberAddonResponseDTO::fromEntity)
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(
                page, limit,
                addonPage.getTotalElements(),
                addonPage.getTotalPages()
        );

        return new MemberAddonPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public MemberAddonResponseDTO getAddonById(Long id) {
        MemberAddon addon = memberAddonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MemberAddon not found with id: " + id));
        return MemberAddonResponseDTO.fromEntity(addon);
    }

    /** The receipt this add-on purchase generated, for reprinting from the Add-ons table. */
    public ReceiptResponseDTO getAddonReceipt(Long id) {
        MemberAddon addon = memberAddonRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("MemberAddon not found with id: " + id));
        if (addon.getReceiptId() == null) {
            throw new EntityNotFoundException("No receipt was generated for add-on " + addon.getTransactionId());
        }
        return receiptService.getReceiptById(addon.getReceiptId());
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public MemberAddonResponseDTO createAddon(MemberAddonRequestDTO request) {
        MemberAddon addon = new MemberAddon();
        applyRequest(request, addon);

        // Set purchase date to now if not provided via start date logic
        if (addon.getPurchaseDate() == null) {
            addon.setPurchaseDate(LocalDateTime.now());
        }

        // Default status to Active on creation
        if (addon.getStatus() == null) {
            addon.setStatus("Active");
        }

        // A minor (or any billed_to_head dependent) never carries their own
        // dues — an add-on bought for them must be folded into their family
        // head's account instead, the same way membership fees already work
        // for them (see ReceiptService.createMinorChargeReceipt).
        Member targetMember = addon.getMemberDbId() != null
                ? memberRepository.findById(addon.getMemberDbId()).orElse(null)
                : null;
        boolean billToGuardian = targetMember != null && targetMember.isEffectivelyBilledToHead();
        Member guardian = null;
        if (billToGuardian) {
            if (targetMember.getFamilyHeadId() == null) {
                throw new RuntimeException("This member has no assigned family head to bill this add-on to.");
            }
            guardian = memberRepository.findByMemberId(targetMember.getFamilyHeadId())
                    .orElseThrow(() -> new RuntimeException("Family head not found for this member."));
        }

        // First save to get the auto-generated DB id
        MemberAddon saved = memberAddonRepository.save(addon);
        ReceiptResponseDTO createdReceipt = null;

        // Generate the business transaction ID: TXN-XXXXXXXXXX (zero-padded sequential)
        saved.setTransactionId("TXN-" + String.format("%010d", saved.getId()));
        saved = memberAddonRepository.save(saved);

        // Debit the wallet in the same transaction as the add-on and its ledger
        // posting below — if the balance has since changed (e.g. redeemed
        // elsewhere a moment earlier) this throws and the whole purchase rolls
        // back, instead of leaving the ledger's Reward Wallet Liability account
        // consumed while the member's actual balance was never touched.
        BigDecimal walletAmount = request.getWalletAmountApplied();
        if (walletAmount != null && walletAmount.compareTo(BigDecimal.ZERO) > 0 && saved.getMemberId() != null) {
            walletService.debit(saved.getMemberId(), walletAmount, "BILLING_USE", saved.getId(),
                    "Applied to add-on purchase " + saved.getTransactionId());
        }

        if (billToGuardian) {
            BigDecimal fee = saved.getAmount() != null ? saved.getAmount() : BigDecimal.ZERO;
            BigDecimal paidNow = request.getPaidAmount() != null
                    ? request.getPaidAmount().max(BigDecimal.ZERO).min(fee) : BigDecimal.ZERO;
            BigDecimal due = fee.subtract(paidNow).max(BigDecimal.ZERO);

            BigDecimal guardianOutstanding = guardian.getOutstandingBalance() != null
                    ? guardian.getOutstandingBalance() : BigDecimal.ZERO;
            if (due.compareTo(BigDecimal.ZERO) > 0) {
                guardian.setOutstandingBalance(guardianOutstanding.add(due));
                // Only escalate — never downgrade an already-worse "overdue" status.
                if (!"overdue".equalsIgnoreCase(guardian.getPaymentStatus())) {
                    guardian.setPaymentStatus(paidNow.compareTo(BigDecimal.ZERO) > 0 ? "partial" : "pending");
                }
            }
            if (paidNow.compareTo(BigDecimal.ZERO) > 0) {
                guardian.setLastPaymentDate(LocalDateTime.now());
                guardian.setPaymentMethodUsed(saved.getPaymentMode());
            }
            Member savedGuardian = memberRepository.save(guardian);

            // Bills the guardian's account, itemizing which family member the
            // add-on was actually for — the minor itself never gets a receipt
            // or an outstandingBalance of their own.
            Receipt receipt = receiptService.createMinorChargeReceipt(
                    savedGuardian, targetMember, fee, paidNow, "Add-on",
                    "Add-on: " + (saved.getAddonName() != null ? saved.getAddonName() : "Add-on"),
                    saved.getPaymentBreakdown(), null, null, request.getProcessedByStaffId());
            createdReceipt = ReceiptResponseDTO.fromEntity(receipt);

            // Cash-basis: only post/voucher whatever was actually collected now,
            // never the full add-on fee if part of it is left as a due.
            if (paidNow.compareTo(BigDecimal.ZERO) > 0) {
                financialEventService.onMemberPaymentReceived(receipt);
                receiptVoucherService.createVoucherFromModule(
                        "Add-on Purchase – " + (saved.getAddonName() != null ? saved.getAddonName() : "Add-on")
                                + " (for " + saved.getMemberName() + ", billed to " + savedGuardian.getName() + ")",
                        "Add-on",
                        savedGuardian.getName(),
                        savedGuardian.getId(),
                        paidNow,
                        saved.getPaymentMode(),
                        saved.getTransactionId(),
                        saved.getTransactionId(),
                        saved.getNotes(),
                        saved.getPaymentBreakdown(),
                        savedGuardian.getBranchId()
                );
            }
        } else {
            // Existing behavior for a member who carries their own balance: an
            // add-on purchase is always recorded as fully paid immediately.
            financialEventService.onAddonPaymentReceived(saved);
            receiptVoucherService.createVoucherFromModule(
                    "Add-on Purchase – " + (saved.getAddonName() != null ? saved.getAddonName() : "Add-on"),
                    "Add-on",
                    saved.getMemberName(),
                    saved.getMemberDbId(),
                    saved.getAmount(),
                    saved.getPaymentMode(),
                    saved.getTransactionId(),
                    saved.getTransactionId(),
                    saved.getNotes(),
                    saved.getPaymentBreakdown(),
                    targetMember != null ? targetMember.getBranchId() : null
            );

            // The two calls above post this purchase to the general ledger and to
            // the internal Receipt Vouchers list, but neither creates a customer-
            // facing Receipt row — so the add-on never showed up in Billing's
            // Member SOA/Member Receipts or as a printable receipt, only in
            // Financials. Add one here. financialEventService.onMemberPaymentReceived
            // is deliberately NOT called on it — onAddonPaymentReceived above
            // already posted this exact amount to the ledger, so posting again
            // would double-count the revenue.
            if (targetMember != null) {
                Receipt receipt = new Receipt();
                receipt.setTransactionDate(saved.getPurchaseDate());
                receipt.setMemberDbId(targetMember.getId());
                receipt.setMemberId(targetMember.getMemberId());
                receipt.setMemberName(targetMember.getName());
                receipt.setMemberPhone(targetMember.getPhone());
                receipt.setTransactionType("Add-on");
                receipt.setAmount(saved.getAmount());
                receipt.setPaymentMethod(saved.getPaymentMode());
                receipt.setPaymentBreakdown(saved.getPaymentBreakdown());
                receipt.setPaidAmount(saved.getAmount());
                receipt.setTotalPaidToDate(saved.getAmount());
                receipt.setBalanceAfter(targetMember.getOutstandingBalance() != null
                        ? targetMember.getOutstandingBalance() : BigDecimal.ZERO);
                receipt.setStatus("Paid");
                receipt.setPlanName(saved.getAddonName());
                receipt.setValidFrom(saved.getStartDate());
                receipt.setValidTill(saved.getExpiryDate());
                receipt.setMembershipType(targetMember.getMembershipType());
                receipt.setProcessedBy(receiptService.resolveProcessedByName(request.getProcessedByStaffId()));
                createdReceipt = receiptService.createReceipt(receipt);
            }
        }

        if (createdReceipt != null && createdReceipt.getId() != null) {
            saved.setReceiptId(Long.valueOf(createdReceipt.getId()));
            saved = memberAddonRepository.save(saved);
        }

        MemberAddonResponseDTO response = MemberAddonResponseDTO.fromEntity(saved);
        response.setReceipt(createdReceipt);
        return response;
    }

    /**
     * Cancelling refunds what was paid to the payer's wallet (AddonPaymentService.settleCancellation),
     * so a cancelled add-on can't be reactivated, and a payment awaiting approval is decided on
     * the Approvals page rather than by flipping the status here.
     */
    public MemberAddonResponseDTO updateAddonStatus(Long id, String status, String changedBy) {
        MemberAddon addon = memberAddonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MemberAddon not found with id: " + id));
        String current = addon.getStatus();
        if (AddonPaymentService.STATUS_CANCELLED.equalsIgnoreCase(current)
                || AddonPaymentService.STATUS_REJECTED.equalsIgnoreCase(current)) {
            throw new BusinessRuleViolationException("A " + current.toLowerCase() + " add-on can't be changed");
        }
        if (AddonPaymentService.STATUS_CANCELLED.equalsIgnoreCase(status)) {
            addonPaymentService.settleCancellation(addon, changedBy);
            addon.setStatus(AddonPaymentService.STATUS_CANCELLED);
        } else if (AddonPaymentService.STATUS_PENDING_APPROVAL.equalsIgnoreCase(current)) {
            throw new BusinessRuleViolationException("Approve or reject this add-on's payment on the Approvals page first");
        } else {
            addon.setStatus(status);
        }
        return MemberAddonResponseDTO.fromEntity(memberAddonRepository.save(addon));
    }

    public void deleteAddon(Long id) {
        MemberAddon addon = memberAddonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MemberAddon not found with id: " + id));
        if (AddonPaymentService.STATUS_PENDING_APPROVAL.equalsIgnoreCase(addon.getStatus())) {
            // Deleting it would strand the wallet debit and the pending receipt.
            throw new BusinessRuleViolationException("Reject this add-on's payment on the Approvals page instead");
        }
        memberAddonRepository.deleteById(id);
    }

    // ── Payment approval (app purchases paid by Cash / Credit / Mixed) ──────

    @Transactional(readOnly = true)
    public List<MemberAddonResponseDTO> getPendingPaymentApprovals() {
        return memberAddonRepository.findByStatusOrderByPurchaseDateAsc(AddonPaymentService.STATUS_PENDING_APPROVAL)
                .stream()
                .map(addon -> {
                    MemberAddonResponseDTO dto = MemberAddonResponseDTO.fromEntity(addon);
                    Receipt receipt = addonPaymentService.receiptFor(addon);
                    if (receipt != null) {
                        dto.setPaidAmount(receipt.getPaidAmount());
                        dto.setDiscountAmount(receipt.getDiscountAmount());
                        dto.setDiscountLabel(receipt.getDiscountLabel());
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public MemberAddonResponseDTO approvePayment(Long id, String approvedBy) {
        MemberAddon addon = memberAddonRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("MemberAddon not found with id: " + id));
        return MemberAddonResponseDTO.fromEntity(addonPaymentService.approve(addon, approvedBy));
    }

    public MemberAddonResponseDTO rejectPayment(Long id, String rejectedBy, String reason) {
        MemberAddon addon = memberAddonRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("MemberAddon not found with id: " + id));
        return MemberAddonResponseDTO.fromEntity(addonPaymentService.reject(addon, rejectedBy, reason));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private void applyRequest(MemberAddonRequestDTO r, MemberAddon a) {
        if (r.getMemberDbId()       != null) a.setMemberDbId(r.getMemberDbId());
        if (r.getMemberId()         != null) a.setMemberId(r.getMemberId());
        if (r.getMemberName()       != null) a.setMemberName(r.getMemberName());
        if (r.getAddonName()        != null) a.setAddonName(r.getAddonName());
        if (r.getAddonDescription() != null) a.setAddonDescription(r.getAddonDescription());
        if (r.getCategory()         != null) a.setCategory(r.getCategory());
        if (r.getAmount()           != null) a.setAmount(r.getAmount());
        if (r.getPaymentMode()      != null) a.setPaymentMode(r.getPaymentMode());
        if (r.getStartDate()        != null) a.setStartDate(parseDateTime(r.getStartDate()));
        if (r.getExpiryDate()       != null) a.setExpiryDate(parseDateTime(r.getExpiryDate()));
        if (r.getNotes()            != null) a.setNotes(r.getNotes());
        if (r.getPaymentBreakdown() != null) a.setPaymentBreakdown(r.getPaymentBreakdown());
    }

    private Specification<MemberAddon> buildSpec(String search, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("transactionId")), pattern),
                        cb.like(cb.lower(root.get("memberId")), pattern),
                        cb.like(cb.lower(root.get("memberName")), pattern),
                        cb.like(cb.lower(root.get("addonName")), pattern)
                ));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            String normalized = raw.endsWith("Z") ? raw.substring(0, raw.length() - 1) : raw;
            return LocalDateTime.parse(normalized, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException e) {
            try {
                return LocalDate.parse(raw.substring(0, 10)).atStartOfDay();
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
    }
}
