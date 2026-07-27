package com.company.project.services;

import com.company.project.dto.FinancialSettingRequestDTO;
import com.company.project.dto.FinancialSettingResponseDTO;
import com.company.project.entities.FinancialSetting;
import com.company.project.repositories.FinancialSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class FinancialSettingService {

    /**
     * The only categories the UI actually offers (see the CATEGORIES constant in
     * financial-settings.tsx and the comment on FinancialSetting.category).
     * Settings are a generic key/value store with no per-key schema, so this is
     * deliberately the only shape validated — see
     * docs/gymbios-financial-roadmap.html — L1.
     */
    private static final Set<String> VALID_CATEGORIES = Set.of("GENERAL", "ACCOUNTING", "TAX", "BANK");

    private final FinancialSettingRepository financialSettingRepository;

    public FinancialSettingService(FinancialSettingRepository financialSettingRepository) {
        this.financialSettingRepository = financialSettingRepository;
    }

    @Transactional(readOnly = true)
    public List<FinancialSettingResponseDTO> getSettings(String category) {
        List<FinancialSetting> all;
        if (category != null && !category.isBlank()) {
            all = financialSettingRepository.findByCategoryOrderBySettingKeyAsc(
                    category.toUpperCase(Locale.ROOT));
        } else {
            all = financialSettingRepository.findAllByOrderByCategoryAscSettingKeyAsc();
        }
        return all.stream().map(FinancialSettingResponseDTO::fromEntity).collect(Collectors.toList());
    }

    public FinancialSettingResponseDTO upsertSetting(FinancialSettingRequestDTO req) {
        if (req.getSettingKey() == null || req.getSettingKey().isBlank()) {
            throw new IllegalArgumentException("settingKey is required");
        }
        if (req.getSettingValue() == null || req.getSettingValue().isBlank()) {
            throw new IllegalArgumentException("settingValue is required");
        }
        String category = req.getCategory() != null && !req.getCategory().isBlank()
                ? req.getCategory().toUpperCase(Locale.ROOT) : "GENERAL";
        if (!VALID_CATEGORIES.contains(category)) {
            throw new IllegalArgumentException(
                    "Unknown setting category '" + category + "' — must be one of " + VALID_CATEGORIES);
        }

        FinancialSetting setting = financialSettingRepository
                .findBySettingKey(req.getSettingKey())
                .orElse(new FinancialSetting());
        setting.setSettingKey(req.getSettingKey());
        setting.setSettingValue(req.getSettingValue());
        setting.setCategory(category);
        setting.setDescription(req.getDescription());
        if (req.getIsActive() != null) {
            setting.setIsActive(req.getIsActive());
        } else if (setting.getIsActive() == null) {
            setting.setIsActive(true);
        }
        return FinancialSettingResponseDTO.fromEntity(financialSettingRepository.save(setting));
    }

    public void deleteSetting(Long id) {
        FinancialSetting setting = financialSettingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Setting not found: " + id));
        financialSettingRepository.delete(setting);
    }
}
