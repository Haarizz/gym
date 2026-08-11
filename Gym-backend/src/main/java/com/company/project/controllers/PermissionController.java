package com.company.project.controllers;

import com.company.project.dto.PermissionCatalogDTO;
import com.company.project.services.RoleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/administration/permissions")
public class PermissionController {

    private final RoleService roleService;

    public PermissionController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMINISTRATION_VIEW')")
    public ResponseEntity<List<PermissionCatalogDTO>> getCatalog() {
        return ResponseEntity.ok(roleService.getCatalog());
    }
}
