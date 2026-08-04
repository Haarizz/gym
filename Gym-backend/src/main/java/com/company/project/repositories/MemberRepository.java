package com.company.project.repositories;

import com.company.project.entities.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MemberRepository extends JpaRepository<Member, Long>, JpaSpecificationExecutor<Member> {

    boolean existsByEmail(String email);

    Optional<Member> findByEmail(String email);

    Optional<Member> findByPhone(String phone);

    Optional<Member> findByMemberId(String memberId);

    Optional<Member> findByUserId(Long userId);

    Optional<Member> findByFaceId(String faceId);

    long countByMembershipStatus(String membershipStatus);

    List<Member> findAllByMemberIdIn(List<String> memberIds);

    // All family members (adults and minors) linked to a given family head's business id
    List<Member> findByFamilyHeadId(String familyHeadId);

    // Members with overdue payment status
    @Query("SELECT m FROM Member m WHERE m.paymentStatus = 'overdue' ORDER BY m.nextPaymentDate ASC")
    List<Member> findOverdueMembers();

    // Members whose next payment is due within 7 days (not already overdue)
    @Query("SELECT m FROM Member m WHERE m.nextPaymentDate IS NOT NULL AND m.nextPaymentDate >= :now AND m.nextPaymentDate <= :sevenDaysLater AND m.paymentStatus != 'overdue' ORDER BY m.nextPaymentDate ASC")
    List<Member> findDueSoonMembers(@Param("now") LocalDateTime now, @Param("sevenDaysLater") LocalDateTime sevenDaysLater);

    // Members with a real outstanding balance still marked "pending" (e.g. a partial/credit
    // payment) whose due date isn't already covered by the overdue or due-soon buckets above —
    // without this, a member who owes money but whose next payment date is null or more than
    // 7 days out never appears anywhere in Member Due.
    @Query("SELECT m FROM Member m WHERE m.paymentStatus IN ('pending', 'partial') AND m.outstandingBalance IS NOT NULL AND m.outstandingBalance > 0 " +
           "AND NOT (m.nextPaymentDate IS NOT NULL AND m.nextPaymentDate >= :now AND m.nextPaymentDate <= :sevenDaysLater) " +
           "ORDER BY m.nextPaymentDate ASC")
    List<Member> findPendingMembersWithBalance(@Param("now") LocalDateTime now, @Param("sevenDaysLater") LocalDateTime sevenDaysLater);

    @Query("SELECT COUNT(m) FROM Member m WHERE m.paymentStatus = 'overdue'")
    long countOverdueMembers();

    @Query("SELECT COUNT(m) FROM Member m WHERE m.nextPaymentDate IS NOT NULL AND m.nextPaymentDate >= :now AND m.nextPaymentDate <= :sevenDaysLater AND m.paymentStatus != 'overdue'")
    long countDueSoonMembers(@Param("now") LocalDateTime now, @Param("sevenDaysLater") LocalDateTime sevenDaysLater);

    @Query("SELECT COALESCE(SUM(m.outstandingBalance), 0) FROM Member m WHERE m.paymentStatus = 'overdue'")
    BigDecimal sumOverdueBalance();

    // ── Automation trigger queries ─────────────────────────────────────────────

    /** Members whose membership expires within [now, windowEnd] and are not already expired. */
    @Query("SELECT m FROM Member m WHERE m.expiryDate IS NOT NULL " +
           "AND m.expiryDate > :now AND m.expiryDate <= :windowEnd " +
           "AND m.membershipStatus <> 'expired' AND m.userId IS NOT NULL")
    List<Member> findExpiringBetween(
            @Param("now") LocalDateTime now,
            @Param("windowEnd") LocalDateTime windowEnd);

    /** Members whose date_of_birth month+day matches today (birthday trigger). */
    @Query("SELECT m FROM Member m WHERE m.dateOfBirth IS NOT NULL " +
           "AND FUNCTION('MONTH', m.dateOfBirth) = :month " +
           "AND FUNCTION('DAY', m.dateOfBirth) = :day " +
           "AND m.userId IS NOT NULL")
    List<Member> findBirthdayMembers(
            @Param("month") int month,
            @Param("day") int day);

    /** Active members who have NOT checked in since the given cutoff. */
    @Query("SELECT m FROM Member m WHERE m.userId IS NOT NULL " +
           "AND m.membershipStatus = 'active' " +
           "AND m.id NOT IN (" +
           "  SELECT DISTINCT a.member.id FROM Attendance a " +
           "  WHERE a.checkInTime >= :cutoff" +
           ")")
    List<Member> findMembersAbsentSince(@Param("cutoff") LocalDateTime cutoff);

    // ── Dashboard Metrics ──────────────────────────────────────────────────────

    @Query("SELECT COUNT(m) FROM Member m WHERE m.membershipStatus = :status AND m.joinDate >= :startDate")
    long countByMembershipStatusAndJoinDateAfter(@Param("status") String status, @Param("startDate") LocalDateTime startDate);

    @Query("SELECT m.membershipType, COUNT(m), SUM(m.membershipFee) FROM Member m WHERE m.membershipStatus = 'active' GROUP BY m.membershipType")
    List<Object[]> countActiveMembersByType();

    List<Member> findTop5ByOrderByJoinDateDesc();
}
