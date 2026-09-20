package com.company.project.repositories.mobile.dashboard;

import com.company.project.entities.Receipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Admin-dashboard-only read queries against the existing {@code receipts} table.
 * A separate interface (rather than adding methods to {@code ReceiptRepository})
 * so the existing, already-relied-upon repository file is never touched.
 *
 * Every query here is subject to the same ambient Hibernate branch filter as the
 * rest of the app (Receipt is BranchAware) — a specific active branch restricts
 * results to it, and "All Branches" mode (no active branch) leaves them unfiltered.
 */
@Repository
public interface AdminDashboardReceiptRepository extends JpaRepository<Receipt, Long> {

    @Query("SELECT COALESCE(SUM(r.paidAmount), 0) FROM Receipt r " +
           "WHERE r.transactionType IN :transactionTypes " +
           "AND r.transactionDate >= :start AND r.transactionDate < :end")
    BigDecimal sumPaidByTransactionTypesInPeriod(
            @Param("transactionTypes") List<String> transactionTypes,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // (planName, count, sum) — membership sales breakdown by plan.
    @Query("SELECT COALESCE(r.planName, 'Unspecified'), COUNT(r), COALESCE(SUM(r.paidAmount), 0) FROM Receipt r " +
           "WHERE r.transactionType IN :transactionTypes " +
           "AND r.transactionDate >= :start AND r.transactionDate < :end " +
           "GROUP BY r.planName")
    List<Object[]> sumAndCountGroupedByPlan(
            @Param("transactionTypes") List<String> transactionTypes,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // (date, count, sum) — day-pass sales breakdown by calendar day.
    @Query("SELECT FUNCTION('DATE', r.transactionDate), COUNT(r), COALESCE(SUM(r.paidAmount), 0) FROM Receipt r " +
           "WHERE r.transactionType = :transactionType " +
           "AND r.transactionDate >= :start AND r.transactionDate < :end " +
           "GROUP BY FUNCTION('DATE', r.transactionDate) " +
           "ORDER BY FUNCTION('DATE', r.transactionDate)")
    List<Object[]> sumAndCountGroupedByDate(
            @Param("transactionType") String transactionType,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // (branchId, count, sum) — collections breakdown by branch (used in All Branches mode).
    @Query("SELECT r.branchId, COUNT(r), COALESCE(SUM(r.paidAmount), 0) FROM Receipt r " +
           "WHERE r.transactionType IN :transactionTypes " +
           "AND r.transactionDate >= :start AND r.transactionDate < :end " +
           "GROUP BY r.branchId")
    List<Object[]> sumAndCountGroupedByBranch(
            @Param("transactionTypes") List<String> transactionTypes,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}
