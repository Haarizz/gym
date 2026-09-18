package com.company.project.repositories;

import com.company.project.entities.GymOsSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GymOsSettingRepository extends JpaRepository<GymOsSetting, Long> {

    List<GymOsSetting> findByCategoryOrderBySettingKeyAsc(String category);

    Optional<GymOsSetting> findByCategoryAndSettingKey(String category, String settingKey);
}
