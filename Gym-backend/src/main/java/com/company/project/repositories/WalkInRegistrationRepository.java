package com.company.project.repositories;

import com.company.project.entities.WalkInRegistration;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface WalkInRegistrationRepository extends JpaRepository<WalkInRegistration, Long> {

    List<WalkInRegistration> findByStatusAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(String status, LocalDateTime since);

    /** Locks the row so two desks confirming the same visitor can't both grant access. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM WalkInRegistration r WHERE r.id = :id")
    Optional<WalkInRegistration> findByIdForUpdate(@Param("id") Long id);
}
