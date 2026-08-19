package com.company.project.services;

import com.company.project.dto.ProductCategoryDTO;
import com.company.project.entities.ProductCategory;
import com.company.project.repositories.ProductCategoryRepository;
import com.company.project.repositories.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductCategoryService {

    private final ProductCategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final BranchService branchService;

    public ProductCategoryService(ProductCategoryRepository categoryRepository,
                                  ProductRepository productRepository,
                                  BranchService branchService) {
        this.categoryRepository = categoryRepository;
        this.productRepository  = productRepository;
        this.branchService      = branchService;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ProductCategoryDTO> getAllCategories() {
        Long activeBranchId = com.company.project.security.BranchContextHolder.getActiveBranchId();
        return categoryRepository.findAllByOrderByNameAsc().stream()
                .filter(c -> activeBranchId == null || c.getBranchId() == null || activeBranchId.equals(c.getBranchId()))
                .map(c -> {
                    int count = productRepository.findByCategoryId(c.getId()).size();
                    return ProductCategoryDTO.fromEntity(c, count);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductCategoryDTO getById(Long id) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ProductCategory not found with id: " + id));
        int count = productRepository.findByCategoryId(id).size();
        return ProductCategoryDTO.fromEntity(category, count);
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public ProductCategoryDTO create(ProductCategoryDTO dto) {
        ProductCategory category = new ProductCategory();
        
        Long branchId = com.company.project.security.BranchContextHolder.getActiveBranchId();
        // Allow creating global categories if branchId is null (Admin mode)
        category.setBranchId(branchId);

        category.setName(dto.getName());
        category.setCategoryType(dto.getCategoryType());
        category.setColor(dto.getColor());
        category.setIconName(dto.getIconName());
        return ProductCategoryDTO.fromEntity(categoryRepository.save(category), 0);
    }

    public ProductCategoryDTO update(Long id, ProductCategoryDTO dto) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ProductCategory not found with id: " + id));
        if (dto.getName() != null) category.setName(dto.getName());
        if (dto.getCategoryType() != null) category.setCategoryType(dto.getCategoryType());
        if (dto.getColor() != null) category.setColor(dto.getColor());
        if (dto.getIconName() != null) category.setIconName(dto.getIconName());
        int count = productRepository.findByCategoryId(id).size();
        return ProductCategoryDTO.fromEntity(categoryRepository.save(category), count);
    }

    public void delete(Long id) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ProductCategory not found with id: " + id));
        categoryRepository.delete(category);
    }

    // ── Init ────────────────────────────────────────────────────────────────

    public void initDefaultCategories() {
        if (categoryRepository.count() > 0) return;

        Object[][] defaults = {
            {"Supplements",      "SUPPLEMENTS", "bg-blue-500",   "Pill"},
            {"Equipment",        "EQUIPMENT",   "bg-gray-500",   "Dumbbell"},
            {"Merchandise",      "MERCHANDISE", "bg-purple-500", "ShoppingBag"},
            {"Cafe",             "CAFE",        "bg-yellow-500", "Coffee"},
            {"Apparel",          "APPAREL",     "bg-pink-500",   "Shirt"},
            {"Accessories",      "ACCESSORIES", "bg-green-500",  "Tag"}
        };

        for (Object[] row : defaults) {
            if (categoryRepository.findByName((String) row[0]).isEmpty()) {
                ProductCategory c = new ProductCategory();
                c.setName((String) row[0]);
                c.setCategoryType((String) row[1]);
                c.setColor((String) row[2]);
                c.setIconName((String) row[3]);
                categoryRepository.save(c);
            }
        }
    }
}
