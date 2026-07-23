package com.company.project.dto;

import java.util.List;

public class ReceiveItemsRequestDTO {

    private List<ReceivedItem> items;

    public ReceiveItemsRequestDTO() {}

    public static class ReceivedItem {
        private Long purchaseOrderItemId;
        private int quantityReceived;
        private Long warehouseId;

        public ReceivedItem() {}

        public Long getPurchaseOrderItemId() { return purchaseOrderItemId; }
        public void setPurchaseOrderItemId(Long purchaseOrderItemId) { this.purchaseOrderItemId = purchaseOrderItemId; }

        public int getQuantityReceived() { return quantityReceived; }
        public void setQuantityReceived(int quantityReceived) { this.quantityReceived = quantityReceived; }

        public Long getWarehouseId() { return warehouseId; }
        public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }
    }

    public List<ReceivedItem> getItems() { return items; }
    public void setItems(List<ReceivedItem> items) { this.items = items; }
}
