package com.company.project.repositories;

import com.company.project.entities.StockAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, Long> {

    List<StockAdjustment> findByProductIdOrderByCreatedAtDesc(Long productId);

    List<StockAdjustment> findByProductIdAndWarehouseIdOrderByCreatedAtDesc(Long productId, Long warehouseId);
}
