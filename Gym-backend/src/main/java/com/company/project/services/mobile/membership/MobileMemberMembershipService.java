package com.company.project.services.mobile.membership;

import com.company.project.dto.mobile.membership.MobileMemberMembershipResponseDTO;
import com.company.project.entities.Currency;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.MembershipFreezeService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.entities.Facility;
import com.company.project.repositories.FacilityRepository;
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

    @PersistenceContext
    private EntityManager entityManager;

    public MobileMemberMembershipService(
            MemberRepository memberRepository,
            MembershipPlanRepository membershipPlanRepository,
            MembershipFreezeService freezeService,
            FacilityRepository facilityRepository) {
        this.memberRepository = memberRepository;
        this.membershipPlanRepository = membershipPlanRepository;
        this.freezeService = freezeService;
        this.facilityRepository = facilityRepository;
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
        List<MobileMemberMembershipResponseDTO.BenefitInfo> benefits = new ArrayList<>();
        if (plan != null) {
            // 2.1 Gym & Floor Access
            String attendanceName;
            String attendanceDesc;
            if ("Unlimited".equalsIgnoreCase(plan.getAttendanceLimit()) || plan.getAttendanceLimit() == null) {
                attendanceName = "Unlimited Gym Floor Access";
                attendanceDesc = "Full access to strength, cardio, and functional training areas during open hours.";
            } else if (plan.getAttendanceValue() != null) {
                attendanceName = "Gym Access (" + plan.getAttendanceValue() + " visits/" + (plan.getAttendancePeriod() != null ? plan.getAttendancePeriod().toLowerCase() : "period") + ")";
                attendanceDesc = "Up to " + plan.getAttendanceValue() + " check-ins per " + (plan.getAttendancePeriod() != null ? plan.getAttendancePeriod().toLowerCase() : "period") + " with full equipment access.";
            } else {
                attendanceName = "Gym Access Included";
                attendanceDesc = "Access to gym floor, workout equipment, and training zones.";
            }
            benefits.add(new MobileMemberMembershipResponseDTO.BenefitInfo(
                "attendance", attendanceName, attendanceDesc, "activity", "Access"
            ));

            // 2.2 Facilities & Amenities
            List<String> facilityNames = new ArrayList<>();
            if (plan.getSelectedFacilities() != null && !plan.getSelectedFacilities().isEmpty()) {
                List<Facility> allFacilities = facilityRepository.findAll();
                for (String facRef : plan.getSelectedFacilities()) {
                    for (Facility f : allFacilities) {
                        if (facRef.equalsIgnoreCase(f.getFacilityId()) ||
                            facRef.equalsIgnoreCase(String.valueOf(f.getId())) ||
                            facRef.equalsIgnoreCase(f.getName())) {
                            if (!facilityNames.contains(f.getName())) {
                                facilityNames.add(f.getName());
                            }
                            break;
                        }
                    }
                }
            }
            if (!facilityNames.isEmpty()) {
                benefits.add(new MobileMemberMembershipResponseDTO.BenefitInfo(
                    "facilities",
                    "Included Facilities & Amenities",
                    "Full access to " + String.join(", ", facilityNames) + ".",
                    "droplet",
                    "Amenities"
                ));
            } else {
                benefits.add(new MobileMemberMembershipResponseDTO.BenefitInfo(
                    "facilities",
                    "Locker & Shower Facilities",
                    "Complimentary day lockers, changing rooms, and hot showers.",
                    "droplet",
                    "Amenities"
                ));
            }

            // 2.3 Coaching & Training Support
            if (plan.getMaxSessions() != null && plan.getMaxSessions() > 0) {
                benefits.add(new MobileMemberMembershipResponseDTO.BenefitInfo(
                    "sessions",
                    "Personal Training (" + plan.getMaxSessions() + " Sessions)",
                    plan.getMaxSessions() + " dedicated one-on-one sessions included with a certified trainer.",
                    "award",
                    "Coaching"
                ));
            } else if (plan.getAssignableTrainers() != null && !plan.getAssignableTrainers().isEmpty()) {
                benefits.add(new MobileMemberMembershipResponseDTO.BenefitInfo(
                    "coaching",
                    "Dedicated Trainer Guidance",
                    "Guidance from assigned coaches: " + String.join(", ", plan.getAssignableTrainers()) + ".",
                    "users",
                    "Coaching"
                ));
            } else {
                benefits.add(new MobileMemberMembershipResponseDTO.BenefitInfo(
                    "coaching",
                    "Floor Trainer Support",
                    "Certified trainers available on the gym floor for exercise guidance and form checks.",
                    "award",
                    "Coaching"
                ));
            }

            // 2.4 Training Streams & Classes
            if (plan.getTrainingStreams() != null && !plan.getTrainingStreams().isEmpty()) {
                benefits.add(new MobileMemberMembershipResponseDTO.BenefitInfo(
                    "classes",
                    "Group Training Streams",
                    "Access to " + plan.getTrainingStreams().size() + " scheduled specialized training streams.",
                    "calendar",
                    "Classes"
                ));
            }

            // 2.5 Freeze & Flexibility
            if (plan.getFreeDaysAllowed() != null && plan.getFreeDaysAllowed() > 0) {
                benefits.add(new MobileMemberMembershipResponseDTO.BenefitInfo(
                    "freeze",
                    "Complimentary Freeze Allowance",
                    "Pause your membership up to " + plan.getFreeDaysAllowed() + " free days when traveling or recovering.",
                    "pause-circle",
                    "Flexibility"
                ));
            } else if (plan.getMaxFreezeDays() != null && plan.getMaxFreezeDays() > 0) {
                benefits.add(new MobileMemberMembershipResponseDTO.BenefitInfo(
                    "freeze",
                    "Membership Freeze Privilege",
                    "Pause your membership up to " + plan.getMaxFreezeDays() + " days per period.",
                    "pause-circle",
                    "Flexibility"
                ));
            }

            // 2.6 Digital & Platform Perks
            benefits.add(new MobileMemberMembershipResponseDTO.BenefitInfo(
                "digital",
                "GymBios Digital Access",
                "Contactless QR check-in, workout tracking, community challenges, and digital billing.",
                "smartphone",
                "Privileges"
            ));

            // 2.7 Plan Custom Description (if present)
            if (plan.getDescription() != null && !plan.getDescription().trim().isEmpty()) {
                benefits.add(new MobileMemberMembershipResponseDTO.BenefitInfo(
                    "desc",
                    "Special Plan Features",
                    plan.getDescription().trim(),
                    "check-circle",
                    "Details"
                ));
            }
        }
        response.setBenefits(benefits);

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
}
