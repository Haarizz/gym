package com.company.project.repositories;

import com.company.project.entities.AddonPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AddonPlanRepository extends JpaRepository<AddonPlan, Long> {

    Optional<AddonPlan> findByName(String name);

    List<AddonPlan> findAllByOrderByNameAsc();

    List<AddonPlan> findByIsActiveTrueOrderByNameAsc();

    // Lower-cased names of personal-training add-on plans (category "Personal Training"/"Training")
    @org.springframework.data.jpa.repository.Query("SELECT LOWER(TRIM(p.name)) FROM AddonPlan p " +
           "WHERE LOWER(p.category) IN ('personal training', 'training')")
    List<String> findPtPlanNamesLower();
}
