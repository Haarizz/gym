package com.company.project.services.payments;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.security.TenantContextHolder;
import com.company.project.security.UserDetailsImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Card / UPI / Net banking payments taken in the mobile app through Stripe.
 *
 * The app asks for a PaymentIntent here, the member pays in Stripe's own sheet, and the
 * purchase request then carries the intent id on its payment leg
 * (PaymentSplitDTO.stripePaymentIntentId). Nothing the app says about the payment is
 * trusted: {@link #withVerifiedPayments} fetches each intent from Stripe and checks it
 * succeeded, belongs to this gym and signed-in person, matches the leg's amount and
 * hasn't paid for anything else. If the purchase then fails, the money goes straight back.
 *
 * Mobile member endpoints call it with gatewayOnly=true, which also turns away Card /
 * Online / Bank Transfer / Cheque legs that didn't come through Stripe — those used to
 * be accepted on a typed reference alone. Cash, Credit and Wallet legs are unaffected:
 * they still wait for staff approval exactly as before.
 *
 * Uses Stripe's REST API directly (no SDK dependency). Keys come from
 * STRIPE_SECRET_KEY (application.properties → stripe.secret-key); with no key set the
 * gateway reports itself unavailable instead of failing mid-payment.
 *
 * Simulation (payments.simulate=true, local profile only, and only while no secret key
 * is set): intents are issued here as "pi_sim_…", already succeeded, and verified from
 * memory with exactly the same checks — no money and no Stripe account involved. The app
 * shows an approve / decline test screen instead of Stripe's sheet.
 */
@Service
public class StripePaymentService {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentService.class);

    private static final String API = "https://api.stripe.com/v1";
    private static final Pattern INTENT_ID = Pattern.compile("^pi_[A-Za-z0-9_]+$");
    private static final String SIMULATED_PREFIX = "pi_sim_";

    /** Lower-cased PaymentBottomSheet titles that move money electronically — gateway only on mobile. */
    private static final Set<String> ELECTRONIC_METHODS =
            Set.of("card", "online payment", "online", "bank transfer", "cheque", "upi", "net banking");

    /** What the app's payment tiles map to in Stripe's payment_method_types. */
    private static final Map<String, String> METHOD_TYPES = Map.of(
            "card", "card",
            "upi", "upi",
            "netbanking", "netbanking");

    // Metadata keys stamped on every intent we create.
    private static final String META_TENANT = "gymbios_tenant";
    private static final String META_PAYER = "gymbios_payer";
    private static final String META_PURPOSE = "gymbios_purpose";
    private static final String META_CLAIMED = "gymbios_claimed";

    private final String secretKey;
    private final boolean simulate;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper mapper = new ObjectMapper();

    // Intents being spent by a request right now — stops two parallel requests both
    // passing the "not yet claimed" check for the same intent on this instance.
    private final Set<String> inFlight = ConcurrentHashMap.newKeySet();

    /** Simulated intents by id — lost on restart, which only means "payment expired". */
    private final Map<String, SimulatedIntent> simulated = new ConcurrentHashMap<>();

    private static final class SimulatedIntent {
        final long amountMinor;
        final String currency;
        final String tenant;
        final String payer;
        volatile String claimedBy;
        volatile boolean refunded;

        SimulatedIntent(long amountMinor, String currency, String tenant, String payer) {
            this.amountMinor = amountMinor;
            this.currency = currency;
            this.tenant = tenant;
            this.payer = payer;
        }
    }

    public StripePaymentService(@Value("${stripe.secret-key:}") String secretKey,
                                @Value("${payments.simulate:false}") boolean simulate) {
        this.secretKey = secretKey == null ? "" : secretKey.trim();
        // A real (test) key always wins, so turning the key on never leaves simulation running.
        this.simulate = simulate && this.secretKey.isEmpty();
        if (this.simulate) {
            log.warn("Online payments are SIMULATED (payments.simulate=true, no Stripe key) — no money moves");
        }
    }

    public boolean isConfigured() {
        return !secretKey.isEmpty() || simulate;
    }

    public boolean isSimulated() {
        return simulate;
    }

    // ── Creating a payment ─────────────────────────────────────────────────────

    public record CreatedIntent(String paymentIntentId, String clientSecret, BigDecimal amount, String currency,
                                boolean simulated) {}

    /**
     * A PaymentIntent for {@code amount} in the gym's currency, payable with one method
     * (card / upi / netbanking). Stamped with the gym and the signed-in person so it can
     * only pay for their purchase at that gym.
     */
    public CreatedIntent createIntent(BigDecimal amount, String methodType, String currency,
                                      String tenantSlug, String purpose) {
        requireConfigured();
        if (amount == null || amount.signum() <= 0) {
            throw new BusinessRuleViolationException("Nothing to pay");
        }
        String type = METHOD_TYPES.get(methodType == null ? "" : methodType.trim().toLowerCase(Locale.ROOT));
        if (type == null) {
            throw new BusinessRuleViolationException("Unsupported payment method: " + methodType);
        }
        if (!StringUtils.hasText(tenantSlug)) {
            throw new BusinessRuleViolationException("No gym selected for this payment");
        }
        if (("upi".equals(type) || "netbanking".equals(type)) && !"INR".equalsIgnoreCase(currency)) {
            throw new BusinessRuleViolationException("UPI and net banking are only available for gyms billing in INR");
        }

        if (simulate) {
            String id = SIMULATED_PREFIX + java.util.UUID.randomUUID().toString().replace("-", "");
            simulated.put(id, new SimulatedIntent(toMinor(amount), currency.toUpperCase(Locale.ROOT),
                    tenantSlug, currentPayer()));
            log.info("Simulated payment {} for {} {} at {}", id, amount, currency, tenantSlug);
            return new CreatedIntent(id, "simulated", amount, currency.toUpperCase(Locale.ROOT), true);
        }

        Map<String, String> form = new LinkedHashMap<>();
        form.put("amount", String.valueOf(toMinor(amount)));
        form.put("currency", currency.toLowerCase(Locale.ROOT));
        form.put("payment_method_types[]", type);
        form.put("description", StringUtils.hasText(purpose) ? purpose : "GymBios payment");
        form.put("metadata[" + META_TENANT + "]", tenantSlug);
        form.put("metadata[" + META_PAYER + "]", currentPayer());
        if (StringUtils.hasText(purpose)) form.put("metadata[" + META_PURPOSE + "]", truncate(purpose, 450));

        JsonNode intent = post("/payment_intents", form);
        return new CreatedIntent(intent.path("id").asText(), intent.path("client_secret").asText(),
                amount, currency.toUpperCase(Locale.ROOT), false);
    }

    // ── Spending a payment on a purchase ──────────────────────────────────────

    /**
     * Verifies every Stripe leg in {@code legs}, runs {@code purchase}, and marks the
     * intents spent. If {@code purchase} throws, the verified payments are refunded and
     * the error is rethrown. Must run with the purchase's gym as the current tenant.
     *
     * @param gatewayOnly reject electronic legs (Card/Online/Bank Transfer/Cheque) that
     *                    carry no Stripe payment — true on mobile member endpoints
     * @param claimToken  the request's Idempotency-Key, when it has one: a retry of an
     *                    already-completed request reuses its intent instead of being
     *                    refused, and the purchase service replays its stored result
     */
    public <T> T withVerifiedPayments(List<PaymentSplitDTO> legs, boolean gatewayOnly, String claimToken,
                                      Supplier<T> purchase) {
        List<PaymentSplitDTO> safeLegs = legs == null ? List.of() : legs;
        Map<String, BigDecimal> expected = new LinkedHashMap<>();
        for (PaymentSplitDTO leg : safeLegs) {
            String intentId = intentIdOf(leg);
            if (intentId == null) {
                if (gatewayOnly && isElectronic(leg)) {
                    throw new BusinessRuleViolationException(
                            "Pay by card, UPI or net banking through the in-app checkout");
                }
                continue;
            }
            if (expected.put(intentId, leg.getAmount() == null ? BigDecimal.ZERO : leg.getAmount()) != null) {
                throw new BusinessRuleViolationException("The same payment can't be used twice");
            }
        }
        if (expected.isEmpty()) {
            return purchase.get();
        }
        requireConfigured();

        Set<String> locked = new LinkedHashSet<>();
        try {
            for (String id : expected.keySet()) {
                if (!inFlight.add(id)) {
                    throw new BusinessRuleViolationException("This payment is already being processed");
                }
                locked.add(id);
            }

            List<String> toClaim = new ArrayList<>();
            for (Map.Entry<String, BigDecimal> e : expected.entrySet()) {
                if (verify(e.getKey(), e.getValue(), claimToken)) toClaim.add(e.getKey());
            }

            T result;
            try {
                result = purchase.get();
            } catch (RuntimeException ex) {
                // Only refund what this request newly took — a replayed, already-spent
                // intent belongs to the purchase that completed the first time.
                for (String id : toClaim) refundQuietly(id, "Purchase failed after payment: " + ex.getMessage());
                throw ex;
            }
            for (String id : toClaim) markClaimed(id, claimToken);
            return result;
        } finally {
            inFlight.removeAll(locked);
        }
    }

    /**
     * Refunds the Stripe legs of a payment staff rejected (or that was cancelled before
     * approval) — e.g. the card part of a Mixed or Credit payment whose cash never came.
     * Waits for the rejection to commit so a rolled-back rejection keeps the money.
     */
    public void refundRejected(List<PaymentSplitDTO> legs, String reason) {
        if (legs == null || legs.isEmpty() || !isConfigured()) return;
        List<String> ids = legs.stream().map(StripePaymentService::intentIdOf)
                .filter(java.util.Objects::nonNull).distinct().collect(Collectors.toList());
        if (ids.isEmpty()) return;
        Runnable refund = () -> ids.forEach(id -> refundQuietly(id, reason));
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    refund.run();
                }
            });
        } else {
            refund.run();
        }
    }

    public static String intentIdOf(PaymentSplitDTO leg) {
        if (leg == null) return null;
        String id = StringUtils.hasText(leg.getStripePaymentIntentId())
                ? leg.getStripePaymentIntentId().trim() : null;
        return id != null && INTENT_ID.matcher(id).matches() ? id : null;
    }

    // ── Internals ──────────────────────────────────────────────────────────────

    /** True if the intent still needs claiming; false if it's a replay of the same request. */
    private boolean verify(String intentId, BigDecimal legAmount, String claimToken) {
        if (intentId.startsWith(SIMULATED_PREFIX)) {
            return verifySimulated(intentId, legAmount, claimToken);
        }
        JsonNode intent = get("/payment_intents/" + intentId);
        JsonNode meta = intent.path("metadata");

        if (!"succeeded".equals(intent.path("status").asText())) {
            throw new BusinessRuleViolationException("The payment hasn't completed — please try again");
        }
        String tenant = TenantContextHolder.getCurrentTenant();
        if (tenant == null || !tenant.equals(meta.path(META_TENANT).asText(null))) {
            throw new BusinessRuleViolationException("This payment was made for a different gym");
        }
        if (!currentPayer().equals(meta.path(META_PAYER).asText(null))) {
            throw new BusinessRuleViolationException("This payment was made from a different account");
        }
        long received = intent.path("amount_received").asLong(-1);
        if (received != toMinor(legAmount)) {
            throw new BusinessRuleViolationException("The amount paid doesn't match the amount due");
        }
        String claimedBy = meta.path(META_CLAIMED).asText(null);
        if (StringUtils.hasText(claimedBy)) {
            if (claimToken != null && claimToken.equals(claimedBy)) return false;
            throw new BusinessRuleViolationException("This payment has already been used");
        }
        return true;
    }

    /** The same checks as a real intent, against the in-memory record. */
    private boolean verifySimulated(String intentId, BigDecimal legAmount, String claimToken) {
        SimulatedIntent intent = simulate ? simulated.get(intentId) : null;
        if (intent == null || intent.refunded) {
            throw new BusinessRuleViolationException("This test payment has expired — please pay again");
        }
        String tenant = TenantContextHolder.getCurrentTenant();
        if (tenant == null || !tenant.equals(intent.tenant)) {
            throw new BusinessRuleViolationException("This payment was made for a different gym");
        }
        if (!currentPayer().equals(intent.payer)) {
            throw new BusinessRuleViolationException("This payment was made from a different account");
        }
        if (intent.amountMinor != toMinor(legAmount)) {
            throw new BusinessRuleViolationException("The amount paid doesn't match the amount due");
        }
        if (StringUtils.hasText(intent.claimedBy)) {
            if (claimToken != null && claimToken.equals(intent.claimedBy)) return false;
            throw new BusinessRuleViolationException("This payment has already been used");
        }
        return true;
    }

    private void markClaimed(String intentId, String claimToken) {
        if (intentId.startsWith(SIMULATED_PREFIX)) {
            SimulatedIntent intent = simulated.get(intentId);
            if (intent != null) intent.claimedBy = StringUtils.hasText(claimToken) ? claimToken : "claimed";
            return;
        }
        try {
            post("/payment_intents/" + intentId, Map.of("metadata[" + META_CLAIMED + "]",
                    StringUtils.hasText(claimToken) ? claimToken : "claimed"));
        } catch (RuntimeException e) {
            // The purchase is already committed; failing it now would be worse than a
            // missing marker. Logged so it can be stamped by hand if ever needed.
            log.error("Stripe payment {} was used but couldn't be marked as spent: {}", intentId, e.getMessage());
        }
    }

    private void refundQuietly(String intentId, String reason) {
        if (intentId.startsWith(SIMULATED_PREFIX)) {
            SimulatedIntent intent = simulated.get(intentId);
            if (intent != null) intent.refunded = true;
            log.info("Simulated refund of {} ({})", intentId, reason);
            return;
        }
        try {
            post("/refunds", Map.of(
                    "payment_intent", intentId,
                    "metadata[gymbios_reason]", truncate(reason == null ? "" : reason, 450)));
            log.info("Refunded Stripe payment {} ({})", intentId, reason);
        } catch (RuntimeException e) {
            log.error("Couldn't refund Stripe payment {} ({}): {}", intentId, reason, e.getMessage());
        }
    }

    private static boolean isElectronic(PaymentSplitDTO leg) {
        return leg.getMethod() != null
                && ELECTRONIC_METHODS.contains(leg.getMethod().trim().toLowerCase(Locale.ROOT))
                && leg.getAmount() != null && leg.getAmount().signum() > 0;
    }

    /** "g:42" for a GymBios account, "u:42" for a gym staff login — the two id spaces overlap. */
    private static String currentPayer() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl user)) {
            throw new BusinessRuleViolationException("Sign in to pay");
        }
        return (user.isGlobal() ? "g:" : "u:") + user.getId();
    }

    /** All currencies the app offers (AED, INR, USD, EUR, GBP, SAR) use 2 decimals in Stripe. */
    private static long toMinor(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact();
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new BusinessRuleViolationException("Online payments aren't set up yet — choose Cash or Credit");
        }
    }

    private JsonNode get(String path) {
        return send(HttpRequest.newBuilder(URI.create(API + path)).GET());
    }

    private JsonNode post(String path, Map<String, String> form) {
        String body = form.entrySet().stream()
                .map(e -> enc(e.getKey()) + "=" + enc(e.getValue()))
                .collect(Collectors.joining("&"));
        return send(HttpRequest.newBuilder(URI.create(API + path))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body)));
    }

    private JsonNode send(HttpRequest.Builder builder) {
        HttpRequest request = builder
                .header("Authorization", "Bearer " + secretKey)
                .timeout(Duration.ofSeconds(20))
                .build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode json = mapper.readTree(response.body());
            if (response.statusCode() >= 400) {
                String message = json.path("error").path("message").asText("Payment provider error");
                log.warn("Stripe {} {} → {}: {}", request.method(), request.uri().getPath(), response.statusCode(), message);
                throw new BusinessRuleViolationException(message);
            }
            return json;
        } catch (BusinessRuleViolationException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessRuleViolationException("Couldn't reach the payment provider — please try again");
        } catch (Exception e) {
            log.warn("Stripe call failed: {}", e.getMessage());
            throw new BusinessRuleViolationException("Couldn't reach the payment provider — please try again");
        }
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
