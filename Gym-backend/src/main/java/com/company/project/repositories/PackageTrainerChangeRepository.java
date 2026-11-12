package com.company.project.repositories;

import com.company.project.entities.PackageTrainerChange;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PackageTrainerChangeRepository extends JpaRepository<PackageTrainerChange, Long> {
    List<PackageTrainerChange> findByEnrolmentIdOrderByEffectiveDateAscIdAsc(Long enrolmentId);
}
