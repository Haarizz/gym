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
 * Creating a FiscalYear always creates its monthly FiscalPeriod rows in the
 * same call — a fiscal year is never left without periods to manage.
 *
 * Year status drives its periods, because posting is only ever checked per
 * period (FiscalPeriodService.assertPeriodOpen): closing a year soft-closes its
 * OPEN periods, reopening it reopens its CLOSED ones, and LOCKED periods are
 * left alone either way — a lock is a deliberate month-end decision.
 */
@Service
@Transactional
public class FiscalYearService {

    private static final String AUDIT_ENTITY = "FiscalYear";
    private static final String AUDIT_MODULE = "FiscalPeriods";
    /** Longer than this is almost certainly a typo in the year (e.g. 2026 → 2062). */
    private static final int MAX_YEAR_MONTHS = 24;

    private final FiscalYearRepository fiscalYearRepository;
    private final FiscalPeriodRepository fiscalPeriodRepository;
    private final FinancialAuditLogService auditLogService;

    public FiscalYearService(FiscalYearRepository fiscalYearRepository,
                              FiscalPeriodRepository fiscalPeriodRepository,
                              FinancialAuditLogService auditLogService) {
        this.fiscalYearRepository = fiscalYearRepository;
        this.fiscalPeriodRepository = fiscalPeriodRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<FiscalYear> findAll() {
        return fiscalYearRepository.findAllByOrderByStartDateDesc();
    }

    public FiscalYear create(String name, LocalDate startDate, LocalDate endDate) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) throw new BusinessRuleViolationException("Fiscal year name is required");
        if (startDate == null || endDate == null) {
            throw new BusinessRuleViolationException("Start and end date are required");
        }
        if (endDate.isBefore(startDate)) {
            throw new BusinessRuleViolationException("End date must be on or after the start date");
        }
        if (!endDate.isBefore(startDate.plusMonths(MAX_YEAR_MONTHS))) {
            throw new BusinessRuleViolationException(
                    "A fiscal year can't be longer than " + MAX_YEAR_MONTHS + " months — check the dates");
        }
        if (fiscalYearRepository.findByName(trimmed).isPresent()) {
            throw new BusinessRuleViolationException("Fiscal year already exists: " + trimmed);
        }
        // Overlapping years would give one date two periods, and assertPeriodOpen
        // would then check whichever row the database happened to return first.
        if (fiscalYearRepository.existsByStartDateLessThanEqualAndEndDateGreaterThanEqual(endDate, startDate)) {
            throw new BusinessRuleViolationException(
                    "These dates overlap an existing fiscal year — each date can belong to only one year");
        }
        FiscalYear year = new FiscalYear();
        year.setName(trimmed);
        year.setStartDate(startDate);
        year.setEndDate(endDate);
        year.setStatus("OPEN");
        year = fiscalYearRepository.save(year);
        List<FiscalPeriod> periods = generateMonthlyPeriods(year);
        auditLogService.record("CREATE", AUDIT_ENTITY, year.getId(), null, AUDIT_MODULE,
                "Created fiscal year " + trimmed + " (" + startDate + " to " + endDate + ", "
                        + periods.size() + " periods)");
        return year;
    }

    /**
     * Idempotent — called by DataInitializer on every boot. Skips if the year already
     * exists, or if the gym runs a non-calendar year that already covers these dates
     * (create() would reject the overlap and fail startup).
     */
    public void ensureCalendarYearSeeded(int calendarYear) {
        String name = "FY" + calendarYear;
        LocalDate start = LocalDate.of(calendarYear, 1, 1);
        LocalDate end = LocalDate.of(calendarYear, 12, 31);
        if (fiscalYearRepository.findByName(name).isPresent()
                || fiscalYearRepository.existsByStartDateLessThanEqualAndEndDateGreaterThanEqual(end, start)) {
            return;
        }
        create(name, start, end);
    }

    public FiscalYear close(Long id) {
        FiscalYear year = require(id);
        int changed = moveCascadingPeriods(year, "OPEN", "CLOSED");
        year.setStatus("CLOSED");
        year = fiscalYearRepository.save(year);
        auditLogService.record("CLOSE", AUDIT_ENTITY, year.getId(), null, AUDIT_MODULE,
                "Closed fiscal year " + year.getName() + " (" + changed + " open periods closed)");
        return year;
    }

    public FiscalYear reopen(Long id) {
        FiscalYear year = require(id);
        int changed = moveCascadingPeriods(year, "CLOSED", "OPEN");
        year.setStatus("OPEN");
        year = fiscalYearRepository.save(year);
        auditLogService.record("REOPEN", AUDIT_ENTITY, year.getId(), null, AUDIT_MODULE,
                "Reopened fiscal year " + year.getName() + " (" + changed + " closed periods reopened)");
        return year;
    }

    /** Only for a year created by mistake: refuses once any journal entry is dated inside it. */
    public void delete(Long id) {
        FiscalYear year = require(id);
        long vouchers = fiscalPeriodRepository.countVouchersBetween(year.getStartDate(), year.getEndDate());
        if (vouchers > 0) {
            throw new BusinessRuleViolationException("Can't delete " + year.getName() + ": " + vouchers
                    + " journal entr" + (vouchers == 1 ? "y is" : "ies are") + " dated inside it. Close it instead.");
        }
        fiscalPeriodRepository.deleteByFiscalYearId(year.getId());
        fiscalYearRepository.delete(year);
        auditLogService.record("DELETE", AUDIT_ENTITY, year.getId(), null, AUDIT_MODULE,
                "Deleted fiscal year " + year.getName() + " (" + year.getStartDate() + " to " + year.getEndDate() + ")");
    }

    private FiscalYear require(Long id) {
        return fiscalYearRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleViolationException("Fiscal year not found: " + id));
    }

    private int moveCascadingPeriods(FiscalYear year, String from, String to) {
        List<FiscalPeriod> periods = fiscalPeriodRepository.findByFiscalYearIdOrderByStartDateAsc(year.getId());
        int changed = 0;
        for (FiscalPeriod p : periods) {
            if (from.equalsIgnoreCase(p.getStatus())) {
                p.setStatus(to);
                changed++;
            }
        }
        fiscalPeriodRepository.saveAll(periods);
        return changed;
    }

    private List<FiscalPeriod> generateMonthlyPeriods(FiscalYear year) {
        List<FiscalPeriod> periods = new ArrayList<>();
        // Offsets from the start date, not a rolling cursor: a year starting on the
        // 31st would otherwise drift to the 28th after February and stay there.
        for (int i = 0; !year.getStartDate().plusMonths(i).isAfter(year.getEndDate()); i++) {
            LocalDate periodStart = year.getStartDate().plusMonths(i);
            LocalDate periodEnd = year.getStartDate().plusMonths(i + 1).minusDays(1);
            if (periodEnd.isAfter(year.getEndDate())) periodEnd = year.getEndDate();

            FiscalPeriod period = new FiscalPeriod();
            period.setFiscalYearId(year.getId());
            period.setName(periodStart.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
                    + " " + periodStart.getYear());
            period.setStartDate(periodStart);
            period.setEndDate(periodEnd);
            period.setStatus("OPEN");
            periods.add(period);
        }
        return fiscalPeriodRepository.saveAll(periods);
    }
}
