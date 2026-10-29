package com.company.project.repositories;

import com.company.project.entities.FiscalYear;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FiscalYearRepository extends JpaRepository<FiscalYear, Long> {

    Optional<FiscalYear> findByName(String name);

    List<FiscalYear> findAllByOrderByStartDateDesc();

    /** True when an existing year's range overlaps [start, end] — call as (end, start). */
    boolean existsByStartDateLessThanEqualAndEndDateGreaterThanEqual(LocalDate end, LocalDate start);
}
