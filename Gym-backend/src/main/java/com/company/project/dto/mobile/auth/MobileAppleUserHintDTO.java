package com.company.project.dto.mobile.auth;

/**
 * Apple's native SDK delivers the user's name out-of-band, unsigned, only on
 * the very first authorization — it is never part of the verified identity
 * token. This is accepted as an advisory pre-fill only (see
 * AppleIdTokenVerifier / MobileSocialAuthService), never trusted as an
 * identity claim.
 */
public class MobileAppleUserHintDTO {
    private String fullName;

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
}
