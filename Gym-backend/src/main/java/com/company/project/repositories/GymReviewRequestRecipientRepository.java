package com.company.project.repositories;

import com.company.project.entities.GymReviewRequestRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GymReviewRequestRecipientRepository extends JpaRepository<GymReviewRequestRecipient, Long> {

    List<GymReviewRequestRecipient> findByMemberIdAndStatus(Long memberId, String status);
}
