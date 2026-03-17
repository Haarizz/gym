package com.company.project.services;

import com.company.project.dto.ProductRequestDTO;
import com.company.project.dto.ProductResponseDTO;
import com.company.project.dto.ProductStatsDTO;
import com.company.project.dto.ProductsPageResponseDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.StockAdjustmentRequestDTO;
import com.company.project.entities.Product;
import com.company.project.entities.ProductCategory;
import com.company.project.entities.ProductStock;
import com.company.project.entities.StockAdjustment;
import com.company.project.entities.Warehouse;
import com.company.project.repositories.ProductCategoryRepository;
import com.company.project.repositories.ProductRepository;
import com.company.project.repositories.ProductStockRepository;
import com.company.project.repositories.StockAdjustmentRepository;
import com.company.project.repositories.WarehouseRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ProductStockRepository stockRepository;
    private final StockAdjustmentRepository adjustmentRepository;
    private final WarehouseRepository warehouseRepository;

    public ProductService(ProductRepository productRepository,
                          ProductCategoryRepository categoryRepository,
                          ProductStockRepository stockRepository,
                          StockAdjustmentRepository adjustmentRepository,
                          WarehouseRepository warehouseRepository) {
        this.productRepository  = productRepository;
        this.categoryRepository = categoryRepository;
        this.stockRepository    = stockRepository;
        this.adjustmentRepository = adjustmentRepository;
        this.warehouseRepository  = warehouseRepository;
    }

    // ── Create ──────────────────────────────────────────────────────────────

    public ProductResponseDTO createProduct(ProductRequestDTO req) {
        Product product = new Product();
        mapRequestToProduct(req, product);
        product = productRepository.save(product);

        // Auto-generate SKU based on category type
        String sku = generateSku(product.getId(), product.getCategoryId());
        product.setSku(sku);
        product = productRepository.save(product);

        // Create opening stock entry
        if (req.getWarehouseId() != null) {
            ProductStock stock = new ProductStock();
            stock.setProductId(product.getId());
            stock.setWarehouseId(req.getWarehouseId());
            int opening = req.getOpeningStock() != null ? req.getOpeningStock() : 0;
            stock.setOpeningStock(opening);
            stock.setCurrentStock(opening);
            stock.setReorderLevel(req.getReorderLevel() != null ? req.getReorderLevel() : 0);
            stockRepository.save(stock);
        }

        return buildResponseDTO(product);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ProductResponseDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        return buildResponseDTO(product);
    }

    @Transactional(readOnly = true)
    public ProductsPageResponseDTO getProducts(String search, Long categoryId, String status,
                                               int page, int size) {
        Specification<Product> spec = buildSpec(search, categoryId, status);
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Product> productPage = productRepository.findAll(spec, pageable);

        // Preload all warehouses once
        List<Warehouse> warehouses = warehouseRepository.findAll();

        List<ProductResponseDTO> dtos = productPage.getContent().stream()
                .map(p -> buildResponseDTOWithWarehouses(p, warehouses))
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(
                page, size,
                productPage.getTotalElements(),
                productPage.getTotalPages()
        );

        return new ProductsPageResponseDTO(dtos, pagination);
    }

    // ── Update ──────────────────────────────────────────────────────────────

    public ProductResponseDTO updateProduct(Long id, ProductRequestDTO req) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        mapRequestToProduct(req, product);

        // If category changed, regenerate SKU
        if (req.getCategoryId() != null && !req.getCategoryId().equals(product.getCategoryId())) {
            product.setCategoryId(req.getCategoryId());
            product.setSku(generateSku(product.getId(), req.getCategoryId()));
        }

        return buildResponseDTO(productRepository.save(product));
    }

    // ── Delete ──────────────────────────────────────────────────────────────

    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        stockRepository.deleteByProductId(id);
        productRepository.delete(product);
    }

    // ── Stock Adjustment ────────────────────────────────────────────────────

    public ProductResponseDTO adjustStock(Long id, StockAdjustmentRequestDTO req) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        ProductStock stock = stockRepository.findByProductIdAndWarehouseId(id, req.getWarehouseId())
                .orElseGet(() -> {
                    ProductStock s = new ProductStock();
                    s.setProductId(id);
                    s.setWarehouseId(req.getWarehouseId());
                    s.setCurrentStock(0);
                    s.setOpeningStock(0);
                    s.setReorderLevel(0);
                    return s;
                });

        int previousStock = stock.getCurrentStock() != null ? stock.getCurrentStock() : 0;
        int newStock;
        int qty = req.getQuantity() != null ? req.getQuantity() : 0;

        switch (req.getAdjustmentType()) {
            case "ADD":
                newStock = previousStock + qty;
                break;
            case "SUBTRACT":
                newStock = Math.max(0, previousStock - qty);
                break;
            case "SET":
                newStock = qty;
                break;
            default:
                throw new RuntimeException("Invalid adjustment type: " + req.getAdjustmentType());
        }

        stock.setCurrentStock(newStock);
        stockRepository.save(stock);

        // Create audit record
        StockAdjustment adjustment = new StockAdjustment();
        adjustment.setProductId(id);
        adjustment.setWarehouseId(req.getWarehouseId());
        adjustment.setAdjustmentType(req.getAdjustmentType());
        adjustment.setQuantity(qty);
        adjustment.setPreviousStock(previousStock);
        adjustment.setNewStock(newStock);
        adjustment.setReason(req.getReason());
        adjustmentRepository.save(adjustment);

        return buildResponseDTO(product);
    }

    // ── Stats ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ProductStatsDTO getStats() {
        long totalProducts = productRepository.count();
        long activeProducts = productRepository.findAll().stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsActive()))
                .count();
        long categoriesCount = categoryRepository.count();

        List<Product> allProducts = productRepository.findAll();
        List<Warehouse> warehouses = warehouseRepository.findAll();

        long lowStockItems = 0;
        long outOfStockItems = 0;
        BigDecimal totalInventoryValue = BigDecimal.ZERO;

        for (Product p : allProducts) {
            List<ProductStock> stocks = stockRepository.findByProductId(p.getId());
            int total = stocks.stream()
                    .mapToInt(s -> s.getCurrentStock() != null ? s.getCurrentStock() : 0)
                    .sum();

            if (total <= 0) {
                outOfStockItems++;
            } else {
                int minReorder = stocks.stream()
                        .mapToInt(s -> s.getReorderLevel() != null ? s.getReorderLevel() : 0)
                        .min()
                        .orElse(0);
                if (total <= minReorder) {
                    lowStockItems++;
                }
            }

            BigDecimal costPrice = p.getCostPrice() != null ? p.getCostPrice() : BigDecimal.ZERO;
            totalInventoryValue = totalInventoryValue.add(costPrice.multiply(new BigDecimal(total)));
        }

        return new ProductStatsDTO(totalProducts, activeProducts, lowStockItems,
                outOfStockItems, totalInventoryValue, categoriesCount);
    }

    // ── Low Stock ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ProductResponseDTO> getLowStockProducts() {
        List<Warehouse> warehouses = warehouseRepository.findAll();
        return productRepository.findAll().stream()
                .filter(p -> isLowStock(p))
                .map(p -> buildResponseDTOWithWarehouses(p, warehouses))
                .collect(Collectors.toList());
    }

    // ── Duplicate ───────────────────────────────────────────────────────────

    public ProductResponseDTO duplicateProduct(Long id) {
        Product original = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        Product copy = new Product();
        copy.setName(original.getName() + " (Copy)");
        copy.setCategoryId(original.getCategoryId());
        copy.setBrand(original.getBrand());
        copy.setDescription(original.getDescription());
        copy.setIsActive(original.getIsActive());
        copy.setHasVariants(original.getHasVariants());
        copy.setHasRecipe(original.getHasRecipe());
        copy.setIsManufactured(original.getIsManufactured());
        copy.setImageUrls(original.getImageUrls());
        copy.setBarcode(original.getBarcode());
        copy.setBarcodeTemplate(original.getBarcodeTemplate());
        copy.setDefaultUnit(original.getDefaultUnit());
        copy.setSellingPrice(original.getSellingPrice());
        copy.setCostPrice(original.getCostPrice());
        copy.setTaxRate(original.getTaxRate());
        copy.setSupplier(original.getSupplier());
        copy = productRepository.save(copy);

        // Generate new SKU for copy
        copy.setSku(generateSku(copy.getId(), copy.getCategoryId()));
        copy = productRepository.save(copy);

        return buildResponseDTO(copy);
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private void mapRequestToProduct(ProductRequestDTO req, Product product) {
        if (req.getName() != null) product.setName(req.getName());
        if (req.getCategoryId() != null) product.setCategoryId(req.getCategoryId());
        if (req.getBrand() != null) product.setBrand(req.getBrand());
        if (req.getDescription() != null) product.setDescription(req.getDescription());
        if (req.getIsActive() != null) product.setIsActive(req.getIsActive());
        if (req.getHasVariants() != null) product.setHasVariants(req.getHasVariants());
        if (req.getHasRecipe() != null) product.setHasRecipe(req.getHasRecipe());
        if (req.getIsManufactured() != null) product.setIsManufactured(req.getIsManufactured());
        if (req.getImageUrls() != null) product.setImageUrls(req.getImageUrls());
        if (req.getBarcode() != null) product.setBarcode(req.getBarcode());
        if (req.getBarcodeTemplate() != null) product.setBarcodeTemplate(req.getBarcodeTemplate());
        if (req.getDefaultUnit() != null) product.setDefaultUnit(req.getDefaultUnit());
        if (req.getSellingPrice() != null) product.setSellingPrice(req.getSellingPrice());
        if (req.getCostPrice() != null) product.setCostPrice(req.getCostPrice());
        if (req.getTaxRate() != null) product.setTaxRate(req.getTaxRate());
        if (req.getSupplier() != null) product.setSupplier(req.getSupplier());
    }

    private String generateSku(Long productId, Long categoryId) {
        String prefix = "PRD";
        if (categoryId != null) {
            ProductCategory cat = categoryRepository.findById(categoryId).orElse(null);
            if (cat != null && cat.getCategoryType() != null) {
                switch (cat.getCategoryType()) {
                    case "SUPPLEMENTS":    prefix = "SUP"; break;
                    case "EQUIPMENT":      prefix = "EQP"; break;
                    case "MERCHANDISE":    prefix = "MER"; break;
                    case "CAFE":           prefix = "CAF"; break;
                    case "APPAREL":        prefix = "APL"; break;
                    case "ACCESSORIES":    prefix = "ACC"; break;
                    case "FOOD_BEVERAGES": prefix = "FNB"; break;
                    case "SERVICES":       prefix = "SVC"; break;
                    default:               prefix = "PRD"; break;
                }
            }
        }
        return prefix + "-" + String.format("%04d", productId);
    }

    private ProductResponseDTO buildResponseDTO(Product product) {
        List<Warehouse> warehouses = warehouseRepository.findAll();
        return buildResponseDTOWithWarehouses(product, warehouses);
    }

    private ProductResponseDTO buildResponseDTOWithWarehouses(Product product, List<Warehouse> warehouses) {
        ProductCategory cat = null;
        if (product.getCategoryId() != null) {
            cat = categoryRepository.findById(product.getCategoryId()).orElse(null);
        }
        List<ProductStock> stocks = stockRepository.findByProductId(product.getId());
        return ProductResponseDTO.fromEntity(product, cat, stocks, warehouses);
    }

    private boolean isLowStock(Product product) {
        List<ProductStock> stocks = stockRepository.findByProductId(product.getId());
        for (ProductStock s : stocks) {
            int current = s.getCurrentStock() != null ? s.getCurrentStock() : 0;
            int reorder = s.getReorderLevel() != null ? s.getReorderLevel() : 0;
            if (current <= reorder) return true;
        }
        return false;
    }

    private Specification<Product> buildSpec(String search, Long categoryId, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")),  pattern),
                        cb.like(cb.lower(root.get("sku")),   pattern),
                        cb.like(cb.lower(root.get("brand")), pattern)
                ));
            }

            if (categoryId != null) {
                predicates.add(cb.equal(root.get("categoryId"), categoryId));
            }

            if (status != null && !status.isBlank()) {
                if ("active".equalsIgnoreCase(status)) {
                    predicates.add(cb.isTrue(root.get("isActive")));
                } else if ("inactive".equalsIgnoreCase(status)) {
                    predicates.add(cb.isFalse(root.get("isActive")));
                }
                // out-of-stock filtering is done post-query via stock data
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
