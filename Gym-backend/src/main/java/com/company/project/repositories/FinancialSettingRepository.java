package com.company.project.repositories;

import com.company.project.entities.FinancialSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FinancialSettingRepository extends JpaRepository<FinancialSetting, Long> {

    List<FinancialSetting> findByCategoryOrderBySettingKeyAsc(String category);

    Optional<FinancialSetting> findBySettingKey(String settingKey);

    List<FinancialSetting> findAllByOrderByCategoryAscSettingKeyAsc();
}
