package com.company.project.services.facedevice;

import com.company.project.entities.FaceDevice;
import com.company.project.entities.FaceDeviceMember;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.FaceDeviceRepository;
import com.company.project.services.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.function.Predicate;
import java.util.regex.Pattern;

/**
 * End-of-day email report for a face device: today's enrolments and removals, members the
 * device rejected, active members without a photo, and whether the device was offline.
 * Sent nightly at face-device.report.time (default 23:30) gym time by FaceDeviceScheduler, or on demand.
 */
@Service
public class FaceDeviceReportService {

    private static final Logger log = LoggerFactory.getLogger(FaceDeviceReportService.class);

    /** Gym-local time the nightly report goes out. */
    private final LocalTime reportTime;
    private static final int MAX_ROWS = 300;
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s,;]+@[^@\\s,;]+\\.[^@\\s,;]+$");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("d MMM, h:mm a", Locale.ENGLISH);

    private final FaceDeviceRepository deviceRepository;
    private final FaceDeviceSyncService syncService;
    private final BranchRepository branchRepository;
    private final EmailService emailService;

    public FaceDeviceReportService(FaceDeviceRepository deviceRepository,
                                   FaceDeviceSyncService syncService,
                                   BranchRepository branchRepository,
                                   EmailService emailService,
                                   @org.springframework.beans.factory.annotation.Value("${face-device.report.time:23:30}") String reportTime) {
        this.deviceRepository = deviceRepository;
        this.syncService = syncService;
        this.branchRepository = branchRepository;
        this.emailService = emailService;
        this.reportTime = LocalTime.parse(reportTime.trim());
    }

    /** Gym-local time the nightly report goes out. */
    public LocalTime reportTime() {
        return reportTime;
    }

    /** Cleans a comma/semicolon/space separated address list; null when empty. Throws on a bad address. */
    public static String normaliseEmails(String raw) {
        if (raw == null || raw.isBlank()) return null;
        List<String> out = new ArrayList<>();
        for (String part : raw.split("[,;\\s]+")) {
            String e = part.trim();
            if (e.isEmpty()) continue;
            if (!EMAIL.matcher(e).matches()) throw new IllegalArgumentException("Not a valid email address: " + e);
            if (out.stream().noneMatch(e::equalsIgnoreCase)) out.add(e);
        }
        if (out.size() > 10) throw new IllegalArgumentException("Up to 10 report email addresses");
        return out.isEmpty() ? null : String.join(", ", out);
    }

    public boolean mailConfigured() {
        return emailService.isConfigured();
    }

    /** Nightly run for the current database: devices whose report time has passed and that haven't had today's report. */
    public void sendDueReports() {
        for (FaceDevice d : deviceRepository.findByEnabledTrueAndReportEmailsIsNotNull()) {
            ZonedDateTime now = ZonedDateTime.now(FaceDeviceSyncService.zone(d));
            LocalDate today = now.toLocalDate();
            if (now.toLocalTime().isBefore(reportTime) || today.equals(d.getLastReportDate())) continue;
            // Mark the day first: a mail failure is recorded on the device, not retried every 5 minutes.
            deviceRepository.recordReportDay(d.getId(), today);
            try {
                send(d, today);
            } catch (Exception e) {
                log.warn("Face device {} daily report failed: {}", d.getId(), e.getMessage());
            }
        }
    }

    /** Builds and emails the report for {@code day} to every address on the device. Returns a short summary. */
    public String send(FaceDevice d, LocalDate day) {
        LocalDateTime at = LocalDateTime.now();
        if (d.getReportEmails() == null || d.getReportEmails().isBlank()) {
            throw new IllegalArgumentException("Add a report email address to this device first.");
        }
        if (!emailService.isConfigured()) {
            String msg = "Email is not set up on this server (SMTP_HOST / MESSAGE_EMAIL_FROM).";
            deviceRepository.recordReport(d.getId(), at, msg);
            throw new IllegalStateException(msg);
        }
        Report r = build(d, day);
        List<String> sent = new ArrayList<>();
        List<String> failed = new ArrayList<>();
        for (String to : d.getReportEmails().split(",\\s*")) {
            try {
                emailService.sendEmail(to.trim(), r.subject(), r.html());
                sent.add(to.trim());
            } catch (Exception e) {
                failed.add(to.trim() + " (" + e.getMessage() + ")");
            }
        }
        String msg = failed.isEmpty()
                ? "Report for " + day + " sent to " + String.join(", ", sent) + "."
                : "Report for " + day + ": sent to " + (sent.isEmpty() ? "nobody" : String.join(", ", sent))
                  + "; failed for " + String.join("; ", failed) + ".";
        deviceRepository.recordReport(d.getId(), at, msg);
        if (sent.isEmpty()) throw new IllegalStateException(msg);
        return msg;
    }

    record Report(String subject, String html) {}

    Report build(FaceDevice d, LocalDate day) {
        ZoneId zone = FaceDeviceSyncService.zone(d);
        // Stored times are server-local LocalDateTime = UTC.
        LocalDateTime from = day.atStartOfDay(zone).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
        LocalDateTime to = day.plusDays(1).atStartOfDay(zone).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
        Predicate<LocalDateTime> isToday = t -> t != null && !t.isBefore(from) && t.isBefore(to);

        FaceDeviceSyncService.Plan plan = syncService.plan(d);
        List<Line> enrolledToday = new ArrayList<>();
        List<Line> removedToday = new ArrayList<>();
        List<Line> failed = new ArrayList<>();
        List<Line> retrying = new ArrayList<>();
        List<Line> noPhoto = new ArrayList<>();
        int enrolledTotal = 0, removedTotal = 0;
        for (FaceDeviceMember m : plan.existing().values()) {
            FaceDeviceMemberRow row = plan.rows().get(m.getMemberId());
            if (row == null) continue;
            Line line = new Line(row.name(), m.getPersonSn(), row.effectiveStatus(), m.getLastMessage(), m.getLastAttemptAt());
            switch (m.getState()) {
                case FaceDeviceMember.ENROLLED -> {
                    enrolledTotal++;
                    if (isToday.test(m.getLastSuccessAt())) enrolledToday.add(line);
                }
                case FaceDeviceMember.REMOVED -> {
                    removedTotal++;
                    if (isToday.test(m.getLastSuccessAt())) removedToday.add(line);
                }
                case FaceDeviceMember.FAILED -> failed.add(line);
                case FaceDeviceMember.RETRY -> retrying.add(line);
                case FaceDeviceMember.NO_PHOTO -> { if (row.allowedIn()) noPhoto.add(line); }
                default -> { }
            }
        }
        int allowed = (int) plan.rows().values().stream().filter(FaceDeviceMemberRow::allowedIn).count();
        int waiting = plan.push().size() + plan.orphans().size();
        long failedToday = failed.stream().filter(l -> isToday.test(l.at())).count();

        String branch = branchRepository.findById(d.getBranchId()).map(b -> b.getBranchName()).orElse("Branch " + d.getBranchId());
        boolean problem = d.getOfflineSince() != null || !failed.isEmpty() || !retrying.isEmpty();
        String subject = (problem ? "⚠ " : "✓ ") + "Face device report — " + d.getName() + " (" + branch + ") — "
                + day.format(DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH));

        StringBuilder h = new StringBuilder();
        h.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:760px;margin:0 auto\">");
        h.append("<h2 style=\"margin:0 0 4px;color:#0f172a\">Face device daily report</h2>");
        h.append("<div style=\"color:#64748b;font-size:14px;margin-bottom:16px\">")
                .append(esc(d.getName())).append(" · ").append(esc(branch)).append(" · ").append(day.format(DAY))
                .append("</div>");

        // Device status
        h.append(section("Device status"));
        h.append("<table style=\"border-collapse:collapse;font-size:14px;width:100%\">");
        h.append(kv("Right now", d.getOfflineSince() != null
                ? red("Offline / not answering since " + local(d.getOfflineSince(), zone, day))
                : green("Online")));
        if (d.getLastOutageStart() != null && (isToday.test(d.getLastOutageStart()) || isToday.test(d.getLastOutageEnd()))) {
            h.append(kv("Outage today", local(d.getLastOutageStart(), zone, day) + " – " + local(d.getLastOutageEnd(), zone, day)));
        }
        h.append(kv("Last connection test", d.getLastTestAt() == null ? "Never"
                : local(d.getLastTestAt(), zone, day) + " — " + esc(nz(d.getLastTestMessage()))));
        h.append(kv("Last sync", d.getLastSyncAt() == null ? "Never"
                : local(d.getLastSyncAt(), zone, day) + " — " + esc(nz(d.getLastSyncMessage()))));
        h.append(kv("Automatic sync", d.isAutoSync() ? "On (every minute)" : red("Off — changes reach the device only when someone presses Sync")));
        h.append("</table>");

        // Numbers
        h.append(section("Today"));
        h.append("<table style=\"border-collapse:separate;border-spacing:8px 0;margin-left:-8px\"><tr>")
                .append(tile("Enrolled / updated", enrolledToday.size(), "#15803d"))
                .append(tile("Removed", removedToday.size(), "#64748b"))
                .append(tile("Rejected", (int) failedToday, "#dc2626"))
                .append(tile("Waiting to sync", waiting, "#2563eb"))
                .append("</tr></table>");
        h.append(section("On the device now"));
        h.append("<table style=\"border-collapse:separate;border-spacing:8px 0;margin-left:-8px\"><tr>")
                .append(tile("Active members", allowed, "#0f766e"))
                .append(tile("Enrolled", enrolledTotal, "#15803d"))
                .append(tile("No photo", noPhoto.size(), "#b45309"))
                .append(tile("Rejected", failed.size(), "#dc2626"))
                .append(tile("Removed", removedTotal, "#64748b"))
                .append("</tr></table>");

        h.append(list("Needs attention — photo rejected by the device",
                "Fix the member's photo (clear, front-facing, well lit), then press Sync on the member or Retry failed.",
                failed, true, zone, day));
        h.append(list("Retrying — device was not answering", null, retrying, true, zone, day));
        h.append(list("Active members without a photo",
                "They are on the device but can't be recognised until a photo is added to their profile.",
                noPhoto, false, zone, day));
        h.append(list("Enrolled or updated today", null, enrolledToday, false, zone, day));
        h.append(list("Removed today (no longer allowed in)", null, removedToday, false, zone, day));

        h.append("<p style=\"color:#94a3b8;font-size:12px;margin-top:24px\">Sent by GymBios · GymOS › Face Device Configuration. ")
                .append("Change the recipients in the device settings.</p></div>");
        return new Report(subject, h.toString());
    }

    record Line(String name, String sn, String status, String message, LocalDateTime at) {}

    private String list(String title, String note, List<Line> lines, boolean withReason, ZoneId zone, LocalDate day) {
        StringBuilder s = new StringBuilder(section(title + " (" + lines.size() + ")"));
        if (note != null && !lines.isEmpty()) s.append("<div style=\"color:#64748b;font-size:13px;margin-bottom:6px\">").append(esc(note)).append("</div>");
        if (lines.isEmpty()) return s.append("<div style=\"color:#94a3b8;font-size:13px\">None</div>").toString();
        lines.sort(Comparator.comparing((Line l) -> nz(l.name()), String.CASE_INSENSITIVE_ORDER));
        s.append("<table style=\"border-collapse:collapse;width:100%;font-size:13px\"><tr style=\"background:#f1f5f9;text-align:left\">")
                .append(th("Member")).append(th("ID")).append(th("Membership"));
        if (withReason) s.append(th("Device said")).append(th("Last try"));
        s.append("</tr>");
        for (Line l : lines.subList(0, Math.min(lines.size(), MAX_ROWS))) {
            s.append("<tr>").append(td(esc(nz(l.name())))).append(td("<span style=\"font-family:monospace\">" + esc(l.sn()) + "</span>"))
                    .append(td(esc(nz(l.status()).replace('_', ' '))));
            if (withReason) s.append(td(esc(nz(l.message())))).append(td(local(l.at(), zone, day)));
            s.append("</tr>");
        }
        s.append("</table>");
        if (lines.size() > MAX_ROWS) {
            s.append("<div style=\"color:#64748b;font-size:12px\">…and ").append(lines.size() - MAX_ROWS)
                    .append(" more — see GymOS › Face Device Configuration.</div>");
        }
        return s.toString();
    }

    private static String local(LocalDateTime utc, ZoneId zone, LocalDate day) {
        if (utc == null) return "—";
        ZonedDateTime z = utc.atOffset(ZoneOffset.UTC).atZoneSameInstant(zone);
        return z.toLocalDate().equals(day) ? z.format(TIME) : z.format(DATE_TIME);
    }

    private static String section(String title) {
        return "<h3 style=\"margin:20px 0 8px;font-size:15px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px\">"
                + esc(title) + "</h3>";
    }

    private static String kv(String k, String v) {
        return "<tr><td style=\"padding:4px 12px 4px 0;color:#64748b;white-space:nowrap;vertical-align:top\">" + esc(k)
                + "</td><td style=\"padding:4px 0\">" + v + "</td></tr>";
    }

    private static String tile(String label, int value, String color) {
        return "<td style=\"background:#f8fafc;border-radius:8px;padding:10px 14px;min-width:110px\">"
                + "<div style=\"font-size:22px;font-weight:bold;color:" + color + "\">" + value + "</div>"
                + "<div style=\"font-size:12px;color:#475569\">" + esc(label) + "</div></td>";
    }

    private static String th(String s) { return "<th style=\"padding:6px 8px;font-weight:600;color:#475569\">" + s + "</th>"; }
    private static String td(String s) { return "<td style=\"padding:6px 8px;border-top:1px solid #e2e8f0;vertical-align:top\">" + s + "</td>"; }
    private static String red(String s) { return "<span style=\"color:#dc2626;font-weight:600\">" + esc(s) + "</span>"; }
    private static String green(String s) { return "<span style=\"color:#15803d;font-weight:600\">" + esc(s) + "</span>"; }
    private static String nz(String s) { return s == null ? "" : s; }

    private static String esc(String s) {
        if (s == null) return "";
        StringBuilder b = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            switch (c) {
                case '<' -> b.append("&lt;");
                case '>' -> b.append("&gt;");
                case '&' -> b.append("&amp;");
                case '"' -> b.append("&quot;");
                default -> b.append(c);
            }
        }
        return b.toString();
    }
}
