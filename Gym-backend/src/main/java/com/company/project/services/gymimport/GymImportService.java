package com.company.project.services.gymimport;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.entities.TenantProvisioningLog;
import com.company.project.controlplane.repositories.TenantProvisioningLogRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.dto.GymRequestDTO;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.GymService;
import com.company.project.services.LegacyImportLedgerService;
import com.company.project.services.gymimport.LegacyGymTransformer.Options;
import com.company.project.services.gymimport.LegacyGymTransformer.PhotoCopy;
import com.company.project.services.gymimport.LegacyGymTransformer.Plan;
import com.company.project.services.gymimport.LegacyGymTransformer.TableRows;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.sql.DataSource;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Super-admin "Import Gym": brings a gym over from the previous (PHP) GymBios.
 *
 * 1. The SQL export is uploaded (in chunks) and analysed — the rows it would
 *    import and a reconciliation against the old system's money.
 * 2. The member photos it references are uploaded from the gym's photo folder.
 * 3. Onboarding creates the gym the same way Add Gym does (its own database and
 *    owner login), loads every row in one transaction, copies the photos and posts
 *    the history to the ledger (LegacyImportLedgerService).
 *
 * Each step runs in the background and reports a percentage; the page polls
 * {@link #status}. Jobs live in memory and their files under a staging folder that
 * is never served — both are discarded after a successful import, and the folder is
 * emptied when the server starts (a restart abandons any import in progress).
 */
@Service
public class GymImportService {

    private static final Logger log = LoggerFactory.getLogger(GymImportService.class);

    private static final long MAX_DUMP_BYTES = 512L * 1024 * 1024;
    // HEIC/HEIF are accepted so the report can name them (browsers can't show them, so they aren't imported).
    private static final Set<String> PHOTO_EXTENSIONS = Set.of(".jpg", ".jpeg", ".jfif", ".jpe", ".png", ".webp", ".gif",
            ".heic", ".heif");
    private static final List<String> PROVISIONING_STEPS = List.of("CREATE_DATABASE", "STORE_CONNECTION",
            "RUN_MIGRATIONS", "SEED_ROLES_PERMISSIONS", "CREATE_BRANCH", "SEED_ACCOUNT_HEADS", "CREATE_OWNER",
            "WRITE_DIRECTORY_ENTRY", "ACTIVATE", "SYNC_DISCOVERY");
    /** The tables the import writes, in dependency order; they must be empty first. */
    private static final List<String> TARGET_TABLES = List.of("members", "member_notes", "receipts", "credit_notes",
            "member_addons", "membership_freezes", "attendance");

    private final GymService gymService;
    private final TenantRepository tenantRepository;
    private final TenantProvisioningLogRepository provisioningLogRepository;
    private final UserDirectoryRepository userDirectoryRepository;
    private final TenantDataSourceRegistry tenantDataSources;
    private final LegacyImportLedgerService ledgerService;
    private final Path stagingRoot;
    private final Path photosDir;
    private final ExecutorService executor = Executors.newFixedThreadPool(2, r -> {
        Thread t = new Thread(r, "gym-import");
        t.setDaemon(true);
        return t;
    });
    private final Map<String, Job> jobs = new ConcurrentHashMap<>();

    public GymImportService(GymService gymService,
                            TenantRepository tenantRepository,
                            TenantProvisioningLogRepository provisioningLogRepository,
                            UserDirectoryRepository userDirectoryRepository,
                            TenantDataSourceRegistry tenantDataSources,
                            LegacyImportLedgerService ledgerService,
                            @Value("${app.storage.gym-imports-dir:${user.dir}/data/gym-imports}") String stagingDir,
                            @Value("${app.storage.photos-dir:${user.dir}/uploads/photos}") String photosDir) {
        this.gymService = gymService;
        this.tenantRepository = tenantRepository;
        this.provisioningLogRepository = provisioningLogRepository;
        this.userDirectoryRepository = userDirectoryRepository;
        this.tenantDataSources = tenantDataSources;
        this.ledgerService = ledgerService;
        this.stagingRoot = Paths.get(stagingDir).toAbsolutePath().normalize();
        this.photosDir = Paths.get(photosDir).toAbsolutePath().normalize();
        // Jobs don't survive a restart, so anything staged before it is orphaned
        // (and holds members' personal data) — clear it out.
        deleteRecursively(stagingRoot);
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }

    // ── Job state ────────────────────────────────────────────────────────────

    static final class Job {
        final String id;
        final Path dir;
        final String createdBy;
        final Instant createdAt = Instant.now();
        volatile String status = "UPLOADING";   // UPLOADING → ANALYZING → READY → ONBOARDING → COMPLETED | FAILED
        volatile String failedDuring;           // ANALYZE | ONBOARD
        volatile int progress;
        volatile String step = "Waiting for the SQL file";
        volatile String error;
        volatile String fileName;
        volatile long dumpBytes;
        volatile LegacyDump dump;
        volatile Map<String, Object> report;
        volatile Map<String, Object> gym;
        volatile List<String> referencedPhotos = List.of();
        volatile int photosMatched;
        volatile Map<String, Object> onboarding;   // what onboarding was asked for (no password)
        volatile Long tenantId;
        volatile String slug;
        volatile boolean dataLoaded;
        volatile boolean photosCopied;
        volatile Map<String, Object> result;

        Job(String id, Path dir, String createdBy) {
            this.id = id;
            this.dir = dir;
            this.createdBy = createdBy;
        }

        Path dumpFile() { return dir.resolve("dump.sql"); }
        Path photoDir() { return dir.resolve("photos"); }

        void at(int progress, String step) {
            this.progress = Math.max(0, Math.min(100, progress));
            this.step = step;
        }
    }

    private Job job(String id) {
        Job job = jobs.get(id);
        if (job == null) throw new EntityNotFoundException("Import not found or expired: " + id);
        return job;
    }

    public Map<String, Object> create(String createdBy) throws IOException {
        String id = UUID.randomUUID().toString();
        Job job = new Job(id, stagingRoot.resolve(id), createdBy);
        Files.createDirectories(job.photoDir());
        jobs.put(id, job);
        return status(id);
    }

    public Map<String, Object> status(String id) {
        Job job = job(id);
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("id", job.id);
        s.put("status", job.status);
        s.put("failed_during", job.failedDuring);
        s.put("progress", job.progress);
        s.put("step", job.step);
        s.put("error", job.error);
        s.put("file_name", job.fileName);
        s.put("dump_bytes", job.dumpBytes);
        s.put("referenced_photos", job.referencedPhotos);
        s.put("photos_matched", job.photosMatched);
        s.put("gym", job.gym);
        s.put("report", job.report);
        s.put("onboarding", job.onboarding);
        s.put("tenant_id", job.tenantId);
        s.put("result", job.result);
        return s;
    }

    public void discard(String id) {
        Job job = job(id);
        if ("ANALYZING".equals(job.status) || "ONBOARDING".equals(job.status)) {
            throw new BusinessRuleViolationException("This import is still running.");
        }
        jobs.remove(id);
        deleteRecursively(job.dir);
    }

    // ── 1. SQL file ──────────────────────────────────────────────────────────

    /** Appends one chunk of the export at byte offset (0 starts the file again). */
    public Map<String, Object> appendDump(String id, MultipartFile chunk, long offset, String fileName) throws IOException {
        Job job = job(id);
        requireStatus(job, "UPLOADING", "READY", "FAILED");
        if ("FAILED".equals(job.status) && "ONBOARD".equals(job.failedDuring)) {
            throw new BusinessRuleViolationException("Onboarding already started for this import; start a new import instead.");
        }
        Path file = job.dumpFile();
        long size = Files.exists(file) ? Files.size(file) : 0;
        if (offset != 0 && offset != size) {
            throw new BusinessRuleViolationException("Upload out of order: expected byte " + size + ", got " + offset + ".");
        }
        if (offset + chunk.getSize() > MAX_DUMP_BYTES) {
            throw new BusinessRuleViolationException("The SQL file is larger than 512 MB.");
        }
        try (InputStream in = chunk.getInputStream();
             OutputStream out = Files.newOutputStream(file, StandardOpenOption.CREATE, StandardOpenOption.WRITE,
                     offset == 0 ? StandardOpenOption.TRUNCATE_EXISTING : StandardOpenOption.APPEND)) {
            in.transferTo(out);
        }
        job.status = "UPLOADING";
        job.failedDuring = null;
        job.error = null;
        job.report = null;
        job.dump = null;
        job.fileName = fileName;
        job.dumpBytes = Files.size(file);
        job.at(0, "Uploading the SQL file");
        return status(id);
    }

    // ── 2. Analysis ──────────────────────────────────────────────────────────

    public Map<String, Object> analyze(String id) {
        Job job = job(id);
        requireStatus(job, "UPLOADING", "READY", "FAILED");
        if (!Files.exists(job.dumpFile())) throw new BusinessRuleViolationException("Upload the SQL file first.");
        job.status = "ANALYZING";
        job.failedDuring = null;
        job.error = null;
        job.at(0, "Reading the SQL file");
        executor.submit(() -> {
            try {
                String sql = Files.readString(job.dumpFile(), StandardCharsets.UTF_8);
                LegacyDump dump = LegacyDump.parse(sql, LegacyGymTransformer.TABLES,
                        f -> job.at((int) (f * 80), "Reading the SQL file"));
                List<String> missing = LegacyGymTransformer.missingTables(dump);
                if (!missing.isEmpty()) {
                    throw new BusinessRuleViolationException("This doesn't look like an export of the previous GymBios — "
                            + "it has no " + String.join(", ", missing) + " data.");
                }
                job.at(85, "Working out what will be imported");
                job.dump = dump;
                refreshReport(job);
                job.at(100, "Ready");
                job.status = "READY";
            } catch (Throwable e) {
                fail(job, "ANALYZE", e);
            }
        });
        return status(id);
    }

    /** Re-runs the transform with the photos uploaded so far (cheap: the dump is already parsed). */
    private void refreshReport(Job job) throws IOException {
        Set<String> available = uploadedPhotos(job);
        Plan plan = LegacyGymTransformer.transform(job.dump,
                new Options(LocalDate.now(ZoneOffset.ofHours(4)), 240, 1, "preview", available));
        job.report = plan.report();
        job.gym = plan.gym();
        job.referencedPhotos = new ArrayList<>(plan.referencedPhotos());
        job.photosMatched = plan.photos().size();
    }

    // ── 3. Photos ────────────────────────────────────────────────────────────

    /** Stores photos the export references (anything else is ignored). */
    public Map<String, Object> addPhotos(String id, List<MultipartFile> files) throws IOException {
        Job job = job(id);
        requireStatus(job, "READY");
        Set<String> wanted = new HashSet<>(job.referencedPhotos);
        int saved = 0;
        for (MultipartFile f : files) {
            String name = f.getOriginalFilename() == null ? "" : Paths.get(f.getOriginalFilename().replace('\\', '/')).getFileName().toString();
            String lower = name.toLowerCase(Locale.ROOT);
            if (!wanted.contains(name) || PHOTO_EXTENSIONS.stream().noneMatch(lower::endsWith)) continue;
            Path target = job.photoDir().resolve(name).normalize();
            if (!target.startsWith(job.photoDir())) continue;
            try (InputStream in = f.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            saved++;
        }
        Map<String, Object> s = status(id);
        s.put("saved", saved);
        return s;
    }

    /** Called once the photos are up: refreshes the report so missing photos are listed. */
    public Map<String, Object> photosDone(String id) throws IOException {
        Job job = job(id);
        requireStatus(job, "READY");
        refreshReport(job);
        return status(id);
    }

    private Set<String> uploadedPhotos(Job job) throws IOException {
        if (!Files.isDirectory(job.photoDir())) return new HashSet<>();
        try (Stream<Path> s = Files.list(job.photoDir())) {
            return s.map(p -> p.getFileName().toString()).collect(Collectors.toSet());
        }
    }

    // ── 4. Onboarding ────────────────────────────────────────────────────────

    public record OnboardRequest(String name, String slug, String address, String phone, String email,
                                 String ownerUsername, String ownerPassword, String ownerEmail, Integer utcOffsetMinutes) {}

    public Map<String, Object> onboard(String id, OnboardRequest req) {
        Job job = job(id);
        boolean retry = "FAILED".equals(job.status) && "ONBOARD".equals(job.failedDuring);
        if (!retry) requireStatus(job, "READY");
        if (job.dump == null) throw new BusinessRuleViolationException("Analyse the SQL file first.");

        String name = trim(req.name());
        String slug = trim(req.slug()) == null ? null : req.slug().trim().toLowerCase(Locale.ROOT);
        String username = trim(req.ownerUsername());
        String ownerEmail = trim(req.ownerEmail());
        int offset = req.utcOffsetMinutes() == null ? 240 : req.utcOffsetMinutes();
        if (name == null) throw new BusinessRuleViolationException("Enter the gym's name.");
        if (slug == null || !slug.matches("[a-z0-9]+(-[a-z0-9]+)*") || slug.length() < 3 || slug.length() > 40) {
            throw new BusinessRuleViolationException("The gym ID must be 3–40 lowercase letters, numbers or hyphens.");
        }
        if (username == null || username.length() < 3 || username.contains(" ")) {
            throw new BusinessRuleViolationException("The owner username must be at least 3 characters, with no spaces.");
        }
        if (req.ownerPassword() == null || req.ownerPassword().length() < 8) {
            throw new BusinessRuleViolationException("The owner password must be at least 8 characters.");
        }
        if (ownerEmail == null || !ownerEmail.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) {
            throw new BusinessRuleViolationException("Enter a valid owner email.");
        }
        if (offset < -720 || offset > 840 || offset % 15 != 0) throw new BusinessRuleViolationException("Choose the gym's time zone.");

        boolean continuing = retry && job.tenantId != null;
        if (continuing && !slug.equals(job.slug)) {
            throw new BusinessRuleViolationException("This import already created gym \"" + job.slug + "\"; retry with the same gym ID.");
        }
        if (!continuing) {
            if (!gymService.isSlugAvailable(slug)) throw new BusinessRuleViolationException("The gym ID \"" + slug + "\" is already taken.");
            if (userDirectoryRepository.existsByUsername(username)
                    || userDirectoryRepository.findByUsernameOrEmail(ownerEmail, ownerEmail).isPresent()) {
                throw new BusinessRuleViolationException("That owner username or email is already used by another login.");
            }
        }

        Map<String, Object> asked = new LinkedHashMap<>();
        asked.put("name", name);
        asked.put("slug", slug);
        asked.put("owner_username", username);
        asked.put("owner_email", ownerEmail);
        asked.put("utc_offset_minutes", offset);
        job.onboarding = asked;
        job.slug = slug;
        job.status = "ONBOARDING";
        job.failedDuring = null;
        job.error = null;
        job.at(0, "Creating the gym");

        GymRequestDTO gym = new GymRequestDTO();
        gym.setName(name);
        gym.setSlug(slug);
        gym.setAddress(trim(req.address()));
        gym.setPhone(trim(req.phone()));
        gym.setEmail(trim(req.email()));
        gym.setOwnerUsername(username);
        gym.setOwnerPassword(req.ownerPassword());
        gym.setOwnerEmail(ownerEmail);
        executor.submit(() -> runOnboarding(job, gym, offset));
        return status(id);
    }

    private void runOnboarding(Job job, GymRequestDTO gym, int offset) {
        try {
            provision(job, gym);

            job.at(26, "Preparing the data");
            DataSource ds = tenantDataSources.getDataSource(job.slug);
            long branchId = firstBranch(ds);
            Plan plan = LegacyGymTransformer.transform(job.dump,
                    new Options(LocalDate.now(ZoneOffset.ofTotalSeconds(offset * 60)), offset, branchId, job.slug, uploadedPhotos(job)));
            if (!job.dataLoaded) {
                load(job, ds, plan);
                job.dataLoaded = true;
            }

            if (!job.photosCopied) {
                job.at(56, "Copying member photos");
                Files.createDirectories(photosDir);
                for (PhotoCopy p : plan.photos()) {
                    Files.copy(job.photoDir().resolve(p.sourceFile()), photosDir.resolve(p.targetFile()),
                            StandardCopyOption.REPLACE_EXISTING);
                }
                job.photosCopied = true;
            }

            job.at(60, "Posting the history to the accounts");
            Map<String, Object> ledger;
            try {
                TenantContextHolder.setCurrentTenant(job.slug);
                BranchContextHolder.setActiveBranchId(branchId);
                ledger = ledgerService.postLedger((done, total) ->
                        job.at(60 + (int) (39.0 * done / Math.max(1, total)), "Posting the history to the accounts ("
                                + done + " of " + total + ")"));
            } finally {
                BranchContextHolder.clear();
                TenantContextHolder.clear();
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("tenant_id", job.tenantId);
            result.put("slug", job.slug);
            result.put("name", gym.getName());
            result.put("owner_username", gym.getOwnerUsername());
            plan.tables().forEach(t -> result.put(t.table(), t.rows().size()));
            result.put("photos", plan.photos().size());
            result.put("ledger", ledger);
            job.result = result;
            job.dump = null;
            job.status = "COMPLETED";
            job.at(100, "Done");
            // The staged export and photos hold members' personal data — don't keep them.
            deleteRecursively(job.dir);
            log.info("Gym import {} completed: {}", job.id, result);
        } catch (Throwable e) {
            fail(job, "ONBOARD", e);
        }
    }

    /** Creates the tenant through the same path as Add Gym and waits for it to be ready. */
    private void provision(Job job, GymRequestDTO gym) throws InterruptedException {
        if (job.tenantId == null) {
            job.tenantId = gymService.createGym(gym).getTenantId();
        } else {
            Tenant existing = tenantRepository.findById(job.tenantId).orElse(null);
            if (existing != null && "PROVISION_FAILED".equals(existing.getStatus())) {
                gymService.retryProvisioning(job.tenantId, gym);
            }
        }
        long deadline = System.currentTimeMillis() + 10 * 60_000L;
        while (true) {
            Tenant tenant = tenantRepository.findById(job.tenantId).orElse(null);
            String status = tenant == null ? null : tenant.getStatus();
            List<TenantProvisioningLog> logs = provisioningLogRepository.findByTenantIdOrderByAttemptedAtAsc(job.tenantId);
            long done = logs.stream().map(TenantProvisioningLog::getStep).filter(PROVISIONING_STEPS::contains).distinct().count();
            job.at(2 + (int) (23.0 * done / PROVISIONING_STEPS.size()), "Creating the gym");
            if ("ACTIVE".equals(status)) return;
            if ("PROVISION_FAILED".equals(status)) {
                String why = logs.stream().filter(l -> l.getErrorMessage() != null)
                        .max(Comparator.comparing(TenantProvisioningLog::getAttemptedAt))
                        .map(TenantProvisioningLog::getErrorMessage).orElse("see the server log");
                throw new IllegalStateException("Creating the gym failed: " + why);
            }
            if (System.currentTimeMillis() > deadline) throw new IllegalStateException("Creating the gym timed out.");
            Thread.sleep(1000);
        }
    }

    private static long firstBranch(DataSource ds) throws Exception {
        try (Connection c = ds.getConnection(); Statement st = c.createStatement();
             ResultSet rs = st.executeQuery("SELECT MIN(id) FROM branches")) {
            if (rs.next() && rs.getObject(1) != null) return rs.getLong(1);
        }
        throw new IllegalStateException("The new gym has no branch.");
    }

    /** Every row in one transaction: all of it lands, or none of it. */
    private void load(Job job, DataSource ds, Plan plan) throws Exception {
        long total = plan.tables().stream().mapToLong(t -> t.rows().size()).sum();
        long[] done = { 0 };
        try (Connection c = ds.getConnection()) {
            c.setAutoCommit(false);
            try {
                for (String table : TARGET_TABLES) {
                    try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery("SELECT EXISTS (SELECT 1 FROM " + table + ")")) {
                        if (rs.next() && rs.getBoolean(1)) {
                            throw new BusinessRuleViolationException("The gym already has " + table.replace('_', ' ')
                                    + " — an import only goes into a new gym.");
                        }
                    }
                }
                // The previous system ran at 0% VAT; the ledger splits VAT out at this rate.
                try (Statement st = c.createStatement()) {
                    st.executeUpdate("DELETE FROM financial_settings WHERE setting_key = 'standard_vat_rate'");
                }
                try (PreparedStatement ps = c.prepareStatement("INSERT INTO financial_settings (setting_key, setting_value, "
                        + "category, description, is_active, created_at, created_by) VALUES (?, ?, ?, ?, ?, now(), ?)")) {
                    ps.setString(1, "standard_vat_rate");
                    ps.setString(2, "0");
                    ps.setString(3, "TAX");
                    ps.setString(4, "Standard VAT rate (%) — 0 as in the previous system (not VAT registered)");
                    ps.setBoolean(5, true);
                    ps.setString(6, LegacyGymTransformer.MARK);
                    ps.executeUpdate();
                }
                for (TableRows t : plan.tables()) {
                    if (t.rows().isEmpty()) continue;
                    String sql = "INSERT INTO " + t.table() + " (" + String.join(", ", t.columns()) + ") VALUES ("
                            + t.columns().stream().map(col -> "?").collect(Collectors.joining(", ")) + ")";
                    try (PreparedStatement ps = c.prepareStatement(sql)) {
                        int batch = 0;
                        for (Object[] row : t.rows()) {
                            for (int k = 0; k < row.length; k++) ps.setObject(k + 1, row[k]);
                            ps.addBatch();
                            if (++batch == 500) {
                                ps.executeBatch();
                                batch = 0;
                            }
                            done[0]++;
                            if (done[0] % 250 == 0) {
                                job.at(27 + (int) (27.0 * done[0] / Math.max(1, total)), "Loading " + label(t.table()));
                            }
                        }
                        if (batch > 0) ps.executeBatch();
                    }
                    if (t.columns().contains("id")) {
                        try (Statement st = c.createStatement()) {
                            st.execute("SELECT setval(pg_get_serial_sequence('" + t.table() + "', 'id'), "
                                    + "GREATEST((SELECT COALESCE(MAX(id), 0) FROM " + t.table() + "), 1))");
                        }
                    }
                }
                // Numbering continues after the imported invoices / credit notes.
                upsertSequences(c, "INV-", plan.invoiceSequences());
                upsertSequences(c, "CN-", plan.creditNoteSequences());
                c.commit();
            } catch (Exception e) {
                c.rollback();
                throw e;
            }
        }
        job.at(55, "Data loaded");
    }

    private static void upsertSequences(Connection c, String prefix, Map<String, Integer> byYear) throws Exception {
        try (PreparedStatement ps = c.prepareStatement("INSERT INTO voucher_sequences (prefix, last_value) VALUES (?, ?) "
                + "ON CONFLICT (prefix) DO UPDATE SET last_value = GREATEST(voucher_sequences.last_value, EXCLUDED.last_value)")) {
            for (Map.Entry<String, Integer> e : byYear.entrySet()) {
                ps.setString(1, prefix + e.getKey() + "-");
                ps.setLong(2, e.getValue());
                ps.addBatch();
            }
            ps.executeBatch();
        }
    }

    private static String label(String table) {
        return switch (table) {
            case "membership_plans" -> "plans";
            case "addon_plans" -> "add-on plans";
            case "member_notes" -> "member notes";
            case "credit_notes" -> "refunds";
            case "member_addons" -> "add-ons";
            case "membership_freezes" -> "freezes";
            default -> table;
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static void requireStatus(Job job, String... allowed) {
        for (String s : allowed) if (s.equals(job.status)) return;
        throw new BusinessRuleViolationException("This import is " + job.status.toLowerCase(Locale.ROOT).replace('_', ' ') + ".");
    }

    private void fail(Job job, String during, Throwable e) {
        log.error("Gym import {} failed during {}", job.id, during, e);
        job.status = "FAILED";
        job.failedDuring = during;
        String message = e.getMessage();
        job.error = message == null || message.isBlank() ? e.getClass().getSimpleName() : message;
    }

    private static String trim(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static void deleteRecursively(Path root) {
        if (!Files.exists(root)) return;
        try (Stream<Path> walk = Files.walk(root)) {
            walk.sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException e) {
                    log.warn("Could not delete {}", p);
                }
            });
        } catch (IOException e) {
            log.warn("Could not clear {}", root, e);
        }
    }
}
