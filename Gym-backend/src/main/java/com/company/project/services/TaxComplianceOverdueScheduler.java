package com.company.project.services;

import com.company.project.entities.TaxCompliance;
import com.company.project.repositories.TaxComplianceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Moves the PENDING → OVERDUE transition for tax compliance items out of
 * TaxComplianceService.getAll() (see docs/gymbios-financial-roadmap.html — M4).
 *
 * Previously a GET request mutated stored state as a side effect of listing tax
 * compliance items, which breaks REST semantics — simply viewing the Tax
 * Compliance screen changed the database. This runs the same transition on a
 * daily schedule instead, plus once at application startup so a restart doesn't
 * leave stale PENDING items sitting until the next scheduled run.
 */
@Component
public class TaxComplianceOverdueScheduler {

    private static final Logger log = LoggerFactory.getLogger(TaxComplianceOverdueScheduler.class);

    private final TaxComplianceRepository taxComplianceRepository;

    public TaxComplianceOverdueScheduler(TaxComplianceRepository taxComplianceRepository) {
        this.taxComplianceRepository = taxComplianceRepository;
    }

    /** Runs once the application context is fully up. */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        markOverdue();
    }

    /** Runs daily at 01:00. */
    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void markOverdue() {
        List<TaxCompliance> pending = taxComplianceRepository.findByStatusOrderByDueDateDesc("PENDING");
        LocalDate today = LocalDate.now();
        int updated = 0;
        for (TaxCompliance t : pending) {
            if (t.getDueDate() != null && today.isAfter(t.getDueDate())) {
                t.setStatus("OVERDUE");
                taxComplianceRepository.save(t);
                updated++;
            }
        }
        if (updated > 0) {
            log.info("Tax compliance overdue sweep: marked {} item(s) OVERDUE", updated);
        }
    }
}
