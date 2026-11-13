package com.company.project.services.platform;

import com.jcraft.jsch.ChannelExec;
import com.jcraft.jsch.ChannelSftp;
import com.jcraft.jsch.HostKey;
import com.jcraft.jsch.HostKeyRepository;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.JSchException;
import com.jcraft.jsch.Session;
import com.jcraft.jsch.UIKeyboardInteractive;
import com.jcraft.jsch.UserInfo;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Array;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.SQLWarning;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.zip.Deflater;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Super admin Database Console: sign in to the server over SSH with its root
 * password, then list every Postgres database on it and run SQL against one.
 *
 * - The password is used once to open the SSH session and is never stored or logged.
 * - Queries go through an SSH tunnel (127.0.0.1:random → server's Postgres) with
 *   the backend's own database login, so nothing new has to be configured on the server.
 * - One console per super admin, closed after {@code idle-minutes} without use and
 *   after {@code max-hours} in any case, on disconnect, and on shutdown.
 * - Read-only unless the caller asks for writes (BEGIN READ ONLY, always rolled
 *   back); with writes the whole batch is one transaction, committed only if every
 *   statement succeeded. Statement timeout + row cap on every run.
 * - Every run is written to the application log (who, database, mode, SQL, outcome).
 * - Five wrong passwords in 15 minutes lock that super admin out for 15 minutes.
 */
@Service
public class DbConsoleService {

    private static final Logger log = LoggerFactory.getLogger(DbConsoleService.class);
    private static final int MAX_CELL_CHARS = 10_000;
    private static final int MAX_FAILURES = 5;
    private static final Duration FAILURE_WINDOW = Duration.ofMinutes(15);

    @Value("${platform.db-console.enabled:true}") private boolean enabled;
    @Value("${platform.db-console.ssh-host:77.37.49.42}") private String sshHost;
    @Value("${platform.db-console.ssh-port:22}") private int sshPort;
    @Value("${platform.db-console.ssh-user:root}") private String sshUser;
    /** Optional pin, as `ssh-keygen -lf` prints it ("SHA256:…"). Empty = accept the server's key and show it. */
    @Value("${platform.db-console.ssh-host-key:}") private String pinnedHostKey;
    @Value("${platform.db-console.db-host:127.0.0.1}") private String dbHost;
    @Value("${platform.db-console.db-port:5432}") private int dbPort;
    @Value("${platform.db-console.db-username:${spring.datasource.username:postgres}}") private String dbUser;
    @Value("${platform.db-console.db-password:${spring.datasource.password:}}") private String dbPassword;
    @Value("${platform.db-console.max-rows:1000}") private int maxRows;
    @Value("${platform.db-console.statement-timeout-seconds:120}") private int statementTimeout;
    @Value("${platform.db-console.idle-minutes:15}") private int idleMinutes;
    @Value("${platform.db-console.max-hours:4}") private int maxHours;
    /** pg_dump on the server (it runs there, over SSH). */
    @Value("${platform.db-console.pg-dump:pg_dump}") private String pgDump;
    /**
     * The member photos folder ON THE SERVER. Default: this backend's own photos folder,
     * which is the right path in production (the backend runs on that server).
     */
    @Value("${platform.db-console.photos-dir:${app.storage.photos-dir:${user.dir}/uploads/photos}}") private String photosDir;
    @Value("${spring.datasource.url:}") private String primaryUrl;
    @Value("${control-plane.datasource.url:}") private String controlUrl;

    private final JdbcTemplate controlPlane;
    private final Map<String, Console> consoles = new ConcurrentHashMap<>();
    private final Map<String, List<Instant>> failures = new ConcurrentHashMap<>();

    public DbConsoleService(@Qualifier("controlPlaneDataSource") DataSource controlPlaneDataSource) {
        this.controlPlane = new JdbcTemplate(controlPlaneDataSource);
    }

    /** A problem to show the super admin as is (wrong password, not connected, …). */
    public static class ConsoleException extends RuntimeException {
        private final String code;
        public ConsoleException(String code, String message) { super(message); this.code = code; }
        public String getCode() { return code; }
    }

    private static final class Console {
        final String username; final Session ssh; final int localPort; final String hostKey; final Instant openedAt;
        volatile Instant lastUsed;
        final AtomicBoolean busy = new AtomicBoolean();
        final AtomicReference<Statement> running = new AtomicReference<>();
        volatile List<String> knownDatabases = List.of();
        Console(String username, Session ssh, int localPort, String hostKey) {
            this.username = username; this.ssh = ssh; this.localPort = localPort; this.hostKey = hostKey;
            this.openedAt = Instant.now(); this.lastUsed = openedAt;
        }
    }

    public record Status(boolean enabled, boolean connected, String host, String user, String hostKey,
                         String openedAt, String expiresAt, int maxRows, int statementTimeoutSeconds) {}

    public record DatabaseInfo(String name, Long sizeBytes, String kind, String gymName, String slug, String tenantStatus) {}

    public record Column(String name, String type) {}

    public record ResultBlock(List<Column> columns, List<List<Object>> rows, int rowCount, boolean truncated,
                              Long updateCount) {}

    public record SqlError(String message, String sqlState) {}

    public record QueryResult(String database, boolean writes, boolean committed, long elapsedMs,
                              List<ResultBlock> results, List<String> notices, SqlError error) {}

    // ── Session ─────────────────────────────────────────────────────────────

    public Status status(String username) {
        Console c = live(username);
        return new Status(enabled, c != null, sshHost, sshUser, c != null ? c.hostKey : null,
                c != null ? c.openedAt.toString() : null, c != null ? expiry(c).toString() : null, maxRows, statementTimeout);
    }

    public Status connect(String username, String password) {
        requireEnabled();
        if (password == null || password.isEmpty()) throw new ConsoleException("PASSWORD_REQUIRED", "Enter the server password.");
        checkLock(username);
        disconnect(username, "reconnect");

        JSch jsch = new JSch();
        AtomicReference<String> seenKey = new AtomicReference<>();
        jsch.setHostKeyRepository(new PinningRepository(pinnedHostKey, seenKey));
        Session ssh = null;
        try {
            ssh = jsch.getSession(sshUser, sshHost, sshPort);
            ssh.setPassword(password);
            ssh.setUserInfo(new PasswordUserInfo(password));
            ssh.setConfig("PreferredAuthentications", "password,keyboard-interactive");
            ssh.setServerAliveInterval(30_000);
            ssh.connect(15_000);
        } catch (JSchException e) {
            if (ssh != null) ssh.disconnect();
            String msg = String.valueOf(e.getMessage());
            if (msg.contains("Auth fail") || msg.contains("Auth cancel")) {
                recordFailure(username);
                log.warn("DB console: {} — wrong SSH password for {}@{}", username, sshUser, sshHost);
                throw new ConsoleException("AUTH_FAILED", "Wrong password for " + sshUser + "@" + sshHost + ".");
            }
            if (msg.toLowerCase().contains("reject hostkey") || msg.contains("HostKey")) {
                log.warn("DB console: {} — server key {} does not match the pinned key", username, seenKey.get());
                throw new ConsoleException("HOST_KEY_MISMATCH", "The server's SSH key (" + seenKey.get()
                        + ") does not match platform.db-console.ssh-host-key. Not connecting.");
            }
            log.warn("DB console: {} — SSH to {}:{} failed: {}", username, sshHost, sshPort, msg);
            throw new ConsoleException("SSH_ERROR", "Could not connect to " + sshHost + ": " + msg);
        }
        failures.remove(username);

        int localPort;
        try {
            localPort = ssh.setPortForwardingL("127.0.0.1", 0, dbHost, dbPort);
        } catch (JSchException e) {
            ssh.disconnect();
            throw new ConsoleException("SSH_ERROR", "Signed in, but could not open the tunnel to Postgres: " + e.getMessage());
        }
        Console c = new Console(username, ssh, localPort, seenKey.get());
        try {
            c.knownDatabases = listDatabases(c).stream().map(DatabaseInfo::name).toList();
        } catch (SQLException e) {
            ssh.disconnect();
            throw new ConsoleException("DB_LOGIN_FAILED", "Signed in to the server, but Postgres refused the login: " + e.getMessage());
        }
        consoles.put(username, c);
        log.info("DB console: {} connected to {}@{} (host key {})", username, sshUser, sshHost, c.hostKey);
        return status(username);
    }

    public void disconnect(String username, String why) {
        Console c = consoles.remove(username);
        if (c == null) return;
        Statement st = c.running.get();
        if (st != null) { try { st.cancel(); } catch (SQLException ignored) { } }
        c.ssh.disconnect();
        log.info("DB console: {} disconnected ({})", username, why);
    }

    @Scheduled(fixedDelay = 60_000)
    public void closeIdle() {
        Instant now = Instant.now();
        for (Console c : List.copyOf(consoles.values())) {
            if (!c.ssh.isConnected()) disconnect(c.username, "connection dropped");
            else if (!c.busy.get() && now.isAfter(expiry(c))) disconnect(c.username, "idle / time limit");
        }
    }

    @PreDestroy
    public void closeAll() {
        for (String u : List.copyOf(consoles.keySet())) disconnect(u, "shutdown");
    }

    // ── Databases ───────────────────────────────────────────────────────────

    public List<DatabaseInfo> databases(String username) {
        Console c = require(username);
        try {
            List<DatabaseInfo> list = listDatabases(c);
            c.knownDatabases = list.stream().map(DatabaseInfo::name).toList();
            return list;
        } catch (SQLException e) {
            throw new ConsoleException("DB_ERROR", "Could not list the databases: " + e.getMessage());
        }
    }

    private List<DatabaseInfo> listDatabases(Console c) throws SQLException {
        Map<String, String[]> tenants = new HashMap<>();
        try {
            controlPlane.query("SELECT c.db_name, t.name, t.slug, t.status FROM tenants t JOIN tenant_connections c ON c.tenant_id = t.id",
                    rs -> { tenants.put(rs.getString(1), new String[] { rs.getString(2), rs.getString(3), rs.getString(4) }); });
        } catch (RuntimeException e) {
            log.warn("DB console: could not read tenants for labels: {}", e.getMessage());
        }
        String primary = dbNameOf(primaryUrl), control = dbNameOf(controlUrl);
        List<DatabaseInfo> out = new ArrayList<>();
        try (Connection conn = open(c, "postgres", 60); Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SELECT datname, CASE WHEN has_database_privilege(datname, 'CONNECT') "
                     + "THEN pg_database_size(datname) END FROM pg_database WHERE datallowconn AND NOT datistemplate ORDER BY datname")) {
            while (rs.next()) {
                String name = rs.getString(1);
                long size = rs.getLong(2);
                Long sizeBytes = rs.wasNull() ? null : size;
                String[] t = tenants.get(name);
                String kind = t != null ? "tenant" : name.equals(primary) ? "primary" : name.equals(control) ? "control" : "other";
                out.add(new DatabaseInfo(name, sizeBytes, kind, t != null ? t[0] : null, t != null ? t[1] : null, t != null ? t[2] : null));
            }
        }
        return out;
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    public QueryResult run(String username, String database, String sql, boolean writes) {
        Console c = require(username);
        if (sql == null || sql.isBlank()) throw new ConsoleException("SQL_REQUIRED", "Type a query to run.");
        requireDatabase(c, username, database);
        if (!c.busy.compareAndSet(false, true))
            throw new ConsoleException("BUSY", "A query is still running — wait for it or cancel it.");
        long started = System.nanoTime();
        List<ResultBlock> blocks = new ArrayList<>();
        List<String> notices = new ArrayList<>();
        SqlError error = null;
        boolean committed = false;
        try (Connection conn = open(c, database, statementTimeout)) {
            conn.setAutoCommit(false);
            conn.setReadOnly(!writes);
            try (Statement st = conn.createStatement()) {
                c.running.set(st);
                st.setMaxRows(maxRows + 1);
                try {
                    boolean isResult = st.execute(sql);
                    while (true) {
                        collectNotices(st.getWarnings(), notices);
                        st.clearWarnings();
                        if (isResult) {
                            try (ResultSet rs = st.getResultSet()) { blocks.add(readResult(rs)); }
                        } else {
                            int count = st.getUpdateCount();
                            if (count == -1) break;
                            blocks.add(new ResultBlock(List.of(), List.of(), 0, false, (long) count));
                        }
                        isResult = st.getMoreResults();
                    }
                    if (writes) { conn.commit(); committed = true; } else conn.rollback();
                } catch (SQLException e) {
                    collectNotices(st.getWarnings(), notices);
                    error = sqlError(e);
                    try { conn.rollback(); } catch (SQLException ignored) { }
                }
            } finally {
                c.running.set(null);
            }
        } catch (SQLException e) {
            error = sqlError(e);
        } finally {
            c.busy.set(false);
            c.lastUsed = Instant.now();
        }
        long elapsed = (System.nanoTime() - started) / 1_000_000;
        log.info("DB console: {} ran on {} [{}] in {} ms — {}: {}", username, database, writes ? "WRITE" : "read-only",
                elapsed, error != null ? "ERROR " + error.message() : committed ? "committed" : "ok", abbreviate(sql, 4000));
        return new QueryResult(database, writes, committed, elapsed, blocks, notices, error);
    }

    public boolean cancel(String username) {
        Console c = require(username);
        Statement st = c.running.get();
        if (st == null) return false;
        try { st.cancel(); } catch (SQLException e) { return false; }
        log.info("DB console: {} cancelled the running query", username);
        return true;
    }

    private ResultBlock readResult(ResultSet rs) throws SQLException {
        ResultSetMetaData md = rs.getMetaData();
        int n = md.getColumnCount();
        List<Column> cols = new ArrayList<>(n);
        for (int i = 1; i <= n; i++) cols.add(new Column(md.getColumnLabel(i), md.getColumnTypeName(i)));
        List<List<Object>> rows = new ArrayList<>();
        boolean truncated = false;
        while (rs.next()) {
            if (rows.size() >= maxRows) { truncated = true; break; }
            List<Object> row = new ArrayList<>(n);
            for (int i = 1; i <= n; i++) row.add(cell(rs.getObject(i)));
            rows.add(row);
        }
        return new ResultBlock(cols, rows, rows.size(), truncated, null);
    }

    private static Object cell(Object v) throws SQLException {
        if (v == null) return null;
        if (v instanceof Boolean || v instanceof Integer || v instanceof Short || v instanceof Double || v instanceof Float) return v;
        if (v instanceof Long || v instanceof BigDecimal || v instanceof BigInteger) return v.toString(); // keep precision
        if (v instanceof byte[] b) {
            StringBuilder sb = new StringBuilder("\\x");
            for (int i = 0; i < Math.min(b.length, 256); i++) sb.append(String.format("%02x", b[i]));
            if (b.length > 256) sb.append("… (").append(b.length).append(" bytes)");
            return sb.toString();
        }
        String s = v instanceof Array a ? a.toString() : v.toString();
        return s.length() > MAX_CELL_CHARS ? s.substring(0, MAX_CELL_CHARS) + "… (" + s.length() + " chars)" : s;
    }

    private static void collectNotices(SQLWarning w, List<String> out) {
        for (; w != null && out.size() < 200; w = w.getNextWarning()) out.add(w.getMessage());
    }

    private static SqlError sqlError(SQLException e) {
        String msg = e.getMessage();
        if ("57014".equals(e.getSQLState()) && msg != null && msg.contains("user request"))
            msg = "Query cancelled.";
        return new SqlError(msg, e.getSQLState());
    }

    // ── Downloads ───────────────────────────────────────────────────────────

    /** Writes a download to the response. Problems found before the first byte are thrown as ConsoleException. */
    public interface DownloadBody { void writeTo(OutputStream out) throws IOException; }

    public record Download(String filename, String contentType, DownloadBody body) {}

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyyMMdd-HHmm");

    /**
     * The whole database as a plain .sql file: pg_dump runs on the server and streams
     * back over the SSH connection (nothing is left on the server). The database
     * password goes through a private temp .pgpass file fed on stdin, never on the
     * command line where `ps` would show it.
     */
    public Download sqlDump(String username, String database) {
        Console c = require(username);
        requireDatabase(c, username, database);
        ChannelExec ch;
        InputStream stdout;
        ByteArrayOutputStream stderr = new ByteArrayOutputStream();
        byte[] first = new byte[64 * 1024];
        int firstLen;
        try {
            ch = (ChannelExec) c.ssh.openChannel("exec");
            ch.setCommand("umask 077; f=$(mktemp) || exit 90; trap 'rm -f \"$f\"' EXIT; cat > \"$f\"; "
                    + "PGPASSFILE=\"$f\" " + pgDump + " -h " + shq(dbHost) + " -p " + dbPort + " -U " + shq(dbUser)
                    + " --no-owner --no-privileges --encoding=UTF8 -d " + shq(database));
            ch.setErrStream(stderr, true);
            stdout = ch.getInputStream();
            OutputStream stdin = ch.getOutputStream();
            ch.connect(15_000);
            stdin.write(("*:*:*:" + pgpassEscape(dbUser) + ":" + pgpassEscape(dbPassword == null ? "" : dbPassword) + "\n")
                    .getBytes(StandardCharsets.UTF_8));
            stdin.close();
            firstLen = stdout.read(first); // waits for pg_dump's first output (or its exit)
        } catch (JSchException | IOException e) {
            throw new ConsoleException("DUMP_FAILED", "Could not start pg_dump on the server: " + e.getMessage());
        }
        c.lastUsed = Instant.now();
        if (firstLen < 0) {
            int exit = waitExit(ch);
            ch.disconnect();
            String err = stderr.toString(StandardCharsets.UTF_8).trim();
            log.warn("DB console: {} — pg_dump of {} failed ({}): {}", username, database, exit, err);
            throw new ConsoleException("DUMP_FAILED", "pg_dump failed" + (err.isEmpty() ? " (exit " + exit + ")" : ": " + err));
        }
        log.info("DB console: {} downloading SQL dump of {}", username, database);
        final ChannelExec channel = ch;
        final InputStream in = stdout;
        final int len0 = firstLen;
        String filename = database + "-" + LocalDateTime.now().format(STAMP) + ".sql";
        return new Download(filename, "application/sql", out -> {
            long total = len0;
            try {
                out.write(first, 0, len0);
                byte[] buf = new byte[64 * 1024];
                for (int n; (n = in.read(buf)) >= 0; ) { out.write(buf, 0, n); total += n; }
                int exit = waitExit(channel);
                if (exit != 0) {
                    String err = stderr.toString(StandardCharsets.UTF_8).trim();
                    out.write(("\n-- WARNING: pg_dump stopped with exit status " + exit + " — this file is INCOMPLETE.\n-- "
                            + err.replace("\n", "\n-- ") + "\n").getBytes(StandardCharsets.UTF_8));
                    log.warn("DB console: {} — pg_dump of {} ended with {}: {}", username, database, exit, err);
                } else {
                    log.info("DB console: {} downloaded SQL dump of {} ({} bytes)", username, database, total);
                }
                out.flush();
            } finally {
                channel.disconnect();
                c.lastUsed = Instant.now();
            }
        });
    }

    private record PhotoRow(String memberId, String name, String url) {}

    /**
     * The selected gym's member photos as a .zip, named "<member no> - <name>.jpg",
     * with index.csv listing every member with a photo and whether it was found.
     * Photos live in one shared folder on the server, so the gym's own members table
     * says which files are its; they are fetched over SFTP.
     */
    public Download memberPhotos(String username, String database) {
        Console c = require(username);
        requireDatabase(c, username, database);
        List<PhotoRow> rows = new ArrayList<>();
        try (Connection conn = open(c, database, 60); Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SELECT member_id, name, photo_url FROM members "
                     + "WHERE coalesce(photo_url, '') <> '' ORDER BY member_id")) {
            while (rs.next()) rows.add(new PhotoRow(rs.getString(1), rs.getString(2), rs.getString(3)));
        } catch (SQLException e) {
            if ("42P01".equals(e.getSQLState()) || "42703".equals(e.getSQLState()))
                throw new ConsoleException("NO_MEMBERS", database + " has no members table — pick a gym database.");
            throw new ConsoleException("DB_ERROR", "Could not read the members: " + e.getMessage());
        }
        if (rows.isEmpty()) throw new ConsoleException("NO_PHOTOS", "No member in " + database + " has a photo.");

        String dir = photosDir.replace('\\', '/').replaceAll("/+$", "");
        ChannelSftp sftp;
        try {
            sftp = (ChannelSftp) c.ssh.openChannel("sftp");
            sftp.connect(15_000);
            sftp.stat(dir);
        } catch (Exception e) {
            throw new ConsoleException("PHOTOS_DIR", "Could not open the photos folder " + dir + " on the server: " + e.getMessage()
                    + " (set platform.db-console.photos-dir)");
        }
        log.info("DB console: {} downloading {} member photos of {}", username, rows.size(), database);
        String filename = database + "-member-photos-" + LocalDateTime.now().format(STAMP) + ".zip";
        return new Download(filename, "application/zip", out -> {
            int found = 0;
            StringBuilder index = new StringBuilder("member_id,name,file,status\r\n");
            java.util.Set<String> used = new java.util.HashSet<>();
            try (ZipOutputStream zip = new ZipOutputStream(out)) {
                zip.setLevel(Deflater.NO_COMPRESSION); // photos are already compressed
                for (PhotoRow r : rows) {
                    String status;
                    String entry = null;
                    String url = r.url().trim();
                    try {
                        if (url.startsWith("data:image/")) {
                            int comma = url.indexOf(',');
                            String mime = url.substring(5, url.indexOf(';') > 0 ? url.indexOf(';') : comma);
                            byte[] bytes = Base64.getMimeDecoder().decode(url.substring(comma + 1));
                            entry = uniqueName(used, r, extOf(mime.substring(mime.indexOf('/') + 1)));
                            zip.putNextEntry(new ZipEntry(entry));
                            zip.write(bytes);
                            zip.closeEntry();
                            status = "ok (embedded)";
                            found++;
                        } else {
                            int at = url.indexOf("/uploads/photos/");
                            String file = at < 0 ? null : url.substring(at + "/uploads/photos/".length()).replaceAll("[?#].*$", "");
                            if (file == null || !file.matches("[A-Za-z0-9._-]+") || file.startsWith(".")) {
                                status = "not on this server (" + url + ")";
                            } else {
                                String ext = file.contains(".") ? file.substring(file.lastIndexOf('.') + 1) : "jpg";
                                try (InputStream photo = sftp.get(dir + "/" + file)) {
                                    entry = uniqueName(used, r, extOf(ext));
                                    zip.putNextEntry(new ZipEntry(entry));
                                    photo.transferTo(zip);
                                    zip.closeEntry();
                                    status = "ok";
                                    found++;
                                } catch (com.jcraft.jsch.SftpException e) { // sftp.get: no such file
                                    status = "missing on server (" + file + ")";
                                }
                            }
                        }
                    } catch (IllegalArgumentException | StringIndexOutOfBoundsException e) {
                        status = "unreadable photo data";
                    }
                    index.append(csv(r.memberId())).append(',').append(csv(r.name())).append(',')
                            .append(csv(entry == null ? "" : entry)).append(',').append(csv(status)).append("\r\n");
                }
                zip.putNextEntry(new ZipEntry("index.csv"));
                zip.write(("﻿" + index).getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
                zip.finish();
                log.info("DB console: {} downloaded {} of {} member photos of {}", username, found, rows.size(), database);
            } finally {
                sftp.disconnect();
                c.lastUsed = Instant.now();
            }
        });
    }

    private static String uniqueName(java.util.Set<String> used, PhotoRow r, String ext) {
        String base = (safeName(r.memberId()) + " - " + safeName(r.name())).replaceAll("^ - | - $", "");
        if (base.isBlank()) base = "member";
        String name = base + "." + ext;
        for (int i = 2; !used.add(name.toLowerCase()); i++) name = base + " (" + i + ")." + ext;
        return name;
    }

    private static String safeName(String s) {
        return s == null ? "" : s.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").replaceAll("\\s+", " ").trim();
    }

    private static String extOf(String ext) {
        String e = ext.toLowerCase();
        return switch (e) { case "jpeg", "jfif", "jpe" -> "jpg"; case "png", "webp", "gif", "jpg", "heic" -> e; default -> "jpg"; };
    }

    private static String csv(String s) {
        String v = s == null ? "" : s;
        return v.matches(".*[\",\\r\\n].*") ? "\"" + v.replace("\"", "\"\"") + "\"" : v;
    }

    private static String shq(String s) {
        return "'" + s.replace("'", "'\\''") + "'";
    }

    private static String pgpassEscape(String s) {
        return s.replace("\\", "\\\\").replace(":", "\\:");
    }

    private static int waitExit(ChannelExec ch) {
        for (int i = 0; i < 100 && !ch.isClosed(); i++) {
            try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); break; }
        }
        return ch.getExitStatus();
    }

    private void requireDatabase(Console c, String username, String database) {
        if (database == null || !c.knownDatabases.contains(database)) {
            databases(username);
            if (database == null || !c.knownDatabases.contains(database))
                throw new ConsoleException("UNKNOWN_DATABASE", "Pick a database from the list.");
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private Connection open(Console c, String database, int timeoutSeconds) throws SQLException {
        Properties props = new Properties();
        props.setProperty("user", dbUser);
        props.setProperty("password", dbPassword == null ? "" : dbPassword);
        props.setProperty("ApplicationName", "GymBios DB Console (" + c.username + ")");
        props.setProperty("connectTimeout", "10");
        // server-side, so a timeout reads "canceling statement due to statement timeout"
        props.setProperty("options", "-c statement_timeout=" + (timeoutSeconds * 1000L));
        String url = "jdbc:postgresql://127.0.0.1:" + c.localPort + "/" + URLEncoder.encode(database, StandardCharsets.UTF_8);
        return DriverManager.getConnection(url, props);
    }

    private Console live(String username) {
        Console c = consoles.get(username);
        if (c == null) return null;
        if (!c.ssh.isConnected() || (!c.busy.get() && Instant.now().isAfter(expiry(c)))) {
            disconnect(username, "expired");
            return null;
        }
        return c;
    }

    private Console require(String username) {
        requireEnabled();
        Console c = live(username);
        if (c == null) throw new ConsoleException("NOT_CONNECTED", "Not connected — connect to the server again.");
        c.lastUsed = Instant.now();
        return c;
    }

    private Instant expiry(Console c) {
        Instant idle = c.lastUsed.plus(Duration.ofMinutes(idleMinutes));
        Instant hard = c.openedAt.plus(Duration.ofHours(maxHours));
        return idle.isBefore(hard) ? idle : hard;
    }

    private void requireEnabled() {
        if (!enabled) throw new ConsoleException("DISABLED", "The database console is turned off on this server.");
    }

    private void checkLock(String username) {
        List<Instant> list = failures.getOrDefault(username, List.of());
        Instant cutoff = Instant.now().minus(FAILURE_WINDOW);
        long recent = list.stream().filter(t -> t.isAfter(cutoff)).count();
        if (recent >= MAX_FAILURES) {
            Instant until = list.get(list.size() - 1).plus(FAILURE_WINDOW);
            long mins = Math.max(1, Duration.between(Instant.now(), until).toMinutes() + 1);
            throw new ConsoleException("LOCKED", "Too many wrong passwords. Try again in " + mins + " min.");
        }
    }

    private void recordFailure(String username) {
        Instant cutoff = Instant.now().minus(FAILURE_WINDOW);
        failures.compute(username, (k, list) -> {
            List<Instant> next = new ArrayList<>();
            if (list != null) list.stream().filter(t -> t.isAfter(cutoff)).forEach(next::add);
            next.add(Instant.now());
            return next;
        });
    }

    static String dbNameOf(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) return null;
        String s = jdbcUrl.contains("?") ? jdbcUrl.substring(0, jdbcUrl.indexOf('?')) : jdbcUrl;
        return s.substring(s.lastIndexOf('/') + 1);
    }

    private static String abbreviate(String s, int max) {
        String one = s.replaceAll("\\s+", " ").trim();
        return one.length() > max ? one.substring(0, max) + "…" : one;
    }

    static String fingerprint(byte[] key) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(key);
            return "SHA256:" + Base64.getEncoder().withoutPadding().encodeToString(d);
        } catch (Exception e) {
            return "unknown";
        }
    }

    /** Accepts the server's key when it matches the pin (or there is no pin), and remembers what it saw. */
    private static final class PinningRepository implements HostKeyRepository {
        private final String pin; private final AtomicReference<String> seen;
        PinningRepository(String pin, AtomicReference<String> seen) { this.pin = pin == null ? "" : pin.trim(); this.seen = seen; }
        @Override public int check(String host, byte[] key) {
            String fp = fingerprint(key);
            seen.set(fp);
            return pin.isEmpty() || pin.equals(fp) ? OK : CHANGED;
        }
        @Override public void add(HostKey hostkey, UserInfo ui) { }
        @Override public void remove(String host, String type) { }
        @Override public void remove(String host, String type, byte[] key) { }
        @Override public String getKnownHostsRepositoryID() { return "db-console"; }
        @Override public HostKey[] getHostKey() { return new HostKey[0]; }
        @Override public HostKey[] getHostKey(String host, String type) { return new HostKey[0]; }
    }

    /** Answers keyboard-interactive password prompts; refuses anything else. */
    private static final class PasswordUserInfo implements UserInfo, UIKeyboardInteractive {
        private final String password;
        PasswordUserInfo(String password) { this.password = password; }
        @Override public String getPassphrase() { return null; }
        @Override public String getPassword() { return password; }
        @Override public boolean promptPassword(String message) { return true; }
        @Override public boolean promptPassphrase(String message) { return false; }
        @Override public boolean promptYesNo(String message) { return false; }
        @Override public void showMessage(String message) { }
        @Override public String[] promptKeyboardInteractive(String destination, String name, String instruction,
                                                            String[] prompt, boolean[] echo) {
            String[] answers = new String[prompt.length];
            java.util.Arrays.fill(answers, password);
            return answers;
        }
    }
}
