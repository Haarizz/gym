package com.company.project.repositories;

import com.company.project.entities.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface RecipeRepository extends JpaRepository<Recipe, Long>, JpaSpecificationExecutor<Recipe> {
    List<Recipe> findByStatus(String status);
    List<Recipe> findByCategoryId(Long categoryId);
}
