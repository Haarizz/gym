package com.company.project.dto;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class MessagingRecipientDTO {
    private String id;
    private String name;
    private String email;
    private String phone;
    private String type;
    private String membershipStatus;
    private String membershipPlan;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime membershipExpiry;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime joinDate;
    private Boolean isVip = false;
    private String location;
    private String photoUrl;
    private List<String> tags = new ArrayList<>();

    public MessagingRecipientDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getMembershipStatus() { return membershipStatus; }
    public void setMembershipStatus(String membershipStatus) { this.membershipStatus = membershipStatus; }

    public String getMembershipPlan() { return membershipPlan; }
    public void setMembershipPlan(String membershipPlan) { this.membershipPlan = membershipPlan; }

    public LocalDateTime getMembershipExpiry() { return membershipExpiry; }
    public void setMembershipExpiry(LocalDateTime membershipExpiry) { this.membershipExpiry = membershipExpiry; }

    public LocalDateTime getJoinDate() { return joinDate; }
    public void setJoinDate(LocalDateTime joinDate) { this.joinDate = joinDate; }

    public Boolean getIsVip() { return isVip; }
    public void setIsVip(Boolean isVip) { this.isVip = isVip; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}
