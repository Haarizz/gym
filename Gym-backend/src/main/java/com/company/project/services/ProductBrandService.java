package com.company.project.services;

import com.company.project.dto.ProductBrandDTO;
import com.company.project.entities.Product;
import com.company.project.entities.ProductBrand;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.ProductBrandRepository;
import com.company.project.repositories.ProductRepository;
import com.company.project.security.BranchContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductBrandService {

    private final ProductBrandRepository brandRepository;
    private final ProductRepository productRepository;

    public ProductBrandService(ProductBrandRepository brandRepository, ProductRepository productRepository) {
        this.brandRepository = brandRepository;
        this.productRepository = productRepository;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ProductBrandDTO> getAllBrands() {
        Long activeBranchId = BranchContextHolder.getActiveBranchId();
        Map<String, Integer> counts = productCountsByBrand();
        return brandRepository.findAllByOrderByNameAsc().stream()
                .filter(b -> activeBranchId == null || b.getBranchId() == null || activeBranchId.equals(b.getBranchId()))
                .map(b -> ProductBrandDTO.fromEntity(b, counts.getOrDefault(key(b.getName()), 0)))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductBrandDTO getById(Long id) {
        ProductBrand brand = find(id);
        return ProductBrandDTO.fromEntity(brand, productCountsByBrand().getOrDefault(key(brand.getName()), 0));
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public ProductBrandDTO create(ProductBrandDTO dto) {
        String name = requireName(dto.getName());
        Long branchId = BranchContextHolder.getActiveBranchId();
        ensureUnique(branchId, name, null);

        ProductBrand brand = new ProductBrand();
        brand.setBranchId(branchId);
        brand.setName(name);
        brand.setDescription(trimToNull(dto.getDescription()));
        brand.setWebsite(trimToNull(dto.getWebsite()));
        brand.setColor(trimToNull(dto.getColor()));
        brand.setIsActive(dto.getIsActive() == null || dto.getIsActive());
        brand = brandRepository.save(brand);
        return ProductBrandDTO.fromEntity(brand, productCountsByBrand().getOrDefault(key(name), 0));
    }

    public ProductBrandDTO update(Long id, ProductBrandDTO dto) {
        ProductBrand brand = find(id);
        String oldName = brand.getName();

        if (dto.getName() != null) {
            String name = requireName(dto.getName());
            ensureUnique(brand.getBranchId(), name, brand.getId());
            brand.setName(name);
            // Products reference brands by name, so carry a rename through to them.
            if (!name.equals(oldName)) {
                List<Product> products = productRepository.findByBrandIgnoreCase(oldName);
                products.forEach(p -> p.setBrand(name));
                productRepository.saveAll(products);
            }
        }
        if (dto.getDescription() != null) brand.setDescription(trimToNull(dto.getDescription()));
        if (dto.getWebsite() != null) brand.setWebsite(trimToNull(dto.getWebsite()));
        if (dto.getColor() != null) brand.setColor(trimToNull(dto.getColor()));
        if (dto.getIsActive() != null) brand.setIsActive(dto.getIsActive());

        brand = brandRepository.save(brand);
        return ProductBrandDTO.fromEntity(brand, productCountsByBrand().getOrDefault(key(brand.getName()), 0));
    }

    public void delete(Long id) {
        ProductBrand brand = find(id);
        int inUse = productRepository.findByBrandIgnoreCase(brand.getName()).size();
        if (inUse > 0) {
            throw new BusinessRuleViolationException(
                    "Brand \"" + brand.getName() + "\" is used by " + inUse + " product(s). Reassign them or deactivate the brand instead.");
        }
        brandRepository.delete(brand);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private ProductBrand find(Long id) {
        return brandRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Brand not found with id: " + id));
    }

    private void ensureUnique(Long branchId, String name, Long selfId) {
        boolean clash = brandRepository.findByBranchIdAndNameIgnoreCase(branchId, name).stream()
                .anyMatch(b -> !b.getId().equals(selfId));
        if (clash) throw new BusinessRuleViolationException("A brand named \"" + name + "\" already exists.");
    }

    private Map<String, Integer> productCountsByBrand() {
        Map<String, Integer> counts = new HashMap<>();
        for (Object[] row : productRepository.countProductsByBrand()) {
            if (row[0] != null) counts.put(key((String) row[0]), ((Number) row[1]).intValue());
        }
        return counts;
    }

    private static String key(String name) {
        return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
    }

    private static String requireName(String name) {
        String n = trimToNull(name);
        if (n == null) throw new BusinessRuleViolationException("Brand name is required.");
        return n;
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
