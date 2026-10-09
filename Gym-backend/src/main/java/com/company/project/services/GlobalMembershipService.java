package com.company.project.services;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.UserMembershipEntry;
import com.company.project.controlplane.repositories.UserMembershipRepository;
import com.company.project.dto.mobile.profile.MobileLinkedGymDTO;
import com.company.project.entities.Member;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * A GymBios app account's memberships across gyms. The control-plane
 * user_memberships index says which tenant databases hold a members row linked
 * to the account; whether that membership is currently active is read live from
 * those databases (normally one or two), never mirrored.
 */
@Service
public class GlobalMembershipService {

    private static final Logger log = LoggerFactory.getLogger(GlobalMembershipService.class);

    // Same rule check-in applies (CheckInService.validateMembership): status "active",
    // not past expiry — plus not held back pending payment approval, the mobile
    // app-access gate (TenantContextFilter).
    private static final String ACTIVE_MEMBERSHIP_SQL =
            "SELECT 1 FROM members WHERE global_user_id = ?"
                    + " AND LOWER(membership_status) = 'active'"
                    + " AND (app_access_enabled IS NULL OR app_access_enabled)"
                    + " AND (COALESCE(expiry_date, membership_end_date) IS NULL"
                    + "      OR COALESCE(expiry_date, membership_end_date) >= ?)"
                    + " LIMIT 1";

    private final UserMembershipRepository userMembershipRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;
    private final DataSource primaryDataSource;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    @Value("${tenant.routing.default-tenant-slug:default}")
    private String defaultTenantSlug;

    public GlobalMembershipService(UserMembershipRepository userMembershipRepository,
                                   TenantDataSourceRegistry tenantDataSourceRegistry,
                                   @Qualifier("primaryDataSource") DataSource primaryDataSource) {
        this.userMembershipRepository = userMembershipRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
        this.primaryDataSource = primaryDataSource;
    }

    /**
     * Indexes a members row of the current tenant as belonging to this app account.
     * Best-effort and outside the caller's tenant transaction, like the family
     * invitation directory: it never fails the purchase/claim that linked them, and
     * a row orphaned by a later rollback just finds no member on the live check.
     */
    public void recordLink(Long globalUserId, Long memberId) {
        String tenantSlug = currentTenantSlug();
        if (globalUserId == null || memberId == null || tenantSlug == null) {
            return;
        }
        try {
            Optional<UserMembershipEntry> existing =
                    userMembershipRepository.findByGlobalUserIdAndTenantSlug(globalUserId, tenantSlug);
            if (existing.isPresent()) {
                if (!memberId.equals(existing.get().getMemberId())) {
                    existing.get().setMemberId(memberId);
                    userMembershipRepository.save(existing.get());
                }
                return;
            }
            userMembershipRepository.save(new UserMembershipEntry(globalUserId, tenantSlug, memberId));
        } catch (DataIntegrityViolationException e) {
            // A concurrent request indexed the same (user, tenant) first — nothing to do.
        } catch (Exception e) {
            log.warn("Could not index membership for global user {} in tenant '{}': {}",
                    globalUserId, tenantSlug, e.getMessage());
        }
    }

    /**
     * True if this account holds an active membership in a gym other than the
     * current one. The current gym's members row, if any, is already loaded by the
     * caller — check it with {@link #isActive(Member)}.
     */
    public boolean hasActiveMembershipInAnotherGym(Long globalUserId) {
        if (globalUserId == null) {
            return false;
        }
        String currentTenant = currentTenantSlug();
        try {
            for (UserMembershipEntry entry : userMembershipRepository.findByGlobalUserId(globalUserId)) {
                if (entry.getTenantSlug().equals(currentTenant)) {
                    continue;
                }
                if (hasActiveMembershipIn(entry.getTenantSlug(), globalUserId)) {
                    return true;
                }
            }
        } catch (Exception e) {
            log.warn("Could not read membership index for global user {}: {}", globalUserId, e.getMessage());
        }
        return false;
    }

    /**
     * Every gym this account is linked to, active memberships first, so the app can
     * pick its gym again when it has none stored locally (fresh install, new device).
     */
    public List<MobileLinkedGymDTO> findLinkedGyms(Long globalUserId) {
        if (globalUserId == null) {
            return List.of();
        }
        List<MobileLinkedGymDTO> gyms = new ArrayList<>();
        try {
            for (UserMembershipEntry entry : userMembershipRepository.findByGlobalUserId(globalUserId)) {
                gyms.add(new MobileLinkedGymDTO(entry.getTenantSlug(),
                        hasActiveMembershipIn(entry.getTenantSlug(), globalUserId)));
            }
        } catch (Exception e) {
            log.warn("Could not read membership index for global user {}: {}", globalUserId, e.getMessage());
        }
        gyms.sort(Comparator.comparing(MobileLinkedGymDTO::active).reversed());
        return gyms;
    }

    /**
     * The app account's name from its global profile (primary DB), for content it
     * writes in a gym where it has no members row to take the name from.
     */
    public Optional<String> findDisplayName(Long globalUserId) {
        try (Connection conn = primaryDataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement("SELECT full_name FROM user_profiles WHERE user_id = ?")) {
            stmt.setLong(1, globalUserId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    String name = rs.getString(1);
                    return name == null || name.isBlank() ? Optional.empty() : Optional.of(name.trim());
                }
            }
        } catch (Exception e) {
            log.warn("Could not read profile name of global user {}: {}", globalUserId, e.getMessage());
        }
        return Optional.empty();
    }

    /** In-memory twin of ACTIVE_MEMBERSHIP_SQL for a members row already loaded. */
    public static boolean isActive(Member member) {
        if (!"active".equalsIgnoreCase(member.getMembershipStatus())) {
            return false;
        }
        if (Boolean.FALSE.equals(member.getAppAccessEnabled())) {
            return false;
        }
        LocalDateTime expiry = member.getExpiryDate() != null ? member.getExpiryDate() : member.getMembershipEndDate();
        return expiry == null || !expiry.isBefore(LocalDateTime.now());
    }

    private boolean hasActiveMembershipIn(String tenantSlug, Long globalUserId) {
        try (Connection conn = dataSourceFor(tenantSlug).getConnection();
             PreparedStatement stmt = conn.prepareStatement(ACTIVE_MEMBERSHIP_SQL)) {
            stmt.setLong(1, globalUserId);
            stmt.setTimestamp(2, Timestamp.valueOf(LocalDateTime.now()));
            try (ResultSet rs = stmt.executeQuery()) {
                return rs.next();
            }
        } catch (Exception e) {
            // One unreachable gym must not take community access down everywhere.
            log.warn("Could not check membership of global user {} in tenant '{}': {}",
                    globalUserId, tenantSlug, e.getMessage());
            return false;
        }
    }

    /** Same resolution TenantRoutingDataSource applies to a request for this slug. */
    private DataSource dataSourceFor(String tenantSlug) {
        if (tenantRoutingEnabled && !tenantSlug.equals(defaultTenantSlug)
                && tenantDataSourceRegistry.hasConnection(tenantSlug)) {
            return tenantDataSourceRegistry.getDataSource(tenantSlug);
        }
        return primaryDataSource;
    }

    /**
     * The tenant the current request's data lives in. With routing off there is a
     * single database, which the index records under the default slug.
     */
    private String currentTenantSlug() {
        if (!tenantRoutingEnabled) {
            return defaultTenantSlug;
        }
        String tenant = TenantContextHolder.getCurrentTenant();
        return tenant == null || tenant.isBlank() ? null : tenant;
    }
}
