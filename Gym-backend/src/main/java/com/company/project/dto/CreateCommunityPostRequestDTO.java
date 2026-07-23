package com.company.project.dto;

public class CreateCommunityPostRequestDTO {

    private String topic;
    private String content;
    private String type;

    private String imageDataUrl;
    private String imageAspectRatio;
    private Integer imageCropPosition;
    private Integer imageCropZoom;

    public CreateCommunityPostRequestDTO() {}

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getImageDataUrl() { return imageDataUrl; }
    public void setImageDataUrl(String imageDataUrl) { this.imageDataUrl = imageDataUrl; }

    public String getImageAspectRatio() { return imageAspectRatio; }
    public void setImageAspectRatio(String imageAspectRatio) { this.imageAspectRatio = imageAspectRatio; }

    public Integer getImageCropPosition() { return imageCropPosition; }
    public void setImageCropPosition(Integer imageCropPosition) { this.imageCropPosition = imageCropPosition; }

    public Integer getImageCropZoom() { return imageCropZoom; }
    public void setImageCropZoom(Integer imageCropZoom) { this.imageCropZoom = imageCropZoom; }
}

