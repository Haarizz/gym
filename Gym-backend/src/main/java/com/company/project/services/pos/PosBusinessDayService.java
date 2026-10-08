package com.company.project.services.pos;

import com.company.project.entities.PosSettings;
import com.company.project.repositories.PosSettingsRepository;
import com.company.project.security.BranchContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * The POS business day (BillBull's Business Day Window). Without a window the trading date is
 * simply the calendar date in the branch time zone and nothing is ever blocked. With one:
 * <ul>
 *   <li>ACTIVE — between the start time and the scheduled end: normal trading.</li>
 *   <li>EXTENSION — after the scheduled end, within the grace minutes: still trading on the same
 *       date, the till warns that closure is near.</li>
 *   <li>CLOSED — after the extension, until the next start: no new sessions and no selling;
 *       closing sessions, Day Close and reports stay available. The trading date is still the
 *       day that just ended.</li>
 * </ul>
 * An end time earlier than the start runs past midnight (e.g. 06:00–01:00).
 */
@Service
@Transactional(readOnly = true)
public class PosBusinessDayService {

    public enum Phase { UNRESTRICTED, ACTIVE, EXTENSION, CLOSED }

    /** Times are UTC wall-clock (the API's convention); `zone` is what they were computed in. */
    public record Window(ZoneId zone, LocalDate tradingDate, Phase phase,
                         LocalDateTime start, LocalDateTime scheduledEnd, LocalDateTime closesAt, LocalDateTime nextStart) {
        public boolean closed() { return phase == Phase.CLOSED; }
    }

    private final PosSettingsRepository settingsRepo;

    public PosBusinessDayService(PosSettingsRepository settingsRepo) {
        this.settingsRepo = settingsRepo;
    }

    public Window window() {
        return window(settings(), Instant.now());
    }

    public LocalDate tradingDate() {
        return window().tradingDate();
    }

    public ZoneId zone() {
        return zone(settings());
    }

    private PosSettings settings() {
        Long branchId = BranchContextHolder.getActiveBranchId();
        if (branchId == null) return new PosSettings();
        return settingsRepo.findFirstByBranchId(branchId).orElseGet(PosSettings::new);
    }

    /**
     * The branch time zone; when none is set, the till's own zone (X-Client-Timezone, sent with every
     * POS request) — business hours are entered as the gym's local time, never the server's (UTC).
     */
    static ZoneId zone(PosSettings s) {
        if (s != null && s.getTimeZone() != null && !s.getTimeZone().isBlank()) {
            try {
                return ZoneId.of(s.getTimeZone().trim());
            } catch (DateTimeException ignored) {
                // fall through to the till's zone
            }
        }
        ZoneId client = clientZone();
        return client != null ? client : ZoneOffset.UTC;
    }

    /** The calling till's time zone, or null outside a request / when it sent none. */
    static ZoneId clientZone() {
        if (org.springframework.web.context.request.RequestContextHolder.getRequestAttributes()
                instanceof org.springframework.web.context.request.ServletRequestAttributes attrs) {
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

    /** Pure: the window `settings` describe at instant `now`. */
    static Window window(PosSettings s, Instant now) {
        ZoneId zone = zone(s);
        LocalDateTime local = LocalDateTime.ofInstant(now, zone);
        LocalTime start = time(s == null ? null : s.getBusinessDayStart());
        LocalTime end = time(s == null ? null : s.getBusinessDayEnd());
        if (s == null || !Boolean.TRUE.equals(s.getBusinessDayEnabled()) || start == null || end == null || start.equals(end)) {
            return new Window(zone, local.toLocalDate(), Phase.UNRESTRICTED, null, null, null, null);
        }
        int extension = s.getBusinessDayExtensionMinutes() == null ? 0 : Math.max(0, s.getBusinessDayExtensionMinutes());

        // The window a moment belongs to opens on `day` at the start time.
        LocalDate day = local.toLocalTime().isBefore(start) ? local.toLocalDate().minusDays(1) : local.toLocalDate();
        LocalDateTime open = day.atTime(start);
        LocalDateTime scheduledEnd = end.isAfter(start) ? day.atTime(end) : day.plusDays(1).atTime(end);
        LocalDateTime closesAt = scheduledEnd.plusMinutes(extension);
        LocalDateTime nextStart = day.plusDays(1).atTime(start);

        Phase phase = local.isBefore(scheduledEnd) ? Phase.ACTIVE
                : local.isBefore(closesAt) ? Phase.EXTENSION
                : Phase.CLOSED;
        return new Window(zone, day, phase, utc(open, zone), utc(scheduledEnd, zone), utc(closesAt, zone), utc(nextStart, zone));
    }

    private static LocalTime time(String hhmm) {
        if (hhmm == null || hhmm.isBlank()) return null;
        try {
            return LocalTime.parse(hhmm.trim().length() == 4 ? "0" + hhmm.trim() : hhmm.trim());
        } catch (DateTimeException e) {
            return null;
        }
    }

    private static LocalDateTime utc(LocalDateTime local, ZoneId zone) {
        return local.atZone(zone).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
    }

    /** "HH:mm" of a UTC wall-clock time in the window's zone — for messages. */
    static String localTime(LocalDateTime utc, ZoneId zone) {
        if (utc == null) return "";
        return utc.atZone(ZoneOffset.UTC).withZoneSameInstant(zone).toLocalTime().toString().substring(0, 5);
    }
}
