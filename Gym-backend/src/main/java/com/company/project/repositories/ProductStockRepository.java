package com.company.project.repositories;

import com.company.project.entities.ProductStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductStockRepository extends JpaRepository<ProductStock, Long> {

    List<ProductStock> findByProductId(Long productId);

    Optional<ProductStock> findByProductIdAndWarehouseId(Long productId, Long warehouseId);

    List<ProductStock> findByWarehouseId(Long warehouseId);

    void deleteByProductId(Long productId);
}
