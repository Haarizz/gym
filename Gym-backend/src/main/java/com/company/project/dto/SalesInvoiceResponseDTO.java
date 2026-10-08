package com.company.project.dto;

import com.company.project.entities.SalesInvoice;
import com.company.project.entities.SalesInvoiceItem;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class SalesInvoiceResponseDTO {

    private Long id;
    private String invoiceNumber;
    private LocalDate invoiceDate;
    private LocalDate dueDate;
    private String paymentTerms;
    private String reference;
    private String salesperson;
    private String customerType;
    private Long memberId;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private String customerAddress;
    private String customerTrn;
    private String status;
    private String paymentStatus;
    private Boolean pricesIncludeTax;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal footerDiscount;
    private BigDecimal taxableAmount;
    private BigDecimal taxAmount;
    private BigDecimal deliveryCharge;
    private BigDecimal roundOff;
    private BigDecimal totalAmount;
    private BigDecimal amountPaid;
    private Boolean stockDeducted;
    private String paymentMethod;
    private List<PaymentSplitDTO> paymentBreakdown;
    private String notes;
    private String internalNotes;
    // Prints use this branch's company details (name, address, TRN, logo) in the header.
    private Long branchId;
    /** MANUAL or POS. */
    private String source;
    private Long posTransactionId;
    private BigDecimal returnedAmount;
    private String createdBy;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;
    private List<SalesInvoiceItemDTO> items;

    public SalesInvoiceResponseDTO() {}

    public static SalesInvoiceResponseDTO fromEntity(SalesInvoice inv, List<SalesInvoiceItem> items) {
        SalesInvoiceResponseDTO dto = new SalesInvoiceResponseDTO();
        dto.setId(inv.getId());
        dto.setInvoiceNumber(inv.getInvoiceNumber());
        dto.setInvoiceDate(inv.getInvoiceDate());
        dto.setDueDate(inv.getDueDate());
        dto.setPaymentTerms(inv.getPaymentTerms());
        dto.setReference(inv.getReference());
        dto.setSalesperson(inv.getSalesperson());
        dto.setCustomerType(inv.getCustomerType());
        dto.setMemberId(inv.getMemberId());
        dto.setCustomerName(inv.getCustomerName());
        dto.setCustomerPhone(inv.getCustomerPhone());
        dto.setCustomerEmail(inv.getCustomerEmail());
        dto.setCustomerAddress(inv.getCustomerAddress());
        dto.setCustomerTrn(inv.getCustomerTrn());
        dto.setStatus(inv.getStatus());
        dto.setPaymentStatus(inv.getPaymentStatus());
        dto.setPricesIncludeTax(inv.getPricesIncludeTax());
        dto.setSubtotal(inv.getSubtotal());
        dto.setDiscountAmount(inv.getDiscountAmount());
        dto.setFooterDiscount(inv.getFooterDiscount());
        dto.setTaxableAmount(inv.getTaxableAmount());
        dto.setTaxAmount(inv.getTaxAmount());
        dto.setDeliveryCharge(inv.getDeliveryCharge());
        dto.setRoundOff(inv.getRoundOff());
        dto.setTotalAmount(inv.getTotalAmount());
        dto.setAmountPaid(inv.getAmountPaid());
        dto.setStockDeducted(inv.getStockDeducted());
        dto.setPaymentMethod(inv.getPaymentMethod());
        dto.setPaymentBreakdown(inv.getPaymentBreakdown());
        dto.setNotes(inv.getNotes());
        dto.setInternalNotes(inv.getInternalNotes());
        dto.setBranchId(inv.getBranchId());
        dto.setSource(inv.getSource());
        dto.setPosTransactionId(inv.getPosTransactionId());
        dto.setReturnedAmount(inv.getReturnedAmount());
        dto.setCreatedBy(inv.getCreatedBy());
        dto.setCreatedAt(inv.getCreatedAt());
        dto.setUpdatedAt(inv.getUpdatedAt());
        dto.setItems(items.stream().map(SalesInvoiceItemDTO::fromEntity).collect(Collectors.toList()));
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate invoiceDate) { this.invoiceDate = invoiceDate; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public String getSalesperson() { return salesperson; }
    public void setSalesperson(String salesperson) { this.salesperson = salesperson; }

    public String getCustomerType() { return customerType; }
    public void setCustomerType(String customerType) { this.customerType = customerType; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public String getCustomerAddress() { return customerAddress; }
    public void setCustomerAddress(String customerAddress) { this.customerAddress = customerAddress; }

    public String getCustomerTrn() { return customerTrn; }
    public void setCustomerTrn(String customerTrn) { this.customerTrn = customerTrn; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public Boolean getPricesIncludeTax() { return pricesIncludeTax; }
    public void setPricesIncludeTax(Boolean pricesIncludeTax) { this.pricesIncludeTax = pricesIncludeTax; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getFooterDiscount() { return footerDiscount; }
    public void setFooterDiscount(BigDecimal footerDiscount) { this.footerDiscount = footerDiscount; }

    public BigDecimal getTaxableAmount() { return taxableAmount; }
    public void setTaxableAmount(BigDecimal taxableAmount) { this.taxableAmount = taxableAmount; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getDeliveryCharge() { return deliveryCharge; }
    public void setDeliveryCharge(BigDecimal deliveryCharge) { this.deliveryCharge = deliveryCharge; }

    public BigDecimal getRoundOff() { return roundOff; }
    public void setRoundOff(BigDecimal roundOff) { this.roundOff = roundOff; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }

    public Boolean getStockDeducted() { return stockDeducted; }
    public void setStockDeducted(Boolean stockDeducted) { this.stockDeducted = stockDeducted; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getInternalNotes() { return internalNotes; }
    public void setInternalNotes(String internalNotes) { this.internalNotes = internalNotes; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public Long getPosTransactionId() { return posTransactionId; }
    public void setPosTransactionId(Long posTransactionId) { this.posTransactionId = posTransactionId; }
    public BigDecimal getReturnedAmount() { return returnedAmount; }
    public void setReturnedAmount(BigDecimal returnedAmount) { this.returnedAmount = returnedAmount; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<SalesInvoiceItemDTO> getItems() { return items; }
    public void setItems(List<SalesInvoiceItemDTO> items) { this.items = items; }
}
