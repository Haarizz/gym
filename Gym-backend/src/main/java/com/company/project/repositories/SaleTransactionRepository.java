package com.company.project.repositories;

import com.company.project.entities.SaleTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaleTransactionRepository extends JpaRepository<SaleTransaction, Long>, JpaSpecificationExecutor<SaleTransaction> {

    List<SaleTransaction> findByPosSessionIdOrderByCreatedAtDesc(Long sessionId);

    List<SaleTransaction> findByMemberIdOrderByCreatedAtDesc(Long memberId);

    boolean existsByTransactionNumber(String transactionNumber);
}
