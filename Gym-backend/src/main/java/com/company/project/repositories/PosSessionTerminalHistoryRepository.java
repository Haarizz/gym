package com.company.project.repositories;

import com.company.project.entities.PosSessionTerminalHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PosSessionTerminalHistoryRepository extends JpaRepository<PosSessionTerminalHistory, Long> {

    List<PosSessionTerminalHistory> findBySessionIdOrderByStartedAtAsc(Long sessionId);

    Optional<PosSessionTerminalHistory> findFirstBySessionIdAndEndedAtIsNullOrderByStartedAtDesc(Long sessionId);
}
