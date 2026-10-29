package com.company.project.services;

import com.company.project.entities.FiscalPeriod;
import com.company.project.entities.FiscalYear;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.FiscalPeriodRepository;
import com.company.project.repositories.FiscalYearRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
    private final FiscalYearRepository fiscalYearRepository;
    private final FinancialAuditLogService auditLogService;

    public FiscalPeriodService(FiscalPeriodRepository fiscalPeriodRepository,
                               FiscalYearRepository fiscalYearRepository,
                               FinancialAuditLogService auditLogService) {
        this.fiscalPeriodRepository = fiscalPeriodRepository;
        this.fiscalYearRepository = fiscalYearRepository;
        this.auditLogService = auditLogService;
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

    /** Journal entries dated inside each period (all branches), keyed by period id. */
    @Transactional(readOnly = true)
    public Map<Long, Long> voucherCounts(List<FiscalPeriod> periods) {
        Map<Long, Long> counts = new LinkedHashMap<>();
        for (FiscalPeriod p : periods) {
            counts.put(p.getId(), fiscalPeriodRepository.countVouchersBetween(p.getStartDate(), p.getEndDate()));
        }
        return counts;
    }

    public FiscalPeriod setStatus(Long id, String status) {
        FiscalPeriod period = fiscalPeriodRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleViolationException("Fiscal period not found: " + id));
        String previous = period.getStatus();
        if (status.equalsIgnoreCase(previous)) return period;
        if ("OPEN".equals(status)) {
            // Closing a year closes its periods; reopening one month of a closed
            // year would quietly let postings back into a year marked closed.
            FiscalYear year = fiscalYearRepository.findById(period.getFiscalYearId()).orElse(null);
            if (year != null && "CLOSED".equalsIgnoreCase(year.getStatus())) {
                throw new BusinessRuleViolationException(
                        "Fiscal year " + year.getName() + " is closed — reopen the year before reopening " + period.getName());
            }
        }
        period.setStatus(status);
        FiscalPeriod saved = fiscalPeriodRepository.save(period);
        String action = "OPEN".equals(status) ? "REOPEN" : "LOCKED".equals(status) ? "LOCK" : "CLOSE";
        auditLogService.record(action, "FiscalPeriod", saved.getId(), null, "FiscalPeriods",
                "Fiscal period " + saved.getName() + ": " + previous + " → " + status);
        return saved;
    }
}
