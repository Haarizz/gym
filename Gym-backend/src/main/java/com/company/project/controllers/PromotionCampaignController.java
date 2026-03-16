package com.company.project.controllers;

import com.company.project.dto.PromotionCampaignRequestDTO;
import com.company.project.dto.PromotionCampaignResponseDTO;
import com.company.project.services.PromotionCampaignService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/promotions")
public class PromotionCampaignController {

    private final PromotionCampaignService promotionService;

    public PromotionCampaignController(PromotionCampaignService promotionService) {
        this.promotionService = promotionService;
    }

    @GetMapping
    public ResponseEntity<List<PromotionCampaignResponseDTO>> getPromotions(
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(promotionService.getPromotions(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PromotionCampaignResponseDTO> getPromotionById(@PathVariable Long id) {
        return ResponseEntity.ok(promotionService.getPromotionById(id));
    }

    @PostMapping
    public ResponseEntity<PromotionCampaignResponseDTO> createPromotion(
            @RequestBody PromotionCampaignRequestDTO request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(promotionService.createPromotion(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PromotionCampaignResponseDTO> updatePromotion(
            @PathVariable Long id,
            @RequestBody PromotionCampaignRequestDTO request
    ) {
        return ResponseEntity.ok(promotionService.updatePromotion(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deletePromotion(@PathVariable Long id) {
        promotionService.deletePromotion(id);
        return ResponseEntity.ok(Map.of("message", "Promotion deleted successfully"));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<PromotionCampaignResponseDTO> duplicatePromotion(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(promotionService.duplicatePromotion(id));
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> bulkAction(@RequestBody Map<String, Object> payload) {
        String action = payload.getOrDefault("action", "").toString();
        @SuppressWarnings("unchecked")
        List<Number> idsRaw = (List<Number>) payload.getOrDefault("ids", List.of());
        List<Long> ids = idsRaw.stream().map(Number::longValue).collect(java.util.stream.Collectors.toList());

        if (action.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Missing action"));
        }

        List<PromotionCampaignResponseDTO> result = promotionService.bulkAction(action, ids);
        if ("duplicate".equalsIgnoreCase(action)) {
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.ok(Map.of("message", "Bulk action completed", "count", String.valueOf(ids.size())));
    }
}
