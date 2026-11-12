package com.company.project.performance.events;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

import java.util.List;

/** An add-on's payment, approval or cancellation changes what the package it sold earns. */
@Component
public class AddonRedirect implements SourceRedirect {

    @PersistenceContext
    private EntityManager em;

    @Override
    public String sourceType() {
        return "addon";
    }

    @Override
    public String targetType() {
        return "enrolment";
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Long> targets(Long sourceId) {
        return ((List<Number>) em.createNativeQuery("SELECT id FROM package_enrolments WHERE member_addon_id = :id")
                .setParameter("id", sourceId).getResultList()).stream().map(Number::longValue).toList();
    }
}
