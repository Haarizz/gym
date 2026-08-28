package com.company.project.repositories;

import com.company.project.entities.BiosActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface BiosActivityLogRepository extends JpaRepository<BiosActivityLog, Long> {
    List<BiosActivityLog> findByTypeOrderByCreatedAtDesc(String type, Pageable pageable);
    long countByTypeAndCreatedAtAfter(String type, LocalDateTime after);
}
