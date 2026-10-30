package com.company.project.services.gymimport;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.UserMembershipEntry;
import com.company.project.controlplane.repositories.UserMembershipRepository;
import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.services.accounts.GlobalAccountService;
import com.company.project.services.accounts.IdentityField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.BiConsumer;

/**
 * App access for members brought over by Import Gym: each gets a GymBios account
 * linked to their gym record, the same as a desk sign-up
 * (docs/global-accounts-for-gym-created-members-plan.md §1), so they can sign in to
 * the app straight away.
 *
 * Username — their member number from the previous system (GYM00001). Usernames are
 * unique across every gym, so a number already taken anywhere gets this gym's ID after
 * it (GYM00001.helenz). Password — the shared starting password
 * (app.import.member-password), which members change in the app.
 *
 * Every imported member gets one, expired or frozen too: what they can do at the gym
 * is decided by their membership, not by the account. Only imported members without
 * an account are touched, so running it again picks up where it stopped. Plain JDBC
 * on the gym's database, like GymLoginMigrationService.
 */
@Service
public class ImportedMemberAccountService {

    private static final Logger log = LoggerFactory.getLogger(ImportedMemberAccountService.class);

    /** created_by on the accounts made here. */
    public static final String CREATED_BY = "gym-import";

    /** A username no login can have — findClash with it checks only the email. */
    private static final String NO_USERNAME = "-";

    public enum Outcome { CREATED, CREATED_WITH_GYM_ID, FAILED }

    public record Row(long memberId, String memberNo, String name, String username, Outcome outcome, String detail) {}

    private record Candidate(long id, String memberNo, String name, String phone, String email, Member identity) {}

    private final TenantDataSourceRegistry tenantDataSources;
    private final GlobalAccountService accounts;
    private final UserMembershipRepository userMembershipRepository;
    private final String startingPassword;

    public ImportedMemberAccountService(TenantDataSourceRegistry tenantDataSources,
                                        GlobalAccountService accounts,
                                        UserMembershipRepository userMembershipRepository,
                                        @Value("${app.import.member-password:member@123}") String startingPassword) {
        this.tenantDataSources = tenantDataSources;
        this.accounts = accounts;
        this.userMembershipRepository = userMembershipRepository;
        this.startingPassword = startingPassword;
    }

    /**
     * Creates the accounts for one gym's imported members. A dry run only works out
     * the usernames. progress, if given, gets (done, total) after each member.
     */
    public Map<String, Object> createAccounts(String slug, boolean dryRun, BiConsumer<Integer, Integer> progress) {
        if (slug == null || !tenantDataSources.hasConnection(slug)) {
            throw new BusinessRuleViolationException("No gym with the ID \"" + slug + "\".");
        }
        JdbcTemplate gym = new JdbcTemplate(tenantDataSources.getDataSource(slug));
        List<Candidate> members = gym.query(
                "SELECT * FROM members WHERE created_by = ? AND global_user_id IS NULL ORDER BY id",
                (rs, i) -> candidate(rs), LegacyGymTransformer.MARK);

        String passwordHash = dryRun ? null : accounts.hashPassword(startingPassword);
        String gymSuffix = "." + slug.replace('-', '_');
        Set<String> taken = new HashSet<>();   // usernames given out earlier in this run
        Map<Outcome, Integer> counts = new EnumMap<>(Outcome.class);
        List<Row> rows = new ArrayList<>();
        for (int i = 0; i < members.size(); i++) {
            Candidate c = members.get(i);
            Row row;
            try {
                row = handle(c, slug, gym, gymSuffix, passwordHash, taken, dryRun);
            } catch (Exception e) {
                log.error("Could not create an app account for imported member {} in '{}'", c.id(), slug, e);
                row = new Row(c.id(), c.memberNo(), c.name(), null, Outcome.FAILED, e.getMessage());
            }
            counts.merge(row.outcome(), 1, Integer::sum);
            rows.add(row);
            if (progress != null) progress.accept(i + 1, members.size());
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("dry_run", dryRun);
        out.put("starting_password", startingPassword);
        out.put("members", members.size());
        out.put("created", counts.getOrDefault(Outcome.CREATED, 0) + counts.getOrDefault(Outcome.CREATED_WITH_GYM_ID, 0));
        out.put("with_gym_id", rows.stream().filter(r -> r.outcome() == Outcome.CREATED_WITH_GYM_ID).map(this::view).toList());
        out.put("failed", rows.stream().filter(r -> r.outcome() == Outcome.FAILED).map(this::view).toList());
        return out;
    }

    private Row handle(Candidate c, String slug, JdbcTemplate gym, String gymSuffix, String passwordHash,
                       Set<String> taken, boolean dryRun) {
        String plain = plainUsername(c.memberNo());
        String withGymId = plain.substring(0, Math.min(plain.length(), 50 - gymSuffix.length())) + gymSuffix;
        String username = plain.length() >= 3 && isFree(plain, taken) ? plain
                : isFree(withGymId, taken) ? withGymId : null;
        if (username == null) {
            return new Row(c.id(), c.memberNo(), c.name(), null, Outcome.FAILED,
                    "Both " + plain + " and " + withGymId + " are already taken — create the account from the member page.");
        }
        // A member's own email is kept (unverified) unless it's already someone's login —
        // then it's probably their own account, which only they can link.
        String email = usableEmail(c.email());
        if (email != null && accounts.findClash(NO_USERNAME, email).isPresent()) {
            return new Row(c.id(), c.memberNo(), c.name(), null, Outcome.FAILED,
                    "Their email " + email + " already has a GymBios account — use \"Link existing account\" on the member page.");
        }

        if (!dryRun) {
            long accountId = accounts.createDeskAccountHashed(c.name(), username, email, c.phone(), passwordHash, CREATED_BY);
            accounts.writeProfile(accountId, IdentityField.valuesOf(c.identity()), EnumSet.allOf(IdentityField.class));
            int linked = gym.update("UPDATE members SET global_user_id = ?, app_username = ?, app_access_enabled = TRUE"
                    + " WHERE id = ? AND global_user_id IS NULL", accountId, username, c.id());
            if (linked != 1) {
                throw new IllegalStateException("member was linked to another account meanwhile");
            }
            if (userMembershipRepository.findByGlobalUserIdAndTenantSlug(accountId, slug).isEmpty()) {
                userMembershipRepository.save(new UserMembershipEntry(accountId, slug, c.id()));
            }
        }
        taken.add(username.toLowerCase(Locale.ROOT));
        return new Row(c.id(), c.memberNo(), c.name(), username,
                username.equals(plain) ? Outcome.CREATED : Outcome.CREATED_WITH_GYM_ID, null);
    }

    private boolean isFree(String username, Set<String> taken) {
        return !taken.contains(username.toLowerCase(Locale.ROOT)) && accounts.findClash(username, null).isEmpty();
    }

    /** The member number as a username: only the characters usernames allow. */
    static String plainUsername(String memberNo) {
        String u = memberNo == null ? "" : memberNo.trim().replaceAll("[^A-Za-z0-9_.]", "");
        return u.length() > 50 ? u.substring(0, 50) : u;
    }

    private static String usableEmail(String email) {
        if (email == null || email.isBlank() || email.trim().toLowerCase(Locale.ROOT).endsWith("@family.local")) {
            return null;
        }
        return email.trim();
    }

    private Map<String, Object> view(Row r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("member_id", r.memberId());
        m.put("member_no", r.memberNo());
        m.put("name", r.name());
        m.put("username", r.username());
        m.put("detail", r.detail());
        return m;
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
        return new Candidate(rs.getLong("id"), rs.getString("member_id"), rs.getString("name"),
                rs.getString("phone"), rs.getString("email"), identity);
    }

    private static Double number(ResultSet rs, String column) throws SQLException {
        Object v = rs.getObject(column);
        return v instanceof Number n ? n.doubleValue() : null;
    }
}
