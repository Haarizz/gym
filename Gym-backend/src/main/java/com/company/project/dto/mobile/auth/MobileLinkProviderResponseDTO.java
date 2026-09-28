package com.company.project.dto.mobile.auth;

public class MobileLinkProviderResponseDTO {
    public static final String STATUS_LINKED = "LINKED";

    private String status;
    private String provider;

    public MobileLinkProviderResponseDTO() {}

    public MobileLinkProviderResponseDTO(String status, String provider) {
        this.status = status;
        this.provider = provider;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
}
