package com.company.project.dto.mobile.auth;

public class MobileRegisterInitiatedResponseDTO {
    private String registrationToken;
    private String maskedEmail;
    private String otpExpiresAt;
    private String resendAvailableAt;
    private String emailDeliveryStatus;

    /**
     * TEMPORARY: the raw OTP, returned so the mobile client can show it via a
     * toast instead of it being emailed. Remove this field (and its assignment
     * in MobilePendingRegistrationService) once real email delivery is wired in —
     * an OTP must never be present in a production API response otherwise.
     */
    private String devOtp;

    public String getRegistrationToken() { return registrationToken; }
    public void setRegistrationToken(String registrationToken) { this.registrationToken = registrationToken; }

    public String getMaskedEmail() { return maskedEmail; }
    public void setMaskedEmail(String maskedEmail) { this.maskedEmail = maskedEmail; }

    public String getOtpExpiresAt() { return otpExpiresAt; }
    public void setOtpExpiresAt(String otpExpiresAt) { this.otpExpiresAt = otpExpiresAt; }

    public String getResendAvailableAt() { return resendAvailableAt; }
    public void setResendAvailableAt(String resendAvailableAt) { this.resendAvailableAt = resendAvailableAt; }

    public String getEmailDeliveryStatus() { return emailDeliveryStatus; }
    public void setEmailDeliveryStatus(String emailDeliveryStatus) { this.emailDeliveryStatus = emailDeliveryStatus; }

    public String getDevOtp() { return devOtp; }
    public void setDevOtp(String devOtp) { this.devOtp = devOtp; }
}
