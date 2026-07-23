package com.company.project.repositories;

import com.company.project.entities.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long>, JpaSpecificationExecutor<PurchaseOrder> {

    List<PurchaseOrder> findBySupplierIdOrderByCreatedAtDesc(Long supplierId);

    boolean existsByPoNumber(String poNumber);
}
