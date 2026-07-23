package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class SupplierBillRequestDTO {

    private Long supplierId;
    private String invoiceNumber;
    private LocalDate billDate;
    private LocalDate dueDate;
    private String priority;
    private BigDecimal shippingCost;
    private Long warehouseId;
    private String notes;
    private String receivedBy;
    private List<SupplierBillItemDTO> items;

    public SupplierBillRequestDTO() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public LocalDate getBillDate() { return billDate; }
    public void setBillDate(LocalDate billDate) { this.billDate = billDate; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public BigDecimal getShippingCost() { return shippingCost; }
    public void setShippingCost(BigDecimal shippingCost) { this.shippingCost = shippingCost; }

    public Long getWarehouseId() { return warehouseId; }
    public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getReceivedBy() { return receivedBy; }
    public void setReceivedBy(String receivedBy) { this.receivedBy = receivedBy; }

    public List<SupplierBillItemDTO> getItems() { return items; }
    public void setItems(List<SupplierBillItemDTO> items) { this.items = items; }
}
