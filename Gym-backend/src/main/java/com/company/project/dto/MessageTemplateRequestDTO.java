package com.company.project.dto;

import java.util.ArrayList;
import java.util.List;

public class MessageTemplateRequestDTO {
    private String name;
    private String category;
    private String subject;
    private String content;
    private String type;
    private List<String> variables = new ArrayList<>();
    private Boolean active = true;

    public MessageTemplateRequestDTO() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public List<String> getVariables() { return variables; }
    public void setVariables(List<String> variables) { this.variables = variables; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
