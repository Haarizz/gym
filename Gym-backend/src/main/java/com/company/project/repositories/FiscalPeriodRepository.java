package com.company.project.repositories;

import com.company.project.entities.FiscalPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FiscalPeriodRepository extends JpaRepository<FiscalPeriod, Long> {

    List<FiscalPeriod> findByFiscalYearIdOrderByStartDateAsc(Long fiscalYearId);

    List<FiscalPeriod> findAllByOrderByStartDateDesc();

    /** The period (if any) whose range contains the given date. */
    Optional<FiscalPeriod> findFirstByStartDateLessThanEqualAndEndDateGreaterThanEqual(LocalDate date1, LocalDate date2);

    void deleteByFiscalYearId(Long fiscalYearId);

    /**
     * Live (not soft-deleted) journal vouchers dated inside [from, to], across ALL
     * branches — fiscal periods are tenant-wide, so this is native SQL on purpose:
     * JournalVoucher's Hibernate branchFilter would otherwise count one branch only.
     */
    @Query(value = "SELECT COUNT(*) FROM journal_vouchers WHERE deleted_at IS NULL AND date BETWEEN :from AND :to",
            nativeQuery = true)
    long countVouchersBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
