package com.company.project.repositories;

import com.company.project.entities.PaymentTermsAcceptance;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentTermsAcceptanceRepository extends JpaRepository<PaymentTermsAcceptance, Long> {

    List<PaymentTermsAcceptance> findByBranchIdOrderByCreatedAtDescIdDesc(Long branchId, Pageable page);

    List<PaymentTermsAcceptance> findByMemberDbIdOrderByCreatedAtDescIdDesc(Long memberDbId);

    long countByBranchId(Long branchId);
}
