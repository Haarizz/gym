package com.company.project.services;

import com.company.project.entities.DeferredRevenueRecognitionLine;
import com.company.project.entities.DeferredRevenueSchedule;
import com.company.project.entities.Receipt;
import com.company.project.repositories.DeferredRevenueRecognitionLineRepository;
import com.company.project.repositories.DeferredRevenueScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Amortization bookkeeping for deferred membership revenue — deliberately has
 * NO dependency on FinancialEventService (only FinancialEventService depends
 * on this, one-directional) so that it stays a pure schedule/ledger-of-record
 * and never itself decides to post a journal entry.
 *
 * Only "New"/"Renewal" receipts whose membership period spans more than one
 * calendar month qualify — a plain monthly payment keeps posting straight to
 * Membership Revenue exactly as before (see qualifiesForDeferral()).
 */
@Service
@Transactional
public class DeferredRevenueScheduleService {

    private static final Set<String> DEFERRABLE_TRANSACTION_TYPES = Set.of("New", "Renewal");

    private final DeferredRevenueScheduleRepository scheduleRepo;
    private final DeferredRevenueRecognitionLineRepository lineRepo;

    public DeferredRevenueScheduleService(DeferredRevenueScheduleRepository scheduleRepo,
                                           DeferredRevenueRecognitionLineRepository lineRepo) {
        this.scheduleRepo = scheduleRepo;
        this.lineRepo = lineRepo;
    }

    /**
     * True when this receipt's membership period should be deferred rather than
     * recognized immediately: a New/Renewal payment with a validFrom/validTill
     * span longer than one calendar month.
     */
    public boolean qualifiesForDeferral(Receipt receipt) {
        if (receipt == null) return false;
        if (receipt.getTransactionType() == null
                || !DEFERRABLE_TRANSACTION_TYPES.contains(receipt.getTransactionType())) return false;
        if (receipt.getValidFrom() == null || receipt.getValidTill() == null) return false;

        LocalDate from = receipt.getValidFrom().toLocalDate();
        LocalDate till = receipt.getValidTill().toLocalDate();
        return monthsBetween(from, till) > 1;
    }

    /**
     * Builds and persists the amortization schedule for a receipt already
     * confirmed (via qualifiesForDeferral) to need deferral, after the initial
     * DR Cash/Bank / CR Deferred Revenue journal entry has been posted.
     */
    public DeferredRevenueSchedule createSchedule(Receipt receipt, BigDecimal netAmount, Long sourceJvId) {
        LocalDate from = receipt.getValidFrom().toLocalDate();
        LocalDate till = receipt.getValidTill().toLocalDate();
        int months = monthsBetween(from, till);

        DeferredRevenueSchedule schedule = new DeferredRevenueSchedule();
        schedule.setReceiptId(receipt.getId());
        schedule.setMemberDbId(receipt.getMemberDbId());
        schedule.setMemberName(receipt.getMemberName());
        schedule.setPlanName(receipt.getPlanName());
        schedule.setTotalAmount(netAmount);
        schedule.setRecognizedAmount(BigDecimal.ZERO);
        schedule.setRemainingAmount(netAmount);
        schedule.setStartDate(from);
        schedule.setEndDate(till);
        schedule.setTotalPeriods(months);
        schedule.setStatus("ACTIVE");
        schedule.setSourceJournalVoucherId(sourceJvId);
        schedule = scheduleRepo.save(schedule);

        BigDecimal monthlyAmount = netAmount.divide(BigDecimal.valueOf(months), 2, RoundingMode.DOWN);
        BigDecimal allocated = BigDecimal.ZERO;

        List<DeferredRevenueRecognitionLine> lines = new ArrayList<>();
        for (int i = 1; i <= months; i++) {
            LocalDate periodStart = from.plusMonths(i - 1);
            LocalDate periodEnd = from.plusMonths(i);

            BigDecimal amount = (i < months)
                    ? monthlyAmount
                    : netAmount.subtract(allocated); // last period absorbs the rounding remainder
            allocated = allocated.add(amount);

            DeferredRevenueRecognitionLine line = new DeferredRevenueRecognitionLine();
            line.setScheduleId(schedule.getId());
            line.setPeriodNumber(i);
            line.setPeriodStart(periodStart);
            line.setPeriodEnd(periodEnd);
            line.setAmount(amount);
            line.setStatus("PENDING");
            lines.add(line);
        }
        lineRepo.saveAll(lines);

        return schedule;
    }

    /** PENDING recognition lines whose period has already elapsed as of the given date. */
    public List<DeferredRevenueRecognitionLine> findDuePeriods(LocalDate asOf) {
        return lineRepo.findByStatusAndPeriodEndLessThanEqual("PENDING", asOf);
    }

    public DeferredRevenueSchedule getSchedule(Long scheduleId) {
        return scheduleRepo.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("DeferredRevenueSchedule not found: " + scheduleId));
    }

    /** Marks a recognition line POSTED and rolls its amount into the parent schedule's totals. */
    public void markRecognized(DeferredRevenueRecognitionLine line, Long journalVoucherId) {
        line.setStatus("POSTED");
        line.setRecognizedJournalVoucherId(journalVoucherId);
        line.setRecognizedAt(LocalDateTime.now());
        lineRepo.save(line);

        DeferredRevenueSchedule schedule = getSchedule(line.getScheduleId());
        BigDecimal recognized = schedule.getRecognizedAmount().add(line.getAmount());
        BigDecimal remaining = schedule.getTotalAmount().subtract(recognized);
        schedule.setRecognizedAmount(recognized);
        schedule.setRemainingAmount(remaining);
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            schedule.setStatus("COMPLETED");
        }
        scheduleRepo.save(schedule);
    }

    public List<DeferredRevenueSchedule> findActiveSchedules() {
        return scheduleRepo.findByStatusOrderByStartDateDesc("ACTIVE");
    }

    private static int monthsBetween(LocalDate from, LocalDate till) {
        return (int) Math.max(1, ChronoUnit.MONTHS.between(from, till));
    }
}
