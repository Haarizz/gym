package com.company.project.controllers;

import com.company.project.dto.GlobalSearchResponseDTO;
import com.company.project.services.GlobalSearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/global-search")
public class GlobalSearchController {

    private final GlobalSearchService globalSearchService;

    public GlobalSearchController(GlobalSearchService globalSearchService) {
        this.globalSearchService = globalSearchService;
    }

    @GetMapping
    public GlobalSearchResponseDTO search(@RequestParam(name = "q", defaultValue = "") String q) {
        return globalSearchService.search(q);
    }
}
