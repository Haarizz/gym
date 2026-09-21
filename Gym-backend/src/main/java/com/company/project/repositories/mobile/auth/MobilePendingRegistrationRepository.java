package com.company.project.repositories.mobile.auth;

import com.company.project.entities.MobilePendingRegistration;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MobilePendingRegistrationRepository extends JpaRepository<MobilePendingRegistration, Long> {

    Optional<MobilePendingRegistration> findByRegistrationTokenHash(String registrationTokenHash);

    /**
     * Row-level lock (SELECT ... FOR UPDATE) acquired before any OTP validation —
     * this, plus every write path below locking the same way, is what closes the
     * check-then-use gap between validating an OTP and consuming the row.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from MobilePendingRegistration r where r.registrationTokenHash = :tokenHash")
    Optional<MobilePendingRegistration> findByRegistrationTokenHashForUpdate(String tokenHash);

    Optional<MobilePendingRegistration> findByEmailNormalized(String emailNormalized);

    Optional<MobilePendingRegistration> findByUsernameNormalized(String usernameNormalized);
}
