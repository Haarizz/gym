package com.company.project.repositories;

import com.company.project.entities.StaffBranch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StaffBranchRepository extends JpaRepository<StaffBranch, Long> {

    List<StaffBranch> findByStaffId(Long staffId);

    List<StaffBranch> findByBranchId(Long branchId);

    void deleteByStaffIdAndBranchId(Long staffId, Long branchId);

    @Modifying
    @Query("DELETE FROM StaffBranch sb WHERE sb.staffId = :staffId")
    void deleteByStaffId(@Param("staffId") Long staffId);

    boolean existsByStaffIdAndBranchId(Long staffId, Long branchId);

    @Query("SELECT sb.staffId FROM StaffBranch sb WHERE sb.branchId = :branchId")
    List<Long> findStaffIdsByBranchId(@Param("branchId") Long branchId);

    @Query("SELECT sb.branchId FROM StaffBranch sb WHERE sb.staffId = :staffId")
    List<Long> findBranchIdsByStaffId(@Param("staffId") Long staffId);
}
