package com.company.project.repositories;

import com.company.project.entities.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByBranchIdOrderByCreatedAtDesc(Long branchId);

    Optional<Review> findByBranchIdAndMemberId(Long branchId, Long memberId);

    boolean existsByBranchIdAndMemberId(Long branchId, Long memberId);

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM Review r WHERE r.branchId = :branchId")
    Double findAverageRatingByBranchId(Long branchId);

    long countByBranchId(Long branchId);
}
