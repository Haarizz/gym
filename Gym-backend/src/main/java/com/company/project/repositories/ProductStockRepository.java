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

    /**
     * Same row, locked (SELECT ... FOR UPDATE) — for check-then-deduct flows, so two sales
     * of the last units in a warehouse can't both pass the availability check.
     */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query(
            "SELECT s FROM ProductStock s WHERE s.productId = :productId AND s.warehouseId = :warehouseId")
    Optional<ProductStock> findForUpdate(@org.springframework.data.repository.query.Param("productId") Long productId,
                                         @org.springframework.data.repository.query.Param("warehouseId") Long warehouseId);

    List<ProductStock> findByWarehouseId(Long warehouseId);

    void deleteByProductId(Long productId);
}
