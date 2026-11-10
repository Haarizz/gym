package com.company.project.services.payments;

import com.company.project.dto.MembershipApplicationDTOs.CardDetails;
import com.company.project.exceptions.UnprocessableRequestException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Year;

import static org.junit.jupiter.api.Assertions.*;

class SimulatedCardCheckoutTest {

    private final SimulatedCardCheckout checkout = new SimulatedCardCheckout();
    private static final int NEXT_YEAR = Year.now().getValue() + 1;

    private static CardDetails card(String number, String cvc) {
        return new CardDetails(number, 12, NEXT_YEAR, cvc, "Test User");
    }

    @Test
    void stripeSuccessTestCardIsCharged() {
        SimulatedCardCheckout.Charge charge = checkout.charge(card("4242 4242 4242 4242", "123"), new BigDecimal("300"));
        assertTrue(charge.id().startsWith("pi_sim_"));
        assertEquals("Visa", charge.brand());
        assertEquals("4242", charge.last4());
        assertEquals(new BigDecimal("300"), charge.amount());
    }

    @Test
    void amexNeedsFourDigitCvc() {
        assertThrows(UnprocessableRequestException.class,
                () -> checkout.charge(card("378282246310005", "123"), BigDecimal.TEN));
        assertEquals("American Express", checkout.charge(card("378282246310005", "1234"), BigDecimal.TEN).brand());
    }

    @Test
    void declineTestCardFailsWithStripeMessage() {
        UnprocessableRequestException e = assertThrows(UnprocessableRequestException.class,
                () -> checkout.charge(card("4000000000000002", "123"), BigDecimal.TEN));
        assertEquals("Your card was declined.", e.getMessage());
        assertEquals("Your card has insufficient funds.", assertThrows(UnprocessableRequestException.class,
                () -> checkout.charge(card("4000000000009995", "123"), BigDecimal.TEN)).getMessage());
    }

    @Test
    void realLookingCardIsNotAccepted() {
        // Passes the Luhn check but isn't one of Stripe's test numbers.
        UnprocessableRequestException e = assertThrows(UnprocessableRequestException.class,
                () -> checkout.charge(card("4111111111111111", "123"), BigDecimal.TEN));
        assertTrue(e.getMessage().contains("test card"));
    }

    @Test
    void invalidNumberAndPastExpiryAreRejected() {
        assertEquals("Your card number is invalid.", assertThrows(UnprocessableRequestException.class,
                () -> checkout.charge(card("4242424242424241", "123"), BigDecimal.TEN)).getMessage());
        CardDetails expired = new CardDetails("4242424242424242", 1, 2020, "123", null);
        assertEquals("Your card's expiration date is in the past.", assertThrows(UnprocessableRequestException.class,
                () -> checkout.charge(expired, BigDecimal.TEN)).getMessage());
    }
}
