package com.company.project.repositories;

import com.company.project.entities.FinancialSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FinancialSettingRepository extends JpaRepository<FinancialSetting, Long> {

    List<FinancialSetting> findByCategoryOrderBySettingKeyAsc(String category);

    List<FinancialSetting> findByCategoryAndBranchIdOrderBySettingKeyAsc(String category, Long branchId);

    Optional<FinancialSetting> findBySettingKey(String settingKey);

    Optional<FinancialSetting> findBySettingKeyAndBranchId(String settingKey, Long branchId);

    List<FinancialSetting> findAllByOrderByCategoryAscSettingKeyAsc();
}
