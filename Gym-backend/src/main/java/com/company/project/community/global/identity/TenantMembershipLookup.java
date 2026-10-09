package com.company.project.community.global.identity;

import com.company.project.community.global.identity.TenantDataSources.TenantDb;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Reads membership facts from a gym's own database with plain JDBC on an
 * explicit DataSource. Issues SELECTs only and never changes the request's
 * tenant context.
 *
 * When the gym lives in the shared primary database, a member row alone does
 * not prove membership of *this* gym, so the member's branch must be shown to
 * belong to it (via branches.gym_id, or the primary DB holding a single gym).
 * If that can't be established the lookup returns
 * {@link Result#UNDETERMINED} rather than guessing.
 */
@Component
public class TenantMembershipLookup {

    public enum Result { MEMBER, NOT_A_MEMBER, UNDETERMINED }

    public record Membership(long memberId, Long branchId, String branchName, boolean appAccessEnabled,
                             String memberName, String photoUrl) {}

    public record Lookup(Result result, Membership membership) {
        static Lookup of(Result result) { return new Lookup(result, null); }
    }

    public Lookup byGlobalUser(TenantDb db, long globalUserId) {
        return find(db, "global_user_id", globalUserId);
    }

    /** Member row linked to a tenant-local login (gym-created member credentials, or staff who are also members). */
    public Lookup byLocalUser(TenantDb db, long tenantUserId) {
        return find(db, "user_id", tenantUserId);
    }

    public Optional<String> branchName(TenantDb db, Long branchId) {
        if (branchId == null) {
            return Optional.empty();
        }
        List<String> names = new JdbcTemplate(db.dataSource())
                .queryForList("SELECT branch_name FROM branches WHERE id = ?", String.class, branchId);
        return names.isEmpty() ? Optional.empty() : Optional.ofNullable(names.get(0));
    }

    private Lookup find(TenantDb db, String column, long id) {
        JdbcTemplate jdbc = new JdbcTemplate(db.dataSource());
        List<Membership> rows = jdbc.query(
                "SELECT m.id, m.branch_id, b.branch_name, m.app_access_enabled, m.name, m.photo_url "
                        + "FROM members m LEFT JOIN branches b ON b.id = m.branch_id WHERE m." + column + " = ?",
                (rs, i) -> new Membership(
                        rs.getLong(1),
                        (Long) rs.getObject(2),
                        rs.getString(3),
                        // NULL means never restricted (column predates the approval flow).
                        !Boolean.FALSE.equals(rs.getObject(4)),
                        rs.getString(5),
                        rs.getString(6)),
                id);
        if (rows.isEmpty()) {
            return Lookup.of(Result.NOT_A_MEMBER);
        }
        if (rows.size() > 1) {
            return Lookup.of(Result.UNDETERMINED);
        }
        Membership membership = rows.get(0);
        if (db.primary() && !belongsToGym(jdbc, membership.branchId(), db.tenantSlug())) {
            return Lookup.of(Result.UNDETERMINED);
        }
        return new Lookup(Result.MEMBER, membership);
    }

    private boolean belongsToGym(JdbcTemplate jdbc, Long branchId, String gymSlug) {
        Integer gymCount = jdbc.queryForObject("SELECT count(*) FROM gyms", Integer.class);
        if (gymCount != null && gymCount == 1) {
            return true;
        }
        Integer hasGymColumn = jdbc.queryForObject("SELECT count(*) FROM information_schema.columns "
                + "WHERE table_schema = current_schema() AND table_name = 'branches' AND column_name = 'gym_id'", Integer.class);
        if (branchId == null || hasGymColumn == null || hasGymColumn == 0) {
            return false;
        }
        Integer match = jdbc.queryForObject("SELECT count(*) FROM branches b JOIN gyms g ON g.id = b.gym_id "
                + "WHERE b.id = ? AND g.slug = ?", Integer.class, branchId, gymSlug);
        return match != null && match == 1;
    }
}
