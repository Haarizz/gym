package com.company.project.repositories;

import com.company.project.entities.JournalVoucherLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JournalVoucherLineRepository extends JpaRepository<JournalVoucherLine, Long> {

    List<JournalVoucherLine> findByJournalVoucherId(Long journalVoucherId);

    void deleteByJournalVoucherId(Long journalVoucherId);

    List<JournalVoucherLine> findByAccountCode(String accountCode);
}
