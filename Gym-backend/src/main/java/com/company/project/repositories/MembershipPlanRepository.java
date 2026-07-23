package com.company.project.repositories;

import com.company.project.entities.MembershipPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MembershipPlanRepository extends JpaRepository<MembershipPlan, Long> {

    Optional<MembershipPlan> findByName(String name);

    List<MembershipPlan> findByStatus(String status);

    List<MembershipPlan> findByNameContainingIgnoreCase(String name);

    List<MembershipPlan> findByStatusOrderByCreatedAtDesc(String status);

    List<MembershipPlan> findAllByOrderByCreatedAtDesc();
}
