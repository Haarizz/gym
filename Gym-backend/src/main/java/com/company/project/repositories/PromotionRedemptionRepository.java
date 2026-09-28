package com.company.project.repositories;

import com.company.project.entities.PromotionRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface PromotionRedemptionRepository extends JpaRepository<PromotionRedemption, Long> {

    @Query("SELECT COALESCE(SUM(r.revenue), 0) FROM PromotionRedemption r " +
            "WHERE r.redeemedAt >= :from AND r.redeemedAt < :to")
    BigDecimal sumRevenueBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    long countByRedeemedAtGreaterThanEqualAndRedeemedAtLessThan(LocalDateTime from, LocalDateTime to);

    @Query("SELECT DISTINCT r.memberId FROM PromotionRedemption r " +
            "WHERE r.memberId IS NOT NULL AND r.redeemedAt >= :from AND r.redeemedAt < :to")
    List<Long> findDistinctMemberIdsBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
