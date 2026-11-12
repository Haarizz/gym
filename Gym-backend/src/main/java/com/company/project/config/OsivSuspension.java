package com.company.project.config;

import jakarta.persistence.EntityManagerFactory;
import org.springframework.orm.jpa.EntityManagerFactoryUtils;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Sets aside the request's open-session-in-view EntityManager so the code that follows
 * can switch tenant (each repository call / transaction then opens a fresh EntityManager
 * on whichever tenant DataSource is current), and leaves a placeholder behind when done.
 *
 * <p>Why the placeholder: OpenEntityManagerInViewInterceptor unbinds "its" EntityManager
 * when the request ends and throws {@code IllegalStateException: No value for key ...
 * bound to thread} if nothing is bound. The request's original EntityManager is closed
 * straight away (it may be pinned to the global DB), and an unused one — which never
 * takes a connection — is bound on {@link #close()} for the interceptor to close.
 *
 * <pre>
 * try (OsivSuspension ignored = OsivSuspension.suspend(entityManagerFactory)) {
 *     TenantContextHolder.setCurrentTenant(slug);
 *     ...
 * }
 * </pre>
 */
public final class OsivSuspension implements AutoCloseable {

    private final EntityManagerFactory emf;
    private final boolean wasBound;

    private OsivSuspension(EntityManagerFactory emf, boolean wasBound) {
        this.emf = emf;
        this.wasBound = wasBound;
    }

    public static OsivSuspension suspend(EntityManagerFactory emf) {
        boolean bound = TransactionSynchronizationManager.hasResource(emf);
        if (bound) {
            EntityManagerHolder holder = (EntityManagerHolder) TransactionSynchronizationManager.unbindResource(emf);
            EntityManagerFactoryUtils.closeEntityManager(holder.getEntityManager());
        }
        return new OsivSuspension(emf, bound);
    }

    @Override
    public void close() {
        // Anything still bound here was bound by the work itself; close it rather than leak it.
        if (TransactionSynchronizationManager.hasResource(emf)) {
            EntityManagerHolder stray = (EntityManagerHolder) TransactionSynchronizationManager.unbindResource(emf);
            EntityManagerFactoryUtils.closeEntityManager(stray.getEntityManager());
        }
        if (wasBound) {
            TransactionSynchronizationManager.bindResource(emf, new EntityManagerHolder(emf.createEntityManager()));
        }
    }
}
