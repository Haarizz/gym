package com.company.project.services;

import com.company.project.config.DefaultRolePermissions;
import com.company.project.config.PermissionCatalog;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.PermissionCatalogDTO;
import com.company.project.dto.RolePageResponseDTO;
import com.company.project.dto.RoleRequestDTO;
import com.company.project.dto.RoleResponseDTO;
import com.company.project.entities.Permission;
import com.company.project.entities.Role;
import com.company.project.entities.RolePermission;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.PermissionRepository;
import com.company.project.repositories.RolePermissionRepository;
import com.company.project.repositories.RoleRepository;
import com.company.project.repositories.UserRoleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class RoleService {

    public static final String ADMIN_ROLE_NAME = "GYMBIOS_ADMIN";
    /** The gym owner's role. Always has every operational permission (see getEffectivePermissionKeys). */
    public static final String OWNER_ROLE_NAME = "ADMIN";
    /** Holding these is what lets someone manage roles; nobody can strip them from a role they hold. */
    private static final List<String> SELF_LOCKOUT_KEYS = List.of("ADMINISTRATION_VIEW", "ADMINISTRATION_EDIT");

    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PermissionRepository permissionRepository;
    private final UserRoleRepository userRoleRepository;

    public RoleService(RoleRepository roleRepository,
                        RolePermissionRepository rolePermissionRepository,
                        PermissionRepository permissionRepository,
                        UserRoleRepository userRoleRepository) {
        this.roleRepository = roleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.permissionRepository = permissionRepository;
        this.userRoleRepository = userRoleRepository;
    }

    /**
     * GYMBIOS_ADMIN (the platform owner) is scoped to Gym Management and the platform
     * sales/onboarding pipeline (Leads -> Follow Up -> Pending Approval) only — it
     * creates and manages gym clients and the leads that become them, nothing else.
     * This is a fixed set, not stored role_permissions rows, so it can't drift from
     * the catalog and can't be edited away via the UI (see updateRole's guard below).
     */
    @Transactional(readOnly = true)
    public List<String> getEffectivePermissionKeys(Role role) {
        if (role.getRoleName() != null && role.getRoleName().equalsIgnoreCase(ADMIN_ROLE_NAME)) {
            return List.of("GYM_MANAGEMENT", "PLATFORM_LEADS").stream()
                    .flatMap(module -> PermissionCatalog.MODULES.get(module).stream()
                            .map(action -> PermissionCatalog.key(module, action)))
                    .collect(Collectors.toList());
        }
        // The gym owner always has every operational permission, computed from the
        // catalog rather than stored rows: the stored set was never backfilled when new
        // modules shipped, and the server enforces these keys, so a stale or
        // edited-down owner role would lock the owner out of their own gym.
        if (isOwnerRole(role)) {
            return DefaultRolePermissions.GRANTS.get(OWNER_ROLE_NAME);
        }
        return rolePermissionRepository.findByRoleId(role.getId()).stream()
                .map(rp -> rp.getPermission().getPermissionKey())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<String> getEffectivePermissionKeysForRoleNames(List<String> roleNames) {
        if (roleNames == null || roleNames.isEmpty()) return List.of();
        java.util.Set<String> keys = new java.util.LinkedHashSet<>();
        for (String roleName : roleNames) {
            roleRepository.findByRoleNameIgnoreCase(roleName)
                    .ifPresent(role -> keys.addAll(getEffectivePermissionKeys(role)));
        }
        return new ArrayList<>(keys);
    }

    @Transactional(readOnly = true)
    public RolePageResponseDTO listRoles(String search, int page, int limit) {
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), limit, Sort.by(Sort.Direction.ASC, "roleName"));
        Set<String> caller = callerAuthorities();
        boolean platformOwner = caller == null || caller.contains("ROLE_" + ADMIN_ROLE_NAME);
        String term = search == null ? "" : search.trim();
        Page<Role> rolePage = platformOwner
                ? (term.isEmpty() ? roleRepository.findAll(pageable) : roleRepository.findByRoleNameContainingIgnoreCase(term, pageable))
                : roleRepository.searchExcluding(term, ADMIN_ROLE_NAME, pageable);

        List<RoleResponseDTO> dtos = rolePage.getContent().stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(page, limit, rolePage.getTotalElements(), rolePage.getTotalPages());
        return new RolePageResponseDTO(dtos, pagination);
    }

    /**
     * Roles a staff member can be given: everything except the platform-owner role and
     * the member/self-registration roles; the gym-owner role only for a gym owner.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAssignableRoles() {
        boolean owner = callerIsOwner();
        return roleRepository.findAll(Sort.by(Sort.Direction.ASC, "roleName")).stream()
                .filter(r -> !r.getRoleName().equalsIgnoreCase(ADMIN_ROLE_NAME))
                .filter(r -> !r.getRoleName().equalsIgnoreCase("MEMBER") && !r.getRoleName().equalsIgnoreCase("USER"))
                .filter(r -> owner || !isOwnerRole(r))
                .map(r -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", r.getId());
                    row.put("role_name", r.getRoleName());
                    row.put("description", r.getDescription());
                    return row;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RoleResponseDTO getRole(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + id));
        return toResponseDTO(role);
    }

    public RoleResponseDTO createRole(RoleRequestDTO req) {
        if (req.getRoleName() == null || req.getRoleName().isBlank()) {
            throw new IllegalArgumentException("Role name is required");
        }
        assertNameAllowed(req.getRoleName());
        assertCanGrant(req.getPermissionKeys(), List.of());
        if (roleRepository.findByRoleNameIgnoreCase(req.getRoleName().trim()).isPresent()) {
            throw new BusinessRuleViolationException("A role named '" + req.getRoleName() + "' already exists");
        }

        Role role = new Role();
        role.setRoleName(req.getRoleName().trim());
        role.setDescription(req.getDescription());
        role.setSystem(false);
        role.setPosMode(normalizePosMode(req.getPosMode()));
        role = roleRepository.save(role);

        applyPermissions(role, req.getPermissionKeys());
        return toResponseDTO(role);
    }

    public RoleResponseDTO updateRole(Long id, RoleRequestDTO req) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + id));

        boolean isAdmin = role.getRoleName().equalsIgnoreCase(ADMIN_ROLE_NAME);

        if (req.getRoleName() != null && !req.getRoleName().isBlank()
                && !req.getRoleName().trim().equalsIgnoreCase(role.getRoleName())) {
            // Renaming any system role (not just ADMIN) would silently break the hardcoded
            // role-name lookups elsewhere (SecurityConfig's hasRole()/hasAnyRole() rules,
            // StaffService's default-role fallback) — block it, but still allow editing
            // description/permissions on system roles other than ADMIN.
            if (role.isSystem() || isOwnerRole(role)) {
                throw new BusinessRuleViolationException("System role '" + role.getRoleName() + "' cannot be renamed");
            }
            assertNameAllowed(req.getRoleName());
            roleRepository.findByRoleNameIgnoreCase(req.getRoleName().trim()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new BusinessRuleViolationException("A role named '" + req.getRoleName() + "' already exists");
                }
            });
            role.setRoleName(req.getRoleName().trim());
        }
        if (req.getDescription() != null) role.setDescription(req.getDescription());
        if (req.getPosMode() != null) role.setPosMode(normalizePosMode(req.getPosMode()));
        role = roleRepository.save(role);

        if (isAdmin || isOwnerRole(role)) {
            // GYMBIOS_ADMIN (Gym Management only) and ADMIN (everything) have fixed,
            // code-defined permission sets (see getEffectivePermissionKeys) — reject any
            // attempt to change them here rather than letting them drift via the UI.
            if (req.getPermissionKeys() != null
                    && !new HashSet<>(req.getPermissionKeys()).equals(new HashSet<>(getEffectivePermissionKeys(role)))) {
                throw new BusinessRuleViolationException(role.getRoleName() + "'s permissions are fixed and cannot be edited");
            }
        } else if (req.getPermissionKeys() != null) {
            List<String> current = getEffectivePermissionKeys(role);
            assertCanGrant(req.getPermissionKeys(), current);
            assertNoSelfLockout(role, current, req.getPermissionKeys());
            applyPermissions(role, req.getPermissionKeys());
        }

        return toResponseDTO(role);
    }

    public void deleteRole(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + id));
        if (role.isSystem() || role.getRoleName().equalsIgnoreCase(ADMIN_ROLE_NAME) || isOwnerRole(role)) {
            throw new BusinessRuleViolationException("System role '" + role.getRoleName() + "' cannot be deleted");
        }
        long assigned = userRoleRepository.countByRoleId(id);
        if (assigned > 0) {
            throw new BusinessRuleViolationException("'" + role.getRoleName() + "' is still assigned to " + assigned
                    + (assigned == 1 ? " user" : " users") + ". Move them to another role first.");
        }
        rolePermissionRepository.deleteByRoleId(id);
        roleRepository.delete(role);
    }

    public RoleResponseDTO duplicateRole(Long id) {
        Role source = roleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + id));

        String baseName = source.getRoleName() + " (Copy)";
        String candidate = baseName;
        int suffix = 2;
        while (roleRepository.findByRoleNameIgnoreCase(candidate).isPresent()) {
            candidate = baseName + " " + suffix++;
        }

        List<String> keys = getEffectivePermissionKeys(source);
        assertCanGrant(keys, List.of());

        Role copy = new Role();
        copy.setRoleName(candidate);
        copy.setDescription(source.getDescription());
        copy.setSystem(false);
        copy.setPosMode(source.getPosMode());
        copy = roleRepository.save(copy);

        applyPermissions(copy, keys);
        return toResponseDTO(copy);
    }

    @Transactional(readOnly = true)
    public List<PermissionCatalogDTO> getCatalog() {
        List<PermissionCatalogDTO> result = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : PermissionCatalog.MODULES.entrySet()) {
            String module = entry.getKey();
            List<PermissionCatalogDTO.PermissionItem> items = entry.getValue().stream()
                    .map(action -> new PermissionCatalogDTO.PermissionItem(PermissionCatalog.key(module, action), action))
                    .collect(Collectors.toList());
            result.add(new PermissionCatalogDTO(module, items));
        }
        return result;
    }

    private String normalizePosMode(String posMode) {
        if (posMode == null || posMode.isBlank()) return null;
        String trimmed = posMode.trim();
        if (!"Retail POS".equalsIgnoreCase(trimmed) && !"F&B POS".equalsIgnoreCase(trimmed)) {
            throw new BusinessRuleViolationException("posMode must be 'Retail POS' or 'F&B POS'");
        }
        return trimmed.equalsIgnoreCase("Retail POS") ? "Retail POS" : "F&B POS";
    }

    /**
     * Staff assignment guard (StaffService): nobody can be given the platform-owner
     * role from a gym, and only a gym owner can make someone else an owner.
     */
    public static void assertAssignable(Role role) {
        if (role == null) return;
        if (role.getRoleName().equalsIgnoreCase(ADMIN_ROLE_NAME)) {
            throw new BusinessRuleViolationException("The " + ADMIN_ROLE_NAME + " role can't be assigned to staff");
        }
        if (isOwnerRole(role) && !callerIsOwner()) {
            throw new BusinessRuleViolationException("Only the gym owner can give someone the ADMIN role");
        }
    }

    /**
     * Names the security code treats specially (ROLE_GYMBIOS_ADMIN = platform owner,
     * SUPER_ADMIN/DEVICE/MEMBER skip permission checks, ADMIN = gym owner). A custom role
     * with one of these names would inherit that treatment, e.g. "Gymbios_Admin" would be
     * read as the platform owner, so they can never be used for a new or renamed role.
     */
    private static final Set<String> RESERVED_ROLE_NAMES = Set.of(
            ADMIN_ROLE_NAME, OWNER_ROLE_NAME, "SUPER_ADMIN", "DEVICE", "MEMBER", "USER");

    private static void assertNameAllowed(String name) {
        if (name != null && RESERVED_ROLE_NAMES.contains(name.trim().toUpperCase())) {
            throw new BusinessRuleViolationException("'" + name.trim() + "' is a reserved role name");
        }
    }

    public static boolean isOwnerRole(Role role) {
        return role != null && role.getRoleName() != null && role.getRoleName().equalsIgnoreCase(OWNER_ROLE_NAME);
    }

    /** Authorities of the signed-in user, or null outside a request (startup seeding, jobs). */
    private static Set<String> callerAuthorities() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
    }

    private static boolean callerIsOwner() {
        Set<String> authorities = callerAuthorities();
        return authorities == null
                || authorities.contains("ROLE_" + OWNER_ROLE_NAME)
                || authorities.contains("ROLE_SUPER_ADMIN")
                || authorities.contains("ROLE_" + ADMIN_ROLE_NAME);
    }

    /**
     * A non-owner with Roles & Permissions access may only hand out permissions they
     * hold themselves — otherwise a manager could tick everything onto their own role.
     * Keys the role already had are left alone, so editing e.g. a description still works.
     */
    private void assertCanGrant(List<String> requested, List<String> alreadyGranted) {
        if (requested == null) return;
        Set<String> mine = callerAuthorities();
        // Gym Management / Platform Leads manage *other* gyms: only the platform owner may grant them.
        if (mine != null && !mine.contains("ROLE_" + ADMIN_ROLE_NAME)) {
            List<String> platform = requested.stream()
                    .filter(k -> !alreadyGranted.contains(k) && (k.startsWith("GYM_MANAGEMENT_") || k.startsWith("PLATFORM_LEADS_")))
                    .distinct().toList();
            if (!platform.isEmpty()) {
                throw new BusinessRuleViolationException("Platform permissions can't be granted to gym roles: " + String.join(", ", platform));
            }
        }
        if (callerIsOwner()) return;
        List<String> denied = requested.stream()
                .filter(key -> !alreadyGranted.contains(key) && !mine.contains(key))
                .distinct()
                .toList();
        if (!denied.isEmpty()) {
            throw new BusinessRuleViolationException("You can only grant permissions you have yourself. Not allowed: "
                    + String.join(", ", denied));
        }
    }

    /** Stops someone from removing their own access to this screen by editing a role they hold. */
    private void assertNoSelfLockout(Role role, List<String> current, List<String> requested) {
        Set<String> mine = callerAuthorities();
        if (mine == null || !mine.contains("ROLE_" + role.getRoleName().toUpperCase())) return;
        for (String key : SELF_LOCKOUT_KEYS) {
            if (current.contains(key) && !requested.contains(key)) {
                throw new BusinessRuleViolationException("You can't remove " + key
                        + " from your own role, or you would lose access to Roles & Permissions.");
            }
        }
    }

    private void applyPermissions(Role role, List<String> permissionKeys) {
        if (permissionKeys != null) {
            Set<String> catalog = new HashSet<>(PermissionCatalog.allKeys());
            List<String> unknown = permissionKeys.stream().filter(k -> !catalog.contains(k)).distinct().toList();
            if (!unknown.isEmpty()) {
                throw new BusinessRuleViolationException("Unknown permission(s): " + String.join(", ", unknown));
            }
        }
        rolePermissionRepository.deleteByRoleId(role.getId());
        // Without an explicit flush here, Hibernate's default action-queue order runs
        // insertions before deletions within the same flush, so re-adding a permission
        // that was already assigned (e.g. re-saving DASHBOARD_VIEW) trips the
        // (role_id, permission_id) unique constraint before the old row is gone.
        rolePermissionRepository.flush();
        if (permissionKeys == null || permissionKeys.isEmpty()) return;

        Map<String, Permission> byKey = permissionRepository.findAll().stream()
                .collect(Collectors.toMap(Permission::getPermissionKey, p -> p, (a, b) -> a, LinkedHashMap::new));

        List<RolePermission> rows = new ArrayList<>();
        for (String key : new LinkedHashSet<>(permissionKeys)) {
            Permission permission = byKey.get(key);
            if (permission == null) {
                // Catalog rows are only seeded into the primary DB at startup; a tenant DB
                // provisioned before a module existed lacks the row, and the tick used to
                // be dropped silently. Create it on demand instead.
                permission = permissionRepository.save(newPermission(key));
            }
            rows.add(new RolePermission(role, permission));
        }
        rolePermissionRepository.saveAll(rows);
    }

    private static Permission newPermission(String key) {
        for (Map.Entry<String, List<String>> entry : PermissionCatalog.MODULES.entrySet()) {
            for (String action : entry.getValue()) {
                if (PermissionCatalog.key(entry.getKey(), action).equals(key)) {
                    return new Permission(key, entry.getKey(), action, entry.getKey() + " - " + action);
                }
            }
        }
        throw new BusinessRuleViolationException("Unknown permission: " + key);
    }

    private RoleResponseDTO toResponseDTO(Role role) {
        long userCount = userRoleRepository.countByRoleId(role.getId());
        return RoleResponseDTO.of(role.getId(), role.getRoleName(), role.getDescription(),
                role.isSystem() || role.getRoleName().equalsIgnoreCase(ADMIN_ROLE_NAME) || isOwnerRole(role),
                userCount, getEffectivePermissionKeys(role), role.getPosMode());
    }
}
