package com.company.project.dto.mobile.payments;

import java.math.BigDecimal;

/** POST /api/mobile/payments/stripe/intents — what the app is about to charge. */
public class StripeIntentRequestDTO {

    private BigDecimal amount;
    // "card" | "upi" | "netbanking" — the tile the member picked in the payment sheet
    private String methodType;
    // The gym being paid. Explicit rather than X-Tenant-ID because a first purchase
    // (discovery / family) pays a gym the member doesn't belong to yet.
    private String tenantSlug;
    // Shown on the Stripe dashboard, e.g. "Golden membership"
    private String purpose;

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getMethodType() { return methodType; }
    public void setMethodType(String methodType) { this.methodType = methodType; }

    public String getTenantSlug() { return tenantSlug; }
    public void setTenantSlug(String tenantSlug) { this.tenantSlug = tenantSlug; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
}
