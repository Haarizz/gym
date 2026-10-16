package com.company.project.repositories;

import com.company.project.entities.StaffRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffRatingRepository extends JpaRepository<StaffRating, Long> {

    List<StaffRating> findByStaffIdOrderByUpdatedAtDesc(Long staffId);

    Optional<StaffRating> findByStaffIdAndMemberId(Long staffId, Long memberId);

    /** Per staff: [staffId, rating, count] — one row per star value present. */
    @Query("SELECT r.staffId, r.rating, COUNT(r) FROM StaffRating r GROUP BY r.staffId, r.rating")
    List<Object[]> countByStaffAndRating();

    // Member app — scoped explicitly to the member's branch.

    List<StaffRating> findByBranchIdAndStaffIdOrderByUpdatedAtDesc(Long branchId, Long staffId);

    List<StaffRating> findByBranchIdAndMemberId(Long branchId, Long memberId);

    @Query("SELECT r.staffId, r.rating, COUNT(r) FROM StaffRating r WHERE r.branchId = :branchId GROUP BY r.staffId, r.rating")
    List<Object[]> countByStaffAndRatingInBranch(Long branchId);
}
