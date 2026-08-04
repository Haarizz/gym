package com.company.project.dto;

public class TrendingTopicDTO {

    private String topic;
    private int postCount;

    public TrendingTopicDTO() {}

    public TrendingTopicDTO(String topic, int postCount) {
        this.topic = topic;
        this.postCount = postCount;
    }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public int getPostCount() { return postCount; }
    public void setPostCount(int postCount) { this.postCount = postCount; }
}
