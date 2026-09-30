package com.company.project.repositories;

import com.company.project.entities.ProductBrand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductBrandRepository extends JpaRepository<ProductBrand, Long> {

    List<ProductBrand> findAllByOrderByNameAsc();

    // Explicit (branch_id, name) lookup for duplicate checks, independent of the
    // ambient branchFilter state. branchId may be null ("All Branches" mode).
    List<ProductBrand> findByBranchIdAndNameIgnoreCase(Long branchId, String name);
}
