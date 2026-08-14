package com.company.project.repositories;

import com.company.project.entities.PlanGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlanGroupRepository extends JpaRepository<PlanGroup, Long> {

    Optional<PlanGroup> findByNameIgnoreCase(String name);

    List<PlanGroup> findAllByOrderByNameAsc();
}
