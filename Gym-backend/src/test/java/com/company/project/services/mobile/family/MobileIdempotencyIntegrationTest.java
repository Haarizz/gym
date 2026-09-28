package com.company.project.services.mobile.family;

import com.company.project.entities.MobileIdempotencyRecord;
import com.company.project.repositories.mobile.family.MobileIdempotencyRecordRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

import org.springframework.boot.test.mock.mockito.MockBean;
import com.company.project.config.DataInitializer;

@SpringBootTest
@ActiveProfiles("local") // Uses GYMBIOS and local credentials
public class MobileIdempotencyIntegrationTest {

    @MockBean
    private DataInitializer dataInitializer;

    @Autowired
    private MobileIdempotencyService idempotencyService;

    @Autowired
    private MobileIdempotencyRecordRepository repository;

    @Autowired
    private org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    @Test
    @DisplayName("DB Integration: Should create new lease, complete it, and support replay")
    void testBasicFlowAndReplay() {
        UUID key = UUID.randomUUID();
        String fingerprint = "payload-hash-1";

        MobileIdempotencyRecord lease = idempotencyService.acquireOrRenewLease(key, fingerprint);
        assertNotNull(lease);
        assertEquals("IN_PROGRESS", lease.getStatus());
        UUID leaseId = lease.getLeaseId();

        transactionTemplate.execute(status -> {
            idempotencyService.completeRequest(key, leaseId, "SUCCESS_RESPONSE");
            return null;
        });

        MobileIdempotencyRecord replayedLease = idempotencyService.acquireOrRenewLease(key, fingerprint);
        assertEquals("COMPLETED", replayedLease.getStatus());
        assertEquals("SUCCESS_RESPONSE", replayedLease.getResponsePayload());
    }

    @Test
    @DisplayName("Same-key with different payload should throw Exception")
    void testSameKeyDifferentPayload() {
        UUID key = UUID.randomUUID();
        idempotencyService.acquireOrRenewLease(key, "fingerprint-1");
        
        assertThrows(IllegalArgumentException.class, () -> {
            idempotencyService.acquireOrRenewLease(key, "fingerprint-2");
        });
    }

    @Test
    @DisplayName("Concurrent same-key requests should only allow one lease")
    void testConcurrentSameKey() throws InterruptedException {
        UUID key = UUID.randomUUID();
        String fingerprint = "payload-hash-1";
        
        int numThreads = 5;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numThreads);
        
        AtomicReference<Integer> successCount = new AtomicReference<>(0);
        AtomicReference<Integer> conflictCount = new AtomicReference<>(0);
        
        for (int i = 0; i < numThreads; i++) {
            executor.submit(() -> {
                try {
                    latch.await();
                    idempotencyService.acquireOrRenewLease(key, fingerprint);
                    successCount.getAndUpdate(v -> v + 1);
                } catch (Exception e) {
                    // Exception is thrown if unable to acquire lease
                    conflictCount.getAndUpdate(v -> v + 1);
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        
        latch.countDown();
        doneLatch.await();
        executor.shutdown();
        
        assertEquals(1, successCount.get());
        assertEquals(numThreads - 1, conflictCount.get());
    }
}
