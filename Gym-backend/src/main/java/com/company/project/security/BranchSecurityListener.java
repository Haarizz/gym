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

    /**
     * Runs before every branch-aware entity is first saved. Most services set
     * branchId explicitly (e.g. via BranchService.resolveBranchForCreate), but
     * a few historically didn't, which either left branch_id NULL (orphaning
     * the row from the branch filter) or silently trusted an unvalidated
     * client-supplied value. This is the single place that backstops both:
     * default to the caller's active branch when nothing was set, and reject
     * any mismatch against the active branch when something was.
     */
    @PrePersist
    public void assignAndCheckBranchOnCreate(Object entity) {
        if (entity instanceof BranchAware) {
            BranchAware branchAware = (BranchAware) entity;
            Long activeBranchId = BranchContextHolder.getActiveBranchId();
            boolean isWebRequest = RequestContextHolder.getRequestAttributes() != null;

            if (branchAware.getBranchId() == null) {
                if (activeBranchId != null) {
                    branchAware.setBranchId(activeBranchId);
                } else if (isWebRequest) {
                    // All Branches mode (admin-only) with no explicit branch set by
                    // the service — mirrors BranchService.resolveBranchForCreate's
                    // requirement that a branch be named explicitly in this mode.
                    throw new SecurityException("Branch must be specified when operating in All Branches mode.");
                }
                return;
            }

            if (isWebRequest && activeBranchId != null && !branchAware.getBranchId().equals(activeBranchId)) {
                throw new SecurityException("Access Denied: Attempted to create a record for another branch.");
            }
        }
    }

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
