package com.company.project.services.facedevice;

import com.company.project.entities.FaceDevice;
import com.company.project.entities.FaceDeviceMember;
import com.company.project.repositories.FaceDeviceMemberRepository;
import com.company.project.repositories.FaceDeviceRepository;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Pushes a branch's members to its face devices — the old GymBios PHP cron (process_sync.php),
 * driven by member data instead of a queue table:
 * <ul>
 *   <li>Allowed in (effective status active): person/create with the membership window, wait
 *       2 s (the middleware needs it), then face/merge with the photo.</li>
 *   <li>Not allowed in (expired, frozen, suspended, pending) and on the device: the person's
 *       window is ended now and the face is deleted.</li>
 *   <li>Members deleted from GymBios: face deleted.</li>
 * </ul>
 * Each member's pushed values are fingerprinted, so a run only touches members whose name, dates,
 * status or photo changed (expiry is caught because the effective status is in the fingerprint).
 * A gateway / offline answer stops the run and the member is retried next time; any other
 * rejection marks the member FAILED until it changes or someone presses Retry.
 */
@Service
public class FaceDeviceSyncService {

    private static final Logger log = LoggerFactory.getLogger(FaceDeviceSyncService.class);

    /** Pause between person/create and face/merge — "required delay" in the PHP cron. */
    static final long FACE_DELAY_MS = 2000;
    /** Members pushed per device per scheduled run (~1 minute of device calls). */
    public static final int SCHEDULED_BATCH = 25;
    /** Members pushed by one "Sync now". */
    public static final int MANUAL_BATCH = 5000;

    private static final LocalDateTime NO_END = LocalDateTime.of(2099, 12, 31, 23, 59, 59);

    private final FaceDeviceRepository deviceRepository;
    private final FaceDeviceMemberRepository syncRepository;
    private final HeystarClient client;
    private final FacePhotoLoader photos;

    private final Set<String> running = ConcurrentHashMap.newKeySet();
    private final ExecutorService executor = Executors.newFixedThreadPool(2, r -> {
        Thread t = new Thread(r, "face-device-sync");
        t.setDaemon(true);
        return t;
    });

    public FaceDeviceSyncService(FaceDeviceRepository deviceRepository,
                                 FaceDeviceMemberRepository syncRepository,
                                 HeystarClient client,
                                 FacePhotoLoader photos) {
        this.deviceRepository = deviceRepository;
        this.syncRepository = syncRepository;
        this.client = client;
        this.photos = photos;
    }

    // ------------------------------------------------------------------ planning

    /** A member that needs a device call, and what the device should end up holding. */
    record Work(FaceDeviceMemberRow row, FaceDeviceMember existing, String fingerprint) {}

    /** What one run would do for a device. */
    record Plan(List<Work> push, List<FaceDeviceMember> bookkeeping, List<FaceDeviceMember> orphans,
                Map<Long, FaceDeviceMemberRow> rows, Map<Long, FaceDeviceMember> existing, Set<Long> needsSync) {}

    Plan plan(FaceDevice d) {
        List<FaceDeviceMemberRow> rows = syncRepository.findMemberRows(d.getBranchId());
        Map<Long, FaceDeviceMember> existing = new HashMap<>();
        for (FaceDeviceMember m : syncRepository.findByDeviceId(d.getId())) existing.put(m.getMemberId(), m);

        List<Work> push = new ArrayList<>();
        List<FaceDeviceMember> bookkeeping = new ArrayList<>();
        Map<Long, FaceDeviceMemberRow> byId = new HashMap<>();
        Set<Long> needsSync = new HashSet<>();
        for (FaceDeviceMemberRow r : rows) {
            byId.put(r.id(), r);
            FaceDeviceMember ex = existing.get(r.id());
            String fp = fingerprint(d, r);
            boolean upToDate = ex != null && fp.equals(ex.getFingerprint()) && !FaceDeviceMember.RETRY.equals(ex.getState());
            if (upToDate) continue;
            if (!r.allowedIn() && (ex == null || !ex.isOnDevice())) {
                // Nothing on the device and nothing to put there: record it, no call needed.
                FaceDeviceMember b = ex != null ? ex : newRow(d, r);
                if (b.getState() == null) b.setState(FaceDeviceMember.NOT_ON_DEVICE);
                b.setPersonSn(r.personSn());
                b.setFingerprint(fp);
                if (FaceDeviceMember.NOT_ON_DEVICE.equals(b.getState())) {
                    b.setLastMessage("Not pushed — membership is " + r.effectiveStatus());
                }
                bookkeeping.add(b);
                continue;
            }
            needsSync.add(r.id());
            push.add(new Work(r, ex, fp));
        }
        // Removals first (they block entry and are quick), then enrolments, oldest member first.
        push.sort(Comparator.comparing((Work w) -> w.row().allowedIn()).thenComparing(w -> w.row().id()));

        List<FaceDeviceMember> orphans = new ArrayList<>();
        for (FaceDeviceMember m : existing.values()) {
            if (!byId.containsKey(m.getMemberId())) orphans.add(m);
        }
        return new Plan(push, bookkeeping, orphans, byId, existing, needsSync);
    }

    static String fingerprint(FaceDevice d, FaceDeviceMemberRow r) {
        boolean allowed = r.allowedIn();
        String s = String.join("|",
                r.personSn(), String.valueOf(r.name()), allowed ? "in" : "out:" + r.effectiveStatus(),
                allowed ? String.valueOf(r.validStart()) : "", allowed ? String.valueOf(r.validEnd()) : "",
                allowed ? String.valueOf(r.photoUrl()) : "",
                String.valueOf(d.getAccessGroup()), String.valueOf(d.getVerifyStyle()), String.valueOf(d.getTimeZone()),
                String.valueOf(d.getDeviceKey()), HeystarClient.stripSlash(d.getMiddlewareUrl()));
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(h);
        } catch (Exception e) {
            return Integer.toHexString(s.hashCode());
        }
    }

    private static FaceDeviceMember newRow(FaceDevice d, FaceDeviceMemberRow r) {
        FaceDeviceMember m = new FaceDeviceMember();
        m.setDeviceId(d.getId());
        m.setMemberId(r.id());
        m.setPersonSn(r.personSn());
        return m;
    }

    // ------------------------------------------------------------------ running

    public boolean isRunning(Long deviceId) {
        return running.contains(lockKey(deviceId));
    }

    /** Starts a run in the background for the current tenant; false when one is already going. */
    public boolean triggerAsync(Long deviceId, int limit) {
        if (isRunning(deviceId)) return false;
        String tenant = TenantContextHolder.getCurrentTenant();
        executor.submit(() -> {
            try {
                if (tenant != null) TenantContextHolder.setCurrentTenant(tenant);
                runDevice(deviceId, limit);
            } catch (Exception e) {
                log.error("Face device {} sync failed", deviceId, e);
            } finally {
                TenantContextHolder.clear();
            }
        });
        return true;
    }

    /** Pushes up to {@code limit} changed members to the device. Safe to call from any thread with the tenant set. */
    public void runDevice(Long deviceId, int limit) {
        String key = lockKey(deviceId);
        if (!running.add(key)) return;
        try {
            FaceDevice d = deviceRepository.findById(deviceId).orElse(null);
            if (d == null || !d.isEnabled()) return;
            Plan plan = plan(d);
            if (!plan.bookkeeping().isEmpty()) syncRepository.saveAll(plan.bookkeeping());

            int enrolled = 0, removed = 0, failed = 0, calls = 0;
            String stoppedBy = null;
            for (Work w : plan.push()) {
                if (calls >= limit) break;
                FaceDeviceMember res = push(d, w);
                calls++;
                switch (res.getState()) {
                    case FaceDeviceMember.ENROLLED, FaceDeviceMember.NO_PHOTO -> enrolled++;
                    case FaceDeviceMember.REMOVED -> removed++;
                    case FaceDeviceMember.FAILED -> failed++;
                    case FaceDeviceMember.RETRY -> stoppedBy = res.getLastMessage();
                    default -> { }
                }
                if (stoppedBy != null) break;
            }
            if (stoppedBy == null) {
                for (FaceDeviceMember o : plan.orphans()) {
                    if (calls >= limit) break;
                    if (o.isOnDevice()) {
                        HeystarClient.Result r = client.deleteFace(d, o.getPersonSn());
                        calls++;
                        if (!r.ok() && r.deviceProblem()) { stoppedBy = r.describe(); break; }
                        removed++;
                    }
                    syncRepository.delete(o);
                }
            }

            int left = Math.max(0, plan.push().size() - enrolled - removed - failed);
            StringBuilder msg = new StringBuilder();
            if (stoppedBy != null) msg.append("Stopped — device unavailable: ").append(stoppedBy).append(". ");
            if (calls == 0 && stoppedBy == null) msg.append("Everything up to date.");
            else {
                msg.append(enrolled).append(" enrolled/updated, ").append(removed).append(" removed, ")
                        .append(failed).append(" failed");
                if (left > 0) msg.append(", ").append(left).append(" still to sync");
                msg.append('.');
            }
            LocalDateTime now = LocalDateTime.now();
            deviceRepository.recordSync(deviceId, now, msg.toString().trim());
            if (stoppedBy != null) deviceRepository.markOffline(deviceId, now);
            else if (calls > 0) deviceRepository.markOnline(deviceId, now);
        } finally {
            running.remove(key);
        }
    }

    /** Pushes one member now (the per-member Sync button), whatever its fingerprint says. */
    public FaceDeviceMember syncMember(FaceDevice d, FaceDeviceMemberRow r) {
        String key = lockKey(d.getId());
        if (!running.add(key)) {
            throw new IllegalStateException("A sync is already running on this device — this member will be included.");
        }
        try {
            FaceDeviceMember ex = syncRepository.findByDeviceIdAndMemberId(d.getId(), r.id()).orElse(null);
            String fp = fingerprint(d, r);
            if (!r.allowedIn() && (ex == null || !ex.isOnDevice())) {
                // Force the removal anyway: the person may be left over from the old system.
                FaceDeviceMember row = ex != null ? ex : newRow(d, r);
                row.setState(FaceDeviceMember.RETRY);
                ex = syncRepository.save(row);
            }
            return push(d, new Work(r, ex, fp));
        } finally {
            running.remove(key);
        }
    }

    private FaceDeviceMember push(FaceDevice d, Work w) {
        FaceDeviceMemberRow r = w.row();
        FaceDeviceMember row = w.existing() != null ? w.existing() : newRow(d, r);
        String sn = r.personSn();
        LocalDateTime now = LocalDateTime.now();
        row.setAttempts(row.getAttempts() + 1);
        row.setLastAttemptAt(now);

        // Member code changed since the last push: take the old person's face off first.
        if (row.getPersonSn() != null && !row.getPersonSn().equals(sn) && row.isOnDevice()) {
            client.deleteFace(d, row.getPersonSn());
        }
        row.setPersonSn(sn);

        ZoneId zone = zone(d);
        if (r.allowedIn()) {
            LocalDate start = r.validStart() != null ? r.validStart().toLocalDate() : LocalDate.now(zone);
            LocalDateTime end = r.validEnd() != null ? r.validEnd().toLocalDate().atTime(23, 59, 59) : NO_END;
            long from = start.atStartOfDay(zone).toInstant().toEpochMilli();
            long to = end.atZone(zone).toInstant().toEpochMilli();
            HeystarClient.Result person = client.createPerson(d, sn, safeName(r), from, to);
            if (!person.ok() && person.deviceProblem()) return retry(row, "Person: " + person.describe());
            String personNote = person.ok() ? "" : " (person: " + person.describe() + ")";

            if (!r.hasPhoto()) {
                if (FaceDeviceMember.ENROLLED.equals(row.getState())) client.deleteFace(d, sn);
                return done(row, FaceDeviceMember.NO_PHOTO, w.fingerprint(),
                        "Added to the device, but the member has no photo — add one to enrol the face." + personNote, true);
            }
            StringBuilder why = new StringBuilder();
            String b64 = photos.loadBase64(r.photoUrl(), why);
            if (b64 == null) return done(row, FaceDeviceMember.FAILED, w.fingerprint(), why + personNote, false);

            sleep(FACE_DELAY_MS);
            HeystarClient.Result face = client.uploadFace(d, sn, b64, photos.publicUrl(r.photoUrl(), d.getPhotoBaseUrl()));
            if (face.ok()) {
                return done(row, FaceDeviceMember.ENROLLED, w.fingerprint(),
                        "Face enrolled, valid " + start + " to " + (r.validEnd() != null ? r.validEnd().toLocalDate() : "no end") + ".", true);
            }
            if (face.deviceProblem()) return retry(row, "Face: " + face.describe());
            return done(row, FaceDeviceMember.FAILED, w.fingerprint(), "Face rejected: " + face.describe() + personNote, false);
        }

        // Not allowed in: end the person's window now, then delete the face.
        long to = Instant.now().minusSeconds(60).toEpochMilli();
        long from = Math.min(r.validStart() != null
                ? r.validStart().toLocalDate().atStartOfDay(zone).toInstant().toEpochMilli() : to, to - 86_400_000L);
        HeystarClient.Result person = client.createPerson(d, sn, safeName(r), from, to);
        if (!person.ok() && person.deviceProblem()) return retry(row, "Person: " + person.describe());
        HeystarClient.Result del = client.deleteFace(d, sn);
        if (!del.ok() && del.deviceProblem()) return retry(row, "Face delete: " + del.describe());
        if (del.ok() || person.ok()) {
            return done(row, FaceDeviceMember.REMOVED, w.fingerprint(),
                    "Removed — membership is " + r.effectiveStatus() + "." + (del.ok() ? "" : " Face delete said: " + del.describe()), true);
        }
        return done(row, FaceDeviceMember.FAILED, w.fingerprint(),
                "Could not remove: person " + person.describe() + "; face " + del.describe(), false);
    }

    private FaceDeviceMember retry(FaceDeviceMember row, String message) {
        row.setState(FaceDeviceMember.RETRY);
        row.setFingerprint(null);
        row.setLastMessage(message);
        return syncRepository.save(row);
    }

    private FaceDeviceMember done(FaceDeviceMember row, String state, String fp, String message, boolean success) {
        row.setState(state);
        row.setFingerprint(fp);
        row.setLastMessage(message);
        if (success) row.setLastSuccessAt(LocalDateTime.now());
        return syncRepository.save(row);
    }

    static ZoneId zone(FaceDevice d) {
        try {
            if (d.getTimeZone() != null && !d.getTimeZone().isBlank()) return ZoneId.of(d.getTimeZone().trim());
        } catch (DateTimeException ignored) {
            // fall back to UTC
        }
        return ZoneOffset.UTC;
    }

    private static String safeName(FaceDeviceMemberRow r) {
        String n = r.name() == null ? "" : r.name().trim().replaceAll("\\s+", " ");
        if (n.isEmpty()) n = r.personSn();
        return n.length() > 60 ? n.substring(0, 60) : n;
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static String lockKey(Long deviceId) {
        String t = TenantContextHolder.getCurrentTenant();
        return (t == null ? "primary" : t) + ":" + deviceId;
    }
}
