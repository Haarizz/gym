package com.company.project.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class MessageGroupResponseDTO {
    private String id;
    private String name;
    private String description;
    private Integer memberCount;
    private List<String> members = new ArrayList<>();
    private Object criteria;
    private String createdBy;
    private LocalDateTime createdDate;
    private Boolean system;

    public MessageGroupResponseDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getMemberCount() { return memberCount; }
    public void setMemberCount(Integer memberCount) { this.memberCount = memberCount; }

    public List<String> getMembers() { return members; }
    public void setMembers(List<String> members) { this.members = members; }

    public Object getCriteria() { return criteria; }
    public void setCriteria(Object criteria) { this.criteria = criteria; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public Boolean getSystem() { return system; }
    public void setSystem(Boolean system) { this.system = system; }
}
