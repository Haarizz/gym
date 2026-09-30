package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Create / update a draft sales invoice. Totals are always recomputed server-side. */
public class SalesInvoiceRequestDTO {

    private LocalDate invoiceDate;
    private LocalDate dueDate;
    private String paymentTerms;
    private String reference;
    private String salesperson;
    // WALK_IN or MEMBER
    private String customerType;
    private Long memberId;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private String customerAddress;
    private String customerTrn;
    private Boolean pricesIncludeTax;
    /** Bill-level discount as an amount (the editor converts a % into this). */
    private BigDecimal footerDiscount;
    private BigDecimal deliveryCharge;
    private BigDecimal roundOff;
    private String notes;
    private String internalNotes;
    private List<SalesInvoiceItemDTO> items;

    public SalesInvoiceRequestDTO() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

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

    public Boolean getPricesIncludeTax() { return pricesIncludeTax; }
    public void setPricesIncludeTax(Boolean pricesIncludeTax) { this.pricesIncludeTax = pricesIncludeTax; }

    public BigDecimal getFooterDiscount() { return footerDiscount; }
    public void setFooterDiscount(BigDecimal footerDiscount) { this.footerDiscount = footerDiscount; }

    public BigDecimal getDeliveryCharge() { return deliveryCharge; }
    public void setDeliveryCharge(BigDecimal deliveryCharge) { this.deliveryCharge = deliveryCharge; }

    public BigDecimal getRoundOff() { return roundOff; }
    public void setRoundOff(BigDecimal roundOff) { this.roundOff = roundOff; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getInternalNotes() { return internalNotes; }
    public void setInternalNotes(String internalNotes) { this.internalNotes = internalNotes; }

    public List<SalesInvoiceItemDTO> getItems() { return items; }
    public void setItems(List<SalesInvoiceItemDTO> items) { this.items = items; }
}
