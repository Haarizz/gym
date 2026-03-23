package com.company.project.repositories;

import com.company.project.entities.BankStatementLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BankStatementLineRepository extends JpaRepository<BankStatementLine, Long> {

    List<BankStatementLine> findByReconciliationIdOrderByTransactionDateAsc(Long reconciliationId);

    void deleteByReconciliationId(Long reconciliationId);

    long countByReconciliationIdAndIsMatchedFalse(Long reconciliationId);
}
