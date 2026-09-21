package com.company.project.services.mobile.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

/**
 * Generates and verifies 6-digit numeric OTPs. Hashed at rest via the existing
 * BCrypt PasswordEncoder bean (same posture as password storage, zero new
 * dependency) — never stored or logged in plaintext.
 */
@Service
public class OtpService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final PasswordEncoder passwordEncoder;

    public OtpService(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    public String generateOtp() {
        int value = SECURE_RANDOM.nextInt(1_000_000);
        return String.format("%06d", value);
    }

    public String hash(String otp) {
        return passwordEncoder.encode(otp);
    }

    public boolean matches(String rawOtp, String otpHash) {
        return otpHash != null && rawOtp != null && passwordEncoder.matches(rawOtp, otpHash);
    }
}
