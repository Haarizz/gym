package com.company.project.controllers;

import com.company.project.dto.RolePageResponseDTO;
import com.company.project.dto.RoleRequestDTO;
import com.company.project.dto.RoleResponseDTO;
import com.company.project.services.RoleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/administration/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMINISTRATION_VIEW')")
    public ResponseEntity<RolePageResponseDTO> listRoles(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(roleService.listRoles(search, page, limit));
    }

    /** Roles that can be given to a staff member — for the Add/Edit Staff role picker. */
    @GetMapping("/assignable")
    @PreAuthorize("hasAnyAuthority('STAFF_VIEW', 'STAFF_CREATE', 'STAFF_EDIT', 'ADMINISTRATION_VIEW')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> listAssignableRoles() {
        return ResponseEntity.ok(roleService.listAssignableRoles());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMINISTRATION_VIEW')")
    public ResponseEntity<RoleResponseDTO> getRole(@PathVariable Long id) {
        return ResponseEntity.ok(roleService.getRole(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMINISTRATION_CREATE')")
    public ResponseEntity<RoleResponseDTO> createRole(@RequestBody RoleRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.createRole(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMINISTRATION_EDIT')")
    public ResponseEntity<RoleResponseDTO> updateRole(@PathVariable Long id, @RequestBody RoleRequestDTO request) {
        return ResponseEntity.ok(roleService.updateRole(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMINISTRATION_DELETE')")
    public ResponseEntity<Void> deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/duplicate")
    @PreAuthorize("hasAuthority('ADMINISTRATION_CREATE')")
    public ResponseEntity<RoleResponseDTO> duplicateRole(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.duplicateRole(id));
    }
}
