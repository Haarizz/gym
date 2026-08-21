package com.company.project.security;

import com.company.project.entities.BranchAware;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreRemove;
import jakarta.persistence.PreUpdate;
import org.springframework.web.context.request.RequestContextHolder;

public class BranchSecurityListener {

    @PostLoad
    public void checkBranchAccessRead(Object entity) {
        if (entity instanceof BranchAware) {
            BranchAware branchAware = (BranchAware) entity;
            Long activeBranchId = BranchContextHolder.getActiveBranchId();
            
            // For reads: if activeBranchId is not null, enforce strict isolation
            if (activeBranchId != null && branchAware.getBranchId() != null) {
                if (!branchAware.getBranchId().equals(activeBranchId)) {
                    throw new SecurityException("Access Denied: Attempted to read a record belonging to another branch.");
                }
            }
        }
    }

    @PrePersist
    @PreUpdate
    @PreRemove
    public void checkBranchAccessWrite(Object entity) {
        if (entity instanceof BranchAware) {
            BranchAware branchAware = (BranchAware) entity;
            Long activeBranchId = BranchContextHolder.getActiveBranchId();
            
            // Check if this is executing within an HTTP request (not a background job)
            boolean isWebRequest = RequestContextHolder.getRequestAttributes() != null;
            
            if (isWebRequest) {
                if (activeBranchId == null) {
                    throw new SecurityException("Mutation is not allowed in All Branches mode. Please select a specific branch.");
                } else {
                    // For writes: activeBranchId is present, enforce strict isolation
                    if (branchAware.getBranchId() != null && !branchAware.getBranchId().equals(activeBranchId)) {
                        throw new SecurityException("Access Denied: Attempted to modify a record belonging to another branch.");
                    }
                }
            }
        }
    }
}
