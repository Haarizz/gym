package com.company.project.services;

import com.company.project.entities.FiscalPeriod;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.FiscalPeriodRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Period-lock enforcement for the posting engine. Deliberately fails OPEN:
 * if no FiscalPeriod is configured for a given date, posting is allowed
 * (with a warning) rather than rejected — this ships on top of years of
 * unconfigured history and years the admin hasn't created yet, so it must
 * not break every existing flow the moment it's added. Locking only takes
 * effect once an admin has actually created and closed/locked a period.
 */
@Service
@Transactional
public class FiscalPeriodService {

    private static final Logger log = LoggerFactory.getLogger(FiscalPeriodService.class);

    private final FiscalPeriodRepository fiscalPeriodRepository;

    public FiscalPeriodService(FiscalPeriodRepository fiscalPeriodRepository) {
        this.fiscalPeriodRepository = fiscalPeriodRepository;
    }

    /** Throws if a FiscalPeriod covering this date exists and is CLOSED/LOCKED. */
    public void assertPeriodOpen(LocalDate date) {
        if (date == null) return;
        Optional<FiscalPeriod> period = findPeriodFor(date);
        if (period.isEmpty()) {
            log.warn("No fiscal period configured for date {} — posting allowed by default.", date);
            return;
        }
        String status = period.get().getStatus();
        if ("CLOSED".equalsIgnoreCase(status) || "LOCKED".equalsIgnoreCase(status)) {
            throw new BusinessRuleViolationException(
                    "Cannot post to " + date + ": fiscal period \"" + period.get().getName()
                    + "\" is " + status + ".");
        }
    }

    public Optional<FiscalPeriod> findPeriodFor(LocalDate date) {
        return fiscalPeriodRepository.findFirstByStartDateLessThanEqualAndEndDateGreaterThanEqual(date, date);
    }

    @Transactional(readOnly = true)
    public List<FiscalPeriod> findByFiscalYear(Long fiscalYearId) {
        return fiscalPeriodRepository.findByFiscalYearIdOrderByStartDateAsc(fiscalYearId);
    }

    @Transactional(readOnly = true)
    public List<FiscalPeriod> findAll() {
        return fiscalPeriodRepository.findAllByOrderByStartDateDesc();
    }

    public FiscalPeriod setStatus(Long id, String status) {
        FiscalPeriod period = fiscalPeriodRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleViolationException("Fiscal period not found: " + id));
        period.setStatus(status);
        return fiscalPeriodRepository.save(period);
    }
}
