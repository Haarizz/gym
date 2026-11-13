package com.company.project.services;

import com.company.project.dto.MinorChargeDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.repositories.ReceiptRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Expiry dues: when a membership's end date passes, the member owes the plan's current
 * price for the next period. Agreed rules:
 * <ul>
 *   <li>One due per expiry (members.expiry_due_raised_for), only for memberships that
 *       expire after V137 shipped — those already expired then were stamped and skipped.</li>
 *   <li>Amount = the plan's current price (with any running plan offer, as a renewal today
 *       would charge); a Family plan billed to the head is priced for the whole household.
 *       A deleted plan falls back to the member's last fee.</li>
 *   <li>The due is an open bill ("Expiry Due" receipt, Pending) on the payer — the member,
 *       or their family head when billed to the head — and is added to their
 *       outstandingBalance. Nothing is posted to the ledger until money is received.</li>
 *   <li>Paying it in full (Billing › Pending Payments / mobile outstanding balance) renews
 *       the membership from the day it's paid, on that plan; the bill becomes the
 *       "Renewal" receipt.</li>
 *   <li>A renewal done the usual way while the due is still unpaid replaces it (the due is
 *       cancelled) so the member is never charged twice. If part of it was already paid,
 *       the renewal is refused — the rest must be collected against the due.</li>
 * </ul>
 */
@Service
@Transactional
public class ExpiryDueService {

    private static final Logger log = LoggerFactory.getLogger(ExpiryDueService.class);

    public static final String EXPIRY_DUE_TYPE = "Expiry Due";
    private static final Set<String> OPEN_STATUSES = Set.of("Pending", "Overdue", "Partial");
    /** Temporary states: not stamped, so the due is raised if the member comes out of them still expired. */
    private static final Set<String> PAUSED_STATUSES = Set.of("pending_approval", "frozen", "suspended");
    /** Staff ended the membership on purpose: no due for this expiry. */
    private static final Set<String> ENDED_STATUSES = Set.of("inactive", "cancelled", "canceled", "terminated");

    private final MemberRepository memberRepository;
    private final MembershipPlanRepository planRepository;
    private final ReceiptRepository receiptRepository;
    private final VoucherNumberService voucherNumberService;

    public ExpiryDueService(MemberRepository memberRepository, MembershipPlanRepository planRepository,
                            ReceiptRepository receiptRepository, VoucherNumberService voucherNumberService) {
        this.memberRepository = memberRepository;
        this.planRepository = planRepository;
        this.receiptRepository = receiptRepository;
        this.voucherNumberService = voucherNumberService;
    }

    // ── Raising dues ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Long> findCandidateIds() {
        return memberRepository.findExpiryDueCandidateIds(LocalDate.now().atStartOfDay());
    }

    /** Raises the due for one expired member if it's owed. Returns true when a bill was created. */
    public boolean raiseDueFor(Long memberId) {
        Member m = memberRepository.findById(memberId).orElse(null);
        if (m == null) return false;
        LocalDateTime end = endDate(m);
        if (end == null || !end.toLocalDate().isBefore(LocalDate.now())) return false;
        if (end.equals(m.getExpiryDueRaisedFor())) return false;

        String stored = lower(m.getMembershipStatus());
        String approval = lower(m.getApprovalStatus());
        if (m.isMembershipSuspended() || PAUSED_STATUSES.contains(stored)
                || "pending".equals(approval) || "rejected".equals(approval)) {
            return false;
        }
        m.setExpiryDueRaisedFor(end);
        if (ENDED_STATUSES.contains(stored)) return false;

        Member head = familyHead(m);
        MembershipPlan plan = m.getMembershipPlan() != null ? planRepository.findByName(m.getMembershipPlan()).orElse(null) : null;
        // A household on a single family invoice is renewed through the head; the head's due covers them.
        if (head != null && billsAsFamily(head)) return false;

        BigDecimal amount;
        List<MinorChargeDTO> lines = null;
        if (Boolean.TRUE.equals(m.getIsFamilyHead()) && plan != null && isFamilyInvoice(plan)) {
            List<Member> deps = memberRepository.findByFamilyHeadId(m.getMemberId());
            boolean perMember = MemberService.pricesPerMember(plan.getAutoCalculateTotal(), plan.getPricePerMember());
            amount = perMember ? memberPrice(plan, 0) : PlanOfferPricing.effectivePrice(plan);
            lines = new ArrayList<>();
            for (int i = 0; i < deps.size(); i++) {
                BigDecimal share = perMember ? memberPrice(plan, i + 1) : BigDecimal.ZERO;
                amount = amount.add(share);
                lines.add(new MinorChargeDTO(deps.get(i).getMemberId(), deps.get(i).getId(), deps.get(i).getName(), share, false));
            }
        } else if (plan != null) {
            amount = PlanOfferPricing.effectivePrice(plan);
        } else {
            amount = m.getMembershipFee();
        }
        if (amount == null || amount.signum() <= 0) return false;

        Member payer = m.isEffectivelyBilledToHead() && head != null ? head : m;
        BigDecimal balance = nz(payer.getOutstandingBalance()).add(amount);
        payer.setOutstandingBalance(balance);
        if (payer.getPaymentStatus() == null || "paid".equalsIgnoreCase(payer.getPaymentStatus())) {
            payer.setPaymentStatus("pending");
        }

        LocalDateTime now = LocalDateTime.now();
        Receipt r = new Receipt();
        r.setTransactionDate(now);
        r.setMemberDbId(payer.getId());
        r.setMemberId(payer.getMemberId());
        r.setMemberName(payer.getName());
        r.setMemberPhone(payer.getPhone());
        r.setTransactionType(EXPIRY_DUE_TYPE);
        r.setRenewsMemberId(m.getId());
        r.setPlanName(plan != null ? plan.getName() : m.getMembershipPlan());
        r.setMembershipType(m.getMembershipType());
        r.setAmount(amount);
        r.setPaymentMethod("Credit");
        r.setPaidAmount(BigDecimal.ZERO);
        r.setTotalPaidToDate(BigDecimal.ZERO);
        r.setBalanceAfter(balance);
        r.setStatus("Pending");
        r.setDueDate(LocalDate.now().atStartOfDay());
        r.setProcessedBy("System");
        r.setBranchId(payer.getBranchId() != null ? payer.getBranchId() : m.getBranchId());
        if (lines != null && !lines.isEmpty()) r.setMinorCharges(lines);
        else if (payer != m) {
            r.setMinorCharges(List.of(new MinorChargeDTO(m.getMemberId(), m.getId(), m.getName(), amount, false)));
        }
        r.setRemarks("Membership expired on " + end.toLocalDate()
                + (payer != m ? " for family member " + m.getName() : "")
                + " — paying this renews " + (r.getPlanName() != null ? r.getPlanName() : "the membership")
                + " from the payment date");
        Receipt saved = receiptRepository.save(r);
        saved.setReceiptNo("RCPT-" + String.format("%010d", saved.getId()));
        saved.setInvoiceNo(voucherNumberService.next("INV"));
        receiptRepository.save(saved);
        memberRepository.save(payer);
        memberRepository.save(m);
        log.info("Expiry due {} of {} raised for member {} (payer {})", saved.getReceiptNo(), amount, m.getId(), payer.getId());
        return true;
    }

    // ── Paying a due renews the membership ───────────────────────────────────

    /**
     * Called after a payment was applied to a bill. When an expiry due is now fully paid,
     * renews its member from today on that plan and turns the bill into the Renewal receipt.
     */
    public void onBillPaid(Receipt bill) {
        if (!EXPIRY_DUE_TYPE.equals(bill.getTransactionType()) || !"Paid".equals(bill.getStatus())) return;
        Long subjectId = bill.getRenewsMemberId() != null ? bill.getRenewsMemberId() : bill.getMemberDbId();
        Member m = subjectId != null ? memberRepository.findById(subjectId).orElse(null) : null;
        if (m == null) return;

        MembershipPlan plan = bill.getPlanName() != null ? planRepository.findByName(bill.getPlanName()).orElse(null) : null;
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime newEnd = plan != null ? MemberService.computeExpiry(start, plan) : start.plusDays(previousPeriodDays(m));
        if (!newEnd.isAfter(start)) {
            log.warn("Expiry due {} paid but member {}'s plan has no duration — not renewed", bill.getReceiptNo(), m.getId());
            return;
        }

        List<Member> renewed = new ArrayList<>();
        renewed.add(m);
        if (Boolean.TRUE.equals(m.getIsFamilyHead()) && plan != null && isFamilyInvoice(plan)) {
            renewed.addAll(memberRepository.findByFamilyHeadId(m.getMemberId()));
        }
        for (Member x : renewed) {
            x.setMembershipEndDate(newEnd);
            x.setExpiryDate(newEnd);
            if (x == m) {
                x.setNextPaymentDate(newEnd);
                if (bill.getPlanName() != null) x.setMembershipPlan(bill.getPlanName());
                x.setMembershipFee(bill.getAmount());
            }
            String s = lower(x.getMembershipStatus());
            if (s.isEmpty() || "expired".equals(s)) x.setMembershipStatus("active");
        }
        memberRepository.saveAll(renewed);

        bill.setTransactionType("Renewal");
        bill.setRenewalKind("Renewal");
        bill.setValidFrom(start);
        bill.setValidTill(newEnd);
        bill.setDueDate(null);
        bill.setRemarks(appendRemark(bill.getRemarks(), "Paid — renewed until " + newEnd.toLocalDate()));
        receiptRepository.save(bill);
    }

    // ── A usual renewal replaces an unpaid due ───────────────────────────────

    /**
     * Before a member is renewed the usual way: cancels their unpaid expiry due (taking it
     * off the payer's balance) so the renewal's own bill is the only charge. Refuses when
     * part of the due has already been paid.
     */
    public void replaceOpenDueOnRenewal(Member subject) {
        if (subject == null || subject.getId() == null) return;
        for (Receipt due : receiptRepository.findByRenewsMemberIdAndStatusIn(subject.getId(), OPEN_STATUSES)) {
            if (!EXPIRY_DUE_TYPE.equals(due.getTransactionType())) continue;
            BigDecimal paid = nz(due.getTotalPaidToDate());
            if (paid.signum() > 0) {
                BigDecimal rest = nz(due.getAmount()).subtract(paid).max(BigDecimal.ZERO);
                throw new BusinessRuleViolationException(subject.getName() + " has already paid " + paid.toPlainString()
                        + " toward their expiry due " + due.getReceiptNo() + ". Collect the remaining "
                        + rest.toPlainString() + " in Billing › Pending Payments — paying it renews the membership.");
            }
            Member payer = due.getMemberDbId() == null || due.getMemberDbId().equals(subject.getId())
                    ? subject : memberRepository.findById(due.getMemberDbId()).orElse(null);
            if (payer != null) {
                BigDecimal left = nz(payer.getOutstandingBalance()).subtract(nz(due.getAmount())).max(BigDecimal.ZERO);
                payer.setOutstandingBalance(left);
                if (left.signum() == 0) payer.setPaymentStatus("paid");
                memberRepository.save(payer);
            }
            due.setStatus("Cancelled");
            due.setRemarks(appendRemark(due.getRemarks(), "Replaced by a renewal on " + LocalDate.now()));
            receiptRepository.save(due);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Member familyHead(Member m) {
        if (m.getFamilyHeadId() == null || m.getFamilyHeadId().isBlank()
                || m.getFamilyHeadId().equals(m.getMemberId())) return null;
        return memberRepository.findByMemberId(m.getFamilyHeadId()).orElse(null);
    }

    /** The head's plan bills the whole household on one invoice. */
    private boolean billsAsFamily(Member head) {
        if (head.getMembershipPlan() == null) return false;
        return planRepository.findByName(head.getMembershipPlan()).map(ExpiryDueService::isFamilyInvoice).orElse(false);
    }

    private static boolean isFamilyInvoice(MembershipPlan plan) {
        return "family_head".equalsIgnoreCase(plan.getFamilyBillingMode());
    }

    private static BigDecimal memberPrice(MembershipPlan plan, int index) {
        return MemberService.memberPriceForIndex(plan.getPricePerMember(), plan.getMaxFamilyMembers(),
                plan.getAdditionalMemberPrice(), index);
    }

    /** A deleted plan: renew for as long as the last period lasted. */
    private static long previousPeriodDays(Member m) {
        LocalDateTime end = endDate(m);
        if (end == null || m.getMembershipStartDate() == null) return 0;
        return Math.max(0, ChronoUnit.DAYS.between(m.getMembershipStartDate().toLocalDate(), end.toLocalDate()));
    }

    private static LocalDateTime endDate(Member m) {
        return m.getMembershipEndDate() != null ? m.getMembershipEndDate() : m.getExpiryDate();
    }

    private static String lower(String s) {
        return s == null ? "" : s.trim().toLowerCase(Locale.ROOT);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static String appendRemark(String existing, String note) {
        return existing == null || existing.isBlank() ? note : existing + " | " + note;
    }
}
