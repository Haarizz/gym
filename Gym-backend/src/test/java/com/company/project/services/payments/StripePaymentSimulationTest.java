package com.company.project.services.payments;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.security.TenantContextHolder;
import com.company.project.security.UserDetailsImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Local simulation runs the same verification rules as real Stripe intents. */
class StripePaymentSimulationTest {

    private final StripePaymentService service = new StripePaymentService("", true);

    @BeforeEach
    void signIn() {
        signInAs(42L);
        TenantContextHolder.setCurrentTenant("golden");
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
        TenantContextHolder.clear();
    }

    private static void signInAs(long id) {
        UserDetailsImpl user = new UserDetailsImpl(id, "m", "m@x.io", "", List.of(), true, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }

    private String pay(String amount) {
        StripePaymentService.CreatedIntent intent =
                service.createIntent(new BigDecimal(amount), "card", "AED", "golden", "Test");
        assertTrue(intent.simulated());
        return intent.paymentIntentId();
    }

    private static List<PaymentSplitDTO> cardLeg(String amount, String intentId) {
        PaymentSplitDTO leg = new PaymentSplitDTO("Card", new BigDecimal(amount), intentId);
        leg.setStripePaymentIntentId(intentId);
        return List.of(leg);
    }

    @Test
    void aSimulatedPaymentPaysOnceOnly() {
        String id = pay("50");
        assertEquals("booked", service.withVerifiedPayments(cardLeg("50", id), true, null, () -> "booked"));
        assertThrows(BusinessRuleViolationException.class,
                () -> service.withVerifiedPayments(cardLeg("50", id), true, null, () -> "again"));
    }

    @Test
    void wrongAmountIsRefused() {
        String id = pay("50");
        assertThrows(BusinessRuleViolationException.class,
                () -> service.withVerifiedPayments(cardLeg("10", id), true, null, () -> "cheap"));
    }

    @Test
    void anotherGymOrPersonCantSpendIt() {
        String id = pay("50");
        TenantContextHolder.setCurrentTenant("other-gym");
        assertThrows(BusinessRuleViolationException.class,
                () -> service.withVerifiedPayments(cardLeg("50", id), true, null, () -> null));
        TenantContextHolder.setCurrentTenant("golden");
        signInAs(7L);
        assertThrows(BusinessRuleViolationException.class,
                () -> service.withVerifiedPayments(cardLeg("50", id), true, null, () -> null));
    }

    @Test
    void aFailedPurchaseRefundsTheSimulatedPayment() {
        String id = pay("50");
        assertThrows(IllegalStateException.class, () -> service.withVerifiedPayments(cardLeg("50", id), true, null,
                () -> { throw new IllegalStateException("plan sold out"); }));
        // Refunded, so it can't be spent afterwards either.
        assertThrows(BusinessRuleViolationException.class,
                () -> service.withVerifiedPayments(cardLeg("50", id), true, null, () -> "late"));
    }

    @Test
    void aRealKeyTurnsSimulationOff() {
        assertFalse(new StripePaymentService("sk_test_x", true).isSimulated());
    }
}
