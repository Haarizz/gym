package com.company.project.repositories;

import com.company.project.entities.FinancialAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface FinancialAuditLogRepository
        extends JpaRepository<FinancialAuditLog, Long>, JpaSpecificationExecutor<FinancialAuditLog> {
}
