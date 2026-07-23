package com.company.project.repositories;

import com.company.project.entities.RecipeIngredient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipeIngredientRepository extends JpaRepository<RecipeIngredient, Long> {
    List<RecipeIngredient> findByRecipeId(Long recipeId);
    void deleteByRecipeId(Long recipeId);
}
