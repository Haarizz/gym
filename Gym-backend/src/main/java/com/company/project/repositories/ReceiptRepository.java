package com.company.project.repositories;

import com.company.project.entities.Receipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, Long>, JpaSpecificationExecutor<Receipt> {

    Page<Receipt> findAll(Specification<Receipt> spec, Pageable pageable);

    // Sum of paid receipts within a time range (for monthly collection)
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Receipt r WHERE r.status = 'Paid' AND r.transactionDate >= :start AND r.transactionDate < :end")
    BigDecimal sumPaidInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Sum of pending receipts created in a time range (to compute collection rate)
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Receipt r WHERE r.status IN ('Pending', 'Overdue', 'Partial') AND r.transactionDate >= :start AND r.transactionDate < :end")
    BigDecimal sumPendingInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // All paid receipts since a date (for monthly chart)
    @Query("SELECT r FROM Receipt r WHERE r.status = 'Paid' AND r.transactionDate >= :start ORDER BY r.transactionDate")
    List<Receipt> findPaidSince(@Param("start") LocalDateTime start);

    // Payment method breakdown for paid receipts in a period
    @Query("SELECT r.paymentMethod, COUNT(r), COALESCE(SUM(r.amount), 0) FROM Receipt r WHERE r.status = 'Paid' AND r.transactionDate >= :start AND r.transactionDate < :end GROUP BY r.paymentMethod")
    List<Object[]> getPaymentMethodBreakdown(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Pending/overdue bills for a specific member (primary: by DB id)
    @Query("SELECT r FROM Receipt r WHERE r.memberDbId = :memberDbId AND r.status IN ('Pending', 'Overdue', 'Partial') ORDER BY r.transactionDate ASC")
    List<Receipt> findPendingByMember(@Param("memberDbId") Long memberDbId);

    // Fallback: find pending bills by member name (handles receipts with stale/null memberDbId)
    @Query("SELECT r FROM Receipt r WHERE r.memberName = :memberName AND r.status IN ('Pending', 'Overdue', 'Partial') ORDER BY r.transactionDate ASC")
    List<Receipt> findPendingByMemberName(@Param("memberName") String memberName);
}
