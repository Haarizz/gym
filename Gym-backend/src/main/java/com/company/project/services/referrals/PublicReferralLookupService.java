package com.company.project.services.referrals;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

/**
 * Resolves a referral code for the public /ref/{code} landing page, across every
 * active gym. Two kinds of code exist:
 *   APP — a member's own code from the mobile app (mobile_referral_profiles), which
 *         a new person claims in the app;
 *   GYM — a referral staff logged on the web Referrals page (referrals), which is
 *         applied at reception when the referee joins.
 * Plain JDBC per tenant, like MobileReferralService.findTenantForReferralCode, so it
 * runs without any tenant context. Only the gym name and the referrer's first name
 * leave this class.
 */
@Service
public class PublicReferralLookupService {

    private static final Logger log = LoggerFactory.getLogger(PublicReferralLookupService.class);

    public enum Kind { APP, GYM }

    public record Result(Kind kind, String code, String gymName, String referrerFirstName) {}

    private final TenantRepository tenantRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;

    public PublicReferralLookupService(TenantRepository tenantRepository,
                                       TenantDataSourceRegistry tenantDataSourceRegistry) {
        this.tenantRepository = tenantRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
    }

    public Optional<Result> lookup(String rawCode) {
        if (rawCode == null) return Optional.empty();
        String code = rawCode.trim();
        if (code.isEmpty() || code.length() > 64) return Optional.empty();

        for (Tenant tenant : tenantRepository.findAll()) {
            if (!"ACTIVE".equals(tenant.getStatus())
                    || !tenantDataSourceRegistry.hasConnection(tenant.getSlug())) {
                continue;
            }
            DataSource ds = tenantDataSourceRegistry.getDataSource(tenant.getSlug());
            try (Connection conn = ds.getConnection()) {
                // App codes are generated case-sensitively; match exactly, as the claim does.
                String appReferrer = queryName(conn,
                        "SELECT m.name FROM mobile_referral_profiles p "
                                + "LEFT JOIN members m ON m.id = p.member_id WHERE p.referral_code = ?",
                        code);
                if (appReferrer != null) {
                    return Optional.of(new Result(Kind.APP, code, tenant.getName(), firstName(appReferrer)));
                }
                // Staff-logged codes are stored upper-cased.
                String gymReferrer = queryName(conn,
                        "SELECT referrer_name FROM referrals WHERE referral_code = ?",
                        code.toUpperCase());
                if (gymReferrer != null) {
                    return Optional.of(new Result(Kind.GYM, code.toUpperCase(), tenant.getName(), firstName(gymReferrer)));
                }
            } catch (SQLException e) {
                log.error("Referral lookup failed in tenant {}", tenant.getSlug(), e);
            }
        }
        return Optional.empty();
    }

    /** The row's name, "" when the row exists with no name, null when there's no row. */
    private static String queryName(Connection conn, String sql, String code) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, code);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                String name = rs.getString(1);
                return name == null ? "" : name;
            }
        }
    }

    private static String firstName(String fullName) {
        String trimmed = fullName.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed.split("\\s+")[0];
    }
}
