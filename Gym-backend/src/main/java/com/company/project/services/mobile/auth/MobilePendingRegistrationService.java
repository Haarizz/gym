package com.company.project.services.mobile.auth;

import com.company.project.dto.AuthResponseDTO;
import com.company.project.dto.mobile.auth.MobileRegisterInitiatedResponseDTO;
import com.company.project.dto.mobile.auth.MobileRegisterRequestDTO;
import com.company.project.dto.mobile.auth.MobileRegistrationStatusResponseDTO;
import com.company.project.dto.mobile.auth.MobileResendOtpResponseDTO;
import com.company.project.entities.MobilePendingRegistration;
import com.company.project.entities.User;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.exceptions.OtpException;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.mobile.auth.MobilePendingRegistrationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Orchestrates the pending-registration lifecycle: initiate (register), verify,
 * resend, and status lookup. See the email-OTP-verification architecture plan
 * for the reasoning behind each decision referenced in comments below.
 *
 * Simplifications deliberately made for this first implementation pass (noted
 * inline where relevant): no real email delivery yet (the OTP is returned in
 * the API response for the mobile client to show via a toast, until SMTP
 * credentials are available), and no advisory-lock coordination layer on top of
 * the database's unique constraints — the constraints alone are the correctness
 * guarantee; the lock layer was an optimization for contention, not required
 * for correctness, and is left as a documented future improvement.
 */
@Service
public class MobilePendingRegistrationService {

    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int REGISTRATION_EXPIRY_HOURS = 24;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final int MAX_TOTAL_ATTEMPTS = 15;
    private static final int MAX_RESENDS = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final MobilePendingRegistrationRepository pendingRepository;
    private final UserRepository userRepository;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;
    private final MobileAuthService mobileAuthService;
    private final MobileJwtIssuer mobileJwtIssuer;

    @Value("${otp.dev-mode:true}")
    private boolean devMode;

    public MobilePendingRegistrationService(
            MobilePendingRegistrationRepository pendingRepository,
            UserRepository userRepository,
            OtpService otpService,
            PasswordEncoder passwordEncoder,
            MobileAuthService mobileAuthService,
            MobileJwtIssuer mobileJwtIssuer
    ) {
        this.pendingRepository = pendingRepository;
        this.userRepository = userRepository;
        this.otpService = otpService;
        this.passwordEncoder = passwordEncoder;
        this.mobileAuthService = mobileAuthService;
        this.mobileJwtIssuer = mobileJwtIssuer;
    }

    // ── Registration initiation ─────────────────────────────────────────────

    @Transactional
    public MobileRegisterInitiatedResponseDTO initiateRegistration(MobileRegisterRequestDTO request) {
        validate(request);

        String emailNormalized = normalize(request.getEmail());
        String usernameNormalized = normalize(request.getUsername());

        // Layer 2 backstop check: already-verified accounts. Unchanged from the
        // original registerMobileUser() behavior.
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessRuleViolationException("Username is already taken!");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessRuleViolationException("Email is already in use!");
        }

        MobilePendingRegistration pending = pendingRepository.findByEmailNormalized(emailNormalized).orElse(null);

        if (pending == null) {
            // No row for this email. Check the username separately.
            Optional<MobilePendingRegistration> usernameOwner = pendingRepository.findByUsernameNormalized(usernameNormalized);
            if (usernameOwner.isPresent()) {
                MobilePendingRegistration existing = usernameOwner.get();
                if (!existing.isExpired()) {
                    throw new BusinessRuleViolationException("Username is already taken!");
                }
                // Different email, expired: atomic ownership transition — delete
                // the dead registration, then create a fresh one. Deliberately not
                // an update: that row belongs to someone else's abandoned attempt.
                pendingRepository.delete(existing);
                pendingRepository.flush();
            }
            pending = new MobilePendingRegistration();
        } else if (!pending.getUsernameNormalized().equals(usernameNormalized)) {
            // Same email (re-registration or reclaim), but the username changed —
            // still have to check it doesn't collide with a *different* row.
            assertUsernameAvailable(usernameNormalized, pending.getId());
        }

        RawCredentials credentials = new RawCredentials(generateToken(), otpService.generateOtp());
        applyRegistrationFields(pending, request, emailNormalized, usernameNormalized, credentials);

        pendingRepository.save(pending);
        return buildInitiatedResponse(pending, credentials, "SENT");
    }

    /** Raw token/OTP for the current request only — never persisted as-is. */
    private record RawCredentials(String token, String otp) {}

    private void assertUsernameAvailable(String usernameNormalized, Long ownRowId) {
        pendingRepository.findByUsernameNormalized(usernameNormalized).ifPresent(existing -> {
            if (existing.getId().equals(ownRowId)) return;
            if (!existing.isExpired()) {
                throw new BusinessRuleViolationException("Username is already taken!");
            }
            pendingRepository.delete(existing);
            pendingRepository.flush();
        });
    }

    private void applyRegistrationFields(MobilePendingRegistration pending, MobileRegisterRequestDTO request,
                                          String emailNormalized, String usernameNormalized, RawCredentials credentials) {
        LocalDateTime now = LocalDateTime.now();

        pending.setFullName(request.getFullName().trim());
        pending.setUsername(request.getUsername().trim());
        pending.setEmail(request.getEmail().trim());
        pending.setEmailNormalized(emailNormalized);
        pending.setUsernameNormalized(usernameNormalized);
        pending.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        pending.setRegistrationTokenHash(hashToken(credentials.token()));
        pending.setOtpHash(otpService.hash(credentials.otp()));
        pending.setOtpExpiresAt(now.plusMinutes(OTP_EXPIRY_MINUTES));
        pending.setOtpAttemptCount(0);
        pending.setTotalAttemptCount(0);
        pending.setResendCount(0);
        pending.setLastOtpSentAt(now);
        pending.setStatus(MobilePendingRegistration.STATUS_PENDING);
        pending.setLinkedUserId(null);
        pending.setConsumedAt(null);
        pending.setExpiresAt(now.plusHours(REGISTRATION_EXPIRY_HOURS));
    }

    private MobileRegisterInitiatedResponseDTO buildInitiatedResponse(MobilePendingRegistration pending, RawCredentials credentials, String deliveryStatus) {
        MobileRegisterInitiatedResponseDTO response = new MobileRegisterInitiatedResponseDTO();
        response.setRegistrationToken(credentials.token());
        response.setMaskedEmail(maskEmail(pending.getEmail()));
        response.setOtpExpiresAt(pending.getOtpExpiresAt().format(ISO));
        response.setResendAvailableAt(pending.getLastOtpSentAt().plusSeconds(RESEND_COOLDOWN_SECONDS).format(ISO));
        response.setEmailDeliveryStatus(deliveryStatus);
        if (devMode) {
            response.setDevOtp(credentials.otp());
        }
        return response;
    }

    // ── OTP verification ────────────────────────────────────────────────────

    @Transactional
    public AuthResponseDTO verifyOtp(String rawToken, String otp) {
        String tokenHash = hashToken(rawToken);
        MobilePendingRegistration pending = pendingRepository.findByRegistrationTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new EntityNotFoundException("Registration not found."));

        if (MobilePendingRegistration.STATUS_CONSUMED.equals(pending.getStatus())) {
            throw new OtpException(HttpStatus.CONFLICT, "ALREADY_VERIFIED",
                    "This registration is already verified. Please sign in.");
        }

        if (pending.isExpired()) {
            throw new OtpException(HttpStatus.GONE, "REGISTRATION_EXPIRED",
                    "This registration has expired. Please register again.");
        }

        if (pending.getTotalAttemptCount() >= MAX_TOTAL_ATTEMPTS) {
            throw new OtpException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS",
                    "Too many incorrect attempts. Please register again.");
        }

        if (pending.getOtpAttemptCount() >= MAX_OTP_ATTEMPTS) {
            throw new OtpException(HttpStatus.TOO_MANY_REQUESTS, "OTP_LOCKED",
                    "Too many incorrect attempts for this code. Request a new one.");
        }

        boolean otpExpired = LocalDateTime.now().isAfter(pending.getOtpExpiresAt());
        boolean otpMatches = !otpExpired && otpService.matches(otp, pending.getOtpHash());

        if (!otpMatches) {
            pending.setOtpAttemptCount(pending.getOtpAttemptCount() + 1);
            pending.setTotalAttemptCount(pending.getTotalAttemptCount() + 1);
            pendingRepository.save(pending);
            throw new OtpException(HttpStatus.BAD_REQUEST, "INVALID_OTP",
                    otpExpired ? "This code has expired. Request a new one." : "Incorrect code.");
        }

        User user = mobileAuthService.createVerifiedMember(
                pending.getFullName(), pending.getUsername(), pending.getEmail(), pending.getPasswordHash());

        pending.setStatus(MobilePendingRegistration.STATUS_CONSUMED);
        pending.setLinkedUserId(user.getId());
        pending.setConsumedAt(LocalDateTime.now());
        pending.setOtpHash(null);
        pendingRepository.save(pending);

        return mobileJwtIssuer.issueForNewMember(user, pending.getFullName());
    }

    // ── Resend ───────────────────────────────────────────────────────────────

    @Transactional
    public MobileResendOtpResponseDTO resendOtp(String rawToken) {
        String tokenHash = hashToken(rawToken);
        MobilePendingRegistration pending = pendingRepository.findByRegistrationTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new EntityNotFoundException("Registration not found."));

        if (MobilePendingRegistration.STATUS_CONSUMED.equals(pending.getStatus())) {
            throw new OtpException(HttpStatus.CONFLICT, "ALREADY_VERIFIED",
                    "This registration is already verified. Please sign in.");
        }
        if (pending.isExpired()) {
            throw new OtpException(HttpStatus.GONE, "REGISTRATION_EXPIRED",
                    "This registration has expired. Please register again.");
        }
        if (pending.getResendCount() >= MAX_RESENDS) {
            throw new OtpException(HttpStatus.TOO_MANY_REQUESTS, "RESEND_LIMIT_REACHED",
                    "Too many resend attempts. Please register again.");
        }
        LocalDateTime cooldownEnds = pending.getLastOtpSentAt().plusSeconds(RESEND_COOLDOWN_SECONDS);
        if (LocalDateTime.now().isBefore(cooldownEnds)) {
            throw new OtpException(HttpStatus.TOO_MANY_REQUESTS, "RESEND_COOLDOWN",
                    "Please wait before requesting another code.");
        }

        String rawOtp = otpService.generateOtp();
        LocalDateTime now = LocalDateTime.now();
        pending.setOtpHash(otpService.hash(rawOtp));
        pending.setOtpExpiresAt(now.plusMinutes(OTP_EXPIRY_MINUTES));
        pending.setOtpAttemptCount(0);
        pending.setLastOtpSentAt(now);
        pending.setResendCount(pending.getResendCount() + 1);
        pendingRepository.save(pending);

        MobileResendOtpResponseDTO response = new MobileResendOtpResponseDTO();
        response.setOtpExpiresAt(pending.getOtpExpiresAt().format(ISO));
        response.setResendAvailableAt(pending.getLastOtpSentAt().plusSeconds(RESEND_COOLDOWN_SECONDS).format(ISO));
        if (devMode) {
            response.setDevOtp(rawOtp);
        }
        return response;
    }

    // ── Status / recovery ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MobileRegistrationStatusResponseDTO getStatus(String rawToken) {
        String tokenHash = hashToken(rawToken);
        MobilePendingRegistration pending = pendingRepository.findByRegistrationTokenHash(tokenHash)
                .orElseThrow(() -> new EntityNotFoundException("Registration not found."));

        MobileRegistrationStatusResponseDTO response = new MobileRegistrationStatusResponseDTO();
        response.setMaskedEmail(maskEmail(pending.getEmail()));
        response.setOtpExpiresAt(pending.getOtpExpiresAt().format(ISO));
        response.setResendAvailableAt(pending.getLastOtpSentAt().plusSeconds(RESEND_COOLDOWN_SECONDS).format(ISO));

        if (MobilePendingRegistration.STATUS_CONSUMED.equals(pending.getStatus())) {
            response.setStatus("ALREADY_VERIFIED");
        } else if (pending.isExpired()) {
            response.setStatus("EXPIRED");
        } else {
            response.setStatus("PENDING");
        }
        return response;
    }

    // ── Validation ───────────────────────────────────────────────────────────

    private void validate(MobileRegisterRequestDTO request) {
        if (isBlank(request.getFullName())) {
            throw new IllegalArgumentException("Full name is required.");
        }
        if (isBlank(request.getUsername()) || !request.getUsername().trim().matches("^[a-zA-Z0-9_]+$")) {
            throw new IllegalArgumentException("Username must contain only letters, numbers, and underscores.");
        }
        if (isBlank(request.getEmail()) || !request.getEmail().trim().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("A valid email address is required.");
        }
        if (isBlank(request.getPassword()) || request.getPassword().length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters.");
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String normalize(String value) {
        return value.trim().toLowerCase();
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return email;
        String local = email.substring(0, at);
        String domain = email.substring(at);
        String visible = local.substring(0, 1);
        return visible + "***" + domain;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
