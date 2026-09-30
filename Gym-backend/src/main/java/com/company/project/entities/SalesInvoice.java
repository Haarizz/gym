package com.company.project.entities;

import com.company.project.converters.PaymentBreakdownConverter;
import com.company.project.dto.PaymentSplitDTO;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Back-office sales invoice — a direct sale to a member or a walk-in customer
 * (Sales & Purchases › Sales Invoice), ported from BillBull's Sales Invoice.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "sales_invoices")
public class SalesInvoice extends BaseEntity implements BranchAware {

    public static final String CUSTOMER_WALK_IN = "WALK_IN";
    public static final String CUSTOMER_MEMBER = "MEMBER";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", unique = true)
    private String invoiceNumber;

    @Column(name = "invoice_date")
    private LocalDate invoiceDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "payment_terms")
    private String paymentTerms;

    @Column(name = "reference")
    private String reference;

    @Column(name = "salesperson")
    private String salesperson;

    // WALK_IN, MEMBER
    @Column(name = "customer_type", nullable = false)
    private String customerType = CUSTOMER_WALK_IN;

    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_phone")
    private String customerPhone;

    @Column(name = "customer_email")
    private String customerEmail;

    @Column(name = "customer_address", columnDefinition = "TEXT")
    private String customerAddress;

    @Column(name = "customer_trn")
    private String customerTrn;

    // DRAFT, CONFIRMED, CANCELLED
    @Column(name = "status", nullable = false)
    private String status = "DRAFT";

    // UNPAID, PARTIAL, PAID
    @Column(name = "payment_status", nullable = false)
    private String paymentStatus = "UNPAID";

    /** VAT Incl. mode: line prices already contain VAT, which is extracted rather than added. */
    @Column(name = "prices_include_tax", nullable = false)
    private Boolean pricesIncludeTax = false;

    /** Gross of all lines (qty × price), before any discount. */
    @Column(name = "subtotal", precision = 12, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    /** Sum of the per-line discounts. */
    @Column(name = "discount_amount", precision = 12, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    /** Bill-level ("footer") discount, spread over the lines before tax. */
    @Column(name = "footer_discount", precision = 12, scale = 2)
    private BigDecimal footerDiscount = BigDecimal.ZERO;

    @Column(name = "taxable_amount", precision = 12, scale = 2)
    private BigDecimal taxableAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", precision = 12, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "delivery_charge", precision = 12, scale = 2)
    private BigDecimal deliveryCharge = BigDecimal.ZERO;

    @Column(name = "round_off", precision = 12, scale = 2)
    private BigDecimal roundOff = BigDecimal.ZERO;

    @Column(name = "total_amount", precision = 12, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "amount_paid", precision = 12, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "total_cogs", precision = 12, scale = 2)
    private BigDecimal totalCogs = BigDecimal.ZERO;

    /** True when confirming took the goods out of stock — cancelling puts back exactly that. */
    @Column(name = "stock_deducted", nullable = false)
    private Boolean stockDeducted = false;

    // Latest payment's method ("Mixed" once payments used different methods), and every
    // payment's legs, each stamped with its payment date — same shape as supplier bills.
    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "payment_breakdown", columnDefinition = "TEXT")
    @Convert(converter = PaymentBreakdownConverter.class)
    private List<PaymentSplitDTO> paymentBreakdown;

    /** Customer-facing notes — printed on the invoice. */
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /** Staff-only notes — never printed. */
    @Column(name = "internal_notes", columnDefinition = "TEXT")
    private String internalNotes;

    @Column(name = "branch_id")
    private Long branchId;

    public SalesInvoice() {}

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

    public BigDecimal getTotalCogs() { return totalCogs; }
    public void setTotalCogs(BigDecimal totalCogs) { this.totalCogs = totalCogs; }

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
}
