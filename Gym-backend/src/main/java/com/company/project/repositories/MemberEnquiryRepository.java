package com.company.project.repositories;

import com.company.project.entities.MemberEnquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MemberEnquiryRepository extends JpaRepository<MemberEnquiry, Long> {

    List<MemberEnquiry> findByMemberIdOrderByCreatedAtDesc(Long memberId);

    long countByMemberIdAndStatus(Long memberId, String status);

    /** Scoped to the active branch by the branch filter; null status/category = any. */
    @Query("SELECT e FROM MemberEnquiry e "
            + "WHERE (:status IS NULL OR e.status = :status) "
            + "AND (:category IS NULL OR e.category = :category) "
            + "ORDER BY e.createdAt DESC")
    Page<MemberEnquiry> search(@Param("status") String status,
                               @Param("category") String category,
                               Pageable pageable);

    long countByStatus(String status);
}
