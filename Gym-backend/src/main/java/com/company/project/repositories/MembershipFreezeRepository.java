package com.company.project.repositories;

import com.company.project.entities.MembershipFreeze;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MembershipFreezeRepository extends JpaRepository<MembershipFreeze, Long> {

    /** Freezes started in the member's current plan period. */
    List<MembershipFreeze> findByMemberDbIdAndFreezeStartGreaterThanEqualOrderByFreezeStartAsc(
            Long memberDbId, LocalDateTime periodStart);

    /** All of a member's freezes, newest first. */
    List<MembershipFreeze> findByMemberDbIdOrderByFreezeStartDesc(Long memberDbId);

    /** The member's freeze in progress, if any. */
    Optional<MembershipFreeze> findFirstByMemberDbIdAndEndedAtIsNullOrderByFreezeStartDesc(Long memberDbId);
}
