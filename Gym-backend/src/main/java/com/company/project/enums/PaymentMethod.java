package com.company.project.enums;

import java.util.Locale;

/**
 * Canonical set of payment methods offered across every payment-taking screen:
 * Cash, Card, Cheque, or Mixed (a split across two or more of the above).
 *
 * Fields that store a payment method remain plain Strings at the entity/DTO
 * level (for backward compatibility with legacy values like "Online",
 * "Bank Transfer", "Wallet" used by screens outside this set), so this enum
 * is used only to normalize/recognize the canonical values — never to
 * constrain the column itself.
 */
public enum PaymentMethod {
    CASH,
    CARD,
    CHEQUE,
    MIXED;

    /** Human-readable label matching what the UI displays. */
    public String label() {
        return switch (this) {
            case CASH -> "Cash";
            case CARD -> "Card";
            case CHEQUE -> "Cheque";
            case MIXED -> "Mixed";
        };
    }

    /**
     * Normalizes a raw payment-method string into one of the canonical values.
     * Returns null when the value doesn't match a recognized canonical method
     * (e.g. legacy "Online Transfer", "Bank Transfer", "Wallet") so callers can
     * fall back to their own bucket logic instead of guessing.
     */
    public static PaymentMethod fromString(String raw) {
        if (raw == null) return null;
        String v = raw.trim().toUpperCase(Locale.ROOT).replace('_', ' ').replace('-', ' ').trim();
        return switch (v) {
            case "CASH" -> CASH;
            case "CARD", "CREDIT CARD", "DEBIT CARD" -> CARD;
            case "CHEQUE", "CHECK" -> CHEQUE;
            case "MIXED", "MULTI PAY", "MULTIPAY", "MULTI", "SPLIT", "SPLIT PAYMENT" -> MIXED;
            default -> null;
        };
    }
}
