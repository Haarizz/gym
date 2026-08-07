package com.company.project.services;

import com.company.project.entities.FiscalPeriod;
import com.company.project.entities.FiscalYear;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.FiscalPeriodRepository;
import com.company.project.repositories.FiscalYearRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Creating a FiscalYear always creates its 12 monthly FiscalPeriod rows in
 * the same call — a fiscal year is never left without periods to manage.
 */
@Service
@Transactional
public class FiscalYearService {

    private final FiscalYearRepository fiscalYearRepository;
    private final FiscalPeriodRepository fiscalPeriodRepository;

    public FiscalYearService(FiscalYearRepository fiscalYearRepository,
                              FiscalPeriodRepository fiscalPeriodRepository) {
        this.fiscalYearRepository = fiscalYearRepository;
        this.fiscalPeriodRepository = fiscalPeriodRepository;
    }

    @Transactional(readOnly = true)
    public List<FiscalYear> findAll() {
        return fiscalYearRepository.findAllByOrderByStartDateDesc();
    }

    public FiscalYear create(String name, LocalDate startDate, LocalDate endDate) {
        if (fiscalYearRepository.findByName(name).isPresent()) {
            throw new BusinessRuleViolationException("Fiscal year already exists: " + name);
        }
        FiscalYear year = new FiscalYear();
        year.setName(name);
        year.setStartDate(startDate);
        year.setEndDate(endDate);
        year.setStatus("OPEN");
        year = fiscalYearRepository.save(year);
        generateMonthlyPeriods(year);
        return year;
    }

    /** Idempotent — used by both the API and DataInitializer's seed. Skips if the year already exists. */
    public FiscalYear ensureCalendarYearSeeded(int calendarYear) {
        String name = "FY" + calendarYear;
        return fiscalYearRepository.findByName(name)
                .orElseGet(() -> create(name, LocalDate.of(calendarYear, 1, 1), LocalDate.of(calendarYear, 12, 31)));
    }

    public FiscalYear setStatus(Long id, String status) {
        FiscalYear year = fiscalYearRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleViolationException("Fiscal year not found: " + id));
        year.setStatus(status);
        return fiscalYearRepository.save(year);
    }

    private void generateMonthlyPeriods(FiscalYear year) {
        List<FiscalPeriod> periods = new ArrayList<>();
        LocalDate cursor = year.getStartDate();
        while (!cursor.isAfter(year.getEndDate())) {
            LocalDate periodStart = cursor;
            LocalDate periodEnd = cursor.plusMonths(1).minusDays(1);
            if (periodEnd.isAfter(year.getEndDate())) periodEnd = year.getEndDate();

            FiscalPeriod period = new FiscalPeriod();
            period.setFiscalYearId(year.getId());
            period.setName(periodStart.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
                    + " " + periodStart.getYear());
            period.setStartDate(periodStart);
            period.setEndDate(periodEnd);
            period.setStatus("OPEN");
            periods.add(period);

            cursor = cursor.plusMonths(1);
        }
        fiscalPeriodRepository.saveAll(periods);
    }
}
