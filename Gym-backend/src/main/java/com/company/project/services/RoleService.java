package com.company.project.services;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class RoleService {

    public static final String ADMIN_ROLE_NAME = "ADMIN";

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

    /** ADMIN always has every permission in the catalog — never depends on stored rows. */
    @Transactional(readOnly = true)
    public List<String> getEffectivePermissionKeys(Role role) {
        if (role.getRoleName() != null && role.getRoleName().equalsIgnoreCase(ADMIN_ROLE_NAME)) {
            return PermissionCatalog.allKeys();
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
        Page<Role> rolePage = (search != null && !search.isBlank())
                ? roleRepository.findByRoleNameContainingIgnoreCase(search, pageable)
                : roleRepository.findAll(pageable);

        List<RoleResponseDTO> dtos = rolePage.getContent().stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(page, limit, rolePage.getTotalElements(), rolePage.getTotalPages());
        return new RolePageResponseDTO(dtos, pagination);
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
        if (roleRepository.findByRoleNameIgnoreCase(req.getRoleName().trim()).isPresent()) {
            throw new BusinessRuleViolationException("A role named '" + req.getRoleName() + "' already exists");
        }

        Role role = new Role();
        role.setRoleName(req.getRoleName().trim());
        role.setDescription(req.getDescription());
        role.setSystem(false);
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
            if (role.isSystem()) {
                throw new BusinessRuleViolationException("System role '" + role.getRoleName() + "' cannot be renamed");
            }
            roleRepository.findByRoleNameIgnoreCase(req.getRoleName().trim()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new BusinessRuleViolationException("A role named '" + req.getRoleName() + "' already exists");
                }
            });
            role.setRoleName(req.getRoleName().trim());
        }
        if (req.getDescription() != null) role.setDescription(req.getDescription());
        role = roleRepository.save(role);

        if (isAdmin) {
            // ADMIN's effective permissions are always "all" regardless of stored rows —
            // block edits from ever appearing to strip them.
            if (req.getPermissionKeys() != null) {
                List<String> allKeys = PermissionCatalog.allKeys();
                boolean triedToRemoveSome = !new java.util.HashSet<>(req.getPermissionKeys()).containsAll(allKeys);
                if (triedToRemoveSome) {
                    throw new BusinessRuleViolationException("ADMIN permissions cannot be reduced");
                }
            }
        } else if (req.getPermissionKeys() != null) {
            applyPermissions(role, req.getPermissionKeys());
        }

        return toResponseDTO(role);
    }

    public void deleteRole(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + id));
        if (role.isSystem() || role.getRoleName().equalsIgnoreCase(ADMIN_ROLE_NAME)) {
            throw new BusinessRuleViolationException("System role '" + role.getRoleName() + "' cannot be deleted");
        }
        if (userRoleRepository.countByRoleId(id) > 0) {
            throw new BusinessRuleViolationException("Cannot delete a role that is still assigned to users");
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

        Role copy = new Role();
        copy.setRoleName(candidate);
        copy.setDescription(source.getDescription());
        copy.setSystem(false);
        copy = roleRepository.save(copy);

        applyPermissions(copy, getEffectivePermissionKeys(source));
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

    private void applyPermissions(Role role, List<String> permissionKeys) {
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
        for (String key : new java.util.LinkedHashSet<>(permissionKeys)) {
            Permission permission = byKey.get(key);
            if (permission != null) {
                rows.add(new RolePermission(role, permission));
            }
        }
        rolePermissionRepository.saveAll(rows);
    }

    private RoleResponseDTO toResponseDTO(Role role) {
        long userCount = userRoleRepository.countByRoleId(role.getId());
        return RoleResponseDTO.of(role.getId(), role.getRoleName(), role.getDescription(),
                role.isSystem() || role.getRoleName().equalsIgnoreCase(ADMIN_ROLE_NAME),
                userCount, getEffectivePermissionKeys(role));
    }
}
