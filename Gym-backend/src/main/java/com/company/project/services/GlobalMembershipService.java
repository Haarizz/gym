package com.company.project.services;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.GlobalBranchDiscovery;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.entities.UserMembershipEntry;
import com.company.project.controlplane.repositories.GlobalBranchDiscoveryRepository;
import com.company.project.controlplane.repositories.TenantRepository;
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
    // not past expiry — plus this gym's member features open (not suspended, not held
    // back by payment approval), the gate TenantContextFilter applies.
    private static final String ACTIVE_MEMBERSHIP_SQL =
            "SELECT 1 FROM members WHERE global_user_id = ?"
                    + " AND LOWER(membership_status) = 'active'"
                    + " AND " + MemberAccessState.SQL_ALLOWS_MEMBER_FEATURES
                    + " AND (COALESCE(expiry_date, membership_end_date) IS NULL"
                    + "      OR COALESCE(expiry_date, membership_end_date) >= ?)"
                    + " LIMIT 1";

    // A purchase made at some point (pending or approved, not itself rejected) — used to
    // tell whether a rejected purchase elsewhere has been superseded by this one.
    private static final String PURCHASE_SINCE_SQL =
            "SELECT 1 FROM members WHERE global_user_id = ?"
                    + " AND (approval_status IS NULL OR approval_status <> 'REJECTED')"
                    + " AND join_date >= ?"
                    + " LIMIT 1";

    // The account's members row in one gym, for the app's gym switcher. One row per
    // account per gym; the newest wins should a second one ever exist.
    private static final String MEMBERSHIP_DETAILS_SQL =
            "SELECT branch_id, membership_type, membership_status, approval_status, membership_suspended,"
                    + " COALESCE(expiry_date, membership_end_date) AS ends_at"
                    + " FROM members WHERE global_user_id = ?"
                    + " ORDER BY id DESC LIMIT 1";

    static final String STATUS_ACTIVE = "ACTIVE";
    static final String STATUS_EXPIRED = "EXPIRED";
    static final String STATUS_INACTIVE = "INACTIVE";
    static final String STATUS_UNAVAILABLE = "UNAVAILABLE";

    private final UserMembershipRepository userMembershipRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;
    private final DataSource primaryDataSource;
    private final TenantRepository tenantRepository;
    private final GlobalBranchDiscoveryRepository globalBranchDiscoveryRepository;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    @Value("${tenant.routing.default-tenant-slug:default}")
    private String defaultTenantSlug;

    public GlobalMembershipService(UserMembershipRepository userMembershipRepository,
                                   TenantDataSourceRegistry tenantDataSourceRegistry,
                                   @Qualifier("primaryDataSource") DataSource primaryDataSource,
                                   TenantRepository tenantRepository,
                                   GlobalBranchDiscoveryRepository globalBranchDiscoveryRepository) {
        this.userMembershipRepository = userMembershipRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
        this.primaryDataSource = primaryDataSource;
        this.tenantRepository = tenantRepository;
        this.globalBranchDiscoveryRepository = globalBranchDiscoveryRepository;
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
     * True if this account bought a membership in a gym other than the current one at
     * or after {@code since} — a rejected purchase here is then superseded and must not
     * be approved after all (see MemberService.approveRejectedPayment).
     */
    public boolean hasPurchaseInAnotherGymSince(Long globalUserId, LocalDateTime since) {
        if (globalUserId == null || since == null) {
            return false;
        }
        String currentTenant = currentTenantSlug();
        try {
            for (UserMembershipEntry entry : userMembershipRepository.findByGlobalUserId(globalUserId)) {
                if (entry.getTenantSlug().equals(currentTenant)) {
                    continue;
                }
                if (hasPurchaseSince(entry.getTenantSlug(), globalUserId, since)) {
                    return true;
                }
            }
        } catch (Exception e) {
            log.warn("Could not read membership index for global user {}: {}", globalUserId, e.getMessage());
        }
        return false;
    }

    private boolean hasPurchaseSince(String tenantSlug, Long globalUserId, LocalDateTime since) {
        try (Connection conn = dataSourceFor(tenantSlug).getConnection();
             PreparedStatement stmt = conn.prepareStatement(PURCHASE_SINCE_SQL)) {
            stmt.setLong(1, globalUserId);
            stmt.setTimestamp(2, Timestamp.valueOf(since));
            try (ResultSet rs = stmt.executeQuery()) {
                return rs.next();
            }
        } catch (Exception e) {
            log.warn("Could not check purchases of global user {} in tenant '{}': {}",
                    globalUserId, tenantSlug, e.getMessage());
            return false;
        }
    }

    /**
     * Every gym this account is a member of, active memberships first — the app's gym
     * switcher, and how it picks its gym again when it has none stored locally (fresh
     * install, new device). An index entry whose members row has since been deleted is
     * left out.
     */
    public List<MobileLinkedGymDTO> findLinkedGyms(Long globalUserId) {
        if (globalUserId == null) {
            return List.of();
        }
        List<MobileLinkedGymDTO> gyms = new ArrayList<>();
        try {
            for (UserMembershipEntry entry : userMembershipRepository.findByGlobalUserId(globalUserId)) {
                MobileLinkedGymDTO gym = describeMembership(entry.getTenantSlug(), globalUserId);
                if (gym != null) {
                    gyms.add(gym);
                }
            }
        } catch (Exception e) {
            log.warn("Could not read membership index for global user {}: {}", globalUserId, e.getMessage());
        }
        gyms.sort(Comparator.comparing(MobileLinkedGymDTO::active).reversed()
                .thenComparing(MobileLinkedGymDTO::gymName, String.CASE_INSENSITIVE_ORDER));
        return gyms;
    }

    /** This account's membership at one gym, or null when that gym holds no members row for it. */
    private MobileLinkedGymDTO describeMembership(String tenantSlug, Long globalUserId) {
        Long branchId;
        String planName;
        String status;
        LocalDateTime endsAt;
        try (Connection conn = dataSourceFor(tenantSlug).getConnection();
             PreparedStatement stmt = conn.prepareStatement(MEMBERSHIP_DETAILS_SQL)) {
            stmt.setLong(1, globalUserId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (!rs.next()) {
                    return null;
                }
                long branch = rs.getLong("branch_id");
                branchId = rs.wasNull() ? null : branch;
                planName = rs.getString("membership_type");
                Timestamp ends = rs.getTimestamp("ends_at");
                endsAt = ends == null ? null : ends.toLocalDateTime();
                status = statusOf(rs.getString("membership_status"), rs.getString("approval_status"),
                        rs.getBoolean("membership_suspended"), endsAt, LocalDateTime.now());
            }
        } catch (Exception e) {
            // Still list the gym, so one unreachable database doesn't hide a membership.
            log.warn("Could not read membership of global user {} in tenant '{}': {}",
                    globalUserId, tenantSlug, e.getMessage());
            return new MobileLinkedGymDTO(tenantSlug, false, tenantName(tenantSlug), null, null, null,
                    STATUS_UNAVAILABLE, null);
        }

        String gymName = null;
        String branchName = null;
        if (branchId != null) {
            try {
                Optional<GlobalBranchDiscovery> branch =
                        globalBranchDiscoveryRepository.findByTenantSlugAndBranchId(tenantSlug, branchId);
                if (branch.isPresent()) {
                    gymName = branch.get().getGymName();
                    branchName = branch.get().getBranchName();
                }
            } catch (Exception e) {
                log.warn("Could not read branch {} of tenant '{}': {}", branchId, tenantSlug, e.getMessage());
            }
        }
        if (gymName == null || gymName.isBlank()) {
            gymName = tenantName(tenantSlug);
        }
        return new MobileLinkedGymDTO(tenantSlug, STATUS_ACTIVE.equals(status), gymName, branchId, branchName,
                planName, status, endsAt == null ? null : endsAt.toLocalDate());
    }

    /**
     * One status for the switcher. Gives the same "active" answer as ACTIVE_MEMBERSHIP_SQL;
     * when it isn't active, says why — the gym's access gate first, as TenantContextFilter
     * applies it.
     */
    static String statusOf(String membershipStatus, String approvalStatus, boolean suspended,
                           LocalDateTime endsAt, LocalDateTime now) {
        MemberAccessState access = MemberAccessState.of(suspended, approvalStatus, membershipStatus);
        if (!access.allowsMemberFeatures()) {
            return access.name();
        }
        if ((endsAt != null && endsAt.isBefore(now)) || "expired".equalsIgnoreCase(membershipStatus)) {
            return STATUS_EXPIRED;
        }
        if (!"active".equalsIgnoreCase(membershipStatus)) {
            return STATUS_INACTIVE;
        }
        return STATUS_ACTIVE;
    }

    /** The gym's name from the control plane, or its slug if that can't be read. */
    private String tenantName(String tenantSlug) {
        try {
            return tenantRepository.findBySlug(tenantSlug)
                    .map(Tenant::getName)
                    .filter(name -> !name.isBlank())
                    .orElse(tenantSlug);
        } catch (Exception e) {
            log.warn("Could not read name of tenant '{}': {}", tenantSlug, e.getMessage());
            return tenantSlug;
        }
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
        if (!MemberAccessState.of(member).allowsMemberFeatures()) {
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
