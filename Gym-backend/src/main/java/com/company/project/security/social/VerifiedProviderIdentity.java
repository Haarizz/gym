package com.company.project.security.social;

/**
 * A cryptographically verified Google/Apple identity token's relevant claims.
 * Every field here has already passed signature/issuer/audience/expiry
 * verification (see GoogleIdTokenVerifier / AppleIdTokenVerifier) — nothing
 * downstream should ever accept these values from an unverified source.
 *
 * @param fullNameHint For Google, this comes from the token's verified `name`
 *                      claim (trustworthy, same as every other field here).
 *                      For Apple, the identity token carries no name claim at
 *                      all — this is always null from AppleIdTokenVerifier;
 *                      the caller (MobileSocialAuthService) separately
 *                      receives the client-submitted, unverified advisory
 *                      name from the request body and must never conflate it
 *                      with this trusted field.
 */
public record VerifiedProviderIdentity(
        String provider,
        String subject,
        String email,
        boolean emailVerified,
        Boolean isPrivateRelay,
        String fullNameHint
) {
}
