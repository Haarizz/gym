package com.company.project.repositories.mobile.dashboard;

import com.company.project.entities.SaleTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Admin-dashboard-only read queries for POS revenue, built on {@link SaleTransaction}
 * / {@link com.company.project.entities.SaleTransactionItem}. Kept separate from
 * {@code SaleTransactionRepository} so that existing file stays untouched.
 *
 * SaleTransaction is date is carried via BaseEntity.createdAt (SaleTransaction has no
 * dedicated date field). SaleTransactionItem/Product/ProductCategory carry only raw
 * Long FKs (no mapped associations), so the category breakdown query joins them
 * explicitly via "ON" — still branch-scoped correctly because SaleTransaction and
 * ProductCategory are both BranchAware and therefore still subject to the ambient
 * Hibernate branch filter when included in the query.
 */
@Repository
public interface AdminDashboardSaleTransactionRepository extends JpaRepository<SaleTransaction, Long> {

    @Query("SELECT COALESCE(SUM(t.totalAmount), 0) FROM SaleTransaction t " +
           "WHERE t.status = 'COMPLETED' AND t.createdAt >= :start AND t.createdAt < :end")
    BigDecimal sumCompletedInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // (categoryName, unitsSold, salesAmount)
    @Query("SELECT COALESCE(c.name, 'Uncategorized'), COALESCE(SUM(i.quantity), 0), COALESCE(SUM(i.totalAmount), 0) " +
           "FROM SaleTransactionItem i " +
           "JOIN SaleTransaction t ON i.transactionId = t.id " +
           "JOIN com.company.project.entities.Product p ON i.productId = p.id " +
           "JOIN com.company.project.entities.ProductCategory c ON p.categoryId = c.id " +
           "WHERE t.status = 'COMPLETED' AND t.createdAt >= :start AND t.createdAt < :end " +
           "GROUP BY c.name")
    List<Object[]> sumAndUnitsGroupedByCategory(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
