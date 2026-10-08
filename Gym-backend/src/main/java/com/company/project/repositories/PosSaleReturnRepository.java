package com.company.project.repositories;

import com.company.project.entities.PosSaleReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PosSaleReturnRepository extends JpaRepository<PosSaleReturn, Long>, JpaSpecificationExecutor<PosSaleReturn> {

    List<PosSaleReturn> findByTransactionIdOrderByCreatedAtDesc(Long transactionId);

    List<PosSaleReturn> findByPosSessionIdOrderByCreatedAtDesc(Long posSessionId);

    List<PosSaleReturn> findByBusinessDateOrderByCreatedAtDesc(LocalDate businessDate);

    List<PosSaleReturn> findByBusinessDateBetweenOrderByCreatedAtDesc(LocalDate from, LocalDate to);
}
