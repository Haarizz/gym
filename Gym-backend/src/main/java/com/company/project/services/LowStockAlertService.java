package com.company.project.services;

import com.company.project.entities.Product;
import com.company.project.entities.Warehouse;
import com.company.project.repositories.ProductRepository;
import com.company.project.repositories.WarehouseRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.util.List;

/**
 * Products › Settings › Low stock alerts: in-app notifications when a product's
 * stock in a warehouse falls to its reorder level (LOW_STOCK) or runs out
 * (OUT_OF_STOCK). Triggered by ProductStockAlertListener, which Hibernate
 * instantiates itself (no Spring injection in this app's EntityManagerFactory
 * setup — see BranchSecurityListener, which likewise only uses static holders),
 * hence the static bridge set once at startup.
 *
 * Sent after the stock change commits, so a rolled-back sale never alerts.
 * One notification per product/warehouse/status per day (eventKey dedupe), so a
 * busy POS doesn't re-alert on every sale of an already-low item.
 */
@Service
public class LowStockAlertService {

    private static final Logger log = LoggerFactory.getLogger(LowStockAlertService.class);
    private static final List<String> ALERT_ROLES = List.of("ADMIN", "GYMBIOS_ADMIN", "MANAGER");

    private static volatile LowStockAlertService instance;

    private final NotificationService notificationService;
    private final ProductSettingsService productSettingsService;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;

    public LowStockAlertService(NotificationService notificationService,
                                ProductSettingsService productSettingsService,
                                ProductRepository productRepository,
                                WarehouseRepository warehouseRepository) {
        this.notificationService = notificationService;
        this.productSettingsService = productSettingsService;
        this.productRepository = productRepository;
        this.warehouseRepository = warehouseRepository;
    }

    @PostConstruct
    void register() {
        instance = this;
    }

    /** Same thresholds as ProductStockDTO.computeStockStatus. */
    public static String statusOf(Integer currentStock, Integer reorderLevel) {
        int stock = currentStock != null ? currentStock : 0;
        int reorder = reorderLevel != null ? reorderLevel : 0;
        if (stock <= 0) return "OUT_OF_STOCK";
        if (stock <= reorder) return "LOW_STOCK";
        return "IN_STOCK";
    }

    public static int severity(String status) {
        return "OUT_OF_STOCK".equals(status) ? 2 : "LOW_STOCK".equals(status) ? 1 : 0;
    }

    public static void stockWorsened(Long productId, Long warehouseId, Integer currentStock,
                                     Integer reorderLevel, String status) {
        LowStockAlertService svc = instance;
        if (svc == null) return; // e.g. the throwaway tenant-bootstrap persistence unit
        Runnable send = () -> svc.send(productId, warehouseId, currentStock, reorderLevel, status);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
        } else {
            send.run();
        }
    }

    private void send(Long productId, Long warehouseId, Integer currentStock, Integer reorderLevel, String status) {
        try {
            if (!productSettingsService.isEnabled(ProductSettingsService.LOW_STOCK_ALERTS)) return;

            String productName = productRepository.findById(productId).map(Product::getName).orElse("A product");
            String warehouseName = warehouseRepository.findById(warehouseId).map(Warehouse::getName).orElse("its warehouse");
            boolean out = "OUT_OF_STOCK".equals(status);
            String title = out ? productName + " is out of stock" : productName + " is running low";
            String message = out
                    ? productName + " has run out in " + warehouseName + ". Reorder to keep selling it."
                    : productName + " is down to " + currentStock + " in " + warehouseName
                            + " (reorder level " + (reorderLevel != null ? reorderLevel : 0) + ").";

            notificationService.notifyRoles(
                    ALERT_ROLES, title, message,
                    "WARNING", out ? "HIGH" : "MEDIUM", "PRODUCTS",
                    productId, "/products",
                    "STOCK_" + status + "_" + productId + "_" + warehouseId + "_" + LocalDate.now());
        } catch (Exception e) {
            // An alert must never break the sale/adjustment that triggered it.
            log.warn("Low stock alert failed for product {} in warehouse {}", productId, warehouseId, e);
        }
    }
}
