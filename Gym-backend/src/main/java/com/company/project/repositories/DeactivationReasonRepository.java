package com.company.project.repositories;

import com.company.project.entities.DeactivationReason;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeactivationReasonRepository extends JpaRepository<DeactivationReason, Long> {

    List<DeactivationReason> findAllByOrderBySortOrderAsc();

    boolean existsByReasonIgnoreCase(String reason);
}
