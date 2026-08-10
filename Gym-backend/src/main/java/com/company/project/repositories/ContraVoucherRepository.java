package com.company.project.repositories;

import com.company.project.entities.ContraVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ContraVoucherRepository
        extends JpaRepository<ContraVoucher, Long>, JpaSpecificationExecutor<ContraVoucher> {
}
