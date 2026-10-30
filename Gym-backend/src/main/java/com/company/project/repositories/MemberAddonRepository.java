package com.company.project.repositories;

import com.company.project.entities.MemberAddon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MemberAddonRepository extends JpaRepository<MemberAddon, Long>, JpaSpecificationExecutor<MemberAddon> {

    // (addonName, revenue) for add-ons purchased in the period, excluding cancelled/refunded
    @Query("SELECT a.addonName, COALESCE(SUM(a.amount), 0) FROM MemberAddon a " +
           "WHERE a.purchaseDate >= :start AND a.purchaseDate < :end " +
           "AND LOWER(COALESCE(a.status, '')) NOT IN ('cancelled', 'refunded', 'pending approval', 'rejected') " +
           "GROUP BY a.addonName")
    List<Object[]> sumRevenueByAddonNameInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Older add-ons only carry the business member id, so match on either.
    @Query("SELECT a FROM MemberAddon a WHERE (a.memberDbId = :memberDbId OR a.memberId = :memberId) " +
           "AND LOWER(COALESCE(a.status, '')) NOT IN ('cancelled', 'refunded', 'expired', 'pending approval', 'rejected') " +
           "AND (a.expiryDate IS NULL OR a.expiryDate > :now) " +
           "ORDER BY a.purchaseDate DESC")
    List<MemberAddon> findActiveForMember(@Param("memberDbId") Long memberDbId,
                                          @Param("memberId") String memberId,
                                          @Param("now") LocalDateTime now);

    // App purchases paid by Cash/Credit/Mixed, awaiting staff approval — web Approvals page.
    List<MemberAddon> findByStatusOrderByPurchaseDateAsc(String status);

    List<MemberAddon> findByMemberDbIdOrderByPurchaseDateAsc(Long memberDbId);
}
