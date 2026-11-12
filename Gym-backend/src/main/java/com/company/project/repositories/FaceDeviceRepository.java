package com.company.project.repositories;

import com.company.project.entities.FaceDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FaceDeviceRepository extends JpaRepository<FaceDevice, Long> {

    List<FaceDevice> findByEnabledTrueAndAutoSyncTrue();

    // Targeted updates, so a background sync never overwrites settings an admin saved meanwhile.
    @Transactional
    @Modifying
    @Query("update FaceDevice d set d.lastSyncAt = :at, d.lastSyncMessage = :msg where d.id = :id")
    int recordSync(@Param("id") Long id, @Param("at") LocalDateTime at, @Param("msg") String msg);

    @Transactional
    @Modifying
    @Query("update FaceDevice d set d.lastTestAt = :at, d.lastTestOk = :ok, d.lastTestMessage = :msg where d.id = :id")
    int recordTest(@Param("id") Long id, @Param("at") LocalDateTime at, @Param("ok") boolean ok, @Param("msg") String msg);

    List<FaceDevice> findByEnabledTrueAndReportEmailsIsNotNull();

    /** A sync found the device unavailable: start the outage clock (kept if already running). */
    @Transactional
    @Modifying
    @Query("update FaceDevice d set d.offlineSince = :at where d.id = :id and d.offlineSince is null")
    int markOffline(@Param("id") Long id, @Param("at") LocalDateTime at);

    /** The device answered again: close the running outage, if any. */
    @Transactional
    @Modifying
    @Query("update FaceDevice d set d.lastOutageStart = d.offlineSince, d.lastOutageEnd = :at, d.offlineSince = null "
            + "where d.id = :id and d.offlineSince is not null")
    int markOnline(@Param("id") Long id, @Param("at") LocalDateTime at);

    @Transactional
    @Modifying
    @Query("update FaceDevice d set d.lastReportAt = :at, d.lastReportMessage = :msg where d.id = :id")
    int recordReport(@Param("id") Long id, @Param("at") LocalDateTime at, @Param("msg") String msg);

    /** The nightly report for {@code day} is done (sent or given up on) — never sent twice. */
    @Transactional
    @Modifying
    @Query("update FaceDevice d set d.lastReportDate = :day where d.id = :id")
    int recordReportDay(@Param("id") Long id, @Param("day") java.time.LocalDate day);
}
