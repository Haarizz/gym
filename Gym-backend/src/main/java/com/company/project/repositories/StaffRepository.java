package com.company.project.repositories;

import com.company.project.entities.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.Optional;

public interface StaffRepository extends JpaRepository<Staff, Long>, JpaSpecificationExecutor<Staff> {
    Optional<Staff> findByEmail(String email);
    Optional<Staff> findByStaffId(String staffId);
    boolean existsByEmail(String email);
}
