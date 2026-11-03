package com.company.project.repositories;

import com.company.project.entities.TrainingSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {
    // Row lock while booking a seat, so two concurrent bookings can't both take the last one.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM TrainingSession s WHERE s.id = :id")
    Optional<TrainingSession> findByIdForUpdate(@Param("id") Long id);

    @Modifying
    @Query("UPDATE TrainingSession s SET s.trainer = null WHERE s.trainer.id = :staffId")
    void clearTrainer(@Param("staffId") Long staffId);

    List<TrainingSession> findTop5ByStatusOrderByDateDescStartTimeDesc(String status);
    long countByDateBetween(java.time.LocalDate startDate, java.time.LocalDate endDate);

    long countByTrainer_IdAndStatusAndDateBetween(Long trainerId, String status, LocalDate start, LocalDate end);

    @Query("SELECT COUNT(s) FROM TrainingSession s " +
           "WHERE s.date BETWEEN :start AND :end AND LOWER(s.status) <> 'cancelled'")
    long countNonCancelledBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    // (className, totalCapacity) for group classes (PT excluded) in the period
    @Query("SELECT s.name, COALESCE(SUM(s.capacity), 0) FROM TrainingSession s " +
           "WHERE s.date BETWEEN :start AND :end AND LOWER(s.status) <> 'cancelled' " +
           "AND LOWER(s.type) <> 'pt' GROUP BY s.name ORDER BY s.name")
    List<Object[]> sumClassCapacityByNameBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    // Non-cancelled PT sessions in the period across every trainer (institution-wide targets)
    @Query("SELECT COUNT(s) FROM TrainingSession s WHERE LOWER(s.type) = 'pt' " +
           "AND LOWER(s.status) <> 'cancelled' AND s.date BETWEEN :start AND :end")
    long countPtSessionsBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    // (trainerId, sessionCount) for non-cancelled PT sessions in the period
    @Query("SELECT s.trainer.id, COUNT(s) FROM TrainingSession s " +
           "WHERE s.trainer.id IN :trainerIds AND LOWER(s.type) = 'pt' " +
           "AND LOWER(s.status) <> 'cancelled' AND s.date BETWEEN :start AND :end " +
           "GROUP BY s.trainer.id")
    List<Object[]> countPtSessionsByTrainerBetween(@Param("trainerIds") Collection<Long> trainerIds,
                                                   @Param("start") LocalDate start,
                                                   @Param("end") LocalDate end);

    // ── Staff targets: PT sessions a member actually booked ─────────────────
    // A PT session is an open slot until someone books it (in the app or at the desk); it
    // counts toward a target once it has a booking that isn't cancelled or still awaiting
    // payment approval.
    String BOOKED_PT = "LOWER(s.type) = 'pt' AND LOWER(s.status) <> 'cancelled' AND s.date BETWEEN :start AND :end " +
            "AND EXISTS (SELECT b.id FROM Booking b WHERE b.session = s " +
            "AND LOWER(COALESCE(b.status, '')) NOT IN ('cancelled', 'pending_approval', 'waitlisted'))";

    @Query("SELECT COUNT(s) FROM TrainingSession s WHERE " + BOOKED_PT)
    long countBookedPtSessionsBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    // (trainerId, sessionCount) for booked PT sessions in the period
    @Query("SELECT s.trainer.id, COUNT(s) FROM TrainingSession s WHERE s.trainer.id IN :trainerIds AND " + BOOKED_PT +
           " GROUP BY s.trainer.id")
    List<Object[]> countBookedPtSessionsByTrainerBetween(@Param("trainerIds") Collection<Long> trainerIds,
                                                         @Param("start") LocalDate start,
                                                         @Param("end") LocalDate end);

    // Receipts (among the given ids) that paid for a booking on a PT session
    @Query("SELECT b.receiptId FROM Booking b WHERE b.receiptId IN :receiptIds AND LOWER(b.session.type) = 'pt'")
    List<Long> findPtBookingReceiptIds(@Param("receiptIds") Collection<Long> receiptIds);

    // Receipts paying for bookings on this trainer's PT sessions — app bookings are processed
    // by "Mobile App", so the session's trainer is who they count for
    @Query("SELECT b.receiptId FROM Booking b WHERE b.receiptId IS NOT NULL AND LOWER(b.session.type) = 'pt' " +
           "AND b.session.trainer.id = :trainerId")
    List<Long> findPtBookingReceiptIdsByTrainer(@Param("trainerId") Long trainerId);
}
