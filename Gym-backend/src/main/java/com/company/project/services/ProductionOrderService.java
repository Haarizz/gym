package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.ProductionOrderPageResponseDTO;
import com.company.project.dto.ProductionOrderRequestDTO;
import com.company.project.dto.ProductionOrderResponseDTO;
import com.company.project.entities.ProductionOrder;
import com.company.project.entities.ProductStock;
import com.company.project.entities.Recipe;
import com.company.project.entities.RecipeIngredient;
import com.company.project.repositories.ProductionOrderRepository;
import com.company.project.repositories.ProductStockRepository;
import com.company.project.repositories.RecipeIngredientRepository;
import com.company.project.repositories.RecipeRepository;
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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductionOrderService {

    private final ProductionOrderRepository productionOrderRepository;
    private final RecipeRepository recipeRepository;
    private final RecipeIngredientRepository recipeIngredientRepository;
    private final ProductStockRepository productStockRepository;
    private final WarehouseRepository warehouseRepository;

    public ProductionOrderService(ProductionOrderRepository productionOrderRepository,
                                  RecipeRepository recipeRepository,
                                  RecipeIngredientRepository recipeIngredientRepository,
                                  ProductStockRepository productStockRepository,
                                  WarehouseRepository warehouseRepository) {
        this.productionOrderRepository = productionOrderRepository;
        this.recipeRepository = recipeRepository;
        this.recipeIngredientRepository = recipeIngredientRepository;
        this.productStockRepository = productStockRepository;
        this.warehouseRepository = warehouseRepository;
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public ProductionOrderResponseDTO createOrder(ProductionOrderRequestDTO req) {
        Recipe recipe = recipeRepository.findById(req.getRecipeId())
                .orElseThrow(() -> new RuntimeException("Recipe not found with id: " + req.getRecipeId()));

        ProductionOrder order = new ProductionOrder();
        order.setRecipeId(recipe.getId());
        order.setRecipeName(recipe.getName());
        order.setOutputProductId(recipe.getOutputProductId());
        order.setOutputProductName(recipe.getOutputProductName());
        order.setOutputUnit(req.getOutputUnit() != null ? req.getOutputUnit() : recipe.getOutputUnit());
        order.setQuantityToProduce(req.getQuantityToProduce());
        order.setScheduledDate(req.getScheduledDate());
        order.setWarehouseId(req.getWarehouseId());
        order.setNotes(req.getNotes());
        order.setStatus("DRAFT");
        order.setTotalIngredientCost(BigDecimal.ZERO);

        // Save to get id
        order = productionOrderRepository.save(order);

        // Generate order number
        order.setOrderNumber("PRD-" + String.format("%08d", order.getId()));

        // Compute totalIngredientCost
        List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipeId(recipe.getId());
        BigDecimal scaleFactor = computeScaleFactor(req.getQuantityToProduce(), recipe.getOutputQuantity());
        BigDecimal totalCost = ingredients.stream()
                .map(ing -> {
                    BigDecimal q = ing.getQuantity() != null ? ing.getQuantity() : BigDecimal.ZERO;
                    BigDecimal u = ing.getUnitCost() != null ? ing.getUnitCost() : BigDecimal.ZERO;
                    return q.multiply(u).multiply(scaleFactor);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        order.setTotalIngredientCost(totalCost);

        order = productionOrderRepository.save(order);
        return ProductionOrderResponseDTO.fromEntity(order, ingredients, scaleFactor);
    }

    public ProductionOrderResponseDTO startProduction(Long id) {
        ProductionOrder order = productionOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Production order not found with id: " + id));

        if (!"DRAFT".equals(order.getStatus())) {
            throw new RuntimeException("Only DRAFT orders can be started. Current status: " + order.getStatus());
        }

        order.setStatus("IN_PROGRESS");
        order = productionOrderRepository.save(order);

        List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipeId(order.getRecipeId());
        BigDecimal scaleFactor = computeScaleFactorFromOrder(order);
        return ProductionOrderResponseDTO.fromEntity(order, ingredients, scaleFactor);
    }

    public ProductionOrderResponseDTO completeProduction(Long id) {
        ProductionOrder order = productionOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Production order not found with id: " + id));

        if (!"IN_PROGRESS".equals(order.getStatus())) {
            throw new RuntimeException("Only IN_PROGRESS orders can be completed. Current status: " + order.getStatus());
        }

        order.setStatus("COMPLETED");
        order.setCompletedDate(LocalDate.now());

        List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipeId(order.getRecipeId());
        BigDecimal scaleFactor = computeScaleFactorFromOrder(order);

        // Deduct stock for each scaled ingredient
        for (RecipeIngredient ing : ingredients) {
            if (ing.getProductId() != null) {
                BigDecimal scaledQty = (ing.getQuantity() != null ? ing.getQuantity() : BigDecimal.ZERO)
                        .multiply(scaleFactor)
                        .setScale(2, RoundingMode.HALF_UP);
                deductStock(ing.getProductId(), scaledQty.intValue());
            }
        }

        // Add output product stock if applicable
        if (order.getOutputProductId() != null && order.getQuantityToProduce() != null) {
            addStock(order.getOutputProductId(), order.getWarehouseId(),
                    order.getQuantityToProduce().intValue());
        }

        order = productionOrderRepository.save(order);
        return ProductionOrderResponseDTO.fromEntity(order, ingredients, scaleFactor);
    }

    public ProductionOrderResponseDTO cancelOrder(Long id) {
        ProductionOrder order = productionOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Production order not found with id: " + id));

        if (!"DRAFT".equals(order.getStatus()) && !"IN_PROGRESS".equals(order.getStatus())) {
            throw new RuntimeException("Only DRAFT or IN_PROGRESS orders can be cancelled. Current status: " + order.getStatus());
        }

        order.setStatus("CANCELLED");
        order = productionOrderRepository.save(order);

        List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipeId(order.getRecipeId());
        BigDecimal scaleFactor = computeScaleFactorFromOrder(order);
        return ProductionOrderResponseDTO.fromEntity(order, ingredients, scaleFactor);
    }

    public void deleteOrder(Long id) {
        ProductionOrder order = productionOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Production order not found with id: " + id));

        if (!"DRAFT".equals(order.getStatus())) {
            throw new RuntimeException("Only DRAFT orders can be deleted. Current status: " + order.getStatus());
        }

        productionOrderRepository.delete(order);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ProductionOrderResponseDTO getById(Long id) {
        ProductionOrder order = productionOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Production order not found with id: " + id));
        List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipeId(order.getRecipeId());
        BigDecimal scaleFactor = computeScaleFactorFromOrder(order);
        return ProductionOrderResponseDTO.fromEntity(order, ingredients, scaleFactor);
    }

    @Transactional(readOnly = true)
    public ProductionOrderPageResponseDTO getOrders(int page, int size, String status, String search) {
        Specification<ProductionOrder> spec = buildSpec(status, search);
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ProductionOrder> orderPage = productionOrderRepository.findAll(spec, pageable);

        List<ProductionOrderResponseDTO> dtos = orderPage.getContent().stream()
                .map(order -> {
                    List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipeId(order.getRecipeId());
                    BigDecimal scaleFactor = computeScaleFactorFromOrder(order);
                    return ProductionOrderResponseDTO.fromEntity(order, ingredients, scaleFactor);
                })
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(page, size, orderPage.getTotalElements(), orderPage.getTotalPages());
        return new ProductionOrderPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();

        long totalRecipes = recipeRepository.count();
        long activeRecipes = recipeRepository.findByStatus("ACTIVE").size();
        long totalOrders = productionOrderRepository.count();
        long inProgressOrders = productionOrderRepository.findByStatus("IN_PROGRESS").size();
        long completedOrders = productionOrderRepository.findByStatus("COMPLETED").size();
        long draftOrders = productionOrderRepository.findByStatus("DRAFT").size();

        stats.put("totalRecipes", totalRecipes);
        stats.put("activeRecipes", activeRecipes);
        stats.put("totalOrders", totalOrders);
        stats.put("inProgressOrders", inProgressOrders);
        stats.put("completedOrders", completedOrders);
        stats.put("draftOrders", draftOrders);

        return stats;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private BigDecimal computeScaleFactor(BigDecimal quantityToProduce, BigDecimal outputQuantity) {
        if (quantityToProduce == null) return BigDecimal.ONE;
        if (outputQuantity == null || outputQuantity.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ONE;
        return quantityToProduce.divide(outputQuantity, 6, RoundingMode.HALF_UP);
    }

    private BigDecimal computeScaleFactorFromOrder(ProductionOrder order) {
        if (order.getRecipeId() == null) return BigDecimal.ONE;
        Optional<Recipe> recipeOpt = recipeRepository.findById(order.getRecipeId());
        if (recipeOpt.isEmpty()) return BigDecimal.ONE;
        Recipe recipe = recipeOpt.get();
        return computeScaleFactor(order.getQuantityToProduce(), recipe.getOutputQuantity());
    }

    private void deductStock(Long productId, int quantity) {
        if (productId == null || quantity <= 0) return;
        List<ProductStock> stocks = productStockRepository.findByProductId(productId);
        if (stocks.isEmpty()) return;
        ProductStock stock = stocks.stream()
                .max(java.util.Comparator.comparingInt(s -> s.getCurrentStock() == null ? 0 : s.getCurrentStock()))
                .orElse(stocks.get(0));
        int current = stock.getCurrentStock() == null ? 0 : stock.getCurrentStock();
        stock.setCurrentStock(Math.max(0, current - quantity));
        productStockRepository.save(stock);
    }

    private void addStock(Long productId, Long warehouseId, int quantity) {
        if (productId == null || quantity <= 0) return;
        if (warehouseId != null) {
            Optional<ProductStock> stockOpt = productStockRepository.findByProductIdAndWarehouseId(productId, warehouseId);
            if (stockOpt.isPresent()) {
                ProductStock s = stockOpt.get();
                s.setCurrentStock((s.getCurrentStock() == null ? 0 : s.getCurrentStock()) + quantity);
                productStockRepository.save(s);
            } else {
                ProductStock ns = new ProductStock();
                ns.setProductId(productId);
                ns.setWarehouseId(warehouseId);
                ns.setCurrentStock(quantity);
                ns.setOpeningStock(0);
                ns.setReorderLevel(0);
                productStockRepository.save(ns);
            }
        } else {
            List<ProductStock> stocks = productStockRepository.findByProductId(productId);
            if (!stocks.isEmpty()) {
                ProductStock s = stocks.get(0);
                s.setCurrentStock((s.getCurrentStock() == null ? 0 : s.getCurrentStock()) + quantity);
                productStockRepository.save(s);
            }
        }
    }

    private Specification<ProductionOrder> buildSpec(String status, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("orderNumber")), like),
                        cb.like(cb.lower(root.get("recipeName")), like)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
