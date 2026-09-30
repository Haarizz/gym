package com.company.project.dto.mobile.membership;

import com.company.project.dto.PaymentSplitDTO;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

/**
 * A member settling their outstanding balance from Mobile. There is deliberately
 * no amount to pay here — the backend always settles its own authoritative
 * payable amount. expectedAmount is only a staleness check: the amount the
 * member was shown, which must still equal the current payable amount.
 */
public class MobileOutstandingBalanceSettleRequestDTO {

    @NotNull
    private BigDecimal expectedAmount;

    // PaymentBottomSheet method title: "Card" | "Cheque" | "Bank Transfer" | "Online Payment"
    @NotBlank
    private String paymentMethodUsed;

    // The single leg from PaymentBottomSheet (card type, reference, cheque no., ...).
    // Its amount is ignored and replaced with the server's payable amount.
    private List<PaymentSplitDTO> paymentBreakdown;

    public BigDecimal getExpectedAmount() { return expectedAmount; }
    public void setExpectedAmount(BigDecimal expectedAmount) { this.expectedAmount = expectedAmount; }

    public String getPaymentMethodUsed() { return paymentMethodUsed; }
    public void setPaymentMethodUsed(String paymentMethodUsed) { this.paymentMethodUsed = paymentMethodUsed; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }
}
