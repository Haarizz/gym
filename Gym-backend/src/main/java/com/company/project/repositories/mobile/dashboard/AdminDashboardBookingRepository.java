package com.company.project.repositories.mobile.dashboard;

import com.company.project.entities.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Admin-dashboard-only read queries for Personal Training sales.
 *
 * There is no dedicated "PT sale" entity in the schema (see audit); the most
 * complete available source is {@link Booking} against a {@link
 * com.company.project.entities.TrainingSession} of type "pt" — it is the only
 * source that carries trainer attribution, price, branch and a real date
 * together in one place. Only paid bookings are counted (cash-basis, consistent
 * with how the rest of the dashboard treats collected revenue).
 */
@Repository
public interface AdminDashboardBookingRepository extends JpaRepository<Booking, Long> {

    @Query("SELECT COALESCE(SUM(b.price), 0) FROM Booking b " +
           "WHERE b.session.type = 'pt' AND b.paymentStatus = 'paid' " +
           "AND b.session.date >= :start AND b.session.date < :end")
    BigDecimal sumPaidPtBookingsInPeriod(@Param("start") LocalDate start, @Param("end") LocalDate end);

    // (trainerName, sessionCount, salesAmount)
    @Query("SELECT COALESCE(b.session.trainer.name, 'Unassigned'), COUNT(b), COALESCE(SUM(b.price), 0) " +
           "FROM Booking b " +
           "WHERE b.session.type = 'pt' AND b.paymentStatus = 'paid' " +
           "AND b.session.date >= :start AND b.session.date < :end " +
           "GROUP BY b.session.trainer.name")
    List<Object[]> sumAndCountGroupedByTrainer(@Param("start") LocalDate start, @Param("end") LocalDate end);
}
