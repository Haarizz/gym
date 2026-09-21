package com.company.project.dto;

public class PhotoUploadResponseDTO {
    private String url;

    public PhotoUploadResponseDTO() {}

    public PhotoUploadResponseDTO(String url) {
        this.url = url;
    }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
}
