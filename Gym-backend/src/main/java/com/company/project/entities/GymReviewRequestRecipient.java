package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * A member a review request went to. PENDING makes the app open the rate sheet on
 * launch; DISMISSED (closed it) and RATED stop that.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "gym_review_request_recipients",
        uniqueConstraints = @UniqueConstraint(columnNames = {"request_id", "member_id"}))
public class GymReviewRequestRecipient extends BaseEntity implements BranchAware {

    public static final String PENDING = "PENDING";
    public static final String DISMISSED = "DISMISSED";
    public static final String RATED = "RATED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false)
    private Long requestId;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 20)
    private String status = PENDING;

    public GymReviewRequestRecipient() {}

    public GymReviewRequestRecipient(Long requestId, Long branchId, Long memberId) {
        this.requestId = requestId;
        this.branchId = branchId;
        this.memberId = memberId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRequestId() { return requestId; }
    public void setRequestId(Long requestId) { this.requestId = requestId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    @Override
    public Long getBranchId() { return branchId; }

    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
