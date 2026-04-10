package com.company.project.repositories;

import com.company.project.entities.JournalEntrySource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface JournalEntrySourceRepository extends JpaRepository<JournalEntrySource, Long> {

    boolean existsBySourceEntityTypeAndSourceEntityId(String sourceEntityType, Long sourceEntityId);

    Optional<JournalEntrySource> findBySourceEntityTypeAndSourceEntityId(String sourceEntityType, Long sourceEntityId);
}
