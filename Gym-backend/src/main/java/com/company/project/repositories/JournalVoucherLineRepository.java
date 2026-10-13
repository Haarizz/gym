package com.company.project.repositories;

import com.company.project.entities.JournalVoucherLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface JournalVoucherLineRepository extends JpaRepository<JournalVoucherLine, Long> {

    List<JournalVoucherLine> findByJournalVoucherId(Long journalVoucherId);

    List<JournalVoucherLine> findByJournalVoucherIdIn(Collection<Long> journalVoucherIds);

    void deleteByJournalVoucherId(Long journalVoucherId);

    List<JournalVoucherLine> findByAccountCode(String accountCode);

    @org.springframework.data.jpa.repository.Query("SELECT l.accountCode, SUM(COALESCE(l.debit, 0) - COALESCE(l.credit, 0)) FROM JournalVoucherLine l JOIN JournalVoucher jv ON l.journalVoucherId = jv.id WHERE jv.status = 'POSTED' GROUP BY l.accountCode")
    List<Object[]> getAccountBalances();

    /**
     * Posted revenue (credit − debit on REVENUE accounts) per branch for vouchers
     * dated in [from, to) — the same definition FinancialAnalyticsService uses for
     * the Finance dashboard and the BiOS revenue chart. Rows are [branchId, amount].
     */
    @org.springframework.data.jpa.repository.Query("SELECT jv.branchId, COALESCE(SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)), 0) "
            + "FROM JournalVoucherLine l JOIN JournalVoucher jv ON l.journalVoucherId = jv.id "
            + "WHERE jv.status = 'POSTED' AND jv.date >= :from AND jv.date < :to "
            + "AND l.accountCode IN (SELECT a.code FROM AccountHead a WHERE UPPER(a.type) = 'REVENUE') "
            + "GROUP BY jv.branchId")
    List<Object[]> sumPostedRevenueByBranch(@org.springframework.data.repository.query.Param("from") java.time.LocalDate from,
                                            @org.springframework.data.repository.query.Param("to") java.time.LocalDate to);
}
