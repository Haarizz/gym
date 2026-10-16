package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/** One "Request reviews" send for a branch. At most one per branch every 30 days. */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "gym_review_requests")
public class GymReviewRequest extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "recipient_count", nullable = false)
    private Integer recipientCount = 0;

    public GymReviewRequest() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getRecipientCount() { return recipientCount; }
    public void setRecipientCount(Integer recipientCount) { this.recipientCount = recipientCount; }

    @Override
    public Long getBranchId() { return branchId; }

    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
