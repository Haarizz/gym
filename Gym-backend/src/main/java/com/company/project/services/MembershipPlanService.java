package com.company.project.services;

import com.company.project.dto.MembershipPlanRequestDTO;
import com.company.project.dto.MembershipPlanResponseDTO;
import com.company.project.entities.MembershipPlan;
import com.company.project.repositories.MembershipPlanRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class MembershipPlanService {

    private final MembershipPlanRepository planRepository;

    public MembershipPlanService(MembershipPlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    public List<MembershipPlanResponseDTO> getPlans(String status) {
        List<MembershipPlan> plans = (status != null && !status.isBlank())
                ? planRepository.findByStatus(status)
                : planRepository.findAllByOrderByCreatedAtDesc();
        return plans.stream().map(MembershipPlanResponseDTO::fromEntity).collect(Collectors.toList());
    }

    public MembershipPlanResponseDTO getPlanById(Long id) {
        MembershipPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found: " + id));
        return MembershipPlanResponseDTO.fromEntity(plan);
    }

    public MembershipPlanResponseDTO createPlan(MembershipPlanRequestDTO req) {
        MembershipPlan plan = new MembershipPlan();
        applyRequest(plan, req);
        return MembershipPlanResponseDTO.fromEntity(planRepository.save(plan));
    }

    public MembershipPlanResponseDTO updatePlan(Long id, MembershipPlanRequestDTO req) {
        MembershipPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found: " + id));
        applyRequest(plan, req);
        return MembershipPlanResponseDTO.fromEntity(planRepository.save(plan));
    }

    public void deletePlan(Long id) {
        if (!planRepository.existsById(id)) {
            throw new RuntimeException("Plan not found: " + id);
        }
        planRepository.deleteById(id);
    }

    public MembershipPlanResponseDTO duplicatePlan(Long id) {
        MembershipPlan original = planRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found: " + id));

        MembershipPlan copy = new MembershipPlan();
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
        if (req.getDurationValue()       != null) plan.setDurationValue(req.getDurationValue());
        if (req.getPrice()               != null) plan.setPrice(req.getPrice());
        if (req.getDiscount()            != null) plan.setDiscount(req.getDiscount());
        if (req.getStatus()              != null) plan.setStatus(req.getStatus());
        if (req.getDescription()         != null) plan.setDescription(req.getDescription());
        if (req.getMaxSessions()         != null) plan.setMaxSessions(req.getMaxSessions());
        if (req.getAssignableTrainers()  != null) plan.setAssignableTrainers(req.getAssignableTrainers());
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
