package com.company.project.services.payments;

import com.company.project.dto.MembershipApplicationDTOs.CardDetails;
import com.company.project.exceptions.UnprocessableRequestException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.YearMonth;
import java.util.Map;
import java.util.Set;

/**
 * Stand-in for a Stripe card checkout on the public Service Portfolios page. It
 * behaves like Stripe test mode: only Stripe's published test card numbers go
 * through, the well-known decline test cards fail with Stripe's wording, and
 * nothing is ever sent anywhere. The card number itself is never stored — callers
 * keep only the brand and last 4 digits from the returned charge.
 *
 * <p>Separate from {@link StripePaymentService} on purpose: that one verifies real
 * PaymentIntents when a secret key is configured, and these charges must never
 * be mistaken for real money.
 */
@Service
public class SimulatedCardCheckout {

    public record Charge(String id, String brand, String last4, BigDecimal amount) {}

    /** Test numbers that succeed (Stripe docs, "Testing" → card numbers by brand). */
    private static final Set<String> SUCCESS_CARDS = Set.of(
            "4242424242424242", "4000056655665556", "5555555555554444", "2223003122003222",
            "5200828282828210", "5105105105105100", "378282246310005", "371449635398431",
            "6011111111111117", "6011000990139424", "3056930009020004", "36227206271667",
            "3566002020360505", "6200000000000005");

    /** Test numbers that fail, with the message Stripe shows for each. */
    private static final Map<String, String> DECLINE_CARDS = Map.of(
            "4000000000000002", "Your card was declined.",
            "4000000000009995", "Your card has insufficient funds.",
            "4000000000009987", "Your card was declined because it was reported lost.",
            "4000000000009979", "Your card was declined because it was reported stolen.",
            "4000000000000069", "Your card has expired.",
            "4000000000000127", "Your card's security code is incorrect.",
            "4000000000000119", "An error occurred while processing your card. Try again in a little bit.");

    private static final String ID_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private final SecureRandom random = new SecureRandom();

    public Charge charge(CardDetails card, BigDecimal amount) {
        if (card == null) throw new IllegalArgumentException("Please enter your card details");
        String number = card.number() == null ? "" : card.number().replaceAll("[\\s-]", "");
        if (!number.matches("\\d{13,19}") || !luhn(number)) {
            throw declined("Your card number is invalid.");
        }
        if (card.expMonth() == null || card.expYear() == null || card.expMonth() < 1 || card.expMonth() > 12) {
            throw declined("Your card's expiration date is invalid.");
        }
        int year = card.expYear() < 100 ? 2000 + card.expYear() : card.expYear();
        if (YearMonth.of(year, card.expMonth()).isBefore(YearMonth.now())) {
            throw declined("Your card's expiration date is in the past.");
        }
        String brand = brandOf(number);
        String cvc = card.cvc() == null ? "" : card.cvc().trim();
        int cvcLength = "American Express".equals(brand) ? 4 : 3;
        if (!cvc.matches("\\d{" + cvcLength + "}")) {
            throw declined("Your card's security code is incomplete.");
        }
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("This plan has no amount to pay online");
        }

        String decline = DECLINE_CARDS.get(number);
        if (decline != null) throw declined(decline);
        if (!SUCCESS_CARDS.contains(number)) {
            throw declined("Your card was declined. This is a test checkout — use a test card such as 4242 4242 4242 4242.");
        }
        return new Charge("pi_sim_" + randomId(24), brand, number.substring(number.length() - 4), amount);
    }

    static String brandOf(String number) {
        if (number.startsWith("4")) return "Visa";
        if (number.matches("^(5[1-5]|2[2-7]).*")) return "Mastercard";
        if (number.matches("^3[47].*")) return "American Express";
        if (number.matches("^(6011|65|64[4-9]).*")) return "Discover";
        if (number.matches("^3(0[0-5]|[68]).*")) return "Diners Club";
        if (number.startsWith("35")) return "JCB";
        if (number.startsWith("62")) return "UnionPay";
        return "Card";
    }

    static boolean luhn(String digits) {
        int sum = 0;
        boolean dbl = false;
        for (int i = digits.length() - 1; i >= 0; i--) {
            int d = digits.charAt(i) - '0';
            if (dbl) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
            dbl = !dbl;
        }
        return sum % 10 == 0;
    }

    private String randomId(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) sb.append(ID_ALPHABET.charAt(random.nextInt(ID_ALPHABET.length())));
        return sb.toString();
    }

    private static UnprocessableRequestException declined(String message) {
        return new UnprocessableRequestException(message);
    }
}
