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
