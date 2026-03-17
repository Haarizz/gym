package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.RecipeIngredientDTO;
import com.company.project.dto.RecipePageResponseDTO;
import com.company.project.dto.RecipeRequestDTO;
import com.company.project.dto.RecipeResponseDTO;
import com.company.project.entities.Recipe;
import com.company.project.entities.RecipeIngredient;
import com.company.project.repositories.RecipeIngredientRepository;
import com.company.project.repositories.RecipeRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final RecipeIngredientRepository recipeIngredientRepository;

    public RecipeService(RecipeRepository recipeRepository,
                         RecipeIngredientRepository recipeIngredientRepository) {
        this.recipeRepository = recipeRepository;
        this.recipeIngredientRepository = recipeIngredientRepository;
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public RecipeResponseDTO createRecipe(RecipeRequestDTO req) {
        Recipe recipe = new Recipe();
        recipe.setName(req.getName());
        recipe.setDescription(req.getDescription());
        recipe.setCategoryId(req.getCategoryId());
        recipe.setCategoryName(req.getCategoryName());
        recipe.setOutputProductId(req.getOutputProductId());
        recipe.setOutputProductName(req.getOutputProductName());
        recipe.setOutputQuantity(req.getOutputQuantity());
        recipe.setOutputUnit(req.getOutputUnit());
        recipe.setPrepTimeMinutes(req.getPrepTimeMinutes());
        recipe.setStatus(req.getStatus() != null ? req.getStatus() : "ACTIVE");
        recipe.setNotes(req.getNotes());

        recipe = recipeRepository.save(recipe);

        List<RecipeIngredientDTO> itemReqs = req.getItems() != null ? req.getItems() : new ArrayList<>();
        final Long recipeId = recipe.getId();
        for (RecipeIngredientDTO itemDto : itemReqs) {
            recipeIngredientRepository.save(buildIngredient(recipeId, itemDto));
        }

        List<RecipeIngredient> savedIngredients = recipeIngredientRepository.findByRecipeId(recipe.getId());
        return RecipeResponseDTO.fromEntity(recipe, savedIngredients);
    }

    public RecipeResponseDTO updateRecipe(Long id, RecipeRequestDTO req) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found with id: " + id));

        recipe.setName(req.getName());
        recipe.setDescription(req.getDescription());
        recipe.setCategoryId(req.getCategoryId());
        recipe.setCategoryName(req.getCategoryName());
        recipe.setOutputProductId(req.getOutputProductId());
        recipe.setOutputProductName(req.getOutputProductName());
        recipe.setOutputQuantity(req.getOutputQuantity());
        recipe.setOutputUnit(req.getOutputUnit());
        recipe.setPrepTimeMinutes(req.getPrepTimeMinutes());
        if (req.getStatus() != null) recipe.setStatus(req.getStatus());
        recipe.setNotes(req.getNotes());

        // Delete old ingredients and save new ones
        recipeIngredientRepository.deleteByRecipeId(recipe.getId());

        List<RecipeIngredientDTO> itemReqs = req.getItems() != null ? req.getItems() : new ArrayList<>();
        final Long recipeId = recipe.getId();
        for (RecipeIngredientDTO itemDto : itemReqs) {
            recipeIngredientRepository.save(buildIngredient(recipeId, itemDto));
        }

        recipe = recipeRepository.save(recipe);
        List<RecipeIngredient> savedIngredients = recipeIngredientRepository.findByRecipeId(recipe.getId());
        return RecipeResponseDTO.fromEntity(recipe, savedIngredients);
    }

    public void deleteRecipe(Long id) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found with id: " + id));
        recipeIngredientRepository.deleteByRecipeId(recipe.getId());
        recipeRepository.delete(recipe);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RecipeResponseDTO getById(Long id) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found with id: " + id));
        List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipeId(recipe.getId());
        return RecipeResponseDTO.fromEntity(recipe, ingredients);
    }

    @Transactional(readOnly = true)
    public RecipePageResponseDTO getRecipes(int page, int size, String status, String search) {
        Specification<Recipe> spec = buildSpec(status, search);
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Recipe> recipePage = recipeRepository.findAll(spec, pageable);

        List<RecipeResponseDTO> dtos = recipePage.getContent().stream()
                .map(recipe -> {
                    List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipeId(recipe.getId());
                    return RecipeResponseDTO.fromEntity(recipe, ingredients);
                })
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(page, size, recipePage.getTotalElements(), recipePage.getTotalPages());
        return new RecipePageResponseDTO(dtos, pagination);
    }

    public RecipeResponseDTO toggleStatus(Long id) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found with id: " + id));

        if ("ACTIVE".equals(recipe.getStatus())) {
            recipe.setStatus("INACTIVE");
        } else {
            recipe.setStatus("ACTIVE");
        }

        recipe = recipeRepository.save(recipe);
        List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipeId(recipe.getId());
        return RecipeResponseDTO.fromEntity(recipe, ingredients);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private RecipeIngredient buildIngredient(Long recipeId, RecipeIngredientDTO dto) {
        RecipeIngredient ingredient = new RecipeIngredient();
        ingredient.setRecipeId(recipeId);
        ingredient.setProductId(dto.getProductId());
        ingredient.setProductName(dto.getProductName());
        ingredient.setSku(dto.getSku());
        ingredient.setQuantity(dto.getQuantity());
        ingredient.setUnit(dto.getUnit());
        ingredient.setUnitCost(dto.getUnitCost());
        ingredient.setNotes(dto.getNotes());
        return ingredient;
    }

    private Specification<Recipe> buildSpec(String status, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("categoryName")), like)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
