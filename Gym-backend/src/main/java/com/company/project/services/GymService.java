package com.company.project.services;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.entities.TenantConnection;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.service.TenantProvisioningService;
import com.company.project.dto.GymRequestDTO;
import com.company.project.dto.GymResponseDTO;
import com.company.project.dto.TenantProvisioningResponseDTO;
import com.company.project.entities.Gym;
import com.company.project.entities.Role;
import com.company.project.entities.User;
import com.company.project.entities.UserRole;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.GymRepository;
import com.company.project.repositories.RoleRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.UserRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class GymService {

    private static final String GYM_OWNER_ROLE_NAME = "ADMIN";

    private final GymRepository gymRepository;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantProvisioningService tenantProvisioningService;
    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;

    private static final Logger log = LoggerFactory.getLogger(GymService.class);

    public GymService(GymRepository gymRepository,
                       BranchRepository branchRepository,
                       UserRepository userRepository,
                       RoleRepository roleRepository,
                       UserRoleRepository userRoleRepository,
                       PasswordEncoder passwordEncoder,
                       TenantProvisioningService tenantProvisioningService,
                       TenantRepository tenantRepository,
                       TenantConnectionRepository tenantConnectionRepository,
                       TenantDataSourceRegistry tenantDataSourceRegistry) {
        this.gymRepository = gymRepository;
        this.branchRepository = branchRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.tenantProvisioningService = tenantProvisioningService;
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
    }

    // ── Gym CRUD ────────────────────────────────────────────────────────────

    /**
     * Phase 8: merges two sources. Every gym created since Phase 3's per-tenant-
     * database cutover exists ONLY as a control-plane Tenant row plus its own
     * dedicated database — it never gets a row in the primary DB's gyms table at
     * all. Listing only gymRepository.findAll() (as this method did before this
     * phase) silently omitted every such gym from the UI entirely, confirmed live
     * against a real user-created gym ("Power Gym") that had fully provisioned
     * (its own database, its own least-privilege Postgres role, status ACTIVE) but
     * never appeared in Gym Management. De-duplicated by slug: a slug already
     * represented by a primary-DB row is never also listed from tenants (this only
     * matters for the two gyms migrated before the cutover, whose Tenant rows are
     * historical backfill copies of a still-authoritative primary-DB row).
     */
    public List<GymResponseDTO> getAllGyms() {
        List<Gym> primaryGyms = gymRepository.findAll();
        Set<String> primarySlugs = primaryGyms.stream().map(Gym::getSlug).collect(Collectors.toSet());

        List<GymResponseDTO> result = new ArrayList<>();
        for (Gym gym : primaryGyms) {
            result.add(toResponseDTO(gym));
        }
        for (Tenant tenant : tenantRepository.findAll()) {
            if (primarySlugs.contains(tenant.getSlug())) {
                continue;
            }
            GymResponseDTO dto = toResponseDTO(tenant);
            if (dto != null) {
                result.add(dto);
            }
        }
        return result;
    }

    public List<GymResponseDTO> getActiveGyms() {
        return getAllGyms().stream()
                .filter(dto -> "ACTIVE".equals(dto.getStatus()))
                .collect(Collectors.toList());
    }

    public GymResponseDTO getGymById(Long id) {
        Gym gym = gymRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Gym not found: " + id));
        return toResponseDTO(gym);
    }

    /**
     * Phase 3: POST /api/gyms always provisions a brand-new, dedicated Postgres
     * database for the gym — there is no more "quick add a row to the shared gyms
     * table" path. The two pre-existing gyms (Main Gym, Test Gym — already primary-DB
     * rows) are untouched; migrating them into their own databases is Phase 4's job,
     * not this one. Slug uniqueness is checked against BOTH the primary DB's gyms
     * table (still authoritative for those two) AND the control-plane's tenants table
     * (authoritative for every gym created from now on) — checking only one side
     * would let a collision slip through, since Phase 4 hasn't merged them yet.
     */
    public TenantProvisioningResponseDTO createGym(GymRequestDTO request) {
        String slug = request.getSlug().toLowerCase();
        if (gymRepository.existsBySlug(slug) || tenantRepository.existsBySlug(slug)) {
            throw new RuntimeException("Gym slug already exists: " + slug);
        }
        if (request.getOwnerUsername() == null || request.getOwnerUsername().isBlank()
                || request.getOwnerPassword() == null || request.getOwnerPassword().isBlank()) {
            throw new RuntimeException("Owner username and password are required");
        }

        Tenant tenant = tenantProvisioningService.beginProvisioning(request.getName(), slug);
        tenantProvisioningService.provisionAsync(
                tenant.getId(), tenant.getSlug(), request.getName(),
                request.getOwnerUsername(), request.getOwnerPassword(), request.getOwnerEmail(),
                request.getAddress(), request.getLat(), request.getLng());

        return new TenantProvisioningResponseDTO(tenant.getId(), tenant.getName(), tenant.getSlug(), tenant.getStatus());
    }

    /**
     * Re-provisions a tenant stuck in PROVISION_FAILED. Owner credentials aren't
     * durably stored beyond the original request (no secrets persisted transiently),
     * so they must be re-supplied here if the tenant DB's users table is still empty;
     * TenantProvisioningService's inner steps are all idempotent (existence-checked)
     * so this never duplicates data on a partial-success retry.
     */
    public TenantProvisioningResponseDTO retryProvisioning(Long tenantId, GymRequestDTO body) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found: " + tenantId));
        if (!"PROVISION_FAILED".equals(tenant.getStatus())) {
            throw new BusinessRuleViolationException("Tenant is not in a failed provisioning state");
        }
        Tenant updated = tenantProvisioningService.retryProvisioning(
                tenantId, body.getOwnerUsername(), body.getOwnerPassword(), body.getOwnerEmail(),
                body.getAddress(), body.getLat(), body.getLng());
        return new TenantProvisioningResponseDTO(updated.getId(), updated.getName(), updated.getSlug(), updated.getStatus());
    }

    /**
     * Issues (or resets, if one already exists) the login for a gym's owner —
     * an ADMIN-role account. Mirrors StaffService.syncAppLogin's account-creation
     * shape, without the Staff-record coupling since gym owners aren't staff.
     */
    public GymResponseDTO issueOrResetOwnerLogin(Long gymId, String username, String password, String email) {
        Gym gym = gymRepository.findById(gymId)
                .orElseThrow(() -> new RuntimeException("Gym not found: " + gymId));
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new RuntimeException("Username and password are required to issue a gym owner login");
        }
        gym = issueOwnerLogin(gym, username, password, email);
        return toResponseDTO(gym);
    }

    private Gym issueOwnerLogin(Gym gym, String username, String password, String email) {
        Role ownerRole = roleRepository.findByRoleName(GYM_OWNER_ROLE_NAME)
                .orElseThrow(() -> new RuntimeException(GYM_OWNER_ROLE_NAME + " role not found"));

        if (gym.getOwnerUserId() == null) {
            if (userRepository.existsByUsername(username)) {
                throw new RuntimeException("Username already taken: " + username);
            }
            User user = new User();
            user.setUsername(username);
            user.setEmail(email != null && !email.isBlank() ? email : gym.getEmail());
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setEnabled(true);
            user.setUserRoles(new java.util.HashSet<>());
            user = userRepository.save(user);
            userRoleRepository.save(new UserRole(null, user, ownerRole));

            gym.setOwnerUserId(user.getId());
            gym = gymRepository.save(gym);
        } else {
            User user = userRepository.findById(gym.getOwnerUserId())
                    .orElseThrow(() -> new RuntimeException("Linked owner account not found"));
            if (!username.equals(user.getUsername())) {
                if (userRepository.existsByUsername(username)) {
                    throw new RuntimeException("Username already taken: " + username);
                }
                user.setUsername(username);
            }
            user.setPasswordHash(passwordEncoder.encode(password));
            if (email != null && !email.isBlank()) user.setEmail(email);
            user.setEnabled(true);
            userRepository.save(user);
        }

        return gym;
    }

    public GymResponseDTO updateGym(Long id, GymRequestDTO request) {
        Gym gym = gymRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Gym not found: " + id));
        if (request.getName() != null) gym.setName(request.getName());
        if (request.getSlug() != null) {
            String newSlug = request.getSlug().toLowerCase();
            if (!newSlug.equals(gym.getSlug()) && gymRepository.existsBySlug(newSlug)) {
                throw new RuntimeException("Gym slug already exists: " + newSlug);
            }
            gym.setSlug(newSlug);
        }
        if (request.getAddress() != null) gym.setAddress(request.getAddress());
        if (request.getPhone() != null) gym.setPhone(request.getPhone());
        if (request.getEmail() != null) gym.setEmail(request.getEmail());
        if (request.getContactPerson() != null) gym.setContactPerson(request.getContactPerson());
        if (request.getLat() != null) gym.setLat(request.getLat());
        if (request.getLng() != null) gym.setLng(request.getLng());
        if (request.getStatus() != null) gym.setStatus(request.getStatus());
        gym = gymRepository.save(gym);
        return toResponseDTO(gym);
    }

    public GymResponseDTO updateGymStatus(Long id, String status) {
        Gym gym = gymRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Gym not found: " + id));
        if (gym.isDefault() && "INACTIVE".equalsIgnoreCase(status)) {
            throw new RuntimeException("Cannot deactivate the default gym");
        }
        gym.setStatus(status);
        gym = gymRepository.save(gym);
        return toResponseDTO(gym);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Phase 5: branchCount/ownerUsername are sourced live from this gym's own
     * dedicated tenant database when one exists (resolved via the control-plane's
     * Tenant/TenantConnection, using the same TenantDataSourceRegistry the routing
     * DataSource itself uses) — never from the primary DB's branches/users tables,
     * which for an already-migrated gym (e.g. Test Gym) are increasingly stale
     * copies left behind by the Phase 4 migration (additive/read-only, never
     * deleted). A gym not yet migrated/provisioned with a real TenantConnection
     * falls back to the primary-DB query exactly as before this phase — the fleet
     * is mixed (some gyms migrated, some not) until a later phase's full cutover.
     */
    private GymResponseDTO toResponseDTO(Gym gym) {
        GymResponseDTO dto = new GymResponseDTO();
        dto.setSource("PRIMARY");
        dto.setId(gym.getId());
        dto.setName(gym.getName());
        dto.setSlug(gym.getSlug());
        dto.setAddress(gym.getAddress());
        dto.setPhone(gym.getPhone());
        dto.setEmail(gym.getEmail());
        dto.setContactPerson(gym.getContactPerson());
        dto.setLat(gym.getLat());
        dto.setLng(gym.getLng());
        dto.setStatus(gym.getStatus());
        dto.setDefault(gym.isDefault());
        dto.setCreatedAt(gym.getCreatedAt());
        dto.setUpdatedAt(gym.getUpdatedAt());

        TenantConnection connection = tenantRepository.findBySlug(gym.getSlug())
                .flatMap(tenant -> tenantConnectionRepository.findByTenantId(tenant.getId()))
                .orElse(null);
        if (connection != null) {
            populateFromTenantDatabase(dto, gym.getSlug());
        } else {
            // Not yet migrated/provisioned into its own database — still lives in the
            // primary DB alongside every other not-yet-migrated gym. gym_id itself was
            // retired in this same phase (see BranchRepository/Branch entity), so this
            // is a full count of the primary DB's branches, not a per-gym filter —
            // correct today only because at most one gym remains un-migrated at a
            // time; a fleet with multiple simultaneously un-migrated gyms would need
            // this revisited.
            dto.setBranchCount(branchRepository.count());
            if (gym.getOwnerUserId() != null) {
                userRepository.findById(gym.getOwnerUserId()).ifPresent(u -> dto.setOwnerUsername(u.getUsername()));
            }
        }
        return dto;
    }

    /**
     * Phase 8: builds a GymResponseDTO for a gym that exists ONLY as a control-plane
     * Tenant row (every gym created since Phase 3's cutover) — there is no primary-DB
     * Gym entity to read from at all, so every field is read live from the tenant's
     * own dedicated database's own gyms row (identical shape everywhere, per Flyway/
     * Hibernate's shared bootstrap). Returns null (skip, don't fail the whole list)
     * if the tenant has no reachable connection yet — mid-provisioning, or a genuine
     * connection failure — consistent with the "refresh shortly" UX createGym's
     * response already sets expectations for.
     */
    private GymResponseDTO toResponseDTO(Tenant tenant) {
        TenantConnection connection = tenantConnectionRepository.findByTenantId(tenant.getId()).orElse(null);
        if (connection == null) {
            log.info("Skipping tenant '{}' from gym list — not yet provisioned (no TenantConnection)", tenant.getSlug());
            return null;
        }
        GymResponseDTO dto = new GymResponseDTO();
        dto.setSource("TENANT");
        dto.setId(tenant.getId());
        dto.setTenantId(tenant.getId());
        dto.setSlug(tenant.getSlug());
        try (Connection conn = tenantDataSourceRegistry.getDataSource(tenant.getSlug()).getConnection();
             Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT name, address, phone, email, contact_person, lat, lng, status, is_default, created_at, updated_at "
                            + "FROM gyms WHERE is_default = true LIMIT 1")) {
                if (!rs.next()) {
                    log.warn("Tenant '{}' has a provisioned database but no default gym row — skipping from list", tenant.getSlug());
                    return null;
                }
                dto.setName(rs.getString("name"));
                dto.setAddress(rs.getString("address"));
                dto.setPhone(rs.getString("phone"));
                dto.setEmail(rs.getString("email"));
                dto.setContactPerson(rs.getString("contact_person"));
                dto.setLat((Double) rs.getObject("lat"));
                dto.setLng((Double) rs.getObject("lng"));
                dto.setStatus(rs.getString("status"));
                dto.setDefault(rs.getBoolean("is_default"));
                dto.setCreatedAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null);
                dto.setUpdatedAt(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime() : null);
            }
        } catch (Exception e) {
            log.warn("Failed to read gym details for tenant slug '{}' — skipping from list", tenant.getSlug(), e);
            return null;
        }
        populateFromTenantDatabase(dto, tenant.getSlug());
        return dto;
    }

    /**
     * Tenant-scoped update, parallel to updateGym — writes to the tenant's OWN
     * database's gyms row (there is exactly one, is_default=true) instead of the
     * primary DB, since a control-plane-only tenant has no primary-DB Gym row to
     * update at all. Mirrors the exact "UPDATE gyms ... WHERE is_default = true"
     * pattern TenantProvisioningService.createInitialBranchAndGym already uses.
     */
    public GymResponseDTO updateTenantGym(Long tenantId, GymRequestDTO request) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found: " + tenantId));
        try (Connection conn = tenantDataSourceRegistry.getDataSource(tenant.getSlug()).getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE gyms SET "
                            + "name = COALESCE(?, name), "
                            + "address = COALESCE(?, address), "
                            + "phone = COALESCE(?, phone), "
                            + "email = COALESCE(?, email), "
                            + "contact_person = COALESCE(?, contact_person), "
                            + "lat = COALESCE(?, lat), "
                            + "lng = COALESCE(?, lng), "
                            + "updated_at = now() "
                            + "WHERE is_default = true")) {
                ps.setObject(1, request.getName());
                ps.setObject(2, request.getAddress());
                ps.setObject(3, request.getPhone());
                ps.setObject(4, request.getEmail());
                ps.setObject(5, request.getContactPerson());
                ps.setObject(6, request.getLat());
                ps.setObject(7, request.getLng());
                ps.executeUpdate();
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to update tenant gym for tenantId=" + tenantId, e);
        }
        return toResponseDTO(tenant);
    }

    /**
     * Tenant-scoped status toggle, parallel to updateGymStatus. Writes the tenant's
     * OWN gyms.status (a business ACTIVE/INACTIVE/SUSPENDED concept) — deliberately
     * NOT Tenant.status (a separate, coarser PROVISIONING/ACTIVE/PROVISION_FAILED
     * provisioning-lifecycle field on the control-plane row) — conflating the two
     * would make a routine owner-facing deactivate look like a provisioning failure.
     */
    public GymResponseDTO updateTenantGymStatus(Long tenantId, String status) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found: " + tenantId));
        // No "cannot deactivate the default gym" guard here, unlike updateGymStatus:
        // that check exists because the PRIMARY database can hold multiple gyms
        // sharing routing/fallback behavior around whichever one is_default=true —
        // a concept with no meaning inside a tenant's own database, where the single
        // gym row is ALWAYS is_default=true by construction (confirmed live: this
        // guard, copied verbatim from updateGymStatus during initial implementation,
        // made every tenant-sourced gym permanently non-deactivatable). Any tenant
        // gym can be freely activated/deactivated — the frontend's existing
        // confirmation dialog already warns about the real consequence (blocking
        // that gym's owner/staff/member logins).
        try (Connection conn = tenantDataSourceRegistry.getDataSource(tenant.getSlug()).getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE gyms SET status = ?, updated_at = now() WHERE is_default = true")) {
                ps.setString(1, status);
                ps.executeUpdate();
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to update tenant gym status for tenantId=" + tenantId, e);
        }
        return toResponseDTO(tenant);
    }

    private void populateFromTenantDatabase(GymResponseDTO dto, String tenantSlug) {
        try (Connection conn = tenantDataSourceRegistry.getDataSource(tenantSlug).getConnection();
             Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM branches WHERE status = 'ACTIVE'")) {
                rs.next();
                dto.setBranchCount(rs.getLong(1));
            }
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT u.username FROM users u JOIN gyms g ON g.owner_user_id = u.id LIMIT 1")) {
                if (rs.next()) {
                    dto.setOwnerUsername(rs.getString(1));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to read live stats for tenant slug '{}' — falling back to 0/null", tenantSlug, e);
            dto.setBranchCount(0);
        }
    }
}
