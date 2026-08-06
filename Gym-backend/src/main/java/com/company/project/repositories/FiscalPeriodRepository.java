package com.company.project.repositories;

import com.company.project.entities.FiscalPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FiscalPeriodRepository extends JpaRepository<FiscalPeriod, Long> {

    List<FiscalPeriod> findByFiscalYearIdOrderByStartDateAsc(Long fiscalYearId);

    List<FiscalPeriod> findAllByOrderByStartDateDesc();

    /** The period (if any) whose range contains the given date. */
    Optional<FiscalPeriod> findFirstByStartDateLessThanEqualAndEndDateGreaterThanEqual(LocalDate date1, LocalDate date2);
}
