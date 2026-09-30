package com.company.project.services;

import com.company.project.dto.FamilyRenewalRequestDTO;
import com.company.project.dto.FreezeRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.dto.MinorChargeDTO;
import com.company.project.dto.RenewalRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipFreeze;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipFreezeRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.repositories.ReceiptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

/**
 * Enforces a membership plan's freeze policy across all of a member's freezes in
 * the current plan period (the period starts at their latest purchase/renewal):
 *
 *  - maxFreezeDays         total days that may be frozen in the period
 *  - maxFreezeOccurrences  how many times the member may freeze in the period
 *  - freeDaysAllowed       days frozen at no charge in the period
 *  - chargePerExtraDay     billed for each frozen day beyond the free days
 *  - autoUnfreeze          end the freeze automatically on its end date
 *
 * The charge for extra days is raised as an unpaid "Freeze Charge" bill and added
 * to the member's outstanding balance (their family head's, if they're billed to
 * the head), so it's settled through the normal Web/Mobile payment flows and
 * shows up in Billing → Member Dues as "Extra Freeze Days".
 *
 * Only freezes the member requests in the app are checked against the policy and
 * charged. Staff freezes from the Web are recorded (so they use up the member's
 * allowance) but never blocked or billed — staff decide those case by case.
 */
@Service
@Transactional
public class MembershipFreezeService {

    public static final String FREEZE_CHARGE_TYPE = "Freeze Charge";
    public static final String FREEZE_CHARGE_DESCRIPTION = "Extra freeze days";

    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("d MMM yyyy");

    private final MemberRepository memberRepository;
    private final MembershipPlanRepository planRepository;
    private final MembershipFreezeRepository freezeRepository;
    private final ReceiptRepository receiptRepository;
    private final ReceiptService receiptService;
    private final MemberService memberService;

    public MembershipFreezeService(MemberRepository memberRepository,
                                   MembershipPlanRepository planRepository,
                                   MembershipFreezeRepository freezeRepository,
                                   ReceiptRepository receiptRepository,
                                   ReceiptService receiptService,
                                   MemberService memberService) {
        this.memberRepository = memberRepository;
        this.planRepository = planRepository;
        this.freezeRepository = freezeRepository;
        this.receiptRepository = receiptRepository;
        this.receiptService = receiptService;
        this.memberService = memberService;
    }

    // ── Allowance ─────────────────────────────────────────────────────────────

    public enum UnavailableReason { PLAN_DOES_NOT_ALLOW, NO_DAYS_LEFT, NO_FREEZES_LEFT }

    /**
     * What's left of the member's freeze allowance in the current plan period.
     * maxOccurrences/remainingOccurrences are null when the plan sets no limit.
     */
    public record FreezeAllowance(int maxDays, int usedDays, int remainingDays,
                                  Integer maxOccurrences, int usedOccurrences, Integer remainingOccurrences,
                                  int freeDays, int freeDaysRemaining, BigDecimal chargePerExtraDay,
                                  boolean autoUnfreeze, UnavailableReason unavailableReason) {
        public boolean canFreeze() { return unavailableReason == null; }

        /** Days of a freeze of this length that would be billed. */
        public int chargeableDays(int days) {
            return chargePerExtraDay.signum() > 0 ? Math.max(0, days - freeDaysRemaining) : 0;
        }

        public BigDecimal chargeFor(int days) {
            return chargePerExtraDay.multiply(BigDecimal.valueOf(chargeableDays(days))).setScale(2, RoundingMode.HALF_UP);
        }
    }

    @Transactional(readOnly = true)
    public FreezeAllowance getAllowance(Member member, MembershipPlan plan) {
        int maxDays = plan != null && plan.getMaxFreezeDays() != null ? Math.max(0, plan.getMaxFreezeDays()) : 0;
        Integer maxOccurrences = plan != null && plan.getMaxFreezeOccurrences() != null && plan.getMaxFreezeOccurrences() > 0
                ? plan.getMaxFreezeOccurrences() : null;
        int freeDays = plan != null && plan.getFreeDaysAllowed() != null ? Math.max(0, plan.getFreeDaysAllowed()) : 0;
        BigDecimal rate = plan != null && plan.getChargePerExtraDay() != null
                ? plan.getChargePerExtraDay().max(BigDecimal.ZERO) : BigDecimal.ZERO;
        boolean autoUnfreeze = plan != null && plan.isAutoUnfreeze();

        List<MembershipFreeze> freezes = freezesInCurrentPeriod(member);
        int usedDays = 0;
        int freeDaysUsed = 0;
        for (MembershipFreeze f : freezes) {
            int days = daysUsed(f);
            usedDays += days;
            // A freeze that ended early hands back the free days it didn't use.
            freeDaysUsed += Math.min(f.getFreeDaysApplied(), days);
        }

        int remainingDays = Math.max(0, maxDays - usedDays);
        Integer remainingOccurrences = maxOccurrences != null ? Math.max(0, maxOccurrences - freezes.size()) : null;

        UnavailableReason reason = null;
        if (maxDays <= 0) reason = UnavailableReason.PLAN_DOES_NOT_ALLOW;
        else if (remainingOccurrences != null && remainingOccurrences <= 0) reason = UnavailableReason.NO_FREEZES_LEFT;
        else if (remainingDays <= 0) reason = UnavailableReason.NO_DAYS_LEFT;

        return new FreezeAllowance(maxDays, usedDays, remainingDays,
                maxOccurrences, freezes.size(), remainingOccurrences,
                freeDays, Math.max(0, freeDays - freeDaysUsed), rate,
                autoUnfreeze, reason);
    }

    public static String unavailableMessage(UnavailableReason reason, FreezeAllowance allowance) {
        return switch (reason) {
            case PLAN_DOES_NOT_ALLOW -> "Your membership plan does not allow freezing.";
            case NO_FREEZES_LEFT -> "You've used all " + allowance.maxOccurrences()
                    + " freezes allowed on your plan for this membership period.";
            case NO_DAYS_LEFT -> "You've used all " + allowance.maxDays()
                    + " freeze days allowed on your plan for this membership period.";
        };
    }

    // ── Freeze ────────────────────────────────────────────────────────────────

    public record FreezeResult(LocalDateTime freezeStart, LocalDateTime freezeEnd, int days,
                               int freeDaysApplied, int chargedDays, BigDecimal chargeAmount) {}

    /** A freeze the member requested in the app: checked against the plan's policy and charged. */
    public FreezeResult freezeByMember(Member member, int days, String reason) {
        if (!"active".equalsIgnoreCase(member.getMembershipStatus())) {
            throw new BusinessRuleViolationException("Membership must be active to freeze.");
        }
        MembershipPlan plan = findPlan(member);
        FreezeAllowance allowance = getAllowance(member, plan);
        if (!allowance.canFreeze()) {
            throw new BusinessRuleViolationException(unavailableMessage(allowance.unavailableReason(), allowance));
        }
        if (days <= 0 || days > allowance.remainingDays()) {
            throw new BusinessRuleViolationException("Invalid freeze duration. You can freeze for 1 to "
                    + allowance.remainingDays() + " days.");
        }

        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = start.plusDays(days);

        FreezeRequestDTO coreRequest = new FreezeRequestDTO();
        coreRequest.setFreezeStartDate(start.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        coreRequest.setFreezeUntil(end.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        coreRequest.setReason(reason);
        memberService.freezeMember(member.getId(), coreRequest);

        int chargedDays = allowance.chargeableDays(days);
        BigDecimal charge = allowance.chargeFor(days);

        MembershipFreeze record = newRecord(member, start, end, days, reason, MembershipFreeze.SOURCE_MOBILE);
        record.setFreeDaysApplied(days - chargedDays);
        record.setChargedDays(chargedDays);
        record.setChargePerDay(allowance.chargePerExtraDay());
        record.setChargeAmount(charge);
        if (charge.signum() > 0) {
            record.setChargeReceiptId(raiseFreezeCharge(member, chargedDays, allowance.chargePerExtraDay(),
                    charge, start, end).getId());
        }
        freezeRepository.save(record);

        return new FreezeResult(start, end, days, record.getFreeDaysApplied(), chargedDays, charge);
    }

    /** A freeze applied by staff on the Web: recorded against the allowance, never blocked or charged. */
    public MemberResponseDTO freezeByStaff(Long memberId, FreezeRequestDTO request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + memberId));
        FreezeAllowance allowance = getAllowance(member, findPlan(member));
        // Re-freezing without an unfreeze in between replaces the freeze in progress.
        closeOpenFreeze(memberId, LocalDateTime.now());

        MemberResponseDTO result = memberService.freezeMember(memberId, request);

        LocalDateTime start = member.getFreezeStartDate();
        LocalDateTime end = member.getFreezeEndDate();
        int days = end != null ? (int) Math.max(0, ChronoUnit.DAYS.between(start, end)) : 0;
        MembershipFreeze record = newRecord(member, start, end, days, request.getReason(), MembershipFreeze.SOURCE_STAFF);
        record.setFreeDaysApplied(Math.min(days, allowance.freeDaysRemaining()));
        freezeRepository.save(record);
        return result;
    }

    // ── Unfreeze ──────────────────────────────────────────────────────────────

    /**
     * Renewing or changing plan while frozen ends the freeze first — as of now,
     * so the days already frozen still extend the old expiry and the open freeze
     * record/charge is settled — otherwise the member stays "frozen" on the new
     * plan they just paid for. No-op when the member isn't frozen.
     */
    public void endFreezeForRenewal(Long memberId) {
        Member member = memberRepository.findById(memberId).orElse(null);
        if (member != null && "frozen".equalsIgnoreCase(member.getMembershipStatus())) {
            unfreeze(memberId);
        }
    }

    /** MemberService.renewMember, ending any freeze first (see endFreezeForRenewal). */
    public MemberResponseDTO renewEndingFreeze(Long memberId, RenewalRequestDTO request) {
        endFreezeForRenewal(memberId);
        return memberService.renewMember(memberId, request);
    }

    /** MemberService.renewFamily, ending the head's freeze first (see endFreezeForRenewal). */
    public MemberResponseDTO renewFamilyEndingFreeze(Long headId, FamilyRenewalRequestDTO request) {
        endFreezeForRenewal(headId);
        return memberService.renewFamily(headId, request);
    }

    public MemberResponseDTO unfreeze(Long memberId) {
        return unfreeze(memberId, LocalDateTime.now());
    }

    /**
     * Ends the member's freeze as of frozenUntil. If it ended before its extra
     * (charged) days were used, the unpaid part of its Freeze Charge bill is
     * reduced to match — a member is only billed for extra days actually frozen.
     */
    public MemberResponseDTO unfreeze(Long memberId, LocalDateTime frozenUntil) {
        MemberResponseDTO result = memberService.unfreezeMember(memberId, frozenUntil);
        closeOpenFreeze(memberId, frozenUntil);
        return result;
    }

    private void closeOpenFreeze(Long memberId, LocalDateTime endedAt) {
        freezeRepository.findFirstByMemberDbIdAndEndedAtIsNullOrderByFreezeStartDesc(memberId).ifPresent(f -> {
            f.setEndedAt(endedAt.isBefore(f.getFreezeStart()) ? f.getFreezeStart() : endedAt);
            reduceChargeForUnusedDays(f);
            freezeRepository.save(f);
        });
    }

    private void reduceChargeForUnusedDays(MembershipFreeze f) {
        if (f.getChargedDays() <= 0 || f.getChargeReceiptId() == null || f.getChargePerDay() == null) return;
        int chargedDaysUsed = Math.max(0, daysUsed(f) - f.getFreeDaysApplied());
        int unusedChargedDays = f.getChargedDays() - chargedDaysUsed;
        if (unusedChargedDays <= 0) return;

        Receipt bill = receiptRepository.findById(f.getChargeReceiptId()).orElse(null);
        if (bill == null) return;
        BigDecimal amount = nz(bill.getAmount());
        BigDecimal paid = bill.getTotalPaidToDate() != null ? bill.getTotalPaidToDate() : nz(bill.getPaidAmount());
        // Whatever has already been paid stays paid — only the unpaid part is reduced.
        BigDecimal reduction = f.getChargePerDay().multiply(BigDecimal.valueOf(unusedChargedDays))
                .min(amount.subtract(paid).max(BigDecimal.ZERO));
        if (reduction.signum() <= 0) return;

        bill.setAmount(amount.subtract(reduction));
        if (bill.getAmount().compareTo(paid) <= 0) bill.setStatus("Paid");
        bill.setRemarks(appendRemark(bill.getRemarks(), "Reduced by " + reduction.toPlainString()
                + ": membership unfrozen after " + daysUsed(f) + " of " + f.getRequestedDays() + " days."));
        receiptRepository.save(bill);

        memberRepository.findById(bill.getMemberDbId()).ifPresent(account -> {
            BigDecimal balance = nz(account.getOutstandingBalance()).subtract(reduction).max(BigDecimal.ZERO);
            account.setOutstandingBalance(balance);
            if (balance.signum() == 0) account.setPaymentStatus("paid");
            memberRepository.save(account);
        });

        int daysRefunded = reduction.divide(f.getChargePerDay(), 0, RoundingMode.DOWN).intValue();
        f.setChargedDays(f.getChargedDays() - daysRefunded);
        f.setChargeAmount(nz(f.getChargeAmount()).subtract(reduction));
    }

    // ── Auto-unfreeze ─────────────────────────────────────────────────────────

    /** Frozen members whose freeze has reached its end date, heads before billed-to-head dependents. */
    @Transactional(readOnly = true)
    public List<Long> findDueForAutoUnfreeze(LocalDateTime now) {
        return memberRepository.findFrozenWithFreezeEndBefore(now).stream()
                // A head's unfreeze also unfreezes their billed-to-head dependents, so do heads first.
                .sorted(Comparator.comparing(Member::isEffectivelyBilledToHead))
                .map(Member::getId)
                .toList();
    }

    /** Unfreezes the member as of their planned end date, if their plan auto-unfreezes. */
    public boolean autoUnfreeze(Long memberId, LocalDateTime now) {
        Member member = memberRepository.findById(memberId).orElse(null);
        if (member == null || !"frozen".equalsIgnoreCase(member.getMembershipStatus())
                || member.getFreezeEndDate() == null || member.getFreezeEndDate().isAfter(now)) {
            return false; // already unfrozen (e.g. with their family head) or not due
        }
        MembershipPlan plan = findPlan(member);
        if (plan == null || !plan.isAutoUnfreeze()) return false;
        unfreeze(memberId, member.getFreezeEndDate());
        return true;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public MembershipPlan findPlan(Member member) {
        return member.getMembershipPlan() != null
                ? planRepository.findByName(member.getMembershipPlan()).orElse(null)
                : null;
    }

    private List<MembershipFreeze> freezesInCurrentPeriod(Member member) {
        LocalDateTime periodStart = receiptRepository.findLatestPlanPurchaseDate(member.getId());
        if (periodStart == null) periodStart = member.getMembershipStartDate();
        if (periodStart == null) periodStart = LocalDateTime.of(1970, 1, 1, 0, 0);
        return freezeRepository.findByMemberDbIdAndFreezeStartGreaterThanEqualOrderByFreezeStartAsc(
                member.getId(), periodStart);
    }

    /** A freeze in progress counts the days requested; an ended one the days it actually lasted. */
    private static int daysUsed(MembershipFreeze f) {
        if (f.getEndedAt() == null) return f.getRequestedDays();
        return (int) Math.max(0, ChronoUnit.DAYS.between(f.getFreezeStart(), f.getEndedAt()));
    }

    private static MembershipFreeze newRecord(Member member, LocalDateTime start, LocalDateTime end,
                                              int days, String reason, String source) {
        MembershipFreeze f = new MembershipFreeze();
        f.setMemberDbId(member.getId());
        f.setPlanName(member.getMembershipPlan());
        f.setFreezeStart(start != null ? start : LocalDateTime.now());
        f.setPlannedEnd(end);
        f.setRequestedDays(days);
        f.setReason(reason);
        f.setSource(source);
        return f;
    }

    /**
     * Raises the unpaid "Freeze Charge" bill and adds it to the outstanding balance
     * of whoever pays for this member — themselves, or their family head.
     */
    private Receipt raiseFreezeCharge(Member member, int chargedDays, BigDecimal rate, BigDecimal amount,
                                      LocalDateTime start, LocalDateTime end) {
        Member account = member;
        if (member.isEffectivelyBilledToHead() && member.getFamilyHeadId() != null) {
            account = memberRepository.findByMemberId(member.getFamilyHeadId()).orElse(member);
        }

        BigDecimal balance = nz(account.getOutstandingBalance()).add(amount);
        account.setOutstandingBalance(balance);
        // Only escalate — a partial/pending/overdue status already says money is owed.
        if (account.getPaymentStatus() == null || "paid".equalsIgnoreCase(account.getPaymentStatus())) {
            account.setPaymentStatus("pending");
        }
        memberRepository.save(account);

        Receipt r = new Receipt();
        r.setTransactionDate(LocalDateTime.now());
        r.setMemberDbId(account.getId());
        r.setMemberId(account.getMemberId());
        r.setMemberName(account.getName());
        r.setMemberPhone(account.getPhone());
        r.setTransactionType(FREEZE_CHARGE_TYPE);
        r.setPlanName(FREEZE_CHARGE_DESCRIPTION);
        r.setAmount(amount);
        r.setPaymentMethod("Credit");
        r.setPaidAmount(BigDecimal.ZERO);
        r.setTotalPaidToDate(BigDecimal.ZERO);
        r.setBalanceAfter(balance);
        r.setStatus("Pending");
        r.setDueDate(start);
        r.setValidFrom(start);
        r.setValidTill(end);
        r.setMembershipType(account.getMembershipType());
        r.setProcessedBy("Member (GymBios Mobile)");
        r.setBranchId(account.getBranchId());
        String remarks = FREEZE_CHARGE_DESCRIPTION + ": " + chargedDays + " day" + (chargedDays == 1 ? "" : "s")
                + " × " + rate.setScale(2, RoundingMode.HALF_UP).toPlainString()
                + " (freeze " + start.format(DAY_FMT) + " – " + end.format(DAY_FMT) + ")";
        if (account != member) {
            remarks += " for family member " + member.getName();
            r.setMinorCharges(List.of(new MinorChargeDTO(
                    member.getMemberId(), member.getId(), member.getName(), amount, false)));
        }
        r.setRemarks(remarks);

        return receiptRepository.findById(Long.valueOf(receiptService.createReceipt(r).getId()))
                .orElseThrow(() -> new IllegalStateException("Freeze charge bill was not saved"));
    }

    private static String appendRemark(String existing, String note) {
        return existing == null || existing.isBlank() ? note : existing + " | " + note;
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
