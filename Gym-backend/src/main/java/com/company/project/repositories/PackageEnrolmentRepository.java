package com.company.project.repositories;

import com.company.project.entities.PackageEnrolment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PackageEnrolmentRepository extends JpaRepository<PackageEnrolment, Long> {

    List<PackageEnrolment> findByMemberIdOrderByStartDateDesc(Long memberId);

    List<PackageEnrolment> findByMemberIdAndStatusOrderByEndDateAsc(Long memberId, String status);

    List<PackageEnrolment> findByTrainerIdOrderByStartDateDesc(Long trainerId);

    Optional<PackageEnrolment> findByMemberAddonId(Long memberAddonId);

    @Query("SELECT e FROM PackageEnrolment e ORDER BY e.startDate DESC, e.id DESC")
    List<PackageEnrolment> findAllNewestFirst();

    boolean existsByPackageId(Long packageId);

    /** (enrolment id, lower-case booking status, checked-in time, session date) for every linked booking. */
    @Query("SELECT b.enrolmentId, LOWER(b.status), b.checkedInAt, s.date FROM Booking b JOIN b.session s " +
           "WHERE b.enrolmentId IN :ids")
    List<Object[]> bookingStatesFor(@Param("ids") List<Long> ids);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM PackageEnrolment e WHERE e.id = :id")
    Optional<PackageEnrolment> findByIdForUpdate(@Param("id") Long id);
}
