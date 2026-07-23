package com.company.project.services;

import com.company.project.entities.PosFavoriteProduct;
import com.company.project.repositories.PosFavoriteProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class PosFavoriteService {

    private final PosFavoriteProductRepository favoriteRepository;

    public PosFavoriteService(PosFavoriteProductRepository favoriteRepository) {
        this.favoriteRepository = favoriteRepository;
    }

    @Transactional(readOnly = true)
    public List<Long> getFavoriteProductIds() {
        return favoriteRepository.findAll().stream()
                .map(PosFavoriteProduct::getProductId)
                .collect(Collectors.toList());
    }

    /** Flips the given product's favorite state and returns the updated full list of favorite IDs. */
    public List<Long> toggleFavorite(Long productId) {
        if (favoriteRepository.existsByProductId(productId)) {
            favoriteRepository.deleteByProductId(productId);
        } else {
            PosFavoriteProduct fav = new PosFavoriteProduct();
            fav.setProductId(productId);
            favoriteRepository.save(fav);
        }
        return getFavoriteProductIds();
    }
}
