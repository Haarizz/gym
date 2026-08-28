package com.company.project.repositories;

import com.company.project.entities.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.Optional;
import java.util.List;

public interface StaffRepository extends JpaRepository<Staff, Long>, JpaSpecificationExecutor<Staff> {
    Optional<Staff> findByEmail(String email);
    Optional<Staff> findByStaffId(String staffId);
    Optional<Staff> findByUserId(Long userId);
    boolean existsByEmail(String email);
    long countByStatus(String status);
    List<Staff> findTop5ByOrderByCreatedAtDesc();
    long countByRole(String role);
}
