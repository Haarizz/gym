package com.company.project.services.mobile.membership;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.ReceiptResponseDTO;
import com.company.project.dto.SettlePaymentRequestDTO;
import com.company.project.dto.mobile.membership.MobileOutstandingBalanceDTO;
import com.company.project.dto.mobile.membership.MobileOutstandingBalanceDTO.BalancePaymentStatus;
import com.company.project.dto.mobile.membership.MobileOutstandingBalanceDTO.PayBlockedReason;
import com.company.project.dto.mobile.membership.MobileOutstandingBalanceSettleRequestDTO;
import com.company.project.dto.mobile.membership.MobileOutstandingBalanceSettleResponseDTO;
import com.company.project.entities.Currency;
import com.company.project.entities.Member;
import com.company.project.entities.MobileIdempotencyRecord;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.ReceiptService;
import com.company.project.services.mobile.family.MobileIdempotencyService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Lets a member settle the outstanding balance on their existing membership —
 * typically one bought on the Web with Credit and only partly paid.
 *
 * Composition only: the balance lives on Member.outstandingBalance and the
 * member's unpaid bills (Receipt rows), and the settlement itself is the Web
 * billing module's own ReceiptService.settlePayment (bill rollups, member
 * balance, settlement receipt, journal entry, receipt voucher). This service
 * adds the Mobile-specific parts: resolving the member from the authenticated
 * principal, computing the payable amount server-side, and guarding against
 * stale and duplicate settlements.
 */
@Service
public class MobileMemberOutstandingBalanceService {

    // Methods the existing Mobile purchase flow records without reception approval
    // (see MobileDiscoveryController.APPROVAL_REQUIRED_METHODS). Cash/Credit/Mixed
    // need staff to confirm the money, which only the reception settle flow does.
    // Keyed by lower-case PaymentBottomSheet title → canonical PaymentSplitDTO method.
    private static final Map<String, String> SELF_SERVICE_METHODS = Map.of(
            "card", "Card",
            "cheque", "Cheque",
            "bank transfer", "Bank Transfer",
            "online payment", "Online Payment",
            "online", "Online Payment"
    );
    private static final List<String> ALLOWED_METHOD_TITLES =
            List.of("Card", "Cheque", "Bank Transfer", "Online Payment");

    private static final Set<String> OPEN_BILL_STATUSES = Set.of("Pending", "Overdue", "Partial");

    private final MemberRepository memberRepository;
    private final ReceiptRepository receiptRepository;
    private final ReceiptService receiptService;
    private final MobileIdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    @PersistenceContext
    private EntityManager entityManager;

    public MobileMemberOutstandingBalanceService(MemberRepository memberRepository,
                                                 ReceiptRepository receiptRepository,
                                                 ReceiptService receiptService,
                                                 MobileIdempotencyService idempotencyService,
                                                 ObjectMapper objectMapper) {
        this.memberRepository = memberRepository;
        this.receiptRepository = receiptRepository;
        this.receiptService = receiptService;
        this.idempotencyService = idempotencyService;
        this.objectMapper = objectMapper;
    }

    // ── Reads ─────────────────────────────────────────────────────────────────

    /** The authenticated member's own balance — empty (NO_MEMBERSHIP) if they have no membership here. */
    @Transactional(readOnly = true)
    public MobileOutstandingBalanceDTO getOutstandingBalance(UserDetailsImpl principal) {
        disableBranchFilter();
        Optional<Member> member = getAuthenticatedMember(principal);
        if (member.isEmpty()) {
            MobileOutstandingBalanceDTO dto = new MobileOutstandingBalanceDTO();
            dto.setTotalAmount(BigDecimal.ZERO);
            dto.setPaidAmount(BigDecimal.ZERO);
            dto.setOutstandingAmount(BigDecimal.ZERO);
            dto.setPayableAmount(BigDecimal.ZERO);
            dto.setPaymentStatus(BalancePaymentStatus.PAID);
            dto.setCanPay(false);
            dto.setPayBlockedReason(PayBlockedReason.NO_MEMBERSHIP);
            dto.setAllowedPaymentMethods(ALLOWED_METHOD_TITLES);
            dto.setBills(List.of());
            return dto;
        }
        return toDTO(computeState(member.get()));
    }

    /**
     * A specific membership (e.g. from a push-notification deep link). 404s unless
     * it's the authenticated member's own — the same response for someone else's
     * id and a nonexistent one, so ids can't be probed.
     */
    @Transactional(readOnly = true)
    public MobileOutstandingBalanceDTO getOutstandingBalance(UserDetailsImpl principal, Long membershipId) {
        disableBranchFilter();
        return toDTO(computeState(requireOwnMembership(principal, membershipId)));
    }

    // ── Settlement ────────────────────────────────────────────────────────────

    /**
     * Settles the full payable amount. Idempotent per Idempotency-Key (a replay of a
     * completed request returns the original result instead of paying again), and
     * serialized per member by a row lock so two concurrent settlements can't both
     * pay the same balance.
     *
     * @return the response JSON (also what's cached for replays)
     */
    @Transactional
    public String settle(UserDetailsImpl principal, Long membershipId, UUID idempotencyKey,
                         String payloadFingerprint, MobileOutstandingBalanceSettleRequestDTO request) {
        // Ownership first, so even a cached replay is only ever returned to its owner;
        // scoping the fingerprint to the membership stops a key being reused across them.
        disableBranchFilter();
        requireOwnMembership(principal, membershipId);
        MobileIdempotencyRecord lease = idempotencyService.acquireOrRenewLease(
                idempotencyKey, "outstanding-balance:" + membershipId + ":" + payloadFingerprint);
        if ("COMPLETED".equals(lease.getStatus())) {
            return lease.getResponsePayload();
        }

        try {
            String responseJson = doSettle(principal, membershipId, request);
            entityManager.flush();
            idempotencyService.completeRequest(idempotencyKey, lease.getLeaseId(), responseJson);
            return responseJson;
        } catch (RuntimeException e) {
            idempotencyService.failRequest(idempotencyKey, lease.getLeaseId());
            throw e;
        }
    }

    private String doSettle(UserDetailsImpl principal, Long membershipId,
                            MobileOutstandingBalanceSettleRequestDTO request) {
        disableBranchFilter();
        Member member = requireOwnMembership(principal, membershipId);

        // Lock the member row and re-read it: anything settled elsewhere (reception,
        // another device) since the member opened the payment screen is visible
        // from here on, and a concurrent settlement waits for this one to finish.
        entityManager.refresh(member, LockModeType.PESSIMISTIC_WRITE);

        BalanceState state = computeState(member);
        if (!state.canPay()) {
            throw new BusinessRuleViolationException(blockedMessage(state.blockedReason()));
        }
        if (request.getExpectedAmount() == null
                || request.getExpectedAmount().compareTo(state.payable()) != 0) {
            throw new BusinessRuleViolationException(
                    "Your outstanding balance has changed. Please review the updated amount and try again.");
        }

        String method = SELF_SERVICE_METHODS.get(normalizeKey(request.getPaymentMethodUsed()));
        if (method == null) {
            throw new IllegalArgumentException(
                    "This payment method can't be used in the app. Please pay at reception, or choose "
                            + String.join(", ", ALLOWED_METHOD_TITLES) + ".");
        }
        PaymentSplitDTO leg = buildLeg(method, state.payable(), request.getPaymentBreakdown());

        SettlePaymentRequestDTO settle = new SettlePaymentRequestDTO();
        settle.setMemberDbId(member.getId());
        settle.setPaymentMethod(method);
        settle.setTransactionRef(leg.getReference());
        settle.setRemarks("Self-service payment via GymBios Mobile"
                + (leg.getReference() != null ? " (ref: " + leg.getReference() + ")" : ""));
        settle.setPaymentBreakdown(List.of(leg));
        settle.setBillPayments(allocate(state.bills(), state.payable()));

        ReceiptResponseDTO receipt = receiptService.settlePayment(settle);

        MobileOutstandingBalanceSettleResponseDTO response = new MobileOutstandingBalanceSettleResponseDTO();
        response.setMembershipId(member.getId());
        response.setReceiptId(receipt.getId() != null ? Long.valueOf(receipt.getId()) : null);
        response.setReceiptNo(receipt.getReceiptNo());
        response.setAmountPaid(state.payable());
        response.setOutstandingAmount(nz(member.getOutstandingBalance()));
        response.setSettledAt(LocalDateTime.now());
        try {
            return objectMapper.writeValueAsString(response);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize settlement response", e);
        }
    }

    /**
     * The one leg recorded on the settlement receipt. Keeps the member's payment
     * details (card type, reference, cheque no., ...) but never their amount.
     */
    private PaymentSplitDTO buildLeg(String method, BigDecimal amount, List<PaymentSplitDTO> breakdown) {
        PaymentSplitDTO submitted = breakdown != null && breakdown.size() == 1 ? breakdown.get(0) : null;
        if (breakdown != null && breakdown.size() > 1) {
            throw new IllegalArgumentException("Split payments can't be used in the app. Please pay at reception.");
        }
        if (submitted != null && submitted.getMethod() != null
                && !method.equals(SELF_SERVICE_METHODS.get(normalizeKey(submitted.getMethod())))) {
            throw new IllegalArgumentException("Payment details don't match the selected payment method.");
        }

        PaymentSplitDTO leg = new PaymentSplitDTO();
        leg.setMethod(method);
        leg.setAmount(amount);
        if (submitted != null) {
            leg.setReference(trimToNull(submitted.getReference()));
            leg.setCardType(trimToNull(submitted.getCardType()));
            leg.setChequeNumber(trimToNull(submitted.getChequeNumber()));
            leg.setChequeDate(trimToNull(submitted.getChequeDate()));
            leg.setBankName(trimToNull(submitted.getBankName()));
            leg.setOnlinePaymentType(trimToNull(submitted.getOnlinePaymentType()));
            leg.setProviderName(trimToNull(submitted.getProviderName()));
        }

        // Same required fields PaymentBottomSheet enforces, re-checked here.
        switch (method) {
            case "Card" -> {
                if (leg.getCardType() == null) throw new IllegalArgumentException("Card type is required.");
            }
            case "Cheque" -> {
                if (leg.getChequeNumber() == null) throw new IllegalArgumentException("Cheque number is required.");
            }
            case "Bank Transfer", "Online Payment" -> {
                if (leg.getReference() == null) throw new IllegalArgumentException("Transaction reference is required.");
            }
            default -> { }
        }
        return leg;
    }

    /** Spreads the payment across open bills, oldest first — the order the Web's pending-bills list uses. */
    private List<SettlePaymentRequestDTO.BillPayment> allocate(List<OpenBill> bills, BigDecimal amount) {
        List<SettlePaymentRequestDTO.BillPayment> payments = new ArrayList<>();
        BigDecimal remaining = amount;
        for (OpenBill bill : bills) {
            if (remaining.signum() <= 0) break;
            BigDecimal pay = bill.outstanding().min(remaining);
            SettlePaymentRequestDTO.BillPayment bp = new SettlePaymentRequestDTO.BillPayment();
            bp.setReceiptId(bill.receipt().getId());
            bp.setPayAmount(pay);
            payments.add(bp);
            remaining = remaining.subtract(pay);
        }
        return payments;
    }

    // ── Balance computation ───────────────────────────────────────────────────

    private record OpenBill(Receipt receipt, BigDecimal paidToDate, BigDecimal outstanding) {}

    private record BalanceState(Member member, List<OpenBill> bills, BigDecimal outstanding,
                                BigDecimal payable, PayBlockedReason blockedReason) {
        boolean canPay() { return blockedReason == null; }
    }

    private BalanceState computeState(Member member) {
        BigDecimal outstanding = nz(member.getOutstandingBalance()).max(BigDecimal.ZERO);

        List<OpenBill> bills = receiptRepository.findPendingByMember(member.getId()).stream()
                .filter(this::isSettleableBill)
                .map(r -> {
                    BigDecimal paid = r.getTotalPaidToDate() != null ? r.getTotalPaidToDate() : nz(r.getPaidAmount());
                    return new OpenBill(r, paid, nz(r.getAmount()).subtract(paid).max(BigDecimal.ZERO));
                })
                .filter(b -> b.outstanding().signum() > 0)
                .sorted(Comparator.comparing((OpenBill b) -> b.receipt().getTransactionDate(),
                                Comparator.nullsFirst(Comparator.naturalOrder()))
                        .thenComparing(b -> b.receipt().getId()))
                .toList();

        BigDecimal billsOutstanding = bills.stream().map(OpenBill::outstanding).reduce(BigDecimal.ZERO, BigDecimal::add);
        // settlePayment only moves money through bills, so a balance with no bill
        // behind it can't be settled here — and never pay more than the member owes.
        BigDecimal payable = outstanding.min(billsOutstanding);

        PayBlockedReason blocked = null;
        if (outstanding.signum() <= 0) {
            blocked = PayBlockedReason.NO_BALANCE;
        } else if ("PENDING".equals(member.getApprovalStatus())) {
            blocked = PayBlockedReason.APPROVAL_PENDING;
        } else if (payable.signum() <= 0) {
            blocked = PayBlockedReason.NO_PAYABLE_BILLS;
        }
        return new BalanceState(member, bills, outstanding, payable, blocked);
    }

    /**
     * A bill the member may pay down: an open membership bill, excluding a mobile
     * Cash/Credit/Mixed purchase still awaiting (or refused) reception approval —
     * that payment's status is reception's call, not the member's.
     */
    private boolean isSettleableBill(Receipt r) {
        if (!OPEN_BILL_STATUSES.contains(r.getStatus())) return false;
        if ("Payment".equals(r.getTransactionType())) return false;
        String approval = r.getApprovalStatus();
        return approval == null || "APPROVED".equals(approval);
    }

    private MobileOutstandingBalanceDTO toDTO(BalanceState state) {
        Member member = state.member();
        BigDecimal total = state.bills().stream().map(b -> nz(b.receipt().getAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paid = state.bills().stream().map(OpenBill::paidToDate).reduce(BigDecimal.ZERO, BigDecimal::add);

        MobileOutstandingBalanceDTO dto = new MobileOutstandingBalanceDTO();
        dto.setMembershipId(member.getId());
        dto.setPlanName(member.getMembershipPlan());
        dto.setTotalAmount(total);
        dto.setPaidAmount(paid);
        dto.setOutstandingAmount(state.outstanding());
        dto.setPayableAmount(state.canPay() ? state.payable() : BigDecimal.ZERO);
        dto.setPaymentStatus(state.outstanding().signum() <= 0 ? BalancePaymentStatus.PAID
                : (paid.signum() > 0 ? BalancePaymentStatus.PARTIALLY_PAID : BalancePaymentStatus.UNPAID));
        dto.setCanPay(state.canPay());
        dto.setPayBlockedReason(state.blockedReason());
        dto.setDueDate(state.bills().stream()
                .map(b -> b.receipt().getDueDate())
                .filter(java.util.Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(member.getNextPaymentDate()));
        dto.setAllowedPaymentMethods(ALLOWED_METHOD_TITLES);

        Currency base = baseCurrency();
        if (base != null) {
            dto.setCurrency(base.getCode());
            dto.setCurrencySymbol(base.getSymbol());
        }

        dto.setBills(state.bills().stream().map(b -> {
            MobileOutstandingBalanceDTO.Bill bill = new MobileOutstandingBalanceDTO.Bill();
            Receipt r = b.receipt();
            bill.setReceiptId(r.getId());
            bill.setInvoiceNo(r.getInvoiceNo());
            bill.setTransactionType(r.getTransactionType());
            bill.setPlanName(r.getPlanName());
            bill.setTransactionDate(r.getTransactionDate());
            bill.setDueDate(r.getDueDate());
            bill.setAmount(nz(r.getAmount()));
            bill.setPaidToDate(b.paidToDate());
            bill.setOutstandingAmount(b.outstanding());
            return bill;
        }).toList());
        return dto;
    }

    private static String blockedMessage(PayBlockedReason reason) {
        return switch (reason) {
            case NO_BALANCE -> "This membership has no outstanding balance.";
            case APPROVAL_PENDING -> "Your membership payment is awaiting approval by the gym.";
            case NO_PAYABLE_BILLS, NO_MEMBERSHIP -> "This balance can't be paid in the app. Please pay at reception.";
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Member requireOwnMembership(UserDetailsImpl principal, Long membershipId) {
        return getAuthenticatedMember(principal)
                .filter(m -> m.getId().equals(membershipId))
                .orElseThrow(() -> new EntityNotFoundException("Membership not found"));
    }

    private Optional<Member> getAuthenticatedMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        Optional<Member> memberOpt = principal.isGlobal()
                ? memberRepository.findByGlobalUserId(principal.getId())
                : memberRepository.findByUserId(principal.getId());
        // Fallback for stale tokens with IS_GLOBAL_CLAIM=true but no globalUserId record
        if (memberOpt.isEmpty() && principal.isGlobal()) {
            memberOpt = memberRepository.findByUserId(principal.getId());
        }
        return memberOpt;
    }

    private Currency baseCurrency() {
        return entityManager.createQuery(
                        "SELECT c FROM Currency c WHERE c.baseCurrency = true AND c.active = true", Currency.class)
                .setMaxResults(1)
                .getResultStream()
                .findFirst()
                .orElse(null);
    }

    /**
     * Ownership, not branch, authorizes these reads: a member's bills must all be
     * visible (and settled) whichever branch the app currently has selected. Same
     * approach as MemberService.getPendingApprovals.
     */
    private void disableBranchFilter() {
        entityManager.unwrap(org.hibernate.Session.class).disableFilter("branchFilter");
    }

    private static String normalizeKey(String method) {
        return method == null ? "" : method.trim().toLowerCase(Locale.ROOT);
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
