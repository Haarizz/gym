package com.company.project.controlplane.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Cross-tenant roll-up of one branch's member reviews (tenant-DB reviews table), for
 * the platform admin's Ratings list. Refreshed by GymReviewService on every review
 * save and recomputed on startup; the reviews themselves stay in the gym's database.
 */
@Entity
@Table(name = "branch_rating_summaries")
public class BranchRatingSummary extends ControlPlaneAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_slug", nullable = false)
    private String tenantSlug;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "branch_name")
    private String branchName;

    @Column(name = "rating_count", nullable = false)
    private Long ratingCount = 0L;

    @Column(name = "rating_sum", nullable = false)
    private Long ratingSum = 0L;

    @Column(name = "star1", nullable = false)
    private Long star1 = 0L;

    @Column(name = "star2", nullable = false)
    private Long star2 = 0L;

    @Column(name = "star3", nullable = false)
    private Long star3 = 0L;

    @Column(name = "star4", nullable = false)
    private Long star4 = 0L;

    @Column(name = "star5", nullable = false)
    private Long star5 = 0L;

    @Column(name = "last_review_at")
    private LocalDateTime lastReviewAt;

    public BranchRatingSummary() {}

    public BranchRatingSummary(String tenantSlug, Long branchId) {
        this.tenantSlug = tenantSlug;
        this.branchId = branchId;
    }

    /** Sets the counts from per-star totals (index 0 = 1 star). */
    public void setCounts(long[] stars) {
        star1 = stars[0];
        star2 = stars[1];
        star3 = stars[2];
        star4 = stars[3];
        star5 = stars[4];
        long count = 0;
        long sum = 0;
        for (int i = 0; i < 5; i++) {
            count += stars[i];
            sum += stars[i] * (i + 1);
        }
        ratingCount = count;
        ratingSum = sum;
    }

    public long[] getCounts() {
        return new long[] { star1, star2, star3, star4, star5 };
    }

    public Long getId() { return id; }

    public String getTenantSlug() { return tenantSlug; }

    public Long getBranchId() { return branchId; }

    public String getBranchName() { return branchName; }
    public void setBranchName(String branchName) { this.branchName = branchName; }

    public Long getRatingCount() { return ratingCount; }

    public Long getRatingSum() { return ratingSum; }

    public LocalDateTime getLastReviewAt() { return lastReviewAt; }
    public void setLastReviewAt(LocalDateTime lastReviewAt) { this.lastReviewAt = lastReviewAt; }
}
