package com.company.project.repositories;

import com.company.project.entities.SupplierBillItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierBillItemRepository extends JpaRepository<SupplierBillItem, Long> {

    List<SupplierBillItem> findByBillId(Long billId);

    void deleteByBillId(Long billId);
}
