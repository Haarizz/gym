package com.company.project.repositories;

import com.company.project.entities.StaffTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;

public interface StaffTargetRepository extends JpaRepository<StaffTarget, Long>, JpaSpecificationExecutor<StaffTarget> {
    List<StaffTarget> findByYearAndMonth(Integer year, Integer month);
    List<StaffTarget> findByStaffIdAndYearAndMonth(Long staffId, Integer year, Integer month);
    // Returns a List, not Optional<StaffTarget>: nothing in the schema enforces at most one
    // target per staff/year/month, so callers take the first (most recent) match themselves
    // instead of the query throwing NonUniqueResultException on duplicate rows.
    List<StaffTarget> findByStaff_IdAndYearAndMonthOrderByCreatedAtDesc(Long staffId, Integer year, Integer month);
    List<StaffTarget> findByScope(String scope);

    List<StaffTarget> findByStaff_Id(Long staffId);
    List<StaffTarget> findByStaff_IdAndScope(Long staffId, String scope);
    List<StaffTarget> findByScopeAndYearAndMonthAndStaffIsNull(String scope, Integer year, Integer month);
}
