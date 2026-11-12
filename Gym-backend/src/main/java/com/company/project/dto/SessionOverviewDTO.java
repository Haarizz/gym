package com.company.project.dto;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Everything the Trainings & Classes session dialog shows, in one call (GET /api/sessions/{id}/overview). */
public class SessionOverviewDTO {

    private TrainingSessionResponseDTO session;
    private Trainer trainer;
    private List<Participant> participants = new ArrayList<>();
    private List<Review> reviews = new ArrayList<>();

    public TrainingSessionResponseDTO getSession() { return session; }
    public void setSession(TrainingSessionResponseDTO session) { this.session = session; }

    public Trainer getTrainer() { return trainer; }
    public void setTrainer(Trainer trainer) { this.trainer = trainer; }

    public List<Participant> getParticipants() { return participants; }
    public void setParticipants(List<Participant> participants) { this.participants = participants; }

    public List<Review> getReviews() { return reviews; }
    public void setReviews(List<Review> reviews) { this.reviews = reviews; }

    public static class Trainer {
        private Long id;
        private String name;
        private String role;
        private String photoUrl;
        /** Whole years since the trainer joined the gym; null when the join date isn't set. */
        private Integer yearsAtGym;
        /** Members' average rating of the trainer (staff_ratings); null without ratings. */
        private Double rating;
        private Integer ratingCount;
        private List<String> certifications = new ArrayList<>();

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public String getPhotoUrl() { return photoUrl; }
        public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
        public Integer getYearsAtGym() { return yearsAtGym; }
        public void setYearsAtGym(Integer yearsAtGym) { this.yearsAtGym = yearsAtGym; }
        public Double getRating() { return rating; }
        public void setRating(Double rating) { this.rating = rating; }
        public Integer getRatingCount() { return ratingCount; }
        public void setRatingCount(Integer ratingCount) { this.ratingCount = ratingCount; }
        public List<String> getCertifications() { return certifications; }
        public void setCertifications(List<String> certifications) { this.certifications = certifications; }
    }

    public static class Participant {
        private String bookingId;
        /** Member's database id (null for a guest). */
        private Long memberDbId;
        /** Member code, e.g. MBR-0000000003. */
        private String memberCode;
        private String name;
        private String phone;
        private String email;
        private String photoUrl;
        private String plan;
        private String membershipStatus;
        private boolean guest;
        /** confirmed | checked-in | no-show | pending_approval | waitlisted | cancelled */
        private String status;
        private String paymentStatus;
        private BigDecimal price;
        // Set when the booking used a session of the member's training package.
        private Long enrolmentId;

        public Long getEnrolmentId() { return enrolmentId; }
        public void setEnrolmentId(Long enrolmentId) { this.enrolmentId = enrolmentId; }
        /** 1-based place in the waitlist; null when not waitlisted. */
        private Integer waitlistPosition;
        @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
        private LocalDateTime checkedInAt;
        @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
        private LocalDateTime bookedAt;

        public String getBookingId() { return bookingId; }
        public void setBookingId(String bookingId) { this.bookingId = bookingId; }
        public Long getMemberDbId() { return memberDbId; }
        public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }
        public String getMemberCode() { return memberCode; }
        public void setMemberCode(String memberCode) { this.memberCode = memberCode; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhotoUrl() { return photoUrl; }
        public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
        public String getPlan() { return plan; }
        public void setPlan(String plan) { this.plan = plan; }
        public String getMembershipStatus() { return membershipStatus; }
        public void setMembershipStatus(String membershipStatus) { this.membershipStatus = membershipStatus; }
        public boolean isGuest() { return guest; }
        public void setGuest(boolean guest) { this.guest = guest; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getPaymentStatus() { return paymentStatus; }
        public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
        public BigDecimal getPrice() { return price; }
        public void setPrice(BigDecimal price) { this.price = price; }
        public Integer getWaitlistPosition() { return waitlistPosition; }
        public void setWaitlistPosition(Integer waitlistPosition) { this.waitlistPosition = waitlistPosition; }
        public LocalDateTime getCheckedInAt() { return checkedInAt; }
        public void setCheckedInAt(LocalDateTime checkedInAt) { this.checkedInAt = checkedInAt; }
        public LocalDateTime getBookedAt() { return bookedAt; }
        public void setBookedAt(LocalDateTime bookedAt) { this.bookedAt = bookedAt; }
    }

    public static class Review {
        private Long id;
        private Long memberDbId;
        private String memberName;
        private String memberPhotoUrl;
        private Integer rating;
        private String comment;
        @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
        private LocalDateTime createdAt;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public Long getMemberDbId() { return memberDbId; }
        public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }
        public String getMemberName() { return memberName; }
        public void setMemberName(String memberName) { this.memberName = memberName; }
        public String getMemberPhotoUrl() { return memberPhotoUrl; }
        public void setMemberPhotoUrl(String memberPhotoUrl) { this.memberPhotoUrl = memberPhotoUrl; }
        public Integer getRating() { return rating; }
        public void setRating(Integer rating) { this.rating = rating; }
        public String getComment() { return comment; }
        public void setComment(String comment) { this.comment = comment; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }
}
