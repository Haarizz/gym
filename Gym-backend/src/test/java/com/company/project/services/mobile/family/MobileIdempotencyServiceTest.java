package com.company.project.services.mobile.family;

import com.company.project.entities.MobileIdempotencyRecord;
import com.company.project.repositories.mobile.family.MobileIdempotencyRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileIdempotencyServiceTest {

    @Mock
    private MobileIdempotencyRecordRepository repository;

    @InjectMocks
    private MobileIdempotencyService idempotencyService;

    private MobileIdempotencyRecord staleRecord;
    private MobileIdempotencyRecord completedRecord;

    private UUID key1 = UUID.randomUUID();
    private UUID key2 = UUID.randomUUID();
    private UUID lease1 = UUID.randomUUID();
    private UUID lease2 = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        staleRecord = new MobileIdempotencyRecord();
        staleRecord.setIdempotencyKey(key1);
        staleRecord.setLeaseId(lease1);
        staleRecord.setStatus("IN_PROGRESS");
        staleRecord.setUpdatedAt(LocalDateTime.now().minusMinutes(10)); // Stale

        completedRecord = new MobileIdempotencyRecord();
        completedRecord.setIdempotencyKey(key2);
        completedRecord.setLeaseId(lease2);
        completedRecord.setStatus("COMPLETED");
        completedRecord.setResponsePayload("SUCCESS");
        completedRecord.setUpdatedAt(LocalDateTime.now().minusMinutes(2));
    }

    @Test
    @DisplayName("Should create new lease if none exists")
    void testNewLease() {
        UUID newKey = UUID.randomUUID();
        when(repository.findById(newKey)).thenReturn(Optional.empty());
        when(repository.save(any(MobileIdempotencyRecord.class))).thenAnswer(i -> i.getArguments()[0]);

        MobileIdempotencyRecord lease = idempotencyService.acquireOrRenewLease(newKey, "fingerprint1");
        assertNotNull(lease);
        assertEquals("IN_PROGRESS", lease.getStatus());
        assertNotNull(lease.getLeaseId());
    }

    @Test
    @DisplayName("Should return completed response if already COMPLETED")
    void testCompletedReplay() {
        when(repository.findById(key2)).thenReturn(Optional.of(completedRecord));

        MobileIdempotencyRecord lease = idempotencyService.acquireOrRenewLease(key2, "fingerprint1");
        assertEquals("COMPLETED", lease.getStatus());
        assertEquals("SUCCESS", lease.getResponsePayload());
    }

    @Test
    @DisplayName("Should takeover stale lease")
    void testStaleTakeover() {
        when(repository.findById(key1)).thenReturn(Optional.of(staleRecord));
        when(repository.takeoverLease(eq(key1), eq(lease1), any(UUID.class), any(LocalDateTime.class))).thenReturn(1);

        MobileIdempotencyRecord lease = idempotencyService.acquireOrRenewLease(key1, "fingerprint1");
        assertNotEquals(lease1, lease.getLeaseId());
        assertEquals("IN_PROGRESS", lease.getStatus());
    }

    @Test
    @DisplayName("Should throw Exception on takeover race condition")
    void testTakeoverRace() {
        when(repository.findById(key1)).thenReturn(Optional.of(staleRecord));
        when(repository.takeoverLease(eq(key1), eq(lease1), any(UUID.class), any(LocalDateTime.class))).thenReturn(0); // 0 rows updated means someone else took it

        assertThrows(IllegalStateException.class, () -> idempotencyService.acquireOrRenewLease(key1, "fingerprint1"));
    }

    @Test
    @DisplayName("Should complete lease successfully if lock held")
    void testCompleteSuccess() {
        when(repository.completeLease(eq(key1), eq(lease1), eq("COMPLETED"), eq("SUCCESS"), any(LocalDateTime.class))).thenReturn(1);
        
        assertDoesNotThrow(() -> idempotencyService.completeRequest(key1, lease1, "SUCCESS"));
    }

    @Test
    @DisplayName("Should throw ConcurrentModificationException if lease stolen (rolls back transaction B)")
    void testCompleteFailureRollback() {
        when(repository.completeLease(eq(key1), eq(lease1), eq("COMPLETED"), eq("SUCCESS"), any(LocalDateTime.class))).thenReturn(0);
        
        Exception ex = assertThrows(java.util.ConcurrentModificationException.class, () -> idempotencyService.completeRequest(key1, lease1, "SUCCESS"));
        assertEquals("Lease was stolen or lost. Transaction rolling back.", ex.getMessage());
    }

    @Test
    @DisplayName("A FAILED attempt can be retried immediately with the same key")
    void testFailedRetake() {
        MobileIdempotencyRecord failed = new MobileIdempotencyRecord();
        failed.setIdempotencyKey(key1);
        failed.setLeaseId(lease1);
        failed.setStatus("FAILED");
        failed.setRequestFingerprint("fingerprint1");
        failed.setUpdatedAt(LocalDateTime.now());
        when(repository.findById(key1)).thenReturn(Optional.of(failed));
        when(repository.takeoverLease(eq(key1), eq(lease1), any(UUID.class), any(LocalDateTime.class))).thenReturn(1);

        MobileIdempotencyRecord lease = idempotencyService.acquireOrRenewLease(key1, "fingerprint1");
        assertEquals("IN_PROGRESS", lease.getStatus());
        assertNotEquals(lease1, lease.getLeaseId());
    }

    @Test
    @DisplayName("A fresh IN_PROGRESS attempt is still rejected")
    void testFreshInProgressRejected() {
        staleRecord.setUpdatedAt(LocalDateTime.now());
        when(repository.findById(key1)).thenReturn(Optional.of(staleRecord));

        assertThrows(IllegalStateException.class, () -> idempotencyService.acquireOrRenewLease(key1, null));
        verify(repository, never()).takeoverLease(any(), any(), any(), any());
    }
}
