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
}
