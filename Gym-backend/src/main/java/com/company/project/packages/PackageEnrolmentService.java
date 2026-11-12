package com.company.project.packages;

import com.company.project.dto.MemberAddonRequestDTO;
import com.company.project.dto.MemberAddonResponseDTO;
import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.ReceiptResponseDTO;
import com.company.project.entities.*;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.services.MemberAddonService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Selling training packages to members and looking after them afterwards (trainer changes,
 * cancellation). A sale goes through the add-on flow (MemberAddonService.createAddon), so the
 * receipt, wallet, family billing, ledger posting and refund on cancel all work as they do for
 * any add-on; the enrolment only holds the package rules and the trainer.
 */
@Service
@Transactional
public class PackageEnrolmentService {

    public static final String ADDON_CATEGORY = "Training";

    public record SellRequest(Long packageId, Long memberId, Long trainerId, String startDate,
                              String paymentMode, List<PaymentSplitDTO> paymentBreakdown, BigDecimal paidAmount,
                              BigDecimal walletAmountApplied, Long processedByStaffId, String notes) {}

    public record TrainerChangeRequest(Long trainerId, String effectiveDate) {}

    public record TrainerChangeView(LocalDate effectiveDate, Long fromTrainerId, String fromTrainerName,
                                    Long toTrainerId, String toTrainerName, String changedBy) {}

    public record EnrolmentView(Long id, Long packageId, String packageName, Long memberId, String memberCode,
                                String memberName, Long trainerId, String trainerName, String planType,
                                Integer sessionsTotal, int sessionsUsed, int sessionsBooked, Integer sessionsRemaining,
                                int validityDays, LocalDate startDate, LocalDate endDate, Integer dayNumber,
                                BigDecimal price, String commissionTiming, String unusedAtExpiry, String noShowPolicy,
                                String status, Long memberAddonId, String transactionId, Long receiptId,
                                String paymentStatus, LocalDateTime cancelledAt, LocalDateTime createdAt,
                                List<TrainerChangeView> trainerChanges) {}

    public record SaleResult(EnrolmentView enrolment, ReceiptResponseDTO receipt) {}

    private final PackageEnrolmentRepository enrolments;
    private final PackageTrainerChangeRepository trainerChanges;
    private final TrainingPackageService packages;
    private final PackageUsageService usage;
    private final MemberAddonService addonService;
    private final MemberAddonRepository addons;
    private final MemberRepository members;
    private final StaffRepository staff;

    public PackageEnrolmentService(PackageEnrolmentRepository enrolments, PackageTrainerChangeRepository trainerChanges,
                                   TrainingPackageService packages, PackageUsageService usage,
                                   MemberAddonService addonService, MemberAddonRepository addons,
                                   MemberRepository members, StaffRepository staff) {
        this.enrolments = enrolments;
        this.trainerChanges = trainerChanges;
        this.packages = packages;
        this.usage = usage;
        this.addonService = addonService;
        this.addons = addons;
        this.members = members;
        this.staff = staff;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EnrolmentView> list(Long memberId, Long trainerId, String status) {
        List<PackageEnrolment> list = memberId != null ? enrolments.findByMemberIdOrderByStartDateDesc(memberId)
                : trainerId != null ? enrolments.findByTrainerIdOrderByStartDateDesc(trainerId)
                : enrolments.findAllNewestFirst();
        List<EnrolmentView> views = views(list);
        if (!StringUtils.hasText(status)) return views;
        String want = status.trim().toLowerCase();
        return views.stream().filter(v -> want.equals(v.status())).toList();
    }

    @Transactional(readOnly = true)
    public EnrolmentView get(Long id) {
        return views(List.of(find(id))).get(0);
    }

    /** A member's packages a PT booking can use now or later (for the booking dialog). */
    @Transactional(readOnly = true)
    public List<EnrolmentView> usable(Long memberId) {
        return views(enrolments.findByMemberIdAndStatusOrderByEndDateAsc(memberId, PackageEnrolment.STATUS_ACTIVE)).stream()
                .filter(v -> v.status().equals(PackageEnrolment.STATUS_ACTIVE) || v.status().equals(PackageUsageService.STATUS_UPCOMING))
                .filter(v -> v.sessionsRemaining() == null || v.sessionsRemaining() > 0)
                .filter(v -> !"pending approval".equalsIgnoreCase(v.paymentStatus()))
                .toList();
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public SaleResult sell(SellRequest r) {
        if (r.packageId() == null) throw new BusinessRuleViolationException("Choose a package");
        if (r.memberId() == null) throw new BusinessRuleViolationException("Choose a member");
        TrainingPackage p = packages.find(r.packageId());
        if (!Boolean.TRUE.equals(p.getIsActive())) throw new BusinessRuleViolationException("This package is not on sale");
        Member member = members.findById(r.memberId()).orElseThrow(() -> new EntityNotFoundException("Member not found"));
        Long trainerId = r.trainerId() != null ? r.trainerId() : p.getDefaultTrainerId();
        if (trainerId == null) throw new BusinessRuleViolationException("Choose the trainer in charge");
        if (!staff.existsById(trainerId)) throw new BusinessRuleViolationException("Trainer not found");

        LocalDate start = StringUtils.hasText(r.startDate()) ? parseDate(r.startDate())
                : LocalDate.now(usage.zone(member.getBranchId()));
        LocalDate end = start.plusDays(p.getValidityDays() - 1L);

        MemberAddonRequestDTO a = new MemberAddonRequestDTO();
        a.setMemberDbId(member.getId());
        a.setMemberId(member.getMemberId());
        a.setMemberName(member.getName());
        a.setAddonName(p.getName());
        a.setAddonDescription(describe(p));
        a.setCategory(ADDON_CATEGORY);
        a.setAmount(p.getPrice());
        a.setPaymentMode(r.paymentMode());
        a.setPaymentBreakdown(r.paymentBreakdown());
        a.setPaidAmount(r.paidAmount());
        a.setWalletAmountApplied(r.walletAmountApplied());
        a.setProcessedByStaffId(r.processedByStaffId());
        a.setNotes(r.notes());
        a.setStartDate(start.atStartOfDay().toString());
        a.setExpiryDate(end.atTime(23, 59, 59).toString());
        MemberAddonResponseDTO sold = addonService.createAddon(a);

        PackageEnrolment e = new PackageEnrolment();
        e.setPackageId(p.getId());
        e.setMemberId(member.getId());
        e.setMemberAddonId(sold.getId() != null ? Long.valueOf(sold.getId()) : null);
        e.setTrainerId(trainerId);
        e.setPackageName(p.getName());
        e.setPlanType(p.getPlanType());
        e.setSessionsTotal(p.sessionLimit());
        e.setValidityDays(p.getValidityDays());
        e.setStartDate(start);
        e.setEndDate(end);
        e.setPrice(p.getPrice());
        e.setCommissionTiming(p.getCommissionTiming());
        e.setUnusedAtExpiry(p.getUnusedAtExpiry());
        e.setNoShowPolicy(p.getNoShowPolicy());
        e.setBranchId(member.getBranchId());
        e = enrolments.save(e);
        return new SaleResult(views(List.of(e)).get(0), sold.getReceipt());
    }

    /**
     * Hands the package to another trainer from {@code effectiveDate} (default today): what was
     * earned before stays with the previous trainer.
     */
    public EnrolmentView changeTrainer(Long id, TrainerChangeRequest r, String by) {
        PackageEnrolment e = find(id);
        if (PackageEnrolment.STATUS_CANCELLED.equals(e.getStatus())) {
            throw new BusinessRuleViolationException("This package has been cancelled");
        }
        if (r.trainerId() == null || !staff.existsById(r.trainerId())) throw new BusinessRuleViolationException("Choose a trainer");
        if (r.trainerId().equals(e.getTrainerId())) throw new BusinessRuleViolationException("That trainer is already in charge");
        LocalDate effective = StringUtils.hasText(r.effectiveDate()) ? parseDate(r.effectiveDate()) : usage.today(e);
        if (effective.isBefore(e.getStartDate())) effective = e.getStartDate();
        if (effective.isAfter(e.getEndDate())) throw new BusinessRuleViolationException("The package ends on " + e.getEndDate());
        List<PackageTrainerChange> history = trainerChanges.findByEnrolmentIdOrderByEffectiveDateAscIdAsc(id);
        if (!history.isEmpty() && effective.isBefore(history.get(history.size() - 1).getEffectiveDate())) {
            throw new BusinessRuleViolationException("The trainer was last changed on "
                    + history.get(history.size() - 1).getEffectiveDate() + " — pick that day or later");
        }
        PackageTrainerChange c = new PackageTrainerChange();
        c.setEnrolmentId(id);
        c.setFromTrainerId(e.getTrainerId());
        c.setToTrainerId(r.trainerId());
        c.setEffectiveDate(effective);
        c.setChangedBy(by);
        trainerChanges.save(c);
        e.setTrainerId(r.trainerId());
        e = enrolments.save(e);
        return views(List.of(e)).get(0);
    }

    /**
     * Cancels the package: its add-on is cancelled (what was paid goes back to the payer's
     * wallet) and its upcoming, unused bookings are cancelled. Shares a trainer already earned
     * on a completion-based package stay theirs.
     */
    public EnrolmentView cancel(Long id, String by) {
        PackageEnrolment e = find(id);
        if (PackageEnrolment.STATUS_CANCELLED.equals(e.getStatus())) {
            throw new BusinessRuleViolationException("This package is already cancelled");
        }
        MemberAddon addon = e.getMemberAddonId() != null ? addons.findById(e.getMemberAddonId()).orElse(null) : null;
        if (addon != null && !"cancelled".equalsIgnoreCase(addon.getStatus()) && !"rejected".equalsIgnoreCase(addon.getStatus())) {
            // Cancels the enrolment too (MemberAddonService → PackageUsageService.onAddonCancelled).
            addonService.updateAddonStatus(addon.getId(), "Cancelled", by);
        } else {
            addonService.releasePackageBookings(usage.markCancelled(e));
        }
        return views(List.of(find(id))).get(0);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private PackageEnrolment find(Long id) {
        return enrolments.findById(id).orElseThrow(() -> new EntityNotFoundException("Package not found"));
    }

    private List<EnrolmentView> views(List<PackageEnrolment> list) {
        if (list.isEmpty()) return List.of();
        Map<Long, PackageUsageService.Usage> used = usage.usage(list);
        Set<Long> memberIds = list.stream().map(PackageEnrolment::getMemberId).collect(Collectors.toSet());
        Map<Long, Member> memberById = members.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
        Map<Long, List<PackageTrainerChange>> changes = new HashMap<>();
        Set<Long> staffIds = new HashSet<>();
        for (PackageEnrolment e : list) {
            if (e.getTrainerId() != null) staffIds.add(e.getTrainerId());
            List<PackageTrainerChange> h = trainerChanges.findByEnrolmentIdOrderByEffectiveDateAscIdAsc(e.getId());
            changes.put(e.getId(), h);
            for (PackageTrainerChange c : h) {
                if (c.getFromTrainerId() != null) staffIds.add(c.getFromTrainerId());
                if (c.getToTrainerId() != null) staffIds.add(c.getToTrainerId());
            }
        }
        Map<Long, String> staffNames = staff.findAllById(staffIds).stream()
                .collect(Collectors.toMap(Staff::getId, s -> s.getName() != null ? s.getName() : ""));
        Set<Long> addonIds = list.stream().map(PackageEnrolment::getMemberAddonId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, MemberAddon> addonById = addons.findAllById(addonIds).stream()
                .collect(Collectors.toMap(MemberAddon::getId, Function.identity()));

        List<EnrolmentView> out = new ArrayList<>();
        for (PackageEnrolment e : list) {
            PackageUsageService.Usage u = used.getOrDefault(e.getId(), PackageUsageService.Usage.NONE);
            LocalDate today = usage.today(e);
            String status = usage.displayStatus(e, u, today);
            Integer remaining = e.getSessionsTotal() != null ? Math.max(0, e.getSessionsTotal() - u.held()) : null;
            Integer dayNumber = today.isBefore(e.getStartDate()) ? null
                    : (int) Math.min(e.getValidityDays(), ChronoUnit.DAYS.between(e.getStartDate(), today) + 1);
            Member m = memberById.get(e.getMemberId());
            MemberAddon a = e.getMemberAddonId() != null ? addonById.get(e.getMemberAddonId()) : null;
            List<TrainerChangeView> history = changes.getOrDefault(e.getId(), List.of()).stream()
                    .map(c -> new TrainerChangeView(c.getEffectiveDate(), c.getFromTrainerId(), staffNames.get(c.getFromTrainerId()),
                            c.getToTrainerId(), staffNames.get(c.getToTrainerId()), c.getChangedBy()))
                    .toList();
            out.add(new EnrolmentView(e.getId(), e.getPackageId(), e.getPackageName(), e.getMemberId(),
                    m != null ? m.getMemberId() : null, m != null ? m.getName() : null,
                    e.getTrainerId(), staffNames.get(e.getTrainerId()), e.getPlanType(), e.getSessionsTotal(),
                    u.used(), u.upcoming(), remaining, e.getValidityDays(), e.getStartDate(), e.getEndDate(), dayNumber,
                    e.getPrice(), e.getCommissionTiming(), e.getUnusedAtExpiry(), e.getNoShowPolicy(), status,
                    e.getMemberAddonId(), a != null ? a.getTransactionId() : null, a != null ? a.getReceiptId() : null,
                    a != null ? a.getStatus() : null, e.getCancelledAt(), e.getCreatedAt(), history));
        }
        return out;
    }

    private static String describe(TrainingPackage p) {
        String what = TrainingPackage.TYPE_SESSIONS.equals(p.getPlanType())
                ? p.getSessionCount() + " sessions within " + p.getValidityDays() + " days"
                : p.getValidityDays() + " days" + (p.getSessionCap() != null ? ", up to " + p.getSessionCap() + " sessions" : "");
        return StringUtils.hasText(p.getDescription()) ? what + " — " + p.getDescription() : what;
    }

    private static LocalDate parseDate(String raw) {
        try {
            return LocalDate.parse(raw.trim().substring(0, 10));
        } catch (RuntimeException ex) {
            throw new BusinessRuleViolationException("Invalid date " + raw);
        }
    }
}
