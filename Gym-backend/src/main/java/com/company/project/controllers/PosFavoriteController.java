package com.company.project.controllers;

import com.company.project.services.PosFavoriteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GET  /api/pos/favorites            -> [productId, ...]
 * POST /api/pos/favorites/{id}/toggle -> updated [productId, ...]
 */
@RestController
@RequestMapping("/api/pos/favorites")
public class PosFavoriteController {

    private final PosFavoriteService posFavoriteService;

    public PosFavoriteController(PosFavoriteService posFavoriteService) {
        this.posFavoriteService = posFavoriteService;
    }

    @GetMapping
    public ResponseEntity<List<Long>> getFavorites() {
        return ResponseEntity.ok(posFavoriteService.getFavoriteProductIds());
    }

    @PostMapping("/{productId}/toggle")
    public ResponseEntity<List<Long>> toggleFavorite(@PathVariable Long productId) {
        return ResponseEntity.ok(posFavoriteService.toggleFavorite(productId));
    }
}
