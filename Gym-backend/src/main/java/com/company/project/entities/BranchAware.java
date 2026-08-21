package com.company.project.entities;

/**
 * Interface to be implemented by all entities that are branch-specific.
 * This allows the BranchSecurityListener to genericly retrieve the branch ID
 * and enforce cross-branch access controls.
 */
public interface BranchAware {
    Long getBranchId();
    void setBranchId(Long branchId);
}
