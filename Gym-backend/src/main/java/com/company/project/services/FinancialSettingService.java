package com.company.project.services;

import com.company.project.dto.FinancialSettingRequestDTO;
import com.company.project.dto.FinancialSettingResponseDTO;
import com.company.project.entities.FinancialSetting;
import com.company.project.repositories.FinancialSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@Transactional
public class FinancialSettingService {

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
        FinancialSetting setting = financialSettingRepository
                .findBySettingKey(req.getSettingKey())
                .orElse(new FinancialSetting());
        setting.setSettingKey(req.getSettingKey());
        setting.setSettingValue(req.getSettingValue());
        setting.setCategory(req.getCategory() != null
                ? req.getCategory().toUpperCase(Locale.ROOT) : "GENERAL");
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
