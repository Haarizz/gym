package com.company.project.performance.events;

import com.company.project.entities.TrainingPackage;
import com.company.project.performance.metric.Metric;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * Pure: what one training package enrolment is credited with
 * (docs/training-packages-commission-plan.md §6).
 *
 *  - PT_SALE: 1 package and the money received, on the sale date, to the trainer it was
 *    sold with. Nothing while the payment awaits approval, or once the package is cancelled.
 *  - PT_REVENUE, commission on enrolment: all the money received, on the sale date.
 *  - PT_REVENUE, commission on completion:
 *      session-based: money ÷ sessions for each used session, at the session, to the trainer who
 *        ran it; with "pay at expiry", the unused sessions' share on the last day.
 *      day-based: money ÷ days for every day, one credit per month (and per trainer), dated at the
 *        first day it covers.
 *    A cancelled package keeps what it earned up to the cancel day.
 *
 * Shares use cumulative rounding — share k = round(money·k/n) − round(money·(k−1)/n) — so they
 * always add up to exactly the money received.
 */
public final class PackageEarnings {

    private PackageEarnings() {}

    public record TrainerChange(LocalDate effectiveDate, Long fromTrainerId, Long toTrainerId) {}

    /** A booking that used one of the package's sessions. */
    public record UsedSession(Long bookingId, LocalDate date, LocalTime startTime, Long trainerId) {}

    public record Enrolment(Long branchId, String planType, String commissionTiming, String unusedAtExpiry,
                            Integer sessionsTotal, int validityDays, LocalDate startDate, LocalDate endDate,
                            Long currentTrainerId, List<TrainerChange> trainerChanges,
                            LocalDateTime saleAtUtc, BigDecimal moneyReceived,
                            /* local day it was cancelled on, null while not cancelled */ LocalDate cancelledOn) {}

    /**
     * @param used   sessions used, oldest first
     * @param toUtc  gym local time → UTC
     */
    public static List<Credit> credits(Enrolment e, List<UsedSession> used, Function<LocalDateTime, LocalDateTime> toUtc) {
        List<Credit> out = new ArrayList<>();
        BigDecimal money = e.moneyReceived() != null ? e.moneyReceived().setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        if (money.signum() <= 0) return out;
        boolean cancelled = e.cancelledOn() != null;
        Long seller = trainerOn(e, e.startDate());

        if (!cancelled) {
            out.add(new Credit(Metric.PT_SALE, seller, e.branchId(), e.saleAtUtc(), 1, money));
        }

        if (!TrainingPackage.TIMING_COMPLETION.equals(e.commissionTiming())) {
            if (!cancelled) out.add(new Credit(Metric.PT_REVENUE, seller, e.branchId(), e.saleAtUtc(), 0, money));
            return out;
        }

        if (TrainingPackage.TYPE_SESSIONS.equals(e.planType())) {
            int total = e.sessionsTotal() != null ? e.sessionsTotal() : 0;
            if (total <= 0) return out;
            int k = 0;
            for (UsedSession s : used) {
                if (k >= total) break;
                if (cancelled && s.date() != null && s.date().isAfter(e.cancelledOn())) continue;
                k++;
                BigDecimal share = cumulative(money, k, total).subtract(cumulative(money, k - 1, total));
                LocalDate day = s.date() != null ? s.date() : e.startDate();
                Long trainer = s.trainerId() != null ? s.trainerId() : trainerOn(e, day);
                LocalTime at = s.startTime() != null ? s.startTime() : LocalTime.MIDNIGHT;
                add(out, new Credit(Metric.PT_REVENUE, trainer, e.branchId(), toUtc.apply(day.atTime(at)), 0, share,
                        "b:" + s.bookingId()));
            }
            if (!cancelled && k < total && TrainingPackage.UNUSED_PAY_AT_EXPIRY.equals(e.unusedAtExpiry())) {
                BigDecimal rest = money.subtract(cumulative(money, k, total));
                add(out, new Credit(Metric.PT_REVENUE, trainerOn(e, e.endDate()), e.branchId(),
                        toUtc.apply(e.endDate().atTime(23, 59)), 0, rest, "expiry"));
            }
            return out;
        }

        // Day-based: one share per day, grouped by month and trainer.
        int days = e.validityDays();
        if (days <= 0) return out;
        LocalDate last = e.endDate();
        if (cancelled && e.cancelledOn().isBefore(last)) last = e.cancelledOn();
        LocalDate segStart = e.startDate();
        while (!segStart.isAfter(last)) {
            Long trainer = trainerOn(e, segStart);
            LocalDate segEnd = YearMonth.from(segStart).atEndOfMonth();
            if (segEnd.isAfter(last)) segEnd = last;
            LocalDate nextChange = nextChangeAfter(e, segStart);
            if (nextChange != null && !nextChange.isAfter(segEnd)) segEnd = nextChange.minusDays(1);
            long from = ChronoUnit.DAYS.between(e.startDate(), segStart);      // days before the segment
            long to = ChronoUnit.DAYS.between(e.startDate(), segEnd) + 1;      // days up to its end
            from = Math.min(from, days);
            to = Math.min(to, days);
            BigDecimal share = cumulative(money, (int) to, days).subtract(cumulative(money, (int) from, days));
            add(out, new Credit(Metric.PT_REVENUE, trainer, e.branchId(), toUtc.apply(segStart.atStartOfDay()), 0, share,
                    "d:" + YearMonth.from(segStart)));
            segStart = segEnd.plusDays(1);
        }
        return out;
    }

    /** The trainer in charge on {@code day}. */
    static Long trainerOn(Enrolment e, LocalDate day) {
        List<TrainerChange> changes = e.trainerChanges() != null ? e.trainerChanges() : List.of();
        Long trainer = changes.isEmpty() ? e.currentTrainerId() : changes.get(0).fromTrainerId();
        for (TrainerChange c : changes) {
            if (!c.effectiveDate().isAfter(day)) trainer = c.toTrainerId();
        }
        return trainer;
    }

    private static LocalDate nextChangeAfter(Enrolment e, LocalDate day) {
        if (e.trainerChanges() == null) return null;
        for (TrainerChange c : e.trainerChanges()) {
            if (c.effectiveDate().isAfter(day)) return c.effectiveDate();
        }
        return null;
    }

    private static BigDecimal cumulative(BigDecimal money, int k, int n) {
        if (k <= 0) return BigDecimal.ZERO.setScale(2);
        if (k >= n) return money;
        return money.multiply(BigDecimal.valueOf(k)).divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_UP);
    }

    private static void add(List<Credit> out, Credit c) {
        if (c.amount() != null && c.amount().signum() != 0) out.add(c);
    }
}
