package com.company.project.dto.mobile.membership;

import java.time.LocalDateTime;

public class MobileActiveAddOnDTO {
    private Long id;
    private String addonName;
    private String category;
    private LocalDateTime expiryDate;
    private String status;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAddonName() { return addonName; }
    public void setAddonName(String addonName) { this.addonName = addonName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public LocalDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
