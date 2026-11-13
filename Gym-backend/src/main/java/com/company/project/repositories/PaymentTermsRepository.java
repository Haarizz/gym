package com.company.project.repositories;

import com.company.project.entities.PaymentTerms;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentTermsRepository extends JpaRepository<PaymentTerms, Long> {

    List<PaymentTerms> findByBranchIdOrderBySortOrderAscIdAsc(Long branchId);
}
