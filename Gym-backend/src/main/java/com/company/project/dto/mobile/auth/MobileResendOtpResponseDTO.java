package com.company.project.dto.mobile.auth;

public class MobileResendOtpResponseDTO {
    private String otpExpiresAt;
    private String resendAvailableAt;

    /** TEMPORARY — see MobileRegisterInitiatedResponseDTO.devOtp. */
    private String devOtp;

    public String getOtpExpiresAt() { return otpExpiresAt; }
    public void setOtpExpiresAt(String otpExpiresAt) { this.otpExpiresAt = otpExpiresAt; }

    public String getResendAvailableAt() { return resendAvailableAt; }
    public void setResendAvailableAt(String resendAvailableAt) { this.resendAvailableAt = resendAvailableAt; }

    public String getDevOtp() { return devOtp; }
    public void setDevOtp(String devOtp) { this.devOtp = devOtp; }
}
