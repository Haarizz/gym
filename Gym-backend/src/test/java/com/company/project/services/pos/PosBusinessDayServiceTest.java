package com.company.project.services.pos;

import com.company.project.entities.PosSettings;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;

class PosBusinessDayServiceTest {

    private static final ZoneId DUBAI = ZoneId.of("Asia/Dubai");

    private static PosSettings settings(boolean enabled, String start, String end, int extension) {
        PosSettings s = new PosSettings();
        s.setTimeZone("Asia/Dubai");
        s.setBusinessDayEnabled(enabled);
        s.setBusinessDayStart(start);
        s.setBusinessDayEnd(end);
        s.setBusinessDayExtensionMinutes(extension);
        return s;
    }

    private static Instant dubai(int y, int m, int d, int h, int min) {
        return ZonedDateTime.of(y, m, d, h, min, 0, 0, DUBAI).toInstant();
    }

    @Test
    void withoutWindowTheTradingDateIsTheLocalCalendarDate() {
        // 01:30 in Dubai is still the previous day in UTC — the trading date must follow Dubai.
        PosBusinessDayService.Window w = PosBusinessDayService.window(settings(false, null, null, 0), dubai(2026, 10, 7, 1, 30));
        assertEquals(PosBusinessDayService.Phase.UNRESTRICTED, w.phase());
        assertEquals(LocalDate.of(2026, 10, 7), w.tradingDate());
        assertFalse(w.closed());
    }

    @Test
    void sameDayWindowPhases() {
        PosSettings s = settings(true, "06:00", "23:00", 30);
        assertEquals(PosBusinessDayService.Phase.ACTIVE, PosBusinessDayService.window(s, dubai(2026, 10, 7, 12, 0)).phase());
        PosBusinessDayService.Window ext = PosBusinessDayService.window(s, dubai(2026, 10, 7, 23, 10));
        assertEquals(PosBusinessDayService.Phase.EXTENSION, ext.phase());
        assertEquals(LocalDate.of(2026, 10, 7), ext.tradingDate());
        PosBusinessDayService.Window closed = PosBusinessDayService.window(s, dubai(2026, 10, 7, 23, 45));
        assertEquals(PosBusinessDayService.Phase.CLOSED, closed.phase());
        assertEquals("23:30", PosBusinessDayService.localTime(closed.closesAt(), DUBAI));
        assertEquals("06:00", PosBusinessDayService.localTime(closed.nextStart(), DUBAI));
        // Early morning before opening: still the closed window of the previous day.
        PosBusinessDayService.Window early = PosBusinessDayService.window(s, dubai(2026, 10, 8, 5, 0));
        assertEquals(PosBusinessDayService.Phase.CLOSED, early.phase());
        assertEquals(LocalDate.of(2026, 10, 7), early.tradingDate());
        assertEquals(LocalDate.of(2026, 10, 8), PosBusinessDayService.window(s, dubai(2026, 10, 8, 6, 0)).tradingDate());
    }

    @Test
    void overnightWindowKeepsTheTradingDateAfterMidnight() {
        PosSettings s = settings(true, "06:00", "02:00", 0);
        PosBusinessDayService.Window lateNight = PosBusinessDayService.window(s, dubai(2026, 10, 8, 1, 15));
        assertEquals(PosBusinessDayService.Phase.ACTIVE, lateNight.phase());
        assertEquals(LocalDate.of(2026, 10, 7), lateNight.tradingDate());
        PosBusinessDayService.Window after = PosBusinessDayService.window(s, dubai(2026, 10, 8, 3, 0));
        assertEquals(PosBusinessDayService.Phase.CLOSED, after.phase());
        assertEquals(LocalDate.of(2026, 10, 7), after.tradingDate());
    }

    @Test
    void equalStartAndEndMeansTwentyFourHourTrading() {
        PosBusinessDayService.Window w = PosBusinessDayService.window(settings(true, "06:00", "06:00", 0), dubai(2026, 10, 7, 3, 0));
        assertEquals(PosBusinessDayService.Phase.UNRESTRICTED, w.phase());
    }

    @Test
    void badZoneFallsBackToUtc() {
        PosSettings s = settings(false, null, null, 0);
        s.setTimeZone("Not/AZone");
        assertEquals("Z", PosBusinessDayService.zone(s).getId());
    }

    @Test
    void withoutABranchZoneTheTillsZoneIsUsed() {
        // The reported case: 13:33-16:35 entered as India time, no branch zone saved, till at 16:36 IST.
        org.springframework.mock.web.MockHttpServletRequest req = new org.springframework.mock.web.MockHttpServletRequest();
        req.addHeader("X-Client-Timezone", "Asia/Calcutta");
        org.springframework.web.context.request.RequestContextHolder.setRequestAttributes(
                new org.springframework.web.context.request.ServletRequestAttributes(req));
        try {
            PosSettings s = settings(true, "13:33", "16:35", 0);
            s.setTimeZone(null);
            Instant now = ZonedDateTime.of(2026, 10, 7, 16, 36, 0, 0, ZoneId.of("Asia/Kolkata")).toInstant();
            PosBusinessDayService.Window w = PosBusinessDayService.window(s, now);
            assertEquals("Asia/Calcutta", w.zone().getId());
            assertEquals(LocalDate.of(2026, 10, 7), w.tradingDate());
            assertEquals(PosBusinessDayService.Phase.CLOSED, w.phase());
            // closes at 16:35 IST = 11:05 UTC; reopens tomorrow 13:33 IST = 08:03 UTC
            assertEquals(java.time.LocalDateTime.of(2026, 10, 7, 11, 5), w.closesAt());
            assertEquals(java.time.LocalDateTime.of(2026, 10, 8, 8, 3), w.nextStart());
        } finally {
            org.springframework.web.context.request.RequestContextHolder.resetRequestAttributes();
        }
    }
}
