package com.company.project.services;

import com.company.project.entities.DeferredRevenueRecognitionLine;
import com.company.project.entities.DeferredRevenueSchedule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Posts every deferred-revenue recognition line whose period has elapsed —
 * mirrors AssetDepreciationScheduler's shape (monthly cron -> FinancialEventService).
 * Runs at 3am on the 1st, after the 2am asset-depreciation job.
 */
@Service
public class DeferredRevenueRecognitionScheduler {

    private static final Logger log = LoggerFactory.getLogger(DeferredRevenueRecognitionScheduler.class);

    private final DeferredRevenueScheduleService deferredRevenueScheduleService;
    private final FinancialEventService financialEventService;

    public DeferredRevenueRecognitionScheduler(DeferredRevenueScheduleService deferredRevenueScheduleService,
                                                FinancialEventService financialEventService) {
        this.deferredRevenueScheduleService = deferredRevenueScheduleService;
        this.financialEventService = financialEventService;
    }

    @Scheduled(cron = "0 0 3 1 * *")
    @Transactional
    public void runMonthlyRecognition() {
        log.info("Starting monthly deferred revenue recognition job.");

        List<DeferredRevenueRecognitionLine> due = deferredRevenueScheduleService.findDuePeriods(LocalDate.now());
        for (DeferredRevenueRecognitionLine line : due) {
            DeferredRevenueSchedule schedule = deferredRevenueScheduleService.getSchedule(line.getScheduleId());
            financialEventService.onDeferredRevenueRecognized(line, schedule);
            log.info("Recognized deferred revenue line {} ({} period {}/{})",
                    line.getId(), schedule.getMemberName(), line.getPeriodNumber(), schedule.getTotalPeriods());
        }

        log.info("Completed monthly deferred revenue recognition job — {} lines recognized.", due.size());
    }
}
