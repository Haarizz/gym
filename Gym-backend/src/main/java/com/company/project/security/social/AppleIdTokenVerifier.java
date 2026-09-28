package com.company.project.security.social;

import com.company.project.entities.UserIdentityProvider;
import com.company.project.exceptions.OtpException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.net.URL;
import java.util.Date;

/**
 * Verifies an Apple-issued identity token (signature + iss/aud/exp) against
 * Apple's published JWKS and extracts the claims MobileSocialAuthService
 * needs.
 *
 * Two Apple-specific quirks handled here: (1) {@code email_verified} (and
 * {@code is_private_email}) are sent as the STRING "true"/"false", not a JSON
 * boolean — parsed defensively rather than via getBooleanClaim, which would
 * throw. (2) Apple's token carries no name claim at all, ever — {@link
 * VerifiedProviderIdentity#fullNameHint} is always null from this verifier;
 * the caller receives Apple's client-submitted, unverified name hint
 * separately and must never conflate the two.
 */
@Component
public class AppleIdTokenVerifier {

    private static final String ISSUER = "https://appleid.apple.com";
    private static final String JWKS_URL = "https://appleid.apple.com/auth/keys";

    private final String bundleId;
    private final DefaultJWTProcessor<SecurityContext> jwtProcessor;

    public AppleIdTokenVerifier(@Value("${oauth.apple.bundle-id:}") String bundleId) {
        this.bundleId = bundleId == null ? "" : bundleId.trim();
        this.jwtProcessor = buildProcessor();
    }

    private DefaultJWTProcessor<SecurityContext> buildProcessor() {
        try {
            JWKSource<SecurityContext> keySource = new RemoteJWKSet<>(new URL(JWKS_URL));
            DefaultJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            processor.setJWSKeySelector(new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource));
            return processor;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize Apple JWKS source", e);
        }
    }

    public VerifiedProviderIdentity verify(String identityToken) {
        if (identityToken == null || identityToken.isBlank()) {
            throw invalid("Missing Apple identity token.");
        }
        if (bundleId.isEmpty()) {
            // Fail closed: an unconfigured bundle id must never silently
            // accept every token (see application.properties).
            throw invalid("Apple sign-in is not configured.");
        }

        JWTClaimsSet claims;
        try {
            claims = jwtProcessor.process(identityToken, null);
        } catch (Exception e) {
            throw invalid("Invalid Apple identity token.");
        }

        if (!ISSUER.equals(claims.getIssuer())) {
            throw invalid("Invalid Apple token issuer.");
        }

        if (claims.getAudience() == null || !claims.getAudience().contains(bundleId)) {
            throw invalid("Apple token was not issued for this app.");
        }

        Date expiration = claims.getExpirationTime();
        if (expiration == null || expiration.before(new Date())) {
            throw invalid("Apple token has expired.");
        }

        String subject = claims.getSubject();
        if (subject == null || subject.isBlank()) {
            throw invalid("Apple token missing subject.");
        }

        try {
            String email = claims.getStringClaim("email");
            boolean emailVerified = parseAppleBoolean(claims.getClaim("email_verified"));
            Boolean isPrivateRelay = claims.getClaim("is_private_email") == null
                    ? null
                    : parseAppleBoolean(claims.getClaim("is_private_email"));

            return new VerifiedProviderIdentity(
                    UserIdentityProvider.PROVIDER_APPLE, subject, email, emailVerified, isPrivateRelay, null);
        } catch (Exception e) {
            throw invalid("Malformed Apple token claims.");
        }
    }

    /** Apple sends email_verified/is_private_email as the string "true"/"false", not a JSON boolean. */
    private boolean parseAppleBoolean(Object claimValue) {
        if (claimValue instanceof Boolean b) {
            return b;
        }
        if (claimValue instanceof String s) {
            return "true".equalsIgnoreCase(s);
        }
        return false;
    }

    private OtpException invalid(String message) {
        return new OtpException(HttpStatus.BAD_REQUEST, "INVALID_PROVIDER_TOKEN", message);
    }
}
