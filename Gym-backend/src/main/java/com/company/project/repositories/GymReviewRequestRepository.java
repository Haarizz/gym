package com.company.project.repositories;

import com.company.project.entities.GymReviewRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GymReviewRequestRepository extends JpaRepository<GymReviewRequest, Long> {

    Optional<GymReviewRequest> findFirstByBranchIdOrderByCreatedAtDesc(Long branchId);
}
