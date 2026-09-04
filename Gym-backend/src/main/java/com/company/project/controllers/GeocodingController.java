package com.company.project.controllers;

import com.company.project.dto.LocationSuggestionDTO;
import com.company.project.services.GeocodingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/geocoding")
public class GeocodingController {

    private final GeocodingService geocodingService;

    public GeocodingController(GeocodingService geocodingService) {
        this.geocodingService = geocodingService;
    }

    /** GET /api/geocoding/search?q=... — location typeahead for the Add/Edit Gym form. */
    @GetMapping("/search")
    public ResponseEntity<List<LocationSuggestionDTO>> search(@RequestParam("q") String query) {
        return ResponseEntity.ok(geocodingService.search(query));
    }
}
