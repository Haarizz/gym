package com.company.project.entities;

import com.company.project.services.LowStockAlertService;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostUpdate;

/**
 * Detects a stock row getting worse (in stock → low → out) at the one place every
 * stock change passes through — POS sales, adjustments, wastage/returns, production,
 * purchase edits all end in ProductStock.setCurrentStock + save, never a bulk UPDATE.
 * Runs inside the request, so tenant/branch context is still set (a scheduled scan
 * would only ever see the primary database — scheduled jobs have no tenant context).
 *
 * Only fires on UPDATE of a row loaded earlier: a brand-new row (e.g. a product
 * created with 0 opening stock) is not a "fell to low stock" event.
 */
public class ProductStockAlertListener {

    @PostLoad
    public void snapshot(ProductStock stock) {
        stock.setStatusAtLoad(LowStockAlertService.statusOf(stock.getCurrentStock(), stock.getReorderLevel()));
    }

    @PostUpdate
    public void checkForLowStock(ProductStock stock) {
        String before = stock.getStatusAtLoad();
        String after = LowStockAlertService.statusOf(stock.getCurrentStock(), stock.getReorderLevel());
        stock.setStatusAtLoad(after); // the same entity can be updated again in this session
        if (before != null && LowStockAlertService.severity(after) > LowStockAlertService.severity(before)) {
            LowStockAlertService.stockWorsened(stock.getProductId(), stock.getWarehouseId(),
                    stock.getCurrentStock(), stock.getReorderLevel(), after);
        }
    }
}
