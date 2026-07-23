package com.company.project.dto;

public class BookingRequestDTO {

    private Long sessionId;
    private Long memberId;
    private String guestName;
    private String guestEmail;
    private String guestPhone;
    private String status;

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }

    public String getGuestEmail() { return guestEmail; }
    public void setGuestEmail(String guestEmail) { this.guestEmail = guestEmail; }

    public String getGuestPhone() { return guestPhone; }
    public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    private String paymentStatus;
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
}
