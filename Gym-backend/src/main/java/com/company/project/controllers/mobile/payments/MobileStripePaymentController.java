package com.company.project.controllers.mobile.payments;

import com.company.project.dto.mobile.payments.StripeIntentRequestDTO;
import com.company.project.dto.mobile.payments.StripeIntentResponseDTO;
import com.company.project.repositories.FinancialSettingRepository;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.payments.StripePaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Starts a Card / UPI / Net banking payment for the mobile payment sheet. Global (not
 * X-Tenant-ID routed, see TenantContextFilter) because a first purchase pays a gym the
 * caller isn't a member of yet; the gym is named in the body and stamped on the intent,
 * and StripePaymentService refuses to spend it anywhere else.
 */
@RestController
@RequestMapping("/api/mobile/payments/stripe")
public class MobileStripePaymentController {

    private final StripePaymentService stripePaymentService;
    private final FinancialSettingRepository financialSettingRepository;

    public MobileStripePaymentController(StripePaymentService stripePaymentService,
                                         FinancialSettingRepository financialSettingRepository) {
        this.stripePaymentService = stripePaymentService;
        this.financialSettingRepository = financialSettingRepository;
    }

    @PostMapping("/intents")
    public ResponseEntity<StripeIntentResponseDTO> createIntent(@RequestBody StripeIntentRequestDTO request) {
        String currency = gymCurrency(request.getTenantSlug());
        StripePaymentService.CreatedIntent intent = stripePaymentService.createIntent(
                request.getAmount(), request.getMethodType(), currency,
                request.getTenantSlug(), request.getPurpose());
        return ResponseEntity.ok(new StripeIntentResponseDTO(
                intent.paymentIntentId(), intent.clientSecret(), intent.amount(), intent.currency(),
                intent.simulated()));
    }

    /**
     * The gym's billing currency (Settings → currency), decided here rather than by the
     * app so a payment can't be taken in a cheaper currency than the price.
     */
    private String gymCurrency(String tenantSlug) {
        if (!StringUtils.hasText(tenantSlug)) return "AED";
        // This is the request's first query, so the request's EntityManager takes its
        // connection now — routed by the tenant set here. Don't unbind that EntityManager:
        // OpenEntityManagerInViewInterceptor unbinds it itself when the request ends and
        // throws if it's already gone.
        try {
            TenantContextHolder.setCurrentTenant(tenantSlug.trim());
            return financialSettingRepository.findByCategoryOrderBySettingKeyAsc("APP_PREFERENCES").stream()
                    .filter(f -> "currency_code".equals(f.getSettingKey()) && StringUtils.hasText(f.getSettingValue()))
                    .map(f -> f.getSettingValue().trim().toUpperCase())
                    .findFirst().orElse("AED");
        } finally {
            TenantContextHolder.clear();
        }
    }
}
