package com.company.project.services;

import com.company.project.dto.MembershipPlanRequestDTO;
import com.company.project.dto.MembershipPlanResponseDTO;
import com.company.project.entities.MembershipPlan;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MembershipPlanRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class MembershipPlanService {

    private final MembershipPlanRepository planRepository;
    private final BranchService branchService;

    public MembershipPlanService(MembershipPlanRepository planRepository, BranchService branchService) {
        this.planRepository = planRepository;
        this.branchService = branchService;
    }

    public List<MembershipPlanResponseDTO> getPlans(String status) {
        Long activeBranchId = com.company.project.security.BranchContextHolder.getActiveBranchId();
        List<MembershipPlan> plans = (status != null && !status.isBlank())
                ? planRepository.findByStatus(status)
                : planRepository.findAllByOrderByCreatedAtDesc();
        return plans.stream()
                .filter(p -> activeBranchId == null || p.getBranchId() == null || activeBranchId.equals(p.getBranchId()))
                .map(MembershipPlanResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public MembershipPlanResponseDTO getPlanById(Long id) {
        MembershipPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Plan not found: " + id));
        return MembershipPlanResponseDTO.fromEntity(plan);
    }

    public MembershipPlanResponseDTO createPlan(MembershipPlanRequestDTO req) {
        MembershipPlan plan = new MembershipPlan();
        
        Long branchId = com.company.project.security.BranchContextHolder.getActiveBranchId();
        plan.setBranchId(branchId);
        
        applyRequest(plan, req);
        return MembershipPlanResponseDTO.fromEntity(planRepository.save(plan));
    }

    public MembershipPlanResponseDTO updatePlan(Long id, MembershipPlanRequestDTO req) {
        MembershipPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Plan not found: " + id));
        applyRequest(plan, req);
        return MembershipPlanResponseDTO.fromEntity(planRepository.save(plan));
    }

    public void deletePlan(Long id) {
        if (!planRepository.existsById(id)) {
            throw new EntityNotFoundException("Plan not found: " + id);
        }
        planRepository.deleteById(id);
    }

    public MembershipPlanResponseDTO duplicatePlan(Long id) {
        MembershipPlan original = planRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Plan not found: " + id));

        MembershipPlan copy = new MembershipPlan();
        copy.setBranchId(original.getBranchId());
        copy.setName(original.getName() + " (Copy)");
        copy.setType(original.getType());
        copy.setPlanType(original.getPlanType());
        copy.setDurationType(original.getDurationType());
        copy.setDurationValue(original.getDurationValue());
        copy.setDuration(original.getDuration());
        copy.setPrice(original.getPrice());
        copy.setDiscount(original.getDiscount());
        copy.setStatus("Inactive");
        copy.setDescription(original.getDescription());
        copy.setMaxSessions(original.getMaxSessions());
        copy.setAssignableTrainers(original.getAssignableTrainers());
        copy.setFamilyBillingMode(original.getFamilyBillingMode());
        copy.setPricePerMember(original.getPricePerMember());
        copy.setMaxFamilyMembers(original.getMaxFamilyMembers());
        copy.setMaxAdultMembers(original.getMaxAdultMembers());
        copy.setMaxChildMembers(original.getMaxChildMembers());
        copy.setAllowAdditionalMembers(original.getAllowAdditionalMembers());
        copy.setAdditionalMemberPrice(original.getAdditionalMemberPrice());
        copy.setAutoCalculateTotal(original.getAutoCalculateTotal());
        copy.setMembershipCapacity(original.getMembershipCapacity());
        copy.setMaxCapacity(original.getMaxCapacity());
        copy.setAttendanceLimit(original.getAttendanceLimit());
        copy.setAttendanceValue(original.getAttendanceValue());
        copy.setAttendancePeriod(original.getAttendancePeriod());
        copy.setMaxFreezeDays(original.getMaxFreezeDays());
        copy.setMaxFreezeOccurrences(original.getMaxFreezeOccurrences());
        copy.setChargePerExtraDay(original.getChargePerExtraDay());
        copy.setFreeDaysAllowed(original.getFreeDaysAllowed());
        copy.setAutoUnfreeze(original.isAutoUnfreeze());
        copy.setTrainingStreams(original.getTrainingStreams());
        copy.setSelectedFacilities(original.getSelectedFacilities());
        copy.setSelectedPromotions(original.getSelectedPromotions());
        copy.setSelectedCampaigns(original.getSelectedCampaigns());

        return MembershipPlanResponseDTO.fromEntity(planRepository.save(copy));
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private void applyRequest(MembershipPlan plan, MembershipPlanRequestDTO req) {
        if (req.getName()                != null) plan.setName(req.getName());
        if (req.getType()                != null) plan.setType(req.getType());
        if (req.getPlanType()            != null) plan.setPlanType(req.getPlanType());
        if (req.getDurationType()        != null) plan.setDurationType(req.getDurationType());
        if (req.getDurationValue()       != null) {
            validateDurationValue(req.getDurationValue());
            plan.setDurationValue(req.getDurationValue());
        }
        if (req.getPrice()               != null) plan.setPrice(req.getPrice());
        if (req.getDiscount()            != null) plan.setDiscount(req.getDiscount());
        if (req.getStatus()              != null) plan.setStatus(req.getStatus());
        if (req.getDescription()         != null) plan.setDescription(req.getDescription());
        if (req.getMaxSessions()         != null) plan.setMaxSessions(req.getMaxSessions());
        if (req.getAssignableTrainers()  != null) plan.setAssignableTrainers(req.getAssignableTrainers());
        if (req.getFamilyBillingMode()      != null) plan.setFamilyBillingMode(req.getFamilyBillingMode());
        if (req.getPricePerMember()         != null) plan.setPricePerMember(req.getPricePerMember());
        if (req.getMaxFamilyMembers()       != null) plan.setMaxFamilyMembers(req.getMaxFamilyMembers());
        if (req.getMaxAdultMembers()        != null) plan.setMaxAdultMembers(req.getMaxAdultMembers());
        if (req.getMaxChildMembers()        != null) plan.setMaxChildMembers(req.getMaxChildMembers());
        if (req.getAllowAdditionalMembers() != null) plan.setAllowAdditionalMembers(req.getAllowAdditionalMembers());
        if (req.getAdditionalMemberPrice()  != null) plan.setAdditionalMemberPrice(req.getAdditionalMemberPrice());
        if (req.getAutoCalculateTotal()     != null) plan.setAutoCalculateTotal(req.getAutoCalculateTotal());
        if (req.getMembershipCapacity()  != null) plan.setMembershipCapacity(req.getMembershipCapacity());
        if (req.getMaxCapacity()         != null) plan.setMaxCapacity(req.getMaxCapacity());
        if (req.getAttendanceLimit()     != null) plan.setAttendanceLimit(req.getAttendanceLimit());
        if (req.getAttendanceValue()     != null) plan.setAttendanceValue(req.getAttendanceValue());
        if (req.getAttendancePeriod()    != null) plan.setAttendancePeriod(req.getAttendancePeriod());
        if (req.getMaxFreezeDays()       != null) plan.setMaxFreezeDays(req.getMaxFreezeDays());
        if (req.getMaxFreezeOccurrences()!= null) plan.setMaxFreezeOccurrences(req.getMaxFreezeOccurrences());
        if (req.getChargePerExtraDay()   != null) plan.setChargePerExtraDay(req.getChargePerExtraDay());
        if (req.getFreeDaysAllowed()     != null) plan.setFreeDaysAllowed(req.getFreeDaysAllowed());
        plan.setAutoUnfreeze(Boolean.TRUE.equals(req.getAutoUnfreeze()));
        if (req.getTrainingStreams()     != null) plan.setTrainingStreams(req.getTrainingStreams());
        if (req.getSelectedFacilities()  != null) plan.setSelectedFacilities(req.getSelectedFacilities());
        if (req.getSelectedPromotions()  != null) plan.setSelectedPromotions(req.getSelectedPromotions());
        if (req.getSelectedCampaigns()   != null) plan.setSelectedCampaigns(req.getSelectedCampaigns());

        // Compute human-readable duration string
        plan.setDuration(computeDuration(req.getDurationValue(), req.getDurationType()));
    }

    // Guards computeExpiry() (MemberService) against silently backdating a
    // member's expiry — plusMonths/plusYears/... on a negative or zero value
    // lands the expiry before the start date instead of after it.
    private void validateDurationValue(String durationValue) {
        try {
            if (Long.parseLong(durationValue) <= 0) {
                throw new BusinessRuleViolationException("Duration value must be a positive number");
            }
        } catch (NumberFormatException e) {
            throw new BusinessRuleViolationException("Duration value must be a whole number");
        }
    }

    private String computeDuration(String durationValue, String durationType) {
        if (durationValue == null || durationType == null) return null;
        try {
            int val = Integer.parseInt(durationValue);
            String unit = switch (durationType.toLowerCase()) {
                case "days"   -> val == 1 ? "day"   : "days";
                case "weeks"  -> val == 1 ? "week"  : "weeks";
                case "months" -> val == 1 ? "month" : "months";
                case "years"  -> val == 1 ? "year"  : "years";
                default       -> durationType.toLowerCase();
            };
            return val + " " + unit;
        } catch (NumberFormatException e) {
            return durationValue + " " + durationType;
        }
    }
}
