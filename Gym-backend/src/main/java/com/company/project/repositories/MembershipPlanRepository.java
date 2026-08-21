package com.company.project.repositories;

import com.company.project.entities.MembershipPlan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MembershipPlanRepository extends JpaRepository<MembershipPlan, Long> {

    Optional<MembershipPlan> findByName(String name);

    List<MembershipPlan> findByStatus(String status);
    Page<MembershipPlan> findByStatus(String status, Pageable pageable);

    List<MembershipPlan> findByNameContainingIgnoreCase(String name);

    Page<MembershipPlan> findByStatusAndNameContainingIgnoreCase(String status, String name, Pageable pageable);

    List<MembershipPlan> findByStatusOrderByCreatedAtDesc(String status);

    List<MembershipPlan> findAllByOrderByCreatedAtDesc();
}
