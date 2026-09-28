package com.company.project.services.mobile.family;

import com.company.project.entities.MobileIdempotencyRecord;
import com.company.project.repositories.mobile.family.MobileIdempotencyRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Optional;

@Service
public class MobileIdempotencyService {

    @Autowired
    private MobileIdempotencyRecordRepository idempotencyRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public MobileIdempotencyRecord acquireOrRenewLease(UUID idempotencyKey, String payloadFingerprint) {
        Optional<MobileIdempotencyRecord> optRecord = idempotencyRepository.findById(idempotencyKey);

        if (optRecord.isPresent()) {
            MobileIdempotencyRecord record = optRecord.get();
            if (record.getRequestFingerprint() != null && !record.getRequestFingerprint().equals(payloadFingerprint)) {
                throw new IllegalArgumentException("Idempotency key already used with different payload");
            }
            if ("COMPLETED".equals(record.getStatus())) {
                return record; // Cached response
            }
            // A FAILED attempt (business-rule rejection, rolled back) can be retried
            // immediately; an IN_PROGRESS one only once it's stale (its worker died).
            boolean retryable = "FAILED".equals(record.getStatus())
                    || ("IN_PROGRESS".equals(record.getStatus())
                        && record.getUpdatedAt().isBefore(LocalDateTime.now().minusMinutes(5)));
            if (!retryable) {
                throw new IllegalStateException("Request is already in progress.");
            }
            UUID newLeaseId = UUID.randomUUID();
            int rows = idempotencyRepository.takeoverLease(idempotencyKey, record.getLeaseId(), newLeaseId, LocalDateTime.now());
            if (rows == 0) {
                throw new IllegalStateException("Lease takeover failed for key: " + idempotencyKey);
            }
            record.setLeaseId(newLeaseId);
            record.setStatus("IN_PROGRESS");
            record.setUpdatedAt(LocalDateTime.now());
            return record;
        }

        MobileIdempotencyRecord newRecord = new MobileIdempotencyRecord();
        newRecord.setIdempotencyKey(idempotencyKey);
        newRecord.setLeaseId(UUID.randomUUID());
        newRecord.setStatus("IN_PROGRESS");
        newRecord.setRequestFingerprint(payloadFingerprint);
        return idempotencyRepository.save(newRecord);
    }

    // Executes inline (REQUIRED) in the calling transaction.
    @Transactional(propagation = Propagation.MANDATORY)
    public void completeRequest(UUID idempotencyKey, UUID leaseId, String responsePayload) {
        int rows = idempotencyRepository.completeLease(idempotencyKey, leaseId, "COMPLETED", responsePayload, LocalDateTime.now());
        if (rows == 0) {
            throw new java.util.ConcurrentModificationException("Lease was stolen or lost. Transaction rolling back.");
        }
    }

    /**
     * Releases a lease whose purchase was rejected and rolled back, so a retry with
     * the same key runs again instead of waiting out the 5-minute stale window.
     * Runs in its own transaction because the caller's is rolling back.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void failRequest(UUID idempotencyKey, UUID leaseId) {
        idempotencyRepository.failLease(idempotencyKey, leaseId, LocalDateTime.now());
    }
}
