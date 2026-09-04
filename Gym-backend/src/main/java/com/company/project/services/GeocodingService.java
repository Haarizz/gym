package com.company.project.services;

import com.company.project.dto.LocationSuggestionDTO;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Proxies location search to OpenStreetMap's free Nominatim geocoding API.
 * Called server-side (never directly from the browser) because Nominatim's usage
 * policy requires a real, identifying User-Agent and disallows heavy unthrottled
 * client-side use — https://operations.osmfoundation.org/policies/nominatim/.
 */
@Service
public class GeocodingService {

    private static final Logger log = LoggerFactory.getLogger(GeocodingService.class);
    private static final String NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
    private static final int RESULT_LIMIT = 8;

    private final RestClient restClient = RestClient.builder()
            .defaultHeader(HttpHeaders.USER_AGENT, "GymBios/1.0 (gym management platform)")
            .build();

    public List<LocationSuggestionDTO> search(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String url = UriComponentsBuilder.fromHttpUrl(NOMINATIM_SEARCH_URL)
                .queryParam("q", query)
                .queryParam("format", "jsonv2")
                .queryParam("addressdetails", 0)
                .queryParam("limit", RESULT_LIMIT)
                .toUriString();

        try {
            JsonNode results = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(JsonNode.class);

            List<LocationSuggestionDTO> suggestions = new ArrayList<>();
            if (results != null && results.isArray()) {
                for (JsonNode node : results) {
                    String displayName = node.path("display_name").asText(null);
                    double lat = node.path("lat").asDouble(Double.NaN);
                    double lng = node.path("lon").asDouble(Double.NaN);
                    if (displayName != null && !Double.isNaN(lat) && !Double.isNaN(lng)) {
                        suggestions.add(new LocationSuggestionDTO(displayName, lat, lng));
                    }
                }
            }
            return suggestions;
        } catch (Exception e) {
            log.warn("Nominatim geocoding search failed for query '{}'", query, e);
            return List.of();
        }
    }
}
