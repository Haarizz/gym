package com.company.project.services.payments;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.exceptions.BusinessRuleViolationException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;

/** The checks that run before Stripe is ever called. */
class StripePaymentServiceTest {

    private final StripePaymentService unconfigured = new StripePaymentService("", false);

    private static PaymentSplitDTO leg(String method, String amount, String intentId) {
        PaymentSplitDTO leg = new PaymentSplitDTO(method, new BigDecimal(amount), null);
        leg.setStripePaymentIntentId(intentId);
        return leg;
    }

    @Test
    void cashAndCreditLegsPassStraightThrough() {
        String result = unconfigured.withVerifiedPayments(
                List.of(leg("Cash", "20", null), leg("Credit", "0", null)), true, null, () -> "done");
        assertEquals("done", result);
    }

    @Test
    void mobileCardLegWithoutStripePaymentIsRefused() {
        AtomicBoolean ran = new AtomicBoolean();
        assertThrows(BusinessRuleViolationException.class, () -> unconfigured.withVerifiedPayments(
                List.of(leg("Card", "50", null)), true, null, () -> { ran.set(true); return null; }));
        assertFalse(ran.get(), "the purchase must not run");
    }

    @Test
    void webDeskCardLegIsStillAccepted() {
        assertEquals("ok", unconfigured.withVerifiedPayments(
                List.of(leg("Card", "50", null)), false, null, () -> "ok"));
    }

    @Test
    void sameIntentOnTwoLegsIsRefused() {
        assertThrows(BusinessRuleViolationException.class, () -> unconfigured.withVerifiedPayments(
                List.of(leg("Card", "25", "pi_abc"), leg("Online Payment", "25", "pi_abc")), true, null, () -> null));
    }

    @Test
    void stripeLegWithoutGatewayKeyFailsBeforeThePurchase() {
        AtomicBoolean ran = new AtomicBoolean();
        assertThrows(BusinessRuleViolationException.class, () -> unconfigured.withVerifiedPayments(
                List.of(leg("Card", "50", "pi_abc")), true, null, () -> { ran.set(true); return null; }));
        assertFalse(ran.get());
    }

    @Test
    void onlyWellFormedIntentIdsCount() {
        assertEquals("pi_123abc", StripePaymentService.intentIdOf(leg("Card", "1", " pi_123abc ")));
        assertNull(StripePaymentService.intentIdOf(leg("Card", "1", "TXN-123")));
        assertNull(StripePaymentService.intentIdOf(leg("Card", "1", null)));
    }
}
