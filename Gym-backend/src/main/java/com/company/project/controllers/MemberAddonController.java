package com.company.project.controllers;

import com.company.project.dto.MemberAddonPageResponseDTO;
import com.company.project.dto.MemberAddonRequestDTO;
import com.company.project.dto.MemberAddonResponseDTO;
import com.company.project.services.MemberAddonService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/member-addons")
public class MemberAddonController {

    private final MemberAddonService memberAddonService;

    public MemberAddonController(MemberAddonService memberAddonService) {
        this.memberAddonService = memberAddonService;
    }

    /**
     * GET /api/member-addons?page=1&limit=100&search=&status=
     * Returns paginated list: { addons: [...], pagination: {...} }
     */
    @GetMapping
    public ResponseEntity<MemberAddonPageResponseDTO> getAddons(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1")   int page,
            @RequestParam(defaultValue = "100") int limit) {

        return ResponseEntity.ok(
                memberAddonService.getAddons(search, status, page, limit)
        );
    }

    /**
     * GET /api/member-addons/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<MemberAddonResponseDTO> getAddonById(@PathVariable Long id) {
        return ResponseEntity.ok(memberAddonService.getAddonById(id));
    }

    /**
     * POST /api/member-addons
     */
    @PostMapping
    public ResponseEntity<MemberAddonResponseDTO> createAddon(@RequestBody MemberAddonRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(memberAddonService.createAddon(request));
    }

    /**
     * PUT /api/member-addons/{id}/status?status=Cancelled
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<MemberAddonResponseDTO> updateAddonStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(memberAddonService.updateAddonStatus(id, status));
    }

    /**
     * DELETE /api/member-addons/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAddon(@PathVariable Long id) {
        memberAddonService.deleteAddon(id);
        return ResponseEntity.noContent().build();
    }
}
