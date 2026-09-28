package com.company.project.services.mobile.auth;

import com.company.project.dto.AuthResponseDTO;
import com.company.project.dto.mobile.auth.MobileLinkProviderResponseDTO;
import com.company.project.dto.mobile.auth.MobileSocialAuthResponseDTO;
import com.company.project.entities.MobilePendingSocialRegistration;
import com.company.project.entities.User;
import com.company.project.entities.UserIdentityProvider;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.exceptions.OtpException;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.mobile.auth.MobilePendingSocialRegistrationRepository;
import com.company.project.repositories.mobile.auth.UserIdentityProviderRepository;
import com.company.project.security.JwtService;
import com.company.project.security.social.AppleIdTokenVerifier;
import com.company.project.security.social.GoogleIdTokenVerifier;
import com.company.project.security.social.VerifiedProviderIdentity;
import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Orchestrates Google/Apple sign-in: resolve-or-create identity resolution,
 * pending-registration lifecycle, and account linking. Mirrors
 * MobilePendingRegistrationService's shape for the equivalent OTP flow, but
 * skips OTP entirely — a validated provider token is the authentication
 * event, the same way OTP possession is for the password/OTP flow.
 *
 * Identity is always resolved by (provider, provider_user_id) — the
 * provider's `sub` claim — never by email. Email is used only to detect a
 * collision with an existing account, which is surfaced as LINK_REQUIRED
 * (never an automatic link) so the user must re-authenticate via their
 * existing method first; see linkProvider.
 */
@Service
public class MobileSocialAuthService {

    private static final int PENDING_EXPIRY_HOURS = 24;
    private static final Duration LINK_FRESHNESS_WINDOW = Duration.ofMinutes(5);
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final UserIdentityProviderRepository identityProviderRepository;
    private final MobilePendingSocialRegistrationRepository pendingRepository;
    private final UserRepository userRepository;
    private final MobileAuthService mobileAuthService;
    private final PasswordEncoder passwordEncoder;
    private final MobileJwtIssuer mobileJwtIssuer;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final AppleIdTokenVerifier appleIdTokenVerifier;
    private final JwtService jwtService;

    public MobileSocialAuthService(
            UserIdentityProviderRepository identityProviderRepository,
            MobilePendingSocialRegistrationRepository pendingRepository,
            UserRepository userRepository,
            MobileAuthService mobileAuthService,
            PasswordEncoder passwordEncoder,
            MobileJwtIssuer mobileJwtIssuer,
            GoogleIdTokenVerifier googleIdTokenVerifier,
            AppleIdTokenVerifier appleIdTokenVerifier,
            JwtService jwtService
    ) {
        this.identityProviderRepository = identityProviderRepository;
        this.pendingRepository = pendingRepository;
        this.userRepository = userRepository;
        this.mobileAuthService = mobileAuthService;
        this.passwordEncoder = passwordEncoder;
        this.mobileJwtIssuer = mobileJwtIssuer;
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.appleIdTokenVerifier = appleIdTokenVerifier;
        this.jwtService = jwtService;
    }

    // ── Sign-in ──────────────────────────────────────────────────────────────

    @Transactional
    public MobileSocialAuthResponseDTO authenticateWithGoogle(String idToken) {
        VerifiedProviderIdentity identity = googleIdTokenVerifier.verify(idToken);
        if (isBlank(identity.email())) {
            // Google always returns an email for standard consumer accounts;
            // users.email is NOT NULL/unique, so a missing email is an error
            // state, never an invented value.
            throw new OtpException(HttpStatus.BAD_REQUEST, "PROVIDER_EMAIL_MISSING",
                    "Google did not provide an email for this account.");
        }
        return resolveOrCreate(identity, identity.fullNameHint());
    }

    @Transactional
    public MobileSocialAuthResponseDTO authenticateWithApple(String identityToken, String userHintFullName) {
        VerifiedProviderIdentity identity = appleIdTokenVerifier.verify(identityToken);

        if (isBlank(identity.email())) {
            // Apple only sends email on the very first authorization ever for
            // this (user, app) pair. Recover it from a still-valid pending row
            // for the same subject rather than inventing one; if nothing is
            // recoverable, there is no safe way to proceed.
            Optional<MobilePendingSocialRegistration> recovered = pendingRepository
                    .findByProviderAndProviderUserId(UserIdentityProvider.PROVIDER_APPLE, identity.subject())
                    .filter(p -> !p.isExpired() && !isBlank(p.getEmailAtProvider()));
            if (recovered.isEmpty()) {
                throw new OtpException(HttpStatus.BAD_REQUEST, "APPLE_EMAIL_UNRECOVERABLE",
                        "Please revoke 'Sign in with Apple' access for GymBios in your Apple ID settings and try again.");
            }
            MobilePendingSocialRegistration pending = recovered.get();
            identity = new VerifiedProviderIdentity(UserIdentityProvider.PROVIDER_APPLE, identity.subject(),
                    pending.getEmailAtProvider(), pending.isEmailVerified(), pending.getIsPrivateRelay(), null);
        }

        return resolveOrCreate(identity, userHintFullName);
    }

    /**
     * @param fullNameHint Advisory only — for Google this is the verified
     *                     token claim (trusted), for Apple it's the client's
     *                      unverified submission (never trusted as identity,
     *                      only ever used to pre-fill a still-editable field).
     */
    private MobileSocialAuthResponseDTO resolveOrCreate(VerifiedProviderIdentity identity, String fullNameHint) {
        Optional<UserIdentityProvider> existingLink = identityProviderRepository
                .findByProviderAndProviderUserId(identity.provider(), identity.subject());

        if (existingLink.isPresent()) {
            User user = userRepository.findById(existingLink.get().getUserId())
                    .orElseThrow(() -> new EntityNotFoundException("Linked account not found."));
            AuthResponseDTO session = mobileJwtIssuer.issueForExistingSocialMember(user);
            return MobileSocialAuthResponseDTO.builder()
                    .status(MobileSocialAuthResponseDTO.STATUS_AUTHENTICATED)
                    .session(session)
                    .build();
        }

        if (Boolean.TRUE.equals(userRepository.existsByEmail(identity.email()))) {
            // Never auto-link on email match — force re-auth via the existing
            // method, then an explicit call to linkProvider.
            return MobileSocialAuthResponseDTO.builder()
                    .status(MobileSocialAuthResponseDTO.STATUS_LINK_REQUIRED)
                    .maskedEmail(maskEmail(identity.email()))
                    .provider(identity.provider())
                    .build();
        }

        MobilePendingSocialRegistration pending = pendingRepository
                .findByProviderAndProviderUserId(identity.provider(), identity.subject())
                .orElseGet(MobilePendingSocialRegistration::new);

        LocalDateTime now = LocalDateTime.now();
        String rawToken = generateToken();
        pending.setProvider(identity.provider());
        pending.setProviderUserId(identity.subject());
        pending.setPendingTokenHash(hashToken(rawToken));
        pending.setEmailAtProvider(identity.email());
        pending.setEmailVerified(identity.emailVerified());
        pending.setIsPrivateRelay(identity.isPrivateRelay());
        if (isBlank(pending.getFullNameAtProvider()) && !isBlank(fullNameHint)) {
            // Never blank out a previously-captured name hint on a nameless retry.
            pending.setFullNameAtProvider(fullNameHint);
        }
        if (isBlank(pending.getSuggestedUsername())) {
            pending.setSuggestedUsername(deriveSuggestedUsername(identity.email()));
        }
        pending.setStatus(MobilePendingSocialRegistration.STATUS_PENDING);
        pending.setExpiresAt(now.plusHours(PENDING_EXPIRY_HOURS));
        pendingRepository.save(pending);

        return MobileSocialAuthResponseDTO.builder()
                .status(MobileSocialAuthResponseDTO.STATUS_NEEDS_USERNAME)
                .pendingToken(rawToken)
                .suggestedUsername(pending.getSuggestedUsername())
                .prefillFullName(pending.getFullNameAtProvider())
                .maskedEmail(maskEmail(identity.email()))
                .expiresAt(pending.getExpiresAt().format(ISO))
                .provider(identity.provider())
                .build();
    }

    // ── Registration completion ─────────────────────────────────────────────

    @Transactional
    public AuthResponseDTO completeRegistration(String provider, String rawPendingToken, String username, String fullNameOverride) {
        String tokenHash = hashToken(rawPendingToken);
        MobilePendingSocialRegistration pending = pendingRepository.findByPendingTokenHashForUpdate(tokenHash)
                .filter(p -> p.getProvider().equals(provider))
                .orElseThrow(() -> new EntityNotFoundException("Registration not found."));

        if (MobilePendingSocialRegistration.STATUS_CONSUMED.equals(pending.getStatus())) {
            throw new OtpException(HttpStatus.CONFLICT, "ALREADY_VERIFIED",
                    "This registration is already verified. Please sign in.");
        }
        if (pending.isExpired()) {
            throw new OtpException(HttpStatus.GONE, "REGISTRATION_EXPIRED",
                    "This registration has expired. Please sign in again.");
        }

        if (isBlank(username) || !username.trim().matches("^[a-zA-Z0-9_]+$")) {
            throw new IllegalArgumentException("Username must contain only letters, numbers, and underscores.");
        }
        if (Boolean.TRUE.equals(userRepository.existsByUsername(username))) {
            throw new BusinessRuleViolationException("Username is already taken!");
        }
        if (Boolean.TRUE.equals(userRepository.existsByEmail(pending.getEmailAtProvider()))) {
            // Someone registered this email via another method while this
            // registration was pending — do not silently take it over.
            throw new OtpException(HttpStatus.CONFLICT, "EMAIL_NOW_IN_USE",
                    "An account with this email now exists. Please sign in and link this account from there instead.");
        }

        String fullName = !isBlank(fullNameOverride) ? fullNameOverride.trim()
                : !isBlank(pending.getFullNameAtProvider()) ? pending.getFullNameAtProvider()
                : username.trim();

        String placeholderPasswordHash = passwordEncoder.encode(generateToken());

        User user = mobileAuthService.createVerifiedMember(fullName, username.trim(), pending.getEmailAtProvider(), placeholderPasswordHash);

        UserIdentityProvider identityRow = new UserIdentityProvider();
        identityRow.setUserId(user.getId());
        identityRow.setProvider(pending.getProvider());
        identityRow.setProviderUserId(pending.getProviderUserId());
        identityRow.setEmailAtLinkTime(pending.getEmailAtProvider());
        identityProviderRepository.save(identityRow);

        pending.setStatus(MobilePendingSocialRegistration.STATUS_CONSUMED);
        pending.setLinkedUserId(user.getId());
        pending.setConsumedAt(LocalDateTime.now());
        pendingRepository.save(pending);

        return mobileJwtIssuer.issueForNewSocialMember(user, fullName);
    }

    // ── Account linking ─────────────────────────────────────────────────────

    @Transactional
    public MobileLinkProviderResponseDTO linkProvider(Long currentUserId, String provider, String providerToken, String bearerRawJwt) {
        assertFreshBearer(bearerRawJwt);

        VerifiedProviderIdentity identity = verifyProviderToken(provider, providerToken);

        Optional<UserIdentityProvider> existing = identityProviderRepository
                .findByProviderAndProviderUserId(identity.provider(), identity.subject());

        if (existing.isPresent()) {
            if (existing.get().getUserId().equals(currentUserId)) {
                return new MobileLinkProviderResponseDTO(MobileLinkProviderResponseDTO.STATUS_LINKED, identity.provider());
            }
            throw new OtpException(HttpStatus.CONFLICT, "PROVIDER_ALREADY_LINKED",
                    "This account is already linked to a different GymBios account.");
        }

        UserIdentityProvider row = new UserIdentityProvider();
        row.setUserId(currentUserId);
        row.setProvider(identity.provider());
        row.setProviderUserId(identity.subject());
        row.setEmailAtLinkTime(identity.email());
        identityProviderRepository.save(row);

        return new MobileLinkProviderResponseDTO(MobileLinkProviderResponseDTO.STATUS_LINKED, identity.provider());
    }

    /**
     * Requires the Bearer token used to call this endpoint to have been
     * issued recently — this is what actually satisfies "re-authenticate via
     * the existing login method" (a fresh password login or a fresh
     * returning-social sign-in both naturally produce a recently-issued
     * token), rather than merely requiring *some* currently-valid session.
     */
    private void assertFreshBearer(String bearerRawJwt) {
        java.util.Date issuedAt = jwtService.extractClaim(bearerRawJwt, Claims::getIssuedAt);
        if (issuedAt == null || Duration.between(issuedAt.toInstant(), Instant.now()).compareTo(LINK_FRESHNESS_WINDOW) > 0) {
            throw new OtpException(HttpStatus.UNAUTHORIZED, "REAUTH_REQUIRED",
                    "Please sign in again to link this account.");
        }
    }

    private VerifiedProviderIdentity verifyProviderToken(String provider, String providerToken) {
        if (UserIdentityProvider.PROVIDER_GOOGLE.equalsIgnoreCase(provider)) {
            return googleIdTokenVerifier.verify(providerToken);
        }
        if (UserIdentityProvider.PROVIDER_APPLE.equalsIgnoreCase(provider)) {
            return appleIdTokenVerifier.verify(providerToken);
        }
        throw new OtpException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_PROVIDER", "Unsupported provider: " + provider);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return email;
        String local = email.substring(0, at);
        String domain = email.substring(at);
        String visible = local.substring(0, 1);
        return visible + "***" + domain;
    }

    /** Best-effort pre-fill only — never validated for availability here, the client confirms/edits it. */
    private String deriveSuggestedUsername(String email) {
        if (isBlank(email)) return null;
        String local = email.substring(0, Math.max(email.indexOf('@'), 0));
        String sanitized = local.toLowerCase().replaceAll("[^a-z0-9_]", "");
        return sanitized.isEmpty() ? null : sanitized;
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
