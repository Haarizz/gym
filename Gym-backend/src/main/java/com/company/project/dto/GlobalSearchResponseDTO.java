package com.company.project.dto;

import java.util.List;

public record GlobalSearchResponseDTO(String query, Long branchId, List<GlobalSearchResultDTO> results) {
}
