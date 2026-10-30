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

    // ── General Ledger, one page at a time (Ledgers › General Ledger) ─────────
    // allAccounts = true ignores :code. Rows come in ledger order: date, voucher, line.

    /** One page of [line, voucher] pairs on POSTED vouchers dated in [from, to]. */
    @org.springframework.data.jpa.repository.Query("SELECT l, jv FROM JournalVoucherLine l JOIN JournalVoucher jv ON l.journalVoucherId = jv.id "
            + "WHERE jv.status = 'POSTED' AND jv.date >= :from AND jv.date <= :to "
            + "AND (:allAccounts = TRUE OR l.accountCode = :code) "
            + "ORDER BY jv.date, jv.id, l.id")
    List<Object[]> findLedgerPage(@org.springframework.data.repository.query.Param("from") java.time.LocalDate from,
                                  @org.springframework.data.repository.query.Param("to") java.time.LocalDate to,
                                  @org.springframework.data.repository.query.Param("allAccounts") boolean allAccounts,
                                  @org.springframework.data.repository.query.Param("code") String code,
                                  org.springframework.data.domain.Pageable page);

    /** [row count, debit total, credit total] for the same filter. */
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(l), COALESCE(SUM(l.debit), 0), COALESCE(SUM(l.credit), 0) "
            + "FROM JournalVoucherLine l JOIN JournalVoucher jv ON l.journalVoucherId = jv.id "
            + "WHERE jv.status = 'POSTED' AND jv.date >= :from AND jv.date <= :to "
            + "AND (:allAccounts = TRUE OR l.accountCode = :code)")
    List<Object[]> ledgerTotals(@org.springframework.data.repository.query.Param("from") java.time.LocalDate from,
                                @org.springframework.data.repository.query.Param("to") java.time.LocalDate to,
                                @org.springframework.data.repository.query.Param("allAccounts") boolean allAccounts,
                                @org.springframework.data.repository.query.Param("code") String code);

    /**
     * debit − credit over one account's rows in [from, to] that come before the given row
     * in ledger order — where a page's running balance picks up.
     */
    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(COALESCE(l.debit, 0) - COALESCE(l.credit, 0)), 0) "
            + "FROM JournalVoucherLine l JOIN JournalVoucher jv ON l.journalVoucherId = jv.id "
            + "WHERE jv.status = 'POSTED' AND jv.date >= :from AND jv.date <= :to AND l.accountCode = :code "
            + "AND (jv.date < :rowDate OR (jv.date = :rowDate AND (jv.id < :rowVoucherId "
            + "OR (jv.id = :rowVoucherId AND l.id < :rowLineId))))")
    java.math.BigDecimal ledgerNetBefore(@org.springframework.data.repository.query.Param("from") java.time.LocalDate from,
                                         @org.springframework.data.repository.query.Param("to") java.time.LocalDate to,
                                         @org.springframework.data.repository.query.Param("code") String code,
                                         @org.springframework.data.repository.query.Param("rowDate") java.time.LocalDate rowDate,
                                         @org.springframework.data.repository.query.Param("rowVoucherId") Long rowVoucherId,
                                         @org.springframework.data.repository.query.Param("rowLineId") Long rowLineId);

    /** [accountCode, debit, credit] over POSTED vouchers dated in [from, to]. */
    @org.springframework.data.jpa.repository.Query("SELECT l.accountCode, COALESCE(SUM(l.debit), 0), COALESCE(SUM(l.credit), 0) "
            + "FROM JournalVoucherLine l JOIN JournalVoucher jv ON l.journalVoucherId = jv.id "
            + "WHERE jv.status = 'POSTED' AND jv.date >= :from AND jv.date <= :to GROUP BY l.accountCode")
    List<Object[]> sumPostedByAccountBetween(@org.springframework.data.repository.query.Param("from") java.time.LocalDate from,
                                             @org.springframework.data.repository.query.Param("to") java.time.LocalDate to);

    /** [accountCode, debit − credit] over live POSTED vouchers dated before the given day. */
    @org.springframework.data.jpa.repository.Query("SELECT l.accountCode, COALESCE(SUM(COALESCE(l.debit, 0) - COALESCE(l.credit, 0)), 0) "
            + "FROM JournalVoucherLine l JOIN JournalVoucher jv ON l.journalVoucherId = jv.id "
            + "WHERE jv.status = 'POSTED' AND jv.deletedAt IS NULL AND jv.date < :before GROUP BY l.accountCode")
    List<Object[]> sumPostedNetByAccountBefore(@org.springframework.data.repository.query.Param("before") java.time.LocalDate before);

    /**
     * [journalVoucherId, debit total without the stock-cost lines] for vouchers that carry
     * an inventory ↔ COGS pair (a sale or return of goods). Their money side is the sale or
     * refund amount; the pair is the goods' cost moving between stock and expense.
     */
    @org.springframework.data.jpa.repository.Query("SELECT l.journalVoucherId, "
            + "COALESCE(SUM(CASE WHEN l.accountCode = :inventory OR l.accountCode = :cogs THEN 0 ELSE COALESCE(l.debit, 0) END), 0) "
            + "FROM JournalVoucherLine l GROUP BY l.journalVoucherId "
            + "HAVING SUM(CASE WHEN l.accountCode = :inventory THEN 1 ELSE 0 END) > 0 "
            + "AND SUM(CASE WHEN l.accountCode = :cogs THEN 1 ELSE 0 END) > 0")
    List<Object[]> findAmountWithoutStockCost(@org.springframework.data.repository.query.Param("inventory") String inventoryAccount,
                                              @org.springframework.data.repository.query.Param("cogs") String cogsAccount);

    /** [journalVoucherId, a cost center] for each voucher with a line on one. */
    @org.springframework.data.jpa.repository.Query("SELECT l.journalVoucherId, MIN(l.costCenter) FROM JournalVoucherLine l "
            + "WHERE l.costCenter IS NOT NULL AND l.costCenter <> '' GROUP BY l.journalVoucherId")
    List<Object[]> findCostCenterPerVoucher();

    /**
     * Debit and credit totals per account over every POSTED voucher, summed by the
     * database rather than loading each line: [accountCode, debit, credit].
     */
    @org.springframework.data.jpa.repository.Query("SELECT l.accountCode, COALESCE(SUM(l.debit), 0), COALESCE(SUM(l.credit), 0) "
            + "FROM JournalVoucherLine l JOIN JournalVoucher jv ON l.journalVoucherId = jv.id "
            + "WHERE jv.status = 'POSTED' GROUP BY l.accountCode")
    List<Object[]> sumPostedByAccount();

    /** The same per account and voucher month, for vouchers dated in [from, to]: [accountCode, year, month, debit, credit]. */
    @org.springframework.data.jpa.repository.Query("SELECT l.accountCode, EXTRACT(YEAR FROM jv.date), EXTRACT(MONTH FROM jv.date), "
            + "COALESCE(SUM(l.debit), 0), COALESCE(SUM(l.credit), 0) "
            + "FROM JournalVoucherLine l JOIN JournalVoucher jv ON l.journalVoucherId = jv.id "
            + "WHERE jv.status = 'POSTED' AND jv.date >= :from AND jv.date <= :to "
            + "GROUP BY l.accountCode, EXTRACT(YEAR FROM jv.date), EXTRACT(MONTH FROM jv.date)")
    List<Object[]> sumPostedByAccountAndMonth(@org.springframework.data.repository.query.Param("from") java.time.LocalDate from,
                                              @org.springframework.data.repository.query.Param("to") java.time.LocalDate to);

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
