package com.company.project.dto;

/**
 * Method-agnostic check-in request.
 * Only one identifier field is required per request; the service resolves whoever
 * the person is from whichever field is present.
 *
 * method values: "qr" | "face" | "manual" | "app"
 */
public class CheckInRequest {

    // Required — describes the originating check-in channel
    private String method;

    // Set by QR scanner devices: full GYMBIOS:... QR string
    private String qrCode;

    // Set by face recognition device after it matches a face
    private String faceId;

    // Set by staff (manual) or mobile app check-in
    private Long memberId;

    // Optional — links this attendance record to a specific booking
    private Long bookingId;

    // Which device triggered the check-in (e.g. "GATE-01", "WEB", "MOBILE")
    private String deviceId;

    private String notes;

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public String getQrCode() { return qrCode; }
    public void setQrCode(String qrCode) { this.qrCode = qrCode; }

    public String getFaceId() { return faceId; }
    public void setFaceId(String faceId) { this.faceId = faceId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
