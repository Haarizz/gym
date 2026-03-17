package com.company.project.controllers;

import com.company.project.dto.RecipePageResponseDTO;
import com.company.project.dto.RecipeRequestDTO;
import com.company.project.dto.RecipeResponseDTO;
import com.company.project.services.ProductionOrderService;
import com.company.project.services.RecipeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/recipes")
public class RecipeController {

    private final RecipeService recipeService;
    private final ProductionOrderService productionOrderService;

    public RecipeController(RecipeService recipeService,
                            ProductionOrderService productionOrderService) {
        this.recipeService = recipeService;
        this.productionOrderService = productionOrderService;
    }

    /**
     * GET /api/recipes?page=1&size=20&status=&search=
     */
    @GetMapping
    public ResponseEntity<RecipePageResponseDTO> getRecipes(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(recipeService.getRecipes(page, size, status, search));
    }

    /**
     * GET /api/recipes/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(productionOrderService.getStats());
    }

    /**
     * GET /api/recipes/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<RecipeResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(recipeService.getById(id));
    }

    /**
     * POST /api/recipes
     */
    @PostMapping
    public ResponseEntity<RecipeResponseDTO> createRecipe(@RequestBody RecipeRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recipeService.createRecipe(request));
    }

    /**
     * PUT /api/recipes/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<RecipeResponseDTO> updateRecipe(
            @PathVariable Long id,
            @RequestBody RecipeRequestDTO request) {
        return ResponseEntity.ok(recipeService.updateRecipe(id, request));
    }

    /**
     * DELETE /api/recipes/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecipe(@PathVariable Long id) {
        recipeService.deleteRecipe(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/recipes/{id}/toggle-status
     */
    @PostMapping("/{id}/toggle-status")
    public ResponseEntity<RecipeResponseDTO> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(recipeService.toggleStatus(id));
    }
}
