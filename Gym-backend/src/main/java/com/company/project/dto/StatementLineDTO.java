package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * One row in a member's Statement of Account — mirrors a single Receipt
 * (GymBios receipts are cash-basis, so each one already carries both the
 * billed amount and whatever has been paid against it).
 */
public class StatementLineDTO {

    private String date;
    private String receiptNo;
    private String type;
    private String description;
    private BigDecimal debit;
    private BigDecimal credit;
    private BigDecimal balance;
    private String paymentMethod;
    private String status;
    // Present only on an "Invoice" row that folded in one or more minor family
    // members' fees — lets the guardian's statement show exactly what portion
    // of the charge was actually for a dependent, not just their own membership.
    private List<MinorChargeDTO> minorCharges;

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getReceiptNo() { return receiptNo; }
    public void setReceiptNo(String receiptNo) { this.receiptNo = receiptNo; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getDebit() { return debit; }
    public void setDebit(BigDecimal debit) { this.debit = debit; }

    public BigDecimal getCredit() { return credit; }
    public void setCredit(BigDecimal credit) { this.credit = credit; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<MinorChargeDTO> getMinorCharges() { return minorCharges; }
    public void setMinorCharges(List<MinorChargeDTO> minorCharges) { this.minorCharges = minorCharges; }
}
