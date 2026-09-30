package com.company.project.dto;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * One leg of a payment — either one of several legs in a Mixed payment, or the
 * single leg describing how a non-Mixed payment (Cash/Card/Cheque/Bank Transfer/
 * Online Payment/Credit's "Received Via") was actually received, e.g.
 * { method: "Cheque", amount: 250, chequeNumber: "CHQ-00219", bankName: "SBI" } or
 * { method: "Online Payment", amount: 500, onlinePaymentType: "Google Pay", reference: "GPAY123" }.
 *
 * Only the fields relevant to a given method are populated — e.g. cardType is set
 * only for Card legs, chequeNumber/bankName/chequeDate only for Cheque legs, etc.
 * Kept intentionally flat (rather than a subtype per method) so this stays a
 * simple, generically-JSON-serializable value stored in Receipt.paymentBreakdown.
 */
public class PaymentSplitDTO {

    private String method;
    private BigDecimal amount;
    // Generic reference/transaction number — Card auth ref, Bank Transfer ref,
    // Online Payment transaction id. Cheque uses the dedicated chequeNumber below.
    private String reference;

    // Card
    private String cardType;

    // Cheque
    private String chequeNumber;
    private String chequeDate;   // ISO date string "YYYY-MM-DD"

    // Cheque / Bank Transfer
    private String bankName;

    // Bank Transfer — specific ledger account (Chart of Accounts) credited
    private String bankAccountCode;
    private String bankAccountName;

    // Online Payment
    private String onlinePaymentType;   // Google Pay / PhonePe / Paytm / ... / Other
    private String providerName;        // only when onlinePaymentType == "Other"

    // When this leg was paid (ISO "YYYY-MM-DD") — set on supplier-bill payment legs,
    // since one bill can collect several payments on different dates.
    private String paymentDate;

    public PaymentSplitDTO() {}

    public PaymentSplitDTO(String method, BigDecimal amount, String reference) {
        this.method = method;
        this.amount = amount;
        this.reference = reference;
    }

    public String getPaymentDate() { return paymentDate; }
    public void setPaymentDate(String paymentDate) { this.paymentDate = paymentDate; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }

    public String getChequeNumber() { return chequeNumber; }
    public void setChequeNumber(String chequeNumber) { this.chequeNumber = chequeNumber; }

    public String getChequeDate() { return chequeDate; }
    public void setChequeDate(String chequeDate) { this.chequeDate = chequeDate; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public String getOnlinePaymentType() { return onlinePaymentType; }
    public void setOnlinePaymentType(String onlinePaymentType) { this.onlinePaymentType = onlinePaymentType; }

    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }

    // Value equality is required, not cosmetic: this is stored via a JPA
    // AttributeConverter, and Hibernate dirty-checks converted attributes with
    // equals(). With identity equality every loaded Receipt looked modified, so
    // any read-write transaction that merely read receipts issued a spurious
    // UPDATE on commit (rejected in All Branches mode by BranchSecurityListener).
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PaymentSplitDTO)) return false;
        PaymentSplitDTO that = (PaymentSplitDTO) o;
        return Objects.equals(method, that.method) &&
                Objects.equals(amount, that.amount) &&
                Objects.equals(reference, that.reference) &&
                Objects.equals(cardType, that.cardType) &&
                Objects.equals(chequeNumber, that.chequeNumber) &&
                Objects.equals(chequeDate, that.chequeDate) &&
                Objects.equals(bankName, that.bankName) &&
                Objects.equals(bankAccountCode, that.bankAccountCode) &&
                Objects.equals(bankAccountName, that.bankAccountName) &&
                Objects.equals(onlinePaymentType, that.onlinePaymentType) &&
                Objects.equals(providerName, that.providerName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(method, amount, reference, cardType, chequeNumber, chequeDate, bankName, bankAccountCode, bankAccountName, onlinePaymentType, providerName);
    }
}
