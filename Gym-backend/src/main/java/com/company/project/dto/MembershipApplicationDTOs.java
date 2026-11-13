package com.company.project.dto;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Wire shapes for the public Service Portfolios link (/join/{tenant}/{branch}/{token})
 * and the admin's membership-application queue. snake_case on the wire (global Jackson naming).
 */
public final class MembershipApplicationDTOs {

    private MembershipApplicationDTOs() {}

    // ── Public page ─────────────────────────────────────────────────────────────

    /** GET /api/public/join/{tenant}/{branch}/{token} — everything the public page renders. */
    public record PublicCatalog(
            String gymName,
            String branchName,
            String address,
            String phone,
            String email,
            String operatingHours,
            String about,
            String termsAndPolicies,
            String coverImageUrl,
            List<String> galleryImageUrls,
            String currencyCode,
            /** Simulated card checkout is always available; kept as a flag so it can be switched off later. */
            boolean onlinePaymentEnabled,
            List<PublicPlan> plans,
            List<PublicStream> streams,
            List<PublicSession> classes,
            List<PublicSession> programs,
            List<PublicFacility> facilities,
            List<PublicTrainer> trainers,
            /** Branch Access Type — MIXED, LADIES_ONLY or MEN_ONLY (BranchAccessPolicy). */
            String access) {}

    public record PublicPlan(Long id, String name, String planType, String duration, String description,
                             BigDecimal price, BigDecimal effectivePrice, String offerLabel, List<String> features,
                             /** False for plans that can't be applied for online (see ServicePortfolioService.isJoinable). */
                             boolean joinable,
                             /** Set for Family / Couple plans: who can join and how the household is priced. */
                             PublicHousehold household) {}

    /**
     * kind: "couple" or "family". Caps are null when the plan doesn't limit them. pricePerMember is
     * set when the plan is priced per person (head included); otherwise effectivePrice covers everyone.
     */
    public record PublicHousehold(String kind, Integer maxAdults, Integer maxChildren, Integer maxMembers,
                                  boolean allowAdditionalMembers, BigDecimal pricePerMember,
                                  BigDecimal additionalMemberPrice) {}

    public record PublicStream(String id, String title, String instructorName, String category, String difficulty,
                               Integer duration, String status, LocalDateTime scheduledTime, String description) {}

    public record PublicSession(String id, String name, String type, Long trainerId, String trainerName, LocalDate date,
                                LocalTime startTime, LocalTime endTime, Integer durationMinutes, String location,
                                Integer capacity, Integer spotsLeft, BigDecimal price, String description) {}

    public record PublicFacility(String id, String name, String description, String iconName) {}

    /**
     * A trainer's public profile — only what the member app's trainer profile already shows
     * (no contact details, pay, HR data, schedule or written reviews).
     */
    public record PublicTrainer(Long id, String name, String role, String photoUrl, Double averageRating, long ratingCount,
                                LocalDate joinDate, List<String> certifications,
                                /** Ratings per star, index 0 = 1 star … index 4 = 5 stars. */
                                List<Long> ratingDistribution,
                                /** Most-picked review tags, most popular first (at most 5). */
                                List<String> topTags) {}

    /** Test card typed into the simulated checkout. Never stored — only brand + last 4 are kept. */
    public record CardDetails(String number, Integer expMonth, Integer expYear, String cvc, String nameOnCard) {}

    /** POST /api/public/join/{tenant}/{branch}/{token}/apply */
    public record PublicApplication(
            String fullName,
            String phone,
            String email,
            String gender,
            String dateOfBirth,
            String address,
            String emergencyContactName,
            String emergencyContactPhone,
            String notes,
            Long planId,
            /** CASH or ONLINE */
            String paymentMethod,
            CardDetails card,
            Boolean acceptTerms,
            /** Honeypot — real visitors never fill it. */
            String website,
            /** Partner / family members, for Family and Couple plans only. */
            List<ApplicationFamilyMember> familyMembers) {}

    /**
     * POST /api/members/applications — staff raise an application for a walk-in from the
     * Service Portfolios page. Always cash at reception; approval creates the member.
     */
    public record DeskApplication(
            String fullName,
            String phone,
            String email,
            String gender,
            String dateOfBirth,
            String address,
            String regDocNumber,
            String medicalConditions,
            String emergencyContactName,
            String emergencyContactPhone,
            String notes,
            Long planId,
            /** Partner / family members, for Family and Couple plans only. */
            List<ApplicationFamilyMember> familyMembers) {}

    public record ApplicationReceipt(String reference, String planName, BigDecimal amount, String currencyCode,
                                     String paymentMethod, String paymentStatus, String approvalStatus,
                                     String paymentReference, String cardBrand, String cardLast4,
                                     @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime paidAt, String message) {}

    // ── Admin queue ─────────────────────────────────────────────────────────────

    public record ApplicationView(
            Long id,
            String reference,
            Long branchId,
            String branchName,
            String fullName,
            String phone,
            String email,
            String gender,
            LocalDate dateOfBirth,
            String address,
            String emergencyContactName,
            String emergencyContactPhone,
            String notes,
            Long planId,
            String planName,
            String planDuration,
            BigDecimal listPrice,
            BigDecimal amount,
            String offerLabel,
            String paymentMethod,
            String paymentStatus,
            String paymentReference,
            String cardBrand,
            String cardLast4,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime paidAt,
            String cashReceivedBy,
            String approvalStatus,
            String decidedBy,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime decidedAt,
            String rejectionReason,
            Long memberId,
            String memberCode,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt,
            /** SHARE_LINK or DESK */
            String source,
            /** Staff user who raised a DESK application. */
            String submittedBy,
            String regDocNumber,
            String medicalConditions,
            /** The rest of the household on a Family / Couple plan; empty for one person. */
            List<ApplicationFamilyMember> familyMembers,
            /** The approve / reject email to the applicant: SENT, FAILED, NOT_CONFIGURED, or null before a decision. */
            String decisionEmailStatus,
            /** Why the last attempt failed, in words a gym owner can act on. */
            String decisionEmailError,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime decisionEmailAt,
            /** True when the gym (GymOS › Settings › Email) or the server has a mailbox to send from. */
            boolean emailConfigured) {}

    /**
     * One person joining with the applicant on a Family / Couple plan. Stored on the
     * application as JSON and turned into a family member when the application is approved.
     */
    public record ApplicationFamilyMember(String name, String relationship, String gender,
                                          /** yyyy-MM-dd, optional */ String dateOfBirth,
                                          /** Under 18 — worked out from dateOfBirth when it's given. */ Boolean minor,
                                          String phone, String email) {}

    /** cashReceived: for a cash application, the admin confirms the cash was taken at the desk. */
    public record ApproveRequest(Boolean cashReceived) {}

    public record RejectRequest(String reason) {}

    /** Relative path so the web app puts its own origin in front. */
    public record ShareLink(String path, Long branchId, String branchName) {}
}
