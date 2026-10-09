package com.company.project.dto.mobile.bookings;

import java.time.LocalDate;
import java.time.LocalTime;

public class MemberBookingDTO {
    private Long id;
    private Long classId;
    private String className;
    private String trainerName;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer durationMinutes;
    private String location;
    private String status;
    private Integer capacity;
    private Integer availableSpots;
    private boolean canCancel;

    public MemberBookingDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getClassId() { return classId; }
    public void setClassId(Long classId) { this.classId = classId; }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public String getTrainerName() { return trainerName; }
    public void setTrainerName(String trainerName) { this.trainerName = trainerName; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public Integer getAvailableSpots() { return availableSpots; }
    public void setAvailableSpots(Integer availableSpots) { this.availableSpots = availableSpots; }

    public boolean isCanCancel() { return canCancel; }
    public void setCanCancel(boolean canCancel) { this.canCancel = canCancel; }

    // ── Payment ──
    private String type; // class | pt | facility
    private java.math.BigDecimal price;       // what was charged, after any discount
    private java.math.BigDecimal grossPrice;
    private java.math.BigDecimal discountAmount;
    private String discountLabel;
    private java.math.BigDecimal walletAmount;
    private String paymentStatus;             // null (free) | paid | partial | pending
    private Long receiptId;

    // ── Cancellation / refund ──
    private String refundDeadline;            // gym-local ISO date-time, no zone
    private boolean refundableIfCancelledNow;
    private String refundStatus;              // REFUNDED | NOT_REFUNDABLE | VOIDED
    private String refundMethod;              // WALLET
    private java.math.BigDecimal refundedAmount;
    private String cancelledBy;               // MEMBER | STAFF

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public java.math.BigDecimal getPrice() { return price; }
    public void setPrice(java.math.BigDecimal price) { this.price = price; }

    public java.math.BigDecimal getGrossPrice() { return grossPrice; }
    public void setGrossPrice(java.math.BigDecimal grossPrice) { this.grossPrice = grossPrice; }

    public java.math.BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(java.math.BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public String getDiscountLabel() { return discountLabel; }
    public void setDiscountLabel(String discountLabel) { this.discountLabel = discountLabel; }

    public java.math.BigDecimal getWalletAmount() { return walletAmount; }
    public void setWalletAmount(java.math.BigDecimal walletAmount) { this.walletAmount = walletAmount; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public Long getReceiptId() { return receiptId; }
    public void setReceiptId(Long receiptId) { this.receiptId = receiptId; }

    public String getRefundDeadline() { return refundDeadline; }
    public void setRefundDeadline(String refundDeadline) { this.refundDeadline = refundDeadline; }

    public boolean isRefundableIfCancelledNow() { return refundableIfCancelledNow; }
    public void setRefundableIfCancelledNow(boolean refundableIfCancelledNow) { this.refundableIfCancelledNow = refundableIfCancelledNow; }

    public String getRefundStatus() { return refundStatus; }
    public void setRefundStatus(String refundStatus) { this.refundStatus = refundStatus; }

    public String getRefundMethod() { return refundMethod; }
    public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }

    public java.math.BigDecimal getRefundedAmount() { return refundedAmount; }
    public void setRefundedAmount(java.math.BigDecimal refundedAmount) { this.refundedAmount = refundedAmount; }

    public String getCancelledBy() { return cancelledBy; }
    public void setCancelledBy(String cancelledBy) { this.cancelledBy = cancelledBy; }
}
