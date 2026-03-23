package com.company.project.controllers;

import com.company.project.dto.*;
import com.company.project.services.AssetService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/assets")
public class AssetController {

    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    /**
     * GET /api/assets?search=&branch=&category=&status=&fromDate=&toDate=&page=1&size=50
     */
    @GetMapping
    public ResponseEntity<AssetsPageResponseDTO> getAssets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(
                assetService.getAssets(search, branch, category, status, fromDate, toDate, page, size)
        );
    }

    /**
     * GET /api/assets/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<AssetStatsDTO> getStats() {
        return ResponseEntity.ok(assetService.getStats());
    }

    /**
     * GET /api/assets/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<AssetResponseDTO> getAssetById(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.getAssetById(id));
    }

    /**
     * GET /api/assets/{id}/events
     */
    @GetMapping("/{id}/events")
    public ResponseEntity<List<AssetEventDTO>> getAssetEvents(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.getAssetEvents(id));
    }

    /**
     * POST /api/assets
     */
    @PostMapping
    public ResponseEntity<AssetResponseDTO> createAsset(@RequestBody AssetRequestDTO req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assetService.createAsset(req));
    }

    /**
     * PUT /api/assets/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<AssetResponseDTO> updateAsset(@PathVariable Long id,
                                                        @RequestBody AssetRequestDTO req) {
        return ResponseEntity.ok(assetService.updateAsset(id, req));
    }

    /**
     * DELETE /api/assets/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAsset(@PathVariable Long id) {
        assetService.deleteAsset(id);
        return ResponseEntity.noContent().build();
    }
}
