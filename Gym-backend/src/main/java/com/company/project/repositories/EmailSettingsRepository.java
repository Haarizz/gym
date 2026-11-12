package com.company.project.repositories;

import com.company.project.entities.EmailSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailSettingsRepository extends JpaRepository<EmailSettings, Long> {

    Optional<EmailSettings> findFirstByOrderByIdAsc();

    @Transactional
    @Modifying
    @Query("update EmailSettings e set e.lastTestAt = :at, e.lastTestOk = :ok, e.lastTestMessage = :msg where e.id = :id")
    int recordTest(@Param("id") Long id, @Param("at") LocalDateTime at, @Param("ok") boolean ok, @Param("msg") String msg);
}
