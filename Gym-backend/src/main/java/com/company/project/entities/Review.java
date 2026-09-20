package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "reviews")
public class Review extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "global_user_id")
    private Long globalUserId;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    public Review() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public Long getGlobalUserId() { return globalUserId; }
    public void setGlobalUserId(Long globalUserId) { this.globalUserId = globalUserId; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    @Override
    public Long getBranchId() { return branchId; }

    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
