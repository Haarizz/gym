package com.company.project.dto;

public class CommunityPostImageDTO {

    private String dataUrl;
    private String aspectRatio;
    private Integer cropPosition;
    private Integer cropZoom;

    public CommunityPostImageDTO() {}

    public CommunityPostImageDTO(String dataUrl, String aspectRatio, Integer cropPosition, Integer cropZoom) {
        this.dataUrl = dataUrl;
        this.aspectRatio = aspectRatio;
        this.cropPosition = cropPosition;
        this.cropZoom = cropZoom;
    }

    public String getDataUrl() { return dataUrl; }
    public void setDataUrl(String dataUrl) { this.dataUrl = dataUrl; }

    public String getAspectRatio() { return aspectRatio; }
    public void setAspectRatio(String aspectRatio) { this.aspectRatio = aspectRatio; }

    public Integer getCropPosition() { return cropPosition; }
    public void setCropPosition(Integer cropPosition) { this.cropPosition = cropPosition; }

    public Integer getCropZoom() { return cropZoom; }
    public void setCropZoom(Integer cropZoom) { this.cropZoom = cropZoom; }
}

