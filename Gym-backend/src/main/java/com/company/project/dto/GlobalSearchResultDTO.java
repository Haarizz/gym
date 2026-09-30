package com.company.project.dto;

/** searchValue is what the target page pre-fills into its own search box. */
public record GlobalSearchResultDTO(
        String type,
        Long id,
        String title,
        String subtitle,
        String route,
        String searchValue) {
}
