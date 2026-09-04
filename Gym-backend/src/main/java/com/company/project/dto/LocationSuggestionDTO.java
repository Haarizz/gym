package com.company.project.dto;

public class LocationSuggestionDTO {
    private String displayName;
    private Double lat;
    private Double lng;

    public LocationSuggestionDTO() {}

    public LocationSuggestionDTO(String displayName, Double lat, Double lng) {
        this.displayName = displayName;
        this.lat = lat;
        this.lng = lng;
    }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }

    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
}
