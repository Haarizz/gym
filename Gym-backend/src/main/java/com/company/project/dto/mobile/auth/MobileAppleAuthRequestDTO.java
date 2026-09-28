package com.company.project.dto.mobile.auth;

public class MobileAppleAuthRequestDTO {
    private String identityToken;
    private MobileAppleUserHintDTO user;

    public String getIdentityToken() { return identityToken; }
    public void setIdentityToken(String identityToken) { this.identityToken = identityToken; }

    public MobileAppleUserHintDTO getUser() { return user; }
    public void setUser(MobileAppleUserHintDTO user) { this.user = user; }
}
