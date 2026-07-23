package com.company.project.dto;

import java.util.List;

public class RecipePageResponseDTO {

    private List<RecipeResponseDTO> recipes;
    private PaginationDTO pagination;

    public RecipePageResponseDTO(List<RecipeResponseDTO> recipes, PaginationDTO pagination) {
        this.recipes = recipes;
        this.pagination = pagination;
    }

    public List<RecipeResponseDTO> getRecipes() { return recipes; }
    public void setRecipes(List<RecipeResponseDTO> recipes) { this.recipes = recipes; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
