package com.company.project.dto.mobile.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class MemberDashboardResponseDTO {

    private MemberIdentityDTO identity;
    private MembershipDetailsDTO membership;
    private CheckInStatusDTO checkInStatus;
    private List<MemberScheduleItemDTO> todaysSchedule = new ArrayList<>();
    private MemberActivityStatsDTO activityStats;
    private ActivePromotionDTO activePromotion;

    public MemberDashboardResponseDTO() {}

    public MemberDashboardResponseDTO(
            MemberIdentityDTO identity,
            MembershipDetailsDTO membership,
            CheckInStatusDTO checkInStatus,
            List<MemberScheduleItemDTO> todaysSchedule,
            MemberActivityStatsDTO activityStats,
            ActivePromotionDTO activePromotion) {
        this.identity = identity;
        this.membership = membership;
        this.checkInStatus = checkInStatus;
        this.todaysSchedule = todaysSchedule != null ? todaysSchedule : new ArrayList<>();
        this.activityStats = activityStats;
        this.activePromotion = activePromotion;
    }

    public MemberIdentityDTO getIdentity() {
        return identity;
    }

    public void setIdentity(MemberIdentityDTO identity) {
        this.identity = identity;
    }

    public MembershipDetailsDTO getMembership() {
        return membership;
    }

    public void setMembership(MembershipDetailsDTO membership) {
        this.membership = membership;
    }

    public CheckInStatusDTO getCheckInStatus() {
        return checkInStatus;
    }

    public void setCheckInStatus(CheckInStatusDTO checkInStatus) {
        this.checkInStatus = checkInStatus;
    }

    public List<MemberScheduleItemDTO> getTodaysSchedule() {
        return todaysSchedule;
    }

    public void setTodaysSchedule(List<MemberScheduleItemDTO> todaysSchedule) {
        this.todaysSchedule = todaysSchedule != null ? todaysSchedule : new ArrayList<>();
    }

    public MemberActivityStatsDTO getActivityStats() {
        return activityStats;
    }

    public void setActivityStats(MemberActivityStatsDTO activityStats) {
        this.activityStats = activityStats;
    }

    public ActivePromotionDTO getActivePromotion() {
        return activePromotion;
    }

    public void setActivePromotion(ActivePromotionDTO activePromotion) {
        this.activePromotion = activePromotion;
    }

    // ── Nested Semantic DTOs ────────────────────────────────────────────────

    public static class MemberIdentityDTO {
        private String memberId;
        private String name;
        private String email;
        private String phone;
        private String userRole;

        public MemberIdentityDTO() {}

        public MemberIdentityDTO(String memberId, String name, String email, String phone, String userRole) {
            this.memberId = memberId;
            this.name = name;
            this.email = email;
            this.phone = phone;
            this.userRole = userRole;
        }

        public String getMemberId() { return memberId; }
        public void setMemberId(String memberId) { this.memberId = memberId; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getUserRole() { return userRole; }
        public void setUserRole(String userRole) { this.userRole = userRole; }
    }

    public static class MembershipDetailsDTO {
        private String planName;
        private String membershipType;
        private String status;
        private boolean active;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private LocalDateTime expiryDate;
        private Integer daysRemaining;
        private String paymentStatus;
        private BigDecimal outstandingBalance;

        public MembershipDetailsDTO() {}

        public MembershipDetailsDTO(
                String planName,
                String membershipType,
                String status,
                boolean active,
                LocalDateTime startDate,
                LocalDateTime endDate,
                LocalDateTime expiryDate,
                Integer daysRemaining,
                String paymentStatus,
                BigDecimal outstandingBalance) {
            this.planName = planName;
            this.membershipType = membershipType;
            this.status = status;
            this.active = active;
            this.startDate = startDate;
            this.endDate = endDate;
            this.expiryDate = expiryDate;
            this.daysRemaining = daysRemaining;
            this.paymentStatus = paymentStatus;
            this.outstandingBalance = outstandingBalance;
        }

        public String getPlanName() { return planName; }
        public void setPlanName(String planName) { this.planName = planName; }

        public String getMembershipType() { return membershipType; }
        public void setMembershipType(String membershipType) { this.membershipType = membershipType; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }

        public LocalDateTime getStartDate() { return startDate; }
        public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }

        public LocalDateTime getEndDate() { return endDate; }
        public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }

        public LocalDateTime getExpiryDate() { return expiryDate; }
        public void setExpiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; }

        public Integer getDaysRemaining() { return daysRemaining; }
        public void setDaysRemaining(Integer daysRemaining) { this.daysRemaining = daysRemaining; }

        public String getPaymentStatus() { return paymentStatus; }
        public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

        public BigDecimal getOutstandingBalance() { return outstandingBalance; }
        public void setOutstandingBalance(BigDecimal outstandingBalance) { this.outstandingBalance = outstandingBalance; }
    }

    public static class CheckInStatusDTO {
        private boolean checkedIn;
        private Long activeAttendanceId;
        private LocalDateTime checkInTime;

        public CheckInStatusDTO() {}

        public CheckInStatusDTO(boolean checkedIn, Long activeAttendanceId, LocalDateTime checkInTime) {
            this.checkedIn = checkedIn;
            this.activeAttendanceId = activeAttendanceId;
            this.checkInTime = checkInTime;
        }

        public boolean isCheckedIn() { return checkedIn; }
        public void setCheckedIn(boolean checkedIn) { this.checkedIn = checkedIn; }

        public Long getActiveAttendanceId() { return activeAttendanceId; }
        public void setActiveAttendanceId(Long activeAttendanceId) { this.activeAttendanceId = activeAttendanceId; }

        public LocalDateTime getCheckInTime() { return checkInTime; }
        public void setCheckInTime(LocalDateTime checkInTime) { this.checkInTime = checkInTime; }
    }

    public static class MemberScheduleItemDTO {
        private Long bookingId;
        private Long sessionId;
        private String sessionName;
        private String sessionType;
        private String trainerName;
        private LocalDate date;
        private LocalTime startTime;
        private LocalTime endTime;
        private Integer durationMinutes;
        private String location;
        private Integer capacity;
        private Integer bookedCount;
        private Integer availableSpots;
        private String bookingStatus;

        public MemberScheduleItemDTO() {}

        public MemberScheduleItemDTO(
                Long bookingId,
                Long sessionId,
                String sessionName,
                String sessionType,
                String trainerName,
                LocalDate date,
                LocalTime startTime,
                LocalTime endTime,
                Integer durationMinutes,
                String location,
                Integer capacity,
                Integer bookedCount,
                Integer availableSpots,
                String bookingStatus) {
            this.bookingId = bookingId;
            this.sessionId = sessionId;
            this.sessionName = sessionName;
            this.sessionType = sessionType;
            this.trainerName = trainerName;
            this.date = date;
            this.startTime = startTime;
            this.endTime = endTime;
            this.durationMinutes = durationMinutes;
            this.location = location;
            this.capacity = capacity;
            this.bookedCount = bookedCount;
            this.availableSpots = availableSpots;
            this.bookingStatus = bookingStatus;
        }

        public Long getBookingId() { return bookingId; }
        public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

        public Long getSessionId() { return sessionId; }
        public void setSessionId(Long sessionId) { this.sessionId = sessionId; }

        public String getSessionName() { return sessionName; }
        public void setSessionName(String sessionName) { this.sessionName = sessionName; }

        public String getSessionType() { return sessionType; }
        public void setSessionType(String sessionType) { this.sessionType = sessionType; }

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

        public Integer getCapacity() { return capacity; }
        public void setCapacity(Integer capacity) { this.capacity = capacity; }

        public Integer getBookedCount() { return bookedCount; }
        public void setBookedCount(Integer bookedCount) { this.bookedCount = bookedCount; }

        public Integer getAvailableSpots() { return availableSpots; }
        public void setAvailableSpots(Integer availableSpots) { this.availableSpots = availableSpots; }

        public String getBookingStatus() { return bookingStatus; }
        public void setBookingStatus(String bookingStatus) { this.bookingStatus = bookingStatus; }
    }

    public static class MemberActivityStatsDTO {
        private Integer totalVisits;
        private Integer activeBookingsCount;
        private Integer currentStreakDays;

        public MemberActivityStatsDTO() {}

        public MemberActivityStatsDTO(Integer totalVisits, Integer activeBookingsCount, Integer currentStreakDays) {
            this.totalVisits = totalVisits;
            this.activeBookingsCount = activeBookingsCount;
            this.currentStreakDays = currentStreakDays;
        }

        public Integer getTotalVisits() { return totalVisits; }
        public void setTotalVisits(Integer totalVisits) { this.totalVisits = totalVisits; }

        public Integer getActiveBookingsCount() { return activeBookingsCount; }
        public void setActiveBookingsCount(Integer activeBookingsCount) { this.activeBookingsCount = activeBookingsCount; }

        public Integer getCurrentStreakDays() { return currentStreakDays; }
        public void setCurrentStreakDays(Integer currentStreakDays) { this.currentStreakDays = currentStreakDays; }
    }

    public static class ActivePromotionDTO {
        private Long id;
        private String name;
        private String type;
        private String description;
        private String discountType;
        private BigDecimal discountValue;
        private String code;
        private LocalDate startDate;
        private LocalDate endDate;

        public ActivePromotionDTO() {}

        public ActivePromotionDTO(
                Long id,
                String name,
                String type,
                String description,
                String discountType,
                BigDecimal discountValue,
                String code,
                LocalDate startDate,
                LocalDate endDate) {
            this.id = id;
            this.name = name;
            this.type = type;
            this.description = description;
            this.discountType = discountType;
            this.discountValue = discountValue;
            this.code = code;
            this.startDate = startDate;
            this.endDate = endDate;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getDiscountType() { return discountType; }
        public void setDiscountType(String discountType) { this.discountType = discountType; }

        public BigDecimal getDiscountValue() { return discountValue; }
        public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }

        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }

        public LocalDate getStartDate() { return startDate; }
        public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

        public LocalDate getEndDate() { return endDate; }
        public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    }
}
