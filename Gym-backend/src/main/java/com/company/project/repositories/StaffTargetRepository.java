package com.company.project.repositories;

import com.company.project.entities.StaffTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;
import java.util.Optional;

public interface StaffTargetRepository extends JpaRepository<StaffTarget, Long>, JpaSpecificationExecutor<StaffTarget> {
    List<StaffTarget> findByYearAndMonth(Integer year, Integer month);
    List<StaffTarget> findByStaffIdAndYearAndMonth(Long staffId, Integer year, Integer month);
    Optional<StaffTarget> findByStaff_IdAndYearAndMonth(Long staffId, Integer year, Integer month);
    List<StaffTarget> findByScope(String scope);
    List<StaffTarget> findByScopeAndYearAndMonthAndStaffIsNull(String scope, Integer year, Integer month);
}
