package com.company.project.services;

import com.company.project.dto.AttendanceReportSettingsDTO;
import com.company.project.dto.AttendanceStatsDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Weekly attendance report email — makes the "Schedule Automated Reports"
 * toggle on the Attendance Reports page (previously pure client-side React
 * state that reset on every reload and sent nothing) actually do something.
 */
@Service
public class AttendanceReportScheduler {

    private static final Logger log = LoggerFactory.getLogger(AttendanceReportScheduler.class);

    private final AttendanceService attendanceService;
    private final EmailService emailService;

    public AttendanceReportScheduler(AttendanceService attendanceService, EmailService emailService) {
        this.attendanceService = attendanceService;
        this.emailService = emailService;
    }

    /** Runs at 07:00 every Monday. */
    @Scheduled(cron = "0 0 7 * * MON")
    public void sendWeeklyReport() {
        AttendanceReportSettingsDTO settings = attendanceService.getReportSettings();
        if (!Boolean.TRUE.equals(settings.getEnabled()) || !StringUtils.hasText(settings.getRecipientEmail())) {
            return;
        }
        if (!emailService.isConfigured()) {
            log.warn("Skipped weekly attendance report — SMTP is not configured.");
            return;
        }

        AttendanceStatsDTO stats = attendanceService.getStats();
        String html = "<h2>Weekly Attendance Summary</h2>"
                + "<p>Today's visits: <b>" + stats.getTodayVisits() + "</b></p>"
                + "<p>Currently active: <b>" + stats.getActiveNow() + "</b></p>"
                + "<p>Average visit duration: <b>" + Math.round(stats.getAvgDurationMinutes()) + " min</b></p>"
                + "<p>Peak hour: <b>" + stats.getPeakHour() + "</b></p>"
                + "<p>Attendance rate (of active members): <b>" + stats.getAttendanceRate() + "%</b></p>"
                + "<p>Total active members: <b>" + stats.getTotalActiveMembers() + "</b></p>";

        try {
            emailService.sendEmail(settings.getRecipientEmail(), "Weekly Attendance Report", html);
        } catch (Exception ex) {
            log.error("Failed to send weekly attendance report to {}", settings.getRecipientEmail(), ex);
        }
    }
}
