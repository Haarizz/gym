package com.company.project.repositories;

import com.company.project.entities.SalesInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface SalesInvoiceRepository extends JpaRepository<SalesInvoice, Long>, JpaSpecificationExecutor<SalesInvoice> {

    /**
     * Unpaid balance of confirmed Sales Invoices per member — rows of [memberId, balance],
     * only for members who still owe something. Kept apart from Member.outstandingBalance,
     * which is the membership billing balance settled through member receipts.
     */
    @Query("SELECT i.memberId, SUM(i.totalAmount - i.amountPaid) FROM SalesInvoice i "
            + "WHERE i.status = 'CONFIRMED' AND i.memberId IN :memberIds "
            + "GROUP BY i.memberId HAVING SUM(i.totalAmount - i.amountPaid) > 0")
    List<Object[]> sumDueByMember(@Param("memberIds") Collection<Long> memberIds);

    /**
     * Row lock (SELECT ... FOR UPDATE) taken by confirm / record-payment / cancel, so two
     * concurrent requests on the same invoice (double-click, two tabs) run one after the
     * other and the second sees the first's status and amount paid.
     */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM SalesInvoice i WHERE i.id = :id")
    java.util.Optional<SalesInvoice> findByIdForUpdate(@Param("id") Long id);

    /** The invoice mirroring a POS sale (source = POS). */
    java.util.Optional<SalesInvoice> findByPosTransactionId(Long posTransactionId);

    /** A member's invoices in one status, oldest first — Member SOA uses the CONFIRMED ones. */
    List<SalesInvoice> findByMemberIdAndStatusOrderByInvoiceDateAscIdAsc(Long memberId, String status);
}
