package com.company.project.repositories;

import com.company.project.entities.SupplierBill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierBillRepository extends JpaRepository<SupplierBill, Long>, JpaSpecificationExecutor<SupplierBill> {

    List<SupplierBill> findByStatus(String status);
}
