package com.company.project.repositories;

import com.company.project.entities.ProductionOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ProductionOrderRepository extends JpaRepository<ProductionOrder, Long>, JpaSpecificationExecutor<ProductionOrder> {
    List<ProductionOrder> findByStatus(String status);
    List<ProductionOrder> findByRecipeId(Long recipeId);
}
