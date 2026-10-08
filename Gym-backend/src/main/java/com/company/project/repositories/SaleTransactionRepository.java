package com.company.project.repositories;

import com.company.project.entities.SaleTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleTransactionRepository extends JpaRepository<SaleTransaction, Long>, JpaSpecificationExecutor<SaleTransaction> {

    List<SaleTransaction> findByPosSessionIdOrderByCreatedAtDesc(Long sessionId);

    List<SaleTransaction> findByMemberIdOrderByCreatedAtDesc(Long memberId);

    boolean existsByTransactionNumber(String transactionNumber);

    java.util.Optional<SaleTransaction> findFirstByTransactionNumberIgnoreCase(String transactionNumber);

    /**
     * Sales of business days [from, to]. Rows that predate business_date (left NULL where
     * the V75 backfill has not run, e.g. local profiles with Flyway off) fall back to the
     * calendar day they were created.
     */
    @Query("SELECT t FROM SaleTransaction t WHERE (t.businessDate BETWEEN :from AND :to) " +
           "OR (t.businessDate IS NULL AND t.createdAt >= :start AND t.createdAt < :end) ORDER BY t.createdAt ASC")
    List<SaleTransaction> findForBusinessDates(@Param("from") java.time.LocalDate from, @Param("to") java.time.LocalDate to,
                                               @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    default List<SaleTransaction> findByBusinessDateOrderByCreatedAtAsc(java.time.LocalDate day) {
        return findForBusinessDates(day, day, day.atStartOfDay(), day.plusDays(1).atStartOfDay());
    }

    default List<SaleTransaction> findByBusinessDateBetweenOrderByCreatedAtAsc(java.time.LocalDate from, java.time.LocalDate to) {
        return findForBusinessDates(from, to, from.atStartOfDay(), to.plusDays(1).atStartOfDay());
    }

    /** Credit (on-account) sales of a member that still carry an unsettled balance, oldest first. */
    @Query("SELECT t FROM SaleTransaction t WHERE t.memberId = :memberId AND t.creditAmount > 0 " +
           "AND (t.creditAmount - COALESCE(t.creditSettledAmount, 0)) > 0.004 ORDER BY t.createdAt ASC")
    List<SaleTransaction> findOpenCreditSales(@Param("memberId") Long memberId);

    /** Unsettled POS credit per member, for the members given: rows of [memberId, outstanding]. */
    @Query("SELECT t.memberId, SUM(t.creditAmount - COALESCE(t.creditSettledAmount, 0)) FROM SaleTransaction t " +
           "WHERE t.memberId IN :memberIds AND t.creditAmount > 0 AND (t.creditAmount - COALESCE(t.creditSettledAmount, 0)) > 0.004 " +
           "GROUP BY t.memberId")
    List<Object[]> sumOpenCredit(@Param("memberIds") java.util.Collection<Long> memberIds);

    /** All credit (on-account) sales of a member, newest first. */
    @Query("SELECT t FROM SaleTransaction t WHERE t.memberId = :memberId AND t.creditAmount > 0 ORDER BY t.createdAt DESC")
    List<SaleTransaction> findCreditSales(@Param("memberId") Long memberId);

    /** (posSessionId, saleCount, netSales) per session — net of any returns. */
    @Query("SELECT t.posSessionId, COUNT(t), COALESCE(SUM(t.totalAmount - COALESCE(t.refundedAmount, 0)), 0) " +
           "FROM SaleTransaction t WHERE t.posSessionId IN :ids GROUP BY t.posSessionId")
    List<Object[]> sessionTotals(@Param("ids") java.util.Collection<Long> ids);

    // Completed POS sales in [start, end) — web Revenue Dashboard
    @Query("SELECT t FROM SaleTransaction t WHERE t.status = 'COMPLETED' AND t.createdAt >= :start AND t.createdAt < :end")
    List<SaleTransaction> findCompletedBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // (transactionId, categoryName, quantity, lineTotal) for every line of a completed sale in [start, end)
    @Query("SELECT i.transactionId, COALESCE(c.name, 'Uncategorized'), i.quantity, i.totalAmount " +
           "FROM SaleTransactionItem i " +
           "JOIN SaleTransaction t ON i.transactionId = t.id " +
           "LEFT JOIN com.company.project.entities.Product p ON i.productId = p.id " +
           "LEFT JOIN com.company.project.entities.ProductCategory c ON p.categoryId = c.id " +
           "WHERE t.status = 'COMPLETED' AND t.createdAt >= :start AND t.createdAt < :end")
    List<Object[]> findCompletedLineCategoriesBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
