package com.company.project.repositories;

import com.company.project.entities.JournalVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JournalVoucherRepository extends JpaRepository<JournalVoucher, Long>,
        JpaSpecificationExecutor<JournalVoucher> {

    List<JournalVoucher> findAllByOrderByDateDesc();

    List<JournalVoucher> findByStatusOrderByDateDesc(String status);

    /** Date-range filtering pushed to SQL — used by LedgerTransactionService. */
    List<JournalVoucher> findByStatusAndDateBetweenOrderByDateDesc(String status, LocalDate from, LocalDate to);

    /** Excludes soft-deleted vouchers — a deleted voucher is treated as not found. */
    Optional<JournalVoucher> findByIdAndDeletedAtIsNull(Long id);
}
