package com.company.project.repositories;

import com.company.project.entities.PosCreditPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PosCreditPaymentRepository extends JpaRepository<PosCreditPayment, Long> {

    List<PosCreditPayment> findByMemberIdOrderByCreatedAtDesc(Long memberId);

    List<PosCreditPayment> findByPosSessionIdOrderByCreatedAtDesc(Long posSessionId);

    List<PosCreditPayment> findByBusinessDateOrderByCreatedAtDesc(LocalDate businessDate);
}
