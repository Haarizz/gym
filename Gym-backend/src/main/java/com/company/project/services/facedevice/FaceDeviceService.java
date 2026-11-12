package com.company.project.services.facedevice;

import com.company.project.entities.FaceDevice;
import com.company.project.entities.FaceDeviceMember;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.FaceDeviceMemberRepository;
import com.company.project.repositories.FaceDeviceRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.services.facedevice.FaceDeviceDtos.Counts;
import com.company.project.services.facedevice.FaceDeviceDtos.DeviceRequest;
import com.company.project.services.facedevice.FaceDeviceDtos.DeviceResponse;
import com.company.project.services.facedevice.FaceDeviceDtos.MemberPage;
import com.company.project.services.facedevice.FaceDeviceDtos.MemberStatus;
import com.company.project.services.facedevice.FaceDeviceDtos.ReportResult;
import com.company.project.services.facedevice.FaceDeviceDtos.TestResult;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/** GymOS › Face Device Configuration: device settings, connection test and sync status. */
@Service
public class FaceDeviceService {

    /** Person serial used by Test Connection; it is never created, only a face delete is attempted. */
    static final String TEST_SN = "GYMBIOS-CONNECTION-TEST";

    private final FaceDeviceRepository deviceRepository;
    private final FaceDeviceMemberRepository syncRepository;
    private final FaceDeviceSyncService syncService;
    private final HeystarClient client;
    private final FaceDeviceReportService reportService;

    public FaceDeviceService(FaceDeviceRepository deviceRepository,
                             FaceDeviceMemberRepository syncRepository,
                             FaceDeviceSyncService syncService,
                             HeystarClient client,
                             FaceDeviceReportService reportService) {
        this.deviceRepository = deviceRepository;
        this.syncRepository = syncRepository;
        this.syncService = syncService;
        this.client = client;
        this.reportService = reportService;
    }

    /** Emails today's report now (the "Send report now" button). */
    public ReportResult sendReport(Long id) {
        FaceDevice d = find(id);
        LocalDate today = java.time.ZonedDateTime.now(FaceDeviceSyncService.zone(d)).toLocalDate();
        try {
            return new ReportResult(reportService.send(d, today));
        } catch (IllegalStateException e) {
            throw new BusinessRuleViolationException(e.getMessage());
        }
    }

    public List<DeviceResponse> list() {
        return deviceRepository.findAll().stream()
                .sorted(Comparator.comparing(FaceDevice::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toResponse)
                .toList();
    }

    public DeviceResponse get(Long id) {
        return toResponse(find(id));
    }

    public DeviceResponse create(DeviceRequest req) {
        Long branchId = BranchContextHolder.getActiveBranchId();
        if (branchId == null) throw new BusinessRuleViolationException("Select a branch first — a face device belongs to one branch.");
        FaceDevice d = new FaceDevice();
        d.setBranchId(branchId);
        if (!StringUtils.hasText(req.secret())) throw new IllegalArgumentException("Device secret (password) is required");
        apply(d, req, true);
        return toResponse(deviceRepository.save(d));
    }

    public DeviceResponse update(Long id, DeviceRequest req) {
        FaceDevice d = find(id);
        apply(d, req, false);
        return toResponse(deviceRepository.save(d));
    }

    /** Deletes the configuration only — people already on the terminal stay there. */
    public void delete(Long id) {
        FaceDevice d = find(id);
        if (syncService.isRunning(id)) throw new BusinessRuleViolationException("Wait for the running sync to finish first.");
        deviceRepository.delete(d);
    }

    public TestResult test(Long id) {
        FaceDevice d = find(id);
        HeystarClient.Result r = client.deleteFace(d, TEST_SN);
        boolean ok;
        String message;
        if (!r.reachable()) {
            ok = false;
            message = "Could not reach the middleware at " + d.getMiddlewareUrl() + " — " + r.message()
                    + ". Check the address and port, and that this server can reach it.";
        } else if (r.ok()) {
            ok = true;
            message = "Connected — the middleware and device answered OK.";
        } else if (r.deviceProblem()) {
            ok = false;
            message = "The middleware answered, but the device is not available: " + r.describe()
                    + ". Check the device is powered on, online, and that the device key is right.";
        } else if (looksLikeAuthError(r.message())) {
            ok = false;
            message = "The middleware rejected the device key or secret: " + r.describe();
        } else {
            // e.g. "person not exist" for the test serial — the device itself answered.
            ok = true;
            message = "Connected — the device answered: " + r.describe()
                    + " (expected, the test person does not exist).";
        }
        LocalDateTime at = LocalDateTime.now();
        deviceRepository.recordTest(id, at, ok, message);
        if (ok) deviceRepository.markOnline(id, at);
        else if (!r.reachable() || r.deviceProblem()) deviceRepository.markOffline(id, at);
        return new TestResult(ok, message, utc(at));
    }

    public DeviceResponse syncNow(Long id, boolean full) {
        FaceDevice d = find(id);
        if (!d.isEnabled()) throw new BusinessRuleViolationException("Enable the device before syncing.");
        if (syncService.isRunning(id)) throw new BusinessRuleViolationException("A sync is already running on this device.");
        if (full) syncRepository.clearFingerprints(id);
        syncService.triggerAsync(id, FaceDeviceSyncService.MANUAL_BATCH);
        return toResponse(d);
    }

    public DeviceResponse retryFailed(Long id) {
        FaceDevice d = find(id);
        syncRepository.clearFingerprintsInState(id, FaceDeviceMember.FAILED);
        if (d.isEnabled() && !syncService.isRunning(id)) syncService.triggerAsync(id, FaceDeviceSyncService.MANUAL_BATCH);
        return toResponse(d);
    }

    public MemberStatus syncMember(Long id, Long memberId) {
        FaceDevice d = find(id);
        FaceDeviceMemberRow row = syncRepository.findMemberRow(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + memberId));
        if (!d.getBranchId().equals(row.branchId())) {
            throw new BusinessRuleViolationException("This member belongs to another branch.");
        }
        try {
            FaceDeviceMember res = syncService.syncMember(d, row);
            return toMemberStatus(row, res, false);
        } catch (IllegalStateException e) {
            throw new BusinessRuleViolationException(e.getMessage());
        }
    }

    public MemberPage members(Long id, String state, String q, int limit) {
        FaceDevice d = find(id);
        FaceDeviceSyncService.Plan plan = syncService.plan(d);
        String needle = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        String wanted = state == null ? "" : state.trim().toUpperCase(Locale.ROOT);
        List<MemberStatus> all = new ArrayList<>();
        for (FaceDeviceMemberRow r : plan.rows().values()) {
            FaceDeviceMember s = plan.existing().get(r.id());
            MemberStatus ms = toMemberStatus(r, s, plan.needsSync().contains(r.id()));
            if (!needle.isEmpty()) {
                String hay = (String.valueOf(r.name()) + " " + r.personSn()).toLowerCase(Locale.ROOT);
                if (!hay.contains(needle)) continue;
            }
            if (!wanted.isEmpty() && !"ALL".equals(wanted)) {
                if ("PENDING".equals(wanted) ? !ms.needsSync() : !wanted.equals(ms.state())) continue;
            }
            all.add(ms);
        }
        all.sort(Comparator.comparing((MemberStatus m) -> !m.needsSync())
                .thenComparing(m -> String.valueOf(m.name()), String.CASE_INSENSITIVE_ORDER));
        int cap = Math.max(1, Math.min(limit, 500));
        return new MemberPage(all.size(), all.size() > cap ? all.subList(0, cap) : all);
    }

    // ------------------------------------------------------------------ helpers

    private MemberStatus toMemberStatus(FaceDeviceMemberRow r, FaceDeviceMember s, boolean needsSync) {
        String state = s == null ? "PENDING" : s.getState();
        return new MemberStatus(r.id(), r.personSn(), r.name(), r.effectiveStatus(), r.allowedIn(), r.hasPhoto(),
                r.photoUrl(), state, needsSync || s == null && r.allowedIn(),
                s == null ? (r.allowedIn() ? "Waiting for the next sync." : null) : s.getLastMessage(),
                s == null ? 0 : s.getAttempts(), s == null ? null : utc(s.getLastAttemptAt()),
                s == null ? null : utc(s.getLastSuccessAt()));
    }

    private DeviceResponse toResponse(FaceDevice d) {
        return new DeviceResponse(d.getId(), d.getBranchId(), d.getName(), d.getLocation(), d.getMiddlewareUrl(),
                d.getDeviceKey(), StringUtils.hasText(d.getDeviceSecret()), d.getAccessGroup(), d.getVerifyStyle(),
                d.getTimeZone(), d.getPhotoBaseUrl(), d.isEnabled(), d.isAutoSync(), utc(d.getLastTestAt()),
                d.getLastTestOk(), d.getLastTestMessage(), utc(d.getLastSyncAt()), d.getLastSyncMessage(),
                syncService.isRunning(d.getId()), counts(d), d.getReportEmails(),
                reportService.reportTime().toString(), reportService.mailConfigured(),
                utc(d.getLastReportAt()), d.getLastReportMessage(), utc(d.getOfflineSince()));
    }

    private Counts counts(FaceDevice d) {
        if (d.getId() == null) return new Counts(0, 0, 0, 0, 0, 0, 0, 0, 0);
        FaceDeviceSyncService.Plan plan = syncService.plan(d);
        int allowed = 0, withPhoto = 0;
        for (FaceDeviceMemberRow r : plan.rows().values()) {
            if (r.allowedIn()) {
                allowed++;
                if (r.hasPhoto()) withPhoto++;
            }
        }
        int enrolled = 0, noPhoto = 0, removed = 0, failed = 0, retry = 0;
        for (FaceDeviceMember m : plan.existing().values()) {
            switch (m.getState()) {
                case FaceDeviceMember.ENROLLED -> enrolled++;
                case FaceDeviceMember.NO_PHOTO -> noPhoto++;
                case FaceDeviceMember.REMOVED -> removed++;
                case FaceDeviceMember.FAILED -> failed++;
                case FaceDeviceMember.RETRY -> retry++;
                default -> { }
            }
        }
        return new Counts(plan.rows().size(), allowed, withPhoto, enrolled, noPhoto, removed, failed, retry,
                plan.push().size() + plan.orphans().size());
    }

    private void apply(FaceDevice d, DeviceRequest req, boolean creating) {
        if (creating || req.name() != null) {
            if (!StringUtils.hasText(req.name())) throw new IllegalArgumentException("Device name is required");
            d.setName(req.name().trim());
        }
        if (req.location() != null) d.setLocation(req.location().trim().isEmpty() ? null : req.location().trim());
        if (creating || req.middlewareUrl() != null) d.setMiddlewareUrl(validUrl(req.middlewareUrl(), "Middleware URL", true));
        if (creating || req.deviceKey() != null) {
            if (!StringUtils.hasText(req.deviceKey())) throw new IllegalArgumentException("Device key (serial number) is required");
            d.setDeviceKey(req.deviceKey().trim());
        }
        if (StringUtils.hasText(req.secret())) d.setDeviceSecret(req.secret().trim());
        if (req.accessGroup() != null) {
            if (req.accessGroup() < 1 || req.accessGroup() > 999) throw new IllegalArgumentException("Access group must be between 1 and 999");
            d.setAccessGroup(req.accessGroup());
        }
        if (req.verifyStyle() != null) {
            if (req.verifyStyle() < 0 || req.verifyStyle() > 99) throw new IllegalArgumentException("Verify style must be between 0 and 99");
            d.setVerifyStyle(req.verifyStyle());
        }
        if (req.timeZone() != null && !req.timeZone().isBlank()) {
            try {
                d.setTimeZone(ZoneId.of(req.timeZone().trim()).getId());
            } catch (DateTimeException e) {
                throw new IllegalArgumentException("Unknown time zone: " + req.timeZone());
            }
        }
        if (req.photoBaseUrl() != null) d.setPhotoBaseUrl(validUrl(req.photoBaseUrl(), "Photo base URL", false));
        if (req.enabled() != null) d.setEnabled(req.enabled());
        if (req.autoSync() != null) d.setAutoSync(req.autoSync());
        if (req.reportEmails() != null) d.setReportEmails(FaceDeviceReportService.normaliseEmails(req.reportEmails()));
    }

    private static String validUrl(String raw, String label, boolean required) {
        String u = HeystarClient.stripSlash(raw);
        if (u.isEmpty()) {
            if (required) throw new IllegalArgumentException(label + " is required");
            return null;
        }
        if (!u.matches("(?i)^https?://.+")) u = "http://" + u;
        try {
            URI uri = URI.create(u);
            if (uri.getHost() == null) throw new IllegalArgumentException();
        } catch (Exception e) {
            throw new IllegalArgumentException(label + " is not a valid address: " + raw);
        }
        return u;
    }

    /** Stored times are the server's LocalDateTime.now() — UTC (GymApplication sets the default zone). */
    private static OffsetDateTime utc(LocalDateTime t) {
        return t == null ? null : t.atOffset(ZoneOffset.UTC);
    }

    private static boolean looksLikeAuthError(String msg) {
        if (msg == null) return false;
        String m = msg.toLowerCase(Locale.ROOT);
        return m.contains("secret") || m.contains("password") || m.contains("key") || m.contains("auth")
                || m.contains("sign") || m.contains("permission") || m.contains("forbidden");
    }

    private FaceDevice find(Long id) {
        return deviceRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Face device not found: " + id));
    }
}
