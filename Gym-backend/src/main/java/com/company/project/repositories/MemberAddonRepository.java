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
           "AND LOWER(COALESCE(a.status, '')) NOT IN ('cancelled', 'refunded') " +
           "GROUP BY a.addonName")
    List<Object[]> sumRevenueByAddonNameInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
