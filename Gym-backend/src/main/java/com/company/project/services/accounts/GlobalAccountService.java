package com.company.project.services.accounts;

import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.exceptions.BusinessRuleViolationException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * GymBios app accounts — the main database's users / user_roles / user_profiles,
 * the same rows MobileAuthService creates for an in-app sign-up.
 *
 * Plain JDBC on the primary DataSource rather than the JPA repositories: staff call
 * this from a gym request, where TenantContextHolder routes JPA to that gym's own
 * database (and an open-session-in-view EntityManager is already pinned to it).
 * GlobalMembershipService reads the main database the same way.
 */
@Service
public class GlobalAccountService {

    /** A GymBios account holding only the MEMBER role — never a staff or platform login. */
    public record Account(long id, String username, String email, boolean emailVerified, String fullName) {}

    public enum Clash { USERNAME, EMAIL }

    // Accounts staff may look up, link or create: member-only. A main-database login
    // that also holds any other role (a primary-DB staff or platform account) is out
    // of reach for gyms and for password reset.
    private static final String MEMBER_ONLY =
            " EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id"
                    + "   WHERE ur.user_id = u.id AND r.role_name = 'MEMBER')"
                    + " AND NOT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id"
                    + "   WHERE ur.user_id = u.id AND r.role_name <> 'MEMBER')";

    private static final String ACCOUNT_SELECT =
            "SELECT u.id, u.username, u.email, u.email_verified, p.full_name"
                    + " FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id";

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final UserDirectoryRepository userDirectoryRepository;
    private final PasswordEncoder passwordEncoder;

    public GlobalAccountService(@Qualifier("primaryDataSource") DataSource primaryDataSource,
                                UserDirectoryRepository userDirectoryRepository,
                                PasswordEncoder passwordEncoder) {
        this.jdbc = new JdbcTemplate(primaryDataSource);
        this.transactions = new TransactionTemplate(new DataSourceTransactionManager(primaryDataSource));
        this.userDirectoryRepository = userDirectoryRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Whether a username or email is already someone's login anywhere: a GymBios
     * account, a gym's own login (user_directory — login checks it first, so a clash
     * there would send the new account's sign-in to that gym), or an in-app sign-up
     * still waiting for its email code.
     */
    public Optional<Clash> findClash(String username, String email) {
        String u = username.trim().toLowerCase();
        if (count("SELECT count(*) FROM users WHERE LOWER(username) = ?", u) > 0
                || userDirectoryRepository.existsByUsername(username.trim())
                || count("SELECT count(*) FROM mobile_pending_registrations WHERE username_normalized = ?"
                        + " AND status = 'PENDING' AND expires_at > NOW()", u) > 0) {
            return Optional.of(Clash.USERNAME);
        }
        if (email != null) {
            String e = email.trim().toLowerCase();
            if (count("SELECT count(*) FROM users WHERE LOWER(email) = ?", e) > 0
                    || userDirectoryRepository.existsByEmail(email.trim())
                    || count("SELECT count(*) FROM mobile_pending_registrations WHERE email_normalized = ?"
                            + " AND status = 'PENDING' AND expires_at > NOW()", e) > 0) {
                return Optional.of(Clash.EMAIL);
            }
        }
        return Optional.empty();
    }

    /**
     * Creates a GymBios account on someone's behalf at a gym's desk. Callers check
     * {@link #findClash} first; the unique constraints still reject a race. The email
     * starts unverified — staff typed it, the owner hasn't confirmed it.
     */
    public long createDeskAccount(String fullName, String username, String email, String phone,
                                  String rawPassword, String createdBy) {
        validateUsername(username);
        validatePassword(rawPassword);
        return createDeskAccountHashed(fullName, username, email, phone, passwordEncoder.encode(rawPassword), createdBy);
    }

    /** A password hashed for {@link #createDeskAccountHashed} — bulk sign-up hashes the shared one once. */
    public String hashPassword(String rawPassword) {
        validatePassword(rawPassword);
        return passwordEncoder.encode(rawPassword);
    }

    /** {@link #createDeskAccount} with the password already hashed ({@link #hashPassword}). */
    public long createDeskAccountHashed(String fullName, String username, String email, String phone,
                                        String passwordHash, String createdBy) {
        validateUsername(username);
        String cleanEmail = email != null && !email.isBlank() ? email.trim() : null;
        Long id = transactions.execute(status -> {
            Long userId = jdbc.queryForObject(
                    "INSERT INTO users (username, email, password_hash, enabled, email_verified, created_at, created_by)"
                            + " VALUES (?, ?, ?, TRUE, FALSE, NOW(), ?) RETURNING id",
                    Long.class, username.trim(), cleanEmail, passwordHash, createdBy);
            int roles = jdbc.update(
                    "INSERT INTO user_roles (user_id, role_id, created_at, created_by)"
                            + " SELECT ?, id, NOW(), ? FROM roles WHERE role_name = 'MEMBER'",
                    userId, createdBy);
            if (roles != 1) {
                throw new IllegalStateException("MEMBER role not found in the main database");
            }
            jdbc.update(
                    "INSERT INTO user_profiles (user_id, full_name, phone, created_at, created_by)"
                            + " VALUES (?, ?, ?, NOW(), ?)",
                    userId, fullName, phone, createdBy);
            return userId;
        });
        return id;
    }

    /** Marks accounts the gym-login migration created, so an interrupted run can resume them. */
    public static final String MIGRATION_CREATOR = "account-migration";

    /**
     * A GymBios account for an existing gym-only login (plan §4): same username and the
     * same password hash (both databases use the same encoder), so the member signs in
     * exactly as before. The email starts unverified — staff typed it originally.
     */
    public long importGymLogin(String fullName, String username, String email, String passwordHash) {
        String cleanEmail = email != null && !email.isBlank() ? email.trim() : null;
        Long id = transactions.execute(status -> {
            Long userId = jdbc.queryForObject(
                    "INSERT INTO users (username, email, password_hash, enabled, email_verified, created_at, created_by)"
                            + " VALUES (?, ?, ?, TRUE, FALSE, NOW(), ?) RETURNING id",
                    Long.class, username, cleanEmail, passwordHash, MIGRATION_CREATOR);
            int roles = jdbc.update(
                    "INSERT INTO user_roles (user_id, role_id, created_at, created_by)"
                            + " SELECT ?, id, NOW(), ? FROM roles WHERE role_name = 'MEMBER'",
                    userId, MIGRATION_CREATOR);
            if (roles != 1) {
                throw new IllegalStateException("MEMBER role not found in the main database");
            }
            jdbc.update("INSERT INTO user_profiles (user_id, full_name, created_at, created_by) VALUES (?, ?, NOW(), ?)",
                    userId, fullName != null && !fullName.isBlank() ? fullName : "Member", MIGRATION_CREATOR);
            return userId;
        });
        return id;
    }

    /** An account an earlier, interrupted migration run created for this username. */
    public Optional<Long> findMigratedAccountId(String username) {
        List<Long> ids = jdbc.queryForList("SELECT id FROM users WHERE LOWER(username) = ? AND created_by = ?",
                Long.class, username.trim().toLowerCase(), MIGRATION_CREATOR);
        return ids.size() == 1 ? Optional.of(ids.get(0)) : Optional.empty();
    }

    /** Any main-database login with this username (member or not), case-insensitive. */
    public boolean usernameTaken(String username) {
        String u = username.trim().toLowerCase();
        return count("SELECT count(*) FROM users WHERE LOWER(username) = ?", u) > 0
                || count("SELECT count(*) FROM mobile_pending_registrations WHERE username_normalized = ?"
                        + " AND status = 'PENDING' AND expires_at > NOW()", u) > 0;
    }

    /** The main-database login holding this email, if any (member or not). */
    public Optional<Account> findByEmail(String email) {
        return one(ACCOUNT_SELECT + " WHERE LOWER(u.email) = ?", email.trim().toLowerCase());
    }

    public Optional<Account> findById(long id) {
        return one(ACCOUNT_SELECT + " WHERE u.id = ?", id);
    }

    /** A member-only account by exact username or email (case-insensitive). */
    public Optional<Account> findMemberAccount(String usernameOrEmail) {
        String key = usernameOrEmail.trim().toLowerCase();
        return one(ACCOUNT_SELECT + " WHERE (LOWER(u.username) = ? OR LOWER(u.email) = ?) AND" + MEMBER_ONLY, key, key);
    }

    /** Password reset only ever goes to a verified address of a member-only account. */
    public Optional<Account> findMemberAccountByVerifiedEmail(String email) {
        return one(ACCOUNT_SELECT + " WHERE LOWER(u.email) = ? AND u.email_verified AND u.enabled AND" + MEMBER_ONLY,
                email.trim().toLowerCase());
    }

    public void setPassword(long id, String rawPassword) {
        validatePassword(rawPassword);
        jdbc.update("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
                passwordEncoder.encode(rawPassword), id);
    }

    /** The owner adds or changes their email from the app; it stays unverified until they enter the code. */
    public void setEmail(long id, String email) {
        String clean = email.trim();
        if (!clean.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("A valid email address is required.");
        }
        Optional<Account> current = findById(id);
        if (current.isPresent() && clean.equalsIgnoreCase(current.get().email())) {
            return;
        }
        if (count("SELECT count(*) FROM users WHERE LOWER(email) = ? AND id <> ?", clean.toLowerCase(), id) > 0
                || userDirectoryRepository.existsByEmail(clean)) {
            throw new BusinessRuleViolationException("This email is already used by another account.");
        }
        jdbc.update("UPDATE users SET email = ?, email_verified = FALSE, updated_at = NOW() WHERE id = ?", clean, id);
    }

    /** Marks the email verified — only if it's still the address the code was sent to. */
    public boolean markEmailVerified(long id, String email) {
        return jdbc.update("UPDATE users SET email_verified = TRUE, updated_at = NOW()"
                + " WHERE id = ? AND LOWER(email) = ?", id, email.trim().toLowerCase()) == 1;
    }

    /** The account's profile values (user_profiles), or empty if it has no profile row yet. */
    public Map<IdentityField, Object> readProfile(long userId) {
        List<Map<IdentityField, Object>> rows = jdbc.query(
                "SELECT * FROM user_profiles WHERE user_id = ?",
                (rs, i) -> {
                    Map<IdentityField, Object> values = new EnumMap<>(IdentityField.class);
                    for (IdentityField f : IdentityField.values()) {
                        Object v = switch (f) {
                            case DATE_OF_BIRTH -> rs.getObject(f.column, LocalDate.class);
                            case HEIGHT, WEIGHT -> {
                                Object n = rs.getObject(f.column);
                                yield n instanceof Number num ? num.doubleValue() : null;
                            }
                            default -> rs.getString(f.column);
                        };
                        values.put(f, v);
                    }
                    return values;
                }, userId);
        return rows.isEmpty() ? new EnumMap<>(IdentityField.class) : rows.get(0);
    }

    /**
     * Writes these identity fields onto the account's profile (a blank name or phone is
     * ignored). Creates the profile row if the account has none yet.
     */
    public void writeProfile(long userId, Map<IdentityField, Object> values, Set<IdentityField> fields) {
        List<String> sets = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        for (IdentityField f : fields) {
            Object v = IdentityField.blankToNull(values.get(f));
            if (v == null && f.required()) continue;
            sets.add(f.column + " = ?");
            args.add(v);
        }
        if (sets.isEmpty()) {
            return;
        }
        transactions.executeWithoutResult(status -> {
            if (count("SELECT count(*) FROM user_profiles WHERE user_id = ?", userId) == 0) {
                Object name = IdentityField.blankToNull(values.get(IdentityField.FULL_NAME));
                jdbc.update("INSERT INTO user_profiles (user_id, full_name, created_at) VALUES (?, ?, NOW())",
                        userId, name != null ? name : "Member");
            }
            List<Object> all = new ArrayList<>(args);
            all.add(userId);
            jdbc.update("UPDATE user_profiles SET " + String.join(", ", sets) + ", updated_at = NOW() WHERE user_id = ?",
                    all.toArray());
        });
    }

    static void validateUsername(String username) {
        if (username == null || !username.trim().matches("^[a-zA-Z0-9_.]{3,50}$")) {
            throw new IllegalArgumentException(
                    "Username must be 3–50 characters: letters, numbers, underscores or dots.");
        }
    }

    static void validatePassword(String password) {
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters.");
        }
    }

    private long count(String sql, Object... args) {
        Long n = jdbc.queryForObject(sql, Long.class, args);
        return n == null ? 0 : n;
    }

    private Optional<Account> one(String sql, Object... args) {
        List<Account> rows = jdbc.query(sql, (rs, i) -> new Account(
                rs.getLong(1), rs.getString(2), rs.getString(3), rs.getBoolean(4), rs.getString(5)), args);
        return rows.size() == 1 ? Optional.of(rows.get(0)) : Optional.empty();
    }
}
