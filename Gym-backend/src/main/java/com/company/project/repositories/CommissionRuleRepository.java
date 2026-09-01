package com.company.project.repositories;

import com.company.project.entities.CommissionRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CommissionRuleRepository extends JpaRepository<CommissionRule, Long> {
    Optional<CommissionRule> findByRole(String role);
    // Roles & Permissions stores role names uppercase (e.g. "RECEPTIONIST") while
    // Staff.role (job title) is typically mixed-case (e.g. "Receptionist") — match
    // regardless of case so a rule created against one doesn't silently miss the other.
    Optional<CommissionRule> findByRoleIgnoreCase(String role);
}
