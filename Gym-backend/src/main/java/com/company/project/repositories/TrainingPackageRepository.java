package com.company.project.repositories;

import com.company.project.entities.TrainingPackage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrainingPackageRepository extends JpaRepository<TrainingPackage, Long> {
    List<TrainingPackage> findAllByOrderByNameAsc();
    List<TrainingPackage> findByIsActiveTrueOrderByNameAsc();
}
