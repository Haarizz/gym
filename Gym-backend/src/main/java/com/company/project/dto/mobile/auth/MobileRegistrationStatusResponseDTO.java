package com.company.project.dto.mobile.auth;

public class MobileRegistrationStatusResponseDTO {
    private String status;
    private String maskedEmail;
    private String otpExpiresAt;
    private String resendAvailableAt;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMaskedEmail() { return maskedEmail; }
    public void setMaskedEmail(String maskedEmail) { this.maskedEmail = maskedEmail; }

    public String getOtpExpiresAt() { return otpExpiresAt; }
    public void setOtpExpiresAt(String otpExpiresAt) { this.otpExpiresAt = otpExpiresAt; }

    public String getResendAvailableAt() { return resendAvailableAt; }
    public void setResendAvailableAt(String resendAvailableAt) { this.resendAvailableAt = resendAvailableAt; }
}
