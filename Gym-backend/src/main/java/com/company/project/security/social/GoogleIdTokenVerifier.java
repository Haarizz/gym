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
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Set;

/**
 * Verifies a Google-issued ID token (signature + iss/aud/exp) against
 * Google's published JWKS and extracts the claims MobileSocialAuthService
 * needs. Never trusts anything from the token that hasn't passed signature
 * verification first — the Nimbus JWTProcessor enforces that ordering.
 */
@Component
public class GoogleIdTokenVerifier {

    private static final Set<String> VALID_ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");
    private static final String JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

    private final List<String> allowedClientIds;
    private final DefaultJWTProcessor<SecurityContext> jwtProcessor;

    public GoogleIdTokenVerifier(@Value("${oauth.google.client-ids:}") String allowedClientIdsCsv) {
        this.allowedClientIds = Arrays.stream(allowedClientIdsCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        this.jwtProcessor = buildProcessor();
    }

    private DefaultJWTProcessor<SecurityContext> buildProcessor() {
        try {
            JWKSource<SecurityContext> keySource = new RemoteJWKSet<>(new URL(JWKS_URL));
            DefaultJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            processor.setJWSKeySelector(new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource));
            return processor;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize Google JWKS source", e);
        }
    }

    public VerifiedProviderIdentity verify(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw invalid("Missing Google ID token.");
        }
        if (allowedClientIds.isEmpty()) {
            // Fail closed: an unconfigured client-id allow-list must never
            // silently accept every token (see application.properties).
            throw invalid("Google sign-in is not configured.");
        }

        JWTClaimsSet claims;
        try {
            claims = jwtProcessor.process(idToken, null);
        } catch (Exception e) {
            throw invalid("Invalid Google ID token.");
        }

        String issuer = claims.getIssuer();
        if (issuer == null || !VALID_ISSUERS.contains(issuer)) {
            throw invalid("Invalid Google token issuer.");
        }

        List<String> audience = claims.getAudience();
        if (audience == null || audience.stream().noneMatch(allowedClientIds::contains)) {
            throw invalid("Google token was not issued for this app.");
        }

        Date expiration = claims.getExpirationTime();
        if (expiration == null || expiration.before(new Date())) {
            throw invalid("Google token has expired.");
        }

        String subject = claims.getSubject();
        if (subject == null || subject.isBlank()) {
            throw invalid("Google token missing subject.");
        }

        try {
            String email = claims.getStringClaim("email");
            Boolean emailVerifiedClaim = claims.getBooleanClaim("email_verified");
            boolean emailVerified = Boolean.TRUE.equals(emailVerifiedClaim);
            String name = claims.getStringClaim("name");

            return new VerifiedProviderIdentity(
                    UserIdentityProvider.PROVIDER_GOOGLE, subject, email, emailVerified, null, name);
        } catch (Exception e) {
            throw invalid("Malformed Google token claims.");
        }
    }

    private OtpException invalid(String message) {
        return new OtpException(HttpStatus.BAD_REQUEST, "INVALID_PROVIDER_TOKEN", message);
    }
}
