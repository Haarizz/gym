package com.company.project.dto.mobile.payments;

import java.math.BigDecimal;

/** The PaymentIntent the app hands to Stripe's payment sheet. */
public class StripeIntentResponseDTO {

    private final String paymentIntentId;
    private final String clientSecret;
    private final BigDecimal amount;
    private final String currency;
    // Local simulation: no Stripe sheet — the app shows its own approve / decline test screen.
    private final boolean simulated;

    public StripeIntentResponseDTO(String paymentIntentId, String clientSecret, BigDecimal amount, String currency,
                                   boolean simulated) {
        this.simulated = simulated;
        this.paymentIntentId = paymentIntentId;
        this.clientSecret = clientSecret;
        this.amount = amount;
        this.currency = currency;
    }

    public String getPaymentIntentId() { return paymentIntentId; }
    public String getClientSecret() { return clientSecret; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public boolean isSimulated() { return simulated; }
}
