package com.company.project.services;

import com.company.project.dto.AddonPlanDTO;
import com.company.project.entities.AddonPlan;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AddonPlanRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class AddonPlanService {

    private final AddonPlanRepository addonPlanRepository;

    public AddonPlanService(AddonPlanRepository addonPlanRepository) {
        this.addonPlanRepository = addonPlanRepository;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AddonPlanDTO> getAll(Boolean activeOnly) {
        List<AddonPlan> plans = Boolean.TRUE.equals(activeOnly)
                ? addonPlanRepository.findByIsActiveTrueOrderByNameAsc()
                : addonPlanRepository.findAllByOrderByNameAsc();
        return plans.stream().map(AddonPlanDTO::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AddonPlanDTO getById(Long id) {
        return AddonPlanDTO.fromEntity(findOrThrow(id));
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public AddonPlanDTO create(AddonPlanDTO dto) {
        AddonPlan plan = new AddonPlan();
        applyRequest(plan, dto);
        return AddonPlanDTO.fromEntity(addonPlanRepository.save(plan));
    }

    public AddonPlanDTO update(Long id, AddonPlanDTO dto) {
        AddonPlan plan = findOrThrow(id);
        applyRequest(plan, dto);
        return AddonPlanDTO.fromEntity(addonPlanRepository.save(plan));
    }

    public void delete(Long id) {
        addonPlanRepository.delete(findOrThrow(id));
    }

    public AddonPlanDTO toggleActive(Long id) {
        AddonPlan plan = findOrThrow(id);
        plan.setIsActive(!Boolean.TRUE.equals(plan.getIsActive()));
        return AddonPlanDTO.fromEntity(addonPlanRepository.save(plan));
    }

    // ── Init ────────────────────────────────────────────────────────────────

    /**
     * Seeds the catalog that used to be a hardcoded array in the frontend
     * (member-addons.tsx) — same names/prices/validity, now editable. Idempotent:
     * only inserts names that don't exist yet.
     */
    public void initDefaultAddonPlans() {
        if (addonPlanRepository.count() > 0) return;

        Object[][] defaults = {
            {"Personal Training – 15 Sessions", "One-on-one sessions with certified trainer", "450.00", 30, "Training"},
            {"Nutrition Plan – 30 Days",         "Customized meal plan and nutrition guidance",  "200.00", 30, "Nutrition"},
            {"Personal Training – 30 Sessions", "Extended personal training package",           "850.00", 60, "Training"},
            {"Group Classes – 20 Sessions",     "Access to premium group fitness classes",       "300.00", 30, "Classes"},
            {"Spa & Recovery – 10 Sessions",    "Massage therapy and recovery sessions",         "500.00", 45, "Spa"},
            {"Personal Training – 8 Sessions",  "Starter personal training package",             "280.00", 20, "Training"},
            {"Yoga Classes – 20 Sessions",      "Mind and body wellness through yoga",           "320.00", 30, "Classes"},
            {"Swimming Lessons – 10 Sessions",  "Professional swimming coaching",                "400.00", 30, "Classes"},
        };

        for (Object[] row : defaults) {
            if (addonPlanRepository.findByName((String) row[0]).isPresent()) continue;
            AddonPlan plan = new AddonPlan();
            plan.setName((String) row[0]);
            plan.setDescription((String) row[1]);
            plan.setPrice(new BigDecimal((String) row[2]));
            plan.setValidity((Integer) row[3]);
            plan.setCategory((String) row[4]);
            plan.setIsActive(true);
            addonPlanRepository.save(plan);
        }
    }

    // ── Internal ────────────────────────────────────────────────────────────

    private AddonPlan findOrThrow(Long id) {
        return addonPlanRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Add-on plan not found: " + id));
    }

    private void applyRequest(AddonPlan plan, AddonPlanDTO dto) {
        if (dto.getName()        != null) plan.setName(dto.getName());
        if (dto.getDescription() != null) plan.setDescription(dto.getDescription());
        if (dto.getPrice()       != null) plan.setPrice(dto.getPrice());
        if (dto.getValidity()    != null) plan.setValidity(dto.getValidity());
        if (dto.getCategory()    != null) plan.setCategory(dto.getCategory());
        if (dto.getIsActive()    != null) plan.setIsActive(dto.getIsActive());
    }
}
