package com.company.project.services;

import com.company.project.entities.Notification;
import com.company.project.repositories.NotificationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.SmartTransactionObject;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * A notification that fails to insert (e.g. its eventKey collides with an old row)
 * must not break the business transaction that asked for it.
 */
class NotificationServiceIsolationTest {

    /**
     * Minimal manager with real Spring propagation semantics: participation marks
     * the shared transaction rollback-only; REQUIRES_NEW suspends it and begins a
     * separate one (like JpaTransactionManager, each call gets a fresh transaction
     * object that points at the thread's current transaction, if any).
     */
    static class StubTransactionManager extends AbstractPlatformTransactionManager {
        static final class Tx { boolean rollbackOnly; }
        static final class TxObject implements SmartTransactionObject {
            Tx tx;
            TxObject(Tx tx) { this.tx = tx; }
            @Override public boolean isRollbackOnly() { return tx != null && tx.rollbackOnly; }
            @Override public void flush() { }
        }
        private final ThreadLocal<Tx> current = new ThreadLocal<>();

        @Override protected Object doGetTransaction() { return new TxObject(current.get()); }
        @Override protected boolean isExistingTransaction(Object transaction) { return ((TxObject) transaction).tx != null; }
        @Override protected void doBegin(Object transaction, TransactionDefinition definition) {
            ((TxObject) transaction).tx = new Tx();
            current.set(((TxObject) transaction).tx);
        }
        @Override protected Object doSuspend(Object transaction) {
            ((TxObject) transaction).tx = null;
            Tx suspended = current.get();
            current.remove();
            return suspended;
        }
        @Override protected void doResume(Object transaction, Object suspendedResources) {
            current.set((Tx) suspendedResources);
        }
        @Override protected void doCommit(DefaultTransactionStatus status) { }
        @Override protected void doRollback(DefaultTransactionStatus status) { }
        @Override protected void doSetRollbackOnly(DefaultTransactionStatus status) {
            ((TxObject) status.getTransaction()).tx.rollbackOnly = true;
        }
        @Override protected void doCleanupAfterCompletion(Object transaction) { current.remove(); }
    }

    @Test
    @DisplayName("A duplicate-eventKey notification is skipped and the caller's transaction still commits")
    void failedInsertDoesNotPoisonCaller() {
        StubTransactionManager tm = new StubTransactionManager();
        NotificationRepository repository = mock(NotificationRepository.class);
        // Behave like the real transactional repository proxy: throw from inside a
        // participating transaction, which marks the surrounding one rollback-only.
        when(repository.save(any(Notification.class))).thenAnswer(inv -> {
            new TransactionTemplate(tm).executeWithoutResult(s -> {
                throw new DataIntegrityViolationException("duplicate key uk_company_event_key");
            });
            return null;
        });
        NotificationService service = new NotificationService(repository, mock(RoleService.class), tm);

        AtomicBoolean ran = new AtomicBoolean();
        assertDoesNotThrow(() -> new TransactionTemplate(tm).executeWithoutResult(s -> {
            service.notifyRoles(List.of("ADMIN", "MANAGER"), "New Member Joined", "x joined",
                    "SUCCESS", "MEDIUM", "MEMBERS", 21L, "/members", "MEMBER_CREATED_21");
            ran.set(true);
        }));
        assertTrue(ran.get());
        // Both roles still attempted (the first failure didn't abort the second).
        verify(repository, times(2)).save(any(Notification.class));
    }
}
