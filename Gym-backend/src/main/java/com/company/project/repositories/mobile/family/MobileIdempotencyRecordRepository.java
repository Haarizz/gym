package com.company.project.repositories.mobile.family;

import com.company.project.entities.MobileIdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

import java.util.UUID;

@Repository
public interface MobileIdempotencyRecordRepository extends JpaRepository<MobileIdempotencyRecord, UUID> {

    @Modifying
    @Query("UPDATE MobileIdempotencyRecord r SET r.leaseId = :newLeaseId, r.status = 'IN_PROGRESS', r.updatedAt = :now WHERE r.idempotencyKey = :key AND r.leaseId = :oldLeaseId")
    int takeoverLease(@Param("key") UUID key, @Param("oldLeaseId") UUID oldLeaseId, @Param("newLeaseId") UUID newLeaseId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE MobileIdempotencyRecord r SET r.status = :status, r.responsePayload = :payload, r.updatedAt = :now WHERE r.idempotencyKey = :key AND r.leaseId = :leaseId")
    int completeLease(@Param("key") UUID key, @Param("leaseId") UUID leaseId, @Param("status") String status, @Param("payload") String payload, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE MobileIdempotencyRecord r SET r.status = 'FAILED', r.updatedAt = :now WHERE r.idempotencyKey = :key AND r.leaseId = :leaseId AND r.status = 'IN_PROGRESS'")
    int failLease(@Param("key") UUID key, @Param("leaseId") UUID leaseId, @Param("now") LocalDateTime now);

    /**
     * Claims a brand-new key atomically: returns 1 if this call created the row, 0 if
     * another request already holds it. save() can't be used here — with an assigned id
     * it merges, so a racing request would silently overwrite the winner's lease.
     */
    @Modifying
    @Query(value = "INSERT INTO mobile_idempotency_records (idempotency_key, status, request_fingerprint, lease_id, created_at, updated_at) "
            + "VALUES (:key, 'IN_PROGRESS', :fingerprint, :leaseId, :now, :now) ON CONFLICT (idempotency_key) DO NOTHING",
            nativeQuery = true)
    int insertIfAbsent(@Param("key") UUID key, @Param("fingerprint") String fingerprint,
                       @Param("leaseId") UUID leaseId, @Param("now") LocalDateTime now);
}
