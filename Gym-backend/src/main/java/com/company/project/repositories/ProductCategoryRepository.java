package com.company.project.repositories;

import com.company.project.entities.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Long>, JpaSpecificationExecutor<ProductCategory> {

    Optional<ProductCategory> findByName(String name);

    // Explicit branch-scoped lookup, independent of whether Hibernate's
    // "branchFilter" session filter happens to be enabled — used by seeding code
    // that must check existence against the real (branch_id, name) unique
    // constraint rather than whatever the ambient filter state is. branchId is
    // nullable, matching rows created in "All Branches" (admin/global) mode.
    Optional<ProductCategory> findByBranchIdAndName(Long branchId, String name);

    List<ProductCategory> findAllByOrderByNameAsc();
}
