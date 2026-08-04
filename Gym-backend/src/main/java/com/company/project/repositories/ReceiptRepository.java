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

    // Cash-basis monthly collection: sums each transaction's own paidAmount (what was
    // actually received in that specific receipt row), not the bill's full invoice
    // amount and not gated to status='Paid' — a Partial bill's initial payment is real
    // cash received and must count the moment it arrives, and a later settlement is
    // its own separate row that only ever adds its own leg, never double-counting.
    @Query("SELECT COALESCE(SUM(r.paidAmount), 0) FROM Receipt r WHERE r.transactionDate >= :start AND r.transactionDate < :end")
    BigDecimal sumPaidInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Sum of amounts still outstanding on bills created in a time range (collection-rate
    // denominator) — the bill's full invoice amount less whatever has actually been
    // paid toward it to date (totalPaidToDate rollup; falls back to paidAmount for
    // legacy rows created before that field existed).
    @Query("SELECT COALESCE(SUM(r.amount - COALESCE(r.totalPaidToDate, r.paidAmount, 0)), 0) FROM Receipt r WHERE r.status IN ('Pending', 'Overdue', 'Partial') AND r.transactionDate >= :start AND r.transactionDate < :end")
    BigDecimal sumPendingInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // All receipts with real money received since a date (for monthly chart)
    @Query("SELECT r FROM Receipt r WHERE r.paidAmount > 0 AND r.transactionDate >= :start ORDER BY r.transactionDate")
    List<Receipt> findPaidSince(@Param("start") LocalDateTime start);

    // Payment method breakdown for actual money received in a period
    @Query("SELECT r.paymentMethod, COUNT(r), COALESCE(SUM(r.paidAmount), 0) FROM Receipt r WHERE r.paidAmount > 0 AND r.transactionDate >= :start AND r.transactionDate < :end GROUP BY r.paymentMethod")
    List<Object[]> getPaymentMethodBreakdown(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Pending/overdue bills for a specific member (primary: by DB id)
    @Query("SELECT r FROM Receipt r WHERE r.memberDbId = :memberDbId AND r.status IN ('Pending', 'Overdue', 'Partial') ORDER BY r.transactionDate ASC")
    List<Receipt> findPendingByMember(@Param("memberDbId") Long memberDbId);

    // Fallback: find pending bills by member name (handles receipts with stale/null memberDbId)
    @Query("SELECT r FROM Receipt r WHERE r.memberName = :memberName AND r.status IN ('Pending', 'Overdue', 'Partial') ORDER BY r.transactionDate ASC")
    List<Receipt> findPendingByMemberName(@Param("memberName") String memberName);

    // Full transaction history for a member's Statement of Account (primary: by DB id)
    List<Receipt> findByMemberDbIdOrderByTransactionDateAsc(Long memberDbId);

    // How many times a member has renewed — used to evaluate "renewal count" promotional
    // eligibility rules, since Member itself carries no renewal counter of its own.
    long countByMemberDbIdAndTransactionType(Long memberDbId, String transactionType);

    // Fallback: find full history by member name (handles receipts with stale/null memberDbId)
    List<Receipt> findByMemberNameOrderByTransactionDateAsc(String memberName);
}
