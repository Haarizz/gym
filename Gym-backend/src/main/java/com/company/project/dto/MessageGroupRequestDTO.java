package com.company.project.dto;

import java.util.ArrayList;
import java.util.List;

public class MessageGroupRequestDTO {
    private String name;
    private String description;
    private Object criteria;
    private List<String> members = new ArrayList<>();
    private Boolean system = false;

    public MessageGroupRequestDTO() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Object getCriteria() { return criteria; }
    public void setCriteria(Object criteria) { this.criteria = criteria; }

    public List<String> getMembers() { return members; }
    public void setMembers(List<String> members) { this.members = members; }

    public Boolean getSystem() { return system; }
    public void setSystem(Boolean system) { this.system = system; }
}
