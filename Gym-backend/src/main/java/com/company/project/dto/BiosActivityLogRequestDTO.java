package com.company.project.dto;

public class BiosActivityLogRequestDTO {
    private String type;
    private String title;
    private String format;
    private Integer rowCount;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }
    public Integer getRowCount() { return rowCount; }
    public void setRowCount(Integer rowCount) { this.rowCount = rowCount; }
}
