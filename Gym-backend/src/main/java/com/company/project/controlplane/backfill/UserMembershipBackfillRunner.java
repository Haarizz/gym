package com.company.project.controlplane.backfill;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.entities.UserMembershipEntry;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.repositories.UserMembershipRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * One-time, manually-triggered backfill of user_memberships for members rows
 * linked to a GymBios app account (members.global_user_id) before that index
 * existed. New links are indexed as they happen (MemberService.linkGlobalUser,
 * family invitation claims), and a member opening their own gym's community
 * indexes themselves — this just makes every existing member count for other
 * gyms' Community right away. Disabled by default; run once with:
 *   --user-membership.backfill.enabled=true
 * Idempotent: skips any (global user, tenant) already indexed, so it is safe to
 * re-run. Read-only against tenant databases.
 *
 * With tenant routing on, it walks every Tenant with a real TenantConnection.
 * With routing off there is one database, indexed under the default slug —
 * the same slug GlobalMembershipService resolves for requests in that mode.
 */
@Component
@ConditionalOnProperty(name = "user-membership.backfill.enabled", havingValue = "true")
public class UserMembershipBackfillRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(UserMembershipBackfillRunner.class);

    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final UserMembershipRepository userMembershipRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;
    private final DataSource primaryDataSource;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    @Value("${tenant.routing.default-tenant-slug:default}")
    private String defaultTenantSlug;

    public UserMembershipBackfillRunner(
            TenantRepository tenantRepository,
            TenantConnectionRepository tenantConnectionRepository,
            UserMembershipRepository userMembershipRepository,
            TenantDataSourceRegistry tenantDataSourceRegistry,
            @Qualifier("primaryDataSource") DataSource primaryDataSource) {
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.userMembershipRepository = userMembershipRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
        this.primaryDataSource = primaryDataSource;
    }

    @Override
    public void run(String... args) {
        int indexed = 0;
        if (!tenantRoutingEnabled) {
            indexed += backfill(defaultTenantSlug, primaryDataSource);
        } else {
            for (Tenant tenant : tenantRepository.findAll()) {
                if (tenantConnectionRepository.findByTenantId(tenant.getId()).isEmpty()) {
                    continue;
                }
                try {
                    indexed += backfill(tenant.getSlug(), tenantDataSourceRegistry.getDataSource(tenant.getSlug()));
                } catch (Exception e) {
                    log.warn("UserMembershipBackfillRunner: skipped tenant '{}' — {}", tenant.getSlug(), e.getMessage());
                }
            }
        }
        log.info("UserMembershipBackfillRunner: indexed {} new user_memberships row(s)", indexed);
    }

    private int backfill(String tenantSlug, DataSource dataSource) {
        int indexed = 0;
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "SELECT id, global_user_id FROM members WHERE global_user_id IS NOT NULL ORDER BY id")) {
            while (rs.next()) {
                long memberId = rs.getLong("id");
                long globalUserId = rs.getLong("global_user_id");
                if (userMembershipRepository.findByGlobalUserIdAndTenantSlug(globalUserId, tenantSlug).isPresent()) {
                    continue;
                }
                try {
                    userMembershipRepository.save(new UserMembershipEntry(globalUserId, tenantSlug, memberId));
                    indexed++;
                } catch (Exception e) {
                    log.warn("Skipped user_memberships row for global user {} tenant '{}' — {}",
                            globalUserId, tenantSlug, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("UserMembershipBackfillRunner: could not read members of tenant '{}' — {}", tenantSlug, e.getMessage());
        }
        return indexed;
    }
}
