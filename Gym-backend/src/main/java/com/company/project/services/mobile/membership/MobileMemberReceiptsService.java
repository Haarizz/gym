package com.company.project.services.mobile.membership;

import com.company.project.dto.mobile.membership.MobileReceiptDetailDTO;
import com.company.project.entities.Member;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.TaxPolicyService;
import org.springframework.stereotype.Service;

import java.nio.file.AccessDeniedException;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Read-only service for members to view their own receipts.
 * Reuses existing {@link ReceiptRepository} and {@link MemberRepository} —
 * no new queries or tables introduced.
 *
 * Security: Every method resolves the authenticated member from the
 * security principal and enforces strict ownership. A member can only
 * access receipts whose memberDbId matches their own member.id.
 */
@Service
public class MobileMemberReceiptsService {

    private final ReceiptRepository receiptRepository;
    private final MemberRepository memberRepository;
    private final TaxPolicyService taxPolicyService;

    public MobileMemberReceiptsService(ReceiptRepository receiptRepository,
                                       MemberRepository memberRepository,
                                       TaxPolicyService taxPolicyService) {
        this.receiptRepository = receiptRepository;
        this.memberRepository = memberRepository;
        this.taxPolicyService = taxPolicyService;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Lists all receipts belonging to the authenticated member, newest first.
     * Returns an empty list if the user has no member profile (graceful degradation).
     */
    public List<MobileReceiptDetailDTO> getMyReceipts(UserDetailsImpl principal) {
        Member member = resolveAuthenticatedMember(principal);
        if (member == null) return Collections.emptyList();

        List<Receipt> receipts = receiptRepository.findByMemberDbIdOrderByTransactionDateDesc(member.getId());

        Map<Long, Boolean> taxInvoiceByBranch = new HashMap<>();
        return receipts.stream()
                .map(r -> toDto(r, taxInvoiceByBranch))
                .collect(Collectors.toList());
    }

    /**
     * Returns a single receipt's full detail, if and only if it belongs to the
     * authenticated member.
     *
     * @throws EntityNotFoundException if the receipt does not exist
     * @throws SecurityException       if the receipt belongs to a different member
     */
    public MobileReceiptDetailDTO getMyReceiptById(Long receiptId, UserDetailsImpl principal) {
        Member member = resolveAuthenticatedMember(principal);
        if (member == null) {
            throw new EntityNotFoundException("Member profile not found for authenticated user");
        }

        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new EntityNotFoundException("Receipt not found: " + receiptId));

        // Ownership check: member can only see their own receipts
        if (receipt.getMemberDbId() == null || !receipt.getMemberDbId().equals(member.getId())) {
            throw new SecurityException("You do not have permission to view this receipt");
        }

        return toDto(receipt, new HashMap<>());
    }

    /** The DTO plus whether its branch may title it "Tax Invoice" (TRN set and VAT registered). */
    private MobileReceiptDetailDTO toDto(Receipt receipt, Map<Long, Boolean> taxInvoiceByBranch) {
        MobileReceiptDetailDTO dto = MobileReceiptDetailDTO.fromEntity(receipt);
        Long branchId = receipt.getBranchId();
        if (branchId != null) {
            dto.setTaxInvoice(taxInvoiceByBranch.computeIfAbsent(branchId, id -> {
                TaxPolicyService.TaxDefaults tax = taxPolicyService.forBranch(id);
                return tax.vatRegistered() && tax.trn() != null && !tax.trn().isBlank();
            }));
        }
        return dto;
    }

    // ── Internal helpers ────────────────────────────────────────────────────

    /**
     * Resolves the Member entity for the currently authenticated user.
     * Handles both tenant-scoped (userId) and global (globalUserId) tokens.
     * Returns null (rather than throwing) if no member profile is linked.
     */
    private Member resolveAuthenticatedMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        java.util.Optional<Member> memberOpt = principal.isGlobal()
                ? memberRepository.findByGlobalUserId(principal.getId())
                : memberRepository.findByUserId(principal.getId());

        // Fallback for stale tokens with IS_GLOBAL_CLAIM=true but no globalUserId record
        if (memberOpt.isEmpty() && principal.isGlobal()) {
            memberOpt = memberRepository.findByUserId(principal.getId());
        }

        return memberOpt.orElse(null);
    }
}
