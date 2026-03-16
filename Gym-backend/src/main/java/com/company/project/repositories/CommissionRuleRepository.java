package com.company.project.repositories;

import com.company.project.entities.CommissionRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CommissionRuleRepository extends JpaRepository<CommissionRule, Long> {
    Optional<CommissionRule> findByRole(String role);
}
