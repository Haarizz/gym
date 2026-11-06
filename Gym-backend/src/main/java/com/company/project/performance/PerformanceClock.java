package com.company.project.performance;

import com.company.project.entities.PosSettings;
import com.company.project.repositories.PosSettingsRepository;
import com.company.project.security.BranchContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.*;

/**
 * Month boundaries in the gym's local time, not the server's (plan §7). Timestamps are stored
 * as UTC LocalDateTimes (the JVM runs in UTC), so a local month becomes a UTC [start, end)
 * window here. The zone is the branch's POS time zone, else the caller's X-Client-Timezone,
 * else UTC.
 */
@Component
public class PerformanceClock {

    private final PosSettingsRepository posSettingsRepository;

    public PerformanceClock(PosSettingsRepository posSettingsRepository) {
        this.posSettingsRepository = posSettingsRepository;
    }

    public ZoneId zone(Long branchId) {
        Long id = branchId != null ? branchId : BranchContextHolder.getActiveBranchId();
        if (id != null) {
            try {
                String tz = posSettingsRepository.findFirstByBranchId(id).map(PosSettings::getTimeZone).orElse(null);
                if (tz != null && !tz.isBlank()) return ZoneId.of(tz.trim());
            } catch (RuntimeException ignored) {
                // unknown zone id or no settings table: fall through
            }
        }
        ZoneId client = clientZone();
        return client != null ? client : ZoneOffset.UTC;
    }

    /** The current month in the gym's zone. */
    public YearMonth currentMonth(Long branchId) {
        return YearMonth.from(LocalDate.now(zone(branchId)));
    }

    /** [start, end) of the month in UTC. */
    public Window window(YearMonth month, Long branchId) {
        ZoneId zone = zone(branchId);
        return new Window(toUtc(month.atDay(1).atStartOfDay(), zone), toUtc(month.plusMonths(1).atDay(1).atStartOfDay(), zone));
    }

    /** A local wall-clock time in the branch's zone, as the UTC LocalDateTime the database stores. */
    public LocalDateTime toUtc(LocalDateTime local, Long branchId) {
        return toUtc(local, zone(branchId));
    }

    public YearMonth monthOf(LocalDateTime utc, Long branchId) {
        return YearMonth.from(utc.atOffset(ZoneOffset.UTC).atZoneSameInstant(zone(branchId)));
    }

    public static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    static LocalDateTime toUtc(LocalDateTime local, ZoneId zone) {
        return local.atZone(zone).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
    }

    private static ZoneId clientZone() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            String tz = attrs.getRequest().getHeader("X-Client-Timezone");
            if (tz != null && !tz.isBlank()) {
                try {
                    return ZoneId.of(tz.trim());
                } catch (DateTimeException ignored) {
                    // unknown zone id
                }
            }
        }
        return null;
    }

    public record Window(LocalDateTime start, LocalDateTime end) {
        /** The window cut off at now: future-dated events (sessions booked later this month) don't count yet. */
        public Window upToNow() {
            LocalDateTime now = nowUtc();
            return end.isAfter(now) ? new Window(start, now.isBefore(start) ? start : now) : this;
        }
    }
}
