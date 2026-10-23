package com.company.project.services.accounts;

import com.company.project.community.global.identity.TenantDataSources;
import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.AccountLinkRequest;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.entities.UserMembershipEntry;
import com.company.project.controlplane.repositories.AccountLinkRequestRepository;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.controlplane.repositories.UserMembershipRepository;
import com.company.project.entities.Member;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Moves gym-only logins (members.user_id → a users row in the gym's own database) to
 * GymBios accounts (docs/global-accounts-for-gym-created-members-plan.md §4).
 *
 * Never automatic: a platform admin runs it from AccountMigrationController, a dry run
 * first. Per member it decides one {@link Outcome}; only MIGRATE, LINK_REQUEST and
 * RETIRE_GYM_LOGIN change anything. Safe to re-run — handled members are skipped and an
 * interrupted MIGRATE resumes on the account it already created.
 *
 * The old login is retired, not deleted: its users row is disabled (other rows — posts,
 * roles, branches — still reference it) and its user_directory entry removed, so signing
 * in with the same username and password now reaches the GymBios account. Tokens issued
 * to the old login stop working (JwtAuthenticationFilter rejects disabled users), so the
 * member signs in once more.
 *
 * Gyms are read with plain JDBC on their own DataSource, like UserMembershipBackfillRunner.
 */
@Service
public class GymLoginMigrationService {

    private static final Logger log = LoggerFactory.getLogger(GymLoginMigrationService.class);

    public enum Outcome {
        /** New GymBios account with the same username and password, linked; gym login retired. */
        MIGRATE,
        /** The email already has a GymBios account: link request sent, gym login kept until accepted. */
        LINK_REQUEST,
        /** A link request is already waiting for the account owner. */
        ALREADY_REQUESTED,
        /** Already linked to a GymBios account (e.g. an accepted request): gym login retired. */
        RETIRE_GYM_LOGIN,
        /** The username belongs to another login in the main database — needs a person to decide. */
        BLOCKED_USERNAME,
        /** The login also holds a staff role; staff logins stay as they are. */
        SKIPPED_STAFF_LOGIN,
        /** members.user_id points at no users row. */
        SKIPPED_MISSING_LOGIN,
        FAILED
    }

    public record Row(long memberId, String memberName, String username, String email, Outcome outcome, String detail) {}

    public record GymReport(String tenantSlug, String gymName, Map<Outcome, Integer> counts, List<Row> rows, String error) {}

    public record Report(boolean dryRun, LocalDateTime ranAt, List<GymReport> gyms) {}

    /** One member with a gym-only login, as read from the gym's database. */
    record Candidate(long memberId, String memberName, Long globalUserId, Long loginId, String username,
                     String loginEmail, String memberEmail, String passwordHash, boolean staffLogin, Member identity) {

        /** The login's own email first (what they sign in with), else the member record's. */
        String email() {
            if (usable(loginEmail)) return loginEmail.trim();
            return usable(memberEmail) ? memberEmail.trim() : null;
        }

        private static boolean usable(String e) {
            return StringUtils.hasText(e) && !e.trim().toLowerCase().endsWith("@family.local");
        }
    }

    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;
    private final TenantDataSources tenantDataSources;
    private final DataSource primaryDataSource;
    private final GlobalAccountService accounts;
    private final UserDirectoryRepository userDirectoryRepository;
    private final UserMembershipRepository userMembershipRepository;
    private final AccountLinkRequestRepository linkRequestRepository;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    @Value("${tenant.routing.default-tenant-slug:default}")
    private String defaultTenantSlug;

    public GymLoginMigrationService(TenantRepository tenantRepository,
                                    TenantConnectionRepository tenantConnectionRepository,
                                    TenantDataSourceRegistry tenantDataSourceRegistry,
                                    TenantDataSources tenantDataSources,
                                    @Qualifier("primaryDataSource") DataSource primaryDataSource,
                                    GlobalAccountService accounts,
                                    UserDirectoryRepository userDirectoryRepository,
                                    UserMembershipRepository userMembershipRepository,
                                    AccountLinkRequestRepository linkRequestRepository) {
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
        this.tenantDataSources = tenantDataSources;
        this.primaryDataSource = primaryDataSource;
        this.accounts = accounts;
        this.userDirectoryRepository = userDirectoryRepository;
        this.userMembershipRepository = userMembershipRepository;
        this.linkRequestRepository = linkRequestRepository;
    }

    /**
     * @param dryRun     report only — nothing is written anywhere
     * @param onlyTenant run a single gym (e.g. QA first), or null for every gym
     */
    public Report run(boolean dryRun, String onlyTenant) {
        List<GymReport> gyms = new ArrayList<>();
        if (!tenantRoutingEnabled) {
            // One database: gym logins already live in the main users table, which is
            // also where GymBios accounts are — there's nothing to move.
            gyms.add(new GymReport(defaultTenantSlug, null, new EnumMap<>(Outcome.class), List.of(),
                    "Tenant routing is off: gym logins and GymBios accounts share one database, nothing to migrate."));
            return new Report(dryRun, LocalDateTime.now(), gyms);
        }
        for (Tenant tenant : tenantRepository.findAll()) {
            String slug = tenant.getSlug();
            if (onlyTenant != null && !onlyTenant.equals(slug)) {
                continue;
            }
            String gymName = tenantDataSources.gymName(slug).orElse(slug);
            if (tenantConnectionRepository.findByTenantId(tenant.getId()).isEmpty()) {
                gyms.add(new GymReport(slug, gymName, new EnumMap<>(Outcome.class), List.of(),
                        "No database of its own yet — skipped."));
                continue;
            }
            try {
                gyms.add(processGym(slug, gymName, tenantDataSourceRegistry.getDataSource(slug), dryRun));
            } catch (Exception e) {
                log.error("Gym-login migration failed for tenant '{}'", slug, e);
                gyms.add(new GymReport(slug, gymName, new EnumMap<>(Outcome.class), List.of(), e.getMessage()));
            }
        }
        return new Report(dryRun, LocalDateTime.now(), gyms);
    }

    private GymReport processGym(String slug, String gymName, DataSource gymDb, boolean dryRun) {
        if (gymDb == primaryDataSource) {
            return new GymReport(slug, gymName, new EnumMap<>(Outcome.class), List.of(),
                    "Lives in the main database — skipped.");
        }
        JdbcTemplate gym = new JdbcTemplate(gymDb);
        List<Candidate> candidates = gym.query(
                "SELECT m.*, u.id AS login_id, u.username AS login_username, u.email AS login_email,"
                        + " u.password_hash AS login_password_hash,"
                        + " EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id"
                        + "   WHERE ur.user_id = u.id AND r.role_name <> 'MEMBER') AS staff_login"
                        + " FROM members m LEFT JOIN users u ON u.id = m.user_id"
                        + " WHERE m.user_id IS NOT NULL ORDER BY m.id",
                (rs, i) -> candidate(rs));

        Map<Outcome, Integer> counts = new EnumMap<>(Outcome.class);
        List<Row> rows = new ArrayList<>();
        for (Candidate c : candidates) {
            Row row;
            try {
                row = handle(c, slug, gymName, gym, dryRun);
            } catch (Exception e) {
                log.error("Gym-login migration failed for member {} in '{}'", c.memberId(), slug, e);
                row = row(c, Outcome.FAILED, e.getMessage());
            }
            counts.merge(row.outcome(), 1, Integer::sum);
            rows.add(row);
        }
        return new GymReport(slug, gymName, counts, rows, null);
    }

    Row handle(Candidate c, String slug, String gymName, JdbcTemplate gym, boolean dryRun) {
        if (c.loginId() == null) {
            return row(c, Outcome.SKIPPED_MISSING_LOGIN, "members.user_id points at no login");
        }
        if (c.staffLogin()) {
            return row(c, Outcome.SKIPPED_STAFF_LOGIN, "login also holds a staff role");
        }
        if (c.globalUserId() != null) {
            if (!dryRun) retireGymLogin(c, slug, gym);
            return row(c, Outcome.RETIRE_GYM_LOGIN, "linked to GymBios account " + c.globalUserId());
        }

        // An earlier run created this account but stopped before linking: finish it.
        Optional<Long> resumed = accounts.findMigratedAccountId(c.username());
        if (resumed.isPresent()) {
            if (!dryRun) link(c, resumed.get(), slug, gym);
            return row(c, Outcome.MIGRATE, "resumed account " + resumed.get());
        }

        String email = c.email();
        if (email != null) {
            Optional<GlobalAccountService.Account> owner = accounts.findByEmail(email);
            if (owner.isPresent()) {
                if (hasOpenRequest(slug, c.memberId())) {
                    return row(c, Outcome.ALREADY_REQUESTED, "waiting for " + owner.get().username());
                }
                if (!dryRun) requestLink(c, owner.get().id(), slug, gymName);
                return row(c, Outcome.LINK_REQUEST, "email belongs to GymBios account " + owner.get().username());
            }
        }
        if (accounts.usernameTaken(c.username())) {
            return row(c, Outcome.BLOCKED_USERNAME, "username already used in the main database");
        }

        if (!dryRun) {
            long accountId = accounts.importGymLogin(c.memberName(), c.username(), email, c.passwordHash());
            link(c, accountId, slug, gym);
        }
        return row(c, Outcome.MIGRATE, email == null ? "no email — password reset will need support" : null);
    }

    /** Links the member to the account, copies their details onto it, and retires the gym login. */
    private void link(Candidate c, long accountId, String slug, JdbcTemplate gym) {
        accounts.writeProfile(accountId, IdentityField.valuesOf(c.identity()), EnumSet.allOf(IdentityField.class));
        int linked = gym.update("UPDATE members SET global_user_id = ? WHERE id = ? AND global_user_id IS NULL",
                accountId, c.memberId());
        if (linked != 1) {
            throw new IllegalStateException("member was linked by someone else meanwhile");
        }
        recordLink(accountId, slug, c.memberId());
        retireGymLogin(c, slug, gym);
    }

    private void retireGymLogin(Candidate c, String slug, JdbcTemplate gym) {
        gym.update("UPDATE users SET enabled = FALSE WHERE id = ?", c.loginId());
        gym.update("UPDATE members SET user_id = NULL WHERE id = ?", c.memberId());
        userDirectoryRepository.findByUsername(c.username())
                .filter(entry -> slug.equals(entry.getTenantSlug()))
                .ifPresent(userDirectoryRepository::delete);
    }

    private void recordLink(long accountId, String slug, long memberId) {
        if (userMembershipRepository.findByGlobalUserIdAndTenantSlug(accountId, slug).isEmpty()) {
            userMembershipRepository.save(new UserMembershipEntry(accountId, slug, memberId));
        }
    }

    private boolean hasOpenRequest(String slug, long memberId) {
        return linkRequestRepository.findByTenantSlugAndMemberIdAndStatus(slug, memberId, AccountLinkRequest.PENDING)
                .stream().anyMatch(AccountLinkRequest::isOpen);
    }

    private void requestLink(Candidate c, long accountId, String slug, String gymName) {
        AccountLinkRequest request = new AccountLinkRequest();
        request.setGlobalUserId(accountId);
        request.setTenantSlug(slug);
        request.setMemberId(c.memberId());
        request.setGymName(gymName);
        request.setMemberName(c.memberName());
        request.setRequestedBy(GlobalAccountService.MIGRATION_CREATOR);
        // Longer than a staff request: nobody at the desk is prompting the member.
        request.setExpiresAt(LocalDateTime.now().plusDays(60));
        linkRequestRepository.save(request);
    }

    private static Row row(Candidate c, Outcome outcome, String detail) {
        return new Row(c.memberId(), c.memberName(), c.username(), c.email(), outcome, detail);
    }

    private static Candidate candidate(ResultSet rs) throws SQLException {
        Member identity = new Member();
        identity.setName(rs.getString("name"));
        identity.setPhone(rs.getString("phone"));
        identity.setDateOfBirth(rs.getObject("date_of_birth", LocalDate.class));
        identity.setGender(rs.getString("gender"));
        identity.setNationality(rs.getString("nationality"));
        identity.setAddress(rs.getString("address"));
        identity.setEmergencyContact(rs.getString("emergency_contact"));
        identity.setEmergencyPhone(rs.getString("emergency_phone"));
        identity.setEmergencyContactName(rs.getString("emergency_contact_name"));
        identity.setEmergencyContactPhone(rs.getString("emergency_contact_phone"));
        identity.setBloodType(rs.getString("blood_type"));
        identity.setMedicalConditions(rs.getString("medical_conditions"));
        identity.setAllergies(rs.getString("allergies"));
        identity.setCurrentMedications(rs.getString("current_medications"));
        identity.setChronicIllnesses(rs.getString("chronic_illnesses"));
        identity.setHealthNotes(rs.getString("health_notes"));
        identity.setHeight(number(rs, "height"));
        identity.setWeight(number(rs, "weight"));
        identity.setPhotoUrl(rs.getString("photo_url"));

        Object loginId = rs.getObject("login_id");
        Object globalUserId = rs.getObject("global_user_id");
        return new Candidate(
                rs.getLong("id"),
                rs.getString("name"),
                globalUserId instanceof Number n ? n.longValue() : null,
                loginId instanceof Number n ? n.longValue() : null,
                rs.getString("login_username"),
                rs.getString("login_email"),
                rs.getString("email"),
                rs.getString("login_password_hash"),
                rs.getBoolean("staff_login"),
                identity);
    }

    private static Double number(ResultSet rs, String column) throws SQLException {
        Object v = rs.getObject(column);
        return v instanceof Number n ? n.doubleValue() : null;
    }
}
