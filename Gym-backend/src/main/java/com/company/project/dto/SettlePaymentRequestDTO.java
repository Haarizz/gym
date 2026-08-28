package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request body for POST /api/billing/settle
 * Settles one or more pending receipt bills for a member.
 */
public class SettlePaymentRequestDTO {

    private Long memberDbId;
    private String paymentMethod;   // "Cash" | "Card" | "Cheque" | "Mixed"
    private String paymentDate;     // ISO date string (optional, defaults to now)
    private String transactionRef;  // optional reference number
    private String remarks;
    private List<BillPayment> billPayments;
    private List<PaymentSplitDTO> paymentBreakdown; // legs when paymentMethod == "Mixed"
    // Which staff member actually collected this payment — see MemberRequestDTO.processedByStaffId.
    private Long processedByStaffId;

    public static class BillPayment {
        private Long receiptId;
        private BigDecimal payAmount;

        public Long getReceiptId()                   { return receiptId; }
        public void setReceiptId(Long receiptId)     { this.receiptId = receiptId; }

        public BigDecimal getPayAmount()             { return payAmount; }
        public void setPayAmount(BigDecimal payAmount){ this.payAmount = payAmount; }
    }

    // Getters & Setters
    public Long getMemberDbId()                          { return memberDbId; }
    public void setMemberDbId(Long memberDbId)           { this.memberDbId = memberDbId; }

    public String getPaymentMethod()                     { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod)   { this.paymentMethod = paymentMethod; }

    public String getPaymentDate()                       { return paymentDate; }
    public void setPaymentDate(String paymentDate)       { this.paymentDate = paymentDate; }

    public String getTransactionRef()                    { return transactionRef; }
    public void setTransactionRef(String transactionRef) { this.transactionRef = transactionRef; }

    public String getRemarks()                           { return remarks; }
    public void setRemarks(String remarks)               { this.remarks = remarks; }

    public List<BillPayment> getBillPayments()           { return billPayments; }
    public void setBillPayments(List<BillPayment> billPayments) { this.billPayments = billPayments; }

    public List<PaymentSplitDTO> getPaymentBreakdown()   { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public Long getProcessedByStaffId()                  { return processedByStaffId; }
    public void setProcessedByStaffId(Long processedByStaffId) { this.processedByStaffId = processedByStaffId; }
}
