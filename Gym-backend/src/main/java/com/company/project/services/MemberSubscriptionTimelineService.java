package com.company.project.services;

import com.company.project.dto.MinorChargeDTO;
import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import com.company.project.entities.MemberAddon;
import com.company.project.entities.MembershipFreeze;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipFreezeRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.repositories.ReceiptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * A member's subscription history for the profile's Subscription tab: every plan
 * purchase (New / Renewal bill) as a period with its start and expiry, the freezes
 * in it and how far each pushed the expiry out, plus add-ons and PT.
 *
 * Renewals extend from the expiry at the time (MemberService.renewMember) and leave
 * membershipStartDate alone, so a renewal bill's validFrom is still the first
 * period's start — its own period starts where the previous one ended. Unfreezing
 * pushes the current expiry out by the days frozen (MemberService.unfreezeMember),
 * so a period ends at its bill's validTill plus the freezes started in it, and the
 * latest period simply at the member's expiry now (projected forward while frozen).
 *
 * snake_case Map keys, matching the DTOs the rest of the member profile reads.
 */
@Service
@Transactional(readOnly = true)
public class MemberSubscriptionTimelineService {

    private static final Pattern PT_NAME = Pattern.compile("(?i)(personal\\s*training|\\bpt\\b)");

    private final MemberRepository memberRepository;
    private final ReceiptRepository receiptRepository;
    private final MembershipFreezeRepository freezeRepository;
    private final MembershipPlanRepository planRepository;
    private final MemberAddonRepository addonRepository;
    private final BookingRepository bookingRepository;

    public MemberSubscriptionTimelineService(MemberRepository memberRepository,
                                             ReceiptRepository receiptRepository,
                                             MembershipFreezeRepository freezeRepository,
                                             MembershipPlanRepository planRepository,
                                             MemberAddonRepository addonRepository,
                                             BookingRepository bookingRepository) {
        this.memberRepository = memberRepository;
        this.receiptRepository = receiptRepository;
        this.freezeRepository = freezeRepository;
        this.planRepository = planRepository;
        this.addonRepository = addonRepository;
        this.bookingRepository = bookingRepository;
    }

    public Map<String, Object> getTimeline(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + memberId));
        LocalDateTime now = LocalDateTime.now();
        boolean frozen = "frozen".equalsIgnoreCase(member.getMembershipStatus());

        Member head = member.getFamilyHeadId() != null && !Boolean.TRUE.equals(member.getIsFamilyHead())
                ? memberRepository.findByMemberId(member.getFamilyHeadId())
                        .filter(h -> !h.getId().equals(member.getId())).orElse(null)
                : null;
        List<Long> accounts = head != null ? List.of(member.getId(), head.getId()) : List.of(member.getId());
        List<Receipt> purchases = receiptRepository.findMembershipReceipts(accounts).stream()
                .filter(r -> isFor(r, member.getId()))
                .toList();

        List<MembershipFreeze> freezes = new ArrayList<>(freezeRepository.findByMemberDbIdOrderByFreezeStartDesc(member.getId()));
        // Oldest first, and in the order they were applied when two start the same day.
        freezes.sort(java.util.Comparator.comparing(MembershipFreeze::getFreezeStart)
                .thenComparing(MembershipFreeze::getId, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())));
        // Frozen before freezes were recorded — show the member's own freeze dates.
        if (frozen && member.getFreezeStartDate() != null && freezes.stream().noneMatch(f -> f.getEndedAt() == null)) {
            MembershipFreeze f = new MembershipFreeze();
            f.setFreezeStart(member.getFreezeStartDate());
            f.setPlannedEnd(member.getFreezeEndDate());
            f.setRequestedDays(member.getFreezeEndDate() == null ? 0
                    : (int) Math.max(0, ChronoUnit.DAYS.between(member.getFreezeStartDate(), member.getFreezeEndDate())));
            f.setReason(member.getFreezeReason());
            freezes.add(f);
        }

        List<MemberAddon> addons = addonRepository.findByMemberDbIdOrderByPurchaseDateAsc(member.getId());
        Map<Long, Receipt> linkedBills = receiptRepository.findAllById(Stream.concat(
                        freezes.stream().map(MembershipFreeze::getChargeReceiptId),
                        addons.stream().map(MemberAddon::getReceiptId))
                .filter(Objects::nonNull).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Receipt::getId, Function.identity()));
        Map<String, Optional<MembershipPlan>> plans = new HashMap<>();
        Function<String, MembershipPlan> plan = name -> name == null ? null
                : plans.computeIfAbsent(name, planRepository::findByName).orElse(null);

        List<Map<String, Object>> periods = new ArrayList<>();
        LocalDateTime prevStart = null;
        LocalDateTime prevEnd = null;
        int totalFrozenDays = 0;
        for (int i = 0; i < purchases.size(); i++) {
            Receipt r = purchases.get(i);
            boolean last = i == purchases.size() - 1;
            Receipt next = last ? null : purchases.get(i + 1);

            LocalDateTime start;
            if (i == 0) {
                start = firstNonNull(r.getValidFrom(), member.getMembershipStartDate(), r.getTransactionDate());
            } else if (r.getValidFrom() != null && prevStart != null && r.getValidFrom().isAfter(prevStart)) {
                start = r.getValidFrom(); // the bill carries its own period (e.g. imported history)
            } else {
                // An early renewal runs on from the previous expiry, a lapsed one from the day
                // it was bought (MemberService.renewalBase). Bills from before that rule
                // extended a lapsed expiry too — their validTill still shows it.
                LocalDateTime bought = r.getTransactionDate();
                MembershipPlan rp = plan.apply(r.getPlanName());
                boolean fromPrevEnd = prevEnd != null && (bought == null || prevEnd.isAfter(bought)
                        || (rp != null && r.getValidTill() != null && MemberService.computeExpiry(prevEnd, rp)
                                .toLocalDate().equals(r.getValidTill().toLocalDate())));
                start = fromPrevEnd ? prevEnd : firstNonNull(bought, r.getValidFrom());
            }

            // Freezes started between this bill and the next one extended this period
            // (by day: a freeze applied the day of a renewal is on the new plan).
            LocalDateTime from = i == 0 ? null : r.getTransactionDate().toLocalDate().atStartOfDay();
            LocalDateTime to = next == null ? null : next.getTransactionDate().toLocalDate().atStartOfDay();
            List<MembershipFreeze> inPeriod = freezes.stream()
                    .filter(f -> (from == null || !f.getFreezeStart().isBefore(from))
                            && (to == null || f.getFreezeStart().isBefore(to)))
                    .toList();

            LocalDateTime originalEnd = r.getValidTill();
            LocalDateTime runningEnd = originalEnd;
            List<Map<String, Object>> freezeRows = new ArrayList<>();
            int frozenDays = 0;
            for (MembershipFreeze f : inPeriod) {
                boolean open = f.getEndedAt() == null;
                int days = open ? (int) Math.max(0, ChronoUnit.DAYS.between(f.getFreezeStart(), now))
                        : (int) Math.max(0, ChronoUnit.DAYS.between(f.getFreezeStart(), f.getEndedAt()));
                if (open && f.getFreezeStart().isAfter(now)) days = 0;
                frozenDays += days;
                LocalDateTime before = runningEnd;
                LocalDateTime after;
                if (open) {
                    if (last && frozen) before = firstNonNull(member.getExpiryDate(), runningEnd);
                    after = frozen ? MembershipFreezeService.projectedExpiry(member, now) : runningEnd;
                } else {
                    after = runningEnd == null ? null : runningEnd.plusDays(days);
                    runningEnd = after;
                }
                freezeRows.add(freezeRow(f, days, open, now, before, after, linkedBills));
            }
            totalFrozenDays += frozenDays;

            LocalDateTime end = runningEnd;
            LocalDateTime projectedEnd = null;
            if (last) {
                end = firstNonNull(member.getExpiryDate(), member.getMembershipEndDate(), end);
                if (frozen) projectedEnd = MembershipFreezeService.projectedExpiry(member, now);
            }

            MembershipPlan p = plan.apply(r.getPlanName());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("receipt_id", r.getId());
            m.put("invoice_no", r.getInvoiceNo());
            m.put("receipt_no", r.getReceiptNo());
            m.put("kind", "New".equals(r.getTransactionType()) ? "New"
                    : r.getRenewalKind() != null ? r.getRenewalKind() : "Renewal");
            m.put("plan_name", r.getPlanName());
            m.put("plan_category", p != null ? p.getType() : null);
            m.put("is_pt", isPt(r.getPlanName(), p != null ? p.getType() : null));
            m.put("purchased_at", str(r.getTransactionDate()));
            m.put("start_date", day(start));
            m.put("original_end_date", day(originalEnd));
            m.put("end_date", day(end));
            m.put("projected_end_date", day(projectedEnd));
            m.put("duration_days", start != null && originalEnd != null
                    ? ChronoUnit.DAYS.between(start.toLocalDate(), originalEnd.toLocalDate()) : null);
            m.put("frozen_days", frozenDays);
            m.put("freezes", freezeRows);
            m.put("amount", amountFor(r, member.getId()));
            m.put("discount_amount", r.getDiscountAmount());
            m.put("discount_label", r.getDiscountLabel());
            m.put("paid_amount", r.getTotalPaidToDate() != null ? r.getTotalPaidToDate() : r.getPaidAmount());
            m.put("payment_status", r.getStatus());
            m.put("payment_method", r.getPaymentMethod());
            m.put("approval_status", r.getApprovalStatus());
            m.put("processed_by", r.getProcessedBy());
            m.put("billed_to", member.getId().equals(r.getMemberDbId()) ? null : r.getMemberName());
            m.put("status", periodStatus(member, r, start, end, last, frozen, now));
            if (next != null) {
                m.put("renewed_on", str(next.getTransactionDate()));
                m.put("renewal_invoice_no", next.getInvoiceNo());
                // Renewed only after it had run out: how long the member was without a plan.
                long gap = end == null ? 0 : ChronoUnit.DAYS.between(end.toLocalDate(), next.getTransactionDate().toLocalDate());
                m.put("expired_before_renewal", gap > 0);
                m.put("gap_days", Math.max(0, gap));
            }
            periods.add(m);
            prevStart = start;
            prevEnd = end;
        }

        // No bills at all (e.g. added before billing existed) — one period from the member's own dates.
        if (purchases.isEmpty() && (member.getMembershipStartDate() != null || member.getExpiryDate() != null)) {
            LocalDateTime end = firstNonNull(member.getExpiryDate(), member.getMembershipEndDate());
            List<Map<String, Object>> freezeRows = new ArrayList<>();
            for (MembershipFreeze f : freezes) {
                boolean open = f.getEndedAt() == null;
                int days = (int) Math.max(0, ChronoUnit.DAYS.between(f.getFreezeStart(), open ? now : f.getEndedAt()));
                totalFrozenDays += days;
                freezeRows.add(freezeRow(f, days, open, now, null,
                        open && frozen ? MembershipFreezeService.projectedExpiry(member, now) : null, linkedBills));
            }
            MembershipPlan p = plan.apply(member.getMembershipPlan());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("kind", "New");
            m.put("plan_name", member.getMembershipPlan());
            m.put("plan_category", p != null ? p.getType() : null);
            m.put("is_pt", isPt(member.getMembershipPlan(), p != null ? p.getType() : null));
            m.put("start_date", day(member.getMembershipStartDate()));
            m.put("end_date", day(end));
            m.put("projected_end_date", frozen ? day(MembershipFreezeService.projectedExpiry(member, now)) : null);
            m.put("frozen_days", totalFrozenDays);
            m.put("freezes", freezeRows);
            m.put("amount", member.getMembershipFee());
            m.put("status", periodStatus(member, null, member.getMembershipStartDate(), end, true, frozen, now));
            periods.add(m);
        }

        List<Map<String, Object>> addonRows = new ArrayList<>();
        for (MemberAddon a : addons) {
            Receipt bill = a.getReceiptId() == null ? null : linkedBills.get(a.getReceiptId());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("transaction_id", a.getTransactionId());
            m.put("name", a.getAddonName());
            m.put("category", a.getCategory());
            m.put("is_pt", isPt(a.getAddonName(), a.getCategory()));
            m.put("purchase_date", str(a.getPurchaseDate()));
            m.put("start_date", day(a.getStartDate()));
            m.put("expiry_date", day(a.getExpiryDate()));
            m.put("amount", a.getAmount());
            m.put("payment_mode", a.getPaymentMode());
            m.put("status", a.getStatus());
            m.put("invoice_no", bill != null ? bill.getInvoiceNo() : null);
            addonRows.add(m);
        }

        List<Map<String, Object>> ptSessions = new ArrayList<>();
        for (Booking b : bookingRepository.findPtBookingsByMember(member.getId())) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("date", b.getSession().getDate() != null ? b.getSession().getDate().toString() : null);
            m.put("start_time", b.getSession().getStartTime() != null ? b.getSession().getStartTime().toString() : null);
            m.put("session_name", b.getSession().getName());
            m.put("trainer", b.getSession().getTrainer() != null ? b.getSession().getTrainer().getName() : null);
            m.put("status", b.getStatus());
            m.put("price", b.getPrice());
            ptSessions.add(m);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("join_date", day(member.getJoinDate()));
        summary.put("current_plan", member.getMembershipPlan());
        summary.put("membership_status", member.getMembershipStatus());
        summary.put("first_start_date", periods.isEmpty() ? null : periods.get(0).get("start_date"));
        summary.put("expiry_date", day(firstNonNull(member.getExpiryDate(), member.getMembershipEndDate())));
        summary.put("projected_expiry_date", frozen ? day(MembershipFreezeService.projectedExpiry(member, now)) : null);
        summary.put("freeze_start_date", frozen ? day(member.getFreezeStartDate()) : null);
        summary.put("freeze_end_date", frozen ? lastFrozenDay(member.getFreezeStartDate(), member.getFreezeEndDate()) : null);
        summary.put("total_frozen_days", totalFrozenDays);
        summary.put("freeze_count", freezes.size());
        summary.put("renewal_count", Math.max(0, purchases.size() - 1));
        summary.put("family_head_name", head != null ? head.getName() : null);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("summary", summary);
        out.put("periods", periods);
        out.put("addons", addonRows);
        out.put("pt_sessions", ptSessions);
        return out;
    }

    private static Map<String, Object> freezeRow(MembershipFreeze f, int days, boolean open, LocalDateTime now,
                                                 LocalDateTime expiryBefore, LocalDateTime expiryAfter,
                                                 Map<Long, Receipt> linkedBills) {
        Receipt charge = f.getChargeReceiptId() == null ? null : linkedBills.get(f.getChargeReceiptId());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.getId());
        m.put("start_date", day(f.getFreezeStart()));
        m.put("planned_end_date", lastFrozenDay(f.getFreezeStart(), f.getPlannedEnd()));
        m.put("ended_on", lastFrozenDay(f.getFreezeStart(), f.getEndedAt()));
        m.put("unfrozen_on", day(f.getEndedAt()));
        m.put("days", days);
        m.put("requested_days", f.getRequestedDays());
        m.put("status", !open ? "Completed" : f.getFreezeStart().isAfter(now) ? "Scheduled" : "Active");
        m.put("reason", f.getReason());
        m.put("source", f.getSource());
        m.put("recorded_by", f.getRecordedBy());
        m.put("free_days", f.getFreeDaysApplied());
        m.put("charged_days", f.getChargedDays());
        m.put("charge_amount", f.getChargeAmount());
        m.put("charge_waived", f.isChargeWaived());
        m.put("charge_invoice_no", charge != null ? charge.getInvoiceNo() : null);
        m.put("expiry_before", day(expiryBefore));
        m.put("expiry_after", day(expiryAfter));
        return m;
    }

    private static String periodStatus(Member member, Receipt r, LocalDateTime start, LocalDateTime end,
                                       boolean last, boolean frozen, LocalDateTime now) {
        if (r != null && "PENDING".equalsIgnoreCase(r.getApprovalStatus())) return "Pending approval";
        boolean started = start == null || !start.isAfter(now);
        boolean ended = end != null && !end.isAfter(now);
        if (!started) return "Upcoming";
        // A freeze holds the clock: the stored expiry only moves on unfreeze.
        if (frozen && (last || !ended)) return "Frozen";
        if (ended) return last ? "Expired" : "Completed";
        String status = member.getMembershipStatus();
        if (last && status != null && !"active".equalsIgnoreCase(status) && !"expired".equalsIgnoreCase(status)) {
            return Character.toUpperCase(status.charAt(0)) + status.substring(1).toLowerCase();
        }
        return "Active";
    }

    /**
     * Whether a New/Renewal bill is one of this member's plan purchases: a bill on
     * their own account (unless it only charges their dependents), or one on their
     * family head's account that itemises a charge for them.
     */
    private static boolean isFor(Receipt r, Long memberId) {
        List<MinorChargeDTO> charges = r.getMinorCharges() == null ? List.of() : r.getMinorCharges();
        boolean itemised = charges.stream().anyMatch(c -> memberId.equals(c.getMemberDbId()));
        if (!memberId.equals(r.getMemberDbId())) return itemised;
        BigDecimal dependents = charges.stream().map(MinorChargeDTO::getAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return charges.isEmpty() || itemised || dependents.compareTo(nz(r.getAmount())) < 0;
    }

    /** A bill on the family head's account counts only this member's itemised charge. */
    private static BigDecimal amountFor(Receipt r, Long memberId) {
        if (memberId.equals(r.getMemberDbId()) || r.getMinorCharges() == null) return r.getAmount();
        return r.getMinorCharges().stream().filter(c -> memberId.equals(c.getMemberDbId()))
                .map(MinorChargeDTO::getAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static boolean isPt(String name, String category) {
        return "Personal Training".equalsIgnoreCase(category) || "Training".equalsIgnoreCase(category)
                || (name != null && PT_NAME.matcher(name).find());
    }

    /** The last day a freeze ending at `end` covers — the day before, if it ends at midnight. */
    private static String lastFrozenDay(LocalDateTime start, LocalDateTime end) {
        if (end == null) return null;
        LocalDate d = end.minusNanos(1).toLocalDate();
        return (start != null && d.isBefore(start.toLocalDate()) ? start.toLocalDate() : d).toString();
    }

    @SafeVarargs
    private static <T> T firstNonNull(T... values) {
        for (T v : values) if (v != null) return v;
        return null;
    }

    private static String day(LocalDateTime t) { return t == null ? null : t.toLocalDate().toString(); }

    private static String str(LocalDateTime t) { return t == null ? null : t.toString(); }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
