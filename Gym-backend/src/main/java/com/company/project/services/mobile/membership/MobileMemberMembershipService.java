package com.company.project.services.mobile.membership;

import com.company.project.dto.mobile.membership.MobileMemberMembershipResponseDTO;
import com.company.project.entities.Currency;
import com.company.project.entities.Facility;
import com.company.project.entities.Member;
import com.company.project.entities.MemberAddon;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.TrainingStream;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.FacilityRepository;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.repositories.TrainingStreamRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.CheckInPolicyService;
import com.company.project.services.MembershipFreezeService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class MobileMemberMembershipService {

    private final MemberRepository memberRepository;
    private final MembershipPlanRepository membershipPlanRepository;
    private final MembershipFreezeService freezeService;
    private final FacilityRepository facilityRepository;
    private final TrainingStreamRepository trainingStreamRepository;
    private final MemberAddonRepository memberAddonRepository;
    private final CheckInPolicyService checkInPolicyService;

    @PersistenceContext
    private EntityManager entityManager;

    public MobileMemberMembershipService(
            MemberRepository memberRepository,
            MembershipPlanRepository membershipPlanRepository,
            MembershipFreezeService freezeService,
            FacilityRepository facilityRepository,
            TrainingStreamRepository trainingStreamRepository,
            MemberAddonRepository memberAddonRepository,
            CheckInPolicyService checkInPolicyService) {
        this.memberRepository = memberRepository;
        this.membershipPlanRepository = membershipPlanRepository;
        this.freezeService = freezeService;
        this.facilityRepository = facilityRepository;
        this.trainingStreamRepository = trainingStreamRepository;
        this.memberAddonRepository = memberAddonRepository;
        this.checkInPolicyService = checkInPolicyService;
    }

    private String baseCurrencySymbol() {
        return entityManager.createQuery(
                        "SELECT c FROM Currency c WHERE c.baseCurrency = true AND c.active = true", Currency.class)
                .setMaxResults(1)
                .getResultStream()
                .findFirst()
                .map(Currency::getSymbol)
                .orElse(null);
    }

    private java.util.Optional<Member> getAuthenticatedMember(UserDetailsImpl principal) {
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
        return memberOpt;
    }

    public MobileMemberMembershipResponseDTO getMembership(UserDetailsImpl principal) {
        java.util.Optional<Member> memberOpt = getAuthenticatedMember(principal);
        MobileMemberMembershipResponseDTO response = new MobileMemberMembershipResponseDTO();
        
        if (memberOpt.isEmpty()) {
            MobileMemberMembershipResponseDTO.MembershipInfo inactiveInfo = new MobileMemberMembershipResponseDTO.MembershipInfo();
            inactiveInfo.setStatus("No Active Plan");
            inactiveInfo.setAutoRenew(false);
            response.setMembership(inactiveInfo);
            
            MobileMemberMembershipResponseDTO.FreezeInfo noFreeze = new MobileMemberMembershipResponseDTO.FreezeInfo();
            noFreeze.setAvailable(false);
            noFreeze.setIsFrozen(false);
            response.setFreeze(noFreeze);
            
            MobileMemberMembershipResponseDTO.RenewalOfferInfo noOffer = new MobileMemberMembershipResponseDTO.RenewalOfferInfo();
            noOffer.setAvailable(false);
            response.setRenewalOffer(noOffer);
            
            response.setBenefits(java.util.Collections.emptyList());
            return response;
        }

        Member member = memberOpt.get();
        
        // 1. Membership Overview
        MobileMemberMembershipResponseDTO.MembershipInfo membershipInfo = new MobileMemberMembershipResponseDTO.MembershipInfo();
        membershipInfo.setId(member.getId());
        membershipInfo.setStatus(member.getMembershipStatus());
        membershipInfo.setStartDate(member.getMembershipStartDate());
        // While frozen, the expiry the member will have once the freeze ends.
        LocalDateTime expiryDate = MembershipFreezeService.projectedExpiry(member, LocalDateTime.now());
        membershipInfo.setExpiryDate(expiryDate);
        membershipInfo.setBranchId(member.getBranchId());
        
        // Determine plan details
        MembershipPlan plan = null;
        if (member.getMembershipPlan() != null) {
            plan = membershipPlanRepository.findByName(member.getMembershipPlan()).orElse(null);
        }

        if (plan != null) {
            MobileMemberMembershipResponseDTO.PlanInfo planInfo = new MobileMemberMembershipResponseDTO.PlanInfo();
            planInfo.setId(plan.getId());
            planInfo.setName(plan.getName());
            planInfo.setPrice(plan.getPrice());
            planInfo.setDuration(plan.getDuration());
            membershipInfo.setPlan(planInfo);
        }
        
        // Calculate days
        if (member.getMembershipStartDate() != null && expiryDate != null) {
            int totalDays = (int) ChronoUnit.DAYS.between(
                    member.getMembershipStartDate().toLocalDate(), 
                    expiryDate.toLocalDate());
            membershipInfo.setTotalDays(Math.max(0, totalDays));
        }

        if (expiryDate != null) {
            int remainingDays = (int) ChronoUnit.DAYS.between(
                    LocalDate.now(), 
                    expiryDate.toLocalDate());
            membershipInfo.setRemainingDays(Math.max(0, remainingDays));
        }

        // Auto-renew: no explicit field on member, defaulting to false
        membershipInfo.setAutoRenew(false);
        
        response.setMembership(membershipInfo);

        // 2. Benefits
        response.setBenefits(buildBenefits(member, plan));

        // 3. Freeze Information
        MobileMemberMembershipResponseDTO.FreezeInfo freezeInfo = new MobileMemberMembershipResponseDTO.FreezeInfo();
        MembershipFreezeService.FreezeAllowance allowance = freezeService.getAllowance(member, plan);
        freezeInfo.setAvailable(allowance.canFreeze());
        freezeInfo.setAllowedDays(allowance.remainingDays());
        freezeInfo.setMaxDays(allowance.maxDays());
        freezeInfo.setUsedDays(allowance.usedDays());
        freezeInfo.setMaxOccurrences(allowance.maxOccurrences());
        freezeInfo.setUsedOccurrences(allowance.usedOccurrences());
        freezeInfo.setRemainingOccurrences(allowance.remainingOccurrences());
        freezeInfo.setFreeDaysRemaining(allowance.freeDaysRemaining());
        freezeInfo.setChargePerExtraDay(allowance.chargePerExtraDay());
        freezeInfo.setAutoUnfreeze(allowance.autoUnfreeze());
        freezeInfo.setCurrencySymbol(baseCurrencySymbol());
        if (!allowance.canFreeze()) {
            freezeInfo.setUnavailableReason(allowance.unavailableReason().name());
            freezeInfo.setUnavailableMessage(
                    MembershipFreezeService.unavailableMessage(allowance.unavailableReason(), allowance));
        }

        boolean isFrozen = "frozen".equalsIgnoreCase(member.getMembershipStatus());
        freezeInfo.setIsFrozen(isFrozen);
        if (isFrozen) {
            if (member.getFreezeStartDate() != null) {
                freezeInfo.setStartDate(member.getFreezeStartDate().toString());
            }
            if (member.getFreezeEndDate() != null) {
                freezeInfo.setEndDate(member.getFreezeEndDate().toString());
            }
        }
        response.setFreeze(freezeInfo);

        // 4. Renewal Offer - Existing backend promotions are global/voucher based, no explicit per-member renewal offer
        MobileMemberMembershipResponseDTO.RenewalOfferInfo offerInfo = new MobileMemberMembershipResponseDTO.RenewalOfferInfo();
        offerInfo.setAvailable(false);
        response.setRenewalOffer(offerInfo);

        return response;
    }

    /**
     * What the member's plan (and any active add-ons) actually includes. Nothing is listed
     * that the gym hasn't configured, so a sparse plan gives a short list.
     */
    private List<MobileMemberMembershipResponseDTO.BenefitInfo> buildBenefits(Member member, MembershipPlan plan) {
        List<MobileMemberMembershipResponseDTO.BenefitInfo> benefits = new ArrayList<>();
        if (plan != null) {
            benefits.add(accessBenefit(member));

            List<String> facilities = planFacilityNames(plan);
            if (!facilities.isEmpty()) {
                MobileMemberMembershipResponseDTO.BenefitInfo b = new MobileMemberMembershipResponseDTO.BenefitInfo(
                        "facilities", "facilities", "Facilities included", String.join(", ", facilities));
                b.setItems(facilities);
                benefits.add(b);
            }

            List<String> trainers = plan.getAssignableTrainers() == null ? List.of()
                    : plan.getAssignableTrainers().stream()
                            .filter(t -> t != null && !t.isBlank())
                            .map(String::trim)
                            .distinct()
                            .toList();
            if (plan.getMaxSessions() != null && plan.getMaxSessions() > 0) {
                MobileMemberMembershipResponseDTO.BenefitInfo b = new MobileMemberMembershipResponseDTO.BenefitInfo(
                        "sessions", "sessions", plan.getMaxSessions() + " sessions included",
                        trainers.isEmpty() ? null : "With " + String.join(", ", trainers));
                b.setCount(plan.getMaxSessions());
                b.setItems(trainers);
                benefits.add(b);
            } else if (!trainers.isEmpty()) {
                MobileMemberMembershipResponseDTO.BenefitInfo b = new MobileMemberMembershipResponseDTO.BenefitInfo(
                        "trainers", "trainers", "Your trainers", String.join(", ", trainers));
                b.setItems(trainers);
                benefits.add(b);
            }

            List<String> streams = planStreamTitles(plan);
            if (!streams.isEmpty()) {
                MobileMemberMembershipResponseDTO.BenefitInfo b = new MobileMemberMembershipResponseDTO.BenefitInfo(
                        "streams", "streams", "Training streams", String.join(", ", streams));
                b.setItems(streams);
                b.setCount(streams.size());
                benefits.add(b);
            }
        }

        // Add-ons are bought separately, so they count even without a resolvable plan.
        for (MemberAddon addon : memberAddonRepository.findActiveForMember(
                member.getId(), member.getMemberId(), LocalDateTime.now())) {
            if (addon.getAddonName() == null || addon.getAddonName().isBlank()) continue;
            MobileMemberMembershipResponseDTO.BenefitInfo b = new MobileMemberMembershipResponseDTO.BenefitInfo(
                    "addon-" + addon.getId(), "addon", addon.getAddonName().trim(),
                    addon.getAddonDescription() != null && !addon.getAddonDescription().isBlank()
                            ? addon.getAddonDescription().trim() : null);
            b.setExpiresAt(addon.getExpiryDate());
            benefits.add(b);
        }

        if (plan != null && plan.getDescription() != null && !plan.getDescription().isBlank()) {
            benefits.add(new MobileMemberMembershipResponseDTO.BenefitInfo(
                    "plan_notes", "plan_notes", "About your plan", plan.getDescription().trim()));
        }
        return benefits;
    }

    /** The plan's check-in allowance, with usage from the same rules check-in enforces. */
    private MobileMemberMembershipResponseDTO.BenefitInfo accessBenefit(Member member) {
        CheckInPolicyService.Allowance allowance = checkInPolicyService.evaluate(member);
        if (allowance.limitValue() == null) {
            MobileMemberMembershipResponseDTO.BenefitInfo b = new MobileMemberMembershipResponseDTO.BenefitInfo(
                    "access", "access", "Unlimited gym access",
                    "No visit limit. Check in up to " + allowance.maxCheckInsPerDay() + " times a day.");
            b.setCount(allowance.maxCheckInsPerDay());
            return b;
        }
        int limit = allowance.limitValue();
        int used = allowance.used() == null ? 0 : allowance.used();
        String unit = allowance.limitUnit().toLowerCase();
        String period = allowance.limitPeriod();
        String per = switch (period == null ? "" : period.toLowerCase()) {
            case "week" -> "per week";
            case "month" -> "per month";
            case "year" -> "per year";
            default -> "for your plan";
        };
        MobileMemberMembershipResponseDTO.BenefitInfo b = new MobileMemberMembershipResponseDTO.BenefitInfo(
                "access", "access", limit + " gym " + unit + " " + per,
                used + " used, " + Math.max(0, limit - used) + " left");
        b.setCount(limit);
        b.setUsed(used);
        b.setUnit(allowance.limitUnit());
        b.setPeriod(period);
        return b;
    }

    /** Plans store facility refs as the facility's db id, facility code or (older plans) its name. */
    private List<String> planFacilityNames(MembershipPlan plan) {
        if (plan.getSelectedFacilities() == null || plan.getSelectedFacilities().isEmpty()) return List.of();
        List<Facility> facilities = facilityRepository.findAll().stream()
                .filter(f -> f.getName() != null && !"Inactive".equalsIgnoreCase(f.getStatus()))
                .toList();
        List<String> names = new ArrayList<>();
        for (String ref : plan.getSelectedFacilities()) {
            if (ref == null) continue;
            facilities.stream()
                    .filter(f -> ref.equalsIgnoreCase(String.valueOf(f.getId()))
                            || ref.equalsIgnoreCase(f.getFacilityId())
                            || ref.equalsIgnoreCase(f.getName()))
                    .findFirst()
                    .map(Facility::getName)
                    .filter(name -> !names.contains(name))
                    .ifPresent(names::add);
        }
        return names;
    }

    private List<String> planStreamTitles(MembershipPlan plan) {
        if (plan.getTrainingStreams() == null || plan.getTrainingStreams().isEmpty()) return List.of();
        List<Long> ids = plan.getTrainingStreams().stream()
                .filter(java.util.Objects::nonNull)
                .map(Integer::longValue)
                .toList();
        return trainingStreamRepository.findAllById(ids).stream()
                .map(TrainingStream::getTitle)
                .filter(title -> title != null && !title.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
    }
}
