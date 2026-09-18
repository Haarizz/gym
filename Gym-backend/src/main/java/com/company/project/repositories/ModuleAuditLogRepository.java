package com.company.project.repositories;

import com.company.project.entities.ModuleAuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModuleAuditLogRepository extends JpaRepository<ModuleAuditLog, Long> {

    List<ModuleAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
