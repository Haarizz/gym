package com.company.project.dto.mobile.bookings;

/** Body of POST /api/mobile/member/bookings/{id}/cancel (optional). */
public class CancelMemberBookingRequestDTO {

    // WALLET (default) — DIRECT is refused until a payment gateway can send money back.
    private String refundMethod;

    public String getRefundMethod() { return refundMethod; }
    public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }
}
