package com.company.project.security;

import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.hibernate.Session;
import org.springframework.stereotype.Component;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/**
 * Aspect that automatically enables the Hibernate "branchFilter" on the current
 * EntityManager session for any @Transactional method, if an active branch is set
 * in the BranchContextHolder.
 * 
 * This ensures that all database queries for branch-dependent entities are
 * automatically scoped to the active branch without needing to modify every
 * single repository and service method.
 */
@Aspect
@Component
public class BranchFilterAspect {

    @PersistenceContext
    private EntityManager entityManager;

    @Before("@annotation(org.springframework.transaction.annotation.Transactional) || @within(org.springframework.transaction.annotation.Transactional)")
    public void enableBranchFilter() {
        Long activeBranchId = BranchContextHolder.getActiveBranchId();
        if (activeBranchId != null) {
            Session session = entityManager.unwrap(Session.class);
            session.enableFilter("branchFilter").setParameter("branchId", activeBranchId);
        }
    }
}
