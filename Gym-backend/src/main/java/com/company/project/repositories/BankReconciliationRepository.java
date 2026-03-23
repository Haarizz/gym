package com.company.project.repositories;

import com.company.project.entities.BankReconciliation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BankReconciliationRepository extends JpaRepository<BankReconciliation, Long> {

    List<BankReconciliation> findAllByOrderByStatementDateDesc();

    List<BankReconciliation> findByBankAccountNameOrderByStatementDateDesc(String bankAccountName);
}
