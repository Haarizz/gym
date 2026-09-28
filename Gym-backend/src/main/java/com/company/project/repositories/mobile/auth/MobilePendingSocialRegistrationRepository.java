package com.company.project.repositories.mobile.auth;

import com.company.project.entities.MobilePendingSocialRegistration;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MobilePendingSocialRegistrationRepository extends JpaRepository<MobilePendingSocialRegistration, Long> {

    Optional<MobilePendingSocialRegistration> findByProviderAndProviderUserId(String provider, String providerUserId);

    /**
     * Row-level lock (SELECT ... FOR UPDATE), same pattern as
     * MobilePendingRegistrationRepository.findByRegistrationTokenHashForUpdate —
     * closes the check-then-use gap between validating a pending token and
     * consuming the row.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from MobilePendingSocialRegistration r where r.pendingTokenHash = :tokenHash")
    Optional<MobilePendingSocialRegistration> findByPendingTokenHashForUpdate(String tokenHash);
}
