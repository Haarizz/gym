package com.company.project.dto.mobile.auth;

import com.company.project.dto.AuthResponseDTO;

/**
 * Envelope for /google, /apple and /{provider}/link outcomes. Exactly one of
 * the three shapes below is populated, selected by {@code status}:
 * <ul>
 *   <li>AUTHENTICATED — {@code session} carries the issued JWT/profile, same
 *       shape a password/OTP login returns.</li>
 *   <li>LINK_REQUIRED — an account with this verified email already exists
 *       under a different login method; no row was written anywhere.</li>
 *   <li>NEEDS_USERNAME — a brand-new provider identity; the client must
 *       collect a username and call /complete with {@code pendingToken}.</li>
 * </ul>
 */
public class MobileSocialAuthResponseDTO {
    public static final String STATUS_AUTHENTICATED = "AUTHENTICATED";
    public static final String STATUS_LINK_REQUIRED = "LINK_REQUIRED";
    public static final String STATUS_NEEDS_USERNAME = "NEEDS_USERNAME";

    private String status;
    private AuthResponseDTO session;
    private String pendingToken;
    private String suggestedUsername;
    private String prefillFullName;
    private String maskedEmail;
    private String expiresAt;
    private String provider;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public AuthResponseDTO getSession() { return session; }
    public void setSession(AuthResponseDTO session) { this.session = session; }

    public String getPendingToken() { return pendingToken; }
    public void setPendingToken(String pendingToken) { this.pendingToken = pendingToken; }

    public String getSuggestedUsername() { return suggestedUsername; }
    public void setSuggestedUsername(String suggestedUsername) { this.suggestedUsername = suggestedUsername; }

    public String getPrefillFullName() { return prefillFullName; }
    public void setPrefillFullName(String prefillFullName) { this.prefillFullName = prefillFullName; }

    public String getMaskedEmail() { return maskedEmail; }
    public void setMaskedEmail(String maskedEmail) { this.maskedEmail = maskedEmail; }

    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    // Manual Builder
    public static MobileSocialAuthResponseDTOBuilder builder() {
        return new MobileSocialAuthResponseDTOBuilder();
    }

    public static class MobileSocialAuthResponseDTOBuilder {
        private String status;
        private AuthResponseDTO session;
        private String pendingToken;
        private String suggestedUsername;
        private String prefillFullName;
        private String maskedEmail;
        private String expiresAt;
        private String provider;

        public MobileSocialAuthResponseDTOBuilder status(String status) { this.status = status; return this; }
        public MobileSocialAuthResponseDTOBuilder session(AuthResponseDTO session) { this.session = session; return this; }
        public MobileSocialAuthResponseDTOBuilder pendingToken(String pendingToken) { this.pendingToken = pendingToken; return this; }
        public MobileSocialAuthResponseDTOBuilder suggestedUsername(String suggestedUsername) { this.suggestedUsername = suggestedUsername; return this; }
        public MobileSocialAuthResponseDTOBuilder prefillFullName(String prefillFullName) { this.prefillFullName = prefillFullName; return this; }
        public MobileSocialAuthResponseDTOBuilder maskedEmail(String maskedEmail) { this.maskedEmail = maskedEmail; return this; }
        public MobileSocialAuthResponseDTOBuilder expiresAt(String expiresAt) { this.expiresAt = expiresAt; return this; }
        public MobileSocialAuthResponseDTOBuilder provider(String provider) { this.provider = provider; return this; }

        public MobileSocialAuthResponseDTO build() {
            MobileSocialAuthResponseDTO dto = new MobileSocialAuthResponseDTO();
            dto.status = this.status;
            dto.session = this.session;
            dto.pendingToken = this.pendingToken;
            dto.suggestedUsername = this.suggestedUsername;
            dto.prefillFullName = this.prefillFullName;
            dto.maskedEmail = this.maskedEmail;
            dto.expiresAt = this.expiresAt;
            dto.provider = this.provider;
            return dto;
        }
    }
}
