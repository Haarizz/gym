package com.company.project.repositories;

import com.company.project.entities.CommunicationRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommunicationRecordRepository extends JpaRepository<CommunicationRecord, Long> {

    List<CommunicationRecord> findByFollowUpIdOrderByDateDesc(Long followUpId);
}
