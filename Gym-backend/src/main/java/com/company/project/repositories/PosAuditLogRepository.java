package com.company.project.repositories;

import com.company.project.entities.PosAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface PosAuditLogRepository extends JpaRepository<PosAuditLog, Long>, JpaSpecificationExecutor<PosAuditLog> {
}
