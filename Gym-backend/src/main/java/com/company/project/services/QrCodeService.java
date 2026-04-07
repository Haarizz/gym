package com.company.project.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Generates and verifies HMAC-signed QR code strings.
 *
 * Format:
 *   GYMBIOS:BOOKING:{bookingId}:{base64urlHmac}
 *   GYMBIOS:MEMBER:{memberId}:{base64urlHmac}
 *
 * The HMAC covers the prefix+type+id portion so a device can verify
 * authenticity offline without a DB round-trip.
 */
@Service
public class QrCodeService {

    private static final String ALGO = "HmacSHA256";

    @Value("${checkin.hmac.secret}")
    private String hmacSecret;

    // ── Generation ────────────────────────────────────────────────────────────

    public String generateBookingQr(Long bookingId) {
        String payload = "GYMBIOS:BOOKING:" + bookingId;
        return payload + ":" + sign(payload);
    }

    public String generateMemberQr(Long memberId) {
        String payload = "GYMBIOS:MEMBER:" + memberId;
        return payload + ":" + sign(payload);
    }

    // ── Verification & Parsing ────────────────────────────────────────────────

    public record ParsedQr(String type, Long id) {}

    /**
     * Verifies the HMAC and returns the parsed type + id.
     * Throws {@link IllegalArgumentException} on invalid format or bad signature.
     */
    public ParsedQr verifyAndParse(String qrCode) {
        if (qrCode == null || qrCode.isBlank()) {
            throw new IllegalArgumentException("Empty QR code");
        }

        // Split on the last ':' to get payload + signature
        int lastColon = qrCode.lastIndexOf(':');
        if (lastColon < 0) {
            throw new IllegalArgumentException("Invalid QR format");
        }
        String payload   = qrCode.substring(0, lastColon);
        String signature = qrCode.substring(lastColon + 1);

        if (!sign(payload).equals(signature)) {
            throw new IllegalArgumentException("QR signature invalid");
        }

        // Parse: GYMBIOS:{type}:{id}
        String[] parts = payload.split(":", 3);
        if (parts.length != 3 || !"GYMBIOS".equals(parts[0])) {
            throw new IllegalArgumentException("Unrecognised QR payload");
        }

        String type = parts[1]; // BOOKING or MEMBER
        long   id;
        try {
            id = Long.parseLong(parts[2]);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid ID in QR payload");
        }

        return new ParsedQr(type, id);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(ALGO);
            mac.init(new SecretKeySpec(
                    hmacSecret.getBytes(StandardCharsets.UTF_8), ALGO));
            byte[] rawHmac = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute QR HMAC", e);
        }
    }
}
