package com.company.project.repositories;

import com.company.project.entities.PosFavoriteProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PosFavoriteProductRepository extends JpaRepository<PosFavoriteProduct, Long> {

    Optional<PosFavoriteProduct> findByProductId(Long productId);

    boolean existsByProductId(Long productId);

    void deleteByProductId(Long productId);
}
