package com.company.project.repositories;

import com.company.project.entities.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

public interface StaffRepository extends JpaRepository<Staff, Long>, JpaSpecificationExecutor<Staff> {
    Optional<Staff> findByEmail(String email);
    Optional<Staff> findByStaffId(String staffId);
    Optional<Staff> findByUserId(Long userId);
    List<Staff> findByNameIgnoreCase(String name);
    List<Staff> findByAppUsername(String appUsername);
    boolean existsByEmail(String email);
    long countByStatus(String status);
    List<Staff> findTop5ByOrderByCreatedAtDesc();
    long countByRole(String role);
    long countByRoleContainingIgnoreCase(String role);

    List<Staff> findByStatusIgnoreCaseOrderByNameAsc(String status);

    // Walk-in QR lookups. Native, returning plain columns rather than Staff entities:
    // loading a staff member whose home branch isn't the active one trips
    // BranchSecurityListener, and multi-branch staff legitimately hit that.

    /** [id, name, walk_in_code] of the staff record behind a login, if any. */
    @Query(value = "SELECT id, name, walk_in_code FROM employees WHERE user_id = :userId LIMIT 1", nativeQuery = true)
    List<Object[]> findWalkInIdentityByUserId(@Param("userId") Long userId);

    /** [id, name] of the staff member owning this walk-in code, if they work at the branch. */
    @Query(value = "SELECT e.id, e.name FROM employees e WHERE e.walk_in_code = :code"
            + " AND (e.branch_id IS NULL OR e.branch_id = :branchId"
            + " OR EXISTS (SELECT 1 FROM staff_branches sb WHERE sb.staff_id = e.id AND sb.branch_id = :branchId))",
            nativeQuery = true)
    List<Object[]> findWalkInReferrer(@Param("code") String code, @Param("branchId") Long branchId);

    @Query(value = "SELECT walk_in_code FROM employees WHERE id = :id", nativeQuery = true)
    List<String> findWalkInCodeById(@Param("id") Long id);

    /** Name only — ReceiptService credits a walk-in's referrer, who may be another branch's staff. */
    @Query(value = "SELECT name FROM employees WHERE id = :id", nativeQuery = true)
    List<String> findNameById(@Param("id") Long id);

    @Query(value = "SELECT COUNT(*) FROM employees WHERE walk_in_code = :code", nativeQuery = true)
    long countByWalkInCode(@Param("code") String code);

    @Modifying
    @Query(value = "UPDATE employees SET walk_in_code = :code WHERE id = :id AND walk_in_code IS NULL", nativeQuery = true)
    int assignWalkInCode(@Param("id") Long id, @Param("code") String code);
}
