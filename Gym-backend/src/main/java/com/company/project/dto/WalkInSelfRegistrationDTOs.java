package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Wire shapes for walk-in self-registration (public QR page + the desk's pending list). */
public final class WalkInSelfRegistrationDTOs {

    private WalkInSelfRegistrationDTOs() {}

    /** GET /api/public/walk-in/{tenant}/{branch} — what the public page renders. */
    public record PublicPage(String gymName, String branchName, String branchPhone, String currencyCode,
                             String staffName, List<PublicPlan> plans) {}

    public record PublicPlan(Long id, String name, String duration, BigDecimal price) {}

    /** POST /api/public/walk-in/{tenant}/{branch}/submit */
    public record PublicSubmission(String fullName, String phone, String email, Long planId,
                                   String staffCode, String website) {}

    /** A pending self-registration, as the desk and staff apps list it. */
    public record Pending(Long id, String name, String phone, String email, Long planId, String planName,
                          Long referredByStaffId, String referredByStaffName, LocalDateTime createdAt) {}

    /**
     * The caller's walk-in links, relative so web and mobile can each put their own
     * origin in front: path is personal (/w/{tenant}/{branch}?s=CODE) for staff,
     * branchPath the plain one for the gym's printed poster.
     */
    public record MyLink(String path, String branchPath, String staffName, String branchName, boolean enabled) {}
}
