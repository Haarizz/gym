package com.company.project.controllers;

import com.company.project.dto.BranchImageResponseDTO;
import com.company.project.security.BranchContextHolder;
import com.company.project.services.BranchImageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Gym Admin write path for branch cover/gallery images — distinct from the
 * mobile-only, read-only /api/mobile/discovery/** routes. Gated the same way
 * as the rest of branch configuration (BRANCH_MANAGEMENT_EDIT).
 */
@RestController
@RequestMapping("/api/branches/{branchId}/images")
public class BranchImageController {

    private final BranchImageService branchImageService;

    public BranchImageController(BranchImageService branchImageService) {
        this.branchImageService = branchImageService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_VIEW')")
    public ResponseEntity<List<BranchImageResponseDTO>> getImages(@PathVariable Long branchId) {
        BranchContextHolder.setActiveBranchId(branchId);
        try {
            return ResponseEntity.ok(branchImageService.getImages(branchId));
        } finally {
            BranchContextHolder.clear();
        }
    }

    @PostMapping(consumes = "multipart/form-data")
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_EDIT')")
    public ResponseEntity<BranchImageResponseDTO> uploadImage(
            @PathVariable Long branchId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(name = "isCover", defaultValue = "false") boolean isCover) {
        BranchContextHolder.setActiveBranchId(branchId);
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(branchImageService.uploadImage(branchId, file, isCover));
        } finally {
            BranchContextHolder.clear();
        }
    }

    @PatchMapping("/{imageId}/cover")
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_EDIT')")
    public ResponseEntity<BranchImageResponseDTO> setCover(@PathVariable Long branchId, @PathVariable Long imageId) {
        BranchContextHolder.setActiveBranchId(branchId);
        try {
            return ResponseEntity.ok(branchImageService.setCover(branchId, imageId));
        } finally {
            BranchContextHolder.clear();
        }
    }

    @DeleteMapping("/{imageId}")
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_EDIT')")
    public ResponseEntity<Void> deleteImage(@PathVariable Long branchId, @PathVariable Long imageId) {
        BranchContextHolder.setActiveBranchId(branchId);
        try {
            branchImageService.deleteImage(branchId, imageId);
            return ResponseEntity.noContent().build();
        } finally {
            BranchContextHolder.clear();
        }
    }
}
