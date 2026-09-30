package com.company.project.repositories;

import com.company.project.entities.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    Optional<Product> findBySku(String sku);

    boolean existsBySku(String sku);

    List<Product> findByCategoryId(Long categoryId);

    List<Product> findByBrandIgnoreCase(String brand);

    // [lower(brand), count] pairs — product counts per brand name in one query.
    @org.springframework.data.jpa.repository.Query(
        "select lower(p.brand), count(p) from Product p where p.brand is not null and p.brand <> '' group by lower(p.brand)")
    List<Object[]> countProductsByBrand();
}
