package com.company.project.performance.events;

import com.company.project.entities.*;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostRemove;
import jakarta.persistence.PostUpdate;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

/**
 * JPA listener on every entity that can earn credit (receipts, POS sales, leads, training
 * sessions and their bookings, training package enrolments and the add-ons they were sold as). It only records which rows changed; the recorder reconciles them
 * after commit. Hibernate instantiates listeners itself, so the recorder is looked up from the
 * Spring context.
 */
@Component
public class PerformanceSourceListener implements ApplicationContextAware {

    private static volatile ApplicationContext context;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        context = applicationContext;
    }

    @PostPersist
    @PostUpdate
    @PostRemove
    public void changed(Object entity) {
        if (context == null) return;
        PerformanceEventRecorder recorder;
        try {
            recorder = context.getBean(PerformanceEventRecorder.class);
        } catch (BeansException e) {
            return;
        }
        if (entity instanceof Receipt r) recorder.touch("receipt", r.getId());
        else if (entity instanceof SaleTransaction s) recorder.touch("sale", s.getId());
        else if (entity instanceof Lead l) recorder.touch("lead", l.getId());
        else if (entity instanceof TrainingSession t) recorder.touch("session", t.getId());
        else if (entity instanceof PackageEnrolment p) recorder.touch("enrolment", p.getId());
        else if (entity instanceof MemberAddon a) recorder.touch("addon", a.getId());
        if (entity instanceof Booking b) {
            if (b.getSession() != null) recorder.touch("session", b.getSession().getId());
            if (b.getEnrolmentId() != null) recorder.touch("enrolment", b.getEnrolmentId());
            // A paid PT booking earns through its receipt; a refund changes what it earns.
            if (b.getReceiptId() != null) recorder.touch("receipt", b.getReceiptId());
        }
    }
}
