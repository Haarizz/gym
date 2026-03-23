package com.company.project.repositories;

import com.company.project.entities.ProductUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductUnitRepository extends JpaRepository<ProductUnit, Long> {
    List<ProductUnit> findByProductId(Long productId);

    @Modifying
    @Query("DELETE FROM ProductUnit u WHERE u.productId = :productId")
    void deleteByProductId(@Param("productId") Long productId);
}
