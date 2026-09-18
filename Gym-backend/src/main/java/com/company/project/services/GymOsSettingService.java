package com.company.project.services;

import com.company.project.dto.GymOsSettingResponseDTO;
import com.company.project.entities.GymOsSetting;
import com.company.project.repositories.GymOsSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Backs GymOS's Transfer Policy, Member Deactivation Policy, and System
 * Configuration widget: a generic key/value settings store (see
 * GymOsSetting.java), replacing gymos.tsx's hardcoded values.
 */
@Service
@Transactional
public class GymOsSettingService {

    private final GymOsSettingRepository settingRepository;

    public GymOsSettingService(GymOsSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @Transactional(readOnly = true)
    public List<GymOsSettingResponseDTO> getByCategory(String category) {
        return settingRepository.findByCategoryOrderBySettingKeyAsc(category.toUpperCase()).stream()
                .map(GymOsSettingResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<GymOsSettingResponseDTO> bulkUpsert(String category, Map<String, String> settings) {
        if (settings == null || settings.isEmpty()) {
            throw new IllegalArgumentException("settings must not be empty");
        }
        String normalizedCategory = category.toUpperCase();
        for (Map.Entry<String, String> entry : settings.entrySet()) {
            GymOsSetting setting = settingRepository
                    .findByCategoryAndSettingKey(normalizedCategory, entry.getKey())
                    .orElseGet(() -> {
                        GymOsSetting s = new GymOsSetting();
                        s.setCategory(normalizedCategory);
                        s.setSettingKey(entry.getKey());
                        return s;
                    });
            setting.setSettingValue(entry.getValue());
            settingRepository.save(setting);
        }
        return getByCategory(normalizedCategory);
    }
}
